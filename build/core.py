"""Renderers for Home, About, Special Offers, Book an Appointment, Contact."""
import re
from common import *
from services import SERVICE_ICONS, render_content_section, hero_cta_style

TECH_ICONS = ["camera", "xray", "layers", "tooth", "root", "sparkle"]

HOME_SERVICE_LINKS = {
    "General & Preventive Dentistry": ("/services/general-preventive/", "shield"),
    "Cosmetic Dentistry": ("/services/cosmetic/", "sparkle"),
    "Restorative Dentistry": ("/services/restorative/", "crown"),
    "All-on-X Dental Implants": ("/services/restorative/all-on-x-implants/", "implant"),
    "Emergency Dentistry": ("/services/emergency-dentistry/", "alert"),
}

def bold_lead_items(items):
    """Split '**Name** — desc' / '**Name** desc' list items into (name, desc, href, sep)."""
    out = []
    for it in items:
        m = re.match(r"^\*\*(.+?)\*\*\s*(—|–|-)?\s*(.*)$", it)
        if m:
            name_raw, sep, desc = m.group(1), (m.group(2) or ""), m.group(3)
        else:
            name_raw, sep, desc = it.replace("**", ""), "", ""
        lm = re.match(r"^\[([^\]]+)\]\(([^)]+)\)$", name_raw)
        href = lm.group(2) if lm else None
        name = lm.group(1) if lm else name_raw
        out.append((name, desc, href, sep))
    return out

def rating_badge():
    return f'''<a class="rating-badge" href="#" aria-label="Google rating — placeholder, link to Google Business Profile" title="Placeholder: swap for live Google rating badge linked to the practice's Business Profile">
  <span class="g">G</span>
  <span>
    <span class="stars" aria-hidden="true">★★★★★</span><br>
    <span class="label">Google rating badge — links to Business Profile</span>
  </span>
</a>'''

def hours_panel(dark=False):
    rows = "".join(f"<tr><td>{d}</td><td>{h}</td></tr>" for d, h in HOURS)
    style = ' style="background:var(--navy-800);border-color:var(--line-navy)"' if dark else ""
    hstyle = ' style="color:#fff"' if dark else ""
    tstyle = ' style="color:var(--text-on-navy)"' if dark else ""
    note_style = 'color:var(--text-on-navy-soft);' if dark else ''
    return f'''<div class="info-panel"{style}>
  <h3{hstyle}>{ICONS["clock"]} Opening Hours</h3>
  <table class="hours-table"{tstyle}><tbody>{rows}</tbody></table>
  <p class="small-note" style="{note_style}margin-top:var(--space-2)">Opening hours placeholder — to be confirmed at launch.</p>
</div>'''

def map_placeholder():
    return f'''<div class="map-ph" role="img" aria-label="Map placeholder — {ADDRESS}. Swap for a Google Maps embed.">
  <div class="map-pin">
    {ICONS["pin"]}
    <p>{ADDRESS}</p>
    <p class="ph-note">Map embed placeholder — replace with Google Maps iframe at launch</p>
    <a class="btn btn--outline btn--sm" style="margin-top:.75rem" href="{MAPS_URL}" rel="noopener">Get Directions</a>
  </div>
</div>'''

