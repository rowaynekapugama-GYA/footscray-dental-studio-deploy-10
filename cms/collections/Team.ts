import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, anyone } from '../access'
import { imageSlot, richBody, changeHooks } from '../fields'

export const Team: CollectionConfig = {
  slug: 'team',
  labels: { singular: 'Practitioner', plural: 'Team' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'role', 'order', 'updatedAt'], group: 'Website',
    description: 'The practitioners on the Meet the Team page, in order.' },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  defaultSort: 'order',
  hooks: changeHooks,
  fields: [
    { type: 'row', fields: [
      { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
      { name: 'role', type: 'text', required: true, defaultValue: 'Dentist', admin: { width: '25%' } },
      { name: 'order', type: 'number', required: true, defaultValue: 1, admin: { width: '25%', description: 'Lower numbers first.' } },
    ] },
    imageSlot('photo', 'Photo', 'Portrait orientation works best.'),
    richBody('bio', 'Bio'),
    { name: 'ahpraNumber', type: 'text', label: 'AHPRA registration number', admin: { description: 'For GYA records. Not shown on the site.' } },
    { name: 'hidden', type: 'checkbox', label: 'Hide from the site', defaultValue: false },
  ],
}
