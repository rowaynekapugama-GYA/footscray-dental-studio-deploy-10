"""Renderers for services hub, category pages, sub-service pages, emergency & children's."""
import re
from common import *

SERVICE_ICONS = {
    "check-ups-cleans": "sparkle", "digital-xrays": "xray", "fluoride-treatments": "drop",
    "fissure-sealants": "shield", "gum-disease-care": "heart", "mouthguards": "guard",
    "teeth-whitening": "sparkle", "veneers": "smile", "composite-bonding": "layers",
    "smile-makeovers": "smile", "fillings": "tooth", "crowns-bridges": "crown",
    "root-canal": "root", "dental-implants": "implant", "all-on-x-implants": "implant",
    "dentures": "denture", "emergency-dentistry": "alert", "childrens-dentistry": "child",
    "general-preventive": "shield", "cosmetic": "sparkle", "restorative": "crown",
}

ALL_SERVICE_LINKS = dict(GP_SUBS + COS_SUBS + RES_SUBS)

def slug_of(url):
    return url.rstrip("/").split("/")[-1]

def hero_cta_style(idx, label):
    return "btn--primary" if idx == 0 else "btn--outline-light"

def lede_html(sections, context_href=None, chips=None, ph_label=None):
    """Render the __lede__ section as an inner hero. Returns (hero_html)."""
    sec = get_section(sections, "__lede__")
    paras, ctas, notes = [], None, []
    strong_line = None
    for btype, payload in sec["blocks"]:
        if btype == "p":
            if re.match(r"^\*\*[^[].*\*\*$", payload.strip()):
                strong_line = payload.strip().strip("*")
            else:
                paras.append(f'<p class="lede">{md_inline(payload)}</p>')
        elif btype == "cta":
            ctas = payload
        elif btype == "note":
            notes.append(f'<p class="small-note">{md_inline(payload)}</p>')
    body = "\n".join(paras + notes)
    cta_html = render_cta_row(ctas, style_map=hero_cta_style, context_href=context_href, large=True) if ctas else ""
    strong_html = f'<p class="lede"><strong style="color:var(--gold-light)">{md_inline(strong_line)}</strong></p>' if strong_line else ""
    chips_html = ""
    if chips:
        chips_html = '<div class="hero-chips">' + "".join(
            f'<span class="chip">{ICONS[i]} {t}</span>' for i, t in chips) + "</div>"
    return body, strong_html, cta_html, chips_html

def render_content_section(sec, bg, context_href=None):
    """Generic content section renderer."""
    heading = sec["heading"]
    hid = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
    inner = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            inner.append(f"<p>{md_inline(payload)}</p>")
        elif btype == "ul":
            inner.append(render_checklist(payload))
        elif btype == "ol":
            inner.append(render_steps(payload, grid=len(payload) >= 4))
        elif btype == "cta":
            inner.append(render_cta_row(payload, context_href=context_href))
        elif btype == "note":
            inner.append(f'<p class="small-note">{md_inline(payload)}</p>')
    return f'''<section class="section {bg}" aria-labelledby="{hid}">
  <div class="container--narrow reveal">
    <h2 id="{hid}">{heading}</h2>
    {"".join(inner)}
  </div>
</section>
'''

def suitable_split(sec, ph_label, bg="section--white"):
    """'Who It's Suitable For'-style split section with placeholder image."""
    heading = sec["heading"]
    hid = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
    inner = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            inner.append(f"<p>{md_inline(payload)}</p>")
        elif btype == "ul":
            inner.append(render_checklist(payload, two_col=False))
        elif btype == "cta":
            inner.append(render_cta_row(payload))
    return f'''<section class="section {bg}" aria-labelledby="{hid}">
  <div class="container split reveal">
    <div>
      <h2 id="{hid}">{heading}</h2>
      {"".join(inner)}
    </div>
    {img_placeholder(ph_label, light=True, tall=False)}
  </div>
</section>
'''

