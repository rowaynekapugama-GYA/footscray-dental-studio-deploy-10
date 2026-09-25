import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'

/**
 * Every save stamps site-status.lastChangedAt so the dashboard can show
 * "changes waiting to be published". Best effort: never blocks a save.
 */
const stamp = async (payload: any, req: any) => {
  try {
    await payload.updateGlobal({ slug: 'site-status', data: { lastChangedAt: new Date().toISOString() }, overrideAccess: true, depth: 0 })
  } catch (e: any) {
    console.error('site-status stamp failed:', e.message)
  }
}

export const markChanged: CollectionAfterChangeHook & GlobalAfterChangeHook = async ({ doc, req, global }: any) => {
  if (global?.slug === 'site-status') return doc
  await stamp(req.payload, req)
  return doc
}