# ================================================================ HOME
def home_page():
    meta, sections = parse_copy("01-home-page-copy.md")
    url = "/"
    lede = get_section(sections, "__lede__")
    paras, ctas = [], None
    for btype, payload in lede["blocks"]:
        if btype == "p":
            paras.append(f'<p class="lede">{md_inline(payload)}</p>')
        elif btype == "cta":
            ctas = payload
    cta_html = render_cta_row(ctas, style_map=hero_cta_style, large=True)

    html = [head(meta["title"], meta["desc"], url), header_html(active="/")]
    html.append(f'''<section class="hero">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">Dentist in Footscray, VIC</span>
      <h1>{meta["h1"]}</h1>
      {"".join(paras)}
      {cta_html}
      <div class="hero-chips">
        <span class="chip">{ICONS["pin"]} 289 Barkly St, Footscray</span>
        <span class="chip">{ICONS["clock"]} Mon–Fri 9–5 · Sat 9–3</span>
        <span class="chip">{ICONS["shield"]} HICAPS on-the-spot claiming</span>
      </div>
    </div>
    {img_placeholder("Hero photo — welcoming reception at Footscray Dental Studio", tall=True)}
  </div>
</section>
<main id="main">
''')

    # Our Services cards
    svc = get_section(sections, "Our Services")
    intro = next((p for t, p in svc["blocks"] if t == "p" and not p.startswith("**[")), "")
    items = next((p for t, p in svc["blocks"] if t == "ul"), [])
    view_all = next((p for t, p in svc["blocks"] if t == "cta"), None)
    cards = []
    for name, desc, href, _sep in bold_lead_items(items):
        u, ic = HOME_SERVICE_LINKS.get(name, (href or "/services/", "tooth"))
        cards.append(f'''<article class="card">
  <span class="card-icon">{ICONS[ic]}</span>
  <h3><a href="{u}">{name}</a></h3>
  <p>{md_inline(desc)}</p>
  <span class="text-link">Learn more</span>
</article>''')
    html.append(f'''<section class="section" aria-labelledby="our-services">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">What we do</span>
      <h2 id="our-services">{svc["heading"]}</h2>
      <p>{md_inline(intro)}</p>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(cards[:3])}</div>
    <div class="grid grid--2 reveal-stagger" style="margin-top:var(--space-4)">{"".join(cards[3:])}</div>
    <div class="btn-row reveal"><a class="btn btn--navy" href="/services/">{md_inline_label(view_all[0][0]) if view_all else "View All Services"}</a></div>
  </div>
</section>
''')

    # Why choose — navy section with tech feature list + rating badge
    why = get_section(sections, "Why Choose Footscray Dental Studio")
    why_paras = [p for t, p in why["blocks"] if t == "p" and not p.startswith("**[")]
    tech_items = next((p for t, p in why["blocks"] if t == "ul"), [])
    tech_cards = []
    for i, (name, desc, _, sep) in enumerate(bold_lead_items(tech_items)):
        ic = TECH_ICONS[i % len(TECH_ICONS)]
        joiner = f" {sep} " if sep else ("" if desc[:1] in ",.;:" else " ")
        tech_cards.append(f'''<li><span class="tick">{ICONS["check"]}</span><span><strong>{name}</strong>{joiner}{md_inline(desc)}</span></li>''')
    html.append(f'''<section class="section section--navy" aria-labelledby="why-choose">
  <div class="container">
    <div class="split">
      <div class="reveal">
        <span class="eyebrow">Why us</span>
        <h2 id="why-choose">{why["heading"]}</h2>
        <p>{md_inline(why_paras[0])}</p>
        <div class="stats" style="margin-top:var(--space-4)">
          <div class="stat"><div class="stat-value">20+</div><div class="stat-label">Years of combined clinical experience</div></div>
          <div class="stat"><div class="stat-value">5</div><div class="stat-label">Experienced practitioners</div></div>
          <div class="stat"><div class="stat-value">6</div><div class="stat-label">Days open each week — Sunday by appointment</div></div>
        </div>
      </div>
      <div class="reveal">
        <ul class="feature-list">{"".join(tech_cards)}</ul>
      </div>
    </div>
    <div class="reveal" style="margin-top:var(--space-5)">
      <p style="max-width:44rem">{md_inline(why_paras[1])}</p>
      {rating_badge()}
    </div>
  </div>
</section>
''')

    # Community section
    comm = get_section(sections, "A Practice Built on Community")
    comm_p = next((p for t, p in comm["blocks"] if t == "p"), "")
    comm_cta = next((p for t, p in comm["blocks"] if t == "cta"), None)
    html.append(f'''<section class="section section--white" aria-labelledby="community">
  <div class="container split split--rev reveal">
    <div>
      <span class="eyebrow">Our story</span>
      <h2 id="community">{comm["heading"]}</h2>
      <p>{md_inline(comm_p)}</p>
      <div class="btn-row"><a class="btn btn--outline" href="/about/">{md_inline_label(comm_cta[0][0]) if comm_cta else "Learn More About Us"}</a></div>
    </div>
    {img_placeholder("Photo — the Footscray Dental Studio team", light=True, tall=True)}
  </div>
</section>
''')

    # Offers teaser
    offers = get_section(sections, "Current Offers")
    offer_items = next((p for t, p in offers["blocks"] if t == "ul"), [])
    see_all = next((p for t, p in offers["blocks"] if t == "cta"), None)
    offer_cards = []
    for it in offer_items:
        m = re.match(r"^(.*?)\s*[—–]\s*(.*)$", it)
        name, price = (m.group(1), m.group(2)) if m else (it, "")
        price_style = ' style="font-size:1.2rem;line-height:1.4"' if len(price) > 16 else ""
        offer_cards.append(f'''<article class="card offer-card">
  <span class="offer-badge">Current offer</span>
  <h3><a href="/special-offers/">{md_inline(name)}</a></h3>
  <span class="offer-price"{price_style}>{price}</span>
</article>''')
    html.append(f'''<section class="section section--cream2" aria-labelledby="current-offers">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Accessible care</span>
      <h2 id="current-offers">{offers["heading"]}</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(offer_cards)}</div>
    <div class="btn-row reveal"><a class="btn btn--navy" href="/special-offers/">{md_inline_label(see_all[0][0]) if see_all else "See All Offers"}</a></div>
  </div>
</section>
''')

    # Visiting us
    visit = get_section(sections, "Visiting Us")
    visit_paras = [p for t, p in visit["blocks"] if t == "p"
                   and not p.startswith("**Opening Hours**")
                   and not p.startswith("**Phone:**")]
    visit_ctas = next((p for t, p in visit["blocks"] if t == "cta"), None)
    html.append(f'''<section class="section section--white" aria-labelledby="visiting-us">
  <div class="container">
    <div class="split">
      <div class="reveal">
        <span class="eyebrow">Find us</span>
        <h2 id="visiting-us">{visit["heading"]}</h2>
        <p>{md_inline(visit_paras[0])}</p>
        <div class="grid grid--2" style="margin-top:var(--space-4)">
          {hours_panel()}
          <div class="info-panel">
            <h3>{ICONS["phone"]} Get in Touch</h3>
            <p style="margin-bottom:.5rem"><strong>Phone:</strong> <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a></p>
            <p><strong>Email:</strong> <a href="mailto:{EMAIL}">{EMAIL}</a></p>
          </div>
        </div>
        {render_cta_row(visit_ctas) if visit_ctas else ""}
      </div>
      <div class="reveal">{map_placeholder()}</div>
    </div>
  </div>
</section>
''')

    html.append(faq_section(get_section(sections, "Frequently Asked Questions")))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

