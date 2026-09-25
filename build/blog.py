"""Blog section — index, post pages, sitemap.xml.

Posts are authored as markdown with YAML-ish frontmatter in build/blog-content/.
Blog pages are written with clean_urls=True so every crawlable link is a clean
trailing-slash URL (never /index.html), which is what the migration needs for SEO.
"""
import html as _html
import json
import re
from datetime import date
from pathlib import Path

from common import PHONE_DISPLAY, PHONE_TEL, EMAIL, ADDRESS, ICONS, OUT, write_page
from glow import head_v2, header_v2, footer_v2, booking_section

CONTENT = Path(__file__).parent / "blog-content"
SITE = "https://www.footscraydentalstudio.com.au"
AUTHOR = "Footscray Dental Studio Team"
BLOG_URL = "/blog/"
PER_PAGE = 9

SURGICAL_DISCLAIMER = (
    "Any surgical or invasive procedure carries risks. Before proceeding, you should "
    "seek a second opinion from an appropriately qualified health practitioner."
)

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]


def pretty_date(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


_DIMS = {}


def _intrinsic(src):
    """Real pixel size of a local image, so the markup can carry width/height.

    Returns (0, 0) when the file is missing or Pillow is unavailable, in which case
    the build simply omits the attributes rather than failing.
    """
    if src in _DIMS:
        return _DIMS[src]
    size = (0, 0)
    if src.startswith("/"):
        f = OUT / src.lstrip("/")
        if f.exists():
            try:
                from PIL import Image
                with Image.open(f) as im:
                    size = im.size
            except Exception:
                size = (0, 0)
    _DIMS[src] = size
    return size


# ---------------------------------------------------------------- frontmatter
def parse_front_matter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        raise ValueError("missing frontmatter")
    raw, body = m.groups()
    data, key, lines = {}, None, raw.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("  ") and key == "images":
            # list of image mappings
            block = []
            while i < len(lines) and (lines[i].startswith("  ") or not lines[i].strip()):
                block.append(lines[i])
                i += 1
            imgs, cur = [], None
            for b in block:
                bm = re.match(r"\s*-\s*old:\s*(.*)$", b)
                if bm:
                    cur = {"old": bm.group(1).strip()}
                    imgs.append(cur)
                    continue
                km = re.match(r"\s*(local|alt):\s*(.*)$", b)
                if km and cur is not None:
                    cur[km.group(1)] = km.group(2).strip()
            data["images"] = imgs
            continue
        km = re.match(r"^([a-z_][a-z0-9_]*):\s*(.*)$", line)
        if km:
            key, val = km.group(1), km.group(2).strip()
            if key != "images":
                data[key] = val
        i += 1
    data.setdefault("images", [])
    rel = data.get("related", "")
    data["related"] = [s for s in re.findall(r"[\w-]+", rel)]
    data["surgical_disclaimer"] = str(data.get("surgical_disclaimer", "")).lower() == "true"
    return data, body.strip()


# ---------------------------------------------------------------- markdown
def _inline(s):
    s = _html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*([^*\n]+?)\*(?![\w*])", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)",
               lambda m: f'<a href="{m.group(2)}"'
                         + (' target="_blank" rel="noopener"' if m.group(2).startswith("http") else "")
                         + f">{m.group(1)}</a>", s)
    return s


