"""Shared constants, chrome (header/footer), markdown parsing and render helpers."""
import re
from pathlib import Path

COPY_DIR = Path("/home/claude/fds-extract/footscray-dental-studio-website-copy")
OUT = Path("/home/claude/footscray-dental-studio/site")

PHONE_DISPLAY = "(03) 9000 0792"
PHONE_TEL = "tel:+61390000792"
EMAIL = "info@footscraydentalstudio.com.au"
ADDRESS = "289 Barkly St, Footscray VIC 3011"
MAPS_URL = "https://www.google.com/maps/search/?api=1&query=289+Barkly+St+Footscray+VIC+3011"
SITE_NAME = "Footscray Dental Studio"

HOURS = [("Monday–Friday", "9:00am–5:00pm"), ("Saturday", "9:00am–3:00pm"), ("Sunday", "By appointment only")]

def hours_line():
    """One-line opening hours for the footer, e.g. 'Mon–Fri 9:00am–5:00pm · Sat …'."""
    return " · ".join(f"{d} {h}" for d, h in HOURS)


def form_hidden(form_type):
    """Hidden fields every form posts to /api/contact/.

    - form_type tells the API which template to use
    - ts is filled by main.js with the page-load time; a submit under 3 s is a bot
    - website is a honeypot: humans never see it, bots fill it, the API drops those
    """
    return (f'<input type="hidden" name="form_type" value="{form_type}">'
            f'<input type="hidden" name="ts" value="">'
            f'<div class="hp" aria-hidden="true"><label for="{form_type}-website">Website</label>'
            f'<input id="{form_type}-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>')


def form_error(phone=None):
    phone = phone or PHONE_DISPLAY
    return (f'<p class="form-error" role="alert" tabindex="-1">Sorry, that did not send. '
            f'Please try again in a moment, or call us on <a href="{PHONE_TEL}">{phone}</a>.</p>')


# ---------------------------------------------------------------- inline SVG icons
ICONS = {
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>',
    "calendar": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    "clock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    "plus": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    "caret": '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 7.5h9M16.5 7.5v9M16.5 7.5l-9 9"/></svg>',
    "alert": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    "star": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    "tooth": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.5C10.5 4 8.7 3 7 3 4.2 3 2.5 5.2 2.5 8c0 4.5 2 6 2.6 9.5.3 1.9.9 3.5 2.2 3.5 2.2 0 1.4-5 4.7-5s2.5 5 4.7 5c1.3 0 1.9-1.6 2.2-3.5.6-3.5 2.6-5 2.6-9.5 0-2.8-1.7-5-4.5-5-1.7 0-3.5 1-5 2.5z"/></svg>',
    "sparkle": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
    "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    "smile": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>',
    "camera": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="4"/></svg>',
    "xray": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 7v10M8 9h8M9 12h6M10 15h4"/></svg>',
    "drop": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.7 6.6 8.8a7 7 0 1 0 10.8 0z"/></svg>',
    "layers": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 10 5.5L12 13 2 7.5z"/><path d="m2 12.5 10 5.5 10-5.5"/><path d="m2 17.5 10 5.5 10-5.5" opacity=".4"/></svg>',
    "heart": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7z"/></svg>',
    "guard": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8c0-2 1.5-4 4-4h8c2.5 0 4 2 4 4s-1 4.5-2 7c-.8 2-1.5 5-3 5s-1.5-2.5-3-2.5S10.5 20 9 20s-2.2-3-3-5C5 12.5 4 10 4 8z"/></svg>',
    "crown": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 7 4 4 5-6 5 6 4-4-1.5 11h-15z"/><path d="M5.5 21h13"/></svg>',
    "root": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.5C10.5 4 8.7 3 7 3 4.2 3 2.5 5.2 2.5 8c0 4.5 2 6 2.6 9.5.3 1.9.9 3.5 2.2 3.5 2.2 0 1.4-5 4.7-5s2.5 5 4.7 5c1.3 0 1.9-1.6 2.2-3.5.6-3.5 2.6-5 2.6-9.5 0-2.8-1.7-5-4.5-5-1.7 0-3.5 1-5 2.5z"/><path d="M12 10v8" opacity=".7"/></svg>',
    "implant": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l-1 5H9zM9.5 8h5l-.6 3h-3.8z"/><path d="M10.4 11 11 21h2l.6-10M9.8 13.5h4.4M10 16h4M10.3 18.5h3.4"/></svg>',
    "denture": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 16 0v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M8 12v3M12 11v4M16 12v3"/></svg>',
    "child": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M9 8h.01M15 8h.01M10 10.5s.8 1 2 1 2-1 2-1"/><path d="M5 21c0-3.9 3.1-6 7-6s7 2.1 7 6"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "team": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    "dollar": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.5c0 3.5 6 1.5 6 5 0 1.4-1.3 2.5-3 2.5s-3-1.1-3-2.5"/></svg>',
}

