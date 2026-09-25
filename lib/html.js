'use strict';
/**
 * Minimal, dependency-free HTML element operations for the CMS markers.
 *
 * The generated pages mark editable spots with data-cms attributes. This module can
 * find those elements, read or replace their inner HTML, set attributes, and remove
 * them, using a small tag scanner instead of a full parser. It handles nesting of the
 * same tag name, quoted attribute values containing ">" and void elements.
 */

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr']);

/** Parse the start tag beginning at html[i] === '<'. Returns null if it is not a start tag. */
function parseStartTag(html, i) {
  if (html[i] !== '<') return null;
  const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(i, i + 40));
  if (!m) return null;
  const name = m[1].toLowerCase();
  let j = i + m[0].length, quote = null;
  for (; j < html.length; j++) {
    const c = html[j];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '>') break;
  }
  if (j >= html.length) return null;
  const startTag = html.slice(i, j + 1);
  const selfClosing = /\/\s*>$/.test(startTag) || VOID.has(name);
  return { name, start: i, startTagEnd: j + 1, startTag, selfClosing };
}

/** Find the end of the element whose start tag was parsed. Returns {innerEnd, end}. */
function findEnd(html, tag) {
  if (tag.selfClosing) return { innerEnd: tag.startTagEnd, end: tag.startTagEnd };
  let depth = 1, i = tag.startTagEnd;
  const name = tag.name;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    if (html.startsWith('<!--', lt)) { const c = html.indexOf('-->', lt); i = c < 0 ? html.length : c + 3; continue; }
    if (html[lt + 1] === '/') {
      const m = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/.exec(html.slice(lt, lt + 40));
      if (m && m[1].toLowerCase() === name) {
        depth--;
        if (depth === 0) return { innerEnd: lt, end: lt + m[0].length };
      }
      i = lt + 2;
      continue;
    }
    const t = parseStartTag(html, lt);
    if (!t) { i = lt + 1; continue; }
    if (t.name === name && !t.selfClosing) depth++;
    // skip raw text elements entirely
    if (t.name === 'script' || t.name === 'style') {
      const close = html.toLowerCase().indexOf('</' + t.name, t.startTagEnd);
      i = close < 0 ? html.length : close;
      continue;
    }
    i = t.startTagEnd;
  }
  return { innerEnd: html.length, end: html.length };
}

/** Full element record for the start tag at position i. */
function elementAt(html, i) {
  const tag = parseStartTag(html, i);
  if (!tag) return null;
  const { innerEnd, end } = findEnd(html, tag);
  return Object.assign(tag, { innerStart: tag.startTagEnd, innerEnd, end,
    inner: html.slice(tag.startTagEnd, innerEnd), outer: html.slice(i, end) });
}

/** Read an attribute from a start tag string. */
function getAttr(startTag, attr) {
  const re = new RegExp('\\s' + attr.replace(/[-]/g, '\\-') + '(?:\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+)))?', 'i');
  const m = re.exec(startTag);
  if (!m) return undefined;
  return m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
}

/** Return a copy of the start tag with attr set (added if missing). */
function setAttr(startTag, attr, value) {
  const esc = escapeAttr(value);
  const re = new RegExp('(\\s' + attr + ')(\\s*=\\s*("[^"]*"|\'[^\']*\'|[^\\s>]+))?', 'i');
  if (re.test(startTag)) return startTag.replace(re, `$1="${esc}"`);
  return startTag.replace(/(\/?\s*>)$/, ` ${attr}="${esc}"$1`);
}

function removeAttr(startTag, attr) {
  const re = new RegExp('\\s' + attr + '(?:\\s*=\\s*("[^"]*"|\'[^\']*\'|[^\\s>]+))?', 'gi');
  return startTag.replace(re, '');
}

/** All elements carrying the given attribute, in document order. */
function findByAttr(html, attr) {
  const out = [];
  const re = new RegExp('<[a-zA-Z][^<>]*?\\s' + attr + '(?=[\\s=>])', 'g');
  let m;
  while ((m = re.exec(html))) {
    const el = elementAt(html, m.index);
    if (el) { el.attrValue = getAttr(el.startTag, attr); out.push(el); }
    re.lastIndex = m.index + 1;
  }
  return out;
}

/** Direct child elements of an element's inner HTML (text between them is dropped). */
function childElements(inner) {
  const kids = [];
  let i = 0;
  while (i < inner.length) {
    const lt = inner.indexOf('<', i);
    if (lt < 0) break;
    if (inner.startsWith('<!--', lt)) { const c = inner.indexOf('-->', lt); i = c < 0 ? inner.length : c + 3; continue; }
    const el = elementAt(inner, lt);
    if (!el) { i = lt + 1; continue; }
    kids.push(el);
    i = el.end;
  }
  return kids;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
function unescapeHtml(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&');
}

/** Rich text: escaped text with **bold** and [label](url) turned into markup. */
function inlineToHtml(text) {
  let s = escapeHtml(text || '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:|tel:)[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
/** Inverse of inlineToHtml for extracting defaults from the generated pages. */
function htmlToInline(html) {
  let s = String(html || '');
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**');
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<[^>]+>/g, '');
  return unescapeHtml(s).replace(/\s+/g, ' ').trim();
}

module.exports = { parseStartTag, elementAt, findByAttr, childElements, getAttr, setAttr, removeAttr,
  escapeHtml, escapeAttr, unescapeHtml, inlineToHtml, htmlToInline };
