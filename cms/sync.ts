/**
 * Two-way sync between the dashboard (Payload/Postgres) and the files the static build reads.
 *
 *   importContent()  files -> database   (first setup, and "Import from files" on the dashboard)
 *   pullContent()    database -> files   (every build, before the pages are patched)
 *
 * The file side is what build/apply-content.js already understands: content/site.json keyed
 * exactly like the data-cms markers in the pages, plus content/posts.json for the blog,
 * content/seo.json for title tags and descriptions, and content/redirects.json.
 */
import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
import { htmlToLexical, lexicalToHtml, lexicalToText, emptyRoot, cleanHref, type LexRoot } from './richtext'
import { loadMarkdownPosts, mdToHtml } from './blog-md'
// @ts-ignore CommonJS helper shared with the static build
import C from '../lib/content.cjs'

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const SITE = path.join(ROOT, 'site')
const CONTENT = path.join(ROOT, 'content')
const BLOG_MD = path.join(ROOT, 'build', 'blog-content')



type Log = (msg: string) => void

// ---------------------------------------------------------------- small helpers
const readJson = (p: string, fallback: any = null) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback)
const walk = (dir: string, out: string[] = []) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p) } return out }

export function pagePaths(): string[] {
  return walk(SITE).filter(p => p.endsWith('index.html')).map(p => '/' + path.relative(SITE, path.dirname(p)).split(path.sep).filter(Boolean).join('/') + '/').map(p => (p === '//' ? '/' : p)).sort()
}
export const slugOf = (p: string) => (p === '/' ? 'home' : p.replace(/\/$/, '').split('/').pop() as string)

export function templateOf(p: string, blogSlugs: Set<string>): string | null {
  if (p === '/') return 'home'
  if (p === '/about/') return 'about'
  if (p === '/meet-the-team/') return 'team'
  if (p === '/special-offers/') return 'offers'
  if (p === '/contact/') return 'contact'
  if (p === '/patient-info/') return 'book'
  if (p === '/services/') return 'hub'
  if (['/services/general-preventive/', '/services/cosmetic/', '/services/restorative/'].includes(p)) return 'category'
  if (p === '/services/emergency-dentistry/') return 'emergency'
  if (p.startsWith('/services/')) return 'service'
  if (['/privacy-policy/', '/terms/'].includes(p)) return 'legal'
  if (p === '/sitemap/') return 'sitemap'
  if (p === '/blog/') return 'blog'
  if (p.startsWith('/blog/page/')) return null
  if (blogSlugs.has(slugOf(p))) return null
  return null
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
export function headMeta(html: string) {
  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] || ''
  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] || ''
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] || ''
  return { title: decode(title), description: decode(desc), h1: decode(h1.replace(/<[^>]+>/g, '')) }
}

const slot = (p?: string, alt?: string) => ({ upload: null, path: p || '', alt: alt || '' })
const slotPath = (s: any): string => {
  if (!s) return ''
  const up = s.upload
  if (up && typeof up === 'object' && up.url) return up.url
  return s.path || ''
}
const slotAlt = (s: any): string => (s?.alt) || (s?.upload && typeof s.upload === 'object' ? s.upload.alt : '') || ''
const toRich = (html?: string): any => (html ? htmlToLexical(html) : emptyRoot())
const fromRich = (v: any, opts: any = {}) => (v ? lexicalToHtml(v, opts) : '')
const faqIn = (items?: any[]) => (items || []).map(f => ({ question: f.q || '', answer: toRich(f.a) }))
const faqOut = (items?: any[]) => (items || []).map(f => ({ q: f.question || '', a: fromRich(f.answer) }))
const arr = (items: any, key: string) => (items || []).map((x: any) => (typeof x === 'string' ? { [key]: x } : x))