def md_to_html(md, slug):
    """Minimal, deterministic markdown -> HTML for post bodies."""
    out, lines, i = [], md.split("\n"), 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        # image on its own line
        im = re.match(r"^!\[([^\]]*)\]\(([^)\s]+)\)\s*$", line.strip())
        if im:
            alt, src = im.group(1), im.group(2)
            w, h = _intrinsic(src)
            dims = f' width="{w}" height="{h}"' if w else ""
            # Some images carried over from the old site are small thumbnails. Stretching
            # them to the full content width makes them look soft, so cap them at their
            # own size and centre them instead.
            cls = "post-figure post-figure--small" if w and w < 600 else "post-figure"
            out.append(f'<figure class="{cls}"><img src="{src}" alt="{_html.escape(alt, quote=True)}"{dims}'
                       f' loading="lazy" decoding="async" onerror="this.closest(\'figure\').remove()"></figure>')
            i += 1
            continue
        hm = re.match(r"^(#{2,4})\s+(.*)$", line)
        if hm:
            lvl = len(hm.group(1))
            txt = hm.group(2).strip()
            hid = re.sub(r"[^a-z0-9]+", "-", txt.lower()).strip("-")[:60]
            out.append(f'<h{lvl} id="{hid}">{_inline(txt)}</h{lvl}>')
            i += 1
            continue
        if re.match(r"^[-*]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i]):
                items.append(_inline(re.sub(r"^[-*]\s+", "", lines[i]).strip()))
                i += 1
            out.append("<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>")
            continue
        if re.match(r"^\d+[.)]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\d+[.)]\s+", lines[i]):
                items.append(_inline(re.sub(r"^\d+[.)]\s+", "", lines[i]).strip()))
                i += 1
            out.append("<ol>" + "".join(f"<li>{x}</li>" for x in items) + "</ol>")
            continue
        if line.strip().startswith(">"):
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(_inline(lines[i].strip().lstrip("> ").strip()))
                i += 1
            out.append("<blockquote><p>" + " ".join(quote) + "</p></blockquote>")
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{2,4}\s|[-*]\s|\d+[.)]\s|>|!\[)", lines[i]):
            para.append(lines[i].strip())
            i += 1
        if para:
            out.append(f"<p>{_inline(' '.join(para))}</p>")
    return "\n".join(out)


# ---------------------------------------------------------------- loading
def load_posts():
    posts = []
    for f in sorted(CONTENT.glob("*.md")):
        if f.name.startswith("_"):
            continue
        data, body = parse_front_matter(f.read_text(encoding="utf-8"))
        data["body_md"] = body
        data["url"] = f"/{data['slug']}/"
        posts.append(data)
    posts.sort(key=lambda p: (p["date_published"], p["slug"]), reverse=True)
    return posts


# ---------------------------------------------------------------- head/schema
def blog_head(title, desc, url, *, og_type="website", image=None,
              published=None, modified=None, schema_blocks=()):
    h = head_v2(title, desc, url)
    # head_v2 already emits canonical + og:title/description/site_name/type
    extra = [
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{_html.escape(title, quote=True)}">',
        f'<meta name="twitter:description" content="{_html.escape(desc, quote=True)}">',
        f'<meta property="og:url" content="{SITE}{url}">',
    ]
    if image:
        extra.append(f'<meta property="og:image" content="{SITE}{image}">')
        extra.append(f'<meta property="og:image:alt" content="{_html.escape(title, quote=True)}">')
        extra.append(f'<meta name="twitter:image" content="{SITE}{image}">')
    if og_type == "article":
        extra.append('<meta property="og:type" content="article">')
        extra.append(f'<meta property="article:published_time" content="{published}">')
        extra.append(f'<meta property="article:modified_time" content="{modified}">')
        extra.append(f'<meta property="article:author" content="{AUTHOR}">')
    for block in schema_blocks:
        extra.append('<script type="application/ld+json">'
                     + json.dumps(block, ensure_ascii=False, separators=(",", ":"))
                     + "</script>")
    return h.replace("</head>", "\n".join(extra) + "\n</head>")


def publisher_node():
    return {
        "@type": "Dentist",
        "name": "Footscray Dental Studio",
        "alternateName": "Ezy Dental Group",
        "url": SITE + "/",
        "telephone": PHONE_DISPLAY,
        "logo": {"@type": "ImageObject", "url": SITE + "/assets/img/logo.png"},
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "289 Barkly St",
            "addressLocality": "Footscray",
            "addressRegion": "VIC",
            "postalCode": "3011",
            "addressCountry": "AU",
        },
    }


def breadcrumb_schema(trail):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": SITE + u}
            for i, (name, u) in enumerate(trail)
        ],
    }


def faq_schema(pairs):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in pairs
        ],
    }


