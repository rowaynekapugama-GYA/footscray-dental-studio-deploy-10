"""Builds the old-domain redirect map and emits vercel.json, a CSV and an .htaccess.

Every old ezydentalgroup.com.au URL gets exactly ONE 301 to a live new URL.
No chains: each source maps straight to its final destination.
"""
import csv
import json
import re
from pathlib import Path

from blog import load_posts, SITE

ROOT = Path(__file__).parent.parent
OUT = ROOT / "site"
OLD_HOSTS = ["ezydentalgroup.com.au", "www.ezydentalgroup.com.au"]

# ---- static pages -----------------------------------------------------------
PAGES = [
    ("/", "/"),
    ("/about/", "/about/"),
    ("/contact/", "/contact/"),
    ("/book-appointment/", "/patient-info/"),
    ("/gallery/", "/about/"),              # no gallery on the new site; About carries the practice story
    ("/faqs/", "/patient-info/"),          # new site's FAQs live on the booking/patient-info page
    ("/terms/", "/terms/"),
    ("/privacy-policy/", "/privacy-policy/"),
    ("/services/", "/services/"),
    ("/team/", "/meet-the-team/"),
    ("/blog/", "/blog/"),
]

# ---- old service pages ------------------------------------------------------
SERVICES_OFFERED = [
    ("/services/teeth-whitening/", "/services/cosmetic/teeth-whitening/"),
    ("/services/dental-veneers/", "/services/cosmetic/veneers/"),
    ("/services/dental-implants/", "/services/restorative/dental-implants/"),
    ("/services/crown-bridge/", "/services/restorative/crowns-bridges/"),
    ("/services/dental-fillings/", "/services/restorative/fillings/"),
    ("/services/root-canal-treatment/", "/services/restorative/root-canal/"),
    ("/services/sport-mouth-guards/", "/services/general-preventive/mouthguards/"),
    ("/services/general-check-up/", "/services/general-preventive/check-ups-cleans/"),
    ("/services/emergency-dentistry/", "/services/emergency-dentistry/"),
]
SERVICES_DROPPED = [
    ("/services/gummy-smile-treatment/", "/services/cosmetic/"),
    ("/services/laser-dentistry/", "/services/"),
    ("/services/bone-grafting/", "/services/restorative/dental-implants/"),
    ("/services/sinus-lift-procedure/", "/services/restorative/dental-implants/"),
    ("/services/wisdom-tooth-removal/", "/services/emergency-dentistry/"),
    ("/services/orthodontics/", "/special-offers/"),
    ("/services/invisalign/", "/special-offers/"),
    ("/services/tmd-treatment/", "/services/"),
    ("/services/sleep-apnoea/", "/services/"),
]

# ---- category archives ------------------------------------------------------
CATEGORIES = [
    ("/category/cosmetic-dentistry/", "/services/cosmetic/"),
    ("/category/general-dentistry/", "/services/general-preventive/"),
    ("/category/orthodontics/", "/special-offers/"),
    ("/category/oral-surgery/", "/services/restorative/dental-implants/"),
    ("/category/holistic-dentistry/", "/services/general-preventive/"),
]

# ---- practitioner / member pages (old CPT archives) -------------------------
PEOPLE = [
    ("/dentists/dr-duy/", "/meet-the-team/"),
    ("/dentists/dr-zainab/", "/meet-the-team/"),
    ("/dentists/dr-alan-hwang/", "/meet-the-team/"),
    ("/dentists/dr-manish-sethi/", "/meet-the-team/"),
    ("/practice-manager/melinda-luff/", "/meet-the-team/"),
    ("/practice-manager/melinda-luff-2/", "/meet-the-team/"),
    ("/member/", "/meet-the-team/"),
    ("/member/dr-alan-hwang/", "/meet-the-team/"),
    ("/member/dr-manish-sethi/", "/meet-the-team/"),
]


def build_map():
    """Returns a list of (old_path, new_path, kind, note) with no duplicates."""
    rows = []
    seen = set()

    def add(src, dst, kind, note=""):
        src = src if src.startswith("/") else "/" + src
        if src in seen:
            return
        seen.add(src)
        rows.append((src, dst, kind, note))

    posts = load_posts()
    for p in posts:
        add(p["url"], p["url"], "blog post",
            "same slug preserved 1:1" + ("" if p["outcome"] == "rebrand" else "; reframed as education"))

    # blog pagination (old WP style and any /page/N/ variants)
    for n in range(2, 8):
        add(f"/blog/{n}/", "/blog/", "blog pagination", "consolidated to blog index")
        add(f"/blog/page/{n}/", "/blog/", "blog pagination", "consolidated to blog index")

    for src, dst in PAGES:
        add(src, dst, "page")
    for src, dst in SERVICES_OFFERED:
        add(src, dst, "service (still offered)", "exact new equivalent")
    for src, dst in SERVICES_DROPPED:
        add(src, dst, "service (no longer offered)", "closest offered page; no content implies availability")
    for src, dst in CATEGORIES:
        add(src, dst, "category archive")
    for src, dst in PEOPLE:
        add(src, dst, "practitioner page")

    # WordPress cruft that would otherwise 404
    add("/sitemap_index.xml", "/sitemap.xml", "sitemap", "old WP sitemap index")
    add("/post-sitemap.xml", "/sitemap.xml", "sitemap")
    add("/page-sitemap.xml", "/sitemap.xml", "sitemap")
    add("/services-sitemap.xml", "/sitemap.xml", "sitemap")
    add("/category-sitemap.xml", "/sitemap.xml", "sitemap")
    add("/member-sitemap.xml", "/sitemap.xml", "sitemap")
    add("/dentists-sitemap.xml", "/sitemap.xml", "sitemap")
    add("/wp-sitemap.xml", "/sitemap.xml", "sitemap")
    return rows


