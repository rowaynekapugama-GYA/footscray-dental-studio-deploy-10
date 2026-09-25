"""Roll the approved Glowdent-language design out to the remaining 30 pages.
Stock photography (Unsplash) with graceful gradient fallbacks."""
import re
from pathlib import Path
from common import (
    ICONS, PHONE_DISPLAY, PHONE_TEL, EMAIL, ADDRESS, MAPS_URL, HOURS,
    form_hidden, form_error,
    GP_SUBS, COS_SUBS, RES_SUBS, parse_copy, get_section, md_inline,
    md_inline_label, render_faq, render_checklist, render_steps,
    render_cta_row, write_page, OUT,
)
from glow import (
    head_v2, header_v2, footer_v2, booking_section, faq_section_v2, MEGA_IMGS,
)
from utility import PRIVACY_BODY, TERMS_BODY, FLAG

U = "https://images.unsplash.com/"
def stock(pid, w=1600, h=None, q=70):
    hh = f"&h={h}" if h else ""
    return f"{U}{pid}?auto=format&fit=crop&w={w}{hh}&q={q}"

# Curated stock pool (Unsplash) — every use has a gradient fallback via onerror
STOCK = {
    "clinic-treat": "photo-1606811841689-23dfddce3e95",   # dentist treating patient
    "clinic-chair": "photo-1629909613654-28e377c37b09",   # modern dental chair/equipment
    "surgery": "photo-1551601651-2a8555f1a136",           # dental procedure
    "medtech": "photo-1576091160399-112ba8d25d1d",        # clinician with screen
    "medtech2": "photo-1576091160550-2173dba999ef",       # medical tech detail
    "doc-f": "photo-1559839734-2b71ea197ec2",             # smiling female clinician
    "doc-m": "photo-1612349317150-e413f6a5b16d",          # male clinician
    "smile-w": "photo-1494790108377-be9c29b29330",        # smiling woman
    "smile-w2": "photo-1438761681033-6461ffad8d80",       # smiling woman 2
    "smile-m": "photo-1500648767791-00dcc994a43e",        # smiling man
    "child": "photo-1503454537195-1dcabb73ffb9",          # happy child
}

def simg(key, cls="", w=1600, h=None, alt="", extra=""):
    c = f' class="{cls}"' if cls else ""
    return (f'<img src="{stock(STOCK[key], w, h)}" alt="{alt}"{c} loading="lazy" '
            f'onerror="this.remove()" {extra}>')

PAGE_IMG = {  # url-slug → (stock key, hero alt)
    "services": ("clinic-chair", "A modern, light-filled dental treatment room"),
    "general-preventive": ("clinic-treat", "A dentist performing a gentle check-up"),
    "cosmetic": ("smile-w", "A patient with a bright, confident smile"),
    "restorative": ("surgery", "A dentist at work restoring a patient's smile"),
    "check-ups-cleans": ("clinic-treat", "A routine dental examination in progress"),
    "digital-xrays": ("medtech", "A clinician reviewing digital imaging on screen"),
    "fluoride-treatments": ("clinic-chair", "A bright, modern dental treatment room"),
    "fissure-sealants": ("child", "A child smiling at a dental visit"),
    "gum-disease-care": ("doc-f", "A caring clinician talking with a patient"),
    "mouthguards": ("medtech2", "Precision dental equipment detail"),
    "teeth-whitening": ("smile-w2", "A patient smiling after whitening treatment"),
    "veneers": ("smile-w", "A patient with a bright, even smile"),
    "composite-bonding": ("smile-m", "A patient with a natural, confident smile"),
    "smile-makeovers": ("doc-f", "A clinician discussing a smile plan with a patient"),
    "fillings": ("clinic-treat", "A dentist placing a tooth-coloured filling"),
    "crowns-bridges": ("surgery", "A dentist working with precision instruments"),
    "root-canal": ("medtech2", "Advanced endodontic equipment"),
    "dental-implants": ("clinic-chair", "A modern dental implant treatment room"),
    "all-on-x-implants": ("surgery", "A clinician preparing a full-arch restoration"),
    "dentures": ("doc-m", "A clinician consulting with a denture patient"),
    "emergency-dentistry": ("doc-m", "A reassuring dentist ready to help promptly"),
    "childrens-dentistry": ("child", "A cheerful child at the dentist"),
    "about": ("clinic-treat", "The Footscray Dental Studio team caring for a patient"),
    "meet-the-team": ("doc-f", "A Footscray Dental Studio practitioner welcoming a patient"),
    "special-offers": ("smile-w2", "A smiling patient at the practice"),
    "patient-info": ("clinic-chair", "A welcoming, modern dental studio"),
    "contact": ("doc-f", "The warm reception at Footscray Dental Studio with the practice's illuminated logo"),
}

# Client-supplied photos for individual named sections (keyed by section, not page slug)
SECTION_IMGS = {
    # About Us → "Continuity, With Fresh Expertise" (Familiar faces, new expertise)
    "about-continuity": "https://i.imgur.com/imJX0zw.jpeg",
    # About Us → "Our Philosophy"
    "about-philosophy": "https://i.imgur.com/uqOPyDL.jpeg",
    # Services hub → "Not Sure Where to Start?" (We'll guide you)
    "services-not-sure": "https://i.imgur.com/scUYNAQ.jpeg",
    # Book an Appointment → "Your First Visit" (New patients welcome)
    "book-first-visit": "https://i.imgur.com/1zWOhQw.jpeg",
}

# Client-supplied page photos (replace stock; keyed by url slug)
PAGE_IMG_OVERRIDES = {
    "special-offers": {"hero": "https://i.imgur.com/jbw7Nc9.jpeg"},
    "about": {"hero": "https://i.imgur.com/P8h1gcy.png"},
    "meet-the-team": {"hero": "https://i.imgur.com/ppKoZRB.png"},
    "patient-info": {"hero": "https://i.imgur.com/UTdvjTy.png"},
    # Self-hosted (shipped in assets/img) rather than hot-linked, for load speed
    "contact": {"hero": "/assets/img/contact-hero.jpg"},
    "services": {"hero": "https://i.imgur.com/GmRdQzW.png"},
    "general-preventive": {"hero": "https://i.imgur.com/Jpg4mWJ.jpeg",
                           "card": "https://i.imgur.com/Jpg4mWJ.jpeg"},
    "cosmetic": {"hero": "https://i.imgur.com/MmVFR3N.jpeg",
                 "card": "https://i.imgur.com/MmVFR3N.jpeg"},
    "restorative": {"hero": "https://i.imgur.com/5GKmK90.jpeg",
                    "card": "https://i.imgur.com/5GKmK90.jpeg"},
    "check-ups-cleans": {
        "hero": "https://i.imgur.com/OcmqYpW.png",
        "split": "https://i.imgur.com/uL2zM5b.jpeg",
    },
    "digital-xrays": {
        "hero": "https://i.imgur.com/vGISnCN.png",
        "split": "https://i.imgur.com/xz5onx6.jpeg",
    },
    "teeth-whitening": {"hero": "https://i.imgur.com/PI253TK.png", "split": "https://i.imgur.com/QNDs09Q.png"},
    "smile-makeovers": {"hero": "https://i.imgur.com/VBDfYZu.png", "split": "https://i.imgur.com/bvuFiO1.jpeg"},
    "root-canal": {"hero": "https://i.imgur.com/Wr0gYZz.png", "split": "https://i.imgur.com/x2Iyrho.jpeg"},
    "veneers": {"hero": "https://i.imgur.com/ox4jP2y.png", "split": "https://i.imgur.com/cay1m4z.png"},
    "mouthguards": {"hero": "https://i.imgur.com/5ML2kXJ.png", "split": "https://i.imgur.com/V5yOWWm.jpeg"},
    "gum-disease-care": {"hero": "https://i.imgur.com/6d4uk2O.png", "split": "https://i.imgur.com/6CGeCj4.jpeg"},
    "fluoride-treatments": {"hero": "https://i.imgur.com/evaoQ4b.png", "split": "https://i.imgur.com/BdTD6am.jpeg"},
    "fissure-sealants": {"hero": "https://i.imgur.com/1rfMV54.png", "split": "https://i.imgur.com/A7D3CCe.jpeg"},
    "fillings": {"hero": "https://i.imgur.com/tzgYvhl.png", "split": "https://i.imgur.com/adLuCbW.jpeg"},
    "emergency-dentistry": {"hero": "https://i.imgur.com/AutD0RT.png", "split": "https://i.imgur.com/c6Sco2v.png"},
    "dentures": {"hero": "https://i.imgur.com/W3SohjW.png", "split": "https://i.imgur.com/ndwZaWl.jpeg"},
    "dental-implants": {"hero": "https://i.imgur.com/bYePiBn.png", "split": "https://i.imgur.com/FkjvRVW.jpeg"},
    "crowns-bridges": {"hero": "https://i.imgur.com/yaR6KOg.png", "split": "https://i.imgur.com/YrXcxSO.jpeg"},
    "composite-bonding": {"hero": "https://i.imgur.com/3J1MPP3.png", "split": "https://i.imgur.com/RU7EWIz.png"},
    "childrens-dentistry": {"hero": "https://i.imgur.com/aMnL62E.png", "split": "https://i.imgur.com/SMTGnz3.jpeg"},
    "all-on-x-implants": {"hero": "https://i.imgur.com/bC6995a.png", "split": "https://i.imgur.com/vHBiTmS.jpeg"},
}

