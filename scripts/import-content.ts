import './load-env'
import { getPayload } from 'payload'
import config from '../payload.config'
import { importContent } from '../cms/sync'

/* Load the repository's content files into the database. `--overwrite` resets edited pages. */
const payload = await getPayload({ config })
const counts = await importContent(payload, { overwrite: process.argv.includes('--overwrite'), log: (m) => console.log(m) })
console.log(counts)
process.exit(0)