def generic_service_page(fname, url, category_label, category_url, ph_label, chips=None):
    meta, sections = parse_copy(fname)
    slug = slug_of(url)
    body, strong_html, cta_html, chips_html = lede_html(sections, chips=chips)
    trail = [("Home", "/"), ("Services", "/services/")]
    if category_label:
        trail.append((category_label, category_url))
    trail.append((meta["h1"], url))

    html = [head(meta["title"], meta["desc"], url), header_html()]
    html.append(breadcrumbs(trail))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">{category_label or "Our Services"}</span>
      <h1>{meta["h1"]}</h1>
      {body}{strong_html}{cta_html}{chips_html}
    </div>
    {img_placeholder(ph_label)}
  </div>
</section>
<main id="main">
''')

    skip = {"__lede__", "Frequently Asked Questions", "Related Services"}
    content_secs = [s for s in sections if s["heading"] not in skip]
    bgs = ["section--white", "", "section--cream2"]
    bg_i = 0
    for sec in content_secs:
        h = sec["heading"].lower()
        if h.startswith("who it's suitable for") or h.startswith("who it’s suitable for"):
            html.append(suitable_split(sec, ph_label + " — patient consultation photo",
                                       bg=bgs[bg_i % 3] or "section--cream2"))
        else:
            html.append(render_content_section(sec, bgs[bg_i % 3]))
        bg_i += 1

    html.append(faq_section(get_section(sections, "Frequently Asked Questions")))
    html.append(related_section(get_section(sections, "Related Services")))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

def link_includes(text):
    """Link service names inside an 'Includes:' string (existing md links first)."""
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)

    def replace_outside_anchors(txt, cand, url):
        parts = re.split(r"(<a [^>]*>.*?</a>)", txt)
        for i, seg in enumerate(parts):
            if seg.startswith("<a "):
                continue
            if cand in seg:
                parts[i] = seg.replace(cand, f'<a href="{url}">{cand}</a>', 1)
                return "".join(parts), True
        return txt, False

    for name, u in sorted(ALL_SERVICE_LINKS.items(), key=lambda kv: -len(kv[0])):
        for cand in sorted({name, name.split(" (")[0]}, key=len, reverse=True):
            text, done = replace_outside_anchors(text, cand, u)
            if done:
                break
    return text

def category_page(fname, url, label, ph_label):
    meta, sections = parse_copy(fname)
    body, strong_html, cta_html, chips_html = lede_html(sections)
    trail = [("Home", "/"), ("Services", "/services/"), (meta["h1"], url)]

    html = [head(meta["title"], meta["desc"], url), header_html()]
    html.append(breadcrumbs(trail))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">Our Services</span>
      <h1>{meta["h1"]}</h1>
      {body}{cta_html}
    </div>
    {img_placeholder(ph_label)}
  </div>
</section>
<main id="main">
''')

    # What to expect
    expect = get_section(sections, "What to Expect")
    if expect:
        html.append(render_content_section(expect, "section--white"))

    # Services card grid
    svc_sec = next((s for s in sections if s["heading"].lower().startswith("our ") and "services" in s["heading"].lower()), None)
    if svc_sec:
        cards = []
        blocks = svc_sec["blocks"]
        i = 0
        while i < len(blocks):
            btype, payload = blocks[i]
            name = u = desc = None
            if btype == "p":
                m = re.match(r"^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*(.*)$", payload)
                if m:
                    name, u, desc = m.group(1), m.group(2), m.group(3)
            elif btype == "cta" and len(payload) == 1 and payload[0][1]:
                # bold service link parsed as a CTA line; its description is the next paragraph
                name, u = payload[0]
                desc = ""
                if i + 1 < len(blocks) and blocks[i + 1][0] == "p":
                    desc = blocks[i + 1][1]
                    i += 1
            if name and u:
                ic = SERVICE_ICONS.get(slug_of(u), "tooth")
                cards.append(f'''<article class="card">
  <span class="card-icon">{ICONS[ic]}</span>
  <h3><a href="{u}">{name}</a></h3>
  <p>{md_inline(desc)}</p>
  <span class="text-link">Learn more</span>
</article>''')
            i += 1
        html.append(f'''<section class="section" aria-labelledby="category-services">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">{label}</span>
      <h2 id="category-services">{svc_sec["heading"]}</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(cards)}</div>
  </div>
</section>
''')

    # Remaining prose sections
    skip = {"__lede__", "What to Expect at Footscray Dental Studio", "Frequently Asked Questions",
            "Related Services"}
    if svc_sec:
        skip.add(svc_sec["heading"])
    if expect:
        skip.add(expect["heading"])
    for sec in sections:
        if sec["heading"] in skip:
            continue
        html.append(render_content_section(sec, "section--white"))

    html.append(faq_section(get_section(sections, "Frequently Asked Questions")))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

