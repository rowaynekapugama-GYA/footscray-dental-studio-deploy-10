# Rebrand SEO checklist

Ezy Dental Group (ezydentalgroup.com.au) to Footscray Dental Studio
(www.footscraydentalstudio.com.au)

A domain change is the single highest-risk thing you can do to an established
site's rankings. Done properly it usually costs a few weeks of volatility and
recovers. Done with the redirects missing, it loses most of the accumulated
authority permanently, because there is nothing telling Google the two sites are
the same business.

This is split into what is already built, the one decision that has to be made
before go-live, and what only the team can do.

---

## Already handled in the build

Nothing on this list needs doing again. It is here so the team knows what is
covered and does not duplicate it.

| Item | Detail |
| --- | --- |
| 301 redirect map | 95 old URLs mapped, rendered as 195 rules in `vercel.json` (each old URL covered on both the apex and www versions of the old domain), every one `permanent: true` so they emit 301 not 302 |
| URL slugs preserved | Every migrated blog post keeps its exact old slug, so `/tooth-pain-relief/` is the same path on both sites. This is the single biggest lever and it is already pulled |
| Publish dates preserved | Original `datePublished` retained, with `dateModified` set to the migration date |
| Retired services | 9 treatments the practice no longer offers redirect to the services hub rather than 404 |
| Canonical tags | Absolute, self-referencing, on every page, all pointing at the www host |
| Apex to www | `footscraydentalstudio.com.au` 301s to `www.footscraydentalstudio.com.au`, so only one host is canonical |
| Schema | `Dentist` JSON-LD sitewide with `alternateName: "Ezy Dental Group"`, plus address, geo coordinates and opening hours. `BlogPosting`, `BreadcrumbList` and `FAQPage` on posts |
| Visible continuity | "Formerly Ezy Dental Group. Same practice, same team at 289 Barkly St, under new leadership." in the footer of all 68 pages |
| sitemap.xml | 67 URLs, referenced from `robots.txt` |
| Alternative redirect formats | `old-site.htaccess` (Apache) and `rank-math-redirections.csv` (WordPress), for if the old site stays where it is. See the decision below |

---

## The decision that has to be made first

**The 195 redirect rules live in `vercel.json`, on the new site. They are
host-based: each one only fires when the request arrives with a Host header of
`ezydentalgroup.com.au` or `www.ezydentalgroup.com.au`.**

That means they do nothing at all unless the old domain is actually pointed at
the new Vercel project. If the old WordPress site stays on its current hosting,
every one of those 95 redirects is inert and the migration loses its link
equity.

Pick one of these two. Not neither, and not both.

### Option A: point the old domain at Vercel (recommended)

1. In the Vercel project, add `ezydentalgroup.com.au` and
   `www.ezydentalgroup.com.au` as domains.
2. Update the old domain's DNS to the records Vercel gives you.
3. Decommission the old WordPress hosting once DNS has propagated, but **do not
   let the domain registration lapse** (see below).

All 195 rules then fire automatically. Nothing else to configure.

### Option B: leave the old site where it is

1. If it is on Apache, add `old-site.htaccess` to the old site's web root.
2. If it is WordPress with Rank Math, import `rank-math-redirections.csv`
   through Rank Math > Redirections > Import.
3. Keep that hosting paid and running for as long as the redirects matter, which
   is years, not months.

Option A is cleaner and cheaper. Option B keeps you paying for hosting whose
only job is to redirect.

**Either way, verify before announcing the launch:**

```bash
curl -sI https://ezydentalgroup.com.au/tooth-pain-relief/ | head -3
```

You want `HTTP/2 301` and a `location:` header pointing at the new URL. A 200
means the old page is still serving itself and the redirect is not running. A
302 means it is temporary, which does not pass authority the same way.

---

## What only the team can do

Ordered by how much damage skipping it causes.

### 1. Google Business Profile, on launch day

For "dentist Footscray" and similar searches, the Business Profile drives more
new patients than the website does. Do not create a new listing. **Edit the
existing one** and change the business name to Footscray Dental Studio.

Creating a new listing throws away years of reviews and local ranking history,
and leaves a duplicate that Google may suspend. The address, phone number and
category stay as they are, which is what tells Google it is the same business
under a new name.

Google may ask for verification after a name change. Expect that, and have
signage photos ready.

### 2. Google Search Console, immediately after the redirects go live

