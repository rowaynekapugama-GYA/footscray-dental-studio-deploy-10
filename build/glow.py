"""Glowdent-language chrome (pill header, watermark footer) + homepage renderer.
Images are referenced by their hosted Higgsfield URLs (localised later)."""
import re
from common import (
    ICONS, PHONE_DISPLAY, PHONE_TEL, EMAIL, ADDRESS, MAPS_URL, HOURS,
    hours_line, form_hidden, form_error,
    GP_SUBS, COS_SUBS, RES_SUBS, logo_svg, parse_copy, get_section,
    md_inline, md_inline_label, render_faq, write_page,
)

CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3HTXPafqPwfIV3CtOfuhV1PWlEU/hf_20260902_061604_"

# key: (url, alt, target-local-filename)
IMAGES = {
    # Self-hosted (shipped in assets/img) rather than hot-linked, for load speed
    "hero-home": ("/assets/img/hero-home.jpg",
                  "Three generations of a smiling family together outdoors, taking a photo",
                  "hero-home.jpg"),
    "about-clinic-1": ("https://i.imgur.com/rpvh8db.png",
                       "A dentist carefully treating a relaxed patient in a modern dental chair",
                       "about-clinic-1.jpg"),
    "about-clinic-2": ("https://i.imgur.com/I35SuUK.png",
                       "A dental hygienist chatting with a smiling patient in the treatment room",
                       "about-clinic-2.jpg"),
    "avatar-1": (CDN + "38846031-e67a-4cb7-a81f-91ddd633ceb1_min.webp", "Smiling patient portrait", "avatar-1.jpg"),
    "avatar-2": (CDN + "b3f679a8-8946-47d7-9802-8b9c63b701d6_min.webp", "Smiling patient portrait", "avatar-2.jpg"),
    "avatar-3": (CDN + "9047760b-40c5-41ed-ba69-cb3635a8ad6b_min.webp", "Smiling patient portrait", "avatar-3.jpg"),
    "avatar-4": (CDN + "de439f75-6de4-4f21-a16a-c328d4d19bc0_min.webp", "Smiling patient portrait", "avatar-4.jpg"),
    "avatar-5": (CDN + "761ca732-97eb-4e9f-b134-60af0f3a88cd_min.webp", "Smiling patient portrait", "avatar-5.jpg"),
    "home-services-card": (CDN + "fdd7025a-6779-4027-91ec-dcbf84d02089.png",
                           "Neatly arranged modern dental instruments beside a dental chair",
                           "home-services-card.jpg"),
    "reception-welcome": ("https://i.imgur.com/GoJBoEA.png",
                          "A friendly receptionist welcoming a patient at the Footscray Dental Studio front desk",
                          "reception-welcome.jpg"),
}

def img_tag(key, cls="", loading="lazy", extra=""):
    url, alt, _ = IMAGES[key]
    c = f' class="{cls}"' if cls else ""
    fallback = "" if "onerror" in extra else ' onerror="this.remove()"'
    return f'<img src="{url}" alt="{alt}"{c} loading="{loading}"{fallback} {extra}>'

SOCIAL = {
    "facebook": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16.5V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V11H8v3h2.3v7z"/></svg>',
    "instagram": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
    "linkedin": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5H3.8V21h2.7zM5.1 3.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM21 13.6c0-3.2-1.7-4.7-4-4.7-1.8 0-2.6 1-3.1 1.7V8.5h-2.7V21h2.7v-6.8c0-1.2.8-2.1 2-2.1s1.9.9 1.9 2.1V21H21z"/></svg>',
}

