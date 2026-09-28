# Redesign Changelog: Footscray Dental Studio (v2 "Glowdent" design language)

Content, sitemap structure, URLs, copy and internal linking are unchanged from v1.
This revision is a complete visual redesign of all 31 pages plus a real-imagery pass.

## Global design system (new `assets/css/styles.css`)
- Floating pill header detached from the top edge, sticky with shadow transition; centred nav; navy "Book an Appointment" pill (gold hover) + gold-outlined emergency "Call Now" pill; collapses to a rounded card menu on mobile
- Services dropdown rebuilt as an **image mega menu**, pill-framed category photos (client-supplied) over each column, hover zoom, gradient fallbacks. Fixed the "opens then disappears" bug (hover/click toggle conflict + hover dead-gap; clicks now only open on desktop, hover-close has a 260 ms grace period and a bridged gap)
- All buttons are pills ending in a **circular badge with a thick diagonal ↗ arrow** (client-approved style), colour-swapping on hover with a diagonal slide and a springy entrance pop
- White / off-white `#f5f5f3` alternating sections; navy reserved for feature sections, CTA moments and the footer; 20–24 px radii everywhere; scroll-reveal (fade/translate) with `prefers-reduced-motion` respected
- Marcellus display type scaled up dramatically; Poppins body/nav/buttons

## Page-level
- **Home** (approved at checkpoint): full-viewport photo hero with dark scrim, trust-avatar strip, glassy stat + tech-chip cards; health-funds marquee; editorial statement with floating photos; service card grid with client icon tiles (enlarged) and featured All-on-X card; splits; offers grid; Visiting Us as three info cards + **full-width Google Map embedded from the practice's actual Google listing**; FAQ; pre-footer booking section; hero copy trimmed to its opening sentence per client request
- **All 30 remaining pages** rebuilt on the same components: photo heroes with in-hero breadcrumb pills and glass CTAs; steps as numbered tile grids; benefits as tick lists; "Who It's Suitable For" as photo splits; FAQ accordions; related-services card grids; the two-column booking form section pre-footer on every service/about/offers page (Book & Contact carry their own full form sections); dark-navy sections for Emergency hours and Book payments/cancellations
- **Footer** on every page: three rounded contact cards (Address / Phone / Email), newsletter sign-up line, logo, three link columns mapped to the sitemap, legal row, gold "Call Now" pill, and the giant cropped **FOOTSCRAY** watermark bleeding off the bottom
- **Legal/Sitemap**: solid-navy gradient heroes; **404**: restyled to match

## Imagery
- Client-supplied (imgur): home hero, two editorial floats, story image, five service icons, four mega-menu pills
- Higgsfield-generated (hosted URLs, per earlier step): five trust avatars + services photo card
- All other pages use curated **Unsplash stock** (heroes, splits, category/hub cards, team placeholders), every image has a graceful navy-gradient fallback if it fails to load
- All imagery is hot-linked per client instruction ("download and localise at the end"), see IMAGE-MANIFEST.md for the full URL map

## QA
- 31/31 pages rebuilt, zero remnants of the v1 design (verified by class-name sweep)
- 0 dead links / 0 root-relative links (filesystem-resolved check across every href/src); one `<h1>` per page; unique titles & meta descriptions
- Copy-verbatim check at the approved baseline (only layout adaptations, e.g. link rows rendered as cards)
- Browser pass at 390 px and 1440 px on 10 representative pages: no horizontal overflow, no JS errors; mega menu, drawer, accordions and both forms tested
- Contrast: token pairs unchanged from the audited AA set; hero text sits on a 45–80 % dark scrim

## Meet the Team split out, new logo artwork
- New logo artwork wired into the header and footer of all 32 pages (hot-linked pending the localisation pass). The footer lockup reverses the same asset out to white in CSS, so one file serves both placements
- **Meet the Team is now its own page at `/meet-the-team/`**, lifted out of About Us with the three practitioner profiles, the to-be-confirmed cards and the credentials note. It carries its own hero, breadcrumbs (Home › About Us › Meet the Team) and booking section. Header, footer, sitemap page and every internal link now point at the page rather than the old `/about/#meet-the-team` anchor
- **About Us hero reduced**: the intro paragraph moved out of the hero and now opens "Our Story" below it (all four lede paragraphs together, verbatim), leaving the hero as breadcrumbs, eyebrow, heading and two CTAs. Long client headings sitewide also step down a size so a hero never fills the whole viewport
- Site is now 32 pages; deploy zip re-cut with `index.html` at the archive root