def page_img_src(slug, kind, fallback_url):
    return PAGE_IMG_OVERRIDES.get(slug, {}).get(kind, fallback_url)

def hero_cta_style(idx, label):
    return "btn--white" if idx == 0 else "btn--glass btn--no-arrow"

def crumbs_inline(trail):
    items = []
    for i, (label, url) in enumerate(trail):
        if i == len(trail) - 1:
            items.append(f'<li><span aria-current="page">{label}</span></li>')
        else:
            items.append(f'<li><a href="{url}">{label}</a></li>')
    return f'<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>{"".join(items)}</ol></nav>'

def inner_hero(slug, eyebrow, h1, lede_html, cta_html="", trail=None, extra=""):
    key, alt = PAGE_IMG.get(slug, ("clinic-chair", "Modern dental clinic"))
    crumbs = crumbs_inline(trail) if trail else ""
    # Admin panel hooks: the first hero paragraph becomes the page's editable intro
    lede_html = lede_html.replace('<p class="hero-sub">', f'<p class="hero-sub" data-cms="pages.{slug}.intro">', 1)
    return f'''<section class="hero-photo hero-photo--short">
  <img class="hero-bg" src="{page_img_src(slug, "hero", stock(STOCK[key], 1800))}" alt="{alt}" onerror="this.remove()" fetchpriority="high" data-cms-attr="src:pages.{slug}.hero_image">
  <div class="hero-scrim" aria-hidden="true"></div>
  <div class="container">
    <div class="hero-content">
      {crumbs}
      <span class="eyebrow" style="color:var(--gold-light)">{eyebrow}</span>
      <h1{' class="h1--long"' if len(re.sub(r"<[^>]+>", "", h1)) > 55 else ""} data-cms="pages.{slug}.h1">{h1}</h1>
      {lede_html}
      {cta_html}
      {extra}
    </div>
  </div>
</section>
<main id="main">
'''

def lede_blocks(sections, style_map=hero_cta_style):
    """Returns (raw_paras, strong_line, cta_html)."""
    sec = get_section(sections, "__lede__")
    paras, ctas, strong_line = [], None, None
    for btype, payload in sec["blocks"]:
        if btype == "p":
            if re.match(r"^\*\*[^[].*\*\*$", payload.strip()):
                strong_line = payload.strip().strip("*")
            else:
                paras.append(payload)
        elif btype == "cta":
            ctas = payload
    cta_html = render_cta_row(ctas, style_map=style_map, large=True) if ctas else ""
    return paras, strong_line, cta_html

def split_intro(paras, max_words=40):
    """Keep 1 short sentence (or 2 if still under max_words) for the hero;
    everything else is relocated verbatim to the overview section."""
    first = paras[0]
    sentences = re.split(r"(?<=[.!?])\s+", first)
    intro = sentences[0]
    used = 1
    if len(intro.split()) < 18 and len(sentences) > 1 and \
            len((intro + " " + sentences[1]).split()) <= max_words:
        intro = intro + " " + sentences[1]
        used = 2
    rest_first = " ".join(sentences[used:]).strip()
    remaining = ([rest_first] if rest_first else []) + list(paras[1:])
    return intro, remaining

def overview_section(remaining, heading="What you should know", eyebrow="Overview",
                     bg="section--off", extra_html="", cms_key=None):
    if not remaining and not extra_html:
        return ""
    body = "".join(f"<p>{md_inline(p)}</p>" for p in remaining) + extra_html
    mark = f' data-cms="{cms_key}"' if cms_key else ""
    hmark = f' data-cms="{cms_key}_heading"' if cms_key else ""
    return f'''<section class="section {bg}" aria-labelledby="overview-heading">
  <div class="container overview-grid reveal">
    <div>
      <span class="eyebrow">{eyebrow}</span>
      <h2 id="overview-heading"{hmark}>{heading}</h2>
    </div>
    <div class="overview-body"{mark}>{body}</div>
  </div>
</section>
'''

def grid_n(n, base=3):
    return f"grid grid--{base} grid--n{n}"

def prose_section(sec, bg):
    hid = re.sub(r"[^a-z0-9]+", "-", sec["heading"].lower()).strip("-")
    inner = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            inner.append(f"<p>{md_inline(payload)}</p>")
        elif btype == "ul":
            inner.append(render_checklist(payload))
        elif btype == "ol":
            inner.append(render_steps(payload, grid=len(payload) >= 4))
        elif btype == "cta":
            inner.append(render_cta_row(payload))
        elif btype == "note":
            inner.append(f'<p class="small-note">{md_inline(payload)}</p>')
    return f'''<section class="section {bg}" aria-labelledby="{hid}">
  <div class="container--narrow reveal">
    <h2 id="{hid}">{sec["heading"]}</h2>
    {"".join(inner)}
  </div>
</section>
'''

def steps_section(sec, bg):
    hid = re.sub(r"[^a-z0-9]+", "-", sec["heading"].lower()).strip("-")
    inner = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            inner.append(f'<p style="max-width:46rem">{md_inline(payload)}</p>')
        elif btype == "ol":
            inner.append(render_steps(payload, grid=True))
        elif btype == "ul":
            inner.append(render_checklist(payload))
        elif btype == "cta":
            inner.append(render_cta_row(payload))
    return f'''<section class="section {bg}" aria-labelledby="{hid}">
  <div class="container">
    <div class="section-head reveal"><h2 id="{hid}">{sec["heading"]}</h2></div>
    <div class="reveal">{"".join(inner)}</div>
  </div>
</section>
'''

def suitable_split(sec, slug, bg):
    hid = re.sub(r"[^a-z0-9]+", "-", sec["heading"].lower()).strip("-")
    key, alt = PAGE_IMG.get(slug, ("clinic-chair", ""))
    inner = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            inner.append(f"<p>{md_inline(payload)}</p>")
        elif btype == "ul":
            inner.append(render_checklist(payload, two_col=False))
        elif btype == "cta":
            inner.append(render_cta_row(payload))
    split_img = (f'<img src="{page_img_src(slug, "split", stock(STOCK[key], 1100))}" alt="{alt}" '
                 f'loading="lazy" onerror="this.remove()">')
    return f'''<section class="section {bg}" aria-labelledby="{hid}">
  <div class="container split reveal">
    <div>
      <span class="eyebrow">Is this right for you?</span>
      <h2 id="{hid}">{sec["heading"]}</h2>
      {"".join(inner)}
    </div>
    <div class="split-photo">{split_img}</div>
  </div>
</section>
'''

