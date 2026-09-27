'use strict';
/**
 * Contact form logic shared by app/api/contact/route.ts.
 *
 * Receives the appointment, contact and newsletter forms as JSON, checks them, and
 * emails the practice. Bots are dropped silently: a filled honeypot field, a submit
 * under three seconds from page load, or too many posts from one address all return
 * a normal-looking success without sending anything.
 */
const { config } = require('./config.cjs');
const { rateLimit } = require('./http.cjs');

const MAX = { name: 120, email: 200, phone: 40, message: 5000, service: 120, datetime: 60, page: 300 };
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[\d\s()+-]{8,}$/;

function validate(body) {
  const type = ['appointment', 'contact', 'newsletter'].includes(body.form_type) ? body.form_type : null;
  if (!type) return { error: 'Unknown form.' };
  const f = {
    type,
    name: clean(type === 'appointment' ? `${body['first-name'] || ''} ${body['last-name'] || ''}` : body.name, MAX.name),
    email: clean(body.email, MAX.email).toLowerCase(),
    phone: clean(body.phone, MAX.phone),
    service: clean(body.service, MAX.service),
    datetime: clean(body.datetime, MAX.datetime),
    message: clean(body.message, MAX.message),
    page: clean(body.page, MAX.page),
  };
  if (!EMAIL_RE.test(f.email)) return { error: 'Please enter a valid email address.' };
  if (type !== 'newsletter') {
    if (!f.name) return { error: 'Please enter your name.' };
    if (!PHONE_RE.test(f.phone)) return { error: 'Please enter a valid phone number.' };
    if (type === 'contact' && !f.message) return { error: 'Please enter a message.' };
  }
  return { fields: f };
}

function looksLikeSpam(body, ip) {
  if (clean(body.website, 200)) return 'honeypot';
  const ts = parseInt(body.ts, 10);
  if (Number.isFinite(ts) && Date.now() - ts < 3000) return 'too fast';
  if (!rateLimit(`contact:${ip}`, 6, 10 * 60 * 1000)) return 'rate limit';
  const text = `${body.message || ''} ${body.name || ''}`;
  if ((text.match(/https?:\/\//g) || []).length > 3) return 'link spam';
  return null;
}

function render(f, ip) {
  const when = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'full', timeStyle: 'short' });
  const titles = { appointment: 'New appointment request', contact: 'New contact message', newsletter: 'New newsletter sign-up' };
  const rows = [
    ['Name', f.name], ['Email', f.email], ['Phone', f.phone],
    f.type === 'appointment' ? ['Service', f.service] : null,
    f.type === 'appointment' ? ['Preferred time', f.datetime] : null,
    ['Message', f.message], ['Sent from', f.page ? `${config.siteUrl}${f.page}` : ''], ['Received', when], ['IP', ip],
  ].filter(r => r && r[1]);
  const subject = `${config.mail.subjectPrefix} ${titles[f.type]}${f.name ? ` from ${f.name}` : ''}`.trim();
  const text = `${titles[f.type]}\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    (f.type !== 'newsletter' ? `\n\nReply to this email to respond to ${f.name}.` : '');
  const html = `<!doctype html><body style="font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#33424f;padding:24px">
<h2 style="margin:0 0 16px;color:#2d4459">${esc(titles[f.type])}</h2>
<table style="border-collapse:collapse">${rows.map(([k, v]) =>
  `<tr><td style="padding:6px 16px 6px 0;color:#66727e;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>
${f.type !== 'newsletter' ? `<p style="margin-top:20px;color:#66727e">Reply to this email to respond to ${esc(f.name)}.</p>` : ''}
</body>`;
  return { subject, text, html };
}

function autoReply(f) {
  const first = f.name.split(' ')[0] || 'there';
  const body = f.type === 'appointment'
    ? `Hi ${first},\n\nThanks for your appointment request. Our team will be in touch during business hours to confirm a time.\n\nIf it is urgent, please call us on ${config.mail.practicePhone}.\n\nFootscray Dental Studio\n289 Barkly St, Footscray VIC 3011`
    : `Hi ${first},\n\nThanks for getting in touch. Our team will reply during business hours.\n\nIf it is urgent, please call us on ${config.mail.practicePhone}.\n\nFootscray Dental Studio\n289 Barkly St, Footscray VIC 3011`;
  return { to: [f.email], from: config.mail.from, subject: 'We have received your message', text: body,
    html: `<pre style="font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(body)}</pre>` };
}

module.exports = { validate, looksLikeSpam, render, autoReply };