## Logo & team update
- The official logo artwork now replaces the drawn recreation in the header and footer of all 31 pages: full-colour (gold wordmark, navy lockup) on light backgrounds, and a cream-recoloured variant generated for the dark footer, both trimmed to their artwork bounds and sized to the header pill
- **Meet Our Team** rebuilt: Dr Adeela Younis, Dr. Zainab Zahid and Dr. Nikhat H. Syeda now appear as full-width profile rows (client headshot one side, name and bio the other, alternating sides, photo pinning as the longer bios scroll) with their supplied bios reproduced verbatim; Dr Alan and Dr Abu Baker remain below as two balanced to-be-confirmed cards, and the review note now flags only what is still outstanding
- `IMAGE-MANIFEST.md` extended to cover every client-supplied page photo and the three headshots, so the pre-launch localisation pass has one complete download list

## Sitewide revision, hero text & card balance
- Every hero trimmed to breadcrumbs + eyebrow + heading + one short intro sentence (≤ ~40 words) + CTAs; the hero scrim lightened to match
- All remaining hero copy relocated **verbatim** into a new split "Overview" section directly below the hero (gold eyebrow + Marcellus heading left, relocated paragraphs right); merged into existing overview-style sections where one already existed (category pages → "What to Expect…", About → "Our Story", Book → "How Booking Works" intro, home → statement lead-in); Contact's 37-word hero already complied and was left as-is
- All card grids rebalanced: equal row heights (`align-items: stretch`, flex cards, bottom-pinned CTAs), count-aware column classes so no row is left with a stranded orphan, 5-item grids render 3+2 centred at desktop, 2+2+1-centred at tablet, stacked on mobile; single related-service cards centre; steps grids are count-aware (3, 4, 5→3+2, 6→3+3, 7→4+3)

## Blog preview and card link fixes (post-migration)
- **Read Article button is now a real link.** It was rendered as a `<span>`, so it looked like a button but did nothing. It is now an `<a>` pointing at the post, and the whole card is a click target via a stretched overlay on the title link.
- Fixed the overlay stacking order: the stretched `::after` sat above the button and the card image, which swallowed clicks on both. The button and the image link now sit above it (`z-index: 2`), so every part of a card opens the post.
- **New offline preview build** (`build/make_preview.py`, output `preview/`). Deployed blog pages use clean trailing-slash URLs, which browsers cannot follow when a page is opened straight from disk. The preview copy rewrites every internal link to a relative path with an explicit `index.html`, and adds a footer banner so the two folders are never confused.
- Blog page asset paths made relative (`relativize_assets()` in `common.py`) so CSS, JS and images load in a local preview while page links stay clean for SEO.
- **Self-hosting script for the blog images** (`build/selfhost_blog_images.py`, plus a curl-only `fetch-blog-images.sh`). Both now strip the WordPress crop suffix (`-300x240`) to request the full-size original from the old media library, falling back to the crop only when the original is gone. 35 of the 67 images were linked as 300px crops on the old site. The Python version caps the long edge at 1600px, re-encodes to WebP q82, keeps the smaller of the two, and writes a per-file CSV report.
- Post images now carry intrinsic `width`/`height` attributes (read from the file at build time) to eliminate layout shift, and any image narrower than 600px renders centred at its own size instead of being upscaled across the column.
- **Blog images self-hosted.** 59 images recovered from the old WordPress media library and installed; 8 that the old site had lost replaced with newly generated editorial photographs. No blog image hot-links to an external server any more. Provenance recorded in BLOG-IMAGE-CREDITS.md.
- Three of the replaced images were clinical close-ups on the old site (advanced decay, gum recession, cavity pain). These were deliberately not recreated: a generated close-up of a diseased mouth is a fabricated clinical image and reads as a real patient, which is an AHPRA advertising risk. Generic consultation and lifestyle scenes were used instead, and the alt text on those posts rewritten to match.
- All 199 blog `<img>` tags now carry intrinsic width and height, eliminating layout shift.
- All 8 generated replacements now installed and self-hosted (1024x688 WebP, 23-45 KB each). No placeholders remain: 67 of 67 blog images are real, and the whole blog image set is 2.0 MB.

## 3.0.0 (25 September 2026): the GYA dashboard

- Added the client dashboard at /admin (Payload CMS on Neon Postgres and Vercel Blob), the same as the Coastal Dental and Cronulla builds. Pages, blog posts, team, special offers, media library, enquiries, redirects, users, site settings.
- The live site is unchanged: same HTML, URLs, CSS, meta and schema. Proven by a byte comparison of every generated page against the launch build and a pixel diff at 1280 and 390.
- Every body section on the service, category, hub, emergency, book and about pages is now editable (heading, rich text, photo), plus every FAQ and every page's SEO fields.
- Blog posts are edited in the dashboard; the 32 launch articles were imported with their images. The blog is rendered by build/blog.mjs, a port of blog.py that reproduces its output exactly.
- Forms unchanged for visitors; each enquiry is now also stored in the dashboard.
- Fixed a raw markdown link on the Special Offers page ("[All-on-X](...)" now renders as a link).
- Dashboard in the practice's branding: the real logo on the sign-in screen, the arch mark as the icon, navy pill buttons, gold accents, Marcellus headings and Poppins text, the site's off-white ground.
- A malformed BLOB_READ_WRITE_TOKEN (quotes, the name pasted in front, or the wrong value) no longer stops the dashboard: quotes and the name are stripped, and anything still unusable switches photo uploads off with a message on the dashboard saying what is wrong.
- Preview deployments need no per-branch address setting: the dashboard's API calls are relative on previews.
- Removed the interim JSON-on-GitHub admin panel (api/admin, admin/) and its environment variables.

