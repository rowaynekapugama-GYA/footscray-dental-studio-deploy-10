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
2. `/admin/` shows the sign-in screen. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The dashboard (dark menu on the left, same layout as Coastal Dental) shows Pages, Blog posts (32), Team (3), Special offers (6), Practice details, Enquiries and Settings.
3. Pages > Home > Edit. Click a heading on the page preview, change a word, press **Save changes**. A new build starts by itself (Deployments). When it finishes the change is on the preview. Put the word back and save again.
4. `/cms/` is the underlying Payload admin, for GYA only (imports, backups, raw data).

Then push the same zip to `main` (rerun the command with `main` as the last argument). The production build does the same bootstrap against the same database, finds it already populated, and simply pulls.

The first build on an empty database takes longer (it imports the content and uploads the 67 blog images to Blob). Later builds take about two minutes.

## Step 4: hand the practice their login

In the dashboard, Settings > People who can sign in: their name, email and a temporary password. They are added as **Editor**: they can change all content and publish, but cannot manage users or open `/cms/`. Send them `docs/HOW-TO-UPDATE.md`.

## What the practice can edit

On every page, by clicking it on the live preview: every heading, paragraph, list, FAQ, card and button label, and every photo (with its alt text). Per page: the title tag, meta description, sharing image, noindex, and the order and visibility of the page's sections. Also: the team (add, remove, reorder, photos, bios); special offers; practice details (phone, email, address, maps link, hours, announcement bar, reviews link, socials); blog posts with a rich editor, featured image, category, SEO fields and the surgical note; redirects; their own password. Every enquiry from the forms is listed under Enquiries.

Not editable in the dashboard: the navigation and footer links, the health fund logo strip, the legal pages, page structure and design. Those remain GYA changes to the generators in `build/`.

## How a change reaches the site

**Save changes** writes to the database and calls the Vercel deploy hook, so the site rebuilds by itself (Settings > Update the website now does the same on demand). The build pulls the database into `content/*.json`, renders the blog, patches the pages and deploys. The live site is static HTML the whole time.

Page wording, photos, SEO and section layout live in one document (`site-content`). The last 25 saves are kept: in `/cms/` open **Website content (history)** > Versions to compare or **Restore** an earlier one, then press Update the website now. Blog posts keep their own versions. Enquiries are stored whether or not the email got through.

## If something goes wrong

- **Build fails at `payload migrate`:** `DATABASE_URL` missing or the Neon database unreachable. The site itself still builds from the committed JSON if you remove the variable temporarily; the dashboard needs the database.
- **"Publishing is not connected yet":** `PUBLISH_HOOK_URL` is missing or the hook was deleted.
- **Uploads fail:** `BLOB_READ_WRITE_TOKEN` missing, or the request origin is not in the allowed list (see Step 2).
- **Dashboard shows an empty site:** the import did not run. Sign in as admin, open `/cms/` and press **Import from files**. **Reset to files** replaces edited content with the repository's copies (destructive, admins only; the previous content stays in the history).
- **Regenerated the pages with the Python generators?** Commit the new `site/`. New wording in the generators is ignored for fields the database already holds, because the database is the source of truth; press **Reset to files** in `/cms/` if you want the generator copy to win.
- **A photo shows as broken in the dashboard but fine on the site:** it is hotlinked from imgur (see the go-live list in the README); the dashboard's browser may block it. Replacing it with an upload fixes both.
- **Function logs:** Vercel > Deployments > latest > Functions. `api/contact` logs which provider refused an email and why.

## Security notes

- Dashboard logins are Payload's, with bcrypt password hashes, an 8-hour session cookie, 8 failed attempts then a 15-minute lock.
- `/admin`, `/cms` and `/api` are `noindex` and blocked in `robots.txt`; preview deployments carry `noindex` on every page.
- Every dashboard write needs a signed-in session plus an `X-Requested-With` header, so another site cannot post to it from a visitor's browser.
- Forms keep the honeypot, three-second rule, per-IP rate limit and link check. Enquiries are only readable when signed in.
- The public site never queries the database. A database outage cannot take the site down.