def extract_faqs(body_html):
    """Pull (question, plain-text answer) pairs from the FAQ section for schema."""
    m = re.search(r'<h2 id="frequently-asked-questions">.*?</h2>(.*)$', body_html, re.S)
    if not m:
        return []
    chunk = m.group(1)
    pairs = []
    for qm in re.finditer(r'<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|<h2|$)', chunk, re.S):
        q = re.sub(r"<[^>]+>", "", qm.group(1)).strip()
        a = re.sub(r"<[^>]+>", " ", qm.group(2))
        a = _html.unescape(re.sub(r"\s+", " ", a)).strip()
        if q and a:
            pairs.append((q, a))
    return pairs


# ---------------------------------------------------------------- components
def crumbs(trail):
    items = []
    for i, (label, u) in enumerate(trail):
        if i == len(trail) - 1:
            items.append(f'<li><span aria-current="page">{label}</span></li>')
        else:
            items.append(f'<li><a href="{u}">{label}</a></li>')
    return ('<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>'
            + "".join(items) + "</ol></nav>")


def post_card(p):
    fw, fh = _intrinsic(p["featured_image"])
    img = (f'<img src="{p["featured_image"]}" alt="{_html.escape(p["featured_alt"], quote=True)}"'
           + (f' width="{fw}" height="{fh}"' if fw else "")
           + ' loading="lazy" decoding="async" onerror="this.remove()">')
    # The title link is "stretched" over the whole card in CSS, so clicking anywhere on
    # the card (including the Read Article button) opens the post. The button is a real
    # anchor too, so it still works if the stylesheet fails to load.
    return f'''<article class="post-card">
  <a class="post-card-media" href="{p["url"]}" tabindex="-1" aria-hidden="true">{img}</a>
  <div class="post-card-body">
    <span class="post-card-meta"><span class="post-cat">{p["category"]}</span><time datetime="{p["date_published"]}">{pretty_date(p["date_published"])}</time></span>
    <h3><a class="post-card-link" href="{p["url"]}">{_html.escape(p["h1"], quote=False)}</a></h3>
    <p>{_html.escape(p["excerpt"], quote=False)}</p>
    <a class="btn btn--sm btn--outline" href="{p["url"]}" tabindex="-1">Read Article</a>
  </div>
</article>'''


# ---------------------------------------------------------------- pages
def blog_index(posts):
    pages = [posts[i:i + PER_PAGE] for i in range(0, len(posts), PER_PAGE)] or [[]]
    for idx, chunk in enumerate(pages):
        page_no = idx + 1
        url = BLOG_URL if page_no == 1 else f"{BLOG_URL}page/{page_no}/"
        title = ("Dental Health Blog | Footscray Dental Studio" if page_no == 1
                 else f"Dental Health Blog, Page {page_no} | Footscray Dental Studio")
        desc = ("Dental health advice from the team at Footscray Dental Studio, covering "
                "tooth pain, gum health, cosmetic treatments and caring for your smile.")
        trail = [("Home", "/"), ("Blog", BLOG_URL)]
        h = blog_head(title, desc, url, image="/assets/img/hero-home.jpg",
                      schema_blocks=[breadcrumb_schema(trail), {
                          "@context": "https://schema.org", "@type": "Blog",
                          "name": "Footscray Dental Studio Blog",
                          "url": SITE + BLOG_URL, "publisher": publisher_node(),
                      }])
        nav_links = []
        if page_no > 1:
            prev = BLOG_URL if page_no == 2 else f"{BLOG_URL}page/{page_no - 1}/"
            nav_links.append(f'<a class="btn btn--outline btn--no-arrow" href="{prev}">Previous</a>')
        if page_no < len(pages):
            nav_links.append(f'<a class="btn btn--navy" href="{BLOG_URL}page/{page_no + 1}/">Next</a>')
        pager = (f'<div class="pager"><span class="pager-count">Page {page_no} of {len(pages)}</span>'
                 f'<div class="btn-row">{"".join(nav_links)}</div></div>') if len(pages) > 1 else ""

        html = [h, header_v2(active=BLOG_URL)]
        html.append(f'''<section class="hero-solid hero-solid--blog">
  <div class="container">
    {crumbs(trail)}
    <span class="eyebrow" style="color:var(--gold-light)">Patient resources</span>
    <h1>Dental Health Blog</h1>
    <p class="hero-sub">Practical, evidence-based advice from our team in Footscray, covering everything from tooth pain and gum health to whitening and caring for your smile at home.</p>
  </div>
</section>
<main id="main">
<section class="section section--off">
  <div class="container">
    <div class="grid grid--3 reveal-stagger">{"".join(post_card(p) for p in chunk)}</div>
    {pager}
  </div>
</section>
''')
        html.append(booking_section())
        html.append("</main>")
        html.append(footer_v2())
        write_page(url, "".join(html), clean_urls=True)
    return len(pages)


