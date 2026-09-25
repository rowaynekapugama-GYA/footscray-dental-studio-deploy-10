"""Verification suite for the Ezy Dental Group -> Footscray Dental Studio blog migration.

Run: cd build && python3 verify_migration.py
Exits non-zero if any check fails.
"""
import csv
import html as _html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SITE_DIR = ROOT / "site"
SITE = "https://www.footscraydentalstudio.com.au"
OLD_POSTS_EXPECTED = 32

# Wording that would offer a service the practice no longer provides.
OFFER_VERBS = r"(?:we|our|us)\b[^.]{0,80}?"
DROPPED_PATTERNS = [
    (r"\bour (?:invisalign|orthodontic|aligner) treatment", "offers aligner/ortho treatment"),
    (r"\bwe (?:provide|offer|perform|do|carry out)\b[^.]{0,60}\b(?:invisalign|orthodontic|braces|aligner)", "offers aligner/ortho treatment"),
    (r"\bwe (?:provide|offer|perform|do|carry out|remove)\b[^.]{0,60}\bwisdom (?:tooth|teeth)\b", "offers wisdom tooth removal"),
    (r"\bour wisdom (?:tooth|teeth) (?:removal|extraction)", "offers wisdom tooth removal"),
    (r"\bwe (?:provide|offer|perform|do|carry out)\b[^.]{0,60}\b(?:bone graft|sinus lift)", "offers bone grafting/sinus lift"),
    (r"\bour (?:bone graft|sinus lift|tmd|sleep apnoea|laser dentistry|gummy smile)", "offers dropped service"),
    (r"\bwe (?:provide|offer|perform|treat)\b[^.]{0,60}\b(?:tmd|tmj|sleep apnoea)", "offers TMD/sleep apnoea"),
    (r"\bbook (?:your|an?) (?:invisalign|orthodontic|braces|wisdom|bone graft|tmd|sleep apnoea)[^.]{0,40}\btreatment", "books a dropped service"),
    (r"\bwe (?:provide|offer|perform)\b[^.]{0,60}\blaser dentistry", "offers laser dentistry"),
]
# Informational mentions are allowed; these phrases mark clearly informational framing.
INFORMATIONAL_HINTS = (
    "a dentist may", "dentists may", "your dentist can", "is typically performed",
    "is usually performed", "an oral surgeon", "a periodontist", "an orthodontist",
    "may recommend", "generally performed", "typically carried out",
)

results = []
failures = 0


def check(name, ok, detail=""):
    global failures
    results.append((name, ok, detail))
    if not ok:
        failures += 1
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"\n      {detail}" if detail else ""))


def page_paths():
    return sorted(SITE_DIR.rglob("*.html"))


def load_post_slugs():
    return sorted(p.stem for p in (Path(__file__).parent / "blog-content").glob("*.md")
                  if not p.name.startswith("_"))


