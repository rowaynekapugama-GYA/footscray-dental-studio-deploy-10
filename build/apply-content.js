#!/usr/bin/env node
'use strict';
/**
 * Build step: site/ + content/site.json  ->  public/
 *
 *   node build/apply-content.js            build the deployable site into public/
 *   node build/apply-content.js extract    (re)generate content/site.json from site/
 *
 * site/ holds the pages exactly as the Python generators wrote them, with data-cms
 * markers on every editable spot. This script copies everything to public/, fills the
 * markers from content/site.json, strips the markers, and adds the admin panel.
 * Vercel runs it on every deploy, which is how an edit in the admin panel goes live.
 *
 * No dependencies: only Node's standard library.
 */
const fs = require('fs');
const path = require('path');
const { apply, extract } = require('../lib/content');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'public');
const CONTENT = path.join(ROOT, 'content', 'site.json');
const SCHEMA = path.join(ROOT, 'content', 'schema.json');
const ADMIN_SRC = path.join(ROOT, 'admin');

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, fn); else fn(p);
  }
}

function loadSchema() { return JSON.parse(fs.readFileSync(SCHEMA, 'utf8')); }

function extractDefaults(schema) {
  const into = {};
  const pages = [];
  walk(SRC, p => { if (p.endsWith('.html')) pages.push(p); });
  // home first so shared keys take their homepage values
  pages.sort((a, b) => (a.endsWith(path.join('site', 'index.html')) ? -1 : 0) - (b.endsWith(path.join('site', 'index.html')) ? -1 : 0));
  for (const p of pages) extract(fs.readFileSync(p, 'utf8'), schema, into);
  // sensible defaults for fields the pages do not carry yet
  into.practice = Object.assign({
    phone: '(03) 9000 0792', email: 'info@footscraydentalstudio.com.au',
    address: '289 Barkly St, Footscray VIC 3011',
    maps_url: 'https://www.google.com/maps/place/Ezy+Dental+Group+-+Dentist+Footscray/data=!4m2!3m1!1s0x0:0xc3d2cca966430256',
    review_url: '', review_label: 'Read our Google reviews', facebook: '', instagram: '', linkedin: ''
  }, into.practice || {});
  into.hours_note = into.hours_note || '';
  into.announcement = Object.assign({ enabled: false, text: '', link: '' }, into.announcement || {});
  if (Array.isArray(into.team)) for (const m of into.team) { if (!m.role) m.role = 'Dentist'; }
  return into;
}

function build() {
  const schema = loadSchema();
  let content;
  if (fs.existsSync(CONTENT)) {
    content = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
  } else {
    console.warn('content/site.json missing; building from the defaults in the pages');
    content = extractDefaults(schema);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let pages = 0, files = 0;
  walk(SRC, src => {
    const rel = path.relative(SRC, src);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (src.endsWith('.html')) {
      fs.writeFileSync(dest, apply(fs.readFileSync(src, 'utf8'), content, schema));
      pages++;
    } else {
      fs.copyFileSync(src, dest);
    }
    files++;
  });

  // admin panel
  if (fs.existsSync(ADMIN_SRC)) {
    fs.mkdirSync(path.join(OUT, 'admin'), { recursive: true });
    for (const f of fs.readdirSync(ADMIN_SRC)) fs.copyFileSync(path.join(ADMIN_SRC, f), path.join(OUT, 'admin', f));
  }
  // keep the panel and the API out of search engines
  const robots = path.join(OUT, 'robots.txt');
  if (fs.existsSync(robots)) {
    let r = fs.readFileSync(robots, 'utf8');
    if (!/Disallow:\s*\/admin/.test(r)) r = r.replace(/Allow: \/\n/, 'Allow: /\nDisallow: /admin/\nDisallow: /api/\n');
    fs.writeFileSync(robots, r);
  }
  // uploads folder is served from public/, keep any committed uploads
  console.log(`built public/: ${pages} pages patched, ${files} files copied`);
  return { pages, files };
}

function main() {
  const cmd = process.argv[2] || 'build';
  if (cmd === 'extract') {
    const schema = loadSchema();
    const force = process.argv.includes('--force');
    if (fs.existsSync(CONTENT) && !force) {
      console.error('content/site.json already exists. Use --force to overwrite it from the pages.');
      process.exit(1);
    }
    const content = extractDefaults(schema);
    fs.writeFileSync(CONTENT, JSON.stringify(content, null, 2) + '\n');
    const n = (o) => Object.keys(o).length;
    console.log(`wrote content/site.json: ${n(content)} top-level keys, ${n(content.pages || {})} pages, ${(content.team || []).length} team, ${(content.offers || []).length} offers`);
    return;
  }
  build();
}

if (require.main === module) main();
module.exports = { build, extractDefaults };
