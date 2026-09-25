#!/usr/bin/env python3
"""Self-hosts every blog image by pulling it from the old WordPress media library.

Reads BLOG-IMAGE-MANIFEST.json and downloads each image into
site/assets/img/blog/, replacing the placeholders that ship with the build.

Thirty-five of the URLs the old site used are WordPress crops, e.g.
    .../orthodontic-braces-on-a-womans-teeth-300x240.webp
Those are only 300px wide, which looks soft in the new layout. This script asks
for the full-size original first by stripping the "-300x240" suffix, and only
falls back to the crop if WordPress does not have the original.

Requires Python 3.8 or newer. Pillow is optional: with it installed, images are
resized and re-encoded so nothing oversized ships; without it, files are saved
exactly as downloaded and the script still works.

Usage (from the project root):
    python3 build/selfhost_blog_images.py
    python3 build/selfhost_blog_images.py --force          # re-download everything
    python3 build/selfhost_blog_images.py --no-optimise    # keep bytes untouched
    python3 build/selfhost_blog_images.py --max-width 1600 # cap the long edge

Afterwards, rebuild so each <img> picks up its real width and height:
    python3 build/blog.py
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Works whether this sits in the project (build/, manifest one level up) or is
# run on its own from a folder that holds the manifest beside it. A manifest
# next to the script always wins.
ROOT = HERE if (HERE / "BLOG-IMAGE-MANIFEST.json").exists() else HERE.parent
MANIFEST = ROOT / "BLOG-IMAGE-MANIFEST.json"
SITE_DIR = ROOT / "site" / "assets" / "img" / "blog"
OUT_DIR = SITE_DIR if SITE_DIR.parent.exists() else ROOT / "blog-images"
REPORT = ROOT / "blog-image-fetch-report.csv"

# Some hosts reject requests without a browser-ish user agent.
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}

SIZE_SUFFIX = re.compile(r"-\d{2,4}x\d{2,4}(?=\.[A-Za-z0-9]+$)")
MAGIC = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
    b"GIF8": "gif",
}


def shortpath(p: Path) -> str:
    """Path relative to the project root when it sits inside it, else in full."""
    try:
        return str(Path(p).resolve().relative_to(ROOT))
    except ValueError:
        return str(p)


def candidates(url: str) -> list[str]:
    """Full-size original first, then the exact URL the old site used."""
    full = SIZE_SUFFIX.sub("", url)
    return [full, url] if full != url else [url]


def looks_like_image(blob: bytes) -> bool:
    if len(blob) < 64:
        return False
    if blob[:4] == b"RIFF" and blob[8:12] == b"WEBP":
        return True
    return any(blob.startswith(sig) for sig in MAGIC)


def download(url: str, timeout: int, retries: int = 2) -> bytes:
    last = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (404, 403, 410):      # no point retrying a definite no
                raise
            last = e
        except Exception as e:                  # noqa: BLE001 - network is messy
            last = e
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))
    raise last if last else RuntimeError("download failed")


def optimise(blob: bytes, dest: Path, max_width: int) -> tuple[bytes, str]:
    """Resize and re-encode to WebP. Returns (bytes, note)."""
    try:
        import io

        from PIL import Image
    except ImportError:
        return blob, "saved as downloaded (Pillow not installed)"
    try:
        with Image.open(io.BytesIO(blob)) as im:
            im = im.convert("RGB")
            w, h = im.size
            note = f"{w}x{h}"
            if w > max_width:
                im = im.resize((max_width, round(h * max_width / w)), Image.LANCZOS)
                note = f"{w}x{h} resized to {im.size[0]}x{im.size[1]}"
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=82, method=6)
            out = buf.getvalue()
        # keep whichever is smaller, as long as the original is already a webp
        if dest.suffix.lower() == ".webp" and len(blob) <= len(out) and looks_like_image(blob):
            return blob, note + " (kept original encoding, already smaller)"
        return out, note
    except Exception as e:                      # noqa: BLE001
        return blob, f"saved as downloaded ({e})"


def fetch_one(entry: dict, args) -> dict:
    name = entry["local"].split("/")[-1]
    dest = OUT_DIR / name
    row = {"file": name, "post": entry["post"], "status": "", "source": "", "detail": ""}

    if dest.exists() and not args.force and dest.stat().st_size > 20_000:
        row["status"] = "skipped"
        row["detail"] = "already present, use --force to replace"
        return row

    errors = []
    for i, url in enumerate(candidates(entry["old_url"])):
        try:
            blob = download(url, args.timeout)
        except Exception as e:                  # noqa: BLE001
            errors.append(f"{url.rsplit('/', 1)[-1]}: {e}")
            continue
        if not looks_like_image(blob):
            errors.append(f"{url.rsplit('/', 1)[-1]}: not an image (got {len(blob)} bytes)")
            continue
        note = ""
        if not args.no_optimise:
            blob, note = optimise(blob, dest, args.max_width)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(blob)
        row["status"] = "ok"
        row["source"] = url
        kb = len(blob) / 1024
        row["detail"] = f"{kb:.0f} KB" if kb >= 10 else f"{kb:.1f} KB"
        if note:
            row["detail"] += f", {note}"
        if i == 0 and len(candidates(entry["old_url"])) > 1:
            row["detail"] += ", full-size original"
        elif i > 0:
            row["detail"] += ", fell back to the cropped version"
        return row

    row["status"] = "FAILED"
    row["source"] = entry["old_url"]
    row["detail"] = " | ".join(errors)[:300]
    return row


def main() -> int:
    global OUT_DIR                                          # noqa: PLW0603
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="re-download images that already exist")
    ap.add_argument("--no-optimise", action="store_true", help="save bytes exactly as downloaded")
    ap.add_argument("--max-width", type=int, default=1600, help="cap the long edge (default 1600)")
    ap.add_argument("--timeout", type=int, default=30, help="per-request timeout in seconds")
    ap.add_argument("--jobs", type=int, default=6, help="parallel downloads (default 6)")
    ap.add_argument("--manifest", type=Path, default=MANIFEST)
    ap.add_argument("--out", type=Path, default=OUT_DIR,
                    help=f"where to save the images (default {OUT_DIR})")
    args = ap.parse_args()
    OUT_DIR = args.out

    if not args.manifest.exists():
        print(f"Cannot find {args.manifest}. Run this from the project root.", file=sys.stderr)
        return 2

    entries = json.loads(args.manifest.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = len(entries)
    width = max(len(e["local"].split("/")[-1]) for e in entries)
    print(f"Fetching {total} blog images into {shortpath(OUT_DIR)}")
    print("Each line appears as its download finishes.\n", flush=True)

    # Results are printed as they land rather than in one block at the end, so a
    # slow download never looks like a hung script.
    rows = []
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = [pool.submit(fetch_one, e, args) for e in entries]
        for done, fut in enumerate(as_completed(futures), start=1):
            r = fut.result()
            rows.append(r)
            print(f"[{done:>2}/{total}] {r['status']:<8} {r['file']:<{width}}  {r['detail']}",
                  flush=True)
    print(f"\nFinished in {time.time() - started:.0f}s")

    with REPORT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "post", "status", "source", "detail"])
        w.writeheader()
        w.writerows(rows)

    ok = sum(r["status"] == "ok" for r in rows)
    skipped = sum(r["status"] == "skipped" for r in rows)
    failed = [r for r in rows if r["status"] == "FAILED"]
    print(f"\n{ok} downloaded, {skipped} skipped, {len(failed)} failed")
    print(f"Report written to {shortpath(REPORT)}")
    if failed:
        print("\nThese need a manual replacement, or the image no longer exists on the old site:")
        for r in failed:
            print(f"  {r['file']}  <-  {r['source']}")
    print("\nNext: python3 build/blog.py    (re-emits each image's real width and height)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