# ---------------------------------------------------------------- head
# Sitewide Dentist/LocalBusiness schema. alternateName carries the rebrand
# continuity signal so brand searches for the old name resolve to this practice.
BUSINESS_SCHEMA = (
    '<script type="application/ld+json">'
    '{"@context":"https://schema.org","@type":"Dentist",'
    '"@id":"https://www.footscraydentalstudio.com.au/#practice",'
    '"name":"Footscray Dental Studio","alternateName":"Ezy Dental Group",'
    '"url":"https://www.footscraydentalstudio.com.au/",'
    '"logo":"https://www.footscraydentalstudio.com.au/assets/img/logo.png",'
    '"image":"https://www.footscraydentalstudio.com.au/assets/img/hero-home.jpg",'
    '"telephone":"(03) 9000 0792","email":"info@footscraydentalstudio.com.au",'
    '"priceRange":"$$",'
    '"address":{"@type":"PostalAddress","streetAddress":"289 Barkly St",'
    '"addressLocality":"Footscray","addressRegion":"VIC","postalCode":"3011","addressCountry":"AU"},'
    '"geo":{"@type":"GeoCoordinates","latitude":-37.7995,"longitude":144.8997},'
    '"areaServed":[{"@type":"City","name":"Footscray"},{"@type":"City","name":"Seddon"},'
    '{"@type":"City","name":"Yarraville"},{"@type":"City","name":"West Footscray"},'
    '{"@type":"City","name":"Maribyrnong"}],'
    '"openingHoursSpecification":['
    '{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],'
    '"opens":"09:00","closes":"17:00"},'
    '{"@type":"OpeningHoursSpecification","dayOfWeek":"Saturday","opens":"09:00","closes":"15:00"}]}'
    "</script>"
)

# Google Tag Manager container. Added by GYA to the live homepage on 23 Sep 2026; the
# generator now puts it on every page so it survives rebuilds and admin publishes.
GTM_ID = "GTM-MTVSMPG7"
GTM_HEAD = (f"<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':"
            f"new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';"
            f"j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);}})"
            f"(window,document,'script','dataLayer','{GTM_ID}');</script>\n<!-- End Google Tag Manager -->")
GTM_BODY = (f'<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM_ID}" '
            f'height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->')

def head_v2(title, desc, url):
    from common import SITE_NAME
    return f'''<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://www.footscraydentalstudio.com.au{url}">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css">
<script src="/assets/js/main.js" defer></script>
{BUSINESS_SCHEMA}
{GTM_HEAD}
</head>
<body>
{GTM_BODY}
<a class="skip-link" href="#main">Skip to main content</a>
'''

# ---------------------------------------------------------------- header
# Client-supplied logo artwork (hot-linked; localise to assets/img/logo.png at launch).
# The footer copy is the same file reversed out to white via CSS (.logo--reversed), so a
# single asset serves both lockups until the images are downloaded.
LOGO_URL = "https://i.imgur.com/YYE2l6j.png"

# Free stock photos (Unsplash) for the mega-menu category pills — swap/localise at launch.
MEGA_IMGS = {
    "general": "https://i.imgur.com/oRnGZD7.png",
    "cosmetic": "https://i.imgur.com/M4ck1I0.png",
    "restorative": "https://i.imgur.com/EOKeCn7.png",
    "more": "https://i.imgur.com/rCghXqD.png",
}

def _mega_col(title, url, subs, img_key):
    lis = "\n".join(f'<li><a class="sub" href="{u}">{n}</a></li>' for n, u in subs)
    return f'''<div class="mega-col">
  <a class="mega-img" href="{url}">
    <img src="{MEGA_IMGS[img_key]}" alt="" loading="lazy" onerror="this.remove()">
    <span>{title}</span>
  </a>
  <ul>{lis}</ul>
</div>'''

