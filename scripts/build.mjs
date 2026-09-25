/**
 * The Vercel build. In order:
 *   1. database migrations (so a fresh Neon database gets its tables), the admin account
 *      and a first import of the content when the database is empty
 *   2. pull content from the database into content/*.json
 *   3. render the blog from content/posts.json
 *   4. patch every page with the content and write public/
 *   5. next build (the dashboard and API)
 *
 * If the database is unreachable or DATABASE_URL is not set, steps 1 and 2 are skipped
 * and the JSON committed in the repository is used, so the site always builds.
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'

const run = (cmd, opts = {}) => { console.log(`\n> ${cmd}`); execSync(cmd, { stdio: 'inherit', ...opts }) }
const tryRun = (cmd, what) => { try { run(cmd); return true } catch (e) { console.warn(`\n! ${what} failed; continuing with the committed content files.`); return false } }

if (existsSync('.env')) { const { default: fs } = await import('fs'); for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = /^([A-Z_]+)=(.*)$/.exec(l.trim()); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2] } }

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  if (tryRun('npx payload migrate --force-accept-warning', 'migration')) {
    tryRun('npx tsx scripts/bootstrap.ts', 'bootstrap (admin account and first import)')
    tryRun('npx tsx scripts/pull-content.ts', 'content pull')
  }
} else {
  console.log('DATABASE_URL not set: building from the committed content files')
}
run('node build/blog.mjs')
run('node build/apply-content.cjs')
if (!process.argv.includes('--pages-only')) run('npx next build')