def content_split(sec, slug, bg):
    """Prose section rendered as a photo split (used when a client photo is supplied
    for a page that has no 'Who It's Suitable For' section)."""
    hid = re.sub(r"[^a-z0-9]+", "-", sec["heading"].lower()).strip("-")
    key, alt = PAGE_IMG.get(slug, ("clinic-chair", ""))
    inner = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            inner.append(f"<p>{md_inline(payload)}</p>")
        elif btype == "ul":
            inner.append(render_checklist(payload, two_col=False))
        elif btype == "cta":
            inner.append(render_cta_row(payload))
    split_img = (f'<img src="{page_img_src(slug, "split", stock(STOCK[key], 1100))}" alt="{alt}" '
                 f'loading="lazy" onerror="this.remove()">')
    return f'''<section class="section {bg}" aria-labelledby="{hid}">
  <div class="container split reveal">
    <div>
      <h2 id="{hid}">{sec["heading"]}</h2>
      {"".join(inner)}
    </div>
    <div class="split-photo">{split_img}</div>
  </div>
</section>
'''

def related_section_v2(sec):
    if not sec:
        return ""
    links = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            links += re.findall(r"\[([^\]]+)\]\(([^)]+)\)", payload)
    if not links:
        return ""
    from services import SERVICE_ICONS  # icon mapping by slug
    cards = []
    for n, u in links:
        slug = u.rstrip("/").split("/")[-1]
        ic = SERVICE_ICONS.get(slug, "tooth")
        cards.append(f'''<article class="svc-card related-card">
  <span class="icon-tile">{ICONS[ic]}</span>
  <h3><a href="{u}">{n}</a></h3>
  <span class="btn btn--sm btn--outline">Learn More</span>
</article>''')
    n = len(links)
    cls = {1: "grid grid--2 grid--n1", 2: "grid grid--2", 3: "grid grid--3",
           4: "grid grid--4"}.get(n, grid_n(n))
    return f'''<section class="section section--off" aria-label="Related services">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Keep exploring</span>
      <h2>Related Services</h2>
    </div>
    <div class="{cls} reveal-stagger">{"".join(cards)}</div>
  </div>
</section>
'''

# ================================================================ sub-service template
def service_page(fname, url, category_label, category_url):
    meta, sections = parse_copy(fname)
    slug = url.rstrip("/").split("/")[-1]
    paras, strong_line, cta_html = lede_blocks(sections)
    intro, remaining = split_intro(paras)
    trail = [("Home", "/"), ("Services", "/services/")]
    if category_label:
        trail.append((category_label, category_url))
    trail.append((meta["h1"], url))

    html = [head_v2(meta["title"], meta["desc"], url), header_v2()]
    html.append(inner_hero(slug, category_label or "Our Services", meta["h1"],
                           f'<p class="hero-sub">{md_inline(intro)}</p>', cta_html, trail))
    html.append(overview_section(remaining))

    skip = {"__lede__", "Frequently Asked Questions", "Related Services"}
    bgs = ["section--white", "section--off"]
    bg_i = 0
    has_suitable = any(sec["heading"].lower().startswith(("who it's suitable for", "who it’s suitable for"))
                       for sec in sections)
    needs_photo_split = ("split" in PAGE_IMG_OVERRIDES.get(slug, {})) and not has_suitable
    for sec in sections:
        if sec["heading"] in skip:
            continue
        h = sec["heading"].lower()
        bg = bgs[bg_i % 2]
        if h.startswith(("who it's suitable for", "who it’s suitable for")):
            html.append(suitable_split(sec, slug, bg))
        elif needs_photo_split and not any(t == "ol" for t, _ in sec["blocks"]):
            html.append(content_split(sec, slug, bg))
            needs_photo_split = False
        elif any(t == "ol" for t, _ in sec["blocks"]):
            html.append(steps_section(sec, bg))
        else:
            html.append(prose_section(sec, bg))
        bg_i += 1

    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"),
                               bg="section--white"))
    html.append(related_section_v2(get_section(sections, "Related Services")))
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ category template
def category_page(fname, url, label):
    meta, sections = parse_copy(fname)
    slug = url.rstrip("/").split("/")[-1]
    paras, _, cta_html = lede_blocks(sections)
    intro, remaining = split_intro(paras)
    trail = [("Home", "/"), ("Services", "/services/"), (meta["h1"], url)]

    html = [head_v2(meta["title"], meta["desc"], url), header_v2()]
    html.append(inner_hero(slug, "Our Services", meta["h1"],
                           f'<p class="hero-sub">{md_inline(intro)}</p>', cta_html, trail))

    # Merge relocated hero copy with the existing "What to Expect" overview (no stacked intros)
    expect = get_section(sections, "What to Expect")
    expect_extra = "".join(f"<p>{md_inline(p)}</p>" for t, p in expect["blocks"] if t == "p") if expect else ""
    html.append(overview_section(remaining,
                                 heading=expect["heading"] if expect else "What you should know",
                                 extra_html=expect_extra))

    svc_sec = next((s for s in sections if s["heading"].lower().startswith("our ")
                    and "services" in s["heading"].lower()), None)
    if svc_sec:
        from services import SERVICE_ICONS
        key, alt = PAGE_IMG.get(slug, ("clinic-chair", ""))
        card_src = page_img_src(slug, "card", None)
        card_img = (f'<img src="{card_src}" alt="{alt}" loading="lazy" onerror="this.remove()">'
                    if card_src else simg(key, w=1100, alt=alt))
        cards = [f'<div class="photo-card reveal">{card_img}</div>']
        blocks = svc_sec["blocks"]
        i = 0
        while i < len(blocks):
            btype, payload = blocks[i]
            name = u = desc = None
            if btype == "p":
                m = re.match(r"^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*(.*)$", payload)
                if m:
                    name, u, desc = m.groups()
            elif btype == "cta" and len(payload) == 1 and payload[0][1]:
                name, u = payload[0]
                desc = ""
                if i + 1 < len(blocks) and blocks[i + 1][0] == "p":
                    desc = blocks[i + 1][1]
                    i += 1
            if name and u:
                ic = SERVICE_ICONS.get(u.rstrip("/").split("/")[-1], "tooth")
                cards.append(f'''<article class="svc-card">
  <span class="icon-tile">{ICONS[ic]}</span>
  <h3><a href="{u}">{name}</a></h3>
  <p>{md_inline(desc)}</p>
  <span class="btn btn--sm btn--outline">Learn More</span>
</article>''')
            i += 1
        html.append(f'''<section class="section section--white" aria-labelledby="category-services">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">{label}</span>
      <h2 id="category-services">{svc_sec["heading"]}</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(cards)}</div>
  </div>
</section>
''')

    skip = {"__lede__", "Frequently Asked Questions", "Related Services"}
    if expect:
        skip.add(expect["heading"])
    if svc_sec:
        skip.add(svc_sec["heading"])
    for sec in sections:
        if sec["heading"] not in skip:
            html.append(prose_section(sec, "section--off"))

    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"),
                               bg="section--white"))
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ hub
CATEGORY_URLS = {
    "General & Preventive Dentistry": ("/services/general-preventive/", "general"),
    "Cosmetic Dentistry": ("/services/cosmetic/", "cosmetic"),
    "Restorative Dentistry": ("/services/restorative/", "restorative"),
    "Emergency Dentistry": ("/services/emergency-dentistry/", None),
    "Children's Dentistry": ("/services/childrens-dentistry/", None),
}
HUB_CARD_IMG = {
    "General & Preventive Dentistry": "clinic-treat",
    "Cosmetic Dentistry": "smile-w",
    "Restorative Dentistry": "surgery",
    "Emergency Dentistry": "doc-m",
    "Children's Dentistry": "child",
}