def header_v2(active=""):
    def cur(path):
        return ' aria-current="page"' if active == path else ""
    mega = f'''<div class="mega" id="services-mega">
  {_mega_col("General &amp; Preventive", "/services/general-preventive/", GP_SUBS, "general")}
  {_mega_col("Cosmetic", "/services/cosmetic/", COS_SUBS, "cosmetic")}
  {_mega_col("Restorative", "/services/restorative/", RES_SUBS, "restorative")}
  <div class="mega-col mega-featured">
    <a class="mega-img" href="/services/">
      <img src="{MEGA_IMGS["more"]}" alt="" loading="lazy" onerror="this.remove()">
      <span>More Care</span>
    </a>
    <ul>
      <li><a class="sub" href="/services/emergency-dentistry/">Emergency Dentistry</a></li>
      <li><a class="sub" href="/services/childrens-dentistry/">Children's Dentistry</a></li>
    </ul>
    <p class="mega-note">Prompt care when you need it most, and gentle visits for the little ones.</p>
    <a class="mega-view-all" href="/services/">View all services ↗</a>
  </div>
</div>'''
    return f'''<header class="site-header">
  <div class="header-pill">
    <a class="logo" href="/" aria-label="Footscray Dental Studio — home"><img src="{LOGO_URL}" alt="Footscray Dental Studio" onerror="this.remove()"><span class="logo-text" aria-hidden="true">Footscray <b>Dental Studio</b></span></a>
    <nav class="main-nav" id="main-nav" aria-label="Main navigation">
      <ul>
        <li><a class="nav-link" href="/"{cur("/")}>Home</a></li>
        <li><a class="nav-link" href="/about/"{cur("/about/")}>About</a></li>
        <li><a class="nav-link" href="/meet-the-team/"{cur("/meet-the-team/")}>Meet the Team</a></li>
        <li class="has-mega">
          <button class="nav-link" type="button" aria-expanded="false" aria-controls="services-mega">Services {ICONS["caret"]}</button>
          {mega}
        </li>
        <li><a class="nav-link" href="/special-offers/"{cur("/special-offers/")}>Special Offers</a></li>
        <li><a class="nav-link" href="/blog/"{cur("/blog/")}>Blog</a></li>
        <li><a class="nav-link" href="/contact/"{cur("/contact/")}>Contact</a></li>
      </ul>
      <div class="mobile-nav-ctas">
        <a class="btn btn--call" href="{PHONE_TEL}">{ICONS["phone"]} Call Now — {PHONE_DISPLAY}</a>
        <a class="btn btn--navy" href="/patient-info/">Book an Appointment</a>
      </div>
    </nav>
    <div class="header-ctas">
      <a class="btn btn--call" href="{PHONE_TEL}" title="Emergency? Call us now on {PHONE_DISPLAY}">{ICONS["phone"]} Call Now</a>
      <a class="btn btn--navy" href="/patient-info/">Book an Appointment</a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Toggle menu">
        <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
  </div>
</header>
'''

# ---------------------------------------------------------------- footer
def footer_v2():
    pages = [("Home", "/"), ("About Us", "/about/"), ("Meet the Team", "/meet-the-team/"),
             ("Special Offers", "/special-offers/"), ("Blog", "/blog/"),
             ("Book an Appointment", "/patient-info/"), ("Contact Us", "/contact/")]
    services = [("All Services", "/services/"),
                ("General & Preventive", "/services/general-preventive/"),
                ("Cosmetic Dentistry", "/services/cosmetic/"),
                ("Restorative Dentistry", "/services/restorative/"),
                ("Dental Implants", "/services/restorative/dental-implants/"),
                ("All-on-X Implants", "/services/restorative/all-on-x-implants/")]
    more = [("Emergency Dentistry", "/services/emergency-dentistry/"),
            ("Children's Dentistry", "/services/childrens-dentistry/"),
            ("Privacy Policy", "/privacy-policy/"),
            ("Terms of Use", "/terms/"),
            ("Sitemap", "/sitemap/")]
    def col(title, links):
        lis = "\n".join(f'<li><a href="{u}">{n}</a></li>' for n, u in links)
        return f'<div><h3 class="col-title">{title}</h3><ul>{lis}</ul></div>'
    return f'''<footer class="site-footer">
  <div class="container">
    <div class="footer-cards reveal-stagger">
      <div class="footer-card">
        <span class="fc-icon">{ICONS["pin"]}</span>
        <h3>Our Address</h3>
        <p class="mb-0"><a href="{MAPS_URL}" rel="noopener">{ADDRESS}</a></p>
      </div>
      <div class="footer-card">
        <span class="fc-icon">{ICONS["phone"]}</span>
        <h3>Phone Number</h3>
        <p class="mb-0"><a href="{PHONE_TEL}">{PHONE_DISPLAY}</a></p>
      </div>
      <div class="footer-card">
        <span class="fc-icon">{ICONS["mail"]}</span>
        <h3>Email Address</h3>
        <p class="mb-0"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
    </div>
    <div class="footer-main">
      <div class="footer-brand">
        <a class="logo logo--reversed" href="/" aria-label="Footscray Dental Studio — home"><img src="{LOGO_URL}" alt="Footscray Dental Studio" onerror="this.remove()"><span class="logo-text" aria-hidden="true">Footscray <b>Dental Studio</b></span></a>
        <p class="footer-formerly">Formerly Ezy Dental Group. Same practice, same team at 289 Barkly St, under new leadership.</p>
        <p class="newsletter-title mb-0">Sign up to our newsletter</p>
        <form class="newsletter-form" aria-label="Newsletter signup">
          <label class="skip-link" for="nl-email">Email address</label>
          <input id="nl-email" type="email" placeholder="Enter email…" autocomplete="email">
          <button type="submit" aria-label="Subscribe">→</button>
        </form>
        <a class="btn btn--gold btn--no-arrow" href="{PHONE_TEL}">{ICONS["phone"]} Call Now — {PHONE_DISPLAY}</a>
      </div>
      {col("Pages", pages)}
      {col("Services", services)}
      {col("More", more)}
    </div>
    <div class="footer-bottom">
      <p class="mb-0">© 2026 Footscray Dental Studio. All rights reserved. Opening hours: <span data-cms="hours_line">{hours_line()}</span></p>
      <ul class="footer-legal">
        <li><a href="/privacy-policy/">Privacy Policy</a></li>
        <li><a href="/terms/">Terms of Use</a></li>
        <li><a href="/sitemap/">Sitemap</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-watermark" aria-hidden="true">FOOTSCRAY</div>
</footer>
</body>
</html>
'''

