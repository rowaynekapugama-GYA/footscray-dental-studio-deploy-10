import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: { tokenExpiration: 8 * 60 * 60, maxLoginAttempts: 8, lockTime: 15 * 60 * 1000 },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'name', 'role'], group: 'Practice' },
  access: {
    read: ({ req }) => (req.user?.role === 'admin' ? true : { id: { equals: req.user?.id } }),
    create: isAdmin, update: ({ req }) => (req.user?.role === 'admin' ? true : { id: { equals: req.user?.id } }), delete: isAdmin,
  },
  hooks: {
    // the very first account (created through /admin/create-first-user) is GYA's admin.
    // Field-level access strips "role" from an unauthenticated create, so it is set afterwards.
    afterChange: [async ({ doc, operation, req }) => {
      if (operation === 'create' && doc.role !== 'admin') {
        const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
        if (totalDocs <= 1) await req.payload.update({ collection: 'users', id: doc.id, data: { role: 'admin' }, overrideAccess: true, req })
      }
      return doc
    }],
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'role', type: 'select', required: true, defaultValue: 'editor', options: [{ label: 'Admin (GYA)', value: 'admin' }, { label: 'Editor (practice)', value: 'editor' }],
      access: { create: isAdminField, update: isAdminField }, saveToJWT: true },
  ],
}