def hub_page():
    meta, sections = parse_copy("06-services-hub-page-copy.md")
    url = "/services/"
    paras, _, cta_html = lede_blocks(sections)
    intro, remaining = split_intro(paras)

    html = [head_v2(meta["title"], meta["desc"], url), header_v2()]
    html.append(inner_hero("services", "Comprehensive care", meta["h1"],
                           f'<p class="hero-sub">{md_inline(intro)}</p>', cta_html,
                           [("Home", "/"), ("Services", url)]))
    html.append(overview_section(remaining))

    from services import SERVICE_ICONS
    from services import link_includes
    cat_cards, extra_cards = [], []
    for sec in sections:
        if sec["heading"] not in CATEGORY_URLS:
            continue
        cat_url, _k = CATEGORY_URLS[sec["heading"]]
        slug = cat_url.rstrip("/").split("/")[-1]
        ic = SERVICE_ICONS.get(slug, "tooth")
        desc, includes, cta = "", "", None
        for btype, payload in sec["blocks"]:
            if btype == "p":
                m = re.match(r"^\*\*Includes:\*\*\s*(.*)$", payload)
                if m:
                    includes = m.group(1)
                else:
                    desc = payload
            elif btype == "cta":
                cta = payload[0][0]
        inc_html = f'<p class="includes" style="font-size:.86rem"><strong>Includes:</strong> {link_includes(includes)}</p>' if includes else ""
        is_extra = sec["heading"] in ("Emergency Dentistry", "Children's Dentistry")
        img = f'<div class="photo-card" style="min-height:11rem;border-radius:var(--r-tile);margin:-.5rem -.5rem .5rem"><a href="{cat_url}" aria-label="{sec["heading"]}">{simg(HUB_CARD_IMG[sec["heading"]], w=900, alt="")}</a></div>'
        btn = "btn--navy" if is_extra else "btn--outline"
        cards_target = extra_cards if is_extra else cat_cards
        cards_target.append(f'''<article class="svc-card" style="overflow:hidden">
  {img}
  <span class="icon-tile">{ICONS[ic]}</span>
  <h3><a href="{cat_url}">{sec["heading"]}</a></h3>
  <p>{md_inline(desc)}</p>
  {inc_html}
  <span class="btn btn--sm {btn}">{md_inline_label(cta) if cta else "Explore"}</span>
</article>''')

    html.append(f'''<section class="section section--white" aria-label="Service categories">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">Where would you like to start?</span>
      <h2>Explore Our Care Categories</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(cat_cards)}</div>
    <div class="grid grid--2 reveal-stagger" style="margin-top:1.5rem">{"".join(extra_cards)}</div>
  </div>
</section>
''')

    ns = get_section(sections, "Not Sure Where to Start")
    if ns:
        inner = []
        for btype, payload in ns["blocks"]:
            if btype == "p":
                inner.append(f"<p>{md_inline(payload)}</p>")
            elif btype == "cta":
                inner.append(render_cta_row(payload))
        html.append(f'''<section class="section section--off" aria-labelledby="not-sure">
  <div class="container split reveal">
    <div>
      <span class="eyebrow">We'll guide you</span>
      <h2 id="not-sure">{ns["heading"]}</h2>
      {"".join(inner)}
    </div>
    <div class="split-photo"><img src="{SECTION_IMGS["services-not-sure"]}" alt="A dentist talking a patient through their options" loading="lazy" onerror="this.remove()"></div>
  </div>
</section>
''')

    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"), bg="section--white"))
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ emergency
def emergency_page():
    meta, sections = parse_copy("25-emergency-dentistry-page-copy.md")
    url = "/services/emergency-dentistry/"
    paras, strong_line, _ = lede_blocks(sections)
    intro, remaining = split_intro(paras)
    banner = f'''<div class="urgent-banner" style="margin-top:1.75rem">
  <span class="urgent-icon">{ICONS["alert"]}</span>
  <p>{md_inline(strong_line) if strong_line else f"If you're experiencing a dental emergency, please call us directly on {PHONE_DISPLAY}."}</p>
  <a class="btn btn--navy btn--no-arrow" href="{PHONE_TEL}" style="margin-left:auto">{ICONS["phone"]} Call Now</a>
</div>
<div class="btn-row"><a class="btn btn--glass" href="/patient-info/">Book an Emergency Appointment</a></div>'''

    html = [head_v2(meta["title"], meta["desc"], url), header_v2()]
    html.append(inner_hero("emergency-dentistry", "Urgent care", meta["h1"],
                           f'<p class="hero-sub">{md_inline(intro)}</p>', "",
                           [("Home", "/"), ("Services", "/services/"), ("Emergency Dentistry", url)],
                           extra=banner))
    html.append(overview_section(remaining))

    counts = get_section(sections, "What Counts as a Dental Emergency")
    if counts:
        if "split" in PAGE_IMG_OVERRIDES.get("emergency-dentistry", {}):
            html.append(content_split(counts, "emergency-dentistry", "section--white"))
        else:
            html.append(prose_section(counts, "section--white"))

    wait = get_section(sections, "What to Do While You Wait")
    if wait:
        cards, note = [], ""
        for btype, payload in wait["blocks"]:
            if btype == "p":
                m = re.match(r"^\*\*(.+?)\*\*\s*(.*)$", payload)
                if m:
                    cards.append(f'''<article class="svc-card">
  <span class="icon-tile">{ICONS["heart"]}</span>
  <h3>{m.group(1)}</h3>
  <p>{md_inline(m.group(2))}</p>
</article>''')
            elif btype == "note":
                note = f'<p class="small-note reveal" style="margin-top:2rem">{md_inline(payload)}</p>'
        html.append(f'''<section class="section section--off" aria-labelledby="while-you-wait">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">First-aid guidance</span>
      <h2 id="while-you-wait">{wait["heading"]}</h2>
    </div>
    <div class="{grid_n(len(cards))} reveal-stagger">{"".join(cards)}</div>
    {note}
  </div>
</section>
''')

    seen = get_section(sections, "Getting Seen Quickly")
    if seen:
        paras2, ctas = [], None
        for btype, payload in seen["blocks"]:
            if btype == "p" and not payload.strip().startswith("**Opening Hours**"):
                paras2.append(f"<p>{md_inline(payload)}</p>")
            elif btype == "cta":
                ctas = payload
        hours_rows = '<div data-cms-list="hours">' + "".join(f'<div class="hrow"><span data-cms="days">{d}</span><span data-cms="time">{h}</span></div>' for d, h in HOURS) + "</div>"
        cta_row = render_cta_row(ctas, style_map=lambda i, l: "btn--gold btn--no-arrow", large=True) if ctas else ""
        html.append(f'''<section class="section section--navy" aria-labelledby="getting-seen">
  <div class="container split">
    <div class="reveal">
      <span class="eyebrow">Prompt appointments</span>
      <h2 id="getting-seen">{seen["heading"]}</h2>
      {"".join(paras2)}
      {cta_row}
    </div>
    <div class="info-panel info-panel--dark reveal">
      <h3>{ICONS["clock"]} Opening Hours</h3>
      {hours_rows}
      <p class="small-note" style="color:var(--text-on-dark-soft);margin-top:.9rem" data-cms="hours_note" data-cms-hide-if-empty></p>
    </div>
  </div>
</section>
''')

    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"),
                               bg="section--white", eyebrow_txt="Emergency care"))
    html.append(related_section_v2(get_section(sections, "Related Services")))
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ about
# Featured practitioners — client-supplied photos live at /assets/img/team-<slug>.jpg
# (initial-tile fallback shows until the headshot file is added). Bios: the client's
# supplied bio text goes in `bio` verbatim; None renders a for-review placeholder.
TEAM_FEATURED = [
    {"name": "Dr Adeela Younis", "slug": "adeela", "init": "A",
     "photo": "https://i.imgur.com/RfRurFT.jpeg", "bio": [
        "With more than 16 years in general dentistry, Dr. Adeela has built her career around a simple idea: every patient deserves to feel comfortable, understood, and genuinely cared for. Patients quickly notice her warm, welcoming manner and the relaxed atmosphere she creates for people of all ages. Whether she’s handling a routine check-up or a more involved procedure, she stays present throughout, focused on keeping the experience as pain-free and stress-free as possible.",
        "Dr. Adeela earned her Bachelor of Dental Surgery from Baqai Medical University, where alongside her academic achievements, she took on mentoring roles with senior dental students — an early sign of the passion for teaching and knowledge-sharing that’s stayed with her ever since. She has gone on to work alongside respected dental surgeons in Australia and abroad, building particular expertise in root canal therapy, wisdom teeth removal, orthodontics, dental implants, veneers, crowns and bridges, and full smile makeovers.",
        "Her pursuit of the latest training and certifications isn’t just professional — it’s personal. Dr. Adeela is recognised by three global regulatory authorities, though what patients tend to remember most is her kindness and how closely she listens.",
        "As a mother herself, she brings a natural, nurturing touch to treating children, understanding the anxieties young patients can have and working to turn each visit into a positive — even enjoyable — experience. That same warmth extends to how she connects with parents, reflecting her belief that every patient should be treated like family.",
        "Speaking English, Urdu, Hindi, and Punjabi fluently, with working proficiency in Arabic, Dr. Adeela is able to make a wide range of patients feel seen, heard, and at ease.",
        "For her patients, Dr. Adeela Younis is more than a dentist — she’s a trusted partner in their family’s dental health, guided by a gentle hand and a caring heart.",
    ]},
    {"name": "Dr. Zainab Zahid", "slug": "zainab", "init": "Z",
     "photo": "https://i.imgur.com/d5mE2Hw.jpeg", "bio": [
        "With clinical experience spanning both Australia and overseas, Dr. Zahid is a general dentist known for her caring, gentle touch. She works to make every appointment — for patients of any age — as relaxed and stress-free as possible. Her approach centres on high-quality, patient-first care, balancing preventive dentistry with more advanced restorative techniques when needed.",
        "Patient education is a core part of how Dr. Zahid practises; she believes informed patients are better equipped to keep their smiles healthy for life. Building genuine, long-term relationships matters to her too — she’s found that patients who feel truly known tend to see better outcomes and greater overall wellbeing.",
        "Dr. Zahid keeps her skills sharp through regular professional development, making sure she’s up to date with the latest techniques and technology in modern dentistry.",
        "Outside the clinic, she loves to travel, explore new cultures, and try local cuisines wherever she goes. That curiosity and openness carry over into her work, adding warmth to how she connects with her patients.",
    ]},
    {"name": "Dr. Nikhat H. Syeda", "slug": "nikhat", "init": "N",
     "photo": "https://i.imgur.com/4T1lHiu.jpeg", "bio": [
        "Dr. Nikhat trained as a dentist in India before relocating to Australia to build her career, where she now focuses on delivering dental care centred around each patient’s individual needs.",
        "Her clinical interests lie in preventive, restorative, and general dentistry, with particular emphasis on supporting patients toward lasting oral health. Rather than applying a one-size-fits-all approach, she customises treatment plans to suit each patient, and stays current with evidence-based techniques through continual learning in her field.",
        "Patients often describe Dr. Nikhat’s manner as gentle and caring. She puts thought into making her practice feel warm and unintimidating, and places real value on the relationships she builds with the people she treats — aiming for every visit to be a comfortable, positive one.",
        "Dr. Nikhat speaks English, Hindi, Urdu, Arabic, and Telugu, which allows her to connect with patients from a wide range of cultural backgrounds. She’s particularly focused on making dental care easy to understand and accessible to everyone who walks through the door.",
        "When she’s not at the practice, Dr. Nikhat enjoys interior design, travel, and hosting gatherings with family and friends — she loves turning spaces into welcoming environments and bringing people together for memorable occasions.",
    ]},
]
# Dr Alan and Dr Abu Baker removed from the page at the client's request pending their
# photos and details; re-add them to TEAM_FEATURED when those come through.

