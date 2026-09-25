'use strict';
/**
 * One place for every setting. Values come from environment variables, which is how
 * Vercel (and every other host) expects secrets to be supplied. For local testing a
 * .env file in the project root is read too. See .env.example for the full list.
 */
const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadDotEnv();

const env = (k, d = '') => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);
const bool = (k, d = false) => { const v = env(k, ''); return v === '' ? d : /^(1|true|yes|on)$/i.test(v); };

const ROOT = path.resolve(__dirname, '..');

const config = {
  root: ROOT,
  isProduction: env('VERCEL_ENV') === 'production' || env('NODE_ENV') === 'production',
  siteUrl: env('SITE_URL', 'https://www.footscraydentalstudio.com.au'),

  // ---- contact form
  mail: {
    // auto: smtp2go if SMTP2GO_API_KEY is set, resend if RESEND_API_KEY is set, else "log"
    provider: env('MAIL_PROVIDER', env('SMTP2GO_API_KEY') ? 'smtp2go' : env('RESEND_API_KEY') ? 'resend' : 'log'),
    smtp2goKey: env('SMTP2GO_API_KEY'),
    resendKey: env('RESEND_API_KEY'),
    to: env('CONTACT_TO').split(',').map(s => s.trim()).filter(Boolean),
    from: env('CONTACT_FROM', 'Footscray Dental Studio <noreply@footscraydentalstudio.com.au>'),
    subjectPrefix: env('CONTACT_SUBJECT_PREFIX', '[Website]'),
    autoReply: bool('CONTACT_AUTOREPLY', false),
    practicePhone: env('CONTACT_PHONE', '(03) 9000 0792'),   // quoted in the auto-reply
    outbox: path.join(ROOT, 'outbox'),          // "log" provider writes here
  },

  // ---- admin panel
  admin: {
    username: env('ADMIN_USERNAME', 'admin'),
    passwordHash: env('ADMIN_PASSWORD_HASH'),   // bootstrap only; content/auth.json overrides once set
    sessionSecret: env('SESSION_SECRET'),
    sessionHours: parseInt(env('SESSION_HOURS', '8'), 10),
    cookieName: 'fds_admin',
  },

  // ---- where content lives: github (Vercel) or local (a normal server / dev)
  store: {
    kind: env('CONTENT_STORE', env('GITHUB_TOKEN') ? 'github' : 'local'),
    githubToken: env('GITHUB_TOKEN'),
    githubRepo: env('GITHUB_REPO'),             // owner/name
    githubBranch: env('GITHUB_BRANCH', 'main'),
    githubApi: env('GITHUB_API', 'https://api.github.com'),   // override only for GitHub Enterprise or tests
    // local mode rebuilds public/ after every save so changes are instant
    localRebuild: bool('LOCAL_REBUILD', true),
  },
};

/** Human-readable list of what is missing for production. */
function missingForProduction() {
  const out = [];
  if (config.mail.provider === 'log') out.push('SMTP2GO_API_KEY or RESEND_API_KEY (the contact form has no way to send email)');
  if (!config.mail.to.length) out.push('CONTACT_TO (who receives form submissions)');
  if (!config.admin.sessionSecret) out.push('SESSION_SECRET (admin logins cannot be signed)');
  if (!config.admin.passwordHash) out.push('ADMIN_PASSWORD_HASH (no admin password set)');
  if (config.store.kind === 'github' && (!config.store.githubToken || !config.store.githubRepo)) out.push('GITHUB_TOKEN and GITHUB_REPO (admin edits cannot be saved)');
  return out;
}

module.exports = { config, missingForProduction };
