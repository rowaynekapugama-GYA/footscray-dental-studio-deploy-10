"""Produces a browsable offline copy of the site.

The deployed build keeps clean trailing-slash URLs on blog pages, which is what the
SEO migration needs but which browsers cannot follow when a page is opened straight
from disk (file:// has no directory-index behaviour). This script copies site/ to
preview/ and rewrites every remaining root-relative link into a relative one with an
explicit index.html, so the whole site can be clicked through offline.

The preview copy is for reviewing only. Deploy site/, never preview/.
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC = ROOT / "site"
DST = ROOT / "preview"

BANNER = """<div style="position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#2d4459;color:#fff;
font:500 12px/1.5 system-ui,sans-serif;padding:7px 14px;text-align:center;letter-spacing:.02em">
Offline preview copy. Links are rewritten for local browsing, so deploy the &ldquo;site&rdquo; folder, not this one.
</div>"""


def relativise(html, url_depth):
    prefix = "../" * url_depth

    def repl(m):
        attr, path = m.group(1), m.group(2)
        base, _, frag = path.partition("#")
        frag = ("#" + frag) if frag else ""
        if base == "/":
            target = prefix + "index.html" if url_depth else "index.html"
        elif base.endswith("/"):
            target = prefix + base.strip("/") + "/index.html"
        else:
            target = prefix + base.lstrip("/")
        return f'{attr}="{target}{frag}"'

    return re.sub(r'(href|src)="(/[^"]*)"', repl, html)


def main():
    if DST.exists():
        shutil.rmtree(DST)
    shutil.copytree(SRC, DST)
    # the preview copy is not a deployable artefact
    for junk in ("vercel.json", "sitemap.xml", "robots.txt"):
        (DST / junk).unlink(missing_ok=True)

    changed = 0
    for page in sorted(DST.rglob("*.html")):
        rel = page.relative_to(DST)
        depth = len(rel.parts) - 1
        html = page.read_text(encoding="utf-8")
        new = relativise(html, depth)
        new = new.replace("</body>", BANNER + "\n</body>")
        if new != html:
            changed += 1
        page.write_text(new, encoding="utf-8")

    leftovers = sum(len(re.findall(r'(?:href|src)="/', p.read_text()))
                    for p in DST.rglob("*.html"))
    print(f"preview/ built from site/ — {len(list(DST.rglob('*.html')))} pages, "
          f"{changed} rewritten, {leftovers} root-relative links remaining")
    return leftovers


if __name__ == "__main__":
    raise SystemExit(1 if main() else 0)
