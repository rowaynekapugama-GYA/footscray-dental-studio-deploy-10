import type { Payload } from 'payload'

/**
 * One-off corrections to content already saved in the database, applied on every build
 * (idempotent). The repository's own files are corrected directly; this catches copies of
 * the old values that were imported or saved in the dashboard before the correction.
 *
 * 28 Sep 2026: new phone number, Tuesday open until 6pm, and the Footscray Dental Studio
 * Google Maps listing in place of the old Ezy Dental Group one.
 * 7 Oct 2026: every booking button inside dashboard-edited text opens the CareStack online
 * booking in a new tab (the generators do the same for the buttons they write).
 * 26 Oct 2026: homepage "Why us" text, the two paragraphs swapped so the one ending
 * "equipped with:" sits next to the equipment list. Only when both are present, unedited,
 * in the old order.
 */
export const BOOKING_URL = 'https://onlineappointment.carestack.au/?dn=asmiles&In=1#/home'
export const BOOKING_ATTRS = `href="${BOOKING_URL}" target="_blank" rel="noopener noreferrer"`
const REPLACE: [string, string][] = [
  ['(03) 9000 0792', '(03) 7044 7722'],
  ['03 9000 0792', '03 7044 7722'],
  ['tel:+61390000792', 'tel:+61370447722'],
  ['+61390000792', '+61370447722'],
  ['https://www.google.com/maps/place/Ezy+Dental+Group+-+Dentist+Footscray/data=!4m2!3m1!1s0x0:0xc3d2cca966430256',
   'https://www.google.com/maps/place/Footscray+Dental+Studio/@-37.7993294,144.8944961,854m/data=!3m2!1e3!4b1!4m6!3m5!1s0x6ad65de4a43b38a1:0x4f4153651d19ea89!8m2!3d-37.7993294!4d144.8944961!16s%2Fg%2F11nw1dhhcj'],
]
const OLD_HOURS = [['Monday–Friday', '9:00am–5:00pm'], ['Saturday', '9:00am–3:00pm'], ['Sunday', 'By appointment only']]
const NEW_HOURS = [
  { days: 'Monday', time: '9:00am–5:00pm' }, { days: 'Tuesday', time: '9:00am–6:00pm' },
  { days: 'Wednesday–Friday', time: '9:00am–5:00pm' }, { days: 'Saturday', time: '9:00am–3:00pm' },
  { days: 'Sunday', time: 'By appointment only' },
]

// Only buttons (class="btn ...") whose href was the booking page; plain text links are left alone.
// Runs on JSON text, so the quote may be a plain " or an escaped \" (captured as $1).
const BOOKING_BTN = /<a class=(\\?")btn([^"\\]*)\1 href=\1(?:\/patient-info\/|(?:\.\.\/)+patient-info\/index\.html|#book)\1(?! target=)/g
const replaceAll = (s: string) => REPLACE.reduce((acc, [a, b]) => acc.split(a).join(b), s)
  .replace(BOOKING_BTN, (_m, q, cls) => `<a class=${q}btn${cls}${q} href=${q}${BOOKING_URL}${q} target=${q}_blank${q} rel=${q}noopener noreferrer${q}`)
const WHY_OLD_ORDER = /<p>(Our team brings more than 20 years[^<]*equipped with:)<\/p>(\s*)<p>(We take the time to listen[^<]*)<\/p>/
const swapWhy = (html: string) => html.replace(WHY_OLD_ORDER, (_m, intro, gap, close) => `<p>${close}</p>${gap}<p>${intro}</p>`)
const isOldHours = (rows: any) => Array.isArray(rows) && rows.length === OLD_HOURS.length
  && rows.every((r: any, i: number) => String(r?.days || '').trim() === OLD_HOURS[i][0] && String(r?.time || '').trim() === OLD_HOURS[i][1])

function fix(obj: any): { value: any; changed: boolean } {
  const before = JSON.stringify(obj)
  const value = JSON.parse(replaceAll(before))
  if (value && isOldHours(value.hours)) value.hours = NEW_HOURS.map(h => ({ ...h }))
  if (value?.home && typeof value.home.why_text === 'string') value.home.why_text = swapWhy(value.home.why_text)
  return { value, changed: JSON.stringify(value) !== before }
}

export async function applyContentFixes(payload: Payload, log: (m: string) => void = console.log) {
  const store: any = await payload.findGlobal({ slug: 'site-content' as any, depth: 0, overrideAccess: true })
  if (store?.data && typeof store.data === 'object' && Object.keys(store.data).length) {
    const r = fix(store.data)
    if (r.changed) {
      await payload.updateGlobal({ slug: 'site-content' as any, data: { data: r.value } as any, overrideAccess: true, depth: 0 })
      log('content fixes: updated the saved website content (phone, hours, map link, booking buttons, Why us order)')
    }
  }
  const settings: any = await payload.findGlobal({ slug: 'site-settings' as any, depth: 0, overrideAccess: true })
  if (settings) {
    const cur = { practice: settings.practice || {}, hours: (settings.hours || []).map((h: any) => ({ days: h.days, time: h.time })) }
    const r = fix(cur)
    if (r.changed) {
      await payload.updateGlobal({ slug: 'site-settings' as any, data: { practice: r.value.practice, hours: r.value.hours } as any, overrideAccess: true, depth: 0 })
      log('content fixes: updated site settings (phone, hours, map link)')
    }
  }
}
