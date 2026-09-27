import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, anyone } from '../access'
import { changeHooks } from '../fields'

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: { useAsTitle: 'from', defaultColumns: ['from', 'to', 'type', 'updatedAt'], group: 'Practice',
    description: 'Send an old address to a new one. Takes effect on the next publish.' },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: changeHooks,
  fields: [
    { type: 'row', fields: [
      { name: 'from', type: 'text', required: true, unique: true, admin: { width: '40%', description: 'Path on this site, e.g. /old-page/' },
        validate: (v: any) => (typeof v === 'string' && v.startsWith('/')) || 'Must start with /' },
      { name: 'to', type: 'text', required: true, admin: { width: '40%', description: 'Path or full URL to send visitors to.' } },
      { name: 'type', type: 'select', defaultValue: '301', options: [{ label: 'Permanent (301)', value: '301' }, { label: 'Temporary (302)', value: '302' }], admin: { width: '20%' } },
    ] },
    { name: 'note', type: 'text' },
  ],
}
