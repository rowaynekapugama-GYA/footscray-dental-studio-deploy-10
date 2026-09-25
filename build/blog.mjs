/**
 * Blog renderer: content/posts.json -> site/<slug>/index.html, site/blog/[page/N/]index.html,
 * site/sitemap.xml and site/robots.txt. A port of build/blog.py so that posts written in the
 * dashboard come out in exactly the markup the launch articles used. build/apply-content.cjs
 * then patches the shared chrome (phone, hours, announcement) like every other page.
 *
 * The header, booking section and footer are lifted from an existing generated page so the
 * chrome never drifts from the rest of the site.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE_DIR = path.join(ROOT, 'site')
const SITE = 'https://www.footscraydentalstudio.com.au'
const AUTHOR = 'Footscray Dental Studio Team'
const BLOG_URL = '/blog/'
const PER_PAGE = 9
const PHONE_DISPLAY = '(03) 9000 0792'
const PHONE_TEL = 'tel:+61390000792'
const ICON_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/></svg>'
const SURGICAL_DISCLAIMER = 'Any surgical or invasive procedure carries risks. Before proceeding, you should seek a second opinion from an appropriately qualified health practitioner.'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escQ = (s) => esc(s).replace(/"/g, '&quot;')
const prettyDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}` }

// ---------------------------------------------------------------- chrome from an existing page
function chrome() {
  const ref = fs.readFileSync(path.join(SITE_DIR, 'about', 'index.html'), 'utf8')
  const abs = (h) => h.replace(/(href|src)="(\.\.\/)+/g, '$1="/').replace(/(href|src)="([^"]*?)\/index\.html/g, '$1="$2/').replace(/href="\/index\.html"/g, 'href="/"')
  const between = (a, b) => { const i = ref.indexOf(a), j = ref.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`chrome: cannot find ${a}`); return ref.slice(i, j + b.length) }
  const headTop = ref.slice(0, ref.indexOf('<title>'))
  const headRest = between('<link rel="icon"', '<!-- End Google Tag Manager -->')
  const bodyTop = between('<body>', '<!-- End Google Tag Manager (noscript) -->\n')
  let header = abs(between('<header class="site-header">', '</header>\n'))
  header = header.replace(/ aria-current="page"/g, '').replace('<a class="nav-link" href="/blog/">Blog</a>', '<a class="nav-link" href="/blog/" aria-current="page">Blog</a>')
  const booking = between('<section class="section section--off" id="book"', '</section>\n')
  const footer = ref.slice(ref.indexOf('<footer class="site-footer">'))
  return { headTop, headRest: abs(headRest), bodyTop, header, booking: abs(booking), footer: abs(footer) }
}

function head(ch, { title, desc, url, ogType = 'website', image, published, modified, schemaBlocks = [] }) {
  const extra = [
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escQ(title)}">`,
    `<meta name="twitter:description" content="${escQ(desc)}">`,
    `<meta property="og:url" content="${SITE}${url}">`,
  ]
  if (image) {
    const img = /^https?:/.test(image) ? image : SITE + image
    extra.push(`<meta property="og:image" content="${img}">`, `<meta property="og:image:alt" content="${escQ(title)}">`, `<meta name="twitter:image" content="${img}">`)
  }
  if (ogType === 'article') {
    extra.push('<meta property="og:type" content="article">', `<meta property="article:published_time" content="${published}">`, `<meta property="article:modified_time" content="${modified}">`, `<meta property="article:author" content="${AUTHOR}">`)
  }
  for (const b of schemaBlocks) extra.push('<script type="application/ld+json">' + JSON.stringify(b) + '</script>')
  return `${ch.headTop}<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:site_name" content="Footscray Dental Studio">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
${ch.headRest}
${extra.join('\n')}
</head>
${ch.bodyTop}<a class="skip-link" href="#main">Skip to main content</a>
`
}

// ---------------------------------------------------------------- schema
const publisher = () => ({ '@type': 'Dentist', name: 'Footscray Dental Studio', alternateName: 'Ezy Dental Group', url: SITE + '/', telephone: PHONE_DISPLAY,
  logo: { '@type': 'ImageObject', url: SITE + '/assets/img/logo.png' },
  address: { '@type': 'PostalAddress', streetAddress: '289 Barkly St', addressLocality: 'Footscray', addressRegion: 'VIC', postalCode: '3011', addressCountry: 'AU' } })
const breadcrumbSchema = (trail) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) })
const faqSchema = (pairs) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: pairs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

function extractFaqs(bodyHtml) {
  const m = /<h2 id="frequently-asked-questions">[\s\S]*?<\/h2>([\s\S]*)$/.exec(bodyHtml)
  if (!m) return []
  const pairs = []
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<h2|$)/g
  let q
  while ((q = re.exec(m[1]))) {
    const question = q[1].replace(/<[^>]+>/g, '').trim()
    const answer = unescape(q[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim()
    if (question && answer) pairs.push([question, answer])
  }
  return pairs
}

// ---------------------------------------------------------------- pieces
const dimsCache = new Map()
async function intrinsic(src) {
  if (dimsCache.has(src)) return dimsCache.get(src)
  let size = [0, 0]
  if (src && src.startsWith('/')) {
    const f = path.join(SITE_DIR, src.replace(/^\//, ''))
    if (fs.existsSync(f)) { try { const m = await sharp(f).metadata(); size = [m.width || 0, m.height || 0] } catch { size = [0, 0] } }
  }
  dimsCache.set(src, size)
  return size
}
const crumbs = (trail) => '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>' + trail.map(([label, u], i) => (i === trail.length - 1 ? `<li><span aria-current="page">${label}</span></li>` : `<li><a href="${u}">${label}</a></li>`)).join('') + '</ol></nav>'

async function postCard(p) {
  const [fw, fh] = await intrinsic(p.featured_image)
  const img = `<img src="${p.featured_image}" alt="${escQ(p.featured_alt)}"` + (fw ? ` width="${fw}" height="${fh}"` : '') + ' loading="lazy" decoding="async" onerror="this.remove()">'
  return `<article class="post-card">
  <a class="post-card-media" href="${p.url}" tabindex="-1" aria-hidden="true">${img}</a>
  <div class="post-card-body">
    <span class="post-card-meta"><span class="post-cat">${p.category}</span><time datetime="${p.date_published}">${prettyDate(p.date_published)}</time></span>
    <h3><a class="post-card-link" href="${p.url}">${esc(p.h1)}</a></h3>
    <p>${esc(p.excerpt)}</p>
    <a class="btn btn--sm btn--outline" href="${p.url}" tabindex="-1">Read Article</a>
  </div>
</article>`
}

/** Site-relative asset paths so the page also opens from disk (what blog.py did). */
function relativizeAssets(html, url) {
  const depth = url === '/' ? 0 : url.replace(/^\/|\/$/g, '').split('/').length
  const prefix = '../'.repeat(depth)
  return html.replace(/(href|src)="(\/(?:assets\/|favicon\.svg)[^"]*)"/g, (m, attr, p) => `${attr}="${prefix}${p.replace(/^\//, '')}"`)
}
function writePage(url, html) {
  const dir = url === '/' ? SITE_DIR : path.join(SITE_DIR, url.replace(/^\/|\/$/g, ''))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), relativizeAssets(html, url))
}