# ---------------------------------------------------------------- booking form section
def booking_section(heading="Book an Appointment",
                    supporting="Booking your visit with Footscray Dental Studio is simple. Choose a time that suits you online, or give our friendly team a call — we're happy to help find an appointment that works around your schedule."):
    services_opts = "".join(f"<option>{o}</option>" for o in [
        "Check-up & Clean", "New Patient Exam & Clean", "Cosmetic Consultation",
        "Restorative Consultation", "Dental Implant Consultation", "Children's Dentistry",
        "Emergency Care", "Something else"])
    socials = "".join(
        f'<a class="social-dot" href="" data-cms-attr="href:practice.{n}" data-cms-hide-if-empty '
        f'aria-label="{n.capitalize()}" target="_blank" rel="noopener">{s}</a>'
        for n, s in SOCIAL.items())
    return f'''<section class="section section--off" id="book" aria-labelledby="booking-heading">
  <div class="container booking-split">
    <div class="reveal">
      <span class="eyebrow">Ready when you are</span>
      <h2 class="booking-title" id="booking-heading">{heading}</h2>
      <p>{supporting}</p>
      <div class="btn-row">
        <a class="btn btn--call" href="{PHONE_TEL}">{ICONS["phone"]} Call {PHONE_DISPLAY}</a>
      </div>
      <div class="social-row">{socials}</div>
    </div>
    <div class="reveal">
      <form data-validate novalidate aria-label="Appointment request form" action="/api/contact/" method="post">
        {form_hidden("appointment")}
        <div class="form-grid form-grid--2">
          <div class="field">
            <label for="bf-fname">First name <span class="req" aria-hidden="true">*</span></label>
            <input id="bf-fname" name="first-name" type="text" autocomplete="given-name" required>
            <p class="error-msg" role="alert"></p>
          </div>
          <div class="field">
            <label for="bf-lname">Last name <span class="req" aria-hidden="true">*</span></label>
            <input id="bf-lname" name="last-name" type="text" autocomplete="family-name" required>
            <p class="error-msg" role="alert"></p>
          </div>
          <div class="field">
            <label for="bf-email">Email address <span class="req" aria-hidden="true">*</span></label>
            <input id="bf-email" name="email" type="email" autocomplete="email" required>
            <p class="error-msg" role="alert"></p>
          </div>
          <div class="field">
            <label for="bf-phone">Phone number <span class="req" aria-hidden="true">*</span></label>
            <input id="bf-phone" name="phone" type="tel" autocomplete="tel" required>
            <p class="error-msg" role="alert"></p>
          </div>
          <div class="field">
            <label for="bf-service">Service type</label>
            <select id="bf-service" name="service">{services_opts}</select>
          </div>
          <div class="field">
            <label for="bf-datetime">Preferred date &amp; time</label>
            <input id="bf-datetime" name="datetime" type="datetime-local">
          </div>
          <div class="field span-2">
            <label for="bf-msg">Message</label>
            <textarea id="bf-msg" name="message" placeholder="Anything we should know?"></textarea>
          </div>
          <div class="span-2">
            <button class="btn btn--navy btn--lg btn--block" type="submit">Book an Appointment</button>
            <p class="form-note" style="margin-top:.9rem">Your information is safe with us and will only be used to arrange your appointment. For urgent bookings, call <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
            <p class="form-success" role="status" tabindex="-1">Thanks, your request has been sent. Our team will be in touch during business hours to confirm a time. For anything urgent, please call <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
            {form_error()}
          </div>
        </div>
      </form>
    </div>
  </div>
</section>
'''