# ================================================================ ABOUT
TEAM = [("Dr Zainab [Surname]", "Z"), ("Dr Alan [Surname]", "A"), ("Dr Adeela [Surname]", "A"),
        ("Dr Nikhat [Surname]", "N"), ("Dr Abu Baker [Surname]", "AB")]

def about_page():
    meta, sections = parse_copy("02-about-us-page-copy.md")
    url = "/about/"
    lede = get_section(sections, "__lede__")
    paras, ctas = [], None
    for btype, payload in lede["blocks"]:
        if btype == "p":
            paras.append(f'<p class="lede">{md_inline(payload)}</p>')
        elif btype == "cta":
            ctas = payload

    html = [head(meta["title"], meta["desc"], url), header_html(active="/about/")]
    html.append(breadcrumbs([("Home", "/"), ("About Us", url)]))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">About us</span>
      <h1>{meta["h1"]}</h1>
      {paras[0]}
      {render_cta_row(ctas, style_map=hero_cta_style, large=True) if ctas else ""}
    </div>
    {img_placeholder("Photo — the studio and team", tall=True)}
  </div>
</section>
<main id="main">
<section class="section section--white">
  <div class="container--narrow reveal">
    {"".join(paras[1:])}
  </div>
</section>
''')

    phil = get_section(sections, "Our Philosophy")
    phil_paras = [f"<p>{md_inline(p)}</p>" for t, p in phil["blocks"] if t == "p"]
    html.append(f'''<section class="section" aria-labelledby="philosophy">
  <div class="container split reveal">
    {img_placeholder("Photo — dentist chatting with a patient", light=True, tall=True)}
    <div>
      <span class="eyebrow">Our philosophy</span>
      <h2 id="philosophy">{phil["heading"]}</h2>
      {"".join(phil_paras)}
    </div>
  </div>
