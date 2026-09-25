"""Privacy Policy, Terms of Use, HTML Sitemap, 404 — placeholder/utility pages."""
from common import *

FLAG = ('<div class="placeholder-flag"><strong>Placeholder for client review:</strong> '
        'this page contains general professional placeholder content only. It must be '
        'reviewed, completed and approved by the practice (and, where appropriate, its '
        'legal adviser) before the site goes live.</div>')

def prose_page(url, title, desc, h1, eyebrow, body_html, flag=True):
    html = [head(title, desc, url), header_html()]
    html.append(breadcrumbs([("Home", "/"), (h1, url)]))
    html.append(f'''<section class="hero hero--inner">
  <div class="container" style="padding-block:clamp(3rem,6vw,4.5rem)">
    <span class="eyebrow">{eyebrow}</span>
    <h1>{h1}</h1>
  </div>
</section>
<main id="main">
<section class="section section--white">
  <div class="container--narrow prose">
    {FLAG if flag else ""}
    {body_html}
  </div>
</section>
</main>
''')
    html.append(cta_banner())
    html.append(footer_html())
    write_page(url, "".join(html))

PRIVACY_BODY = f"""
<p><em>Last updated: 25 September 2026</em></p>
<h2>Our Commitment to Your Privacy</h2>
<p>Footscray Dental Studio ({ADDRESS}) is committed to protecting the privacy of our patients and website visitors. We handle personal information in accordance with the Privacy Act 1988 (Cth), the Australian Privacy Principles (APPs), and applicable health records legislation in Victoria.</p>
<h2>What Information We Collect</h2>
<p>To provide safe, appropriate dental care, we may collect personal information including your name and contact details, date of birth, Medicare and health fund details, medical and dental history, treatment records and diagnostic images, and payment information. When you use our website, we may also collect information submitted through our contact and booking forms.</p>
<h2>How We Use Your Information</h2>
<p>Your information is used to provide and manage your dental care, process claims and payments (including through HICAPS and the Child Dental Benefits Schedule where applicable), communicate with you about appointments, and meet our legal and professional obligations.</p>
<h2>Disclosure of Information</h2>
<p>We do not sell or rent personal information. Information may be shared with other health practitioners involved in your care (for example, a specialist you are referred to), with your consent, or where required by law.</p>
<h2>Storage and Security</h2>
<p>We take reasonable steps to protect personal information from misuse, interference, loss, and unauthorised access, modification or disclosure, whether held electronically or in physical records.</p>
<h2>Access and Correction</h2>
<p>You may request access to, or correction of, the personal information we hold about you by contacting us at <a href="mailto:{EMAIL}">{EMAIL}</a> or on <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
<h2>Questions or Complaints</h2>
<p>If you have a question or concern about how your information is handled, please contact the practice in the first instance. You may also contact the Office of the Australian Information Commissioner (OAIC).</p>
"""

TERMS_BODY = f"""
<p><em>Last updated: 25 September 2026</em></p>
<h2>About This Website</h2>
<p>This website is operated by Footscray Dental Studio ({ADDRESS}). By accessing or using this website, you agree to these Terms of Use.</p>
<h2>General Information Only</h2>
<p>The content on this website is provided for general information purposes only. It is not dental or medical advice and should not be relied upon as a substitute for a consultation with a registered dental practitioner. Treatment suitability, outcomes and costs vary between individuals and can only be determined following an individual assessment.</p>
<h2>Appointments and Bookings</h2>
<p>Submitting a booking or contact request through this website does not constitute a confirmed appointment until confirmed by our team. For urgent matters, please call us on <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
<h2>Intellectual Property</h2>
<p>All content on this website, including text, branding and imagery, is owned by or licensed to Footscray Dental Studio and may not be reproduced without written permission.</p>
<h2>Third-Party Links</h2>
<p>This website may contain links to third-party websites. We are not responsible for the content or privacy practices of those sites.</p>
<h2>Limitation of Liability</h2>
<p>To the extent permitted by law, Footscray Dental Studio does not accept liability for any loss arising from reliance on information published on this website. Nothing in these terms excludes rights that cannot be excluded under Australian Consumer Law.</p>
<h2>Changes to These Terms</h2>
<p>We may update these Terms of Use from time to time. Continued use of the website constitutes acceptance of the current version.</p>
<h2>Contact</h2>
<p>Questions about these terms can be directed to <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
"""

