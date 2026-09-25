import type { CollectionConfig, Field } from 'payload'
import { isAdmin, isLoggedIn, anyone } from '../access'
import { imageSlot, richBody, line, faqArray, seoFields, changeHooks } from '../fields'

const when = (templates: string[]) => ({ condition: (data: any) => templates.includes(data?.template) })

const titleText = (name: string, label: string, description?: string): Field => ({ name, type: 'text', label, admin: { description } })

/* ---- template specific groups. Field names are the keys the page markers use. */

const homeGroup: Field = {
  name: 'home', type: 'group', label: 'Homepage content', admin: when(['home']),
  fields: [
    { type: 'collapsible', label: 'Hero', fields: [
      line('h1', 'Main headline', undefined, true),
      line('hero_intro', 'Line under the headline'),
      imageSlot('hero_image', 'Hero photo'),
      line('trust_line', 'Trust line (above the headline)'),
      line('stat_label', 'Stat card: label'), line('stat_number', 'Stat card: number'), line('stat_text', 'Stat card: description'),
      line('chips_title', 'Technology card: title'),
      { name: 'chips', type: 'array', label: 'Technology card: chips', admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [line('label', 'Label')] },
    ] },
    { type: 'collapsible', label: 'Health funds strip', fields: [line('funds_caption', 'Caption')] },
    { type: 'collapsible', label: 'Welcome statement', fields: [
      line('welcome_eyebrow', 'Eyebrow'), line('welcome_lead', 'Lead line'), line('welcome_statement', 'Statement'),
      imageSlot('float_image_1', 'Left photo'), imageSlot('float_image_2', 'Right photo'),
    ] },
    { type: 'collapsible', label: 'Services section', fields: [
      line('services_heading', 'Heading'), line('services_intro', 'Intro'),
      { name: 'service_cards', type: 'array', label: 'Service cards', minRows: 6, maxRows: 6,
        admin: { description: 'Six cards. The links and icons are fixed; the wording is yours.', components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } },
        fields: [line('title', 'Title'), line('desc', 'Description')] },
    ] },
    { type: 'collapsible', label: 'Why choose us', fields: [
      line('why_heading', 'Heading'), richBody('why_text', 'Text'),
      { name: 'features', type: 'array', label: 'Feature list', admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [line('title', 'Title'), line('text', 'Text')] },
    ] },
    { type: 'collapsible', label: 'Our story', fields: [line('story_heading', 'Heading'), richBody('story_text', 'Text'), imageSlot('story_image', 'Photo')] },
    { type: 'collapsible', label: 'Offers section', fields: [line('offers_heading', 'Heading'), { type: 'ui', name: 'offersNote', admin: { components: { Field: '@/cms/components/Note#OffersNote' } } }] },
    { type: 'collapsible', label: 'Visiting us', fields: [line('visit_heading', 'Heading'), line('visit_intro', 'Intro')] },
  ],
}

const aboutGroup: Field = {
  name: 'about', type: 'group', label: 'About page content', admin: when(['about']),
  fields: [
    { type: 'collapsible', label: 'Our story', fields: [line('story_heading', 'Heading'), richBody('story', 'Text')] },
    { type: 'collapsible', label: 'Philosophy', fields: [line('philosophy_heading', 'Heading'), richBody('philosophy_text', 'Text'), imageSlot('philosophy_image', 'Photo')] },
    { type: 'collapsible', label: 'Technology', fields: [
      line('tech_heading', 'Heading'), line('tech_intro', 'Intro'),
      { name: 'tech_cards', type: 'array', label: 'Technology cards', admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [line('title', 'Title'), line('text', 'Text')] },
      line('tech_outro', 'Closing line'),
    ] },
    { type: 'collapsible', label: 'Familiar faces', fields: [line('continuity_heading', 'Heading'), richBody('continuity_text', 'Text'), imageSlot('continuity_image', 'Photo')] },
    { type: 'collapsible', label: 'Visit us', fields: [line('visit_heading', 'Heading'), line('visit_text', 'Text')] },
  ],
}

const offersPageGroup: Field = {
  name: 'offers_page', type: 'group', label: 'Offers page content', admin: when(['offers']),
  fields: [
    line('intro_heading', 'Intro heading'), richBody('intro', 'Intro text'),
    { type: 'ui', name: 'offersNote', admin: { components: { Field: '@/cms/components/Note#OffersNote' } } },
    line('footnote', 'Footnote under the offers'),
  ],
}