def icon(name):
    return ICONS[name]

# ---------------------------------------------------------------- logo
def logo_svg(variant="light", h=None):
    """Logo lockup. variant 'light' = for light backgrounds (navy text),
    'dark' = for navy backgrounds (white text)."""
    text2 = "#fffdf9" if variant == "dark" else "#2d4459"
    line = "#fffdf9" if variant == "dark" else "#2d4459"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 170" role="img" aria-label="Footscray Dental Studio logo">
  <g fill="none" stroke="{line}" stroke-width="3">
    <path d="M14 156 V78 a64 64 0 0 1 128 0 v78 z" stroke-linejoin="round"/>
    <path d="M24 156 V78 a54 54 0 0 1 108 0 v78" opacity=".85"/>
    <path d="M14 96 h-6 M142 96 h6" stroke-width="2.4"/>
    <circle cx="8" cy="104" r="1.6" fill="{line}" stroke="none"/><circle cx="148" cy="104" r="1.6" fill="{line}" stroke="none"/>
  </g>
  <g fill="none" stroke="{line}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M78 46 c-9-8-20-11-28-6-9 6-11 19-8 30 3 12 9 18 11 30 2 11 3 26 10 27 8 1 6-17 15-17 8 0 7 8 8 12"/>
    <path d="M78 46 c9-8 20-11 28-6 9 6 11 19 8 30-2 8-6 14-8 22"/>
    <path d="M64 45 c-6 0-11 4-12 10" stroke-width="2.2" opacity=".8"/>
  </g>
  <g fill="none" stroke="#bd995e" stroke-width="3.2" stroke-linecap="round">
    <path d="M96 96 q10 4 20 0"/>
    <path d="M98 106 q9 4 17 0"/>
    <path d="M100 116 q8 4 14 0"/>
    <path d="M102 126 q6 3.5 10 0"/>
    <path d="M104 135 q4 3 7 0"/>
  </g>
  <text x="182" y="76" font-family="Marcellus, Georgia, serif" font-size="52" letter-spacing="16" fill="#bd995e">FOOTSCRAY</text>
  <text x="182" y="140" font-family="Marcellus, Georgia, serif" font-size="46" letter-spacing="9" fill="{text2}">DENTAL STUDIO</text>
</svg>'''

FAVICON_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2d4459"/>
  <path d="M12 56 V30 a20 20 0 0 1 40 0 v26 z" fill="none" stroke="#faf7f1" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M32 21 c-3.5-3-8-4-11-2-3.5 2.3-4 7-3 11 1.2 4.5 3.4 6.8 4.2 11 .7 4 1 9 3.6 9.4 3 .4 2.2-6.3 5.2-6.3 2.8 0 2.4 6.7 5.4 6.3 2.6-.4 3-5.4 3.6-9.4.8-4.2 3-6.5 4.2-11 1-4 .5-8.7-3-11-3-2-7.5-1-11 2z" fill="none" stroke="#faf7f1" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M38 36 q3 1.4 6 0 M39 41 q2.6 1.3 4.6 0 M40 46 q2 1.2 3 0" fill="none" stroke="#bd995e" stroke-width="2" stroke-linecap="round"/>
</svg>'''