## 3.1.0 (26 September 2026): visual dashboard, same as Coastal Dental

- /admin is now a visual editor in the Coastal Dental layout: dark menu on the left (Pages, Blog posts, Team, Special offers, Practice details, Enquiries, Settings, Signed in as, Sign out), and a page editor that shows the real page. Click any text to edit it in place, click any photo to replace it, Desktop and Mobile preview, Save changes.
- Right-hand panel on every page: Content (every photo on the page with its alt text and a Replace button), SEO (title, description with character counts and a Google preview, sharing image, hide from Google, restore launch wording) and Sections (drag to reorder, hide or show).
- Blog editor with a toolbar (headings, bold, italic, links, lists, quotes, photos), featured image, summary, category, date, web address, SEO fields and the surgical procedure note. Save draft, Publish, Unpublish, Delete.
- Team, Special offers and Practice details (phone, email, address, maps link, hours, announcement bar, reviews link, socials) as simple forms. Enquiries list with Followed up. Settings: update the website now, change password, add editors, redirects.
- Saving updates the website by itself; there is no separate Publish step.
- Page content now lives in one database document (site-content) keyed like the page markers, with the last 25 saves kept as versions GYA can restore from /cms.
- The Payload admin moved to /cms (GYA only). Blocked in robots.txt and noindex.
- The live site is unchanged. Tested: a text edit, a photo swap with new alt text, a new SEO title and a hidden section on the About page each came through in the published HTML and nothing else changed; restoring the content gave back byte-identical pages.
- Safety: until the 32 launch articles have been imported (the first import waits for a working Blob token), a build keeps the committed blog instead of the empty database, so an early save can never empty the live blog. The Blog posts screen says so and hides New post until then.
- ADMIN_EMAIL / ADMIN_PASSWORD now create that login on the next build whenever no account has that email yet (previously only when there were no users at all). Existing accounts are never changed.
- Sign-in rescue: signing in with exactly ADMIN_EMAIL and ADMIN_PASSWORD (as set in Vercel) now always works, even if the build did not create the account: the account is created, or its password reset to ADMIN_PASSWORD and any lockout cleared. Deleting ADMIN_PASSWORD in Vercel turns this off.

## 3.1.1 (28 September 2026): client corrections

- Phone number is now (03) 7044 7722 (tel:+61370447722) everywhere: header and footer Call buttons, contact cards, emergency banner and text, FAQ answers, blog pages, the enquiry auto-reply, and the Dentist structured data. The generators (build/common.py, glow.py, blog.mjs), build defaults, lib/config.cjs, content/schema.json and the copy docs are updated too; a sweep for "9000 0792" and "390000792" finds nothing.
- Opening hours: Tuesday is now 9:00am to 6:00pm. Hours are five rows (Monday; Tuesday; Wednesday to Friday; Saturday; Sunday by appointment) on the homepage, contact and emergency pages. The footer line uses short day names so it stays on one line on desktop. The structured data gives Tuesday its own entry closing 18:00, both in the generator and from lib/content.cjs hoursToSpec().
- Google Map: the homepage and contact page embed the Footscray Dental Studio listing (standard map, AU locale) in place of the old Ezy Dental Group one; iframe classes and lazy loading unchanged. Every Get Directions link and the footer address link go to the new listing. The structured data gains hasMap for the listing and its coordinates (-37.7993294, 144.8944961).
- Content already saved in the database gets the same three corrections on the next build (cms/fixes.ts, run by bootstrap, safe to run repeatedly), so the dashboard and the live pages agree.
- Blog posts screen: when the launch articles are not in the dashboard yet, an admin can press "Load the 32 articles now". It copies the 67 article photos to Blob, the 32 articles and the pages into the database in steps of about 40 seconds with progress shown, then starts a website update. Safe to press again; finished items are skipped. Any photo storage error is shown on screen instead of only in the build log. Tested from an empty database: 67 photos, 32 articles, and the pulled blog is byte-identical to the committed one.
- The import finds the project files inside the deployed dashboard (it used to look for them next to its own compiled file), and the dashboard's function now ships the blog photos and article sources it needs.
- Bootstrap carries on to the import even if creating the admin login fails.
- Fix: on Vercel the photo library query asked for a "_objectkey" column the database did not have (the Blob storage plugin adds it only when Blob is configured, and the migrations were generated without Blob). The storage fields are now always part of the schema, and migration 20260928_012131_blob_storage_fields adds "_objectkey" and "prefix" to the media table on the next build. This also fixes the photo picker and uploads.
