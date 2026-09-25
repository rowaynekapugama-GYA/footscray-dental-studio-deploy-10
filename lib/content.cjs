'use strict';
/**
 * Applies content/site.json to the generated pages, and extracts the defaults from them.
 *
 * apply(html, content, schema)  -> patched html for one page
 * extract(html, schema, into)   -> fills `into` with the values found in one page
 *
 * Marker vocabulary (set by the Python generators):
 *   data-cms="key"               replace the element's inner HTML with the value
 *   data-cms-attr="attr:key,..." set attributes from values
 *   data-cms-list="key"          the element's children are item templates; one is
 *                                cloned per item in the array (cycling through them)
 *   data-cms-alternate="cls"     on a list: toggle cls on odd-indexed items
 *   data-cms-hide-if-empty       remove the element when the value is blank
 */
const H = require('./html.cjs');

// ---------------------------------------------------------------- key helpers
function get(obj, path) {
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function set(obj, path, value) {
  const parts = String(path).split('.');
  let o = obj;
  for (const k of parts.slice(0, -1)) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  o[parts[parts.length - 1]] = value;
}

/** Map every key (absolute and list-relative) to its field definition. */
function fieldIndex(schema) {
  const abs = new Map(), lists = new Map();
  for (const sec of schema.sections) {
    for (const f of sec.fields || []) {
      abs.set(f.key, f);
      if (f.type === 'list') lists.set(f.key, f);
    }
    if (sec.dynamic === 'pages') abs.set('__pages__', sec);
  }
  return { abs, lists, pageFields: (schema.sections.find(s => s.dynamic === 'pages') || {}).item_fields || [] };
}

/**
 * Keys that are not spelled out in schema.json follow patterns:
 *   pages.<slug>.sections.<n>.heading|body|image   editable body sections, in page order
 *   pages.<slug>.faq                              list of {q, a}
 *   pages.<slug>.cards|category_cards|extra_cards|wait_cards   lists of {title, text}
 *   about.tech_cards                              list of {title, text}
 *   <anything>_body | <anything>.body             html
 */
const LIST_PATTERNS = [
  { re: /^(pages\.[^.]+|home|about|offers_page|contact)\.faq$/, def: { fields: [{ key: 'q', type: 'text' }, { key: 'a', type: 'html' }] } },
  { re: /^pages\.[^.]+\.(cards|category_cards|extra_cards|wait_cards)$/, def: { fields: [{ key: 'title', type: 'text' }, { key: 'text', type: 'text' }] } },
  { re: /^about\.tech_cards$/, def: { fields: [{ key: 'title', type: 'text' }, { key: 'text', type: 'text' }] } },
];
function listDefFor(key, idx) {
  if (idx.lists.has(key)) return idx.lists.get(key);
  const hit = LIST_PATTERNS.find(p => p.re.test(key));
  return hit ? Object.assign({ key }, hit.def) : undefined;
}
function typeOf(key, idx, listDef) {
  if (listDef) {
    const f = (listDef.fields || []).find(x => x.key === key);
    if (f) return f.type;
    return key === 'initial' ? 'initial' : 'text';
  }
  if (idx.abs.has(key)) return idx.abs.get(key).type;
  const m = /^pages\.[^.]+\.([^.]+)$/.exec(key);
  if (m) { const f = idx.pageFields.find(x => x.key === m[1]); if (f) return f.type; }
  if (/\.sections\.\d+\.body$/.test(key) || /(^|[._])body$/.test(key)) return 'html';
  if (/\.sections\.\d+\.image$/.test(key)) return 'image';
  if (key === 'hours_line') return 'text';
  return 'text';
}

// ---------------------------------------------------------------- rendering values
function renderValue(value, type) {
  if (value == null) value = '';
  switch (type) {
    case 'paragraphs': {
      const paras = String(value).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      return paras.map(p => `<p>${H.inlineToHtml(p.replace(/\s*\n\s*/g, ' '))}</p>`).join('\n');
    }
    case 'lines': {
      const lines = String(value).split(/\n/).map(s => s.trim()).filter(Boolean);
      return lines.map(l => `<li>${H.inlineToHtml(l)}</li>`).join('');
    }
    case 'html':
      return String(value);   // pre-rendered by the CMS (Lexical -> site markup), inserted verbatim
    case 'initial':
      return H.escapeHtml(String(value).replace(/^(Dr\.?|Doctor)\s+/i, '').trim().charAt(0).toUpperCase());
    case 'checkbox':
      return value ? 'true' : '';
    default:
      return H.inlineToHtml(String(value));
  }
}
function isEmpty(value, type) {
  if (value == null) return true;
  if (type === 'checkbox') return !value;
  return String(value).trim() === '';
}

// ---------------------------------------------------------------- apply
function applyMarkers(html, resolve, opts) {
  // 1. lists, last first so earlier offsets stay valid
  const lists = H.findByAttr(html, 'data-cms-list').reverse();
  for (const el of lists) {
    const r = resolve(el.attrValue);
    if (!r || !Array.isArray(r.value)) continue;
    const skip = parseInt(H.getAttr(el.startTag, 'data-cms-list-skip') || '0', 10) || 0;
    const children = H.childElements(el.inner);
    const fixed = children.slice(0, skip).map(c => c.outer);   // leading children that are not items
    const templates = children.slice(skip).map(c => c.outer);
    if (!templates.length) continue;
    const alt = H.getAttr(el.startTag, 'data-cms-alternate');
    const listDef = r.field;
    const rendered = r.value.map((item, i) => {
      let tpl = templates[i % templates.length];
      const itemResolve = (key) => {
        if (key.includes('.')) return resolve(key);              // absolute key inside an item
        return { value: key === 'initial' ? item.name : item[key], type: typeOf(key, null, listDef) };
      };
      let out = applyMarkers(tpl, itemResolve, opts);
      if (alt) {
        const first = H.parseStartTag(out, 0);
        if (first) {
          let cls = H.getAttr(first.startTag, 'class') || '';
          const has = cls.split(/\s+/).includes(alt);
          if (i % 2 === 1 && !has) cls = (cls + ' ' + alt).trim();
          if (i % 2 === 0 && has) cls = cls.split(/\s+/).filter(c => c !== alt).join(' ');
          out = H.setAttr(first.startTag, 'class', cls) + out.slice(first.startTagEnd);
        }
      }
      return stripMarkers(out);
    });
    // count-aware grid classes (grid--n5) follow the new item count
    let startTag = el.startTag;
    if (/\bgrid--n\d+\b/.test(startTag)) startTag = startTag.replace(/\bgrid--n\d+\b/, 'grid--n' + rendered.length);
    html = html.slice(0, el.start) + startTag + html.slice(el.startTagEnd, el.innerStart) + fixed.concat(rendered).join('\n') + html.slice(el.innerEnd);
  }

  // 2. attributes
  for (const el of H.findByAttr(html, 'data-cms-attr').reverse()) {
    const pairs = el.attrValue.split(',').map(s => s.trim()).filter(Boolean);
    let startTag = el.startTag, remove = false;
    const hide = H.getAttr(el.startTag, 'data-cms-hide-if-empty') !== undefined;
    for (const pair of pairs) {
      const [attr, key] = pair.split(':');
      const r = resolve(key);
      if (!r) continue;
      if (isEmpty(r.value, r.type)) { if (hide) remove = true; continue; }
      startTag = H.setAttr(startTag, attr, String(r.value));
    }
    html = remove
      ? html.slice(0, el.start) + html.slice(el.end)
      : html.slice(0, el.start) + startTag + html.slice(el.startTagEnd);
  }

  // 3. inner content
  for (const el of H.findByAttr(html, 'data-cms').reverse()) {
    const r = resolve(el.attrValue);
    if (!r) continue;
    const hide = H.getAttr(el.startTag, 'data-cms-hide-if-empty') !== undefined;
    if (isEmpty(r.value, r.type)) {
      if (hide) html = html.slice(0, el.start) + html.slice(el.end);
      else if (r.value != null) html = html.slice(0, el.innerStart) + html.slice(el.innerEnd);
      continue;
    }
    html = html.slice(0, el.innerStart) + renderValue(r.value, r.type) + html.slice(el.innerEnd);
  }
  return html;
}

function stripMarkers(html) {
  return html.replace(/\s(data-cms(?:-list|-list-skip|-attr|-alternate|-hide-if-empty|-opts)?)(?:="[^"]*")?(?=[\s>\/])/g, '');
}

// ---------------------------------------------------------------- derived, globals, schema.org, announcement
function computeDerived(content, schema) {
  for (const d of schema.derived || []) {
    if (d.rule === 'hours_line') {
      const rows = Array.isArray(content.hours) ? content.hours : [];
      set(content, d.key, rows.filter(r => r && (r.days || r.time))
        .map(r => `${(r.days || '').trim()} ${(r.time || '').trim()}`.trim()).join(' · '));
    }
  }
  return content;
}

function telHref(phone) {
  let digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return 'tel:' + digits;
  if (digits.startsWith('0') && digits.length >= 9) return 'tel:+61' + digits.slice(1);
  return 'tel:' + digits;
}

function applyGlobals(html, content, schema) {
  for (const g of schema.globals || []) {
    const val = get(content, g.key);
    if (val == null || String(val).trim() === '' || String(val) === g.original) continue;
    html = html.split(g.original).join(H.escapeHtml(String(val)));
    if (g.tel_original) html = html.split(g.tel_original).join(telHref(val));
  }
  return html;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ALIAS = { mon: 0, tue: 1, tues: 1, wed: 2, thu: 3, thur: 3, thurs: 3, fri: 4, sat: 5, sun: 6 };
function parseDays(text) {
  const t = String(text || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+to\s+/g, '-');
  const toIdx = (w) => { w = w.trim().replace(/\.$/, ''); if (!w) return -1;
    const full = DAYS.findIndex(d => d.startsWith(w)); if (full >= 0) return full;
    return DAY_ALIAS[w] ?? -1; };
  const out = new Set();
  for (const part of t.split(/,|&|and/)) {
    const p = part.trim(); if (!p) continue;
    if (p.includes('-')) {
      const [a, b] = p.split('-').map(toIdx);
      if (a >= 0 && b >= 0) { for (let i = a; ; i = (i + 1) % 7) { out.add(i); if (i === b) break; } }
    } else { const i = toIdx(p); if (i >= 0) out.add(i); }
  }
  return [...out].sort().map(i => DAYS[i][0].toUpperCase() + DAYS[i].slice(1));
}
function parseTime(s) {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(String(s).trim());
  if (!m) return null;
  let h = parseInt(m[1], 10); const min = m[2] || '00'; const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23) return null;
  return String(h).padStart(2, '0') + ':' + min;
}
function hoursToSpec(rows) {
  const spec = [];
  for (const r of rows || []) {
    const days = parseDays(r.days);
    const t = String(r.time || '').replace(/[–—]/g, '-').replace(/\s+to\s+/g, '-');
    const m = /^\s*([^-]+?)\s*-\s*([^-]+?)\s*$/.exec(t);
    if (!days.length || !m) continue;
    const opens = parseTime(m[1]), closes = parseTime(m[2]);
    if (!opens || !closes) continue;
    spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: days.length === 1 ? days[0] : days, opens, closes });
  }
  return spec;
}