</section>
''')

    tech = get_section(sections, "A Modern, Technology-Led Studio")
    tech_paras = [p for t, p in tech["blocks"] if t == "p"]
    tech_items = next((p for t, p in tech["blocks"] if t == "ul"), [])
    tech_cards = []
    for i, (name, desc, _, _sep) in enumerate(bold_lead_items(tech_items)):
        ic = TECH_ICONS[i % len(TECH_ICONS)]
        tech_cards.append(f'''<article class="card card--navy">
  <span class="card-icon">{ICONS[ic]}</span>
  <h3>{name}</h3>
  <p>{md_inline(desc)}</p>
</article>''')
    html.append(f'''<section class="section section--navy" aria-labelledby="technology">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Modern technology</span>
      <h2 id="technology">{tech["heading"]}</h2>
      <p>{md_inline(tech_paras[0])}</p>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(tech_cards)}</div>
    <p class="reveal" style="margin-top:var(--space-4);max-width:44rem">{md_inline(tech_paras[1]) if len(tech_paras) > 1 else ""}</p>
  </div>
</section>
''')

    cont = get_section(sections, "Continuity, With Fresh Expertise")
    cont_paras = [f"<p>{md_inline(p)}</p>" for t, p in cont["blocks"] if t == "p"]
    html.append(f'''<section class="section section--white" aria-labelledby="continuity">
  <div class="container split split--rev reveal">
    <div>
      <span class="eyebrow">Familiar faces, new expertise</span>
      <h2 id="continuity">{cont["heading"]}</h2>
      {"".join(cont_paras)}
    </div>
    {img_placeholder("Photo — practitioners and support staff", light=True)}
  </div>
</section>
''')

    # Meet the team
    team_sec = get_section(sections, "Meet Our Team")
    note = next((p for t, p in team_sec["blocks"] if t == "note"), None)
    team_cards = []
    for name, initials in TEAM:
        team_cards.append(f'''<article class="card team-card">
  <div class="avatar-ph" role="img" aria-label="Placeholder: professional headshot of {name}"><span>{initials}</span></div>
  <h3>{name}</h3>
  <span class="role">Title: To be confirmed</span>
  <p class="tbc"><strong>AHPRA Registration:</strong> TBC<br>
  <strong>Qualifications:</strong> TBC — degree, university, graduation year<br>
  <strong>Areas of Clinical Interest:</strong> TBC<br>
  <strong>Continuing Education / Additional Training:</strong> TBC<br>
  <strong>Professional Memberships:</strong> TBC<br>
  <strong>Years in Practice / At This Practice:</strong> TBC</p>
  <p class="tbc"><strong>Bio:</strong> TBC — short, factual bio</p>
</article>''')
    html.append(f'''<section class="section section--cream2" id="meet-the-team" aria-labelledby="team-heading">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Meet the team</span>
      <h2 id="team-heading">{team_sec["heading"]}</h2>
    </div>
    <div class="tbc-note reveal"><strong>For client review:</strong> {md_inline(note) if note else "Practitioner credentials awaiting confirmation."}</div>
    <div class="grid grid--3 reveal-stagger">{"".join(team_cards[:3])}</div>
    <div class="grid grid--2 reveal-stagger" style="margin-top:var(--space-4)">{"".join(team_cards[3:])}</div>
  </div>
