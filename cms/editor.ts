/**
 * Server side of the visual dashboard at /admin.
 *
 * The site's pages are the generator's HTML with data-cms markers (site/). Content lives in
 * the site-content store as one JSON document keyed like those markers. The editor shows a
 * page in an iframe with the markers kept, lets the practice click text and photos to change
 * them, and saves the changed keys back here. Rich text coming back from the browser is run
 * through the same converter the build uses, so whatever the editor sends is stored in the
 * site's own markup (tick lists, numbered steps, button rows).
 */
import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
// @ts-ignore CommonJS helpers shared with the static build
import C from '../lib/content.cjs'
// @ts-ignore
import H from '../lib/html.cjs'
import { htmlToLexical, lexicalToHtml, lexicalToText } from './richtext'

export const ROOT = process.cwd()
const SITE = path.join(ROOT, 'site')
const CONTENT_FILE = path.join(ROOT, 'content', 'site.json')
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'schema.json'), 'utf8'))

// ---------------------------------------------------------------- pages on the site
export type PageInfo = { path: string; title: string; group: string; file: string }

const walk = (dir: string, out: string[] = []) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p) } return out }

export function fileFor(p: string): string | null {
  if (!/^\/[a-z0-9\-/]*$/.test(p) || p.includes('..')) return null
  const f = path.join(SITE, p === '/' ? '' : p.replace(/^\/|\/$/g, ''), 'index.html')
  return fs.existsSync(f) ? f : null
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'")
export function headOf(html: string) {
  return {
    title: decode(/<title>([\s\S]*?)<\/title>/.exec(html)?.[1] || ''),
    description: decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] || ''),
    h1: decode((/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] || '').replace(/<[^>]+>/g, '')).trim(),
  }
}

let pagesCache: PageInfo[] | null = null
// the names used in the site's own menu, so pages are easy to recognise in the dashboard
const NAMES: Record<string, string> = { '/': 'Home', '/about/': 'About Us', '/meet-the-team/': 'Meet the Team', '/special-offers/': 'Special Offers', '/patient-info/': 'Book an Appointment', '/contact/': 'Contact Us', '/services/': 'All Services' }

export function listPages(): PageInfo[] {
  if (pagesCache) return pagesCache
  const out: PageInfo[] = []
  for (const f of walk(SITE).filter(x => x.endsWith('index.html'))) {
    const rel = path.relative(SITE, path.dirname(f)).split(path.sep).filter(Boolean).join('/')
    const p = rel ? `/${rel}/` : '/'
    const html = fs.readFileSync(f, 'utf8')
    if (/class="hero-solid hero-solid--post"/.test(html) || p.startsWith('/blog/')) continue // blog posts and index are edited as posts
    const { h1 } = headOf(html)
    const group = p === '/' || ['/about/', '/meet-the-team/', '/special-offers/', '/patient-info/', '/contact/'].includes(p) ? 'Main pages'
      : p.startsWith('/services/') ? 'Services'
      : 'Other pages'
    const title = NAMES[p] || h1 || rel
    out.push({ path: p, title, group, file: f })
  }
  const order = ['/', '/about/', '/meet-the-team/', '/special-offers/', '/patient-info/', '/contact/']
  out.sort((a, b) => (order.indexOf(a.path) + 1 || 99) - (order.indexOf(b.path) + 1 || 99) || a.path.localeCompare(b.path))
  pagesCache = out
  return out
}

// ---------------------------------------------------------------- content store
export async function loadContent(payload: Payload): Promise<any> {
  const g: any = await payload.findGlobal({ slug: 'site-content', depth: 0, overrideAccess: true })
  if (g?.data && typeof g.data === 'object' && Object.keys(g.data).length) return g.data
  return fs.existsSync(CONTENT_FILE) ? JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')) : {}
}

export async function saveContent(payload: Payload, data: any) {
  await payload.updateGlobal({ slug: 'site-content', data: { data }, overrideAccess: true, depth: 0 })
  try { await payload.updateGlobal({ slug: 'site-status', data: { lastChangedAt: new Date().toISOString() }, overrideAccess: true, depth: 0 }) } catch { /* ignore */ }
}

