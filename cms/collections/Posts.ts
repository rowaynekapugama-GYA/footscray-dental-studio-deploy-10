import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, anyone } from '../access'
import { imageSlot, articleEditor, seoFields, changeHooks } from '../fields'

const slugify = (s: string) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Blog post', plural: 'Blog posts' },
  admin: {
    useAsTitle: 'title', defaultColumns: ['title', 'category', 'datePublished', '_status', 'updatedAt'], group: 'Website',
    description: 'Articles on the blog. Save as draft while writing; publish when ready, then press Publish website.',
    pagination: { defaultLimit: 50 },
  },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isAdmin },
  versions: { drafts: true, maxPerDoc: 25 },
  hooks: changeHooks,
  fields: [
    { type: 'tabs', tabs: [
      { label: 'Article', fields: [
        { name: 'title', type: 'text', required: true, label: 'Headline', admin: { description: 'The H1 at the top of the article.' } },
        { name: 'slug', type: 'text', required: true, unique: true, label: 'Web address', admin: { description: 'Lowercase words joined by hyphens. Changing this on a published post breaks links to it; add a redirect if you must.' },
          hooks: { beforeValidate: [({ value, data }: any) => value ? slugify(String(value)) : slugify(String(data?.title || ''))] } },
        { type: 'row', fields: [
          { name: 'category', type: 'text', required: true, defaultValue: 'Dental Health', admin: { width: '50%' } },
          { name: 'datePublished', type: 'date', required: true, label: 'Publish date', admin: { width: '25%', date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } }, defaultValue: () => new Date().toISOString() },
          { name: 'dateModified', type: 'date', label: 'Last updated', admin: { width: '25%', date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' }, description: 'Leave empty to use the publish date.' } },
        ] },
        { name: 'excerpt', type: 'textarea', required: true, label: 'Summary', admin: { description: 'One or two sentences shown on the blog index card.' } },
        imageSlot('featuredImage', 'Featured image', 'Shown at the top of the article and on the blog index. Landscape, at least 1200px wide.'),
        { name: 'body', type: 'richText', editor: articleEditor, required: true, label: 'Article' },
        { name: 'surgicalDisclaimer', type: 'checkbox', label: 'Show the surgical procedure note under the article', defaultValue: false, admin: { description: 'Required by AHPRA guidance for articles about surgical or invasive procedures.' } },
        { name: 'related', type: 'relationship', relationTo: 'posts', hasMany: true, maxRows: 3, label: 'Related articles', admin: { description: 'Up to three. Shown under the article.' } },
      ] },
      { label: 'SEO', fields: seoFields({ ogImage: false }) },
    ] },
  ],
}
