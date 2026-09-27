import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '../access'

export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  labels: { singular: 'Enquiry', plural: 'Enquiries' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'formType', 'phone', 'email', 'emailStatus', 'followedUp', 'createdAt'], group: 'Practice',
    description: 'Every form submission from the website, whether or not the email got through.', pagination: { defaultLimit: 50 } },
  access: { read: isLoggedIn, create: () => false, update: isLoggedIn, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    { type: 'row', fields: [
      { name: 'formType', type: 'select', options: ['appointment', 'contact', 'newsletter'].map(v => ({ label: v, value: v })), admin: { width: '25%', readOnly: true } },
      { name: 'name', type: 'text', admin: { width: '25%', readOnly: true } },
      { name: 'phone', type: 'text', admin: { width: '25%', readOnly: true } },
      { name: 'email', type: 'email', admin: { width: '25%', readOnly: true } },
    ] },
    { type: 'row', fields: [
      { name: 'service', type: 'text', admin: { width: '50%', readOnly: true } },
      { name: 'preferred', type: 'text', label: 'Preferred date and time', admin: { width: '50%', readOnly: true } },
    ] },
    { name: 'message', type: 'textarea', admin: { readOnly: true } },
    { type: 'row', fields: [
      { name: 'emailStatus', type: 'select', options: [{ label: 'Sent', value: 'sent' }, { label: 'Failed', value: 'failed' }], admin: { width: '33%', readOnly: true } },
      { name: 'emailError', type: 'text', admin: { width: '67%', readOnly: true } },
    ] },
    { name: 'followedUp', type: 'checkbox', label: 'Followed up', defaultValue: false },
    { name: 'page', type: 'text', admin: { readOnly: true, description: 'Page the form was sent from.' } },
    { name: 'ip', type: 'text', admin: { readOnly: true } },
  ],
}
