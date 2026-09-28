import type { Payload } from 'payload'

/**
 * One-off corrections to content already saved in the database, applied on every build
 * (idempotent). The repository's own files are corrected directly; this catches copies of
 * the old values that were imported or saved in the dashboard before the correction.
 *
 * 28 Sep 2026: new phone number, Tuesday open until 6pm, and the Footscray Dental Studio
 * Google Maps listing in place of the old Ezy Dental Group one.
 */
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

const replaceAll = (s: string) => REPLACE.reduce((acc, [a, b]) => acc.split(a).join(b), s)
const isOldHours = (rows: any) => Array.isArray(rows) && rows.length === OLD_HOURS.length
  && rows.every((r: any, i: number) => String(r?.days || '').trim() === OLD_HOURS[i][0] && String(r?.time || '').trim() === OLD_HOURS[i][1])

function fix(obj: any): { value: any; changed: boolean } {
  const before = JSON.stringify(obj)
  const value = JSON.parse(replaceAll(before))
  if (value && isOldHours(value.hours)) value.hours = NEW_HOURS.map(h => ({ ...h }))
  return { value, changed: JSON.stringify(value) !== before }
}

export async function applyContentFixes(payload: Payload, log: (m: string) => void = console.log) {
  const store: any = await payload.findGlobal({ slug: 'site-content' as any, depth: 0, overrideAccess: true })
  if (store?.data && typeof store.data === 'object' && Object.keys(store.data).length) {
    const r = fix(store.data)
    if (r.changed) {
      await payload.updateGlobal({ slug: 'site-content' as any, data: { data: r.value } as any, overrideAccess: true, depth: 0 })
      log('content fixes: updated the saved website content (phone, hours, map link)')
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