def about_page():
    meta, sections = parse_copy("02-about-us-page-copy.md")
    url = "/about/"
    lede = get_section(sections, "__lede__")
    paras = [p for t, p in lede["blocks"] if t == "p"]
    ctas = next((p for t, p in lede["blocks"] if t == "cta"), None)
    cta_html = render_cta_row(ctas, style_map=hero_cta_style, large=True) if ctas else ""

    html = [head_v2(meta["title"], meta["desc"], url), header_v2(active="/about/")]
    # Hero carries the heading and CTAs only; the whole lede is relocated verbatim to Our Story.
    cta_html = cta_html.replace("</div>",
        '<a class="btn btn--glass btn--no-arrow" href="/meet-the-team/">Meet the Team</a></div>', 1) \
        if cta_html else '<div class="btn-row"><a class="btn btn--white" href="/meet-the-team/">Meet the Team</a></div>'
    html.append(inner_hero("about", "About us", meta["h1"], "", cta_html,
                           [("Home", "/"), ("About Us", url)]))
    html.append(overview_section(
        paras + ["**Formerly Ezy Dental Group.** Footscray Dental Studio is the same practice, "
                 "at the same address on Barkly St, with many of the same familiar faces. The name "
                 "and leadership have changed; our commitment to the Footscray community has not."],
        heading="Our Story", eyebrow="About us", cms_key="about.story"))

    phil = get_section(sections, "Our Philosophy")
    html.append(f'''<section class="section section--white" aria-labelledby="philosophy">
  <div class="container split reveal">
    <div class="split-photo"><img src="{SECTION_IMGS["about-philosophy"]}" alt="A dentist chatting warmly with a patient" loading="lazy" onerror="this.remove()" data-cms-attr="src:about.philosophy_image"></div>
    <div>
      <span class="eyebrow">Our philosophy</span>
      <h2 id="philosophy" data-cms="about.philosophy_heading">{phil["heading"]}</h2>
      <div data-cms="about.philosophy_text">{"".join(f"<p>{md_inline(p)}</p>" for t, p in phil["blocks"] if t == "p")}</div>
    </div>
  </div>
</section>
''')

    tech = get_section(sections, "A Modern, Technology-Led Studio")
    tech_paras = [p for t, p in tech["blocks"] if t == "p"]
    tech_items = next((p for t, p in tech["blocks"] if t == "ul"), [])
    tech_icons = ["camera", "xray", "layers", "tooth", "root", "sparkle"]
    tcards = []
    for i, it in enumerate(tech_items):
        m = re.match(r"^\*\*(.+?)\*\*\s*(—|–|-)?\s*(.*)$", it)
        name, desc = (m.group(1), m.group(3)) if m else (it, "")
        tcards.append(f'''<article class="svc-card">
  <span class="icon-tile">{ICONS[tech_icons[i % 6]]}</span>
  <h3>{name}</h3>
  <p>{md_inline(desc)}</p>
</article>''')
    html.append(f'''<section class="section section--off" aria-labelledby="technology">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">Modern technology</span>
      <h2 id="technology" data-cms="about.tech_heading">{tech["heading"]}</h2>
      <p data-cms="about.tech_intro">{md_inline(tech_paras[0])}</p>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(tcards)}</div>
    <p class="reveal center" style="margin-top:2rem;max-width:46rem;margin-inline:auto">{md_inline(tech_paras[1]) if len(tech_paras) > 1 else ""}</p>
  </div>
</section>
''')

    cont = get_section(sections, "Continuity, With Fresh Expertise")
    html.append(f'''<section class="section section--white" aria-labelledby="continuity">
  <div class="container split split--rev reveal">
    <div>
      <span class="eyebrow">Familiar faces, new expertise</span>
      <h2 id="continuity" data-cms="about.continuity_heading">{cont["heading"]}</h2>
      <div data-cms="about.continuity_text">{"".join(f"<p>{md_inline(p)}</p>" for t, p in cont["blocks"] if t == "p")}</div>
    </div>
    <div class="split-photo"><img src="{SECTION_IMGS["about-continuity"]}" alt="Practitioners caring for a patient" loading="lazy" onerror="this.remove()" data-cms-attr="src:about.continuity_image"></div>
  </div>
</section>
''')

    visit = get_section(sections, "Visit Us")
    visit_p = next((p for t, p in visit["blocks"] if t == "p"), "")
    visit_ctas = next((p for t, p in visit["blocks"] if t == "cta"), None)
    html.append(f'''<section class="section section--white center" aria-labelledby="visit-us">
  <div class="container--narrow reveal">
    <span class="eyebrow">We'd love to meet you</span>
    <h2 id="visit-us" data-cms="about.visit_heading">{visit["heading"]}</h2>
    <p data-cms="about.visit_text">{md_inline(visit_p)}</p>
    <div class="btn-row" style="justify-content:center">{render_cta_row(visit_ctas).replace('<div class="btn-row">', "").replace("</div>", "") if visit_ctas else ""}</div>
  </div>
</section>
''')

    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"), bg="section--off", cms_key="about.faq"))
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ meet the team
def meet_the_team_page():
    """Own page (split out of About Us). Practitioner content comes from TEAM_FEATURED;
    the page heading stays verbatim from the About copy."""
    meta, sections = parse_copy("02-about-us-page-copy.md")
    url = "/meet-the-team/"
    team_sec = get_section(sections, "Meet Our Team")

    html = [head_v2("Meet the Team | Footscray Dental Studio",
                    "Meet the dentists of Footscray Dental Studio, an experienced team caring "
                    "for patients and families in Footscray VIC.", url),
            header_v2(active=url)]
    html.append(inner_hero("meet-the-team", "Meet the team", team_sec["heading"],
                           '<p class="hero-sub">The practitioners behind Footscray Dental Studio, '
                           'and the experience each of them brings to your care.</p>',
                           render_cta_row([("Book an Appointment", None), ("About Us", "/about/")],
                                          style_map=hero_cta_style, large=True),
                           [("Home", "/"), ("About Us", "/about/"), ("Meet the Team", url)]))

    features = []
    for i, doc in enumerate(TEAM_FEATURED):
        bio_html = "".join(f"<p>{md_inline(p)}</p>" for p in doc["bio"])
        src = doc.get("photo") or f'/assets/img/team-{doc["slug"]}.jpg'
        photo = (f'<div class="split-photo avatar-photo team-photo"><span class="init" data-cms="initial">{doc["init"]}</span>'
                 f'<img src="{src}" alt="{doc["name"]}" loading="lazy" onerror="this.remove()" data-cms-attr="src:photo,alt:name"></div>')
        body = (f'<div><span class="role" data-cms="role">Dentist</span><h2 class="team-name" data-cms="name">{doc["name"]}</h2>'
                f'<div class="team-bio" data-cms="bio">{bio_html}</div></div>')
        rev = " split--rev" if i % 2 else ""
        features.append(f'<div class="split{rev} team-feature reveal">{photo}{body}</div>')

    html.append(f'''<section class="section section--off" id="meet-the-team" aria-labelledby="team-heading">
  <div class="container">
    <h2 class="visually-hidden" id="team-heading">Our practitioners</h2>
    <div class="team-features" data-cms-list="team" data-cms-alternate="split--rev">{"".join(features)}</div>
  </div>
</section>
''')
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ offers
OFFER_ICONS = ["sparkle", "smile", "implant", "shield", "child", "heart"]