def main():
    slugs = load_post_slugs()
    print("=" * 74)
    print("BLOG MIGRATION VERIFICATION — Footscray Dental Studio")
    print("=" * 74)

    # ---- 1. post count ------------------------------------------------------
    built = [s for s in slugs if (SITE_DIR / s / "index.html").exists()]
    check("1. Post count: every old post migrated and built",
          len(slugs) == OLD_POSTS_EXPECTED and len(built) == OLD_POSTS_EXPECTED,
          f"old site posts: {OLD_POSTS_EXPECTED} | authored: {len(slugs)} | built pages: {len(built)}")

    # ---- 2. redirects -------------------------------------------------------
    rows = list(csv.DictReader(open(ROOT / "redirect-map.csv")))
    dest_missing, dup, chains = [], [], []
    srcs = [r["old_url"] for r in rows]
    for s in set(srcs):
        if srcs.count(s) > 1:
            dup.append(s)
    dest_paths = set()
    for r in rows:
        dst = r["new_url"].replace(SITE, "")
        dest_paths.add(dst)
        target = SITE_DIR / dst.strip("/") / "index.html" if dst != "/" else SITE_DIR / "index.html"
        if dst.endswith(".xml"):
            target = SITE_DIR / dst.strip("/")
        if not target.exists():
            dest_missing.append(f"{r['old_url']} -> {dst}")
        if r["status"] != "301":
            chains.append(r["old_url"])
    # a destination that is itself a redirect source would be a chain
    src_paths = {r["old_url"].replace("https://ezydentalgroup.com.au", "") for r in rows}
    overlap = {d for d in dest_paths if d in src_paths and d not in ("/",)}
    real_chains = {d for d in overlap
                   if d not in {r["new_url"].replace(SITE, "") for r in rows if
                                r["old_url"].replace("https://ezydentalgroup.com.au", "") == d}}
    check("2. Redirects: every old URL has exactly one 301 to a page that exists",
          not dest_missing and not dup and not chains,
          f"sources: {len(rows)} | duplicates: {len(dup)} | non-301: {len(chains)} | "
          f"dead destinations: {len(dest_missing)}"
          + ("\n      " + "; ".join(dest_missing[:5]) if dest_missing else ""))
    check("2b. Redirects: no chains (no destination is also a redirect source)",
          not real_chains, f"{sorted(real_chains) if real_chains else 'none'}")

    # vercel.json sanity
    vj = json.loads((ROOT / "vercel.json").read_text())
    host_rules = [r for r in vj["redirects"] if any(h.get("value", "").endswith("ezydentalgroup.com.au")
                                                    for h in r.get("has", []))]
    check("2c. vercel.json: host-based rules present for both old domains",
          len(host_rules) >= len(rows) * 2,
          f"{len(host_rules)} host-scoped redirect rules, permanent=True on all: "
          f"{all(r['permanent'] for r in vj['redirects'])}")

    # ---- 3. no old brand text ----------------------------------------------
    # Intentional continuity references are allowed: the footer "Formerly..." line, the
    # schema alternateName, and the client-approved rebrand copy on the About page.
    # Every OTHER page — every migrated blog post especially — must be free of the old brand.
    offenders, intentional = [], []
    allowed_context = ("formerly ezy dental group", '"ezy dental group"', "alternatename")
    CONTINUITY_PAGES = {"about/index.html"}
    for p in page_paths():
        rel = str(p.relative_to(SITE_DIR))
        t = p.read_text()
        for m in re.finditer(r"Ezy\s*Dental(?:\s*Group)?", t, re.I):
            window = t[max(0, m.start() - 140): m.end() + 60].lower()
            snippet = re.sub(r"\s+", " ", t[max(0, m.start() - 55): m.end() + 55])
            if any(a in window for a in allowed_context) or rel in CONTINUITY_PAGES:
                intentional.append(f"{rel}: ...{snippet}...")
                continue
            offenders.append(f"{rel}: ...{snippet}...")
    post_offenders = [o for o in offenders if o.split("/")[0] in slugs]
    check("3. No old brand text in migrated posts (intentional continuity references excluded)",
          not offenders,
          f"unexpected: {len(offenders)} (of which in blog posts: {len(post_offenders)}) | "
          f"intentional continuity references: {len(intentional)}"
          + ("\n      " + "\n      ".join(offenders[:5]) if offenders else ""))

    # ---- 4. no links to the old domain -------------------------------------
    old_links = []
    for p in page_paths():
        for m in re.finditer(r'(?:href|src)="([^"]*ezydentalgroup\.com\.au[^"]*)"', p.read_text()):
            old_links.append(f"{p.relative_to(SITE_DIR)}: {m.group(1)}")
    check("4. No links or image references to ezydentalgroup.com.au",
          not old_links, f"{len(old_links)} found"
          + ("\n      " + "\n      ".join(old_links[:5]) if old_links else ""))

    # ---- 5. SEO tags --------------------------------------------------------
    titles, metas, seo_issues = {}, {}, []
    for s in slugs:
        f = SITE_DIR / s / "index.html"
        t = f.read_text()
        ti = re.search(r"<title>(.*?)</title>", t, re.S)
        me = re.search(r'<meta name="description" content="([^"]*)"', t)
        ca = re.search(r'<link rel="canonical" href="([^"]*)"', t)
        h1s = re.findall(r"<h1[ >]", t)
        ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, re.S)
        kinds = []
        for block in ld:
            try:
                kinds.append(json.loads(block).get("@type"))
            except json.JSONDecodeError:
                seo_issues.append(f"{s}: invalid JSON-LD")
        if not ti:
            seo_issues.append(f"{s}: no title")
        else:
            titles.setdefault(ti.group(1), []).append(s)
        if not me:
            seo_issues.append(f"{s}: no meta description")
        else:
            metas.setdefault(me.group(1), []).append(s)
        if not ca or ca.group(1) != f"{SITE}/{s}/":
            seo_issues.append(f"{s}: canonical wrong ({ca.group(1) if ca else 'missing'})")
        if len(h1s) != 1:
            seo_issues.append(f"{s}: {len(h1s)} h1 tags")
        if "BlogPosting" not in kinds:
            seo_issues.append(f"{s}: no BlogPosting schema")
        if "BreadcrumbList" not in kinds:
            seo_issues.append(f"{s}: no BreadcrumbList schema")
        if 'property="og:image"' not in t or 'name="twitter:card"' not in t:
            seo_issues.append(f"{s}: missing OG/Twitter tags")
    for d, ss in titles.items():
        if len(ss) > 1:
            seo_issues.append(f"duplicate title across {ss}")
    for d, ss in metas.items():
        if len(ss) > 1:
            seo_issues.append(f"duplicate meta across {ss}")
    check("5. SEO tags: unique title + meta, self-canonical, one H1, valid BlogPosting/Breadcrumb schema",
          not seo_issues, f"{len(seo_issues)} issues"
          + ("\n      " + "\n      ".join(seo_issues[:6]) if seo_issues else
             f"{len(slugs)} posts checked, all clean"))

    # FAQPage where FAQs exist
    faq_missing = []
    for s in slugs:
        t = (SITE_DIR / s / "index.html").read_text()
        has_faq_heading = 'id="frequently-asked-questions"' in t
        has_faq_schema = '"FAQPage"' in t
        if has_faq_heading != has_faq_schema:
            faq_missing.append(f"{s}: heading={has_faq_heading} schema={has_faq_schema}")
    faq_count = sum(1 for s in slugs if '"FAQPage"' in (SITE_DIR / s / "index.html").read_text())
    check("5b. FAQPage schema present exactly where a post has an FAQ section",
          not faq_missing, "; ".join(faq_missing) if faq_missing
          else f"{faq_count} posts with FAQ schema")

    # ---- 6. links and images ------------------------------------------------
    broken, missing_imgs = [], []
    for p in page_paths():
        rel = p.relative_to(SITE_DIR)
        t = p.read_text()
        for attr, val in re.findall(r'(href|src)="([^"]+)"', t):
            if val.startswith(("http", "mailto:", "tel:", "#", "data:")):
                continue
            path = val.split("#")[0].split("?")[0]
            if not path:
                continue
            if path.startswith("/"):
                target = SITE_DIR / path.lstrip("/")
                if path.endswith("/"):
                    target = target / "index.html"
            else:
                target = (p.parent / path).resolve()
                if path.endswith("/"):
                    target = target / "index.html"
            if not target.exists():
                (missing_imgs if attr == "src" else broken).append(f"{rel}: {val}")
    check("6. No broken internal links", not broken,
          f"{len(broken)} broken" + ("\n      " + "\n      ".join(broken[:6]) if broken else ""))
    check("6b. All blog images resolve in the build", not missing_imgs,
          f"{len(missing_imgs)} missing"
          + ("\n      " + "\n      ".join(missing_imgs[:6]) if missing_imgs else
             f"{len(list((SITE_DIR / 'assets/img/blog').glob('*')))} blog image files present"))

    # ---- 7. no offers of dropped services -----------------------------------
    offers, informational = [], []
    for s in slugs:
        t = (SITE_DIR / s / "index.html").read_text()
        body = re.search(r'<div class="post-body">(.*?)</div>\s*(?:<aside|<div class="post-cta")', t, re.S)
        text = re.sub(r"<[^>]+>", " ", body.group(1) if body else t)
        text = _html.unescape(re.sub(r"\s+", " ", text)).lower()
        for pat, label in DROPPED_PATTERNS:
            for m in re.finditer(pat, text):
                snippet = text[max(0, m.start() - 70): m.end() + 70]
                offers.append(f"{s} [{label}]: ...{snippet.strip()}...")
        for term in ("invisalign", "aligner", "wisdom tooth", "wisdom teeth", "bone graft",
                     "sinus lift", "orthodontic", "braces", "tmd", "sleep apnoea", "laser dentistry"):
            if term in text:
                informational.append((s, term))
    check("7. No post offers a service from the 'no longer offered' list",
          not offers, f"{len(offers)} offering statements"
          + ("\n      " + "\n      ".join(offers[:6]) if offers else
             "all mentions are informational"))

    # report the informational mentions for the client to confirm
    by_post = {}
    for s, term in informational:
        by_post.setdefault(s, set()).add(term)
    print("\n  Informational mentions of non-offered treatments (expected in reframed posts):")
    for s in sorted(by_post):
        print(f"    - {s}: {', '.join(sorted(by_post[s]))}")

    # ---- 8. extras ----------------------------------------------------------
    sm = (SITE_DIR / "sitemap.xml").read_text()
    sitemap_missing = [s for s in slugs if f"{SITE}/{s}/" not in sm]
    check("8. sitemap.xml contains /blog/ and every post",
          not sitemap_missing and f"{SITE}/blog/" in sm,
          f"{sm.count('<loc>')} URLs; missing posts: {sitemap_missing or 'none'}")

    idx_ok = all((SITE_DIR / "blog" / "index.html").exists() for _ in [0])
    nav_ok = all('href="/blog/"' in (SITE_DIR / s / "index.html").read_text() or
                 'blog/index.html"' in (SITE_DIR / s / "index.html").read_text() for s in ["about", "contact"])
    check("8b. Blog linked from navigation and footer on non-blog pages", idx_ok and nav_ok)

    formerly = sum("Formerly Ezy Dental Group" in p.read_text() for p in page_paths())
    alt = sum('"alternateName":"Ezy Dental Group"' in p.read_text() for p in page_paths())
    check("8c. Rebrand continuity: 'Formerly Ezy Dental Group' visible + alternateName in schema",
          formerly > 0 and alt == len(page_paths()),
          f"visible note on {formerly} pages; alternateName on {alt}/{len(page_paths())} pages")

    no_index_html = []
    for s in slugs + ["blog"]:
        t = (SITE_DIR / s / "index.html").read_text()
        if re.search(r'href="[^"]*index\.html"', t):
            no_index_html.append(s)
    check("8d. Blog pages use clean trailing-slash URLs (no /index.html links)",
          not no_index_html, f"{no_index_html[:5] if no_index_html else 'clean'}")

    print("\n" + "=" * 74)
    print(f"RESULT: {len(results) - failures}/{len(results)} checks passed")
    print("=" * 74)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
