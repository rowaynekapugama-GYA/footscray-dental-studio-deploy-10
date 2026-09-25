/**
 * Rich text <-> site markup.
 *
 * The dashboard edits copy in Payload's Lexical editor. The pages, though, are the
 * generator's HTML: tick lists are <ul class="feature-list">, numbered steps are
 * <ol class="steps steps--grid">, a row of bold links is a <div class="btn-row"> of
 * buttons. This module converts both ways so that:
 *
 *   - import:  existing page HTML -> Lexical JSON (what the editor opens)
 *   - publish: Lexical JSON -> the same HTML the generator wrote
 *
 * Untouched content round-trips byte for byte, which is how pixel parity is proven.
 * Editor conventions that map onto site styles:
 *   bullet list          -> tick list
 *   numbered list        -> numbered steps (a bold lead-in on each step is the step title)
 *   paragraph of bold links -> button row (first button dark, the rest outlined)
 *   paragraph entirely in italics -> small print (.small-note)
 */

export type LexNode = { type: string; [k: string]: any }
export type LexRoot = { root: LexNode }

export const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
export const ICON_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>'

const BOLD = 1, ITALIC = 2

// ---------------------------------------------------------------- node builders
const base = (type: string, extra: any = {}) => ({ type, format: '', indent: 0, version: 1, direction: 'ltr', ...extra })
export const text = (t: string, format = 0): LexNode => ({ type: 'text', text: t, format, style: '', mode: 'normal', detail: 0, version: 1 })
export const paragraph = (children: LexNode[]): LexNode => base('paragraph', { textFormat: 0, textStyle: '', children })
export const link = (url: string, children: LexNode[], newTab = false): LexNode =>
  base('link', { version: 3, fields: { linkType: 'custom', url, newTab }, children })
export const list = (ordered: boolean, items: LexNode[][]): LexNode =>
  base('list', { listType: ordered ? 'number' : 'bullet', tag: ordered ? 'ol' : 'ul', start: 1,
    children: items.map((ch, i) => base('listitem', { value: i + 1, children: ch })) })
export const heading = (tag: string, children: LexNode[]): LexNode => base('heading', { tag, children })
export const quote = (children: LexNode[]): LexNode => base('quote', { children })
export const upload = (id: number | string, extra: any = {}): LexNode => ({ type: 'upload', relationTo: 'media', value: id, fields: null, format: '', version: 3, ...extra })
export const root = (children: LexNode[]): LexRoot => ({ root: base('root', { children }) })

export const emptyRoot = (): LexRoot => root([paragraph([])])