def offers_page():
    meta, sections = parse_copy("03-special-offers-page-copy.md")
    url = "/special-offers/"
    lede = get_section(sections, "__lede__")
    lede_p = next((p for t, p in lede["blocks"] if t == "p"), "")
    intro, remaining = split_intro([lede_p])

    html = [head_v2(meta["title"], meta["desc"], url), header_v2(active="/special-offers/")]
    html.append(inner_hero("special-offers", "Special offers", meta["h1"],
                           f'<p class="hero-sub">{md_inline(intro)}</p>', "",
                           [("Home", "/"), ("Special Offers", url)]))
    html.append(overview_section(remaining, heading="Before You Book", eyebrow="Good to know", cms_key="offers_page.intro"))

    cards, tail_note, tail_ctas, idx = [], None, None, 0
    for sec in sections:
        if sec["level"] != 3 or sec["heading"] == "Frequently Asked Questions":
            continue
        title, price = sec["heading"], ""
        m = re.match(r"^(.*?)\s*[—–]\s*(.*)$", sec["heading"])
        if m:
            title, price = m.groups()
        paras, bullets, sub, cta = [], [], "", ""
        for btype, payload in sec["blocks"]:
            if btype == "p":
                paras.append(f"<p>{md_inline(payload)}</p>")
            elif btype == "ul":
                bullets += [f"<li>{md_inline(i)}</li>" for i in payload]
            elif btype == "note":
                if "subject to change" in payload.lower():
                    tail_note = payload
                else:
                    sub = md_inline(payload)
            elif btype == "cta":
                if len(payload) > 1:
                    tail_ctas = payload
                else:
                    from common import cta_href
                    label = payload[0][0]
                    cta = (f'<a class="btn btn--navy" href="{cta_href(label) or "/patient-info/"}" style="margin-top:auto" '
                           f'data-cms="cta_label">{md_inline_label(label)}</a>')
        # Every card shares one skeleton (note, price, body, bullets, button) so the admin
        # panel can add a card by cloning any existing one. Empty parts are removed at build.
        cards.append(f'''<article class="svc-card offer-card">
  <span class="icon-tile">{ICONS[OFFER_ICONS[idx % 6]]}</span>
  <span class="offer-badge">Current offer</span>
  <h3 class="mb-0" data-cms="title">{title}</h3>
  <p class="small-note" data-cms="note" data-cms-hide-if-empty>{sub}</p>
  <span class="offer-price{" offer-price--sm" if len(price) > 16 else ""}" data-cms="price" data-cms-hide-if-empty>{price}</span>
  <div class="offer-body" data-cms="body">{"".join(paras)}</div>
  <ul data-cms="bullets" data-cms-hide-if-empty>{"".join(bullets)}</ul>
  {cta or '<a class="btn btn--navy" href="/patient-info/" style="margin-top:auto" data-cms="cta_label">Book Now</a>'}
</article>''')
        idx += 1

    html.append(f'''<section class="section section--white" aria-label="Current offers">
  <div class="container">
    <div class="grid grid--2 reveal-stagger" data-cms-list="offers">{"".join(cards)}</div>
    <div class="reveal" style="margin-top:2.5rem">
      <p class="small-note" data-cms="offers_page.footnote">{md_inline(tail_note) if tail_note else ""}</p>
      {render_cta_row(tail_ctas) if tail_ctas else ""}
    </div>
  </div>
</section>
''')

    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"),
                               bg="section--off", eyebrow_txt="Offers", cms_key="offers_page.faq"))
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ book an appointment
def book_page():
    meta, sections = parse_copy("04-book-appointment-page-copy.md")
    url = "/patient-info/"
    lede = get_section(sections, "__lede__")
    lede_p = next((p for t, p in lede["blocks"] if t == "p"), "")
    intro, remaining = split_intro([lede_p])

    html = [head_v2(meta["title"], meta["desc"], url), header_v2()]
    html.append(inner_hero("patient-info", "Book an appointment", meta["h1"],
                           f'<p class="hero-sub">{md_inline(intro)}</p>',
                           render_cta_row([("Book Online", "#book"), ("Call " + PHONE_DISPLAY, PHONE_TEL)],
                                          style_map=hero_cta_style, large=True),
                           [("Home", "/"), ("Book an Appointment", url)]))

    # Relocated hero copy merges into the How Booking Works intro (no stacked overviews)
    how = get_section(sections, "How Booking Works")
    how = {"heading": how["heading"],
           "blocks": [("p", p) for p in remaining] + list(how["blocks"])}
    html.append(steps_section(how, "section--white"))

    first = get_section(sections, "Your First Visit")
    fp = [p for t, p in first["blocks"] if t == "p"]
    fi = next((p for t, p in first["blocks"] if t == "ul"), [])
    html.append(f'''<section class="section section--off" aria-labelledby="first-visit">
  <div class="container split reveal">
    <div>
      <span class="eyebrow">New patients welcome</span>
      <h2 id="first-visit">{first["heading"]}</h2>
      <p>{md_inline(fp[0])}</p>
      <p>{md_inline(fp[1]) if len(fp) > 1 else ""}</p>
      {render_checklist(fi, two_col=False)}
      {"".join(f"<p>{md_inline(p)}</p>" for p in fp[2:])}
    </div>
    <div class="split-photo"><img src="{SECTION_IMGS["book-first-visit"]}" alt="The welcoming, modern studio interior" loading="lazy" onerror="this.remove()"></div>
  </div>
</section>
''')

    funds = get_section(sections, "Health Funds & Payment")
    cancel = get_section(sections, "Cancellations & Rescheduling")
    def dark_card(sec, icon):
        ps = "".join(f"<p>{md_inline(p)}</p>" for t, p in sec["blocks"] if t == "p")
        return f'''<div class="info-panel info-panel--dark" style="padding:2.25rem">
  <span class="icon-tile" style="background:rgba(189,153,94,.16);border-color:transparent;color:var(--gold-light);margin-bottom:1rem">{ICONS[icon]}</span>
  <h3 style="display:block">{sec["heading"]}</h3>
  {ps}
</div>'''
    html.append(f'''<section class="section section--navy" aria-label="Payments and cancellations">
  <div class="container grid grid--2 reveal-stagger">
    {dark_card(funds, "dollar")}
    {dark_card(cancel, "calendar")}
  </div>
</section>
''')

    ready = get_section(sections, "Ready to Book")
    html.append(booking_section(heading=ready["heading"] if ready else "Book an Appointment"))
    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"),
                               bg="section--white", eyebrow_txt="Booking"))
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ contact
def contact_page():
    meta, sections = parse_copy("05-contact-us-page-copy.md")
    url = "/contact/"
    lede = get_section(sections, "__lede__")
    lede_p = next((p for t, p in lede["blocks"] if t == "p"), "")
    git = get_section(sections, "Get In Touch")
    git_ctas = next((p for t, p in git["blocks"] if t == "cta"), None)

    html = [head_v2(meta["title"], meta["desc"], url), header_v2(active="/contact/")]
    html.append(inner_hero("contact", "Contact us", meta["h1"],
                           f'<p class="hero-sub">{md_inline(lede_p)}</p>',
                           render_cta_row(git_ctas, style_map=hero_cta_style, large=True) if git_ctas else "",
                           [("Home", "/"), ("Contact Us", url)]))

    hours_rows = "".join(f'<div class="hrow"><span data-cms="days">{d}</span><span data-cms="time">{h}</span></div>' for d, h in HOURS)
    find = get_section(sections, "Find Us")
    find_p = next((p for t, p in find["blocks"] if t == "p" and not p.startswith("**[")), "")
    map_src = "https://maps.google.com/maps?cid=14110565610442392150&output=embed"
    place_url = "https://www.google.com/maps/place/Ezy+Dental+Group+-+Dentist+Footscray/data=!4m2!3m1!1s0x0:0xc3d2cca966430256"
    html.append(f'''<section class="section section--white" aria-labelledby="get-in-touch">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">Details</span>
      <h2 id="get-in-touch">{git["heading"]}</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">
      <div class="visit-card">
        <span class="icon-tile">{ICONS["pin"]}</span>
        <h3>Our Address</h3>
        <p>{ADDRESS}</p>
        <a class="btn btn--sm btn--outline" href="{place_url}" data-cms-attr="href:practice.maps_url" rel="noopener">Get Directions</a>
      </div>
      <div class="visit-card">
        <span class="icon-tile">{ICONS["clock"]}</span>
        <h3>Opening Hours</h3>
        <div class="hours" data-cms-list="hours">{hours_rows}</div>
        <p class="small-note mb-0" style="font-size:.78rem" data-cms="hours_note" data-cms-hide-if-empty></p>
      </div>
      <div class="visit-card">
        <span class="icon-tile">{ICONS["phone"]}</span>
        <h3>Phone &amp; Email</h3>
        <p><a href="{PHONE_TEL}">{PHONE_DISPLAY}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></p>
        <a class="btn btn--sm btn--navy" href="/patient-info/">Book Online</a>
      </div>
    </div>
    <div class="reveal">
      <iframe class="map-embed" src="{map_src}" title="Map — Footscray Dental Studio, {ADDRESS}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      <p class="center" style="margin-top:1.25rem;max-width:44rem;margin-inline:auto" data-cms="contact.find_text">{md_inline(find_p)}</p>
    </div>
  </div>
</section>
''')

    msg = get_section(sections, "Send Us a Message")
    msg_p = next((p for t, p in msg["blocks"] if t == "p" and not p.startswith("**[")), "")
    html.append(f'''<section class="section section--off" id="message" aria-labelledby="send-message">
  <div class="container booking-split">
    <div class="reveal">
      <span class="eyebrow">Online enquiries</span>
      <h2 class="booking-title" id="send-message" data-cms="contact.message_heading">{msg["heading"]}</h2>
      <p data-cms="contact.message_text">{md_inline(msg_p)}</p>
      <div class="btn-row"><a class="btn btn--call" href="{PHONE_TEL}">{ICONS["phone"]} Call {PHONE_DISPLAY}</a></div>
    </div>
    <div class="reveal">
      <form data-validate novalidate aria-label="Contact form" action="/api/contact/" method="post">
        {form_hidden("contact")}
        <div class="form-grid form-grid--2">
          <div class="field"><label for="cf-name">Name <span class="req">*</span></label><input id="cf-name" name="name" type="text" autocomplete="name" required><p class="error-msg" role="alert"></p></div>
          <div class="field"><label for="cf-phone">Phone <span class="req">*</span></label><input id="cf-phone" name="phone" type="tel" autocomplete="tel" required><p class="error-msg" role="alert"></p></div>
          <div class="field span-2"><label for="cf-email">Email <span class="req">*</span></label><input id="cf-email" name="email" type="email" autocomplete="email" required><p class="error-msg" role="alert"></p></div>
          <div class="field span-2"><label for="cf-msg">Message <span class="req">*</span></label><textarea id="cf-msg" name="message" required></textarea><p class="error-msg" role="alert"></p></div>
          <div class="span-2">
            <button class="btn btn--navy btn--lg btn--block" type="submit">Send Message</button>
            <p class="form-note" style="margin-top:.9rem">Your information is safe with us and will only be used to respond to your enquiry.</p>
            <p class="form-success" role="status" tabindex="-1">Thanks for your message. Our team will reply during business hours. For anything urgent, please call <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
            {form_error()}
          </div>
        </div>
      </form>
    </div>
  </div>
</section>
''')

    emg = get_section(sections, "Dental Emergency")
    emg_p = next((p for t, p in emg["blocks"] if t == "p" and not p.startswith("**[")), "")
    html.append(f'''<section class="section--tight section" aria-labelledby="emergency-callout">
  <div class="container">
    <div class="urgent-banner reveal">
      <span class="urgent-icon">{ICONS["alert"]}</span>
      <div style="flex:1;min-width:16rem">
        <h2 id="emergency-callout" style="font-size:1.45rem;margin-bottom:.4rem;color:var(--navy-deep)">{emg["heading"]}</h2>
        <p>{md_inline(emg_p)}</p>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap">
        <a class="btn btn--navy btn--no-arrow" href="{PHONE_TEL}">{ICONS["phone"]} Call {PHONE_DISPLAY}</a>
        <a class="btn btn--outline" style="border-color:var(--navy-deep);color:var(--navy-deep)" href="/services/emergency-dentistry/">Emergency Dentistry Info</a>
      </div>
    </div>
  </div>
</section>
''')

    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"),
                               bg="section--white", eyebrow_txt="Contact", cms_key="contact.faq"))
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

