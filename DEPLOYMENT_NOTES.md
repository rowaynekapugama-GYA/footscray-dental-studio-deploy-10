# Deployment notes

Footscray Dental Studio: the launch site, unchanged, plus the GYA dashboard at `/admin/`.

Same setup as Coastal Dental and The Cronulla Dentists: Next.js on Vercel, Payload CMS, Neon Postgres for content, Vercel Blob for photos. The public pages stay static.

## What this build contains

| Folder / file | Purpose |
| --- | --- |
| `site/` | The pages exactly as the generator wrote them, with `data-cms` markers. Never edit by hand. |
| `content/site.json`, `content/posts.json` | The content as last pulled from the database. Committed as the fallback used when the database is unreachable. |
| `content/old-domain-redirects.json` | The 195 ezydentalgroup.com.au and apex redirects from launch. |
| `cms/`, `payload.config.ts`, `migrations/` | The dashboard. |
| `app/api/contact/route.ts` | The contact, appointment and newsletter forms (SMTP2GO, plus a copy in the Enquiries list). |
| `scripts/build.mjs` | What Vercel runs: migrate, bootstrap, pull, render, patch, `next build`. |
| `middleware.ts`, `build/routing.mjs` | Clean URLs with trailing slashes, the 404 page, cache and security headers, redirects. |

## Step 1: Vercel project settings

Vercel > the project that owns www.footscraydentalstudio.com.au > Settings.

1. **Build and Deployment > Framework Preset: Next.js.** The old project was set to "Other" for the static site. `vercel.json` also says `nextjs`, but set it in the UI too so the deploy logs make sense. Build command `npm run build`, output directory left blank, Node 20 or 22.
2. **Storage > Create Database > Neon (Postgres).** Attach it to this project, all environments. That adds `DATABASE_URL` (and `POSTGRES_URL`) to the project. Same as Coastal.
3. **Storage > Create > Blob.** Attach it. That adds `BLOB_READ_WRITE_TOKEN`.
4. **Git > Deploy Hooks > Create Hook**, name `Publish from dashboard`, branch `main`. Copy the URL for `PUBLISH_HOOK_URL` below.

## Step 2: environment variables

Settings > Environments > Production. Keep the existing `SMTP2GO_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`. The old admin variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `CONTENT_STORE`, `GITHUB_*`) are no longer read and can be deleted.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | added by the Neon integration |
| `BLOB_READ_WRITE_TOKEN` | added by the Blob integration |
| `PAYLOAD_SECRET` | a long random string (`openssl rand -base64 32`). Signs dashboard logins. |
| `NEXT_PUBLIC_SERVER_URL` | `https://www.footscraydentalstudio.com.au`, **Production only**, type Config (Vercel will not store a `NEXT_PUBLIC_` variable as Secret). Previews need nothing: the dashboard uses whatever address it was opened on. |
| `PUBLISH_HOOK_URL` | the deploy hook URL from step 1 |
| `ADMIN_EMAIL` | GYA's admin login, e.g. `rowayne@gyaclients.com` |
| `ADMIN_PASSWORD` | its password (12+ characters). Used once, on the first build, to create the account. Change it in the dashboard afterwards and delete this variable. |
| `ADMIN_NAME` | optional, `GYA` |

Tick Preview as well as Production for all the others, so a branch deploy has a working dashboard.

**Origin matters.** Payload treats a request from a host that is not in its allowed list as logged out (symptom: login works, saves do nothing, uploads say "not allowed"). `payload.config.ts` allows the www and apex domains, `NEXT_PUBLIC_SERVER_URL`, and Vercel's preview hosts, so previews and production both work. If the site ever moves domain, update that list.

## Step 3: push and deploy

From a folder holding the zip:

```bash
bash push-site-to-github.sh https://github.com/rowaynekapugama-GYA/footscray-dental-studio-deploy-10.git footscray-dental-studio-v3.zip cms
```

That pushes to a `cms` branch, which Vercel builds as a preview. Check the preview:

1. Any page looks and reads exactly as the live site (it is the same HTML).
2. `/admin/` shows the sign-in screen. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The dashboard shows Pages (32), Blog posts (32), Team (3), Special offers (6), Media library (67 blog images), Enquiries, Redirects, Users, Site settings.
3. Change something visible on a page, press **Publish website**. A new build starts (Deployments). When it finishes the change is on the preview.

Then push the same zip to `main` (rerun the command with `main` as the last argument). The production build does the same bootstrap against the same database, finds it already populated, and simply pulls.

The first build on an empty database takes longer (it imports the content and uploads the 67 blog images to Blob). Later builds take about two minutes.

## Step 4: hand the practice their login

In the dashboard, Users > Create new: their email, a password, role **Editor**. Editors can change all content and publish; they cannot manage users. Send them `docs/HOW-TO-UPDATE.md`.

## What the practice can edit

Every page's headline, intro line and hero photo; every body section's heading, text and photo (tick lists, numbered steps and button rows included); every FAQ; the homepage cards, features, statement and story; the About page; the team (add, remove, reorder, photos, bios); special offers with start and end dates; site settings (phone, email, address, hours, socials, reviews link, announcement bar); each page's title tag, meta description, sharing image and noindex; blog posts with a rich editor, featured image, category, related articles and the surgical note; redirects. Every enquiry from the forms is also listed under Enquiries.

Not editable in the dashboard: the navigation and footer links, the health fund logo strip, the legal pages, page structure and design. Those remain GYA changes to the generators in `build/`.

## How a change reaches the site

Save in the dashboard writes to the database. Publish website calls the Vercel deploy hook. The build pulls the database into `content/*.json`, renders the blog, patches the pages and deploys. The live site is static HTML the whole time. Version history is kept per document in the dashboard (Versions tab), and Enquiries are stored whether or not the email got through.

## If something goes wrong

- **Build fails at `payload migrate`:** `DATABASE_URL` missing or the Neon database unreachable. The site itself still builds from the committed JSON if you remove the variable temporarily; the dashboard needs the database.
- **"Publishing is not connected yet":** `PUBLISH_HOOK_URL` is missing or the hook was deleted.
- **Uploads fail:** `BLOB_READ_WRITE_TOKEN` missing, or the request origin is not in the allowed list (see Step 2).
- **Dashboard shows an empty site:** the import did not run. Sign in as admin and press **Import from files** on the dashboard. **Reset to files** replaces edited pages with the repository's copies (destructive, admins only).
- **Regenerated the pages with the Python generators?** Commit the new `site/`, then in the dashboard press **Reset to files** if the structure of a page changed (new or removed sections). Wording-only changes to the generators are ignored until then, because the database is the source of truth.
- **Function logs:** Vercel > Deployments > latest > Functions. `api/contact` logs which provider refused an email and why.

## Security notes

- Dashboard logins are Payload's, with bcrypt password hashes, an 8-hour session cookie, 8 failed attempts then a 15-minute lock.
- `/admin` and `/api` are `noindex` and blocked in `robots.txt`; preview deployments carry `noindex` on every page.
- Forms keep the honeypot, three-second rule, per-IP rate limit and link check. Enquiries are only readable when signed in.
- The public site never queries the database. A database outage cannot take the site down.