# ---------------------------------------------------------------- nav data
GP_SUBS = [
    ("Check-ups & Cleans", "/services/general-preventive/check-ups-cleans/"),
    ("Digital X-Rays / Diagnostics", "/services/general-preventive/digital-xrays/"),
    ("Fluoride Treatments", "/services/general-preventive/fluoride-treatments/"),
    ("Fissure Sealants", "/services/general-preventive/fissure-sealants/"),
    ("Gum Disease / Periodontal Care", "/services/general-preventive/gum-disease-care/"),
    ("Mouthguards", "/services/general-preventive/mouthguards/"),
]
COS_SUBS = [
    ("Teeth Whitening", "/services/cosmetic/teeth-whitening/"),
    ("Porcelain Veneers", "/services/cosmetic/veneers/"),
    ("Composite Bonding", "/services/cosmetic/composite-bonding/"),
    ("Smile Makeovers", "/services/cosmetic/smile-makeovers/"),
]
RES_SUBS = [
    ("Fillings", "/services/restorative/fillings/"),
    ("Crowns & Bridges", "/services/restorative/crowns-bridges/"),
    ("Root Canal Therapy", "/services/restorative/root-canal/"),
    ("Dental Implants", "/services/restorative/dental-implants/"),
    ("All-on-X Dental Implants", "/services/restorative/all-on-x-implants/"),
    ("Dentures (Full & Partial)", "/services/restorative/dentures/"),
]

# ---------------------------------------------------------------- chrome
def head(title, desc, url):
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
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
'''

def _mega_col(title, url, subs):
    lis = "\n".join(f'<li><a class="sub" href="{u}">{n}</a></li>' for n, u in subs)
    return f'''<div class="mega-col">
  <h3><a href="{url}">{title}</a></h3>
  <ul>{lis}</ul>
</div>'''

def header_html(active=""):
    def cur(path):
        return ' aria-current="page"' if active == path else ""
    mega = f'''<div class="mega" id="services-mega">
  {_mega_col("General &amp; Preventive", "/services/general-preventive/", GP_SUBS)}
  {_mega_col("Cosmetic", "/services/cosmetic/", COS_SUBS)}
  {_mega_col("Restorative", "/services/restorative/", RES_SUBS)}
  <div class="mega-col mega-featured">
    <h3>More Care</h3>
    <ul>
      <li><a class="sub" href="/services/emergency-dentistry/">Emergency Dentistry</a></li>
      <li><a class="sub" href="/services/childrens-dentistry/">Children's Dentistry</a></li>
    </ul>
    <p class="mega-note">Prompt care when you need it most, and gentle visits for the little ones.</p>
    <a class="text-link mega-view-all" href="/services/" style="color:var(--gold-light)">View all services</a>
  </div>
</div>'''
    return f'''<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="/" aria-label="Footscray Dental Studio — home" style="color:var(--navy)">{logo_svg("light")}</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Toggle menu">
      <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
    <nav class="main-nav" id="main-nav" aria-label="Main navigation">
      <ul>
        <li><a class="nav-link" href="/"{cur("/")}>Home</a></li>
        <li><a class="nav-link" href="/about/"{cur("/about/")}>About</a></li>
        <li><a class="nav-link" href="/about/#meet-the-team">Meet the Team</a></li>
        <li class="has-mega">
          <button class="nav-link" type="button" aria-expanded="false" aria-controls="services-mega">Services {ICONS["caret"]}</button>
          {mega}
        </li>
        <li><a class="nav-link" href="/special-offers/"{cur("/special-offers/")}>Special Offers</a></li>
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
    </div>
  </div>
