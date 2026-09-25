import './load-env'
import { getPayload } from 'payload'
import config from '../payload.config'
import { pullContent } from '../cms/sync'

/* Database -> content/*.json, ready for build/apply-content.cjs and build/blog.mjs. */
const payload = await getPayload({ config })
await pullContent(payload, { log: (m) => console.log(m) })
process.exit(0)