# ================================================================ utility pages
def prose_page(url, title, desc, h1, eyebrow, body_html, flag=True):
    html = [head_v2(title, desc, url), header_v2()]
    html.append(f'''<section class="hero-solid">
  <div class="container">
    {crumbs_inline([("Home", "/"), (h1, url)])}
    <span class="eyebrow" style="color:var(--gold-light)">{eyebrow}</span>
    <h1>{h1}</h1>
  </div>
</section>
<main id="main">
<section class="section section--white">
  <div class="container--narrow prose">

    {body_html}
  </div>
</section>
</main>
''')
    html.append(footer_v2())
    write_page(url, "".join(html))

def sitemap_page():
    def li(n, u):
        return f'<li><a href="{u}">{n}</a></li>'
    gp = "".join(li(n, u) for n, u in GP_SUBS)
    cos = "".join(li(n, u) for n, u in COS_SUBS)
    res = "".join(li(n, u) for n, u in RES_SUBS)
    body = f'''<div class="sitemap-cols">
  <div>
    <h2 style="font-size:1.3rem">Main Pages</h2>
    <ul>{li("Home", "/")}{li("About Us", "/about/")}{li("Meet the Team", "/meet-the-team/")}{li("Blog", "/blog/")}{li("Book an Appointment", "/patient-info/")}{li("Special Offers", "/special-offers/")}{li("Contact Us", "/contact/")}</ul>
    <h2 style="font-size:1.3rem">Legal</h2>
    <ul>{li("Privacy Policy", "/privacy-policy/")}{li("Terms of Use", "/terms/")}</ul>
  </div>
  <div>
    <h2 style="font-size:1.3rem">Services</h2>
    <ul>{li("All Services", "/services/")}
      <li><a href="/services/general-preventive/">General &amp; Preventive Dentistry</a><ul>{gp}</ul></li>
      <li><a href="/services/cosmetic/">Cosmetic Dentistry</a><ul>{cos}</ul></li>
    </ul>
  </div>
  <div>
    <h2 style="font-size:1.3rem">&nbsp;</h2>
    <ul>
      <li><a href="/services/restorative/">Restorative Dentistry</a><ul>{res}</ul></li>
      {li("Emergency Dentistry", "/services/emergency-dentistry/")}
      {li("Children's Dentistry", "/services/childrens-dentistry/")}
    </ul>
  </div>
</div>'''
    prose_page("/sitemap/", "Sitemap | Footscray Dental Studio",
               "Browse all pages on the Footscray Dental Studio website, including our full range of dental services in Footscray.",
               "Sitemap", "Find your way", body, flag=False)