// ---------------------------------------------------------------- IMPORT (files -> db)
export async function importContent(payload: Payload, opts: { overwrite?: boolean; log?: Log } = {}) {
  const log = opts.log || (() => {})
  const overwrite = Boolean(opts.overwrite)
  const content = readJson(path.join(CONTENT, 'site.json'))
  if (!content) throw new Error('content/site.json is missing. Run: node build/apply-content.js extract')
  const mdPosts = fs.existsSync(BLOG_MD) ? loadMarkdownPosts(BLOG_MD) : []
  const blogSlugs = new Set(mdPosts.map(p => p.data.slug))
  const counts = { pages: 0, posts: 0, team: 0, offers: 0, media: 0, skipped: 0 }

  // ---- site settings
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  if (overwrite || !settings?.practice?.phone) {
    await payload.updateGlobal({ slug: 'site-settings', data: {
      practice: content.practice || {},
      hours: content.hours || [], hours_note: content.hours_note || '',
      announcement: content.announcement || { enabled: false, text: '', link: '' },
    } })
    log('site settings imported')
  }

  // ---- media: blog images (inline figures need a library item to be editable)
  const mediaByPath = new Map<string, number>()
  const existingMedia = await payload.find({ collection: 'media', limit: 1000, depth: 0 })
  for (const m of existingMedia.docs as any[]) if (m.builtinPath) mediaByPath.set(m.builtinPath, m.id)
  const blogImgDir = path.join(SITE, 'assets', 'img', 'blog')
  if (fs.existsSync(blogImgDir)) {
    const altByLocal = new Map<string, string>()
    for (const p of mdPosts) for (const im of p.data.images) if (im.local) altByLocal.set(im.local, im.alt || '')
    for (const f of fs.readdirSync(blogImgDir).sort()) {
      const rel = `/assets/img/blog/${f}`
      if (mediaByPath.has(rel) || !/\.(webp|jpe?g|png|gif)$/i.test(f)) continue
      try {
        const doc: any = await payload.create({ collection: 'media', data: { alt: altByLocal.get(f) || f.replace(/\.[a-z]+$/i, '').replace(/-/g, ' '), builtinPath: rel }, filePath: path.join(blogImgDir, f) })
        mediaByPath.set(rel, doc.id); counts.media++
      } catch (e: any) { log(`media ${f}: ${e.message}`) }
    }
  }

  // ---- pages
  const existingPages = new Map<string, any>()
  for (const d of (await payload.find({ collection: 'pages', limit: 500, depth: 0 })).docs as any[]) existingPages.set(d.path, d)
  for (const p of pagePaths()) {
    const template = templateOf(p, blogSlugs)
    if (!template) continue
    const slug = slugOf(p)
    const html = fs.readFileSync(path.join(SITE, p === '/' ? '' : p.slice(1), 'index.html'), 'utf8')
    const meta = headMeta(html)
    const pg = (content.pages && content.pages[slug]) || {}
    const data: any = {
      title: meta.h1 || slug, path: p, slug, template,
      metaTitle: meta.title, metaDescription: meta.description, noindex: false,
      hero: { h1: pg.h1 || meta.h1 || '', intro: pg.intro || '', hero_image: slot(pg.hero_image) },
      sections: (pg.sections || []).map((s: any, i: number) => ({ key: String(i), heading: s.heading || '', body: toRich(s.body), hasImage: 'image' in s, image: slot(s.image) })),
      faq: faqIn(pg.faq),
    }
    if (template === 'home') {
      const h = content.home || {}
      const service_cards = []
      for (let i = 1; i <= 6; i++) service_cards.push({ title: h[`service_${i}_title`] || '', desc: h[`service_${i}_desc`] || '' })
      data.home = {
        h1: h.h1, hero_intro: h.hero_intro, hero_image: slot(h.hero_image), trust_line: h.trust_line,
        stat_label: h.stat_label, stat_number: h.stat_number, stat_text: h.stat_text, chips_title: h.chips_title, chips: arr(h.chips, 'label'),
        funds_caption: h.funds_caption, welcome_eyebrow: h.welcome_eyebrow, welcome_lead: h.welcome_lead, welcome_statement: h.welcome_statement,
        float_image_1: slot(h.float_image_1), float_image_2: slot(h.float_image_2),
        services_heading: h.services_heading, services_intro: h.services_intro, service_cards,
        why_heading: h.why_heading, why_text: toRich(h.why_text), features: h.features || [],
        story_heading: h.story_heading, story_text: toRich(h.story_text), story_image: slot(h.story_image),
        offers_heading: h.offers_heading, visit_heading: h.visit_heading, visit_intro: h.visit_intro,
      }
      data.faq = faqIn(h.faq)
      data.hero = { h1: h.h1 || meta.h1, intro: h.hero_intro || '', hero_image: slot(h.hero_image) }
    }
    if (template === 'about') {
      const a = content.about || {}
      data.about = { story_heading: a.story_heading, story: toRich(a.story), philosophy_heading: a.philosophy_heading, philosophy_text: toRich(a.philosophy_text), philosophy_image: slot(a.philosophy_image),
        tech_heading: a.tech_heading, tech_intro: a.tech_intro, tech_cards: a.tech_cards || [], tech_outro: a.tech_outro,
        continuity_heading: a.continuity_heading, continuity_text: toRich(a.continuity_text), continuity_image: slot(a.continuity_image), visit_heading: a.visit_heading, visit_text: a.visit_text }
      data.faq = faqIn(a.faq)
    }
    if (template === 'offers') {
      const o = content.offers_page || {}
      data.offers_page = { intro_heading: o.intro_heading, intro: toRich(o.intro), footnote: o.footnote }
      data.faq = faqIn(o.faq)
    }
    if (template === 'contact') {
      const c = content.contact || {}
      data.contact = { find_text: c.find_text, message_heading: c.message_heading, message_text: c.message_text, emergency_heading: c.emergency_heading, emergency_text: c.emergency_text }
      data.faq = faqIn(c.faq)
    }
    if (template === 'emergency') data.emergency = { banner: pg.banner, wait_heading: pg.wait_heading, wait_cards: pg.wait_cards || [], wait_note: pg.wait_note, seen_heading: pg.seen_heading, seen_body: toRich(pg.seen_body) }
    if (template === 'hub') data.hub = { category_cards: pg.category_cards || [], extra_cards: pg.extra_cards || [] }
    if (template === 'category') data.category = { cards_heading: pg.cards_heading, cards: pg.cards || [] }

    const ex = existingPages.get(p)
    if (ex && !overwrite) { counts.skipped++; continue }
    if (ex) await payload.update({ collection: 'pages', id: ex.id, data })
    else await payload.create({ collection: 'pages', data })
    counts.pages++
  }

  // ---- team
  const team = await payload.find({ collection: 'team', limit: 100, depth: 0 })
  if (overwrite || team.totalDocs === 0) {
    for (const d of team.docs as any[]) await payload.delete({ collection: 'team', id: d.id })
    for (const [i, t] of (content.team || []).entries()) {
      await payload.create({ collection: 'team', data: { name: t.name, role: t.role || 'Dentist', order: i + 1, photo: slot(t.photo, t.name), bio: toRich(t.bio) } })
      counts.team++
    }
  }
  // ---- offers
  const offers = await payload.find({ collection: 'offers', limit: 100, depth: 0 })
  if (overwrite || offers.totalDocs === 0) {
    for (const d of offers.docs as any[]) await payload.delete({ collection: 'offers', id: d.id })
    for (const [i, o] of (content.offers || []).entries()) {
      const bullets = String(o.bullets || '').split('\n').map((s: string) => s.trim()).filter(Boolean).map((text: string) => ({ text }))
      await payload.create({ collection: 'offers', data: { title: o.title, price: o.price || '', note: o.note || '', body: toRich(o.body), bullets, cta_label: o.cta_label || 'Book Now', order: i + 1 } })
      counts.offers++
    }
  }
  // ---- posts (from markdown; only ones not in the database yet, or all when overwriting)
  const existingPosts = new Map<string, any>()
  for (const d of (await payload.find({ collection: 'posts', limit: 500, depth: 0, draft: true })).docs as any[]) existingPosts.set(d.slug, d)
  const created: { slug: string; id: any; related: string[] }[] = []
  for (const p of mdPosts) {
    const d = p.data
    const ex = existingPosts.get(d.slug)
    if (ex && !overwrite) { created.push({ slug: d.slug, id: ex.id, related: d.related }); continue }
    const html = mdToHtml(p.body, () => undefined)
    const body = htmlToLexical(html, { mediaByPath: (src) => mediaByPath.get(src) })
    const data: any = {
      title: d.h1, slug: d.slug, category: d.category, datePublished: d.date_published, dateModified: d.date_modified !== d.date_published ? d.date_modified : null,
      excerpt: d.excerpt, featuredImage: slot(d.featured_image, d.featured_alt), body, surgicalDisclaimer: d.surgical_disclaimer,
      metaTitle: d.title, metaDescription: d.meta_description, noindex: false, _status: 'published',
    }
    const doc: any = ex ? await payload.update({ collection: 'posts', id: ex.id, data }) : await payload.create({ collection: 'posts', data })
    created.push({ slug: d.slug, id: doc.id, related: d.related }); counts.posts++
  }
  const idBySlug = new Map(created.map(c => [c.slug, c.id]))
  for (const c of created) {
    const rel = c.related.map(s => idBySlug.get(s)).filter(Boolean).slice(0, 3)
    if (rel.length) await payload.update({ collection: 'posts', id: c.id, data: { related: rel } })
  }

  await payload.updateGlobal({ slug: 'site-status', data: { lastImportedAt: new Date().toISOString() } })
  log(`imported: ${JSON.stringify(counts)}`)
  return counts
}

