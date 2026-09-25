#!/usr/bin/env node
'use strict';
/**
 * End-to-end checks against the dev server (start it first: node dev-server.js).
 * Exercises the contact API directly, then the admin API: login, edit, publish,
 * verify the live page changed, upload, change password, session invalidation.
 *
 *   node test/run.js            (expects http://localhost:3000 and the .env credentials)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = process.env.BASE || 'http://localhost:3000';
const ROOT = path.resolve(__dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const PASSWORD = process.env.ADMIN_PASSWORD || fs.readFileSync(process.env.CREDS_FILE, 'utf8').match(/password:\s*(\S+)/)[1];

let passed = 0, failed = 0;
function check(cond, title, detail) {
  if (cond) { passed++; console.log(`PASS  ${title}`); }
  else { failed++; console.log(`FAIL  ${title}${detail ? `\n      ${detail}` : ''}`); }
}
const H = { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch', Origin: BASE };
async function post(url, body, extra = {}) {
  const r = await fetch(BASE + url, { method: 'POST', headers: { ...H, ...extra }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})), headers: r.headers };
}
async function call(url, method, body, cookie) {
  const r = await fetch(BASE + url, { method, headers: { ...H, ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), headers: r.headers };
}
const outbox = () => fs.existsSync(path.join(ROOT, 'outbox')) ? fs.readdirSync(path.join(ROOT, 'outbox')).length : 0;
const page = (p) => fs.readFileSync(path.join(ROOT, 'public', p), 'utf8');

(async () => {
  console.log(`\n=== Contact form API (${BASE}) ===`);
  const before = outbox();
  const old = String(Date.now() - 10000);
  let r = await post('/api/contact', { form_type: 'appointment', 'first-name': 'Test', 'last-name': 'Patient', email: 'test@example.com',
    phone: '0400 000 000', service: 'Check-up & Clean', datetime: '2026-10-01T10:00', message: 'Hello from the test', page: '/', ts: old, website: '' });
  check(r.status === 200 && r.json.ok, '1. Valid appointment request is accepted', JSON.stringify(r.json));
  check(outbox() === before + 1, '2. …and an email was produced (log provider wrote to outbox/)');
  const mail = JSON.parse(fs.readFileSync(path.join(ROOT, 'outbox', fs.readdirSync(path.join(ROOT, 'outbox')).sort().pop()), 'utf8'));
  check(mail.to[0] === 'reception@example.test' && mail.replyTo === 'test@example.com' && /Test Patient/.test(mail.subject),
    '3. Email goes to CONTACT_TO, reply-to is the patient, subject names them', mail.subject);
  check(/Preferred time: 2026-10-01T10:00/.test(mail.text) && /Service: Check-up/.test(mail.text), '4. Email body carries every field');

  r = await post('/api/contact', { form_type: 'contact', name: 'Bot', email: 'bot@example.com', phone: '0400000000', message: 'buy', ts: old, website: 'http://spam' });
  check(r.status === 200 && r.json.ok && outbox() === before + 1, '5. Honeypot filled: silent 200, nothing sent');
  r = await post('/api/contact', { form_type: 'contact', name: 'Fast', email: 'f@example.com', phone: '0400000000', message: 'hi', ts: String(Date.now()), website: '' });
  check(r.status === 200 && outbox() === before + 1, '6. Submitted under 3 s: silent 200, nothing sent');
  r = await post('/api/contact', { form_type: 'contact', name: 'X', email: 'not-an-email', phone: '0400000000', message: 'hi', ts: old });
  check(r.status === 400 && /email/i.test(r.json.error), '7. Bad email rejected with a readable message', r.json.error);
  r = await post('/api/contact', { form_type: 'contact', name: 'X', email: 'x@example.com', phone: '12', message: 'hi', ts: old });
  check(r.status === 400 && /phone/i.test(r.json.error), '8. Bad phone rejected');
  r = await post('/api/contact', { form_type: 'contact', name: 'X', email: 'x@example.com', phone: '0400000000', message: 'hi', ts: old }, { 'X-Requested-With': '' });
  check(r.status === 403, '9. Cross-site post without the fetch header is refused');
  r = await post('/api/contact', { form_type: 'newsletter', email: 'news@example.com', ts: old });
  check(r.status === 200 && outbox() === before + 2, '10. Newsletter sign-up accepted and emailed');
  r = await post('/api/contact', { form_type: 'contact', name: 'X', email: 'x@example.com', phone: '0400000000', message: '', ts: old });
  check(r.status === 400, '11. Contact form requires a message');
  r = await post('/api/contact', { form_type: 'contact', name: '<b>Eve</b>', email: 'eve@example.com', phone: '0400000000', message: '<script>alert(1)</script>', ts: old });
  const last = JSON.parse(fs.readFileSync(path.join(ROOT, 'outbox', fs.readdirSync(path.join(ROOT, 'outbox')).sort().pop()), 'utf8'));
  check(r.status === 200 && !/<script>/.test(last.html) && /&lt;script&gt;/.test(last.html), '12. HTML in submissions is escaped in the email');

  console.log('\n=== Admin API ===');
  r = await call('/api/admin/login', 'POST', { username: env.ADMIN_USERNAME, password: 'wrong-password-123' });
  check(r.status === 401, '13. Wrong password refused');
  r = await call('/api/admin/content', 'GET');
  check(r.status === 401, '14. Content requires a session');
  r = await call('/api/admin/login', 'POST', { username: env.ADMIN_USERNAME, password: PASSWORD });
  const setCookie = r.headers.get('set-cookie') || '';
  check(r.status === 200 && r.json.ok && /HttpOnly/.test(setCookie) && /SameSite=Lax/.test(setCookie), '15. Login sets an HttpOnly, SameSite cookie', setCookie.slice(0, 60));
  let cookie = setCookie.split(';')[0];
  check(r.json.mustChangePassword === true, '16. First login flags the initial password for changing');

  r = await call('/api/admin/me', 'GET', null, cookie);
  check(r.status === 200 && r.json.user === env.ADMIN_USERNAME, '17. /me returns the signed-in user');
  r = await call('/api/admin/content', 'GET', null, cookie);
  check(r.status === 200 && r.json.content && r.json.schema && r.json.content.home.h1, '18. Content and schema load');
  const content = r.json.content;

  // ---- edit several things and publish
  const stamp = 'Test ' + Date.now();
  content.home.h1 = 'Gentle Dentistry in Footscray ' + stamp;
  content.practice.phone = '(03) 9111 2222';
  content.practice.facebook = 'https://www.facebook.com/footscraydental';
  content.hours[0].time = '8:30am–5:30pm';
  content.hours_note = 'Closed public holidays.';
  content.announcement = { enabled: true, text: 'Now open Saturdays ' + stamp, link: '/contact/' };
  content.team.push({ name: 'Dr Test Person', role: 'Dentist', photo: '/assets/img/hero-home.jpg', bio: 'First para.\n\nSecond **bold** para.' });
  content.offers[0].price = '$99';
  content.home.faq.push({ q: 'Is this a test question?', a: 'Yes, it is.' });
  r = await call('/api/admin/content', 'PUT', { content }, cookie);
  check(r.status === 200 && r.json.ok && r.json.changed.includes('home') && r.json.changed.includes('practice'), '19. Publish accepted, reports what changed', JSON.stringify(r.json).slice(0, 200));

  const home = page('index.html'), team = page('meet-the-team/index.html'), contact = page('contact/index.html'), post1 = page('tooth-pain-relief/index.html');
  check(home.includes('<h1>Gentle Dentistry in Footscray ' + stamp + '</h1>'), '20. Homepage headline changed on the live page');
  check(home.includes('(03) 9111 2222') && !home.includes('(03) 9000 0792') && home.includes('tel:+61391112222'), '21. New phone number everywhere on the homepage, including tel: links');
  check(post1.includes('(03) 9111 2222') && contact.includes('(03) 9111 2222'), '22. …and on inner pages and blog posts');
  check(home.includes('href="https://www.facebook.com/footscraydental"') && !home.includes('href="" '), '23. Facebook link now shows (was hidden while blank)');
  check(home.includes('8:30am–5:30pm') && contact.includes('8:30am–5:30pm') && home.includes('Closed public holidays.'), '24. Hours and note updated on home and contact');
  check(/"opens":"08:30","closes":"17:30"/.test(home), '25. Structured data opening hours regenerated from the new hours');
  check(/"telephone":"\(03\) 9111 2222"/.test(home), '26. Structured data phone regenerated');
  check(home.includes('class="announce"') && home.includes('has-announce') && home.includes('Now open Saturdays ' + stamp), '27. Announcement bar injected and body flagged');
  const members = team.match(/<div class="split[^"]*team-feature[^"]*"/g) || [];
  check(team.includes('Dr Test Person') && team.includes('<p>Second <strong>bold</strong> para.</p>') && members.length === 4, '28. Fourth team member rendered with paragraphs and bold', String(members.length));
  check(/split--rev/.test(members[3] || '') && !/split--rev/.test(members[2] || ''), '29. Alternating layout applied to the new (odd-indexed) member', members.join(' | '));
  check(home.includes('$99') && page('special-offers/index.html').includes('$99'), '30. Offer price changed on both the homepage and the offers page');
  check(home.includes('Is this a test question?') && home.includes('<p>Yes, it is.</p>'), '31. New FAQ item rendered');
  check(!/data-cms/.test(home) && !/data-cms/.test(team), '32. No CMS markers leak into the published HTML');

  // ---- validation
  const bad = JSON.parse(JSON.stringify(content)); bad.home.h1 = ''; bad.practice.review_url = 'javascript:alert(1)';
  r = await call('/api/admin/content', 'PUT', { content: bad }, cookie);
  check(r.status === 400 && r.json.errors && r.json.errors.length >= 2, '33. Empty required field and javascript: URL rejected', JSON.stringify(r.json.errors));

  // ---- upload
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  r = await call('/api/admin/upload', 'POST', { name: 'Test Photo.png', type: 'image/png', data: 'data:image/png;base64,' + png.toString('base64') }, cookie);
  check(r.status === 200 && /^\/assets\/img\/uploads\/test-photo-[a-f0-9]{8}\.png$/.test(r.json.path), '34. Image upload stored under a safe name', JSON.stringify(r.json));
  check(fs.existsSync(path.join(ROOT, 'public', r.json.path)), '35. Uploaded image is served from public/');
  r = await call('/api/admin/upload', 'POST', { name: 'evil.png', type: 'image/png', data: Buffer.from('<html>').toString('base64') }, cookie);
  check(r.status === 400, '36. A non-image claiming to be PNG is rejected');
  r = await call('/api/admin/upload', 'POST', { name: 'x.svg', type: 'image/svg+xml', data: Buffer.from('<svg onload="alert(1)"></svg>').toString('base64') }, cookie);
  check(r.status === 400, '37. SVG with script handlers is rejected');

  // ---- password change
  r = await call('/api/admin/password', 'POST', { current: 'nope', next: 'NewPassword12345' }, cookie);
  check(r.status === 401, '38. Password change needs the current password');
  r = await call('/api/admin/password', 'POST', { current: PASSWORD, next: 'short' }, cookie);
  check(r.status === 400, '39. Weak new password rejected');
  r = await call('/api/admin/password', 'POST', { current: PASSWORD, next: 'BrandNewPassw0rd2026' }, cookie);
  const newCookie = (r.headers.get('set-cookie') || '').split(';')[0];
  check(r.status === 200 && r.json.ok && newCookie && newCookie !== cookie, '40. Password changed and a fresh session issued');
  check(fs.existsSync(path.join(ROOT, 'content', 'auth.json')) && /"version": 1/.test(fs.readFileSync(path.join(ROOT, 'content', 'auth.json'), 'utf8')), '41. New hash persisted to content/auth.json');
  r = await call('/api/admin/me', 'GET', null, cookie);
  check(r.status === 401, '42. The old session is invalid after the password change');
  r = await call('/api/admin/login', 'POST', { username: env.ADMIN_USERNAME, password: PASSWORD });
  check(r.status === 401, '43. Old password no longer works');
  r = await call('/api/admin/login', 'POST', { username: env.ADMIN_USERNAME, password: 'BrandNewPassw0rd2026' });
  check(r.status === 200 && r.json.mustChangePassword === false, '44. New password works and the first-login warning is gone');
  cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  r = await call('/api/admin/logout', 'POST', null, cookie);
  check(r.status === 200 && /Max-Age=0/.test(r.headers.get('set-cookie') || ''), '45. Logout clears the cookie');
  r = await call('/api/admin/me', 'GET', null, cookie);
  check(r.status === 401, '46. …and the session is gone');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