// ---------------------------------------------------------------- pages
async function blogIndex(ch, posts) {
  const pages = []
  for (let i = 0; i < posts.length; i += PER_PAGE) pages.push(posts.slice(i, i + PER_PAGE))
  if (!pages.length) pages.push([])
  for (let idx = 0; idx < pages.length; idx++) {
    const pageNo = idx + 1
    const url = pageNo === 1 ? BLOG_URL : `${BLOG_URL}page/${pageNo}/`
    const title = pageNo === 1 ? 'Dental Health Blog | Footscray Dental Studio' : `Dental Health Blog, Page ${pageNo} | Footscray Dental Studio`
    const desc = 'Dental health advice from the team at Footscray Dental Studio, covering tooth pain, gum health, cosmetic treatments and caring for your smile.'
    const trail = [['Home', '/'], ['Blog', BLOG_URL]]
    const h = head(ch, { title, desc, url, image: '/assets/img/hero-home.jpg', schemaBlocks: [breadcrumbSchema(trail), { '@context': 'https://schema.org', '@type': 'Blog', name: 'Footscray Dental Studio Blog', url: SITE + BLOG_URL, publisher: publisher() }] })
    const nav = []
    if (pageNo > 1) nav.push(`<a class="btn btn--outline btn--no-arrow" href="${pageNo === 2 ? BLOG_URL : `${BLOG_URL}page/${pageNo - 1}/`}">Previous</a>`)
    if (pageNo < pages.length) nav.push(`<a class="btn btn--navy" href="${BLOG_URL}page/${pageNo + 1}/">Next</a>`)
    const pager = pages.length > 1 ? `<div class="pager"><span class="pager-count">Page ${pageNo} of ${pages.length}</span><div class="btn-row">${nav.join('')}</div></div>` : ''
    const cards = []
    for (const p of pages[idx]) cards.push(await postCard(p))
    const html = h + ch.header + `<section class="hero-solid hero-solid--blog">
  <div class="container">
    ${crumbs(trail)}
    <span class="eyebrow" style="color:var(--gold-light)">Patient resources</span>
    <h1>Dental Health Blog</h1>
    <p class="hero-sub">Practical, evidence-based advice from our team in Footscray, covering everything from tooth pain and gum health to whitening and caring for your smile at home.</p>
  </div>
</section>
<main id="main">
<section class="section section--off">
  <div class="container">
    <div class="grid grid--3 reveal-stagger">${cards.join('')}</div>
    ${pager}
  </div>
</section>
` + ch.booking + '</main>' + ch.footer
    writePage(url, html)
  }
  return pages.length
}

