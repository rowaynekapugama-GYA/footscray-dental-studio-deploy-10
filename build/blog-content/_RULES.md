# Blog migration writing rules — Footscray Dental Studio (read fully before writing)

You are rewriting a blog post from the old Ezy Dental Group site as Footscray Dental Studio's own content. Same practice, same address (289 Barkly St, Footscray VIC 3011), same phone ((03) 9000 0792), new name and new leadership. The goal is an SEO-safe migration: the post must keep its ranking signals while reading as fresh, first-party content.

## Output file

Write ONE file per post: /home/claude/footscray-dental-studio/build/blog-content/<slug>.md

Format — YAML frontmatter, then the body:

```
---
slug: <slug>
h1: <the H1>
title: <title tag, ending in " | Footscray Dental Studio", primary keyword near the front, max ~60 chars before the brand>
meta_description: <unique, 140-160 characters, primary keyword early, no ALL CAPS, no exclamation marks>
date_published: <the OLD post's original publish date, ISO format e.g. 2026-04-20>
date_modified: 2026-09-16
category: <General Dentistry | Cosmetic Dentistry | Restorative Dentistry | Patient Education>
outcome: <rebrand | reframe>
primary_keyword: <keyword>
excerpt: <ONE sentence, max ~160 characters, for the blog index card>
old_url: <exact old URL from the analysis file header>
old_word_count: <the analysis file's estimate, as a single number — use the midpoint of a range>
surgical_disclaimer: <true | false>
featured_image: /assets/img/blog/<slug>.webp
featured_alt: <descriptive alt text, rebranded, no "Ezy">
images:
  - old: <old wp-content URL>
    local: <slug>.webp        # the featured image maps to <slug>.webp
    alt: <alt text>
  - old: <old URL of in-content image, if any>
    local: <original basename with any -300x233 style size suffix removed>
    alt: <alt>
related: [<slug>, <slug>, <slug>]
---
<body>
```

## Body rules

- Markdown only: `##` and `###` headings, paragraphs, `-` bullet lists, `1.` numbered lists, `**bold**`, `[text](url)` links, and images as `![alt](/assets/img/blog/<local>)`. No HTML, no tables, no H1 in the body (the template renders the H1).
- KEEP the old post's heading structure broadly: same H2 topics in the same order, reworded slightly where it improves clarity. Do not delete sections. You may merge trivially thin sub-sections.
- KEEP the same topic, search intent and primary keyword. The H1 keeps the old H1's keyword focus (you may polish the wording).
- COVER every fact, cause, symptom, tip, price and statistic in the analysis file's SECTION NOTES — the new post must be at least as complete and AT LEAST as long as old_word_count. Write naturally; do not pad.
- REFRESH the wording throughout: this must read as Footscray Dental Studio's own writing, not a copy. Warm, clear, professional Australian English (colour, recognise, fibre, mum). NO em dashes anywhere — use commas, brackets or full stops instead.
- Local flavour where natural: the practice is on Barkly St in Footscray; patients come from Footscray and Melbourne's inner west (Seddon, Yarraville, West Footscray, Maribyrnong, Kingsville). Use sparingly, 1-3 mentions, never stuffed.
- Include 2-4 in-body internal links using the exact link targets given for your post, with natural anchor text. Also cross-link the related posts listed for your post where a sentence naturally allows (at minimum one in-body link to another blog post). Blog post URLs are root-relative: /<slug>/ (e.g. /tooth-pain-relief/).
- Keep any reputable EXTERNAL authority links from the analysis (healthdirect.gov.au, teeth.org.au, aihw.gov.au, betterhealth.vic.gov.au, ada.org.au) where they support a claim.
- If the old post had FAQs, include a final `## Frequently Asked Questions` section with each question as `###` and a 2-4 sentence answer. Keep the old questions (reworded only lightly). You may not invent new FAQs unless the post had none, in which case add none.
- Do NOT write a closing CTA section, a "Book Your Visit" section, a References section, or contact details — the page template appends the booking call-to-action automatically. End the body with the last content section or the FAQs.
- Every mention of the practice is "Footscray Dental Studio". The words "Ezy", "Ezy Dental", "Ezy Dental Group" must NOT appear anywhere in your file. Drop any "renovation" notices from the old content.