CATEGORY_URLS = {
    "General & Preventive Dentistry": "/services/general-preventive/",
    "Cosmetic Dentistry": "/services/cosmetic/",
    "Restorative Dentistry": "/services/restorative/",
    "Emergency Dentistry": "/services/emergency-dentistry/",
    "Children's Dentistry": "/services/childrens-dentistry/",
}

def hub_page():
    meta, sections = parse_copy("06-services-hub-page-copy.md")
    url = "/services/"
    body, strong_html, cta_html, chips_html = lede_html(sections)
    html = [head(meta["title"], meta["desc"], url), header_html()]
    html.append(breadcrumbs([("Home", "/"), ("Services", url)]))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">Comprehensive care</span>
      <h1>{meta["h1"]}</h1>
      {body}{cta_html}
    </div>
    {img_placeholder("Practice photo — modern treatment room")}
  </div>
</section>
<main id="main">
''')

    cat_cards, extra_cards = [], []
    for sec in sections:
        if sec["heading"] not in CATEGORY_URLS:
            continue
        cat_url = CATEGORY_URLS[sec["heading"]]
        slug = slug_of(cat_url)
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
        includes_html = f'<p class="includes"><strong>Includes:</strong> {link_includes(includes)}</p>' if includes else ""
        is_extra = sec["heading"] in ("Emergency Dentistry", "Children's Dentistry")
        card_cls = "card card--wide card--navy" if is_extra else "card card--wide"
        link_style = ' style="color:var(--gold-light)"' if is_extra else ""
        card = f'''<article class="{card_cls}">
  <span class="card-icon">{ICONS[ic]}</span>
  <h3><a href="{cat_url}">{sec["heading"]}</a></h3>
  <p>{md_inline(desc)}</p>
  {includes_html}
  <span class="text-link"{link_style}>{cta or "Explore"}</span>
</article>'''
        (extra_cards if is_extra else cat_cards).append(card)

    html.append(f'''<section class="section" aria-label="Service categories">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Where would you like to start?</span>
      <h2>Explore Our Care Categories</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(cat_cards)}</div>
    <div class="grid grid--2 reveal-stagger" style="margin-top:var(--space-4)">{"".join(extra_cards)}</div>
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
        html.append(f'''<section class="section section--white" aria-labelledby="not-sure">
  <div class="container split reveal">
    <div>
      <span class="eyebrow">We'll guide you</span>
      <h2 id="not-sure">{ns["heading"]}</h2>
      {"".join(inner)}
    </div>
    {img_placeholder("Photo — dentist explaining options to a patient", light=True)}
  </div>
</section>
''')

    html.append(faq_section(get_section(sections, "Frequently Asked Questions")))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

