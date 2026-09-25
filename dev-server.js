#!/usr/bin/env node
'use strict';
/**
 * Local server that behaves like the Vercel deployment:
 *   - serves public/ with clean URLs and trailing slashes (like vercel.json)
 *   - routes /api/contact and /api/admin/<action> to the same handler files Vercel runs
 *
 * Usage:  node dev-server.js            (http://localhost:3000)
 *         PORT=8080 node dev-server.js
 *
 * Copy .env.example to .env first. With no mail key set, form submissions are written
 * to outbox/ instead of being sent, and with no GITHUB_TOKEN the admin panel saves to
 * disk and rebuilds public/ on the spot.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml', '.woff2': 'font/woff2' };

// handlers are loaded once, like a warm serverless instance; restart the server after code changes
const contactHandler = require('./api/contact.js');
const adminHandler = require('./api/admin/[action].js');

function serveStatic(req, res, pathname) {
  let p = decodeURIComponent(pathname);
  if (p.includes('..')) { res.writeHead(400); return res.end('bad path'); }
  let file = path.join(PUBLIC, p);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(308, { Location: p + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  } else if (!fs.existsSync(file) && fs.existsSync(file + '.html')) {
    file = file + '.html';
  }
  if (!fs.existsSync(file)) {
    const nf = path.join(PUBLIC, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/contact') {
      return await contactHandler(req, res);
    }
    const m = /^\/api\/admin\/([a-z]+)\/?$/.exec(url.pathname);
    if (m) {
      req.query = { action: m[1] };
      return await adminHandler(req, res);
    }
    if (url.pathname.startsWith('/api/')) { res.writeHead(404); return res.end('no such function'); }
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'server error' }));
  }
});

server.listen(PORT, () => {
  const { config, missingForProduction } = require('./lib/config');
  console.log(`Footscray Dental Studio dev server  http://localhost:${PORT}`);
  console.log(`  admin panel   http://localhost:${PORT}/admin/`);
  console.log(`  mail provider ${config.mail.provider}${config.mail.provider === 'log' ? ' (emails written to outbox/)' : ''}`);
  console.log(`  content store ${config.store.kind}`);
  const missing = missingForProduction();
  if (missing.length) console.log(`  not yet set for production:\n    - ${missing.join('\n    - ')}`);
});