async function postPage(ch, p, bySlug) {
  const url = p.url
  const bodyHtml = p.body_html
  const trail = [['Home', '/'], ['Blog', BLOG_URL], [p.h1, url]]
  const faqs = extractFaqs(bodyHtml)
  const featured = /^https?:/.test(p.featured_image) ? p.featured_image : SITE + p.featured_image
  const article = { '@context': 'https://schema.org', '@type': 'BlogPosting', mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + url }, headline: p.h1.slice(0, 110), description: p.meta_description,
    image: [featured], datePublished: p.date_published, dateModified: p.date_modified, author: { '@type': 'Organization', name: AUTHOR, url: SITE + '/meet-the-team/' }, publisher: publisher(), inLanguage: 'en-AU', articleSection: p.category }
  const blocks = [article, breadcrumbSchema(trail)]
  if (faqs.length) blocks.push(faqSchema(faqs))
  let h = head(ch, { title: p.title, desc: p.meta_description, url, ogType: 'article', image: p.featured_image, published: p.date_published, modified: p.date_modified, schemaBlocks: blocks })
  if (p.noindex) h = h.replace('<meta name="description"', '<meta name="robots" content="noindex, nofollow">\n<meta name="description"')
  const [hw, hh] = await intrinsic(p.featured_image)
  const heroImg = `<figure class="post-hero-media"><img src="${p.featured_image}" alt="${escQ(p.featured_alt)}" fetchpriority="high"` + (hw ? ` width="${hw}" height="${hh}"` : '') + ` onerror="this.closest('figure').remove()"></figure>`
  const disclaimer = p.surgical_disclaimer ? `<aside class="post-disclaimer"><strong>Please note:</strong> ${SURGICAL_DISCLAIMER}</aside>` : ''
  const rel = p.related.map(s => bySlug.get(s)).filter(r => r && r.slug !== p.slug).slice(0, 3)
  let relatedHtml = ''
  if (rel.length) {
    const cards = []
    for (const r of rel) cards.push(await postCard(r))
    relatedHtml = `<section class="section section--off" aria-labelledby="related-reading">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <span class="eyebrow">Keep reading</span>
      <h2 id="related-reading">Related Articles</h2>
    </div>
    <div class="grid grid--3 reveal-stagger">${cards.join('')}</div>
  </div>
</section>
`
  }
  const updated = p.date_modified === p.date_published ? '' : ` · Updated <time datetime="${p.date_modified}">${prettyDate(p.date_modified)}</time>`
  const html = h + ch.header + `<section class="hero-solid hero-solid--post">
  <div class="container">
    ${crumbs(trail)}
    <span class="eyebrow" style="color:var(--gold-light)">${p.category}</span>
    <h1>${esc(p.h1)}</h1>
    <p class="post-meta">By ${AUTHOR} · <time datetime="${p.date_published}">${prettyDate(p.date_published)}</time>${updated}</p>
  </div>
</section>
<main id="main">
<article class="section section--white post">
  <div class="container--post">
    ${heroImg}
    <div class="post-body">
      ${bodyHtml}
    </div>
    ${disclaimer}
    <div class="post-cta">
      <h2>Book an appointment in Footscray</h2>
      <p>If anything in this article sounds familiar, our team at 289 Barkly St, Footscray is here to help. Book online or call us and we will find a time that suits you.</p>
      <div class="btn-row">
        <a class="btn btn--navy" href="/patient-info/">Book an Appointment</a>
        <a class="btn btn--outline btn--no-arrow" href="${PHONE_TEL}">${ICON_PHONE} Call ${PHONE_DISPLAY}</a>
      </div>
    </div>
  </div>
</article>
${relatedHtml}` + ch.booking + '</main>' + ch.footer
  writePage(url, html)
}