</header>
'''

def breadcrumbs(trail):
    """trail: list of (label, url); last item is current page (url ignored)."""
    items = []
    for i, (label, url) in enumerate(trail):
        if i == len(trail) - 1:
            items.append(f'<li><span aria-current="page">{label}</span></li>')
        else:
            items.append(f'<li><a href="{url}">{label}</a></li>')
    return f'''<nav class="breadcrumbs" aria-label="Breadcrumb">
  <div class="container"><ol>{"".join(items)}</ol></div>
</nav>
'''

def cta_banner(heading="Ready to book your visit?",
               text="Book online or call our friendly team — we're happy to help find a time that suits you.",
               primary=("Book an Appointment", "/patient-info/"),
               secondary=("Call " + PHONE_DISPLAY, PHONE_TEL)):
    return f'''<section class="cta-banner">
  <div class="container cta-banner-inner reveal">
    <div>
      <h2>{heading}</h2>
      <p>{text}</p>
    </div>
    <div class="btn-row mt-0">
      <a class="btn btn--primary btn--lg" href="{primary[1]}">{primary[0]}</a>
      <a class="btn btn--outline-light btn--lg" href="{secondary[1]}">{ICONS["phone"]} {secondary[0]}</a>
    </div>
  </div>
</section>
'''

def footer_html():
    quick = [("Home", "/"), ("About Us", "/about/"), ("Meet the Team", "/about/#meet-the-team"),
             ("Special Offers", "/special-offers/"), ("Book an Appointment", "/patient-info/"),
             ("Contact Us", "/contact/")]
    services = [("All Services", "/services/"),
                ("General & Preventive", "/services/general-preventive/"),
                ("Cosmetic Dentistry", "/services/cosmetic/"),
                ("Restorative Dentistry", "/services/restorative/"),
                ("Dental Implants", "/services/restorative/dental-implants/"),
                ("All-on-X Dental Implants", "/services/restorative/all-on-x-implants/"),
                ("Emergency Dentistry", "/services/emergency-dentistry/"),
                ("Children's Dentistry", "/services/childrens-dentistry/")]
    quick_lis = "\n".join(f'<li><a href="{u}">{n}</a></li>' for n, u in quick)
    serv_lis = "\n".join(f'<li><a href="{u}">{n}</a></li>' for n, u in services)
    hours_rows = "\n".join(f"<tr><td>{d}</td><td>{h}</td></tr>" for d, h in HOURS)
    year = 2026
    return f'''<footer class="site-footer">
  <div class="container">
    <div class="footer-main">
      <div class="footer-brand">
        <a class="logo" href="/" aria-label="Footscray Dental Studio — home" style="color:#fffdf9">{logo_svg("dark")}</a>
        <p>Modern dentistry with personalised care, in the heart of the Footscray community.</p>
        <a class="btn btn--primary" href="{PHONE_TEL}">{ICONS["phone"]} Call Now — {PHONE_DISPLAY}</a>
      </div>
      <div>
        <h3>Quick Links</h3>
        <ul>{quick_lis}</ul>
      </div>
      <div>
        <h3>Our Services</h3>
        <ul>{serv_lis}</ul>
      </div>
      <div class="footer-contact">
        <h3>Visit Us</h3>
        <ul>
          <li>{ICONS["pin"]}<span><a href="{MAPS_URL}" rel="noopener">{ADDRESS}</a></span></li>
          <li>{ICONS["phone"]}<span><a href="{PHONE_TEL}">{PHONE_DISPLAY}</a></span></li>
          <li>{ICONS["mail"]}<span><a href="mailto:{EMAIL}">{EMAIL}</a></span></li>
        </ul>
        <h3 style="margin-top:1.5rem">Opening Hours</h3>
        <table class="footer-hours"><tbody>{hours_rows}</tbody></table>
        <p class="small-note" style="color:var(--text-on-navy-soft);margin-top:.6rem">Hours to be confirmed at launch.</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="mb-0">© {year} Footscray Dental Studio. All rights reserved.</p>
      <ul class="footer-legal">
        <li><a href="/privacy-policy/">Privacy Policy</a></li>
        <li><a href="/terms/">Terms of Use</a></li>
        <li><a href="/sitemap/">Sitemap</a></li>
      </ul>
    </div>
  </div>