</section>
''')

    visit = get_section(sections, "Visit Us")
    visit_p = next((p for t, p in visit["blocks"] if t == "p"), "")
    visit_ctas = next((p for t, p in visit["blocks"] if t == "cta"), None)
    html.append(f'''<section class="section section--white center" aria-labelledby="visit-us">
  <div class="container--narrow reveal">
    <span class="eyebrow" style="justify-content:center">We'd love to meet you</span>
    <h2 id="visit-us">{visit["heading"]}</h2>
    <p>{md_inline(visit_p)}</p>
    <div class="btn-row" style="justify-content:center">{render_cta_row(visit_ctas).replace('<div class="btn-row">', '').replace('</div>', '') if visit_ctas else ""}</div>
  </div>
</section>
''')

    html.append(faq_section(get_section(sections, "Frequently Asked Questions")))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

# ================================================================ SPECIAL OFFERS
OFFER_ICONS = ["sparkle", "smile", "implant", "shield", "child", "heart"]

def offers_page():
    meta, sections = parse_copy("03-special-offers-page-copy.md")
    url = "/special-offers/"
    lede = get_section(sections, "__lede__")
    lede_p = next((p for t, p in lede["blocks"] if t == "p"), "")

    html = [head(meta["title"], meta["desc"], url), header_html(active="/special-offers/")]
    html.append(breadcrumbs([("Home", "/"), ("Special Offers", url)]))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">Special offers</span>
      <h1>{meta["h1"]}</h1>
      <p class="lede">{md_inline(lede_p)}</p>
    </div>
    {img_placeholder("Photo — patient at reception being welcomed")}
  </div>
</section>
<main id="main">
''')

    # Offer sections (level-3 headings between lede and disclaimer)
    cards = []
    disclaimer = ""
    final_ctas = None
    idx = 0
    for sec in sections:
        h = sec["heading"]
        if h in ("__lede__", "Frequently Asked Questions") or h.startswith("Related"):
            continue
        if sec["level"] != 3:
            # trailing block with disclaimer + ctas lives in a pseudo-section
            continue
        title, price = h, ""
        m = re.match(r"^(.*?)\s*[—–]\s*(.*)$", h)
        if m:
            title, price = m.group(1), m.group(2)
        inner = []
        sub = ""
        for btype, payload in sec["blocks"]:
            if btype == "p":
                inner.append(f"<p>{md_inline(payload)}</p>")
            elif btype == "ul":
                inner.append("<ul>" + "".join(f"<li>{md_inline(i)}</li>" for i in payload) + "</ul>")
            elif btype == "note":
                if "subject to change" in payload.lower():
                    continue  # page-level disclaimer, rendered after the cards
                sub = f'<p class="small-note">{md_inline(payload)}</p>'
            elif btype == "cta":
                if len(payload) > 1:
                    continue  # page-level closing CTA row, rendered after the cards
                label = payload[0][0]
                href = cta_href(label) or "/patient-info/"
                inner.append(f'<a class="btn btn--primary" href="{href}">{md_inline_label(label)}</a>')
        price_html = f'<span class="offer-price">{price}</span>' if price else ""
        ic = OFFER_ICONS[idx % len(OFFER_ICONS)]
        idx += 1
        cards.append(f'''<article class="card offer-card">
  <span class="card-icon">{ICONS[ic]}</span>
  <h3 class="mb-0">{title}</h3>
  {sub}{price_html}
  {"".join(inner)}
</article>''')

    # Disclaimer + closing CTAs come after the last ### section, in its blocks —
    # they were captured inside the last offer section; pull notes/ctas out is complex,
    # so instead scan all sections for a trailing standalone note/cta pair:
    tail_note = None
    tail_ctas = None
    for sec in sections:
        if sec["level"] == 3:
            blocks = sec["blocks"]
            for i, (btype, payload) in enumerate(blocks):
                if btype == "note" and "subject to change" in payload.lower():
                    tail_note = payload
                if btype == "cta" and len(payload) > 1:
                    tail_ctas = payload
    # remove those from cards output is handled by the note/cta detection above (note went to sub);
    html.append(f'''<section class="section" aria-label="Current offers">
  <div class="container">
    <div class="grid grid--2 reveal-stagger">{"".join(cards)}</div>
    <div class="reveal" style="margin-top:var(--space-5)">
      <p class="small-note">{md_inline(tail_note) if tail_note else ""}</p>
      {render_cta_row(tail_ctas) if tail_ctas else render_cta_row([("Book an Appointment", None), ("Contact Us", None)])}
    </div>
  </div>
</section>
''')

    html.append(faq_section(get_section(sections, "Frequently Asked Questions"), eyebrow_txt="Offers"))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

