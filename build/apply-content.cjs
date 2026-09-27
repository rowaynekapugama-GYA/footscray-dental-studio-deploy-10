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
 * markers from content/site.json and strips the markers. The dashboard (Payload) is a
 * Next.js app served alongside; scripts/build.mjs runs this on every deploy.
 *
 * No dependencies: only Node's standard library.
 */
const fs = require('fs');
const path = require('path');
const { apply, extract } = require('../lib/content.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'public');
const CONTENT = path.join(ROOT, 'content', 'site.json');
const SCHEMA = path.join(ROOT, 'content', 'schema.json');

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
  // dotted keys like pages.x.sections.0.body arrive as objects keyed "0","1"...; make them arrays
  const arrayify = (o) => {
    if (Array.isArray(o)) return o.map(arrayify);
    if (o && typeof o === 'object') {
      const keys = Object.keys(o);
      if (keys.length && keys.every(k => /^\d+$/.test(k))) return keys.map(Number).sort((a, b) => a - b).map(i => arrayify(o[i]));
      for (const k of keys) o[k] = arrayify(o[k]);
    }
    return o;
  };
  arrayify(into);
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

  // Cache busting. /assets/* is served with a one-year immutable cache header, so a
  // changed stylesheet or script must get a new URL or returning visitors keep the old
  // copy for a year. Every CSS/JS reference gets ?v=<content hash>, which changes only
  // when the file does.
  const versions = {};
  walk(SRC, p => {
    if (/\.(css|js)$/.test(p)) {
      const rel = '/' + path.relative(SRC, p).split(path.sep).join('/');
      versions[rel] = require('crypto').createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 10);
    }
  });
  // pages reference assets relatively (../assets/...) so resolve against /assets/
  const fingerprint = html => html.replace(/(href|src)="((?:\.\.\/)*\/?)(assets\/[^"?#]+\.(?:css|js))"/g,
    (m, attr, prefix, file) => (versions['/' + file] ? `${attr}="${prefix}${file}?v=${versions['/' + file]}"` : m));

  let pages = 0, files = 0;
  walk(SRC, src => {
    const rel = path.relative(SRC, src);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (src.endsWith('.html')) {
      const pagePath = rel === 'index.html' ? '/' : '/' + path.dirname(rel).split(path.sep).join('/') + '/';
      fs.writeFileSync(dest, fingerprint(apply(fs.readFileSync(src, 'utf8'), content, schema, pagePath)));
      pages++;
    } else {
      fs.copyFileSync(src, dest);
    }
    files++;
  });

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
