# Deployment notes

Footscray Dental Studio website: static pages, working contact forms, and an admin panel.

## What is in this build

| Folder / file | Purpose |
| --- | --- |
| `site/` | The pages exactly as the generator wrote them, with `data-cms` markers on every editable spot. Never edit these by hand. |
| `content/site.json` | Everything the admin panel can change: phone, hours, headlines, team, offers, FAQs, page intros, images. |
| `content/schema.json` | Defines the admin panel form and how each field maps into the pages. |
| `content/auth.json` | Created automatically the first time the password is changed. Holds the password hash, never the password. |
| `build/apply-content.js` | The build step. Copies `site/` to `public/`, fills in the content, adds the admin panel. Vercel runs it on every deploy. |
| `api/contact.js` | The contact, appointment and newsletter form endpoint. |
| `api/admin/[action].js` | The admin panel API: login, content, uploads, password. |
| `admin/index.html` | The admin panel itself, served at `/admin/`. |
| `lib/` | Shared code: config, HTML patching, auth, storage, mail. No dependencies. |
| `vercel.json` | Build command, output folder, clean URLs, the 195 redirect rules from the old domain. |
| `dev-server.js` | Runs the whole thing locally, behaving like Vercel. |
| `test/run.js` | 46 automated checks of the form and admin APIs. |

`public/` is the built output. It is not in the repo; Vercel builds it, and `npm run build` makes it locally.

## Server requirements

**Vercel** (current host): nothing to install. Node 18+ runtime, which Vercel provides. Framework preset: **Other**. The build command and output directory are read from `vercel.json`.

**Any other Node host** (a VPS, Render, Railway): Node 18+, run `npm run build` then `node dev-server.js` behind a reverse proxy, and set `CONTENT_STORE=local` so edits write to disk. The rest of this document assumes Vercel.

**Not possible:** a PHP or plain static host. The forms and admin panel are Node functions.

## Step 1: push the repository

The repo root must be this folder (with `vercel.json` at the top), not the old layout where `index.html` sat at the root.

Easiest: `./push-site-to-github.sh https://github.com/OWNER/REPO.git` from a folder holding this zip. It replaces the repo contents, keeps history, and verifies what landed.

Or GitHub Desktop: clone the repo, delete its contents, copy this folder in, commit, push.

## Step 2: environment variables

Vercel > Project > Settings > Environment Variables. Add each for **Production** (and Preview if you want previews working). Full list with comments in `.env.example`.

### Required for the contact form

| Variable | Value | Where it comes from |
| --- | --- | --- |
| `CONTACT_TO` | The inbox that receives submissions. Comma-separate for several. | Client |
| `CONTACT_FROM` | `Footscray Dental Studio <noreply@footscraydentalstudio.com.au>` | Must be a sender the email provider has verified |
| `SMTP2GO_API_KEY` | API key from SMTP2GO | GYA's SMTP2GO account. Same as Dental Specialists |

Or `RESEND_API_KEY` instead of the SMTP2GO key. The code picks whichever is set.

**Sender verification is the step people miss.** Whichever provider is used has to be told the sending domain is yours: in SMTP2GO, Settings > Sender Domains > add `footscraydentalstudio.com.au`, then add the SPF/DKIM records it gives you at the domain's DNS. Until that is done the provider rejects the send and the form shows its error message. If DNS access is slow to get, use a domain GYA has already verified as `CONTACT_FROM` for now; replies still go to the patient because Reply-To is set to their address.

Optional: `CONTACT_AUTOREPLY=true` sends the patient a short acknowledgement. `CONTACT_SUBJECT_PREFIX` defaults to `[Website]`.

### Required for the admin panel

| Variable | Value |
| --- | --- |
| `ADMIN_USERNAME` | `fds-admin` |
| `ADMIN_PASSWORD_HASH` | From `ADMIN_CREDENTIALS.txt` (sent separately, not in this zip) |
| `SESSION_SECRET` | From `ADMIN_CREDENTIALS.txt` |
| `CONTENT_STORE` | `github` |
| `GITHUB_TOKEN` | See below |
| `GITHUB_REPO` | `OWNER/REPO`, e.g. `rowaynekapugama-GYA/footscray-dental-studio` |
| `GITHUB_BRANCH` | `main` (or whatever branch Vercel deploys) |

