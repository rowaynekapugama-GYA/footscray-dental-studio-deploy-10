import type { ArrayField, Field, GroupField, RichTextField, TextField } from 'payload'
import { lexicalEditor, BoldFeature, ItalicFeature, LinkFeature, UnorderedListFeature, OrderedListFeature, ParagraphFeature, HeadingFeature, BlockquoteFeature, UploadFeature } from '@payloadcms/richtext-lexical'
import { markChanged } from './hooks/markChanged'

/**
 * A photo slot on the site. Every image spot has a built-in file (the photo the site
 * launched with). Choosing an upload from the media library overrides it; clearing the
 * upload goes back to the built-in file. Alt text defaults to the built-in wording.
 */
export const imageSlot = (name: string, label: string, description?: string): GroupField => ({
  name,
  type: 'group',
  label,
  admin: { description },
  fields: [
    { name: 'upload', type: 'upload', relationTo: 'media', label: 'Photo from the media library',
      admin: { description: 'Leave empty to keep the built-in photo.' } },
    { name: 'path', type: 'text', label: 'Built-in photo', admin: { readOnly: true, description: 'The file the site launched with. Shown when no upload is chosen.' } },
    { name: 'alt', type: 'text', label: 'Alt text (describes the photo for screen readers and Google)' },
  ],
})

/** Section copy: paragraphs, bold, italic, links, tick lists and numbered steps. */
export const bodyEditor = lexicalEditor({
  features: () => [ParagraphFeature(), BoldFeature(), ItalicFeature(), LinkFeature({ enabledCollections: ['pages', 'posts'] }), UnorderedListFeature(), OrderedListFeature()],
})

/** Blog articles: the above plus headings, quotes and images. */
export const articleEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(), HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }), BoldFeature(), ItalicFeature(),
    LinkFeature({ enabledCollections: ['pages', 'posts'] }), UnorderedListFeature(), OrderedListFeature(), BlockquoteFeature(),
    UploadFeature({ collections: { media: { fields: [{ name: 'alt', type: 'text', label: 'Alt text for this article (optional, overrides the library alt)' }] } } }),
  ],
})

export const richBody = (name: string, label: string, description?: string): RichTextField => ({
  name, type: 'richText', label, editor: bodyEditor, admin: { description },
})

export const line = (name: string, label: string, description?: string, required = false): TextField => ({
  name, type: 'text', label, required, admin: { description },
})

export const faqArray = (name = 'faq', label = 'Frequently asked questions'): ArrayField => ({
  name, type: 'array', label,
  admin: { initCollapsed: true, components: { RowLabel: '@/cms/components/RowLabel#FaqRowLabel' } },
  fields: [
    { name: 'question', type: 'text', required: true, label: 'Question' },
    richBody('answer', 'Answer'),
  ],
})

/** SEO tab shared by pages and posts. */
export const seoFields = (opts: { ogImage?: boolean } = {}): Field[] => [
  { name: 'metaTitle', type: 'text', label: 'Title tag', maxLength: 120, admin: { description: 'What Google shows as the blue link. 50 to 60 characters is ideal. Include the practice name.' } },
  { name: 'metaDescription', type: 'textarea', label: 'Meta description', maxLength: 320, admin: { description: 'The grey text under the link in Google. 120 to 160 characters.' } },
  ...(opts.ogImage === false ? [] : [imageSlot('ogImage', 'Social sharing image', 'Shown when the page is shared on Facebook, LinkedIn or by message. 1200 x 630 works best.')]),
  { name: 'noindex', type: 'checkbox', label: 'Hide this page from search engines', defaultValue: false },
]

export const changeHooks = { afterChange: [markChanged] }
