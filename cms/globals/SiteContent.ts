import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

/**
 * Every editable word, photo, SEO setting and section layout on the site, as one JSON
 * document keyed exactly like the data-cms markers in the pages (content/site.json shape).
 * The visual dashboard at /admin reads and writes this; the build pulls it into
 * content/site.json. Blog posts live in their own collection. Every save is kept as a
 * version (last 25), so GYA can roll back a mistake from /cms.
 */
export const SiteContent: GlobalConfig = {
  slug: 'site-content',
  label: 'Website content (history)',
  // GYA only: the Versions tab in /cms keeps the last 25 saves, with a Restore button
  admin: { hidden: ({ user }) => (user as any)?.role !== 'admin' },
  versions: { max: 25 },
  access: { read: isLoggedIn, update: isLoggedIn },
  fields: [{ name: 'data', type: 'json' }],
}