// ---------------------------------------------------------------- field types
const IDX = C.fieldIndex(SCHEMA)
export function typeForKey(key: string): string {
  const m = /^(.*)\.(\d+)\.([^.]+)$/.exec(key)
  if (m) {
    const def = C.listDefFor(m[1], IDX)
    if (def) return C.typeOf(m[3], null, def)
  }
  if (/_alt$/.test(key)) return 'text'
  return C.typeOf(key, IDX)
}

/** Browser HTML -> the value stored for that key, in the site's own markup. */
export function normalise(key: string, type: string, value: string, opts: any = {}): string {
  if (type === 'html') return lexicalToHtml(htmlToLexical(String(value || '')), { list: opts.list, steps: opts.steps, p: opts.p })
  if (type === 'image' || type === 'url') return String(value || '').trim()
  return H.htmlToInline(String(value || '').replace(/<br\s*\/?>/gi, ' ')).replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------- preview
const BRIDGE = fs.readFileSync(path.join(ROOT, 'cms', 'editor-bridge.js'), 'utf8')

export function renderPreview(p: string, content: any): string | null {
  const file = fileFor(p)
  if (!file) return null
  let html = C.apply(fs.readFileSync(file, 'utf8'), content, SCHEMA, p, { keep: true })
  // tell the editor what kind of field each marker is
  html = html.replace(/\sdata-cms="([^"]+)"/g, (m: string, k: string) => `${m} data-cms-type="${typeForKey(k)}"`)
  // no tracking from the dashboard
  html = html.replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/, '').replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/, '')
  // relative asset paths (../assets) resolve as if the page were at its real address
  html = html.replace('<head>', `<head>\n<base href="${p}">`)
  html = html.replace('</body>', `<script>${BRIDGE}</script>\n</body>`)
  return html
}

export function pageMeta(p: string, content: any) {
  const file = fileFor(p)
  if (!file) return null
  const head = headOf(fs.readFileSync(file, 'utf8'))
  const seo = (content.seo && content.seo[p]) || {}
  return {
    path: p,
    title: listPages().find(x => x.path === p)?.title || head.h1,
    seo: { title: seo.title || head.title, description: seo.description || head.description, og_image: seo.og_image || '', noindex: !!seo.noindex },
    defaults: { title: head.title, description: head.description },
    layout: (content.layout && content.layout[p]) || { order: [], hidden: [] },
  }
}

export function optsForPage(p: string): Record<string, any> {
  const file = fileFor(p)
  return file ? C.collectOpts(fs.readFileSync(file, 'utf8'), {}) : {}
}

// ---------------------------------------------------------------- applying edits
export type Change = { key: string; value: string }

export function applyPageEdits(content: any, p: string, body: { changes?: Change[]; seo?: any; layout?: any }) {
  const opts = optsForPage(p)
  for (const ch of body.changes || []) {
    if (!ch || typeof ch.key !== 'string' || !/^[a-z0-9_.\-]+$/i.test(ch.key)) continue
    const type = typeForKey(ch.key)
    C.set(content, ch.key, normalise(ch.key, type, ch.value, opts[ch.key] || {}))
  }
  if (body.seo) {
    content.seo = content.seo || {}
    const s = body.seo
    content.seo[p] = { title: String(s.title || '').trim(), description: String(s.description || '').trim(), og_image: String(s.og_image || '').trim(), noindex: !!s.noindex }
  }
  if (body.layout) {
    content.layout = content.layout || {}
    const order = (body.layout.order || []).filter((n: any) => Number.isInteger(n))
    const hidden = (body.layout.hidden || []).filter((n: any) => Number.isInteger(n))
    content.layout[p] = { order, hidden }
  }
  return content
}

