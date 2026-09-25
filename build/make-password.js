#!/usr/bin/env node
'use strict';
/**
 * Generates admin credentials, or hashes a password you choose.
 *
 *   node build/make-password.js                 random 20-character password + its hash
 *   node build/make-password.js "My Passw0rd!"  hash for that password
 *   node build/make-password.js --secret        a fresh SESSION_SECRET
 *
 * Put the hash in the ADMIN_PASSWORD_HASH environment variable (Vercel > Settings >
 * Environment Variables) or in content/auth.json. The plain password is never stored.
 */
const crypto = require('crypto');
const { hashPassword, generatePassword } = require('../lib/auth');

const arg = process.argv[2];
if (arg === '--secret') {
  console.log(crypto.randomBytes(32).toString('base64url'));
  process.exit(0);
}
const password = arg || generatePassword(20);
console.log(`password:            ${password}`);
console.log(`ADMIN_PASSWORD_HASH: ${hashPassword(password)}`);
