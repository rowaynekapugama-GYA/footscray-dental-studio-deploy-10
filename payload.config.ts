import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'

import { Users } from './cms/collections/Users'
import { Media } from './cms/collections/Media'
import { Pages } from './cms/collections/Pages'
import { Posts } from './cms/collections/Posts'
import { Team } from './cms/collections/Team'
import { Offers } from './cms/collections/Offers'
import { Enquiries } from './cms/collections/Enquiries'
import { Redirects } from './cms/collections/Redirects'
import { SiteSettings } from './cms/globals/SiteSettings'
import { SiteStatus } from './cms/globals/SiteStatus'
import { publishSite, importContent, siteStatus } from './cms/endpoints'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.footscraydentalstudio.com.au'
const hosts = [
  SITE_URL,
  'https://www.footscraydentalstudio.com.au',
  'https://footscraydentalstudio.com.au',
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  'http://localhost:3000',
].filter(Boolean) as string[]

// Preview deployments have their own addresses (branch and per-deploy). Leaving serverURL
// unset there makes the dashboard call its API on whatever address it was opened on, so no
// per-preview setting is needed. Production keeps the fixed domain.
const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'

export default buildConfig({
  ...(IS_PREVIEW ? {} : { serverURL: SITE_URL }),
  cors: hosts,
  csrf: hosts,
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' | Footscray Dental Studio admin', description: 'Website dashboard' },
    components: {
      beforeDashboard: ['@/cms/components/PublishPanel#PublishPanel'],
      graphics: { Logo: '@/cms/components/Logo#Logo', Icon: '@/cms/components/Logo#Icon' },
    },
    importMap: { baseDir: path.resolve(dirname) },
    theme: 'light',
  },
  collections: [Pages, Posts, Team, Offers, Media, Enquiries, Redirects, Users],
  globals: [SiteSettings, SiteStatus],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || 'dev-only-secret-change-me',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || '' },
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
  endpoints: [publishSite, importContent, siteStatus],
  sharp,
  upload: { limits: { fileSize: 12 * 1024 * 1024 } },
})
