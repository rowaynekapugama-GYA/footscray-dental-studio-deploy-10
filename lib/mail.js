'use strict';
/**
 * Sends email through an HTTP API, so nothing needs installing and it runs anywhere.
 *
 *   smtp2go  SMTP2GO_API_KEY            https://api.smtp2go.com/v3/email/send
 *   resend   RESEND_API_KEY             https://api.resend.com/emails
 *   log      no key                     writes the email to outbox/ instead of sending
 *
 * The sender address (CONTACT_FROM) must belong to a domain verified with whichever
 * provider is used, or the provider will reject it.
 */
const fs = require('fs');
const path = require('path');
const { config } = require('./config');

async function sendSmtp2go({ to, from, replyTo, subject, text, html }) {
  const body = {
    api_key: config.mail.smtp2goKey,
    to, sender: from, subject, text_body: text, html_body: html,
    custom_headers: replyTo ? [{ header: 'Reply-To', value: replyTo }] : [],
  };
  const res = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const okCount = data && data.data && data.data.succeeded;
  if (!res.ok || !okCount) {
    const why = (data && data.data && (data.data.error || (data.data.failures || []).join('; '))) || `HTTP ${res.status}`;
    throw new Error(`SMTP2GO: ${why}`);
  }
  return { id: data.data.email_id, provider: 'smtp2go' };
}

async function sendResend({ to, from, replyTo, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.mail.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text, html, reply_to: replyTo || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend: ${(data && data.message) || `HTTP ${res.status}`}`);
  return { id: data.id, provider: 'resend' };
}

async function sendLog(msg) {
  if (process.env.VERCEL) throw new Error('No email provider configured: set SMTP2GO_API_KEY (or RESEND_API_KEY) in the Vercel environment variables and redeploy.');
  fs.mkdirSync(config.mail.outbox, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(config.mail.outbox, `${stamp}-${Math.random().toString(36).slice(2, 7)}.json`);
  fs.writeFileSync(file, JSON.stringify(msg, null, 2));
  return { id: path.basename(file), provider: 'log', file };
}

async function sendMail(msg) {
  switch (config.mail.provider) {
    case 'smtp2go': return sendSmtp2go(msg);
    case 'resend': return sendResend(msg);
    case 'log': return sendLog(msg);
    default: throw new Error(`Unknown MAIL_PROVIDER "${config.mail.provider}"`);
  }
}

module.exports = { sendMail };
