'use strict';
/**
 * Tiny request/response helpers that behave the same under Vercel's Node runtime and
 * under the local dev server, so the handlers never depend on host-specific extras.
 */

const MAX_BODY = 5 * 1024 * 1024; // Vercel's own limit is ~4.5 MB

async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
    if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8')); } catch (e) { return null; } }
    return req.body;
  }
  return new Promise((resolve) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { resolve(null); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')); } catch (e) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(payload);
}
const ok = (res, body = {}, headers) => send(res, 200, Object.assign({ ok: true }, body), headers);
const fail = (res, status, error, extra) => send(res, status, Object.assign({ ok: false, error }, extra || {}));

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  return (Array.isArray(xf) ? xf[0] : (xf || '')).split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isSecure(req) {
  return (req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
}

/** Same-origin guard for state-changing calls: a custom header plus an Origin/Referer check. */
function sameOrigin(req) {
  if (req.headers['x-requested-with'] !== 'fetch') return false;
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return true; // some privacy modes strip it; the custom header still applies
  try { return new URL(origin).host === host; } catch (e) { return false; }
}

/** Very small in-memory rate limiter (per serverless instance, so best effort). */
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || [];
  const recent = b.filter(t => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) buckets.clear();
  return recent.length <= max;
}

module.exports = { readJson, send, ok, fail, cookies, clientIp, isSecure, sameOrigin, rateLimit };
