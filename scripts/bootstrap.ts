import './load-env'
import { getPayload } from 'payload'
import config from '../payload.config'
import { importContent } from '../cms/sync'

/**
 * Runs at the start of every build, after migrations:
 *   1. If there are no users yet and ADMIN_EMAIL + ADMIN_PASSWORD are set, creates GYA's
 *      admin account. This means the public "create first user" screen never appears.
 *   2. If the database has no pages yet, loads the repository's content into it, so the
 *      first deploy comes up with the whole site in the dashboard.
 * Both steps are skipped once they have happened.
 */
const payload = await getPayload({ config })
const users = await payload.count({ collection: 'users', overrideAccess: true })
if (users.totalDocs === 0) {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD
  if (email && password) {
    await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, name: process.env.ADMIN_NAME || 'GYA', role: 'admin' } })
    console.log(`bootstrap: created the admin account ${email}`)
  } else {
    console.log('bootstrap: no users yet and ADMIN_EMAIL/ADMIN_PASSWORD not set; /admin will offer to create the first user')
  }
}
const pages = await payload.count({ collection: 'pages', overrideAccess: true })
if (pages.totalDocs === 0) {
  console.log('bootstrap: empty database, importing the site content from the repository')
  const counts = await importContent(payload, { log: (m) => console.log('  ' + m) })
  console.log('bootstrap: imported', JSON.stringify(counts))
}
process.exit(0)