## Brand, offers and prices (the only practice-specific prices you may state)

- New Patient Exam & Clean: $135 (includes examination, clinical photos, intraoral scan, X-rays, scale and clean, fluoride, treatment plan). Link: /special-offers/
- Teeth whitening at the practice: from $450.
- Complimentary dental implant consultation (including All-on-X). Link: /special-offers/
- Complimentary clear aligner consultation (Invisalign, SPARK, Angel). Link: /special-offers/
- CDBS: eligible children may receive bulk-billed care under the Child Dental Benefits Schedule.
General Australian market price ranges from the old article may be kept as general information, attributed as typical Australian ranges, never as this practice's fees. Never invent fees.

## Services Footscray Dental Studio offers — the ONLY services you may present the practice as providing

Check-ups & Cleans (/services/general-preventive/check-ups-cleans/), Digital X-Rays (/services/general-preventive/digital-xrays/), Fluoride Treatments (/services/general-preventive/fluoride-treatments/), Fissure Sealants (/services/general-preventive/fissure-sealants/), Gum Disease / Periodontal Care (/services/general-preventive/gum-disease-care/), Mouthguards (/services/general-preventive/mouthguards/), Teeth Whitening (/services/cosmetic/teeth-whitening/), Porcelain Veneers (/services/cosmetic/veneers/), Composite Bonding (/services/cosmetic/composite-bonding/), Smile Makeovers (/services/cosmetic/smile-makeovers/), Fillings (/services/restorative/fillings/), Crowns & Bridges (/services/restorative/crowns-bridges/), Root Canal Therapy (/services/restorative/root-canal/), Dental Implants (/services/restorative/dental-implants/), All-on-X Dental Implants (/services/restorative/all-on-x-implants/), Dentures (/services/restorative/dentures/), Emergency Dentistry (/services/emergency-dentistry/), Children's Dentistry (/services/childrens-dentistry/). Other pages: /special-offers/, /patient-info/ (booking), /contact/, /about/, /meet-the-team/, /services/ and the category pages /services/general-preventive/, /services/cosmetic/, /services/restorative/.

NOT offered (never present these as available at the practice, in any wording): gummy smile treatment, laser dentistry, bone grafting, sinus lifts, wisdom tooth removal, orthodontics/braces, Invisalign or any aligner TREATMENT, TMD treatment, sleep apnoea treatment.

## outcome: reframe — extra rules

The post's topic is a treatment the practice does NOT provide. Keep the slug, keyword and educational value, but the post is now general patient education:
- Never say or imply "we"/"our practice" performs that treatment, offers appointments for it, or has prices for it. Phrase treatment descriptions generically: "dentists may recommend...", "this procedure is typically performed by...".
- Steer every CTA toward what IS offered: a check-up to assess the situation (/services/general-preventive/check-ups-cleans/ or the $135 offer), emergency care for pain (/services/emergency-dentistry/), gum disease care, or for aligner topics the complimentary clear aligner consultation at /special-offers/ (a consultation, never "start treatment with us").
- Do not invent referral arrangements ("we refer to trusted specialists") — at most: "your dentist can discuss the appropriate next steps".

## AHPRA compliance (all posts)

- No testimonials or reviews. No guaranteed outcomes ("will fix", "permanent results", "100%"). No misleading or exaggerated claims. No pressure or urgency tactics ("book now before...", "limited time"). Never describe treatment as "painless" or "pain-free" as a promise — say "we focus on keeping you comfortable" or "most patients report only mild discomfort". No "instant" claims. Clickbait claims from old titles must be corrected in the content (e.g. nothing kills a tooth nerve in 3 seconds — address the myth honestly while keeping the keyword).
- Individual results vary: where outcomes are discussed, note that suitability and results depend on individual assessment.
- If surgical_disclaimer is true you do NOT need to write the disclaimer — the template renders it. Just set the flag.

## Tone reference (the site's existing voice)

Professional, warm, plain-English, patient-first. Sentences of moderate length. British/Australian spelling. Confident but never salesy. Sparing bold. No emoji.
