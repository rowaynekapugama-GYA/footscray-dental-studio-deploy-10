import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  listPages, loadContent, saveContent, renderPreview, pageMeta, applyPageEdits, applyPatch,
  postToEditor, editorToPost, triggerPublish,
} from '@/cms/editor'
import { blobToken } from '@/cms/blob'
import { timingSafeEqual } from 'crypto'

/**
 * The visual dashboard's API. Every action needs a signed-in dashboard user (Payload's
 * login cookie). Content changes save to the database and then start a publish.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

async function session(req: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  return { payload, user: user as any }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params
  const { payload, user } = await session(req)
  if (!user) return action === 'preview' ? new Response('Please sign in.', { status: 401 }) : json({ ok: false, error: 'Please sign in.' }, 401)
  const url = new URL(req.url)

  if (action === 'me') {
    const s: any = await payload.findGlobal({ slug: 'site-status', depth: 0, overrideAccess: true })
    const blob = blobToken()
    return json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role }, status: s, hookConfigured: !!process.env.PUBLISH_HOOK_URL, blobNote: process.env.VERCEL ? blob.note : '' })
  }
  if (action === 'pages') return json({ ok: true, pages: listPages().map(({ path, title, group }) => ({ path, title, group })) })
  if (action === 'page') {
    const meta = pageMeta(url.searchParams.get('path') || '/', await loadContent(payload))
    return meta ? json({ ok: true, ...meta }) : json({ ok: false, error: 'No such page.' }, 404)
  }
  if (action === 'preview') {
    const html = renderPreview(url.searchParams.get('path') || '/', await loadContent(payload))
    if (!html) return new Response('No such page.', { status: 404 })
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
  }
  if (action === 'content') {
    const c = await loadContent(payload)
    return json({ ok: true, practice: c.practice || {}, hours: c.hours || [], hours_note: c.hours_note || '', announcement: c.announcement || {}, team: c.team || [], offers: c.offers || [] })
  }
  if (action === 'posts') {
    const r = await payload.find({ collection: 'posts', limit: 500, depth: 0, draft: true, sort: '-datePublished', overrideAccess: true, select: { title: true, slug: true, category: true, datePublished: true, _status: true, updatedAt: true } as any })
    return json({ ok: true, imported: (await payload.count({ collection: 'pages', overrideAccess: true })).totalDocs > 0 && r.totalDocs > 0, blobNote: process.env.VERCEL ? blobToken().note : '', posts: r.docs.filter((p: any) => p.id != null).map((p: any) => ({ id: p.id, title: p.title, slug: p.slug, category: p.category, datePublished: p.datePublished, status: p._status, updatedAt: p.updatedAt })) })
  }
  if (action === 'post') {
    const id = url.searchParams.get('id')
    if (!id) return json({ ok: false, error: 'Missing id.' }, 400)
    const p = await payload.findByID({ collection: 'posts', id, depth: 2, draft: true, overrideAccess: true })
    return json({ ok: true, post: postToEditor(p) })
  }
  return json({ ok: false, error: 'Unknown action.' }, 404)
}

/**
 * Sign-in rescue for the login set in Vercel (ADMIN_EMAIL + ADMIN_PASSWORD). Called by the
 * sign-in form only after a normal sign-in fails. If the typed email and password are exactly
 * those two variables, the account is created (or its password set back to that value and any
 * lock cleared), so the login in Vercel always works at runtime, whatever happened at build.
 * Once ADMIN_PASSWORD is deleted from Vercel this does nothing.
 */
const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
async function ensureAdmin(req: NextRequest) {
  await new Promise(r => setTimeout(r, 800)) // slows guessing; Payload's own lockout still applies to sign-in
  let body: any = {}
  try { body = await req.json() } catch { body = {} }
  const envEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const envPass = process.env.ADMIN_PASSWORD || ''
  if (!envEmail || !envPass) return json({ ok: false, reason: 'no-env' })
  const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '')
  if (!same(email, envEmail) || !same(password, envPass)) return json({ ok: false, reason: 'no-match' })
  try {
    const payload = await getPayload({ config })
    const found = await payload.find({ collection: 'users', overrideAccess: true, limit: 1, depth: 0, where: { email: { equals: envEmail } } })
    if (!found.docs.length) {
      await payload.create({ collection: 'users', overrideAccess: true, data: { email: envEmail, password: envPass, name: process.env.ADMIN_NAME || 'Admin', role: 'admin' } as any })
      console.log(`sign-in rescue: created ${envEmail}`)
    } else {
      await payload.update({ collection: 'users', id: (found.docs[0] as any).id, overrideAccess: true, data: { password: envPass, loginAttempts: 0, lockUntil: null, role: 'admin' } as any })
      console.log(`sign-in rescue: reset the password of ${envEmail} to ADMIN_PASSWORD`)
    }
    return json({ ok: true })
  } catch (e: any) {
    console.error('sign-in rescue failed', e)
    return json({ ok: false, reason: 'db', detail: String(e?.message || e).slice(0, 300) })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params
  if (action === 'ensure-admin') return ensureAdmin(req)
  const { payload, user } = await session(req)
  if (!user) return json({ ok: false, error: 'Please sign in.' }, 401)
  if (req.headers.get('x-requested-with') !== 'fds') return json({ ok: false, error: 'Forbidden' }, 403)
  let body: any = {}
  try { body = await req.json() } catch { body = {} }
  const who = user.email

  if (action === 'save-page') {
    const p = String(body.path || '/')
    const content = applyPageEdits(await loadContent(payload), p, body)
    await saveContent(payload, content)
    const pub = await triggerPublish(payload, who)
    return json({ ok: true, published: pub.ok, message: pub.message })
  }
  if (action === 'save-content') {
    const content = applyPatch(await loadContent(payload), body || {})
    await saveContent(payload, content)
    const pub = await triggerPublish(payload, who)
    return json({ ok: true, published: pub.ok, message: pub.message })
  }
  if (action === 'save-post') {
    const data: any = await editorToPost(payload, body)
    if (!data.title) return json({ ok: false, error: 'The article needs a headline.' }, 400)
    const doc: any = body.id
      ? await payload.update({ collection: 'posts', id: body.id, data, draft: data._status !== 'published', overrideAccess: true })
      : await payload.create({ collection: 'posts', data, draft: data._status !== 'published', overrideAccess: true })
    const pub = data._status === 'published' ? await triggerPublish(payload, who) : { ok: true, message: 'Draft saved. It is not on the website until you publish it.' }
    return json({ ok: true, id: doc.id, slug: doc.slug, published: pub.ok, message: pub.message })
  }
  if (action === 'delete-post') {
    if (!body.id) return json({ ok: false, error: 'Missing id.' }, 400)
    await payload.delete({ collection: 'posts', id: body.id, overrideAccess: true })
    const pub = await triggerPublish(payload, who)
    return json({ ok: true, message: pub.message.replace(/^Saved/, 'Deleted') })
  }
  if (action === 'publish') {
    const pub = await triggerPublish(payload, who)
    return json({ ok: pub.ok, message: pub.ok ? 'Publishing started. The website will update in about two minutes.' : pub.message })
  }
  return json({ ok: false, error: 'Unknown action.' }, 404)
}