# ================================================================ BOOK AN APPOINTMENT
def booking_form():
    return f'''<form class="form-card" data-validate novalidate aria-label="Appointment request form" id="book">
  <div class="form-grid form-grid--2">
    <div class="field">
      <label for="bf-name">Full name <span class="req" aria-hidden="true">*</span></label>
      <input id="bf-name" name="name" type="text" autocomplete="name" required>
      <p class="error-msg" role="alert"></p>
    </div>
    <div class="field">
      <label for="bf-phone">Phone <span class="req" aria-hidden="true">*</span></label>
      <input id="bf-phone" name="phone" type="tel" autocomplete="tel" required>
      <p class="error-msg" role="alert"></p>
    </div>
    <div class="field">
      <label for="bf-email">Email <span class="req" aria-hidden="true">*</span></label>
      <input id="bf-email" name="email" type="email" autocomplete="email" required>
      <p class="error-msg" role="alert"></p>
    </div>
    <div class="field">
      <label for="bf-type">Appointment type</label>
      <select id="bf-type" name="appointment-type">
        <option>Routine check-up</option>
        <option>New patient exam</option>
        <option>A specific concern</option>
        <option>Emergency care</option>
      </select>
    </div>
    <div class="field span-2">
      <label for="bf-msg">Anything we should know? (optional)</label>
      <textarea id="bf-msg" name="message"></textarea>
    </div>
    <div class="span-2">
      <button class="btn btn--primary btn--lg" type="submit">{ICONS["calendar"]} Request an Appointment</button>
      <p class="form-note" style="margin-top:var(--space-2)">This form is a styled, front-end-validated placeholder — the online booking system will be connected here before launch. For urgent bookings, please call {PHONE_DISPLAY}.</p>
      <p class="form-success" role="status" tabindex="-1">Thanks — your request has been captured. Once the booking system is connected, requests will reach our team directly. For now, please call {PHONE_DISPLAY} to confirm your appointment.</p>
    </div>
  </div>
</form>'''

def book_page():
    meta, sections = parse_copy("04-book-appointment-page-copy.md")
    url = "/patient-info/"
    lede = get_section(sections, "__lede__")
    lede_p = next((p for t, p in lede["blocks"] if t == "p"), "")
    ctas = next((p for t, p in lede["blocks"] if t == "cta"), None)

    html = [head(meta["title"], meta["desc"], url), header_html()]
    html.append(breadcrumbs([("Home", "/"), ("Book an Appointment", url)]))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">Book an appointment</span>
      <h1>{meta["h1"]}</h1>
      <p class="lede">{md_inline(lede_p)}</p>
      {render_cta_row([("Book Online", "#book"), ("Call " + PHONE_DISPLAY, PHONE_TEL)], style_map=hero_cta_style, large=True)}
    </div>
    {img_placeholder("Photo — front desk team taking a booking")}
  </div>
</section>
<main id="main">
''')

    how = get_section(sections, "How Booking Works")
    steps_items = next((p for t, p in how["blocks"] if t == "ol"), [])
    html.append(f'''<section class="section section--white" aria-labelledby="how-booking-works">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Simple steps</span>
      <h2 id="how-booking-works">{how["heading"]}</h2>
    </div>
    <div class="reveal-stagger">{render_steps(steps_items, grid=True)}</div>
  </div>