</footer>
</body>
</html>
'''

# ---------------------------------------------------------------- markdown parsing
BOLD_LINK_RE = re.compile(r"^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*$")
CTA_RE = re.compile(r"\*\*\[([^\]]+?)\](?:\(([^)]+)\))?\*\*")

def md_inline(text):
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", text)
    return text

def cta_href(label):
    l = label.lower()
    if "call" in l:
        return PHONE_TEL
    if "contact us" in l:
        return "/contact/"
    if "view all services" in l:
        return "/services/"
    if "learn more about us" in l:
        return "/about/"
    if "see all offers" in l:
        return "/special-offers/"
    if "get directions" in l:
        return MAPS_URL
    if "emergency dentistry info" in l:
        return "/services/emergency-dentistry/"
    if "enquire" in l:
        return "/contact/"
    if l.startswith("explore") or l.startswith("learn about"):
        return None  # resolved by page context
    return "/patient-info/"  # all booking-style CTAs

def is_cta_line(line):
    s = line.strip()
    if not s.startswith("**[") or not s.endswith("]**") and not s.endswith(")**"):
        return False
    stripped = re.sub(CTA_RE, "", s).strip()
    return stripped == "" and CTA_RE.search(s)

def parse_ctas(line):
    return [(m.group(1), m.group(2)) for m in CTA_RE.finditer(line)]

def parse_copy(fname):
    """Parse a copy markdown file into meta + ordered sections of typed blocks."""
    raw = (COPY_DIR / fname).read_text(encoding="utf-8")
    # Drop internal notes
    raw = re.split(r"^### Notes for review\s*$", raw, flags=re.M)[0]
    lines = raw.splitlines()

    meta = {"title": "", "desc": "", "h1": "", "url": ""}
    sections = []   # {heading, level, blocks:[(type, payload)]}
    current = None
    blocks = None
    para = []

    def flush_para():
        nonlocal para
        if para:
            blocks.append(("p", " ".join(para)))
            para = []

    def new_section(heading, level):
        nonlocal current, blocks
        current = {"heading": heading, "level": level, "blocks": []}
        sections.append(current)
        blocks = current["blocks"]

    new_section("__intro__", 0)

    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        s = line.strip()
        if s.startswith("# ") and not meta.get("_h1seen"):
            i += 1
            continue
        m = re.match(r"^\*\*URL:\*\*\s*(\S+)", s)
        if m:
            meta["url"] = m.group(1)
            i += 1
            continue
        m = re.match(r"^\*\*SEO Title Tag:\*\*\s*(.+)$", s)
        if m:
            meta["title"] = m.group(1).strip()
            i += 1
            continue
        m = re.match(r"^\*\*Meta Description:\*\*\s*(.+)$", s)
        if m:
            meta["desc"] = m.group(1).strip()
            i += 1
            continue
        if re.match(r"^\*\*Breadcrumb:\*\*", s):
            i += 1
            continue
        if s == "---":
            flush_para()
            i += 1
            continue
        m = re.match(r"^(#{2,3})\s+(.*)$", s)
        if m:
            flush_para()
            heading = m.group(2).strip()
            hm = re.match(r"^H1:\s*(.*)$", heading)
            if hm:
                meta["h1"] = hm.group(1).strip()
                meta["_h1seen"] = True
                new_section("__lede__", 1)
            else:
                new_section(heading, len(m.group(1)))
            i += 1
            continue
        if not s:
            flush_para()
            i += 1
            continue
        if is_cta_line(s):
            flush_para()
            blocks.append(("cta", parse_ctas(s)))
            i += 1
            continue
        m = re.match(r"^(\d+)\.\s+(.*)$", s)
        if m:
            flush_para()
            items = []
            while i < len(lines):
                s2 = lines[i].strip()
                m2 = re.match(r"^(\d+)\.\s+(.*)$", s2)
                if m2:
                    items.append(m2.group(2))
                    i += 1
                elif s2 and not s2.startswith(("-", "#", "**[")) and items:
                    items[-1] += " " + s2
                    i += 1
                else:
                    break
            blocks.append(("ol", items))
            continue
        if s.startswith("- "):
            flush_para()
            items = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                items.append(lines[i].strip()[2:])
                i += 1
            blocks.append(("ul", items))
            continue
        if re.match(r"^\*[^*].*\*$", s) and "**" not in s:
            flush_para()
            blocks.append(("note", s.strip("*").strip()))
            i += 1
            continue
        para.append(s)
        i += 1
    flush_para()
    sections = [sec for sec in sections if sec["blocks"] or sec["heading"] not in ("__intro__",)]
    return meta, sections

def get_section(sections, name):
    for sec in sections:
        if sec["heading"].lower().startswith(name.lower()):
            return sec
    return None

# ---------------------------------------------------------------- block renderers
def render_cta_row(ctas, style_map=None, context_href=None, large=False):
    out = []
    for idx, (label, href) in enumerate(ctas):
        target = href or cta_href(label) or context_href or "/patient-info/"
        cls = "btn--navy" if idx == 0 else "btn--outline"
        if style_map:
            cls = style_map(idx, label)
        size = " btn--lg" if large else ""
        ic = ICONS["phone"] + " " if "call" in label.lower() else ""
        out.append(f'<a class="btn {cls}{size}" href="{target}">{ic}{md_inline_label(label)}</a>')
    return '<div class="btn-row">' + "".join(out) + "</div>"

def md_inline_label(label):
    return re.sub(r"\*", "", label)

def render_checklist(items, two_col=True):
    cls = "feature-list feature-list--2col" if two_col and len(items) > 3 else "feature-list"
    lis = "\n".join(
        f'<li><span class="tick">{ICONS["check"]}</span><span>{md_inline(i)}</span></li>' for i in items)
    return f'<ul class="{cls}">{lis}</ul>'

def render_steps(items, grid=False):
    cls = f"steps steps--grid steps--n{len(items)}" if grid else "steps"
    lis = []
    for it in items:
        m = re.match(r"^\*\*(.+?)\*\*\s*(—|–|-)?\s*(.*)$", it)
        if m:
            sep = f" {m.group(2)} " if m.group(2) else " "
            lis.append(f"<li><strong>{md_inline(m.group(1))}</strong>{sep}{md_inline(m.group(3))}</li>")
        else:
            lis.append(f"<li>{md_inline(it)}</li>")
    return f'<ol class="{cls}">{"".join(lis)}</ol>'

def render_faq(sec, cms_key=None):
    """FAQ blocks arrive as paragraphs: '**Q?** A...' pairs or q-para/a-para pairs.

    cms_key marks the list for the admin panel (see build/apply-content.js)."""
    items = []
    q, a = None, []
    for btype, payload in sec["blocks"]:
        if btype != "p":
            continue
        m = re.match(r"^\*\*(.+?)\*\*\s*(.*)$", payload)
        if m:
            if q:
                items.append((q, a))
            q, a = m.group(1), ([m.group(2)] if m.group(2) else [])
        elif q is not None:
            a.append(payload)
    if q:
        items.append((q, a))
    faqs = []
    for idx, (question, answer_paras) in enumerate(items):
        faqs.append(f'''<div class="faq-item">
  <h3 class="mb-0"><button class="faq-q" aria-expanded="false"><span data-cms="q">{md_inline(question)}</span><span class="faq-icon">{ICONS["plus"]}</span></button></h3>
  <div class="faq-a" aria-hidden="true"><div data-cms="a">{"".join(f"<p>{md_inline(x)}</p>" for x in answer_paras)}</div></div>
