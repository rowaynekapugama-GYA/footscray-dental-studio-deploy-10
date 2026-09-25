/**
 * Routing rules shared by next.config.mjs. Kept in one file so that:
 *   - the 195 old-domain (ezydentalgroup.com.au) and apex -> www redirects from the launch
 *     live on in content/old-domain-redirects.json
 *   - redirects the practice adds in the dashboard (content/redirects.json) join them
 *   - cache and security headers match what vercel.json applied before the dashboard
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (f, fallback) => { const p = path.join(ROOT, 'content', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback }

/** Next's path-to-regexp treats ":" and "(" specially; escape literal characters in paths. */
const esc = (s) => s.replace(/([:()*+?])/g, '\\$1')

export function siteRedirects() {
  const legacy = read('old-domain-redirects.json', [])
  const custom = read('redirects.json', []).map(r => ({
    source: esc(r.from.replace(/\/$/, '')) + (r.from.endsWith('/') ? '/' : ''),
    destination: r.to,
    permanent: r.type !== '302',
  }))
  // a custom redirect must not point at itself
  return [...legacy, ...custom.filter(r => r.source !== r.destination)]
}

export function siteHeaders() {
  const noindexStaging = { key: 'X-Robots-Tag', value: 'noindex, nofollow' }
  return [
    { source: '/assets/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] },
    { source: '/admin/:path*', headers: [noindexStaging, { key: 'Cache-Control', value: 'no-store' }] },
    { source: '/admin', headers: [noindexStaging, { key: 'Cache-Control', value: 'no-store' }] },
    { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    // preview deployments never compete with the live site in search
    { source: '/:path*', has: [{ type: 'host', value: '(.*)\\.vercel\\.app' }], headers: [noindexStaging] },
  ]
}

export function siteRewrites() {
  return []
}
