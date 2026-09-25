import { withPayload } from '@payloadcms/next/withPayload'
import { siteRedirects, siteHeaders, siteRewrites } from './build/routing.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The public pages are the generated static HTML in public/. Their URLs end in a slash;
  // the dashboard (/admin) and API (/api) must not be redirected, so the trailing-slash
  // rule for public pages lives in middleware.ts instead of here.
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  outputFileTracingIncludes: { '/[...rest]': ['./public/404.html'] },
  async redirects() { return siteRedirects() },
  async headers() { return siteHeaders() },
  async rewrites() { return siteRewrites() },
}

export default withPayload(nextConfig)