def error_404_page():
    html = [head_v2("Page Not Found | Footscray Dental Studio",
                    "The page you're looking for can't be found. Return to the Footscray Dental Studio homepage or book an appointment.",
                    "/404.html"), header_v2()]
    html.append(f'''<main id="main">
<section class="page-404">
  <div class="container--narrow">
    <div class="code" aria-hidden="true">404</div>
    <h1>We couldn't find that page</h1>
    <p style="max-width:32rem;margin-inline:auto">The page you're after may have moved or no longer exists — but our friendly team is still right here. Head back to the homepage, browse our services, or book an appointment below.</p>
    <div class="btn-row" style="justify-content:center">
      <a class="btn btn--navy btn--lg" href="/">Back to Home</a>
      <a class="btn btn--gold btn--lg" href="/patient-info/">Book an Appointment</a>
      <a class="btn btn--outline" href="/services/">View Our Services</a>
    </div>
    <p class="small-note" style="margin-top:2rem">Need urgent help? Call us on <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
  </div>
</section>
</main>
''')
    html.append(footer_v2())
    write_page("/404/", "".join(html))

# ================================================================ build all
def append_manifest():
    """Append the client-supplied (non-Higgsfield) images to IMAGE-MANIFEST.md so the
    end-stage localisation pass has one complete list to download from."""
    path = OUT.parent / "IMAGE-MANIFEST.md"
    if not path.exists():
        return
    from glow import LOGO_URL
    lines = ["", "## Logo", "",
             "| Asset | Target local file | Used on | Hosted URL |", "|---|---|---|---|",
             f"| Logo | assets/img/logo.png | Header on every page, and the footer reversed "
             f"to white via CSS | {LOGO_URL} |",
             "", "## Client-supplied page photos (imgur)", "",
             "| Page | Slot | Target local file | Hosted URL |", "|---|---|---|---|"]
    for slug in sorted(PAGE_IMG_OVERRIDES):
        for kind, url in PAGE_IMG_OVERRIDES[slug].items():
            ext = Path(url).suffix or ".jpg"
            lines.append(f"| {slug} | {kind} | assets/img/{slug}-{kind}{ext} | {url} |")
    lines += ["", "## Client-supplied section photos (imgur)", "",
              "| Section | Target local file | Hosted URL |", "|---|---|---|"]
    for key, url in SECTION_IMGS.items():
        lines.append(f"| {key} | assets/img/{key}{Path(url).suffix or '.jpg'} | {url} |")
    lines += ["", "## Practitioner headshots (imgur)", "",
              "| Practitioner | Target local file | Hosted URL |", "|---|---|---|"]
    for doc in TEAM_FEATURED:
        url = doc.get("photo")
        if url:
            ext = Path(url).suffix or ".jpg"
            lines.append(f"| {doc['name']} | assets/img/team-{doc['slug']}{ext} | {url} |")
    path.write_text(path.read_text(encoding="utf-8") + "\n".join(lines) + "\n", encoding="utf-8")
    print("appended page + team images to IMAGE-MANIFEST.md")

def main():
    gp = ("General & Preventive Dentistry", "/services/general-preventive/")
    cos = ("Cosmetic Dentistry", "/services/cosmetic/")
    res = ("Restorative Dentistry", "/services/restorative/")

    hub_page()
    category_page("07-general-preventive-category-page-copy.md", gp[1], "General & Preventive")
    category_page("14-cosmetic-category-page-copy.md", cos[1], "Cosmetic")
    category_page("19-restorative-category-page-copy.md", res[1], "Restorative")

    service_page("08-checkups-cleans-page-copy.md", "/services/general-preventive/check-ups-cleans/", *gp)
    service_page("09-digital-xrays-page-copy.md", "/services/general-preventive/digital-xrays/", *gp)
    service_page("10-fluoride-treatments-page-copy.md", "/services/general-preventive/fluoride-treatments/", *gp)
    service_page("11-fissure-sealants-page-copy.md", "/services/general-preventive/fissure-sealants/", *gp)
    service_page("12-gum-disease-care-page-copy.md", "/services/general-preventive/gum-disease-care/", *gp)
    service_page("13-mouthguards-page-copy.md", "/services/general-preventive/mouthguards/", *gp)
    service_page("15-teeth-whitening-page-copy.md", "/services/cosmetic/teeth-whitening/", *cos)
    service_page("16-porcelain-veneers-page-copy.md", "/services/cosmetic/veneers/", *cos)
    service_page("17-composite-bonding-page-copy.md", "/services/cosmetic/composite-bonding/", *cos)
    service_page("18-smile-makeovers-page-copy.md", "/services/cosmetic/smile-makeovers/", *cos)
    service_page("20-fillings-page-copy.md", "/services/restorative/fillings/", *res)
    service_page("21-crowns-bridges-page-copy.md", "/services/restorative/crowns-bridges/", *res)
    service_page("22-root-canal-page-copy.md", "/services/restorative/root-canal/", *res)
    service_page("23-dental-implants-page-copy.md", "/services/restorative/dental-implants/", *res)
    service_page("23b-all-on-x-implants-page-copy.md", "/services/restorative/all-on-x-implants/", *res)
    service_page("24-dentures-page-copy.md", "/services/restorative/dentures/", *res)
    emergency_page()
    service_page("26-childrens-dentistry-page-copy.md", "/services/childrens-dentistry/", None, None)

    about_page()
    meet_the_team_page()
    offers_page()
    book_page()
    contact_page()

    prose_page("/privacy-policy/", "Privacy Policy | Footscray Dental Studio",
               "How Footscray Dental Studio collects, uses and protects your personal and health information.",
               "Privacy Policy", "Legal", PRIVACY_BODY)
    prose_page("/terms/", "Terms of Use | Footscray Dental Studio",
               "The terms and conditions that apply to your use of the Footscray Dental Studio website.",
               "Terms of Use", "Legal", TERMS_BODY)
    sitemap_page()
    error_404_page()
    append_manifest()
    n = len(list(OUT.rglob("index.html"))) + len(list(OUT.glob("404.html")))
    print(f"rollout complete — {n} pages on disk")

if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    main()