</div>''')
    mark = f' data-cms-list="{cms_key}"' if cms_key else ""
    return f'<div class="faq"{mark}>' + "\n".join(faqs) + "</div>"

def faq_section(sec, eyebrow_txt="Good to know"):
    if not sec:
        return ""
    return f'''<section class="section section--cream2" aria-labelledby="faq-heading">
  <div class="container--narrow">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">{eyebrow_txt}</span>
      <h2 id="faq-heading">Frequently Asked Questions</h2>
    </div>
    <div class="reveal">{render_faq(sec)}</div>
  </div>
</section>
'''

def related_section(sec):
    if not sec:
        return ""
    links = []
    for btype, payload in sec["blocks"]:
        if btype == "p":
            for m in re.finditer(r"\[([^\]]+)\]\(([^)]+)\)", payload):
                links.append((m.group(1), m.group(2)))
    if not links:
        return ""
    cards = "\n".join(f'''<article class="card">
  <span class="card-icon">{ICONS["tooth"]}</span>
  <h3><a href="{u}">{n}</a></h3>
  <span class="text-link">Learn more</span>
</article>''' for n, u in links)
    n = min(len(links), 4)
    return f'''<section class="section section--white" aria-label="Related services">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Keep exploring</span>
      <h2>Related Services</h2>
    </div>
    <div class="grid grid--{n if n in (2,3,4) else 3} reveal-stagger">{cards}</div>
  </div>