const contactGroup: Field = {
  name: 'contact', type: 'group', label: 'Contact page content', admin: when(['contact']),
  fields: [
    line('find_text', 'Text under the map'),
    line('message_heading', 'Message form: heading'), line('message_text', 'Message form: intro'),
    line('emergency_heading', 'Emergency callout: heading'), line('emergency_text', 'Emergency callout: text'),
  ],
}

const emergencyGroup: Field = {
  name: 'emergency', type: 'group', label: 'Emergency page content', admin: when(['emergency']),
  fields: [
    line('banner', 'Urgent banner text'),
    line('wait_heading', 'While you wait: heading'),
    { name: 'wait_cards', type: 'array', label: 'While you wait: cards', admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [line('title', 'Title'), line('text', 'Text')] },
    line('wait_note', 'While you wait: note'),
    line('seen_heading', 'Getting seen quickly: heading'), richBody('seen_body', 'Getting seen quickly: text'),
  ],
}

const hubGroup: Field = {
  name: 'hub', type: 'group', label: 'Service categories', admin: when(['hub']),
  fields: [
    { name: 'category_cards', type: 'array', label: 'Category cards', admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [line('title', 'Title'), line('text', 'Description')] },
    { name: 'extra_cards', type: 'array', label: 'Emergency and children cards', admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [line('title', 'Title'), line('text', 'Description')] },
  ],
}

const categoryGroup: Field = {
  name: 'category', type: 'group', label: 'Service cards', admin: when(['category']),
  fields: [
    line('cards_heading', 'Heading'),
    { name: 'cards', type: 'array', label: 'Cards', admin: { components: { RowLabel: '@/cms/components/RowLabel#TitleRowLabel' } }, fields: [line('title', 'Title'), line('text', 'Description')] },
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    useAsTitle: 'title', defaultColumns: ['title', 'path', 'template', 'updatedAt'],
    group: 'Website',
    description: 'Every page of the site. Edit the wording and photos here, then press Publish website on the dashboard.',
    listSearchableFields: ['title', 'path'],
    pagination: { defaultLimit: 50 },
  },
  access: { read: anyone, create: isAdmin, update: isLoggedIn, delete: isAdmin },
  versions: { drafts: false, maxPerDoc: 25 },
  hooks: changeHooks,
  fields: [
    { type: 'tabs', tabs: [
      { label: 'Content', fields: [
        { type: 'row', fields: [
          { name: 'title', type: 'text', required: true, admin: { width: '50%', description: 'Name in this list only. Not shown on the site.' } },
          { name: 'path', type: 'text', required: true, unique: true, admin: { width: '50%', readOnly: true, description: 'The page address. Fixed.' } },
        ] },
        { name: 'slug', type: 'text', required: true, unique: true, admin: { hidden: true } },
        { name: 'template', type: 'select', required: true, admin: { hidden: true },
          options: ['home', 'about', 'team', 'offers', 'contact', 'book', 'hub', 'category', 'service', 'emergency', 'legal', 'sitemap', 'blog'].map(v => ({ label: v, value: v })) },
        { name: 'hero', type: 'group', label: 'Top of page', admin: { condition: (data: any) => !['home', 'legal', 'sitemap', 'blog'].includes(data?.template) },
          fields: [line('h1', 'Headline', undefined, true), { name: 'intro', type: 'textarea', label: 'Intro line' }, imageSlot('hero_image', 'Hero photo')] },
        homeGroup, aboutGroup, offersPageGroup, contactGroup, emergencyGroup, hubGroup, categoryGroup,
        { name: 'sections', type: 'array', label: 'Sections', admin: {
            initCollapsed: true, isSortable: false,
            description: 'The copy sections down the page, in page order. Layout stays as designed; the wording and photos are yours.',
            components: { RowLabel: '@/cms/components/RowLabel#SectionRowLabel' },
            condition: (data: any) => !['home', 'team', 'legal', 'sitemap', 'blog'].includes(data?.template),
          },
          fields: [
            { name: 'key', type: 'text', admin: { hidden: true } },
            line('heading', 'Heading'),
            richBody('body', 'Text'),
            { name: 'hasImage', type: 'checkbox', admin: { hidden: true } },
            { ...imageSlot('image', 'Photo'), admin: { condition: (_: any, sibling: any) => Boolean(sibling?.hasImage) } },
          ] },
        { ...faqArray('faq', 'Frequently asked questions'), admin: { ...faqArray().admin, condition: (data: any) => !['team', 'legal', 'sitemap', 'blog'].includes(data?.template) } },
        { type: 'ui', name: 'teamNote', admin: { condition: (data: any) => data?.template === 'team', components: { Field: '@/cms/components/Note#TeamNote' } } },
      ] },
      { label: 'SEO', fields: seoFields() },
    ] },
  ],
}
