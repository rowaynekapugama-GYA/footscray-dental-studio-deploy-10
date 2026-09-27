import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, anyone } from '../access'
import { changeHooks } from '../fields'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Media library' },
  admin: { group: 'Website', description: 'Photos and images for the site. Every image needs alt text.' },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: changeHooks,
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    // Resize big uploads once, on the way in. The site serves this file as-is
    // (no Vercel image optimisation, which is capped per account).
    resizeOptions: { width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    adminThumbnail: 'thumb',
    imageSizes: [{ name: 'thumb', width: 400, height: 400, fit: 'inside', formatOptions: { format: 'webp', options: { quality: 70 } } }],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, label: 'Alt text', admin: { description: 'Describe the photo in a short sentence. Screen readers and Google read this.' } },
    { name: 'builtinPath', type: 'text', admin: { hidden: true } },
  ],
}
