import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * POST /api/contact/
 * The appointment, contact and newsletter forms. Same checks as before the dashboard
 * (honeypot, three-second rule, rate limit, link spam), then the email goes through
 * SMTP2GO and the enquiry is stored in the dashboard whether or not the email succeeded.
 */
// @ts-ignore CommonJS helpers shared with the static build
import form from '@/lib/contact-form.cjs'
// @ts-ignore
import mail from '@/lib/mail.cjs'
// @ts-ignore
import siteCfg from '@/lib/config.cjs'
const { sendMail } = mail
const { config: siteConfig } = siteCfg

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
const ok = (extra: any = {}) => json({ ok: true, ...extra })
const fail = (status: number, error: string) => json({ ok: false, error }, status)

function sameOrigin(req: NextRequest) {
  if (req.headers.get('x-requested-with') !== 'fetch') return false
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const origin = req.headers.get('origin') || req.headers.get('referer') || ''
  if (!origin) return true
  try { return new URL(origin).host === host } catch { return false }
}
const clientIp = (req: NextRequest) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'

async function store(fields: any, ip: string, emailStatus: 'sent' | 'failed', emailError?: string) {
  try {
    const payload = await getPayload({ config })
    await payload.create({ collection: 'enquiries', overrideAccess: true, data: {
      formType: fields.type, name: fields.name, phone: fields.phone, email: fields.email, service: fields.service, preferred: fields.datetime,
      message: fields.message, page: fields.page, ip, emailStatus, emailError: emailError || '',
    } })
  } catch (e: any) { console.error('contact: could not store enquiry', e.message) }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, 'Forbidden')
  let body: any
  try { body = await req.json() } catch { body = null }
  if (!body || typeof body !== 'object') return fail(400, 'Invalid request.')

  const ip = clientIp(req)
  const spam = form.looksLikeSpam(body, ip)
  if (spam) { console.log(`contact: dropped (${spam}) from ${ip}`); return ok() }

  const { error, fields }: { error?: string; fields?: any } = form.validate(body)
  if (error || !fields) return fail(400, error || 'Invalid request.')
  if (!siteConfig.mail.to.length) { console.error('contact: CONTACT_TO is not set'); return fail(500, 'The form is not configured yet.') }

  const msg = form.render(fields, ip)
  try {
    const result = await sendMail({ to: siteConfig.mail.to, from: siteConfig.mail.from, replyTo: fields.email, ...msg })
    console.log(`contact: ${fields.type} from ${fields.email} sent via ${result.provider} (${result.id})`)
    if (siteConfig.mail.autoReply && fields.type !== 'newsletter') sendMail(form.autoReply(fields)).catch((e: any) => console.error('contact: auto-reply failed', e.message))
    await store(fields, ip, 'sent')
    return ok({ provider: result.provider })
  } catch (e: any) {
    console.error('contact: send failed', e.message)
    await store(fields, ip, 'failed', e.message)
    return fail(502, 'Could not send right now.')
  }
}

export function GET() { return fail(405, 'Method not allowed') }