def emergency_page():
    meta, sections = parse_copy("25-emergency-dentistry-page-copy.md")
    url = "/services/emergency-dentistry/"
    body, strong_html, cta_html, chips_html = lede_html(sections)
    html = [head(meta["title"], meta["desc"], url), header_html()]
    html.append(breadcrumbs([("Home", "/"), ("Services", "/services/"), ("Emergency Dentistry", url)]))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">Urgent care</span>
      <h1>{meta["h1"]}</h1>
      {body}
      <div class="urgent-banner" style="margin-top:var(--space-4)">
        <span class="urgent-icon">{ICONS["alert"]}</span>
        <p>If you're experiencing a dental emergency, please call us directly on <strong>{PHONE_DISPLAY}</strong>.</p>
        <a class="btn btn--navy btn--lg" href="{PHONE_TEL}">{ICONS["phone"]} Call Now</a>
      </div>
      <div class="btn-row"><a class="btn btn--outline-light" href="/patient-info/">Book an Emergency Appointment</a></div>
    </div>
  </div>
</section>
<main id="main">
''')

    counts = get_section(sections, "What Counts as a Dental Emergency")
    if counts:
        inner = []
        for btype, payload in counts["blocks"]:
            if btype == "p":
                inner.append(f"<p>{md_inline(payload)}</p>")
            elif btype == "ul":
                inner.append(render_checklist(payload))
        html.append(f'''<section class="section section--white" aria-labelledby="what-counts">
  <div class="container--narrow reveal">
    <span class="eyebrow">When to call</span>
    <h2 id="what-counts">{counts["heading"]}</h2>
    {"".join(inner)}
  </div>
</section>
''')

    wait = get_section(sections, "What to Do While You Wait")
    if wait:
        cards, note = [], ""
        for btype, payload in wait["blocks"]:
            if btype == "p":
                m = re.match(r"^\*\*(.+?)\*\*\s*(.*)$", payload)
                if m:
                    cards.append(f'''<article class="card aid-card">
  <h3>{m.group(1)}</h3>
  <p>{md_inline(m.group(2))}</p>
</article>''')
                else:
                    cards.append(f"<p>{md_inline(payload)}</p>")
            elif btype == "note":
                note = f'<p class="small-note" style="margin-top:var(--space-4)">{md_inline(payload)}</p>'
        html.append(f'''<section class="section" aria-labelledby="while-you-wait">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">First-aid guidance</span>
      <h2 id="while-you-wait">{wait["heading"]}</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(cards)}</div>
    <div class="reveal">{note}</div>
  </div>
</section>
''')

    seen = get_section(sections, "Getting Seen Quickly")
    if seen:
        paras, ctas = [], None
        for btype, payload in seen["blocks"]:
            if btype == "p":
                if payload.strip().startswith("**Opening Hours**") or payload.strip() == "**Opening Hours**":
                    continue
                paras.append(f"<p>{md_inline(payload)}</p>")
            elif btype == "cta":
                ctas = payload
        hours_rows = "".join(f"<tr><td>{d}</td><td>{h}</td></tr>" for d, h in HOURS)
        # Split hours-ish paragraphs out (they were merged: "Monday–Friday: ...")
        paras = [p for p in paras if "9:00am" not in p]
        cta_row = render_cta_row(ctas, style_map=lambda i, l: "btn--primary", large=True) if ctas else ""
        html.append(f'''<section class="section section--navy" aria-labelledby="getting-seen">
  <div class="container split">
    <div class="reveal">
      <span class="eyebrow">Prompt appointments</span>
      <h2 id="getting-seen">{seen["heading"]}</h2>
      {"".join(paras)}
      {cta_row}
    </div>
    <div class="info-panel info-panel--dark reveal">
      <h3>{ICONS["clock"]} Opening Hours</h3>
      <table class="hours-table">
        <tbody>{hours_rows}</tbody>
      </table>
      <p class="small-note" style="color:var(--text-on-navy-soft);margin-top:var(--space-2)">Hours to be confirmed at launch.</p>
    </div>
  </div>
