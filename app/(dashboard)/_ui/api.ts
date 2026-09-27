'use client'
/* Small fetch helpers for the dashboard. Same-origin, cookie auth (Payload's login cookie). */

export type Json = Record<string, any>

async function parse(r: Response): Promise<Json> {
  const j = await r.json().catch(() => ({}))
  if (!r.ok && !j.error) {
    const e = Array.isArray(j.errors) && j.errors[0] ? (j.errors[0].message || JSON.stringify(j.errors[0])) : `Request failed (${r.status})`
    return { ok: false, error: e, status: r.status }
  }
  return { ...j, status: r.status }
}

export const get = (url: string): Promise<Json> => fetch(url, { credentials: 'include', cache: 'no-store' }).then(parse).catch((): Json => ({ ok: false, error: 'Could not reach the server.' }))

export const post = (action: string, body: Json): Promise<Json> =>
  fetch(`/api/fds/${action}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fds' }, body: JSON.stringify(body) })
    .then(parse).catch((): Json => ({ ok: false, error: 'Could not reach the server.' }))

/* Payload's own REST API (media, enquiries, users, redirects, login). */
export const rest = (method: string, url: string, body?: Json | FormData): Promise<Json> =>
  fetch(url, {
    method, credentials: 'include',
    headers: body instanceof FormData || !body ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  }).then(parse).catch((): Json => ({ ok: false, error: 'Could not reach the server.' }))

export const fmtDate = (iso?: string, withTime = false) => {
  if (!iso) return 'never'
  const d = new Date(iso)
  return withTime ? d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
