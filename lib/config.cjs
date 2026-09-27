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
    // CONTACT_TO_EMAIL is accepted as well (the name used on the Dental Specialists project)
    to: env('CONTACT_TO', env('CONTACT_TO_EMAIL')).split(',').map(s => s.trim()).filter(Boolean),
    from: env('CONTACT_FROM', 'Footscray Dental Studio <noreply@footscraydentalstudio.com.au>'),
    subjectPrefix: env('CONTACT_SUBJECT_PREFIX', '[Website]'),
    autoReply: bool('CONTACT_AUTOREPLY', false),
    practicePhone: env('CONTACT_PHONE', '(03) 9000 0792'),   // quoted in the auto-reply
    outbox: path.join(ROOT, 'outbox'),          // "log" provider writes here
  },


};

/** Human-readable list of what is missing for production. */
function missingForProduction() {
  const out = [];
  if (config.mail.provider === 'log') out.push('SMTP2GO_API_KEY or RESEND_API_KEY (the contact form has no way to send email)');
  if (!config.mail.to.length) out.push('CONTACT_TO or CONTACT_TO_EMAIL (who receives form submissions)');
  if (!process.env.DATABASE_URL) out.push('DATABASE_URL (the dashboard has no database)');
  if (!process.env.PAYLOAD_SECRET) out.push('PAYLOAD_SECRET (dashboard logins cannot be signed)');
  if (!process.env.BLOB_READ_WRITE_TOKEN) out.push('BLOB_READ_WRITE_TOKEN (photo uploads have nowhere to go)');
  if (!process.env.PUBLISH_HOOK_URL) out.push('PUBLISH_HOOK_URL (the Publish button cannot trigger a deploy)');
  return out;
}

module.exports = { config, missingForProduction };
