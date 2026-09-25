import type { Endpoint } from 'payload'
import { importContent } from './sync'
import { blobToken } from './blob'

const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * POST /api/publish-site
 * Fires the Vercel deploy hook (PUBLISH_HOOK_URL). The build then pulls content from the
 * database and regenerates the pages. Editors and admins may publish.
 */
export const publishSite: Endpoint = {
  path: '/publish-site', method: 'post',
  handler: async (req) => {
    if (!req.user) return json({ ok: false, error: 'Please sign in.' }, 401)
    const hook = process.env.PUBLISH_HOOK_URL
    const now = new Date().toISOString()
    if (!hook) {
      await req.payload.updateGlobal({ slug: 'site-status', data: { lastPublishNote: 'PUBLISH_HOOK_URL is not set on the server, so nothing was deployed.' } })
      return json({ ok: false, error: 'Publishing is not connected yet: PUBLISH_HOOK_URL is missing from the Vercel environment variables.' }, 503)
    }
    try {
      const r = await fetch(hook, { method: 'POST' })
      if (!r.ok) throw new Error(`deploy hook answered ${r.status}`)
      await req.payload.updateGlobal({ slug: 'site-status', data: { lastPublishedAt: now, lastPublishNote: `Publish started by ${req.user.email}` } })
      return json({ ok: true, startedAt: now })
    } catch (e: any) {
      await req.payload.updateGlobal({ slug: 'site-status', data: { lastPublishNote: `Publish failed: ${e.message}` } })
      return json({ ok: false, error: `Could not start the publish: ${e.message}` }, 502)
    }
  },
}

/**
 * POST /api/import-content[?overwrite=1]
 * Loads the repo's content files into the database. Idempotent: existing pages are kept
 * unless overwrite=1 (which resets them to the files). Admins only.
 */
export const importContent_: Endpoint = {
  path: '/import-content', method: 'post',
  handler: async (req) => {
    if (!req.user || (req.user as any).role !== 'admin') return json({ ok: false, error: 'Admins only.' }, 403)
    const url = new URL(req.url || '', 'http://x')
    const overwrite = url.searchParams.get('overwrite') === '1'
    const lines: string[] = []
    const blob = blobToken()
    if (process.env.VERCEL && !blob.ok) return json({ ok: false, error: `Import needs photo storage first. ${blob.note}` }, 503)
    try {
      const counts = await importContent(req.payload, { overwrite, log: (m) => lines.push(m) })
      return json({ ok: true, counts, log: lines })
    } catch (e: any) {
      return json({ ok: false, error: e.message, log: lines }, 500)
    }
  },
}
export { importContent_ as importContent }

/** GET /api/site-status: what the dashboard panel shows. */
export const siteStatus: Endpoint = {
  path: '/site-status', method: 'get',
  handler: async (req) => {
    if (!req.user) return json({ ok: false, error: 'Please sign in.' }, 401)
    const s: any = await req.payload.findGlobal({ slug: 'site-status', depth: 0 })
    const pages = await req.payload.count({ collection: 'pages' })
    const blob = blobToken()
    return json({ ok: true, ...s, pages: pages.totalDocs, hookConfigured: Boolean(process.env.PUBLISH_HOOK_URL), blobNote: process.env.VERCEL ? blob.note : '', role: (req.user as any).role })
  },
}