// ---------------------------------------------------------------- escaping (matches the generator, which escapes nothing it did not have to)
export function decodeEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp|#(\d+)|#x([0-9a-f]+));/gi, (m, name, dec, hex) => {
    if (dec) return String.fromCodePoint(parseInt(dec, 10))
    if (hex) return String.fromCodePoint(parseInt(hex, 16))
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' } as any)[name.toLowerCase()] ?? m
  })
}
/** Escape text the way a browser needs it, without touching a bare "&" the pages already use. */
export function escapeText(s: string): string {
  return s.replace(/&(?=[a-zA-Z#][a-zA-Z0-9]*;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
export function escapeAttr(s: string): string {
  return s.replace(/&(?=[a-zA-Z#][a-zA-Z0-9]*;)/g, '&amp;').replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------- HTML -> Lexical
type Tok = { tag: string; attrs: string; close: boolean; self: boolean; text?: string }

function tokenize(html: string): Tok[] {
  const out: Tok[] = []
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) out.push({ tag: '', attrs: '', close: false, self: false, text: m[3] })
    else out.push({ tag: m[1].toLowerCase(), attrs: m[2] || '', close: m[0].startsWith('</'), self: /\/\s*$/.test(m[2] || '') || ['img', 'br', 'path', 'hr'].includes(m[1].toLowerCase()) })
  }
  return out
}
const attr = (attrs: string, name: string) => {
  const m = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`).exec(attrs)
  return m ? decodeEntities(m[2] ?? m[3] ?? '') : undefined
}

/** Parse inline children (text, strong, em, a, span wrappers, svg dropped) until the closing tag of `until`. */
function parseInline(toks: Tok[], i: number, until: string, fmt = 0, mediaByPath?: (p: string) => number | undefined): [LexNode[], number] {
  const out: LexNode[] = []
  const push = (n: LexNode) => {
    const last = out[out.length - 1]
    if (n.type === 'text' && last && last.type === 'text' && last.format === n.format) last.text += n.text
    else out.push(n)
  }
  while (i < toks.length) {
    const t = toks[i]
    if (t.text !== undefined) { push(text(decodeEntities(t.text), fmt)); i++; continue }
    if (t.close) { if (t.tag === until) return [out, i + 1]; i++; continue }
    if (t.tag === 'strong' || t.tag === 'b') { const [ch, j] = parseInline(toks, i + 1, t.tag, fmt | BOLD, mediaByPath); ch.forEach(push); i = j; continue }
    if (t.tag === 'em' || t.tag === 'i') { const [ch, j] = parseInline(toks, i + 1, t.tag, fmt | ITALIC, mediaByPath); ch.forEach(push); i = j; continue }
    if (t.tag === 'a') {
      const href = cleanHref(attr(t.attrs, 'href') || '')
      const newTab = /target="_blank"/.test(t.attrs)
      const [ch, j] = parseInline(toks, i + 1, 'a', fmt, mediaByPath)
      // a button (class="btn ...") is a bold link; drop any leading icon
      const isBtn = /class="btn\b/.test(t.attrs)
      const kids = ch.filter(c => c.type === 'text').map(c => isBtn ? text(c.text.replace(/^\s+/, ''), c.format | BOLD) : c)
      out.push(link(href, kids, newTab)); i = j; continue
    }
    if (t.tag === 'svg') { // skip icon entirely
      let depth = 0
      for (; i < toks.length; i++) { if (toks[i].tag === 'svg' && !toks[i].close && !toks[i].self) depth++; if (toks[i].tag === 'svg' && toks[i].close) { depth--; if (depth === 0) { i++; break } } }
      continue
    }
    if (t.tag === 'span' || t.tag === 'div') { const [ch, j] = parseInline(toks, i + 1, t.tag, fmt, mediaByPath); ch.forEach(push); i = j; continue }
    if (t.tag === 'br') { push(text('\n', fmt)); i++; continue }
    if (t.self) { i++; continue }
    // unknown inline tag: descend
    const [ch, j] = parseInline(toks, i + 1, t.tag, fmt, mediaByPath); ch.forEach(push); i = j
  }
  return [out, i]
}

/** The generated pages use relative links (../../x/index.html) so they open from disk; the CMS keeps clean root-relative ones. */
export function cleanHref(href: string): string {
  if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) return href
  let h = href.replace(/^(\.\.\/)+/, '/').replace(/^(?!\/)/, '/')
  h = h.replace(/index\.html$/, '')
  if (h === '/index.html' || h === '') h = '/'
  return h
}

/** Trim leading/trailing whitespace of an inline run (the generator never keeps it). */
function trimInline(nodes: LexNode[]): LexNode[] {
  const n = nodes.map(x => ({ ...x }))
  if (n.length && n[0].type === 'text') n[0].text = n[0].text.replace(/^\s+/, '')
  if (n.length && n[n.length - 1].type === 'text') n[n.length - 1].text = n[n.length - 1].text.replace(/\s+$/, '')
  return n.filter(x => !(x.type === 'text' && x.text === ''))
}

export type HtmlToLexicalOpts = { mediaByPath?: (src: string) => number | undefined }

/**
 * Site HTML (section bodies, FAQ answers, bios, blog posts) -> Lexical.
 * Handles p, ul/ol (both the site's tick/steps classes and plain lists), div.btn-row,
 * h2-h4, blockquote, figure/img (blog) and inline strong/em/a.
 */
export function htmlToLexical(html: string, opts: HtmlToLexicalOpts = {}): LexRoot {
  const toks = tokenize(html)
  const blocks: LexNode[] = []
  let i = 0
  while (i < toks.length) {
    const t = toks[i]
    if (t.text !== undefined) { // stray text between blocks (whitespace)
      if (t.text.trim()) blocks.push(paragraph(trimInline([text(decodeEntities(t.text))])))
      i++; continue
    }
    if (t.close) { i++; continue }
    if (t.tag === 'p') {
      const cls = attr(t.attrs, 'class') || ''
      const [ch, j] = parseInline(toks, i + 1, 'p', 0, opts.mediaByPath)
      let kids = trimInline(ch)
      if (/\bsmall-note\b/.test(cls)) kids = kids.map(k => k.type === 'text' ? { ...k, format: k.format | ITALIC } : k)
      blocks.push(paragraph(kids)); i = j; continue
    }
    if (t.tag === 'div' && /btn-row/.test(attr(t.attrs, 'class') || '')) {
      const [ch, j] = parseInline(toks, i + 1, 'div', 0, opts.mediaByPath)
      blocks.push(paragraph(trimInline(ch).filter(c => c.type === 'link'))); i = j; continue
    }
    if (t.tag === 'ul' || t.tag === 'ol') {
      const items: LexNode[][] = []
      let j = i + 1
      while (j < toks.length && !(toks[j].tag === t.tag && toks[j].close)) {
        if (toks[j].tag === 'li' && !toks[j].close) {
          const [ch, k] = parseInline(toks, j + 1, 'li', 0, opts.mediaByPath)
          items.push(trimInline(ch)); j = k
        } else j++
      }
      blocks.push(list(t.tag === 'ol', items)); i = j + 1; continue
    }
    if (/^h[1-6]$/.test(t.tag)) {
      const [ch, j] = parseInline(toks, i + 1, t.tag, 0, opts.mediaByPath)
      blocks.push(heading(t.tag, trimInline(ch))); i = j; continue
    }
    if (t.tag === 'blockquote') {
      const [ch, j] = parseInline(toks, i + 1, 'blockquote', 0, opts.mediaByPath)
      blocks.push(quote(trimInline(ch))); i = j; continue
    }
    if (t.tag === 'figure' || t.tag === 'img') {
      // find the img inside
      let j = i, src = '', alt = ''
      for (; j < toks.length; j++) {
        if (toks[j].tag === 'img') { src = attr(toks[j].attrs, 'src') || ''; alt = attr(toks[j].attrs, 'alt') || ''; if (t.tag === 'img') { j++; break } }
        if (t.tag === 'figure' && toks[j].tag === 'figure' && toks[j].close) { j++; break }
      }
      const id = opts.mediaByPath ? opts.mediaByPath(src) : undefined
      if (id !== undefined) blocks.push(upload(id, { fields: alt ? { alt } : null }))
      else blocks.push(paragraph([])) // image the library does not hold; keep a slot so nothing shifts
      i = j; continue
    }
    if (t.tag === 'div' || t.tag === 'span' || t.tag === 'section' || t.tag === 'aside') { i++; continue } // transparent wrappers
    if (t.self) { i++; continue }
    i++
  }
  if (!blocks.length) blocks.push(paragraph([]))
  return root(blocks)
}

// ---------------------------------------------------------------- Lexical -> HTML
export type LexicalToHtmlOpts = {
  /** '1col' keeps tick lists single column (split sections); 'auto' = two columns when more than 3 items */
  list?: '1col' | 'auto'
  /** 'grid' always lays steps out as a grid; 'auto' = grid when 4 or more */
  steps?: 'grid' | 'auto'
  /** 'narrow' caps paragraph width (the steps sections do this inline) */
  p?: 'narrow'
  /** blog articles: plain ul/ol, headings with ids, figures */
  article?: boolean
  /** resolve an upload node to {src, alt, width, height} */
  media?: (id: any) => { src: string; alt: string; width?: number; height?: number } | undefined
  /** join blocks with this string (the generator uses "" in bodies and "\n" in articles) */
  joiner?: string
}

function inlineHtml(nodes: LexNode[], article = false): string {
  let out = ''
  for (const n of nodes) {
    if (n.type === 'text') {
      let s = escapeText(n.text || '')
      if (n.format & BOLD) s = `<strong>${s}</strong>`
      if (n.format & ITALIC) s = `<em>${s}</em>`
      out += s
    } else if (n.type === 'link' || n.type === 'autolink') {
      const url = n.fields?.url || (n.fields?.doc ? docUrl(n.fields.doc) : '') || '#'
      const ext = article && /^https?:\/\//i.test(url)
      const kids: LexNode[] = n.children || []
      // the generator writes **[label](url)** as <strong><a>label</a></strong>
      const allBold = !article && kids.length > 0 && kids.every(k => k.type === 'text' && (k.format & BOLD))
      const inner = allBold ? inlineHtml(kids.map(k => ({ ...k, format: k.format & ~BOLD })), article) : inlineHtml(kids, article)
      const a = `<a href="${escapeAttr(url)}"${ext || n.fields?.newTab ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>`
      out += allBold ? `<strong>${a}</strong>` : a
    } else if (n.type === 'linebreak') {
      out += '<br>'
    } else if (n.children) {
      out += inlineHtml(n.children, article)
    }
  }
  return out
}
function docUrl(doc: any): string {
  const v = doc?.value
  if (v && typeof v === 'object') return v.path || (v.slug ? `/${v.slug}/` : '')
  return ''
}
const isBoldLinkPara = (p: LexNode) => {
  const kids = (p.children || []).filter((c: LexNode) => !(c.type === 'text' && !c.text.trim()))
  return kids.length > 0 && kids.every((c: LexNode) => c.type === 'link' && (c.children || []).length && (c.children || []).every((t: LexNode) => t.type === 'text' && (t.format & BOLD)))
}
const isItalicPara = (p: LexNode) => {
  const kids = (p.children || []).filter((c: LexNode) => !(c.type === 'text' && !c.text.trim()))
  return kids.length > 0 && kids.every((c: LexNode) => c.type === 'text' && (c.format & ITALIC))
}
const plainText = (nodes: LexNode[]): string => nodes.map(n => n.type === 'text' ? n.text : plainText(n.children || [])).join('')
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export function lexicalToHtml(data: LexRoot | null | undefined, opts: LexicalToHtmlOpts = {}): string {
  const blocks = data?.root?.children || []
  const out: string[] = []
  const joiner = opts.joiner ?? (opts.article ? '\n' : '')
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      const kids = b.children || []
      if (!kids.length || !plainText(kids).trim()) continue
      if (!opts.article && isBoldLinkPara(b)) {
        const links = kids.filter((c: LexNode) => c.type === 'link')
        out.push('<div class="btn-row">' + links.map((l: LexNode, idx: number) => {
          const label = plainText(l.children || [])
          const cls = idx === 0 ? 'btn--navy' : 'btn--outline'
          const ic = /call/i.test(label) ? ICON_PHONE + ' ' : ''
          const url = l.fields?.url || docUrl(l.fields?.doc) || '/patient-info/'
          return `<a class="btn ${cls}" href="${escapeAttr(url)}">${ic}${escapeText(label)}</a>`
        }).join('') + '</div>')
        continue
      }
      if (!opts.article && isItalicPara(b)) {
        out.push(`<p class="small-note">${escapeText(plainText(kids))}</p>`)
        continue
      }
      out.push(`<p${opts.p === 'narrow' ? ' style="max-width:46rem"' : ''}>${inlineHtml(kids, opts.article)}</p>`)
    } else if (b.type === 'list') {
      const items = (b.children || []).map((li: LexNode) => li.children || [])
      const ordered = b.listType === 'number' || b.tag === 'ol'
      if (opts.article) {
        out.push(`<${ordered ? 'ol' : 'ul'}>` + items.map((ch: LexNode[]) => `<li>${inlineHtml(ch, true)}</li>`).join('') + `</${ordered ? 'ol' : 'ul'}>`)
      } else if (ordered) {
        const grid = opts.steps === 'grid' || items.length >= 4
        const cls = grid ? `steps steps--grid steps--n${items.length}` : 'steps'
        out.push(`<ol class="${cls}">` + items.map((ch: LexNode[]) => `<li>${inlineHtml(ch)}</li>`).join('') + '</ol>')
      } else {
        const two = opts.list !== '1col' && items.length > 3
        const cls = two ? 'feature-list feature-list--2col' : 'feature-list'
        out.push(`<ul class="${cls}">` + items.map((ch: LexNode[]) => `<li><span class="tick">${ICON_CHECK}</span><span>${inlineHtml(ch)}</span></li>`).join('\n') + '</ul>')
      }
    } else if (b.type === 'heading') {
      const tag = b.tag || 'h2'
      const txt = plainText(b.children || [])
      out.push(opts.article ? `<${tag} id="${slugify(txt)}">${inlineHtml(b.children || [], true)}</${tag}>` : `<${tag}>${inlineHtml(b.children || [])}</${tag}>`)
    } else if (b.type === 'quote') {
      out.push(`<blockquote><p>${inlineHtml(b.children || [], opts.article)}</p></blockquote>`)
    } else if (b.type === 'upload') {
      const m = opts.media ? opts.media(b.value) : undefined
      if (!m) continue
      const alt = (b.fields && b.fields.alt) || m.alt || ''
      const dims = m.width ? ` width="${m.width}" height="${m.height}"` : ''
      const cls = m.width && m.width < 600 ? 'post-figure post-figure--small' : 'post-figure'
      out.push(`<figure class="${cls}"><img src="${escapeAttr(m.src)}" alt="${escapeAttr(alt)}"${dims} loading="lazy" decoding="async" onerror="this.closest('figure').remove()"></figure>`)
    } else if (b.type === 'horizontalrule') {
      out.push('<hr>')
    }
  }
  return out.join(joiner)
}

/** Plain-text version (for schema.org FAQ answers and excerpts). */
export function lexicalToText(data: LexRoot | null | undefined): string {
  const blocks = data?.root?.children || []
  return blocks.map((b: LexNode) => b.type === 'list' ? (b.children || []).map((li: LexNode) => plainText(li.children || [])).join(' ') : plainText(b.children || [])).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/** One-line rich text used by single-line fields: **bold** and [label](url) markers. */
export function inlineMarkdownToHtml(s: string): string {
  return s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
