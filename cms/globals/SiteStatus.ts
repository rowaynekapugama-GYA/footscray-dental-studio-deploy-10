import type { GlobalConfig } from 'payload'
import { isLoggedIn, anyone } from '../access'

/* Hidden bookkeeping: when content last changed and when the site was last published. */
export const SiteStatus: GlobalConfig = {
  slug: 'site-status',
  admin: { hidden: true },
  access: { read: anyone, update: isLoggedIn },
  fields: [
    { name: 'lastChangedAt', type: 'date' },
    { name: 'lastPublishedAt', type: 'date' },
    { name: 'lastImportedAt', type: 'date' },
    { name: 'lastPublishNote', type: 'text' },
  ],
}