</section>
''')

    first = get_section(sections, "Your First Visit")
    first_paras = [p for t, p in first["blocks"] if t == "p"]
    first_items = next((p for t, p in first["blocks"] if t == "ul"), [])
    html.append(f'''<section class="section" aria-labelledby="first-visit">
  <div class="container split reveal">
    <div>
      <span class="eyebrow">New patients welcome</span>
      <h2 id="first-visit">{first["heading"]}</h2>
      <p>{md_inline(first_paras[0])}</p>
      <p>{md_inline(first_paras[1]) if len(first_paras) > 1 else ""}</p>
      {render_checklist(first_items, two_col=False)}
      {"".join(f"<p>{md_inline(p)}</p>" for p in first_paras[2:])}
    </div>
    {img_placeholder("Photo — welcoming waiting area", light=True, tall=True)}
  </div>
</section>
''')

    funds = get_section(sections, "Health Funds & Payment")
    funds_html = "".join(f"<p>{md_inline(p)}</p>" for t, p in funds["blocks"] if t == "p")
    cancel = get_section(sections, "Cancellations & Rescheduling")
    cancel_html = "".join(f"<p>{md_inline(p)}</p>" for t, p in cancel["blocks"] if t == "p")
    html.append(f'''<section class="section section--navy" aria-label="Payments and cancellations">
  <div class="container grid grid--2 reveal-stagger">
    <div>
      <span class="eyebrow">{ICONS["dollar"]}</span>
      <h2>{funds["heading"]}</h2>
      {funds_html}
    </div>
    <div>
      <span class="eyebrow">{ICONS["calendar"]}</span>
      <h2>{cancel["heading"]}</h2>
      {cancel_html}
    </div>
  </div>
</section>
''')

    ready = get_section(sections, "Ready to Book")
    ready_ctas = next((p for t, p in ready["blocks"] if t == "cta"), None) if ready else None
    html.append(f'''<section class="section section--white" aria-labelledby="ready-to-book">
  <div class="container split">
    <div class="reveal">
      <span class="eyebrow">Ready to book?</span>
      <h2 id="ready-to-book">Request Your Appointment</h2>
      <p>Choose a time that suits you online, or call our friendly team on <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
      {render_cta_row(ready_ctas) if ready_ctas else ""}
    </div>
    <div class="reveal">{booking_form()}</div>
  </div>
</section>
''')

    html.append(faq_section(get_section(sections, "Frequently Asked Questions"), eyebrow_txt="Booking"))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

# ================================================================ CONTACT
def contact_form():
    return f'''<form class="form-card" data-validate novalidate aria-label="Contact form">
  <div class="form-grid form-grid--2">
    <div class="field">
      <label for="cf-name">Name <span class="req" aria-hidden="true">*</span></label>
      <input id="cf-name" name="name" type="text" autocomplete="name" required>
      <p class="error-msg" role="alert"></p>
    </div>
    <div class="field">
      <label for="cf-phone">Phone <span class="req" aria-hidden="true">*</span></label>
      <input id="cf-phone" name="phone" type="tel" autocomplete="tel" required>
      <p class="error-msg" role="alert"></p>
    </div>
    <div class="field span-2">
      <label for="cf-email">Email <span class="req" aria-hidden="true">*</span></label>
      <input id="cf-email" name="email" type="email" autocomplete="email" required>
      <p class="error-msg" role="alert"></p>
    </div>
    <div class="field span-2">
      <label for="cf-msg">Message <span class="req" aria-hidden="true">*</span></label>
      <textarea id="cf-msg" name="message" required></textarea>
      <p class="error-msg" role="alert"></p>
    </div>
    <div class="span-2">
      <button class="btn btn--primary btn--lg" type="submit">{ICONS["mail"]} Send Message</button>
      <p class="form-note" style="margin-top:var(--space-2)">Front-end validation only — form handling will be connected to the practice inbox before launch.</p>
      <p class="form-success" role="status" tabindex="-1">Thanks for your message — once the form backend is connected, our team will reply during business hours. For anything urgent, please call {PHONE_DISPLAY}.</p>
    </div>
  </div>