/** Update telephone, email, address and hours in the sitewide Dentist JSON-LD. */
function applySchemaOrg(html, content) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  return html.replace(re, (whole, body) => {
    let data;
    try { data = JSON.parse(body); } catch (e) { return whole; }
    if (data['@type'] !== 'Dentist') return whole;
    const p = content.practice || {};
    if (p.phone) data.telephone = p.phone;
    if (p.email) data.email = p.email;
    const spec = hoursToSpec(content.hours);
    if (spec.length) data.openingHoursSpecification = spec;
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  });
}

function applyAnnouncement(html, content) {
  const a = content.announcement || {};
  if (!a.enabled || !String(a.text || '').trim()) return html;
  const inner = H.inlineToHtml(a.text);
  const bar = a.link
    ? `<div class="announce"><a href="${H.escapeAttr(a.link)}">${inner}</a></div>`
    : `<div class="announce">${inner}</div>`;
  html = html.replace(/<body(\s[^>]*)?>/, (m) => m.includes('class=')
    ? m.replace(/class="([^"]*)"/, 'class="$1 has-announce"') : m.replace(/>$/, ' class="has-announce">'));
  return html.replace(/(<body[^>]*>\s*)/, `$1${bar}\n`);
}

// ---------------------------------------------------------------- public API
/**
 * Per-page SEO from the dashboard: title tag, meta description, Open Graph copies,
 * optional sharing image and noindex. Values come from content.seo[path].
 */
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function applySeo(html, seo, siteUrl = 'https://www.footscraydentalstudio.com.au') {
  if (!seo) return html;
  if (seo.title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(seo.title)}</title>`);
    html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(seo.title)}">`);
    html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(seo.title)}">`);
  }
  if (seo.description) {
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(seo.description)}">`);
    html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(seo.description)}">`);
    html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(seo.description)}">`);
  }
  if (seo.og_image) {
    const abs = /^https?:/.test(seo.og_image) ? seo.og_image : siteUrl + seo.og_image;
    if (/<meta property="og:image" content="[^"]*">/.test(html)) html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escAttr(abs)}">`);
    else html = html.replace(/<meta property="og:type"[^>]*>/, m => `${m}\n<meta property="og:image" content="${escAttr(abs)}">`);
  }
  if (seo.noindex && !/<meta name="robots"/.test(html)) {
    html = html.replace(/<meta name="description"[^>]*>/, m => `${m}\n<meta name="robots" content="noindex, nofollow">`);
  }
  return html;
}

function apply(html, content, schema, pagePath) {
  const idx = fieldIndex(schema);
  content = computeDerived(JSON.parse(JSON.stringify(content)), schema);
  const resolve = (key) => {
    const value = get(content, key);
    if (value === undefined) return null;
    const field = listDefFor(key, idx);
    return { value, type: typeOf(key, idx), field };
  };
  html = applyMarkers(html, resolve, {});
  html = stripMarkers(html);
  html = applyGlobals(html, content, schema);
  html = applySchemaOrg(html, content);
  html = applyAnnouncement(html, content);
  if (pagePath && content.seo && content.seo[pagePath]) html = applySeo(html, content.seo[pagePath]);
  return html;
}

function extractValue(el, type) {
  switch (type) {
    case 'paragraphs': {
      const paras = [];
      const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi; let m;
      while ((m = re.exec(el.inner))) paras.push(H.htmlToInline(m[1]));
      return (paras.length ? paras : [H.htmlToInline(el.inner)]).filter(Boolean).join('\n\n');
    }
    case 'lines': {
      const lines = []; const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi; let m;
      while ((m = re.exec(el.inner))) lines.push(H.htmlToInline(m[1]));
      return lines.join('\n');
    }
    case 'html':
      return el.inner;
    default:
      return H.htmlToInline(el.inner);
  }
}

/** Read every marked value out of one page into `into` (first occurrence wins). */
function extract(html, schema, into) {
  const idx = fieldIndex(schema);
  const put = (key, val) => { if (get(into, key) === undefined) set(into, key, val); };

  for (const el of H.findByAttr(html, 'data-cms-list')) {
    const key = el.attrValue, listDef = listDefFor(key, idx);
    const skip = parseInt(H.getAttr(el.startTag, 'data-cms-list-skip') || '0', 10) || 0;
    const items = H.childElements(el.inner).slice(skip).map(tpl => {
      const item = {};
      for (const f of H.findByAttr(tpl.outer, 'data-cms')) {
        if (f.attrValue.includes('.') || f.attrValue === 'initial') continue;
        item[f.attrValue] = extractValue(f, typeOf(f.attrValue, null, listDef));
      }
      for (const f of H.findByAttr(tpl.outer, 'data-cms-attr')) {
        for (const pair of f.attrValue.split(',')) {
          const [attr, k] = pair.split(':').map(s => s.trim());
          if (k && !k.includes('.') && k !== 'name') item[k] = H.unescapeHtml(H.getAttr(f.startTag, attr) || '');
        }
      }
      return item;
    });
    // The same list can appear on several pages with different fields showing
    // (offers: title+price on the homepage, the full card on the offers page).
    // Merge field by field so the richest version wins.
    const existing = get(into, key);
    if (Array.isArray(existing)) {
      items.forEach((it, i) => { existing[i] = Object.assign({}, it, existing[i] || {}); });
      set(into, key, existing);
    } else {
      set(into, key, items);
    }
  }
  // remove list bodies before scanning absolute keys, so relative keys are not mistaken
  let stripped = html;
  for (const el of H.findByAttr(stripped, 'data-cms-list').reverse()) {
    stripped = stripped.slice(0, el.innerStart) + stripped.slice(el.innerEnd);
  }
  for (const el of H.findByAttr(stripped, 'data-cms')) {
    const key = el.attrValue;
    if (!key.includes('.') && !['hours_note', 'hours_line'].includes(key)) continue;
    if (key === 'hours_line') continue;
    put(key, extractValue(el, typeOf(key, idx)));
  }
  for (const el of H.findByAttr(stripped, 'data-cms-attr')) {
    for (const pair of el.attrValue.split(',')) {
      const [attr, key] = pair.split(':').map(s => s.trim());
      if (!key || !key.includes('.')) continue;
      put(key, H.unescapeHtml(H.getAttr(el.startTag, attr) || ''));
    }
  }
  return into;
}

/** Rendering hints per key (data-cms-opts="list:1col steps:grid") for the CMS rich text serializer. */
function collectOpts(html, into = {}) {
  for (const el of H.findByAttr(html, 'data-cms-opts')) {
    const key = H.getAttr(el.startTag, 'data-cms');
    if (!key) continue;
    const o = {};
    for (const pair of el.attrValue.split(/\s+/)) { const [k, v] = pair.split(':'); if (k) o[k] = v || true; }
    into[key] = o;
  }
  return into;
}

module.exports = { apply, applySeo, extract, get, set, computeDerived, hoursToSpec, telHref, fieldIndex, typeOf, listDefFor, collectOpts };
