import type { GlobalConfig } from 'payload'
import { isLoggedIn, anyone } from '../access'
import { line, changeHooks } from '../fields'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Practice', description: 'Practice details used across every page: phone, email, address, hours, socials, announcement bar.' },
  access: { read: anyone, update: isLoggedIn },
  hooks: changeHooks,
  fields: [
    { type: 'tabs', tabs: [
      { label: 'Practice details', fields: [
        { name: 'practice', type: 'group', label: '', fields: [
          { type: 'row', fields: [
            line('phone', 'Phone number', 'Updates every Call button and the structured data.'),
            line('email', 'Email address'),
          ] },
          line('address', 'Street address'),
          line('maps_url', 'Google Maps link', 'Used by the Get Directions buttons.'),
          { type: 'row', fields: [
            line('review_url', 'Google reviews link', 'Leave empty to hide the reviews badge on the homepage.'),
            line('review_label', 'Reviews badge text'),
          ] },
          { type: 'row', fields: [line('facebook', 'Facebook page URL'), line('instagram', 'Instagram URL'), line('linkedin', 'LinkedIn URL')] },
        ] },
      ] },
      { label: 'Opening hours', fields: [
        { name: 'hours', type: 'array', label: 'Hours', admin: { description: 'Shown on the homepage, contact page, emergency page and footer, and used for the structured data Google reads.', components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } },
          fields: [{ type: 'row', fields: [
            { name: 'days', type: 'text', required: true, label: 'Day or days', admin: { width: '50%', placeholder: 'Monday–Friday' } },
            { name: 'time', type: 'text', required: true, label: 'Hours', admin: { width: '50%', placeholder: '9:00am–5:00pm, or Closed' } },
          ] }] },
        line('hours_note', 'Note under the hours', 'e.g. Closed public holidays'),
      ] },
      { label: 'Announcement bar', fields: [
        { name: 'announcement', type: 'group', label: '', fields: [
          { name: 'enabled', type: 'checkbox', label: 'Show the announcement bar across the top of every page', defaultValue: false },
          line('text', 'Message'),
          line('link', 'Link (optional)'),
        ] },
      ] },
    ] },
  ],
}
