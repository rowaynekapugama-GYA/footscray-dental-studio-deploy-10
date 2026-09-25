'use strict';
/**
 * Password hashing and signed sessions, using only Node's crypto module.
 *
 * Passwords: scrypt (N=16384, r=8, p=1), 16-byte random salt, 64-byte key.
 *   stored as  scrypt$16384$8$1$<salt b64>$<hash b64>
 * Sessions:   HMAC-SHA256 signed cookie carrying {u, exp, pv}. pv is the password
 *             version, so changing the password logs every other session out.
 */
const crypto = require('crypto');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

function verifyPassword(password, stored) {
  try {
    const [algo, N, r, p, saltB64, hashB64] = String(stored || '').split('$');
    if (algo !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const key = crypto.scryptSync(String(password), salt, expected.length, { N: +N, r: +r, p: +p });
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  } catch (e) {
    return false;
  }
}

function passwordProblems(pw) {
  const s = String(pw || '');
  const issues = [];
  if (s.length < 12) issues.push('at least 12 characters');
  if (!/[a-z]/.test(s) || !/[A-Z]/.test(s)) issues.push('both upper and lower case letters');
  if (!/[0-9]/.test(s)) issues.push('a number');
  return issues;
}

function generatePassword(len = 20) {
  // unambiguous characters only, so it can be read out over the phone if needed
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  while (true) {
    out = Array.from(crypto.randomBytes(len)).map(b => alphabet[b % alphabet.length]).join('');
    if (!passwordProblems(out).length) return out;
  }
}

// ---------------------------------------------------------------- sessions
function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64url(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }

function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const mac = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${mac}`;
}

function verify(token, secret) {
  if (!token || !secret) return null;
  const [body, mac] = String(token).split('.');
  if (!body || !mac) return null;
  const expected = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(unb64url(body).toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

function cookieHeader(name, value, { maxAge, secure }) {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

module.exports = { hashPassword, verifyPassword, passwordProblems, generatePassword, sign, verify, cookieHeader };