def faq_section_v2(sec, bg="section--white", eyebrow_txt="Good to know", cms_key=None):
    if not sec:
        return ""
    return f'''<section class="section {bg}" aria-labelledby="faq-heading">
  <div class="container--narrow">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">{eyebrow_txt}</span>
      <h2 id="faq-heading">Frequently Asked Questions</h2>
    </div>
    <div class="reveal">{render_faq(sec, cms_key)}</div>
  </div>
</section>
'''

# ---------------------------------------------------------------- HOME
# Custom icon images supplied by the client (imgur-hosted; localise with the photo set)
ICON_URLS = {
    "general": "https://i.imgur.com/Nzqkg5r.png",
    "cosmetic": "https://i.imgur.com/xjQ0r9r.png",
    "restorative": "https://i.imgur.com/rYElnuI.png",
    "implants": "https://i.imgur.com/QlcQ5tT.png",
    "emergency": "https://i.imgur.com/8ubvVmX.png",
    # Generated to match the set (Higgsfield) — hot-linked pending localisation
    "aligners": "https://d8j0ntlcm91z4.cloudfront.net/user_3HTXPafqPwfIV3CtOfuhV1PWlEU/hf_20260911_045257_b456f464-c840-4cf9-acf1-9838329822f9.png",
}

def icon_tile(key):
    return f'<span class="icon-tile icon-tile--img"><img src="{ICON_URLS[key]}" alt="" loading="lazy" onerror="this.remove()"></span>'

# Client-supplied health fund logos (assets/img/health-funds/<slug>.png)
# Medibank 'Member's Choice Advantage' variants from the supplied pack are held back
# until the practice confirms that status.
HEALTH_FUNDS = [
    ('aami', 'AAMI'),
    ('aca-health-benefits-fund', 'ACA Health Benefits Fund'),
    ('ahm', 'AHM'),
    ('apia', 'APIA'),
    ('australian-seniors', 'Australian Seniors'),
    ('australian-unity', 'Australian Unity'),
    ('bupa', 'BUPA'),
    ('cbhs', 'CBHS'),
    ('defence-health', 'Defence Health'),
    ('doctors-health-fund', "Doctors' Health Fund"),
    ('emergency-services-health', 'Emergency Services Health'),
    ('frank', 'Frank'),
    ('gmhba', 'GMHBA'),
    ('gu-health', 'GU Health'),
    ('hbf-health-fund', 'HBF Health Fund'),
    ('hcf', 'HCF'),
    ('hicaps', 'HICAPS'),
    ('health-care-insurance', 'Health Care Insurance'),
    ('health-partners', 'Health Partners'),
    ('hunter', 'Hunter'),
    ('ing', 'ING'),
    ('latrobe-health-services', 'Latrobe Health Services'),
    ('medibank', 'Medibank'),
    ('mildura-health-fund', 'Mildura Health Fund'),
    ('nib', 'NIB'),
    ('navy-health', 'Navy Health'),
    ('nurses-midwives-health', 'Nurses & Midwives Health'),
    ('onemedifund', 'Onemedifund'),
    ('phoenix-health-fund', 'Phoenix Health Fund'),
    ('police-health', 'Police Health'),
    ('priceline', 'Priceline'),
    ('qantas', 'Qantas'),
    ('queensland-country-health-fund', 'Queensland Country Health Fund'),
    ('rbhs-health-fund', 'RBHS Health Fund'),
    ('rt-health', 'RT Health'),
    ('real-insurance', 'Real Insurance'),
    ('smile-com-au', 'Smile.com.au'),
    ('st-lukes-health', 'St. Lukes Health'),
    ('suncorp', 'Suncorp'),
    ('teacher-union-health-fund', 'Teacher Union Health Fund'),
    ('transport-health', 'Transport Health'),
    ('westfund', 'Westfund'),
]

# (name, url, icon key, optional description for cards not in the approved copy list)
HOME_SERVICE_CARDS = [
    ("General & Preventive Dentistry", "/services/general-preventive/", "general"),
    ("Cosmetic Dentistry", "/services/cosmetic/", "cosmetic"),
    # NEW — no Clear Aligners page exists yet, so this points at the Cosmetic category
    # for now and the description below is new copy awaiting client approval.
    ("Clear Aligners", "/services/cosmetic/", "aligners",
     "discreet, removable aligners that straighten teeth gradually"),
    ("Restorative Dentistry", "/services/restorative/", "restorative"),
    ("All-on-X Dental Implants", "/services/restorative/all-on-x-implants/", "implants"),
    ("Emergency Dentistry", "/services/emergency-dentistry/", "emergency"),
]

