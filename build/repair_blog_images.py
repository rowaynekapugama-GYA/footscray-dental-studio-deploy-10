#!/usr/bin/env python3
"""Finds the images the first pass could not, then downloads them.

Some of the URLs recorded during the migration point at files the old site no
longer serves at that exact path. Rather than guessing, this script asks the old
site where each image actually lives, using three sources in order:

1. The WordPress REST API (/wp-json/wp/v2/media?search=...), which returns the
   canonical source_url plus every generated size. Fastest and most reliable.
2. The old post page itself, scraped for its <img> tags. Ground truth, because
   it is exactly what the page was displaying.
3. The same filename tried under every /YYYY/MM/ upload folder in the manifest,
   in case the file was simply recorded against the wrong month.

Whatever it finds, it prefers the largest version available, so thumbnails get
upgraded to full-size originals along the way.

Usage, from the folder holding BLOG-IMAGE-MANIFEST.json:

    python3 repair-blog-images.py                 # repair whatever is missing
    python3 repair-blog-images.py --all           # re-check all 67, not just gaps
    python3 repair-blog-images.py --diagnose      # show what the server returns
    python3 repair-blog-images.py --dry-run       # find URLs, download nothing

Pillow is optional. Without it, files are saved exactly as downloaded.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE if (HERE / "BLOG-IMAGE-MANIFEST.json").exists() else HERE.parent
MANIFEST = ROOT / "BLOG-IMAGE-MANIFEST.json"
SITE_DIR = ROOT / "site" / "assets" / "img" / "blog"
OUT_DIR = SITE_DIR if SITE_DIR.parent.exists() else ROOT / "blog-images"
REPORT = ROOT / "blog-image-repair-report.csv"

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": "https://ezydentalgroup.com.au/",
}
PAGE_HEADERS = dict(HEADERS, Accept="text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8")

SIZE_SUFFIX = re.compile(r"-\d{2,4}x\d{2,4}(?=\.[A-Za-z0-9]+$)")
UPLOAD_MONTH = re.compile(r"/wp-content/uploads/(\d{4})/(\d{2})/")
MAGIC = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"GIF8")


def looks_like_image(blob: bytes) -> bool:
    if len(blob) < 512:                      # a real photo is never this small
        return False
    if blob[:4] == b"RIFF" and blob[8:12] == b"WEBP":
        return True
    return blob.startswith(MAGIC)


def fetch(url: str, timeout: int, headers=None) -> bytes:
    req = urllib.request.Request(url, headers=headers or HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def try_image(url: str, timeout: int) -> bytes | None:
    try:
        blob = fetch(url, timeout)
    except Exception:                        # noqa: BLE001
        return None
    return blob if looks_like_image(blob) else None


def base_name(url: str) -> str:
    """Filename with the WordPress size suffix and extension stripped."""
    name = urllib.parse.urlparse(url).path.rsplit("/", 1)[-1]
    return SIZE_SUFFIX.sub("", name).rsplit(".", 1)[0]


def origin(url: str) -> str:
    p = urllib.parse.urlparse(url)
    return f"{p.scheme}://{p.netloc}"


# ---------------------------------------------------------------- strategies

def from_rest_api(entry: dict, timeout: int) -> list[str]:
    """Ask WordPress where this attachment lives. Largest size first."""
    site = origin(entry["old_url"])
    slug = base_name(entry["old_url"])
    q = urllib.parse.urlencode({"search": slug, "per_page": 20, "_fields":
                                "slug,title,source_url,media_details"})
    try:
        data = json.loads(fetch(f"{site}/wp-json/wp/v2/media?{q}", timeout, PAGE_HEADERS))
    except Exception:                        # noqa: BLE001
        return []
    if not isinstance(data, list):
        return []

    found = []
    for item in data:
        if not isinstance(item, dict) or not item.get("source_url"):
            continue
        # only accept a confident match on the filename
        if base_name(item["source_url"]).lower() != slug.lower():
            continue
        sizes = (item.get("media_details") or {}).get("sizes") or {}
        ranked = sorted(
            (s for s in sizes.values() if isinstance(s, dict) and s.get("source_url")),
            key=lambda s: s.get("width", 0), reverse=True)
        found.append(item["source_url"])                       # the original
        found.extend(s["source_url"] for s in ranked)
    return found


def from_post_page(entry: dict, timeout: int, cache: dict) -> list[str]:
    """Scrape the old post for its actual <img> sources."""
    page = entry.get("post_url")
    if not page:
        return []
    if page not in cache:
        try:
            cache[page] = fetch(page, timeout, PAGE_HEADERS).decode("utf-8", "replace")
        except Exception:                    # noqa: BLE001
            cache[page] = ""
    html = cache[page]
    if not html:
        return []

    urls = re.findall(r'(?:src|data-src|data-lazy-src)="([^"]+\.(?:webp|jpe?g|png))"', html, re.I)
    for srcset in re.findall(r'(?:srcset|data-srcset)="([^"]+)"', html, re.I):
        urls += [p.strip().split(" ")[0] for p in srcset.split(",") if p.strip()]

    slug = base_name(entry["old_url"]).lower()
    exact, loose = [], []
    for u in urls:
        if "/wp-content/uploads/" not in u:
            continue
        u = urllib.parse.urljoin(page, u)
        b = base_name(u).lower()
        if b == slug:
            exact.append(u)
        elif slug in b or b in slug:
            loose.append(u)
    # de-duplicate, full-size first, keeping order
    out, seen = [], set()
    for u in exact + loose:
        for cand in (SIZE_SUFFIX.sub("", u), u):
            if cand not in seen:
                seen.add(cand)
                out.append(cand)
    return out


def from_other_months(entry: dict, months: list[tuple[str, str]], timeout: int) -> list[str]:
    """The right file recorded against the wrong /YYYY/MM/ folder."""
    m = UPLOAD_MONTH.search(entry["old_url"])
    if not m:
        return []
    name = urllib.parse.urlparse(entry["old_url"]).path.rsplit("/", 1)[-1]
    full = SIZE_SUFFIX.sub("", name)
    site = origin(entry["old_url"])
    out = []
    for y, mo in months:
        if (y, mo) == (m.group(1), m.group(2)):
            continue
        out.append(f"{site}/wp-content/uploads/{y}/{mo}/{full}")
    return out


# ---------------------------------------------------------------- the worker

def optimise(blob: bytes, max_width: int) -> tuple[bytes, str]:
    try:
        import io

        from PIL import Image
    except ImportError:
        return blob, "Pillow not installed, saved as downloaded"
    try:
        import io
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
        return (blob, note + " (original was smaller)") if len(blob) <= len(out) else (out, note)
    except Exception as e:                   # noqa: BLE001
        return blob, f"saved as downloaded ({e})"


def repair_one(entry, args, months, page_cache) -> dict:
    name = entry["local"].split("/")[-1]
    dest = OUT_DIR / name
    row = {"file": name, "post": entry["post"], "status": "", "via": "", "source": "", "detail": ""}

    attempts = [
        ("original URL", lambda: [SIZE_SUFFIX.sub("", entry["old_url"]), entry["old_url"]]),
        ("REST API", lambda: from_rest_api(entry, args.timeout)),
        ("old post page", lambda: from_post_page(entry, args.timeout, page_cache)),
        ("other upload months", lambda: from_other_months(entry, months, args.timeout)),
    ]

    tried = 0
    for label, get_urls in attempts:
        try:
            urls = get_urls()
        except Exception:                    # noqa: BLE001
            continue
        seen = set()
        for url in urls:
            if url in seen:
                continue
            seen.add(url)
            tried += 1
            if args.dry_run:
                blob = try_image(url, args.timeout)
                if blob:
                    row.update(status="found", via=label, source=url,
                               detail=f"{len(blob) / 1024:.0f} KB, not saved (--dry-run)")
                    return row
                continue
            blob = try_image(url, args.timeout)
            if not blob:
                continue
            note = ""
            if not args.no_optimise:
                blob, note = optimise(blob, args.max_width)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(blob)
            kb = len(blob) / 1024
            row.update(status="ok", via=label, source=url,
                       detail=(f"{kb:.0f} KB" if kb >= 10 else f"{kb:.1f} KB")
                              + (f", {note}" if note else ""))
            return row

    row.update(status="FAILED", source=entry["old_url"],
               detail=f"no working URL found after {tried} attempts")
    return row


def diagnose(entry, timeout) -> str:
    """Show exactly what the server sends back, so a wrong guess is obvious."""
    url = entry["old_url"]
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code, ctype, blob = r.status, r.headers.get("Content-Type", "?"), r.read()
    except urllib.error.HTTPError as e:
        code, ctype, blob = e.code, e.headers.get("Content-Type", "?"), e.read()
    except Exception as e:                   # noqa: BLE001
        return f"{url}\n  request failed: {e}"
    body = blob[:200].decode("utf-8", "replace").replace("\n", " ").strip()
    return (f"{url}\n  HTTP {code}  {ctype}  {len(blob)} bytes\n  {body}")


def main() -> int:
    global OUT_DIR                                          # noqa: PLW0603
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--all", action="store_true", help="re-check every image, not just the missing ones")
    ap.add_argument("--diagnose", action="store_true", help="print the server's actual response and stop")
    ap.add_argument("--dry-run", action="store_true", help="find working URLs but download nothing")
    ap.add_argument("--no-optimise", action="store_true")
    ap.add_argument("--max-width", type=int, default=1600)
    ap.add_argument("--timeout", type=int, default=30)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--manifest", type=Path, default=MANIFEST)
    ap.add_argument("--out", type=Path, default=OUT_DIR)
    args = ap.parse_args()
    OUT_DIR = args.out

    if not args.manifest.exists():
        print(f"Cannot find {args.manifest}. Run this from the folder that holds it.", file=sys.stderr)
        return 2

    entries = json.loads(args.manifest.read_text(encoding="utf-8"))
    if not args.all:
        entries = [e for e in entries
                   if not (OUT_DIR / e["local"].split("/")[-1]).exists()]
    if not entries:
        print("Nothing missing. Use --all to re-check every image.")
        return 0

    if args.diagnose:
        print(f"Asking the old site about {min(len(entries), 5)} of the missing images.\n")
        for e in entries[:5]:
            print(diagnose(e, args.timeout), "\n")
        return 0

    months = sorted({(m.group(1), m.group(2))
                     for e in json.loads(args.manifest.read_text(encoding="utf-8"))
                     if (m := UPLOAD_MONTH.search(e["old_url"]))})
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = len(entries)
    width = max(len(e["local"].split("/")[-1]) for e in entries)
    print(f"Repairing {total} image(s) into {OUT_DIR}")
    print(f"Upload folders known: {', '.join('/'.join(m) for m in months)}\n", flush=True)

    page_cache: dict = {}
    rows = []
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = [pool.submit(repair_one, e, args, months, page_cache) for e in entries]
        for done, fut in enumerate(as_completed(futures), start=1):
            r = fut.result()
            rows.append(r)
            via = f"via {r['via']}" if r["via"] else ""
            print(f"[{done:>2}/{total}] {r['status']:<7} {r['file']:<{width}}  {via:<22} {r['detail']}",
                  flush=True)

    with REPORT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "post", "status", "via", "source", "detail"])
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["status"] != "FAILED", r["file"])))

    good = [r for r in rows if r["status"] in ("ok", "found")]
    failed = [r for r in rows if r["status"] == "FAILED"]
    print(f"\nFinished in {time.time() - started:.0f}s: {len(good)} recovered, {len(failed)} still missing")
    by_via: dict = {}
    for r in good:
        by_via[r["via"]] = by_via.get(r["via"], 0) + 1
    for k, v in sorted(by_via.items(), key=lambda kv: -kv[1]):
        print(f"  {v:>2} found via {k}")
    print(f"\nReport: {REPORT}")
    if failed:
        print("\nStill missing, these need a replacement image:")
        for r in sorted(failed, key=lambda r: r["file"]):
            print(f"  {r['file']}  (post: {r['post']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
