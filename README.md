# Footscray Dental Studio website

The live site (static pages, unchanged from launch) plus the GYA dashboard at `/admin/` that lets the practice edit it: a visual click-to-edit editor like Coastal Dental's, backed by Payload CMS (raw admin at `/cms/`, GYA only). Deployed on Vercel from this repository.

- **Deploy and configure:** `DEPLOYMENT_NOTES.md`
- **For the practice (how to edit the site):** `docs/HOW-TO-UPDATE.md`
- **What changed and when:** `CHANGELOG.md`

## How it fits together

```
dashboard (/admin visual editor; /cms Payload; Neon Postgres + Vercel Blob)
        |  Save changes  ->  Vercel deploy hook
        v
scripts/build.mjs   1. payload migrate       (tables)
                    2. scripts/bootstrap.ts  (admin account + first import, once)
                    3. scripts/pull-content  (database -> content/site.json, posts.json, redirects.json)
                    4. build/blog.mjs        (posts.json -> blog pages, sitemap.xml)
                    5. build/apply-content   (site/ + content -> public/, the finished pages)
                    6. next build            (dashboard, API, middleware)
```

The public pages are static files in `public/`, served as they are. Nothing on the live site reads the database at request time, so the site cannot go down because of the dashboard, and if the database is unreachable the build falls back to the JSON committed in `content/`.

| Folder | What is in it |
| --- | --- |
| `site/` | The pages as the generator wrote them, with `data-cms` markers on every editable spot. Regenerate with the Python scripts in `build/`; never hand-edit. |
| `content/` | `site.json` (all editable copy, keyed like the markers), `posts.json` (blog), `schema.json` (field types the patcher uses), `old-domain-redirects.json` (the 195 launch redirects). |
| `cms/` | The dashboard back end: collections, globals, the rich text <-> site markup converter (`richtext.ts`), import/pull sync (`sync.ts`), the visual editor's server side (`editor.ts`) and the script injected into the page preview (`editor-bridge.js`). |
| `app/` | Next.js routes: `(dashboard)/admin` (the visual dashboard, React), `(payload)/cms` (Payload admin) and its REST API, `api/fds/[action]` (the dashboard's API), `api/contact` (forms), the 404 route. |
| `build/` | Page generators (Python), `apply-content.cjs` (patcher), `blog.mjs` (blog renderer), `routing.mjs` (redirects and headers). |
| `lib/` | Shared CommonJS helpers: patcher core, HTML utilities, config, mail, form validation. |
| `migrations/` | Database migrations. Committed; run on every build. |
| `scripts/` | Build orchestration, bootstrap, import, pull. |

## Running it locally

```bash
cp .env.example .env            # point DATABASE_URL at a local Postgres
npm install
npx payload migrate             # tables
npm run import                  # load content/*.json and the blog into the database
npm run build:site              # site/ + content -> public/
npm run dev                     # http://localhost:3000, /admin and /cms (use port 3000 or saves are refused)
```

`npm run pull` writes the database back to `content/*.json`; `npm run build` is what Vercel runs.

## Rules that keep the site identical

- The generated markup is the contract. `cms/richtext.ts` turns dashboard rich text into exactly the tick lists, numbered steps and button rows the pages use, and the import proves it round-trips byte for byte.
- Photos have a built-in file and an optional library upload; imported launch images keep their original addresses.
- Australian English throughout, no em dashes in copy or code comments, AHPRA rules on offers and claims (see `docs/HOW-TO-UPDATE.md`).

## Open items (go-live checklist)

- [ ] `BLOB_READ_WRITE_TOKEN` valid on Production and Preview (Settings in the dashboard shows a red note if not). Without it, photo uploads are switched off.
- [ ] `PUBLISH_HOOK_URL` set, so Save changes updates the website by itself.
- [ ] Old admin variables deleted: `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `CONTENT_STORE`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_TOKEN`. After the first successful production build, also delete `ADMIN_PASSWORD`.
- [ ] Hotlinked images: 64 photos (home and page heroes, service icons, mega menu, the three team photos) still load from i.imgur.com, plus 5 from Unsplash and Higgsfield. They work today, but if those hosts remove them the photos disappear. Download them, upload through the dashboard (Replace), or move them into `site/assets/img/`.
- [ ] AHPRA wording in the approved copy, for the client to confirm or change in the dashboard: "pain-free" in Dr Adeela's bio (Team), "Quick and painless to apply" on the Fissure Sealants page, "painless for most people" in the blog post How to Fix Rotten Teeth.
- [ ] Hand the practice an Editor login (Settings > People who can sign in) and `docs/HOW-TO-UPDATE.md`.