function writeSitemap(posts, indexPages) {
  const today = new Date().toISOString().slice(0, 10)
  const statics = [['/', '1.0', 'weekly'], ['/about/', '0.7', 'monthly'], ['/meet-the-team/', '0.7', 'monthly'], ['/services/', '0.9', 'monthly'],
    ['/services/general-preventive/', '0.8', 'monthly'], ['/services/general-preventive/check-ups-cleans/', '0.8', 'monthly'], ['/services/general-preventive/digital-xrays/', '0.7', 'monthly'],
    ['/services/general-preventive/fluoride-treatments/', '0.7', 'monthly'], ['/services/general-preventive/fissure-sealants/', '0.7', 'monthly'], ['/services/general-preventive/gum-disease-care/', '0.8', 'monthly'],
    ['/services/general-preventive/mouthguards/', '0.7', 'monthly'], ['/services/cosmetic/', '0.8', 'monthly'], ['/services/cosmetic/teeth-whitening/', '0.8', 'monthly'], ['/services/cosmetic/veneers/', '0.8', 'monthly'],
    ['/services/cosmetic/composite-bonding/', '0.7', 'monthly'], ['/services/cosmetic/smile-makeovers/', '0.7', 'monthly'], ['/services/restorative/', '0.8', 'monthly'], ['/services/restorative/fillings/', '0.7', 'monthly'],
    ['/services/restorative/crowns-bridges/', '0.7', 'monthly'], ['/services/restorative/root-canal/', '0.8', 'monthly'], ['/services/restorative/dental-implants/', '0.8', 'monthly'], ['/services/restorative/all-on-x-implants/', '0.8', 'monthly'],
    ['/services/restorative/dentures/', '0.7', 'monthly'], ['/services/emergency-dentistry/', '0.9', 'monthly'], ['/services/childrens-dentistry/', '0.7', 'monthly'], ['/special-offers/', '0.8', 'weekly'],
    ['/patient-info/', '0.9', 'monthly'], ['/contact/', '0.8', 'monthly'], ['/sitemap/', '0.3', 'yearly'], ['/privacy-policy/', '0.2', 'yearly'], ['/terms/', '0.2', 'yearly']]
  const seo = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'site.json'), 'utf8')).seo || {}
  const rows = statics.filter(([u]) => !(seo[u] && seo[u].noindex)).map(([u, pr, cf]) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`)
  rows.push(`  <url><loc>${SITE}${BLOG_URL}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
  for (let n = 2; n <= indexPages; n++) rows.push(`  <url><loc>${SITE}${BLOG_URL}page/${n}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.4</priority></url>`)
  for (const p of posts) if (!p.noindex) rows.push(`  <url><loc>${SITE}${p.url}</loc><lastmod>${p.date_modified}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`)
  fs.writeFileSync(path.join(SITE_DIR, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows.join('\n') + '\n</urlset>\n')
  fs.writeFileSync(path.join(SITE_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`)
}

export async function buildBlog() {
  const file = path.join(ROOT, 'content', 'posts.json')
  if (!fs.existsSync(file)) { console.log('blog: content/posts.json missing, keeping the committed blog pages'); return { posts: 0, indexPages: 0 } }
  const posts = JSON.parse(fs.readFileSync(file, 'utf8')).map(p => ({ ...p, url: `/${p.slug}/` }))
  posts.sort((a, b) => (b.date_published + b.slug).localeCompare(a.date_published + a.slug))
  const ch = chrome()
  const bySlug = new Map(posts.map(p => [p.slug, p]))
  // posts removed or unpublished in the dashboard: drop their old folders
  for (const d of fs.readdirSync(SITE_DIR)) {
    const f = path.join(SITE_DIR, d, 'index.html')
    if (!bySlug.has(d) && fs.existsSync(f) && /class="hero-solid hero-solid--post"/.test(fs.readFileSync(f, 'utf8'))) fs.rmSync(path.join(SITE_DIR, d), { recursive: true })
  }
  const indexPages = await blogIndex(ch, posts)
  for (const p of posts) await postPage(ch, p, bySlug)
  writeSitemap(posts, indexPages)
  console.log(`blog: ${posts.length} posts, ${indexPages} index page(s), sitemap.xml`)
  return { posts: posts.length, indexPages }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await buildBlog()
}