</form>'''

def contact_page():
    meta, sections = parse_copy("05-contact-us-page-copy.md")
    url = "/contact/"
    lede = get_section(sections, "__lede__")
    lede_p = next((p for t, p in lede["blocks"] if t == "p"), "")

    git = get_section(sections, "Get In Touch")
    git_ctas = next((p for t, p in git["blocks"] if t == "cta"), None)

    html = [head(meta["title"], meta["desc"], url), header_html(active="/contact/")]
    html.append(breadcrumbs([("Home", "/"), ("Contact Us", url)]))
    html.append(f'''<section class="hero hero--inner">
  <div class="container hero-grid">
    <div class="reveal is-visible">
      <span class="eyebrow">Contact us</span>
      <h1>{meta["h1"]}</h1>
      <p class="lede">{md_inline(lede_p)}</p>
      {render_cta_row(git_ctas, style_map=hero_cta_style, large=True) if git_ctas else ""}
    </div>
    {img_placeholder("Photo — reception team answering the phone")}
  </div>
</section>
<main id="main">
<section class="section section--white" aria-labelledby="get-in-touch">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Details</span>
      <h2 id="get-in-touch">{git["heading"]}</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">
      <div class="info-panel">
        <h3>{ICONS["phone"]} Phone &amp; Email</h3>
        <p style="margin-bottom:.5rem"><strong>Phone:</strong> <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a></p>
        <p><strong>Email:</strong> <a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
      <div class="info-panel">
        <h3>{ICONS["pin"]} Address</h3>
        <p><a href="{MAPS_URL}" rel="noopener">{ADDRESS}</a></p>
      </div>
      {hours_panel()}
    </div>
  </div>
</section>
''')

    msg = get_section(sections, "Send Us a Message")
    msg_p = next((p for t, p in msg["blocks"] if t == "p" and not p.startswith("**[")), "")
    find = get_section(sections, "Find Us")
    find_paras = [p for t, p in find["blocks"] if t == "p" and not p.startswith("**[")]
    html.append(f'''<section class="section" aria-labelledby="send-message">
  <div class="container split">
    <div class="reveal">
      <span class="eyebrow">Online enquiries</span>
      <h2 id="send-message">{msg["heading"]}</h2>
      <p>{md_inline(msg_p)}</p>
      {contact_form()}
    </div>
    <div class="reveal">
      <span class="eyebrow">Directions</span>
      <h2>{find["heading"]}</h2>
      {map_placeholder()}
      <p style="margin-top:var(--space-3)">{md_inline(find_paras[0]) if find_paras else ""}</p>
    </div>
  </div>
</section>
''')

    emg = get_section(sections, "Dental Emergency")
    emg_p = next((p for t, p in emg["blocks"] if t == "p" and not p.startswith("**[")), "")
    html.append(f'''<section class="section section--tight" aria-labelledby="emergency-callout">
  <div class="container">
    <div class="urgent-banner reveal">
      <span class="urgent-icon">{ICONS["alert"]}</span>
      <div style="flex:1;min-width:16rem">
        <h2 id="emergency-callout" style="font-size:1.4rem;margin-bottom:.4rem;color:var(--navy-900)">{emg["heading"]}</h2>
        <p>{md_inline(emg_p)}</p>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap">
        <a class="btn btn--navy" href="{PHONE_TEL}">{ICONS["phone"]} Call {PHONE_DISPLAY}</a>
        <a class="btn btn--outline" style="border-color:var(--navy-900);color:var(--navy-900)" href="/services/emergency-dentistry/">Emergency Dentistry Info</a>
      </div>
    </div>
  </div>
</section>
''')

    html.append(faq_section(get_section(sections, "Frequently Asked Questions"), eyebrow_txt="Contact"))
    html.append("</main>")
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))
