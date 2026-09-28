import './load-env'
import { getPayload } from 'payload'
import config from '../payload.config'
import { importContent } from '../cms/sync'
import { blobToken } from '../cms/blob'
import { applyContentFixes } from '../cms/fixes'

/**
 * Runs at the start of every build, after migrations:
 *   1. If ADMIN_EMAIL + ADMIN_PASSWORD are set and no account has that email, creates it as an
 *      admin. Existing accounts are left alone.
 *   2. If the database has no pages yet, loads the repository's content into it, so the
 *      first deploy comes up with the whole site in the dashboard.
 * Both steps are skipped once they have happened.
 */
const payload = await getPayload({ config })
// ADMIN_EMAIL / ADMIN_PASSWORD: if no account with that email exists yet, create it as an admin.
// An existing account is never touched, so a password changed in the dashboard is never reset.
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase(), password = process.env.ADMIN_PASSWORD || ''
if (email && password) {
  try {
  const found = await payload.find({ collection: 'users', overrideAccess: true, limit: 1, depth: 0, where: { email: { equals: email } } })
  if (!found.docs.length) {
    await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, name: process.env.ADMIN_NAME || 'GYA', role: 'admin' } as any })
    console.log(`bootstrap: created the admin account ${email}`)
  } else {
    console.log(`bootstrap: the account ${email} already exists; its password is managed in the dashboard`)
  }
  } catch (e: any) {
    console.log('bootstrap: could not create the admin login (' + (e?.message || e) + '); signing in with ADMIN_EMAIL/ADMIN_PASSWORD will create it instead')
  }
} else if ((await payload.count({ collection: 'users', overrideAccess: true })).totalDocs === 0) {
  console.log('bootstrap: no users yet and ADMIN_EMAIL/ADMIN_PASSWORD not set; set them and redeploy to create the first login')
}
try { await applyContentFixes(payload, (m) => console.log('bootstrap: ' + m)) } catch (e: any) { console.log('bootstrap: content fixes skipped: ' + (e?.message || e)) }
const pages = await payload.count({ collection: 'pages', overrideAccess: true })
const blob = blobToken()
if (pages.totalDocs === 0 && process.env.VERCEL && !blob.ok) {
  // the 32 articles carry inline photos that must go to Blob; importing without it would lose them
  console.log('bootstrap: skipping the first import until photo storage works. ' + blob.note)
} else if (pages.totalDocs === 0) {
  console.log('bootstrap: empty database, importing the site content from the repository')
  const counts = await importContent(payload, { log: (m) => console.log('  ' + m) })
  console.log('bootstrap: imported', JSON.stringify(counts))
}
process.exit(0)
