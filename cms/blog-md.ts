/**
 * The 32 launch articles live as markdown in build/blog-content (front matter + body).
 * This is a line-for-line port of build/blog.py's parser and markdown renderer, used
 * once at import time to load them into the dashboard, and by the parity test.
 */
import fs from 'fs'
import path from 'path'

export type PostMeta = {
  slug: string; h1: string; title: string; meta_description: string; date_published: string; date_modified: string
  category: string; excerpt: string; featured_image: string; featured_alt: string; surgical_disclaimer: boolean
  related: string[]; images: { old: string; local?: string; alt?: string }[]; [k: string]: any
}

export function parseFrontMatter(text: string): { data: PostMeta; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text)
  if (!m) throw new Error('missing frontmatter')
  const [, raw, body] = m
  const data: any = {}
  let key: string | null = null
  const lines = raw.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (line.startsWith('  ') && key === 'images') {
      const block: string[] = []
      while (i < lines.length && (lines[i].startsWith('  ') || !lines[i].trim())) { block.push(lines[i]); i++ }
      const imgs: any[] = []; let cur: any = null
      for (const b of block) {
        const bm = /^\s*-\s*old:\s*(.*)$/.exec(b)
        if (bm) { cur = { old: bm[1].trim() }; imgs.push(cur); continue }
        const km = /^\s*(local|alt):\s*(.*)$/.exec(b)
        if (km && cur) cur[km[1]] = km[2].trim()
      }
      data.images = imgs
      continue
    }
    const km = /^([a-z_][a-z0-9_]*):\s*(.*)$/.exec(line)
    if (km) { key = km[1]; if (key !== 'images') data[key] = km[2].trim() }
    i++
  }
  data.images = data.images || []
  data.related = String(data.related || '').match(/[\w-]+/g) || []
  data.surgical_disclaimer = String(data.surgical_disclaimer || '').toLowerCase() === 'true'
  return { data, body: body.trim() }
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttrQ = (s: string) => escapeHtml(s).replace(/"/g, '&quot;')

function inline(s: string): string {
  s = escapeHtml(s)
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(?<![\w*])\*([^*\n]+?)\*(?![\w*])/g, '<em>$1</em>')
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`)
  return s
}

/** Markdown -> HTML exactly as build/blog.py wrote it. dims(src) gives the image's pixel size. */
export function mdToHtml(md: string, dims: (src: string) => { width: number; height: number } | undefined): string {
  const out: string[] = []
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const im = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line.trim())
    if (im) {
      const [, alt, src] = im
      const d = dims(src)
      const dimsAttr = d ? ` width="${d.width}" height="${d.height}"` : ''
      const cls = d && d.width < 600 ? 'post-figure post-figure--small' : 'post-figure'
      out.push(`<figure class="${cls}"><img src="${src}" alt="${escapeAttrQ(alt)}"${dimsAttr} loading="lazy" decoding="async" onerror="this.closest('figure').remove()"></figure>`)
      i++; continue
    }
    const hm = /^(#{2,4})\s+(.*)$/.exec(line)
    if (hm) {
      const lvl = hm[1].length, txt = hm[2].trim()
      const hid = txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
      out.push(`<h${lvl} id="${hid}">${inline(txt)}</h${lvl}>`)
      i++; continue
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(inline(lines[i].replace(/^[-*]\s+/, '').trim())); i++ }
      out.push('<ul>' + items.map(x => `<li>${x}</li>`).join('') + '</ul>')
      continue
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) { items.push(inline(lines[i].replace(/^\d+[.)]\s+/, '').trim())); i++ }
      out.push('<ol>' + items.map(x => `<li>${x}</li>`).join('') + '</ol>')
      continue
    }
    if (line.trim().startsWith('>')) {
      const q: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) { q.push(inline(lines[i].trim().replace(/^>\s?/, '').trim())); i++ }
      out.push('<blockquote><p>' + q.join(' ') + '</p></blockquote>')
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|[-*]\s|\d+[.)]\s|>|!\[)/.test(lines[i])) { para.push(lines[i].trim()); i++ }
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
  }
  return out.join('\n')
}

export function loadMarkdownPosts(dir: string): { data: PostMeta; body: string }[] {
  return fs.readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_')).sort()
    .map(f => parseFrontMatter(fs.readFileSync(path.join(dir, f), 'utf8')))
}
