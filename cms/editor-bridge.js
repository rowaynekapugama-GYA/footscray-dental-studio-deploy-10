/* Runs inside the page preview in the dashboard. Makes marked text editable in place,
   photos clickable, and talks to the dashboard around it with postMessage. */
(function () {
  var send = function (m) { m.fds = 1; parent.postMessage(m, '*'); };

  var style = document.createElement('style');
  style.textContent = [
    '.reveal,.reveal-stagger>*{opacity:1!important;transform:none!important;transition:none!important}',
    '.faq-a{max-height:none!important;height:auto!important;overflow:visible!important;visibility:visible!important;opacity:1!important}',
    '.faq-a>div{overflow:visible!important}',
    '[data-cms][contenteditable]{outline:1px dashed rgba(189,153,94,.0);outline-offset:3px;border-radius:3px;cursor:text;transition:outline-color .15s,background-color .15s}',
    '[data-cms][contenteditable]:hover{outline-color:rgba(189,153,94,.9)}',
    '[data-cms][contenteditable]:focus{outline:2px solid #bd995e;background:rgba(236,223,198,.28)}',
    '.fds-dirty{box-shadow:inset 3px 0 0 #bd995e}',
    'img.fds-img{cursor:pointer;transition:outline-color .15s,filter .15s;outline:3px solid transparent;outline-offset:-3px}',
    'img.fds-img:hover{outline-color:#bd995e;filter:brightness(.92)}',
    '.fds-flash{animation:fdsflash 1.4s ease}',
    '@keyframes fdsflash{0%,60%{outline:3px solid #bd995e;outline-offset:2px}100%{outline:3px solid transparent}}',
    '[data-sec-hidden]{opacity:.28;filter:grayscale(1);position:relative}',
    '[data-sec-hidden]::before{content:"Hidden on the website";position:absolute;top:12px;left:12px;z-index:5;background:#101b26;color:#fff;font:600 12px/1 Poppins,Arial,sans-serif;padding:7px 10px;border-radius:999px}',
    '.hero-scrim{pointer-events:none}'
  ].join('\n');
  document.head.appendChild(style);

  // never leave the page, never submit forms, from inside the editor
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (a) e.preventDefault();
    var b = e.target.closest && e.target.closest('button');
    if (b && b.closest('[data-cms]') == null && !b.classList.contains('faq-q')) e.preventDefault();
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);

  // ---- text
  var skip = /(^|\.)(initial)$|^hours_line$/;
  var fields = Array.prototype.slice.call(document.querySelectorAll('[data-cms]')).filter(function (el) {
    var k = el.getAttribute('data-cms');
    return k && !skip.test(k) && !el.querySelector('[data-cms]');
  });
  fields.forEach(function (el) {
    var key = el.getAttribute('data-cms');
    var type = el.getAttribute('data-cms-type') || 'text';
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    el.addEventListener('input', function () {
      el.classList.add('fds-dirty');
      send({ type: 'change', key: key, value: el.innerHTML });
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && type !== 'html') { e.preventDefault(); el.blur(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); send({ type: 'save' }); }
    });
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
    el.addEventListener('focus', function () { send({ type: 'focus-field', key: key, kind: type }); });
    // the FAQ question sits inside a toggle button; typing a space must not toggle it
    el.addEventListener('keyup', function (e) { if (e.key === ' ') e.preventDefault(); });
    el.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  // ---- images
  var imgs = [];
  Array.prototype.slice.call(document.querySelectorAll('[data-cms-attr]')).forEach(function (el) {
    var pairs = (el.getAttribute('data-cms-attr') || '').split(',');
    pairs.forEach(function (pair) {
      var bits = pair.split(':'), attr = (bits[0] || '').trim(), key = (bits[1] || '').trim();
      if (attr !== 'src' || !key || el.tagName !== 'IMG') return;
      el.classList.add('fds-img');
      el.setAttribute('data-fds-img', key);
      el.removeAttribute('onerror');
      imgs.push({ key: key, src: el.src || '', alt: el.getAttribute('alt') || '' });
      el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); send({ type: 'pick-image', key: key }); });
    });
  });

  // ---- sections
  var main = document.getElementById('main');
  var sections = main ? Array.prototype.slice.call(main.children).filter(function (s) { return s.hasAttribute('data-sec'); }) : [];
  function label(s) {
    var h = s.querySelector('h1,h2,.eyebrow,h3');
    var t = (h && h.textContent || s.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    if (s.id === 'book') t = t || 'Booking form';
    return t || 'Section';
  }
  function describe() {
    return sections.map(function (s) { return { i: +s.getAttribute('data-sec'), label: label(s), hidden: s.hasAttribute('data-sec-hidden') }; });
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (!m.fdsParent) return;
    if (m.type === 'set-image') {
      document.querySelectorAll('[data-fds-img="' + m.key + '"]').forEach(function (img) { img.setAttribute('src', m.src); if (m.alt != null) img.setAttribute('alt', m.alt); img.removeAttribute('srcset'); });
    }
    if (m.type === 'focus') {
      var t = document.querySelector('[data-fds-img="' + m.key + '"]') || document.querySelector('[data-cms="' + m.key + '"]');
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.remove('fds-flash'); void t.offsetWidth; t.classList.add('fds-flash'); }
    }
    if (m.type === 'layout' && main) {
      var byI = {}; sections.forEach(function (s) { byI[s.getAttribute('data-sec')] = s; });
      (m.order || []).forEach(function (i) { var s = byI[i]; if (s) main.appendChild(s); });
      sections.forEach(function (s) { var i = +s.getAttribute('data-sec'); if ((m.hidden || []).indexOf(i) >= 0) s.setAttribute('data-sec-hidden', '1'); else s.removeAttribute('data-sec-hidden'); });
    }
    if (m.type === 'scroll-section') {
      var sec = main && main.querySelector('[data-sec="' + m.i + '"]');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (m.type === 'saved') {
      document.querySelectorAll('.fds-dirty').forEach(function (el) { el.classList.remove('fds-dirty'); });
    }
  });

  send({ type: 'ready', images: imgs, sections: describe(), fields: fields.length, height: document.documentElement.scrollHeight });
})();