1. Add and verify `www.footscraydentalstudio.com.au` as a new property.
2. Confirm `ezydentalgroup.com.au` is still verified. If nobody has access,
   sort that out before touching DNS, because you need it for the next step.
3. In the **old** property, use **Settings > Change of address** and select the
   new property.

The Change of Address tool is the formal signal that a site has moved. It only
works while the old property is verified and the site-wide 301s are live, which
is why the order matters. Losing access to the old Search Console property
after DNS changes is a common and painful mistake.

Then, in the new property:

- Submit `https://www.footscraydentalstudio.com.au/sitemap.xml`.
- Watch Coverage and Pages weekly for the first two months. A rise in 404s means
  a URL was missed from the redirect map.
- Expect impressions on the old domain to fall and the new one to rise over
  roughly four to eight weeks. A dip in the first fortnight is normal.

Do the equivalent in Bing Webmaster Tools. It has its own site move tool and
takes ten minutes.

### 3. Keep the old domain registered

Renew `ezydentalgroup.com.au` for at least five years, ideally indefinitely.

Redirects only work while the domain resolves. If it expires, every backlink
pointing at the old site dies at once, and a domain with a dental history is
attractive to whoever picks it up next. The registration cost is trivial against
what it protects.

### 4. Reclaim the backlinks that matter

301s pass most authority, but a direct link is worth more than a redirected one,
and redirect chains decay over time.

Export referring domains from Ahrefs, Semrush or Search Console's Links report,
sort by authority, and email the top 20 to 30 asking them to update the URL.
Realistically these will be health funds, local business directories, dental
associations, suppliers and any local press.

### 5. NAP consistency across directories

Name, address and phone need to match the new brand everywhere. For an
Australian dental practice, at minimum:

- HealthEngine, HotDoc or whichever booking platform the practice uses
- Australian Dental Association listings
- Health fund provider directories (the 42 funds on the site's own strip are a
  good starting list)
- True Local, Yellow Pages, Hotfrog, Localsearch
- Apple Maps (Apple Business Connect) and Bing Places
- Facebook and Instagram profiles
- Any local council or chamber of commerce listing

Inconsistent business names across directories dilute local ranking signals
precisely when they are already unsettled.

### 6. Analytics continuity

- Keep using the same GA4 property rather than starting fresh, so the before and
  after sit on one timeline.
- Add an annotation, or at minimum a dated note somewhere the team will find it,
  marking the migration date. In six months when someone asks why traffic moved,
  that note answers it.
- Update the property's default URL to the new domain.
- If Google Ads is running, update the final URLs and any sitelinks. Ads pointing
  at redirected URLs still work but add a hop and can affect quality score.

### 7. Suppress the Vercel preview URL

Once the custom domain is attached, `footscray-dental-studio-*.vercel.app`
serves the same content and can be indexed as a duplicate. The canonical tags on
every page point at the real domain, which mitigates most of the risk, but the
clean fix is to set the production domain in Vercel project settings so the
`.vercel.app` host redirects to it.

Also worth deleting the eight or nine abandoned Vercel projects created during
testing, so there is no ambiguity about which one owns the domain.

---

## Timeline

| When | What |
| --- | --- |
| Before launch | Decide Option A or B. Confirm Search Console access to the old domain |
| Launch day | Deploy, point DNS, verify 301s with curl, rename the Google Business Profile |
| Within 24 hours | New Search Console property verified, sitemap submitted, Change of Address filed |
| Week 1 | Backlink outreach to the top referring domains, directory updates begun |
| Weeks 2 to 8 | Monitor Search Console weekly for 404s and coverage. Expect volatility |
| Month 3 | Compare rankings against the pre-migration baseline. Investigate anything still down |

**Take a baseline before you touch anything.** Export current rankings,
top landing pages by organic traffic, and the referring domains list. Without it
there is no way to tell in three months whether the migration cost anything, and
you will be arguing from memory.

---

## What not to do

- **Do not change the URL slugs** on migrated posts to something "better". The
  slug match is what makes the redirects clean and the content recognisable.
  Optimise slugs later, one at a time, if a specific page warrants it.
- **Do not redirect everything to the homepage.** Google treats a mass redirect
  to the root as a soft 404 and passes nothing. The map is page-to-page for
  exactly this reason.
- **Do not launch the new site and delete the old one the same day** without
  the redirects verified. That is the one sequence that loses everything.
- **Do not create a second Google Business Profile.**
- **Do not remove the "Formerly Ezy Dental Group" line** from the footer for at
  least a year. It helps returning patients and reinforces the connection.