def home_v2():
    meta, sections = parse_copy("01-home-page-copy.md")
    url = "/"
    lede = get_section(sections, "__lede__")
    lede_paras = [p for t, p in lede["blocks"] if t == "p"]
    # Hero shows only the opening sentence; the rest relocates to the statement section below
    _sents = re.split(r"(?<=[.!?])\s+", lede_paras[0])
    hero_sub = _sents[0]
    statement_lead = " ".join(_sents[1:]).strip()

    avatars = "".join(img_tag(f"avatar-{i}", loading="eager") for i in range(1, 6))

    html = [head_v2(meta["title"], meta["desc"], url), header_v2(active="/")]

    # ---- HERO
    html.append(f'''<section class="hero-photo">
  {img_tag("hero-home", cls="hero-bg", loading="eager", extra='fetchpriority="high" data-cms-attr="src:home.hero_image"')}
  <div class="hero-scrim" aria-hidden="true"></div>
  <div class="container">
    <div class="hero-content">
      <div class="trust-strip">
        <div class="trust-avatars">{avatars}</div>
        <span data-cms="home.trust_line">Trusted by the Footscray community</span>
      </div>
      <h1 data-cms="home.h1">{meta["h1"]}</h1>
      <p class="hero-sub" data-cms="home.hero_intro">{md_inline(hero_sub)}</p>
      <div class="btn-row">
        <a class="btn btn--white btn--lg" href="/patient-info/">Book an Appointment</a>
        <a class="btn btn--glass btn--lg btn--no-arrow" href="{PHONE_TEL}">{ICONS["phone"]} Call {PHONE_DISPLAY}</a>
      </div>
    </div>
    <div class="hero-cards">
      <div class="stat-card reveal is-visible">
        <span class="stat-label" data-cms="home.stat_label">Experienced hands</span>
        <div class="stat-num" data-cms="home.stat_number">20+</div>
        <p data-cms="home.stat_text">Years of combined experience across general and comprehensive dental care</p>
      </div>
      <div class="chip-card reveal is-visible">
        <div class="chip-title" data-cms="home.chips_title">A modern, technology-led studio</div>
        <div class="chips" data-cms-list="home.chips">
          <span class="chip" data-cms="label">Intraoral cameras</span>
          <span class="chip" data-cms="label">Digital X-rays</span>
          <span class="chip" data-cms="label">3D digital scanner</span>
          <span class="chip" data-cms="label">OPG imaging</span>
        </div>
      </div>
    </div>
  </div>
</section>
<main id="main">
''')

    # ---- MARQUEE (client-supplied health fund logos, self-hosted in assets/img/health-funds)
    track = "".join(
        f'<span class="mark"><img src="/assets/img/health-funds/{slug}.png" alt="{name}" '
        f'loading="lazy" decoding="async" onerror="this.closest(\'.mark\').remove()"></span>'
        for slug, name in HEALTH_FUNDS * 2)
    html.append(f'''<div class="marquee-strip" aria-label="Health funds and programs">
  <p class="marquee-caption" data-cms="home.funds_caption">We accept all major health funds, with on-the-spot claiming available through HICAPS</p>
  <div class="marquee"><div class="marquee-track">{track}</div></div>
</div>
''')

    # ---- EDITORIAL STATEMENT (second lede paragraph, verbatim)
    html.append(f'''<section class="section statement-section" aria-label="Welcome statement">
  <div class="container">
    <span class="eyebrow statement-eyebrow reveal" data-cms="home.welcome_eyebrow">Welcome to Footscray Dental Studio</span>
    {f'<p class="reveal center" style="max-width:44rem;margin:0 auto 1.75rem;color:var(--text-soft)" data-cms="home.welcome_lead">{md_inline(statement_lead)}</p>' if statement_lead else ""}
    <p class="statement reveal" data-cms="home.welcome_statement">{md_inline(lede_paras[1])}</p>
    <div class="statement-floats">
      <div class="float-photo float-photo--left reveal">{img_tag("about-clinic-1", extra='data-cms-attr="src:home.float_image_1"')}</div>
      <div class="float-photo float-photo--right reveal">{img_tag("about-clinic-2", extra='data-cms-attr="src:home.float_image_2"')}</div>
    </div>
  </div>
</section>
''')

    # ---- SERVICES
    svc = get_section(sections, "Our Services")
    intro = next((p for t, p in svc["blocks"] if t == "p" and not p.startswith("**[")), "")
    items = next((p for t, p in svc["blocks"] if t == "ul"), [])
    descs = {}
    for it in items:
        m = re.match(r"^\*\*(.+?)\*\*\s*[—–-]\s*(.*)$", it)
        if m:
            name = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", m.group(1))
            descs[name] = m.group(2)
    cards = []
    for ci, entry in enumerate(HOME_SERVICE_CARDS, start=1):
        name, u, ic = entry[0], entry[1], entry[2]
        fallback = entry[3] if len(entry) > 3 else ""
        featured = " svc-card--featured" if "All-on-X" in name else ""
        btn = "btn--navy" if featured else "btn--outline"
        cards.append(f'''<article class="svc-card{featured}">
  {icon_tile(ic)}
  <h3><a href="{u}" data-cms="home.service_{ci}_title">{name}</a></h3>
  <p data-cms="home.service_{ci}_desc">{md_inline(descs.get(name, fallback))}</p>
  <span class="btn btn--sm {btn}">Learn More</span>
</article>''')
    html.append(f'''<section class="section section--white" aria-labelledby="our-services">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">What we do</span>
      <h2 id="our-services" data-cms="home.services_heading">{svc["heading"]}</h2>
      <p data-cms="home.services_intro">{md_inline(intro)}</p>
    </div>
    <div class="grid grid--3 reveal-stagger">{"".join(cards)}</div>
    <div class="btn-row reveal" style="justify-content:center"><a class="btn btn--navy" href="/services/">View All Services</a></div>
  </div>
</section>
''')

    # ---- WHY CHOOSE
    why = get_section(sections, "Why Choose Footscray Dental Studio")
    why_paras = [p for t, p in why["blocks"] if t == "p" and not p.startswith("**[")]
    tech_items = next((p for t, p in why["blocks"] if t == "ul"), [])
    tech_cards = []
    tech_icons = ["camera", "xray", "layers", "tooth", "root", "sparkle"]
    for i, it in enumerate(tech_items):
        m = re.match(r"^\*\*(.+?)\*\*\s*(—|–|-)?\s*(.*)$", it)
        name = m.group(1) if m else it
        rest = (f" {m.group(2)} " if m.group(2) else ("" if (m.group(3) or "")[:1] in ",.;:" else " ")) + m.group(3) if m else ""
        tech_cards.append(f'''<li><span class="tick">{ICONS["check"]}</span><span><strong data-cms="title">{name}</strong> <span data-cms="text">{md_inline(rest.strip())}</span></span></li>''')
    html.append(f'''<section class="section section--off" aria-labelledby="why-choose">
  <div class="container split">
    <div class="reveal">
      <span class="eyebrow">Why us</span>
      <h2 id="why-choose" data-cms="home.why_heading">{why["heading"]}</h2>
      <div data-cms="home.why_text"><p>{md_inline(why_paras[0])}</p>
      <p>{md_inline(why_paras[1])}</p></div>
      <a class="rating-badge" href="" data-cms-attr="href:practice.review_url" data-cms-hide-if-empty aria-label="Read our Google reviews" target="_blank" rel="noopener">
        <span class="g">G</span>
        <span><span class="stars" aria-hidden="true">★★★★★</span><br><span class="label" data-cms="practice.review_label">Read our Google reviews</span></span>
      </a>
    </div>
    <div class="reveal">
      <ul class="feature-list" data-cms-list="home.features">{"".join(tech_cards)}</ul>
    </div>
  </div>
</section>
''')

    # ---- COMMUNITY (split with photo)
    comm = get_section(sections, "A Practice Built on Community")
    comm_p = next((p for t, p in comm["blocks"] if t == "p"), "")
    html.append(f'''<section class="section section--white" aria-labelledby="community">
  <div class="container split">
    <div class="split-photo reveal">{img_tag("reception-welcome", extra='data-cms-attr="src:home.story_image"')}</div>
    <div class="reveal">
      <span class="eyebrow">Our story</span>
      <h2 id="community" data-cms="home.story_heading">{comm["heading"]}</h2>
      <div data-cms="home.story_text"><p>{md_inline(comm_p)}</p></div>
      <div class="btn-row"><a class="btn btn--navy" href="/about/">Learn More About Us</a></div>
    </div>
  </div>
</section>
''')

    # ---- OFFERS
    offers = get_section(sections, "Current Offers")
    offer_items = next((p for t, p in offers["blocks"] if t == "ul"), [])
    offer_cards = []
    for it in offer_items:
        m = re.match(r"^(.*?)\s*[—–]\s*(.*)$", it)
        name, price = (m.group(1), m.group(2)) if m else (it, "")
        sm = " offer-price--sm" if len(price) > 16 else ""
        offer_cards.append(f'''<article class="svc-card offer-card">
  <span class="offer-badge">Current offer</span>
  <h3><a href="/special-offers/" data-cms="title">{md_inline(name)}</a></h3>
  <span class="offer-price{sm}" data-cms="price" data-cms-hide-if-empty>{price}</span>
  <span class="btn btn--sm btn--outline">See All Offers</span>
</article>''')
    html.append(f'''<section class="section section--off" aria-labelledby="current-offers">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">Accessible care</span>
      <h2 id="current-offers" data-cms="home.offers_heading">{offers["heading"]}</h2>
    </div>
    <div class="grid grid--3 grid--n{len(offer_cards)} reveal-stagger" data-cms-list="offers">{"".join(offer_cards)}</div>
  </div>
</section>
''')

    # ---- VISITING US (info cards + full-width Google Map)
    visit = get_section(sections, "Visiting Us")
    visit_p = next((p for t, p in visit["blocks"] if t == "p"
                    and not p.startswith("**Opening Hours**") and not p.startswith("**Phone:**")), "")
    hours_rows = "".join(f'<div class="hrow"><span data-cms="days">{d}</span><span data-cms="time">{h}</span></div>' for d, h in HOURS)
    # Practice's Google Maps place (currently listed as "Ezy Dental Group - Dentist Footscray")
    map_src = "https://maps.google.com/maps?cid=14110565610442392150&output=embed"
    place_url = "https://www.google.com/maps/place/Ezy+Dental+Group+-+Dentist+Footscray/data=!4m2!3m1!1s0x0:0xc3d2cca966430256"
    html.append(f'''<section class="section section--white" aria-labelledby="visiting-us">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">Find us</span>
      <h2 id="visiting-us" data-cms="home.visit_heading">{visit["heading"]}</h2>
      <p data-cms="home.visit_intro">{md_inline(visit_p)}</p>
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
        <h3>Get in Touch</h3>
        <p><a href="{PHONE_TEL}">{PHONE_DISPLAY}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></p>
        <a class="btn btn--sm btn--navy" href="/patient-info/">Book Online</a>
      </div>
    </div>
    <div class="reveal">
      <iframe class="map-embed" src="{map_src}" title="Map — Footscray Dental Studio, {ADDRESS}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    </div>
  </div>
</section>
''')

    # ---- FAQ + BOOKING + FOOTER
    html.append(faq_section_v2(get_section(sections, "Frequently Asked Questions"), bg="section--white", cms_key="home.faq"))
    html.append(booking_section())
    html.append("</main>")
    html.append(footer_v2())
    write_page(url, "".join(html))

def write_manifest():
    lines = ["# Image Manifest — hosted Higgsfield URLs (to be localised before launch)",
             "",
             "| Key | Target local file | Used on | Hosted URL |",
             "|---|---|---|---|"]
    usage = {
        "hero-home": "Home hero", "about-clinic-1": "Home editorial (left float)",
        "about-clinic-2": "Home editorial (right float)",
        "avatar-1": "Home hero trust strip", "avatar-2": "Home hero trust strip",
        "avatar-3": "Home hero trust strip", "avatar-4": "Home hero trust strip",
        "avatar-5": "Home hero trust strip",
        "home-services-card": "Home services grid (photo card)",
        "reception-welcome": "Home community split",
    }
    for k, (u, alt, local) in IMAGES.items():
        lines.append(f"| {k} | assets/img/{local} | {usage.get(k, '')} | {u} |")
    from common import OUT
    (OUT.parent / "IMAGE-MANIFEST.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("wrote IMAGE-MANIFEST.md")

if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    home_v2()
    write_manifest()
