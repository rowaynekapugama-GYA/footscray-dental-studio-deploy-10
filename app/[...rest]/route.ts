import fs from 'fs'
import path from 'path'

/**
 * Anything that is not a static page, the dashboard or the API lands here: the site's own
 * 404 page, served with a 404 status (what Vercel did for 404.html on the static site).
 */
export const dynamic = 'force-dynamic'

let cached: string | null = null
function page404() {
  if (cached) return cached
  const p = path.join(process.cwd(), 'public', '404.html')
  cached = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '<!DOCTYPE html><title>Not found</title><h1>Page not found</h1>'
  return cached
}

export function GET() {
  return new Response(page404(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
export const HEAD = GET