/** Practice details, team and offers come from forms; html fields are normalised the same way. */
export function applyPatch(content: any, patch: any) {
  const allowed = ['practice', 'hours', 'hours_note', 'announcement', 'team', 'offers']
  for (const k of allowed) {
    if (!(k in patch)) continue
    let v = patch[k]
    if (k === 'team' && Array.isArray(v)) v = v.map((t: any) => ({ name: String(t.name || ''), role: String(t.role || 'Dentist'), photo: String(t.photo || ''), photo_alt: String(t.photo_alt || ''), bio: normalise('team.0.bio', 'html', t.bio || '') }))
    if (k === 'offers' && Array.isArray(v)) v = v.map((o: any) => ({ title: String(o.title || ''), price: String(o.price || ''), note: String(o.note || ''), body: normalise('offers.0.body', 'html', o.body || ''), bullets: String(o.bullets || ''), cta_label: String(o.cta_label || 'Book Now') }))
    if (k === 'hours' && Array.isArray(v)) v = v.map((h: any) => ({ days: String(h.days || ''), time: String(h.time || '') })).filter((h: any) => h.days || h.time)
    content[k] = v
  }
  return content
}

// ---------------------------------------------------------------- blog posts
export async function mediaIndex(payload: Payload) {
  const docs: any[] = (await payload.find({ collection: 'media', limit: 2000, depth: 0, overrideAccess: true })).docs
  const byPath = new Map<string, any>()
  for (const d of docs) { if (d.url) byPath.set(d.url, d.id); if (d.builtinPath) byPath.set(d.builtinPath, d.id) }
  return (src: string) => byPath.get(src) ?? byPath.get(src.replace(/^https?:\/\/[^/]+/, ''))
}

export function postToEditor(p: any) {
  const media = (v: any) => (v && typeof v === 'object' ? { src: v.builtinPath || v.url, alt: v.alt || '', width: v.width, height: v.height } : undefined)
  const slot = p.featuredImage || {}
  const up = slot.upload && typeof slot.upload === 'object' ? slot.upload : null
  return {
    id: p.id, title: p.title || '', slug: p.slug || '', category: p.category || 'Dental Health',
    datePublished: String(p.datePublished || new Date().toISOString()).slice(0, 10),
    excerpt: p.excerpt || '', featuredImage: up ? (up.builtinPath || up.url) : (slot.path || ''), featuredAlt: slot.alt || (up && up.alt) || '',
    body: p.body ? lexicalToHtml(p.body, { article: true, media, mediaIds: true }) : '',
    surgicalDisclaimer: !!p.surgicalDisclaimer, metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '', noindex: !!p.noindex,
    status: p._status || 'draft', updatedAt: p.updatedAt,
  }
}

export async function editorToPost(payload: Payload, e: any) {
  const lookup = await mediaIndex(payload)
  const featured = String(e.featuredImage || '').trim()
  const featuredId = featured ? lookup(featured) : undefined
  const body = htmlToLexical(String(e.body || ''), { mediaByPath: lookup })
  return {
    title: String(e.title || '').trim(),
    slug: String(e.slug || e.title || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90),
    category: String(e.category || 'Dental Health').trim(),
    datePublished: e.datePublished ? new Date(e.datePublished).toISOString() : new Date().toISOString(),
    dateModified: new Date().toISOString(),
    excerpt: String(e.excerpt || '').trim() || lexicalToText(body).slice(0, 180),
    featuredImage: { upload: featuredId ?? null, path: featuredId ? '' : featured, alt: String(e.featuredAlt || '') },
    body,
    surgicalDisclaimer: !!e.surgicalDisclaimer,
    metaTitle: String(e.metaTitle || '').trim(), metaDescription: String(e.metaDescription || '').trim(), noindex: !!e.noindex,
    _status: e.status === 'published' ? 'published' : 'draft',
  }
}

// ---------------------------------------------------------------- publish
export async function triggerPublish(payload: Payload, who: string): Promise<{ ok: boolean; message: string }> {
  const hook = process.env.PUBLISH_HOOK_URL
  if (!hook) return { ok: false, message: 'Saved. The website will update once publishing is connected (PUBLISH_HOOK_URL).' }
  try {
    const r = await fetch(hook, { method: 'POST' })
    if (!r.ok) throw new Error(`deploy hook answered ${r.status}`)
    await payload.updateGlobal({ slug: 'site-status', data: { lastPublishedAt: new Date().toISOString(), lastPublishNote: `Published by ${who}` }, overrideAccess: true })
    return { ok: true, message: 'Saved. Your website will update in about two minutes.' }
  } catch (err: any) {
    return { ok: false, message: `Saved, but the website could not be updated: ${err.message}` }
  }
}
