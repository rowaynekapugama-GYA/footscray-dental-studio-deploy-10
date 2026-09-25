'use strict';
/**
 * /api/admin/<action>
 *
 *   POST login      {username, password}            -> session cookie
 *   POST logout
 *   GET  me                                          -> who is logged in, store, config gaps
 *   GET  content                                     -> {content, schema}
 *   PUT  content    {content}                        -> validated, saved, site rebuilt/redeployed
 *   POST password   {current, next}                  -> re-hashed, every other session logged out
 *   POST upload     {name, type, data: base64}       -> {path}
 *
 * Passwords are scrypt-hashed. Sessions are HMAC-signed HttpOnly cookies. Every
 * state-changing call needs the X-Requested-With header and a same-origin referer.
 */
const crypto = require('crypto');
const { config, missingForProduction } = require('../../lib/config');
const H = require('../../lib/http');
const auth = require('../../lib/auth');
const { getStore } = require('../../lib/store');
const schema = require('../../content/schema.json');
const { get, set } = require('../../lib/content');

const AUTH_PATH = 'content/auth.json';
const CONTENT_PATH = 'content/site.json';
let credsCache = { at: 0, value: null };

async function credentials(store) {
  if (Date.now() - credsCache.at < 30000 && credsCache.value) return credsCache.value;
  let value = null;
  try {
    const file = await store.read(AUTH_PATH);
    if (file) { const j = JSON.parse(file.text); if (j && j.hash) value = { username: j.username || config.admin.username, hash: j.hash, version: j.version || 1, source: 'file' }; }
  } catch (e) { console.error('admin: cannot read auth.json', e.message); }
  if (!value && config.admin.passwordHash) value = { username: config.admin.username, hash: config.admin.passwordHash, version: 0, source: 'env' };
  credsCache = { at: Date.now(), value };
  return value;
}

function setSession(req, res, user, version) {
  const exp = Date.now() + config.admin.sessionHours * 3600 * 1000;
  const token = auth.sign({ u: user, exp, pv: version, n: crypto.randomBytes(6).toString('hex') }, config.admin.sessionSecret);
  res.setHeader('Set-Cookie', auth.cookieHeader(config.admin.cookieName, token, { maxAge: config.admin.sessionHours * 3600, secure: H.isSecure(req) }));
}
function clearSession(req, res) {
  res.setHeader('Set-Cookie', auth.cookieHeader(config.admin.cookieName, '', { maxAge: 0, secure: H.isSecure(req) }));
}
const revoked = new Set();
async function currentUser(req, store) {
  const token = H.cookies(req)[config.admin.cookieName];
  const payload = auth.verify(token, config.admin.sessionSecret);
  if (!payload || revoked.has(payload.n)) return null;
  const creds = await credentials(store);
  if (!creds || creds.username !== payload.u || creds.version !== payload.pv) return null;
  return payload.u;
}

// ---------------------------------------------------------------- content validation
const SAFE_URL = /^(https?:\/\/|\/|mailto:|tel:)/i;
function fieldDefs() {
  const out = [];
  for (const sec of schema.sections) {
    for (const f of sec.fields || []) out.push(f);
  }
  return out;
}
function checkValue(f, v, errors, label) {
  if (v == null) return;
  if (f.type === 'checkbox') { if (typeof v !== 'boolean') errors.push(`${label}: must be true or false`); return; }
  if (f.type === 'list') {
    if (!Array.isArray(v)) { errors.push(`${label}: must be a list`); return; }
    if (v.length > 200) errors.push(`${label}: too many items`);
    v.forEach((item, i) => {
      if (!item || typeof item !== 'object') { errors.push(`${label} #${i + 1}: invalid`); return; }
      for (const sub of f.fields || []) checkValue(sub, item[sub.key], errors, `${label} #${i + 1} ${sub.label}`);
    });
    return;
  }
  if (typeof v !== 'string') { errors.push(`${label}: must be text`); return; }
  if (v.length > 20000) errors.push(`${label}: too long`);
  if (f.required && !v.trim()) errors.push(`${label}: required`);
  if (f.type === 'url' && v.trim() && !SAFE_URL.test(v.trim())) errors.push(`${label}: must be a web address starting with https:// or /`);
  if (f.type === 'image' && /^\s*(javascript|data|vbscript):/i.test(v)) errors.push(`${label}: not a valid image path`);
}
function validateContent(content) {
  const errors = [];
  if (!content || typeof content !== 'object' || Array.isArray(content)) return ['content must be an object'];
  if (JSON.stringify(content).length > 1024 * 1024) return ['content is too large'];
  for (const f of fieldDefs()) checkValue(f, get(content, f.key), errors, f.label);
  const pagesSec = schema.sections.find(s => s.dynamic === 'pages');
  if (pagesSec && content.pages) {
    for (const [slug, page] of Object.entries(content.pages)) {
      if (!/^[a-z0-9-]+$/.test(slug) || !page || typeof page !== 'object') { errors.push(`pages.${slug}: invalid`); continue; }
      for (const f of pagesSec.item_fields) checkValue(f, page[f.key], errors, `${slug} ${f.label}`);
    }
  }
  return errors;
}
function changedKeys(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].filter(k => JSON.stringify(before && before[k]) !== JSON.stringify(after && after[k]));
}