def vercel_config(rows):
    """Host-based 301s so the old domains can be added to this Vercel project."""
    redirects = []
    for src, dst, kind, _ in rows:
        for host in OLD_HOSTS:
            # trailing-slash form
            redirects.append({
                "source": src.rstrip("/") or "/",
                "has": [{"type": "host", "value": host}],
                "destination": SITE + dst,
                "permanent": True,
            })
    # image + catch-all safety nets, last so specific rules win
    for host in OLD_HOSTS:
        redirects.append({
            "source": "/wp-content/uploads/:path*",
            "has": [{"type": "host", "value": host}],
            "destination": SITE + "/blog/",
            "permanent": True,
        })
        redirects.append({
            "source": "/:path*",
            "has": [{"type": "host", "value": host}],
            "destination": SITE + "/",
            "permanent": True,
        })
    # canonical host for the new domain (non-www -> www), single hop
    redirects.append({
        "source": "/:path*",
        "has": [{"type": "host", "value": "footscraydentalstudio.com.au"}],
        "destination": "https://www.footscraydentalstudio.com.au/:path*",
        "permanent": True,
    })
    return {
        "$schema": "https://openapi.vercel.sh/vercel.json",
        "cleanUrls": True,
        "trailingSlash": True,
        "redirects": redirects,
        "headers": [
            {"source": "/assets/(.*)",
             "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
            {"source": "/(.*)",
             "headers": [
                 {"key": "X-Content-Type-Options", "value": "nosniff"},
                 {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
             ]},
        ],
    }


def htaccess(rows):
    out = [
        "# Footscray Dental Studio — 301 redirect map for the old Ezy Dental Group domain.",
        "# Use this if ezydentalgroup.com.au stays on its current WordPress/Apache host",
        "# instead of being pointed at Vercel. Place at the web root of the OLD site.",
        "",
        "<IfModule mod_rewrite.c>",
        "  RewriteEngine On",
        "  RewriteBase /",
        "",
        "  # Force https on the old domain first so every hop below is a single 301.",
        "  RewriteCond %{HTTPS} off",
        "  RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]",
        "",
    ]
    for src, dst, kind, _ in rows:
        pat = "^" + re.escape(src.strip("/")) + "/?$" if src != "/" else "^$"
        out.append(f"  RewriteRule {pat} {SITE}{dst} [R=301,L,NE]")
    out += [
        "",
        "  # Old media files",
        f"  RewriteRule ^wp-content/uploads/(.*)$ {SITE}/blog/ [R=301,L,NE]",
        "",
        "  # Anything not matched above",
        f"  RewriteRule ^(.*)$ {SITE}/ [R=301,L,NE]",
        "</IfModule>",
        "",
    ]
    return "\n".join(out)


def rank_math_csv(rows):
    """Rank Math > General Settings > Redirections > Import CSV format."""
    lines = [["sources", "matching", "url_redirect_to", "header_code", "status"]]
    for src, dst, _, _ in rows:
        lines.append([src, "exact", SITE + dst, "301", "active"])
    return lines


def main():
    rows = build_map()
    (ROOT / "vercel.json").write_text(json.dumps(vercel_config(rows), indent=2) + "\n")
    (OUT / "vercel.json").write_text(json.dumps(vercel_config(rows), indent=2) + "\n")

    with open(ROOT / "redirect-map.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["old_url", "new_url", "status", "type", "note"])
        for src, dst, kind, note in rows:
            w.writerow([f"https://ezydentalgroup.com.au{src}", SITE + dst, 301, kind, note])

    (ROOT / "old-site.htaccess").write_text(htaccess(rows))

    with open(ROOT / "rank-math-redirections.csv", "w", newline="") as f:
        csv.writer(f).writerows(rank_math_csv(rows))

    print(f"redirects: {len(rows)} source URLs")
    print("wrote vercel.json (project root + site/), redirect-map.csv, "
          "old-site.htaccess, rank-math-redirections.csv")
    return rows


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    main()
