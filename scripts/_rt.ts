import fs from 'fs'
import path from 'path'
import { htmlToLexical, lexicalToHtml } from '../cms/richtext'
const C = require('/home/claude/footscray-sitekit/lib/content.js')
const content = JSON.parse(fs.readFileSync('/home/claude/footscray-sitekit/content/site.json', 'utf8'))
const schema = JSON.parse(fs.readFileSync('/home/claude/footscray-sitekit/content/schema.json', 'utf8'))
const idx = C.fieldIndex(schema)
// opts from the pages
const opts: any = {}
;(function walk(d: string) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.html')) C.collectOpts(fs.readFileSync(p, 'utf8'), opts) } })('/home/claude/footscray-sitekit/site')
const norm = (h: string) => h.replace(/>\s+</g, '><').replace(/href="(\.\.\/)+/g, 'href="/').replace(/index\.html"/g, '"').trim()
let n = 0, bad = 0
function visit(v: any, key: string, listDef?: any) {
  if (Array.isArray(v)) { v.forEach((x, i) => visit(x, key + '.' + i, listDef || C.listDefFor(key, idx))); return }
  if (v && typeof v === 'object') { for (const k in v) visit(v[k], key ? key + '.' + k : k, listDef); return }
  if (typeof v !== 'string') return
  const leaf = key.split('.').pop() as string
  const type = listDef ? C.typeOf(leaf, null, listDef) : C.typeOf(key, idx)
  if (type !== 'html') return
  n++
  const o = opts[key] || {}
  const back = lexicalToHtml(htmlToLexical(v), { list: o.list, steps: o.steps, p: o.p })
  if (norm(back) !== norm(v)) { bad++; if (bad <= 5) { console.log('MISMATCH', key); console.log(' in :', v.slice(0, 220)); console.log(' out:', back.slice(0, 220)) } }
}
visit(content, '')
console.log(n, 'html fields,', bad, 'mismatches')
