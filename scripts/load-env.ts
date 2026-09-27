/* Loads .env for tsx scripts (Next does this itself; plain scripts do not). Import first. */
import fs from 'fs'
import path from 'path'
const p = path.resolve(process.cwd(), '.env')
if (fs.existsSync(p)) {
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}