// ---------------------------------------------------------------- actions
const actions = {
  async login(req, res, store) {
    if (req.method !== 'POST') return H.fail(res, 405, 'Method not allowed');
    const ip = H.clientIp(req);
    if (!H.rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) return H.fail(res, 429, 'Too many attempts. Try again in 15 minutes.');
    const body = (await H.readJson(req)) || {};
    const creds = await credentials(store);
    if (!creds) return H.fail(res, 503, 'The admin panel has no password configured yet.');
    const okUser = String(body.username || '').trim() === creds.username;
    const okPass = auth.verifyPassword(String(body.password || ''), creds.hash);
    if (!okUser || !okPass) {
      await new Promise(r => setTimeout(r, 400));
      return H.fail(res, 401, 'Incorrect username or password.');
    }
    setSession(req, res, creds.username, creds.version);
    return H.ok(res, { user: creds.username, mustChangePassword: creds.source === 'env' });
  },

  async logout(req, res) {
    const payload = auth.verify(H.cookies(req)[config.admin.cookieName], config.admin.sessionSecret);
    if (payload && payload.n) { revoked.add(payload.n); if (revoked.size > 1000) revoked.clear(); }
    clearSession(req, res);
    return H.ok(res);
  },

  async me(req, res, store, user) {
    return H.ok(res, { user, store: store.describe(), missing: missingForProduction(),
      mustChangePassword: ((await credentials(store)) || {}).source === 'env' });
  },

  async content(req, res, store) {
    if (req.method === 'GET') {
      const file = await store.read(CONTENT_PATH);
      let content;
      if (file) content = JSON.parse(file.text);
      else {
        // content/site.json ships in the repo; this fallback only matters in local dev
        try { content = require('../../build/apply-content').extractDefaults(schema); }
        catch (e) { return H.fail(res, 503, 'content/site.json is missing from the repository. Run "node build/apply-content.js extract" and commit it.'); }
      }
      return H.ok(res, { content, schema, sha: file ? file.sha : null });
    }
    if (req.method !== 'PUT' && req.method !== 'POST') return H.fail(res, 405, 'Method not allowed');
    const body = (await H.readJson(req)) || {};
    const errors = validateContent(body.content);
    if (errors.length) return H.fail(res, 400, 'Please fix the highlighted fields.', { errors });
    const before = await store.read(CONTENT_PATH);
    const prev = before ? JSON.parse(before.text) : {};
    const changed = changedKeys(prev, body.content);
    if (!changed.length) return H.ok(res, { unchanged: true, note: 'Nothing changed.' });
    const text = JSON.stringify(body.content, null, 2) + '\n';
    const message = `Content update via admin panel: ${changed.join(', ')}`.slice(0, 200);
    try {
      const result = await store.write(CONTENT_PATH, text, message);
      credsCache.at = 0;
      const note = store.name === 'github'
        ? 'Saved. The site rebuilds automatically and your change will be live in about a minute.'
        : 'Saved and published.';
      return H.ok(res, { changed, commit: result.commit, url: result.url, note });
    } catch (e) {
      console.error('admin: save failed', e.message);
      return H.fail(res, 502, `Could not save: ${e.message}`);
    }
  },

  async password(req, res, store, user) {
    if (req.method !== 'POST') return H.fail(res, 405, 'Method not allowed');
    const body = (await H.readJson(req)) || {};
    const creds = await credentials(store);
    if (!creds || !auth.verifyPassword(String(body.current || ''), creds.hash)) return H.fail(res, 401, 'Current password is incorrect.');
    const problems = auth.passwordProblems(body.next);
    if (problems.length) return H.fail(res, 400, `New password needs ${problems.join(', ')}.`);
    if (String(body.next) === String(body.current)) return H.fail(res, 400, 'Choose a password you have not used here before.');
    const next = { username: creds.username, hash: auth.hashPassword(body.next), version: (creds.version || 0) + 1, updated: new Date().toISOString() };
    try {
      await store.write(AUTH_PATH, JSON.stringify(next, null, 2) + '\n', 'Admin password changed');
    } catch (e) {
      console.error('admin: password save failed', e.message);
      return H.fail(res, 502, `Could not save the new password: ${e.message}`);
    }
    credsCache = { at: 0, value: null };
    setSession(req, res, next.username, next.version);
    return H.ok(res, { note: 'Password changed. Any other open sessions have been signed out.' });
  },

  async upload(req, res, store) {
    if (req.method !== 'POST') return H.fail(res, 405, 'Method not allowed');
    const body = (await H.readJson(req)) || {};
    const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
    const ext = types[String(body.type || '').toLowerCase()];
    if (!ext) return H.fail(res, 400, 'Please upload a JPG, PNG, WebP, GIF or SVG image.');
    let buf;
    try { buf = Buffer.from(String(body.data || '').replace(/^data:[^;]+;base64,/, ''), 'base64'); } catch (e) { buf = null; }
    if (!buf || !buf.length) return H.fail(res, 400, 'The file was empty.');
    if (buf.length > 4 * 1024 * 1024) return H.fail(res, 400, 'Images must be under 4 MB. Resize it and try again.');
    const magic = buf.slice(0, 12);
    const isImg = (ext === 'jpg' && magic[0] === 0xff && magic[1] === 0xd8) || (ext === 'png' && magic.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
      || (ext === 'webp' && magic.slice(0, 4).toString() === 'RIFF') || (ext === 'gif' && magic.slice(0, 3).toString() === 'GIF')
      || (ext === 'svg' && /<svg[\s>]/i.test(buf.slice(0, 2000).toString('utf8')));
    if (!isImg) return H.fail(res, 400, 'That file does not look like the image type it claims to be.');
    if (ext === 'svg' && /<script|on[a-z]+\s*=|javascript:/i.test(buf.toString('utf8'))) return H.fail(res, 400, 'SVG files with scripts are not allowed.');
    const base = String(body.name || 'image').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
    const name = `${base}-${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8)}.${ext}`;
    try {
      await store.write(`site/assets/img/uploads/${name}`, buf, `Upload ${name} via admin panel`);
    } catch (e) {
      console.error('admin: upload failed', e.message);
      return H.fail(res, 502, `Upload failed: ${e.message}`);
    }
    return H.ok(res, { path: `/assets/img/uploads/${name}`, bytes: buf.length });
  },
};

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const action = (req.query && req.query.action) || url.pathname.split('/').filter(Boolean).pop();
  const fn = actions[action];
  if (!fn) return H.fail(res, 404, 'Unknown action');
  if (!config.admin.sessionSecret) return H.fail(res, 503, 'SESSION_SECRET is not configured on the server.');
  if (req.method !== 'GET' && !H.sameOrigin(req)) return H.fail(res, 403, 'Forbidden');

  let store;
  try { store = getStore(); } catch (e) { return H.fail(res, 503, e.message); }

  if (action === 'login' || action === 'logout') return fn(req, res, store);
  const user = await currentUser(req, store);
  if (!user) return H.fail(res, 401, 'Please sign in.');
  try {
    return await fn(req, res, store, user);
  } catch (e) {
    console.error(`admin/${action}:`, e);
    return H.fail(res, 500, 'Something went wrong on the server.');
  }
};
