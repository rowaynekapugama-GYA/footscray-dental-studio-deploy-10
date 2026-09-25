import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, anyone } from '../access'
import { richBody, changeHooks } from '../fields'

export const Offers: CollectionConfig = {
  slug: 'offers',
  labels: { singular: 'Special offer', plural: 'Special offers' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'price', 'order', 'endDate', 'updatedAt'], group: 'Website',
    description: 'Offer cards on the Special Offers page and the homepage. Every offer must state its price, what it includes and when it ends.' },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  defaultSort: 'order',
  hooks: changeHooks,
  fields: [
    { type: 'row', fields: [
      { name: 'title', type: 'text', required: true, admin: { width: '60%' } },
      { name: 'price', type: 'text', label: 'Price or headline', admin: { width: '20%', description: 'e.g. $135' } },
      { name: 'order', type: 'number', required: true, defaultValue: 1, admin: { width: '20%' } },
    ] },
    { name: 'note', type: 'text', label: 'Small note under the title' },
    richBody('body', 'Description'),
    { name: 'bullets', type: 'array', label: "What's included", admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [{ name: 'text', type: 'text', required: true }] },
    { name: 'cta_label', type: 'text', label: 'Button text', defaultValue: 'Book Now' },
    { type: 'row', fields: [
      { name: 'startDate', type: 'date', label: 'Starts', admin: { width: '50%', date: { pickerAppearance: 'dayOnly' }, description: 'Optional. Hidden from the site before this date.' } },
      { name: 'endDate', type: 'date', label: 'Ends', admin: { width: '50%', date: { pickerAppearance: 'dayOnly' }, description: 'Optional. Drops off the site after this date (on the next publish).' } },
    ] },
    { name: 'hidden', type: 'checkbox', label: 'Hide from the site', defaultValue: false },
  ],
}