def post_page(p, by_slug):
    url = p["url"]
    body_html = md_to_html(p["body_md"], p["slug"])
    trail = [("Home", "/"), ("Blog", BLOG_URL), (p["h1"], url)]
    faqs = extract_faqs(body_html)

    article = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "mainEntityOfPage": {"@type": "WebPage", "@id": SITE + url},
        "headline": p["h1"][:110],
        "description": p["meta_description"],
        "image": [SITE + p["featured_image"]],
        "datePublished": p["date_published"],
        "dateModified": p["date_modified"],
        "author": {"@type": "Organization", "name": AUTHOR, "url": SITE + "/meet-the-team/"},
        "publisher": publisher_node(),
        "inLanguage": "en-AU",
        "articleSection": p["category"],
    }
    blocks = [article, breadcrumb_schema(trail)]
    if faqs:
        blocks.append(faq_schema(faqs))

    h = blog_head(p["title"], p["meta_description"], url, og_type="article",
                  image=p["featured_image"], published=p["date_published"],
                  modified=p["date_modified"], schema_blocks=blocks)

    hw, hh = _intrinsic(p["featured_image"])
    hero_img = (f'<figure class="post-hero-media"><img src="{p["featured_image"]}"'
                f' alt="{_html.escape(p["featured_alt"], quote=True)}" fetchpriority="high"'
                + (f' width="{hw}" height="{hh}"' if hw else "")
                + f' onerror="this.closest(\'figure\').remove()"></figure>')

    disclaimer = (f'<aside class="post-disclaimer"><strong>Please note:</strong> {SURGICAL_DISCLAIMER}</aside>'
                  if p["surgical_disclaimer"] else "")

    rel = [by_slug[s] for s in p["related"] if s in by_slug and s != p["slug"]][:3]
    related_html = ""
    if rel:
        related_html = f'''<section class="section section--off" aria-labelledby="related-reading">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">Keep reading</span>
      <h2 id="related-reading">Related Articles</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(post_card(r) for r in rel)}</div>
  </div>
</section>
'''

    html = [h, header_v2(active=BLOG_URL)]
    html.append(f'''<section class="hero-solid hero-solid--post">
  <div class="container">
    {crumbs(trail)}
    <span class="eyebrow" style="color:var(--gold-light)">{p["category"]}</span>
    <h1>{_html.escape(p["h1"], quote=False)}</h1>
    <p class="post-meta">By {AUTHOR} · <time datetime="{p["date_published"]}">{pretty_date(p["date_published"])}</time>{"" if p["date_modified"] == p["date_published"] else f' · Updated <time datetime="{p["date_modified"]}">{pretty_date(p["date_modified"])}</time>'}</p>
  </div>
</section>
<main id="main">
<article class="section section--white post">
  <div class="container--post">
    {hero_img}
    <div class="post-body">
      {body_html}
    </div>
    {disclaimer}
    <div class="post-cta">
      <h2>Book an appointment in Footscray</h2>
      <p>If anything in this article sounds familiar, our team at 289 Barkly St, Footscray is here to help. Book online or call us and we will find a time that suits you.</p>
      <div class="btn-row">
        <a class="btn btn--navy" href="/patient-info/">Book an Appointment</a>
        <a class="btn btn--outline btn--no-arrow" href="{PHONE_TEL}">{ICONS["phone"]} Call {PHONE_DISPLAY}</a>
      </div>
    </div>
  </div>
</article>
{related_html}''')
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html), clean_urls=True)
    return body_html