def sitemap_page():
    url = "/sitemap/"
    def li(n, u):
        return f'<li><a href="{u}">{n}</a></li>'
    gp = "".join(li(n, u) for n, u in GP_SUBS)
    cos = "".join(li(n, u) for n, u in COS_SUBS)
    res = "".join(li(n, u) for n, u in RES_SUBS)
    body = f"""
<div class="sitemap-cols">
  <div>
    <h2 style="font-size:1.3rem">Main Pages</h2>
    <ul>
      {li("Home", "/")}
      {li("About Us (incl. Meet the Team)", "/about/")}
      {li("Meet the Team", "/about/#meet-the-team")}
      {li("Book an Appointment", "/patient-info/")}
      {li("Special Offers", "/special-offers/")}
      {li("Contact Us", "/contact/")}
    </ul>
    <h2 style="font-size:1.3rem">Legal</h2>
    <ul>
      {li("Privacy Policy", "/privacy-policy/")}
      {li("Terms of Use", "/terms/")}
    </ul>
  </div>
  <div>
    <h2 style="font-size:1.3rem">Services</h2>
    <ul>
      {li("All Services", "/services/")}
      <li><a href="/services/general-preventive/">General &amp; Preventive Dentistry</a>
        <ul>{gp}</ul>
      </li>
      <li><a href="/services/cosmetic/">Cosmetic Dentistry</a>
        <ul>{cos}</ul>
      </li>
    </ul>
  </div>
  <div>
    <h2 style="font-size:1.3rem">&nbsp;</h2>
    <ul>
      <li><a href="/services/restorative/">Restorative Dentistry</a>
        <ul>{res}</ul>
      </li>
      {li("Emergency Dentistry", "/services/emergency-dentistry/")}
      {li("Children's Dentistry", "/services/childrens-dentistry/")}
    </ul>
  </div>
</div>
"""
    prose_page(url, "Sitemap | Footscray Dental Studio",
               "Browse all pages on the Footscray Dental Studio website, including our full range of dental services in Footscray.",
               "Sitemap", "Find your way", body, flag=False)

def error_404_page():
    url = "/404/"
    html = [head("Page Not Found | Footscray Dental Studio",
                 "The page you're looking for can't be found. Return to the Footscray Dental Studio homepage or book an appointment.",
                 "/404.html"), header_html()]
    html.append(f'''<main id="main">
<section class="page-404">
  <div class="container--narrow">
    <div class="code" aria-hidden="true">404</div>
    <h1>We couldn't find that page</h1>
    <p style="max-width:32rem;margin-inline:auto">The page you're after may have moved or no longer exists — but our friendly team is still right here. Head back to the homepage, browse our services, or book an appointment below.</p>
    <div class="btn-row" style="justify-content:center">
      <a class="btn btn--navy btn--lg" href="/">Back to Home</a>
      <a class="btn btn--primary btn--lg" href="/patient-info/">Book an Appointment</a>
      <a class="btn btn--outline" href="/services/">View Our Services</a>
    </div>
    <p class="small-note" style="margin-top:var(--space-4)">Need urgent help? Call us on <a href="{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
  </div>
</section>
</main>
''')
    html.append(footer_html())
    write_page(url, "".join(html))

def build_utility():
    prose_page("/privacy-policy/", "Privacy Policy | Footscray Dental Studio",
               "How Footscray Dental Studio collects, uses and protects your personal and health information.",
               "Privacy Policy", "Legal", PRIVACY_BODY)
    prose_page("/terms/", "Terms of Use | Footscray Dental Studio",
               "The terms and conditions that apply to your use of the Footscray Dental Studio website.",
               "Terms of Use", "Legal", TERMS_BODY)
    sitemap_page()
    error_404_page()