</section>
''')

    html.append(faq_section(get_section(sections, "Frequently Asked Questions"), eyebrow_txt="Emergency care"))
    html.append(related_section(get_section(sections, "Related Services")))
    html.append("</main>")
    html.append(cta_banner(
        heading="Need urgent dental care?",
        text="Call us now so we can arrange to see you as soon as possible during opening hours.",
        primary=("Call " + PHONE_DISPLAY, PHONE_TEL),
        secondary=("Book an Appointment", "/patient-info/")))
    html.append(footer_html())
    write_page(url, "".join(html))

def build_all_services():
    hub_page()
    category_page("07-general-preventive-category-page-copy.md", "/services/general-preventive/",
                  "General & Preventive", "Photo — hygienist performing a professional clean")
    category_page("14-cosmetic-category-page-copy.md", "/services/cosmetic/",
                  "Cosmetic", "Photo — patient admiring their smile in a mirror")
    category_page("19-restorative-category-page-copy.md", "/services/restorative/",
                  "Restorative", "Photo — dentist reviewing a digital scan with a patient")

    gp = ("General & Preventive Dentistry", "/services/general-preventive/")
    cos = ("Cosmetic Dentistry", "/services/cosmetic/")
    res = ("Restorative Dentistry", "/services/restorative/")

    generic_service_page("08-checkups-cleans-page-copy.md", "/services/general-preventive/check-ups-cleans/", *gp,
                         "Photo — routine dental examination")
    generic_service_page("09-digital-xrays-page-copy.md", "/services/general-preventive/digital-xrays/", *gp,
                         "Photo — dentist reviewing a digital X-ray on screen")
    generic_service_page("10-fluoride-treatments-page-copy.md", "/services/general-preventive/fluoride-treatments/", *gp,
                         "Photo — fluoride varnish application")
    generic_service_page("11-fissure-sealants-page-copy.md", "/services/general-preventive/fissure-sealants/", *gp,
                         "Photo — child in the dental chair with clinician")
    generic_service_page("12-gum-disease-care-page-copy.md", "/services/general-preventive/gum-disease-care/", *gp,
                         "Photo — periodontal assessment")
    generic_service_page("13-mouthguards-page-copy.md", "/services/general-preventive/mouthguards/", *gp,
                         "Photo — custom sports mouthguard")

    generic_service_page("15-teeth-whitening-page-copy.md", "/services/cosmetic/teeth-whitening/", *cos,
                         "Photo — teeth whitening treatment")
    generic_service_page("16-porcelain-veneers-page-copy.md", "/services/cosmetic/veneers/", *cos,
                         "Photo — veneer shade matching")
    generic_service_page("17-composite-bonding-page-copy.md", "/services/cosmetic/composite-bonding/", *cos,
                         "Photo — composite bonding procedure")
    generic_service_page("18-smile-makeovers-page-copy.md", "/services/cosmetic/smile-makeovers/", *cos,
                         "Photo — digital smile design consultation")

    generic_service_page("20-fillings-page-copy.md", "/services/restorative/fillings/", *res,
                         "Photo — tooth-coloured filling procedure")
    generic_service_page("21-crowns-bridges-page-copy.md", "/services/restorative/crowns-bridges/", *res,
                         "Photo — porcelain crown on a model")
    generic_service_page("22-root-canal-page-copy.md", "/services/restorative/root-canal/", *res,
                         "Photo — modern endodontic equipment")
    generic_service_page("23-dental-implants-page-copy.md", "/services/restorative/dental-implants/", *res,
                         "Photo — dental implant model")
    generic_service_page("23b-all-on-x-implants-page-copy.md", "/services/restorative/all-on-x-implants/", *res,
                         "Photo — full-arch implant restoration model")
    generic_service_page("24-dentures-page-copy.md", "/services/restorative/dentures/", *res,
                         "Photo — custom dentures")

    emergency_page()
    generic_service_page("26-childrens-dentistry-page-copy.md", "/services/childrens-dentistry/",
                         None, None, "Photo — child smiling in the dental chair",
                         chips=[("child", "Gentle, family-focused care"), ("dollar", "CDBS bulk billing for eligible kids")])