# ---------------------------------------------------------------- sitemap.xml
def write_sitemap(posts, index_pages):
    today = date.today().isoformat()
    static = [
        ("/", "1.0", "weekly"), ("/about/", "0.7", "monthly"), ("/meet-the-team/", "0.7", "monthly"),
        ("/services/", "0.9", "monthly"),
        ("/services/general-preventive/", "0.8", "monthly"),
        ("/services/general-preventive/check-ups-cleans/", "0.8", "monthly"),
        ("/services/general-preventive/digital-xrays/", "0.7", "monthly"),
        ("/services/general-preventive/fluoride-treatments/", "0.7", "monthly"),
        ("/services/general-preventive/fissure-sealants/", "0.7", "monthly"),
        ("/services/general-preventive/gum-disease-care/", "0.8", "monthly"),
        ("/services/general-preventive/mouthguards/", "0.7", "monthly"),
        ("/services/cosmetic/", "0.8", "monthly"),
        ("/services/cosmetic/teeth-whitening/", "0.8", "monthly"),
        ("/services/cosmetic/veneers/", "0.8", "monthly"),
        ("/services/cosmetic/composite-bonding/", "0.7", "monthly"),
        ("/services/cosmetic/smile-makeovers/", "0.7", "monthly"),
        ("/services/restorative/", "0.8", "monthly"),
        ("/services/restorative/fillings/", "0.7", "monthly"),
        ("/services/restorative/crowns-bridges/", "0.7", "monthly"),
        ("/services/restorative/root-canal/", "0.8", "monthly"),
        ("/services/restorative/dental-implants/", "0.8", "monthly"),
        ("/services/restorative/all-on-x-implants/", "0.8", "monthly"),
        ("/services/restorative/dentures/", "0.7", "monthly"),
        ("/services/emergency-dentistry/", "0.9", "monthly"),
        ("/services/childrens-dentistry/", "0.7", "monthly"),
        ("/special-offers/", "0.8", "weekly"), ("/patient-info/", "0.9", "monthly"),
        ("/contact/", "0.8", "monthly"), ("/sitemap/", "0.3", "yearly"),
        ("/privacy-policy/", "0.2", "yearly"), ("/terms/", "0.2", "yearly"),
    ]
    rows = [f"  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod>"
            f"<changefreq>{cf}</changefreq><priority>{pr}</priority></url>"
            for u, pr, cf in static]
    rows.append(f"  <url><loc>{SITE}{BLOG_URL}</loc><lastmod>{today}</lastmod>"
                f"<changefreq>weekly</changefreq><priority>0.8</priority></url>")
    for n in range(2, index_pages + 1):
        rows.append(f"  <url><loc>{SITE}{BLOG_URL}page/{n}/</loc><lastmod>{today}</lastmod>"
                    f"<changefreq>weekly</changefreq><priority>0.4</priority></url>")
    for p in posts:
        rows.append(f"  <url><loc>{SITE}{p['url']}</loc><lastmod>{p['date_modified']}</lastmod>"
                    f"<changefreq>monthly</changefreq><priority>0.7</priority></url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    (OUT / "sitemap.xml").write_text(xml, encoding="utf-8")
    robots = (f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    (OUT / "robots.txt").write_text(robots, encoding="utf-8")
    print(f"wrote sitemap.xml ({len(rows)} urls) + robots.txt")


def main():
    posts = load_posts()
    by_slug = {p["slug"]: p for p in posts}
    pages = blog_index(posts)
    for p in posts:
        post_page(p, by_slug)
    write_sitemap(posts, pages)
    print(f"blog complete — {len(posts)} posts, {pages} index page(s)")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    main()