// ---------------------------------------------------------------- PULL (db -> files)
export async function pullContent(payload: Payload, opts: { log?: Log; write?: boolean } = {}) {
  const log = opts.log || (() => {})
  const write = opts.write !== false
  const optsByKey: Record<string, any> = {}
  for (const p of walk(SITE).filter(f => f.endsWith('.html'))) C.collectOpts(fs.readFileSync(p, 'utf8'), optsByKey)
  const rich = (key: string, v: any) => fromRich(v, optsByKey[key] || {})

  const settings: any = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const site: any = {
    practice: settings.practice || {},
    hours: (settings.hours || []).map((h: any) => ({ days: h.days, time: h.time })),
    hours_note: settings.hours_note || '',
    announcement: settings.announcement || { enabled: false },
    pages: {}, seo: {},
  }

  const pages: any[] = (await payload.find({ collection: 'pages', limit: 500, depth: 2 })).docs
  if (!pages.length) {
    log('the database has no pages yet (run Import from files on the dashboard); keeping the committed content files')
    return null
  }
  for (const d of pages) {
    const slug = d.slug
    const pg: any = { h1: d.hero?.h1 || '', intro: d.hero?.intro || '', hero_image: slotPath(d.hero?.hero_image) }
    pg.sections = (d.sections || []).map((s: any, i: number) => {
      const key = `pages.${slug}.sections.${i}`
      const o: any = { heading: s.heading || '', body: rich(`${key}.body`, s.body) }
      if (s.hasImage) o.image = slotPath(s.image)
      return o
    })
    pg.faq = faqOut(d.faq)
    if (d.template === 'home') {
      const h = d.home || {}
      const home: any = { ...h }
      delete home.service_cards
      for (const [i, c] of (h.service_cards || []).entries()) { home[`service_${i + 1}_title`] = c.title; home[`service_${i + 1}_desc`] = c.desc }
      home.hero_image = slotPath(h.hero_image); home.float_image_1 = slotPath(h.float_image_1); home.float_image_2 = slotPath(h.float_image_2); home.story_image = slotPath(h.story_image)
      home.why_text = rich('home.why_text', h.why_text); home.story_text = rich('home.story_text', h.story_text)
      home.chips = (h.chips || []).map((c: any) => ({ label: c.label }))
      home.features = (h.features || []).map((c: any) => ({ title: c.title, text: c.text }))
      home.faq = pg.faq
      site.home = home
    } else if (d.template === 'about') {
      const a = d.about || {}
      site.about = { ...a, story: rich('about.story', a.story), philosophy_text: rich('about.philosophy_text', a.philosophy_text), continuity_text: rich('about.continuity_text', a.continuity_text),
        philosophy_image: slotPath(a.philosophy_image), continuity_image: slotPath(a.continuity_image), tech_cards: (a.tech_cards || []).map((c: any) => ({ title: c.title, text: c.text })), faq: pg.faq }
    } else if (d.template === 'offers') {
      const o = d.offers_page || {}
      site.offers_page = { intro_heading: o.intro_heading, intro: rich('offers_page.intro', o.intro), footnote: o.footnote, faq: pg.faq }
    } else if (d.template === 'contact') {
      site.contact = { ...(d.contact || {}), faq: pg.faq }
    } else if (d.template === 'emergency') {
      const e = d.emergency || {}
      Object.assign(pg, { banner: e.banner, wait_heading: e.wait_heading, wait_cards: (e.wait_cards || []).map((c: any) => ({ title: c.title, text: c.text })), wait_note: e.wait_note, seen_heading: e.seen_heading, seen_body: rich('pages.emergency-dentistry.seen_body', e.seen_body) })
    } else if (d.template === 'hub') {
      Object.assign(pg, { category_cards: (d.hub?.category_cards || []).map((c: any) => ({ title: c.title, text: c.text })), extra_cards: (d.hub?.extra_cards || []).map((c: any) => ({ title: c.title, text: c.text })) })
    } else if (d.template === 'category') {
      Object.assign(pg, { cards_heading: d.category?.cards_heading, cards: (d.category?.cards || []).map((c: any) => ({ title: c.title, text: c.text })) })
    }
    if (d.template !== 'home') site.pages[slug] = pg
    site.seo[d.path] = { title: d.metaTitle || '', description: d.metaDescription || '', og_image: slotPath(d.ogImage), noindex: Boolean(d.noindex) }
  }

  const team: any[] = (await payload.find({ collection: 'team', limit: 100, depth: 1, sort: 'order', where: { hidden: { not_equals: true } } })).docs
  site.team = team.map(t => ({ name: t.name, role: t.role, photo: slotPath(t.photo), bio: fromRich(t.bio) }))

  const today = new Date().toISOString().slice(0, 10)
  const offers: any[] = (await payload.find({ collection: 'offers', limit: 100, depth: 0, sort: 'order' })).docs
  site.offers = offers
    .filter(o => !o.hidden && (!o.startDate || o.startDate.slice(0, 10) <= today) && (!o.endDate || o.endDate.slice(0, 10) >= today))
    .map(o => ({ title: o.title, price: o.price || '', note: o.note || '', body: fromRich(o.body), bullets: (o.bullets || []).map((b: any) => b.text).join('\n'), cta_label: o.cta_label || 'Book Now' }))

  const posts: any[] = (await payload.find({ collection: 'posts', limit: 500, depth: 2, sort: '-datePublished', where: { _status: { equals: 'published' } } })).docs
  const media = (id: any) => {
    const m = id && typeof id === 'object' ? id : null
    // imported launch images keep their original address so nothing on the live pages changes
    return m ? { src: m.builtinPath || m.url, alt: m.alt || '', width: m.width, height: m.height } : undefined
  }
  const postsJson = posts.map(p => ({
    slug: p.slug, h1: p.title, title: p.metaTitle || `${p.title} | Footscray Dental Studio`, meta_description: p.metaDescription || p.excerpt,
    date_published: String(p.datePublished).slice(0, 10), date_modified: String(p.dateModified || p.datePublished).slice(0, 10),
    category: p.category, excerpt: p.excerpt,
    featured_image: slotPath(p.featuredImage) || '/assets/img/hero-home.jpg', featured_alt: slotAlt(p.featuredImage) || p.title,
    surgical_disclaimer: Boolean(p.surgicalDisclaimer), noindex: Boolean(p.noindex),
    related: (p.related || []).map((r: any) => (typeof r === 'object' ? r.slug : null)).filter(Boolean),
    body_html: lexicalToHtml(p.body, { article: true, media }),
    faq_text: [] as any[],
  }))

  const redirects: any[] = (await payload.find({ collection: 'redirects', limit: 500, depth: 0 })).docs
  const redirectsJson = redirects.map(r => ({ from: r.from, to: r.to, type: r.type || '301' }))

  if (write) {
    fs.mkdirSync(CONTENT, { recursive: true })
    fs.writeFileSync(path.join(CONTENT, 'site.json'), JSON.stringify(site, null, 2) + '\n')
    fs.writeFileSync(path.join(CONTENT, 'posts.json'), JSON.stringify(postsJson, null, 2) + '\n')
    fs.writeFileSync(path.join(CONTENT, 'redirects.json'), JSON.stringify(redirectsJson, null, 2) + '\n')
    log(`pulled: ${pages.length} pages, ${postsJson.length} posts, ${site.team.length} team, ${site.offers.length} offers, ${redirectsJson.length} redirects`)
  }
  return { site, posts: postsJson, redirects: redirectsJson }
}