**The GitHub token.** GitHub > Settings > Developer settings > Personal access tokens > **Fine-grained tokens** > Generate. Repository access: **Only select repositories**, pick the site repo. Permissions: **Contents: Read and write**. Nothing else. Set an expiry of a year and put a reminder in the calendar; when it expires the admin panel can still be logged into but saves will fail with a clear message.

This token is what lets the admin panel commit changes. Each save is a commit like `Content update via admin panel: home, hours`, Vercel sees the push and redeploys, and the change is live about a minute later. That is also the audit trail: every edit is in the repo history with a timestamp.

### Optional

`SITE_URL` (used in emails), `SESSION_HOURS` (default 8), `CONTACT_PHONE` (quoted in the auto-reply).

## Step 3: redeploy

After adding variables, trigger a deploy (Deployments > Redeploy) so the functions pick them up.

## Step 4: test the form

1. Open `/contact/`, submit with real details. You should see the green "Thanks for your message" box, and the email should arrive at `CONTACT_TO` within a minute, with the patient's address as Reply-To.
2. Submit the appointment form at the bottom of any service page the same way.
3. Submit with a bad email address: you should see an inline error, nothing sent.
4. If the red "Sorry, that did not send" box appears: Vercel > Deployments > latest > Functions > `api/contact` > logs. The log line says exactly which provider refused and why, usually an unverified sender.

Spam handling is silent by design: a bot that fills the hidden `website` field, submits within 3 seconds of page load, or posts more than 6 times in 10 minutes gets a normal-looking success and nothing is sent.

## Step 5: test the admin panel

1. Open `/admin/`. Sign in with the credentials from `ADMIN_CREDENTIALS.txt`. A yellow banner says the initial password should be changed.
2. Change the password (sidebar). The banner disappears, and `content/auth.json` appears in the repo as a commit.
3. Change something visible, e.g. Practice details > Phone number. Save & publish. The status bar confirms and names the commit.
4. Watch Vercel > Deployments: a new deploy starts within seconds. When it finishes, the phone number is different on every page, including the Call buttons and the structured data.
5. Upload a photo somewhere (e.g. Meet the Team). It commits to `site/assets/img/uploads/` and is served from `/assets/img/uploads/`.

If saving fails with a GitHub message, the token is wrong, expired, or lacks Contents write on that repo. If the banner says "Server setup is incomplete", it lists exactly which variable is missing.

## What the client can edit

Practice details (phone, email, address, map link, social links, Google reviews link), opening hours, an announcement bar, every headline and intro on the homepage plus its service cards, feature list, story, FAQ and photos, the About page sections, the team (add, remove, reorder, photos, bios), special offers (add, remove, price, description, bullets), the contact page text and FAQ, and the headline, intro line and hero photo of all 27 inner pages.

**Not editable in the panel:** blog posts (they are generated from markdown by the Python build), the navigation, the health fund logos, and page structure. Those remain GYA changes. Blog editing can be added later if wanted.

## Security notes, in plain terms

- Passwords are hashed with scrypt; the plain password exists nowhere on the server.
- Sessions are signed HttpOnly cookies, 8 hours, invalidated on password change. Sign-out clears the cookie; because sessions are stateless on serverless, a stolen cookie stays valid until it expires or the password changes. Changing the password is the "log everyone out" button.
- 8 failed logins from one address in 15 minutes triggers a cool-off.
- The panel and API are `noindex` and blocked in `robots.txt`.
- The admin only ever writes three things: `content/site.json`, `content/auth.json`, and image uploads. It cannot touch code.
- Uploads are checked by file signature, capped at 4 MB, and SVGs containing scripts are refused.

## Running it locally

```bash
cp .env.example .env      # leave the API keys blank: emails go to outbox/, saves go to disk
node build/make-password.js   # paste the hash into .env as ADMIN_PASSWORD_HASH
npm run dev                   # http://localhost:3000 and /admin/
npm test                      # in a second terminal, 46 checks
```

## Regenerating pages

If GYA rebuilds pages with the Python generators (`build/glow.py`, `rollout.py`, `blog.py`), the markers come along automatically. Run `npm run extract -- --force` only if you want to reset `content/site.json` to what the generated pages say, which discards the client's edits, so do not do that casually.