</section>
'''

def img_placeholder(label, light=False, tall=False, extra=""):
    cls = "img-ph" + (" img-ph--light" if light else "") + (" img-ph--tall" if tall else "")
    return f'<div class="{cls}" role="img" aria-label="Placeholder: {label}" {extra}><span class="ph-label">{label}</span></div>'

def relativize(html, url):
    """Rewrite root-relative hrefs/srcs to relative paths (with explicit index.html)
    so the site works both on a server AND opened directly from disk (file://).
    Canonical/OG URLs are full https:// URLs and are untouched."""
    depth = 0 if url in ("/", "/404/") else len(url.strip("/").split("/"))
    prefix = "../" * depth

    def repl(m):
        attr, path = m.group(1), m.group(2)
        base, _, frag = path.partition("#")
        frag = ("#" + frag) if frag else ""
        if base == "/":
            target = prefix + "index.html"
        elif base.endswith("/"):
            target = prefix + base.strip("/") + "/index.html"
        else:
            target = prefix + base.lstrip("/")
        return f'{attr}="{target}{frag}"'

    return re.sub(r'(href|src)="(/[^"]*)"', repl, html)

def relativize_assets(html, url):
    """Rewrite only STATIC ASSET paths (/assets/..., /favicon.svg) to relative ones.

    Page links are left as clean root-relative trailing-slash URLs, which is what the
    blog needs for SEO. Making the asset paths relative as well means a blog page still
    renders with full styling and images when opened straight from disk (file://),
    and behaves identically once deployed."""
    depth = 0 if url in ("/", "/404/") else len(url.strip("/").split("/"))
    prefix = "../" * depth

    def repl(m):
        attr, path = m.group(1), m.group(2)
        return f'{attr}="{prefix}{path.lstrip("/")}"'

    return re.sub(r'(href|src)="(/(?:assets/|favicon\.svg)[^"]*)"', repl, html)


def write_page(url, html, clean_urls=False):
    """clean_urls=True keeps internal page links as clean root-relative trailing-slash
    URLs (no /index.html), while still making asset paths relative so the page previews
    correctly from disk. Used for blog pages, where crawlable clean URLs matter for SEO."""
    if url == "/404/":
        path = OUT / "404.html"
    else:
        path = OUT / url.strip("/") / "index.html" if url != "/" else OUT / "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    out = relativize_assets(html, url) if clean_urls else relativize(html, url)
    path.write_text(out, encoding="utf-8")
    print("wrote", path.relative_to(OUT))
