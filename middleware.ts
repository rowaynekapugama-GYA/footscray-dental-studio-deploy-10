import { NextRequest, NextResponse } from 'next/server'

/**
 * The public site is static HTML in public/ (one index.html per folder). This maps the
 * clean URLs onto those files and keeps the trailing-slash convention the site launched
 * with, without touching the dashboard or the API:
 *   /about        -> 308 -> /about/
 *   /about/       -> serves /about/index.html
 *   /             -> serves /index.html
 * Files with an extension (/assets/..., /sitemap.xml) pass straight through.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/') { const u = req.nextUrl.clone(); u.pathname = '/index.html'; return NextResponse.rewrite(u) }
  if (pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname.startsWith('/_next') || /\.[a-zA-Z0-9]+$/.test(pathname)) return NextResponse.next()
  if (!pathname.endsWith('/')) {
    // NextURL normalises trailing slashes away (trailingSlash: false), so build the Location by hand
    const u = new URL(req.url)
    return new NextResponse(null, { status: 308, headers: { Location: `${u.origin}${pathname}/${u.search}`, 'Cache-Control': 'public, max-age=3600' } })
  }
  const u = req.nextUrl.clone(); u.pathname = pathname + 'index.html'
  return NextResponse.rewrite(u)
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] }
