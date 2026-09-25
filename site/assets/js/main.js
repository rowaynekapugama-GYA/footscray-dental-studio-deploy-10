/* Footscray Dental Studio — global interactivity
   Mobile nav · Services mega menu · sticky header state ·
   FAQ accordions · scroll reveals · front-end form validation */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var navToggle = document.querySelector('.nav-toggle');
  var body = document.body;

  /* ----- Sticky header state ----- */
  function onScroll() {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----- Mobile nav toggle ----- */
  var mainNav = document.getElementById('main-nav');
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (navToggle) navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) {
      /* reset any expanded Services panel so the drawer reopens clean */
      document.querySelectorAll('.has-mega.is-open').forEach(function (m) {
        m.classList.remove('is-open');
        var t = m.querySelector('.nav-link');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (mainNav) mainNav.scrollTop = 0;
    }
  }
  if (navToggle) {
    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setNav(!body.classList.contains('nav-open'));
    });
  }
  /* Tap outside the drawer, or press Escape, to close it */
  document.addEventListener('click', function (e) {
    if (!body.classList.contains('nav-open')) return;
    if (mainNav && !mainNav.contains(e.target) && !(navToggle && navToggle.contains(e.target))) {
      setNav(false);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('nav-open')) {
      setNav(false);
      if (navToggle) navToggle.focus();
    }
  });

  /* ----- Services dropdown (JS-managed hover with close delay + click + keyboard) ----- */
  document.querySelectorAll('.has-mega').forEach(function (item) {
    var trigger = item.querySelector('.nav-link');
    if (!trigger) return;
    var closeTimer = null;

    function setOpen(open) {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      item.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    /* must match the CSS drawer breakpoint in styles.css */
    var hoverable = window.matchMedia('(hover: hover) and (min-width: 1141px)');

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      /* On hover-capable desktops the menu is already open when clicked —
         a toggle here would instantly close it again. Click = keep open. */
      if (hoverable.matches) {
        setOpen(true);
      } else {
        setOpen(!item.classList.contains('is-open'));
      }
    });

    /* Hover open/close with a grace period so the menu never vanishes
       while the pointer travels across the gap into the panel */
    item.addEventListener('mouseenter', function () {
      if (hoverable.matches) setOpen(true);
    });
    item.addEventListener('mouseleave', function () {
      if (!hoverable.matches) return;
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { setOpen(false); }, 260);
    });

    item.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!item.contains(e.target)) setOpen(false);
    });
  });

  /* ----- FAQ accordions ----- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = item.classList.toggle('is-open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      a.setAttribute('aria-hidden', open ? 'false' : 'true');
    });
  });

  /* ----- Scroll reveal ----- */
  if ('IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ----- Forms: validate, then POST as JSON to /api/contact ----- */
  var ENDPOINT = '/api/contact';

  /* Stamp the load time into every form; the API treats a sub-3-second submit as a bot */
  document.querySelectorAll('input[name="ts"]').forEach(function (el) { el.value = String(Date.now()); });

  function fieldError(field, input, msg) {
    var m = field.querySelector('.error-msg');
    field.classList.add('has-error');
    if (m) m.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
  }
  function clearField(field, input) {
    field.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
  }
  function validate(form) {
    var valid = true, first = null;
    form.querySelectorAll('.field').forEach(function (field) {
      var input = field.querySelector('input, select, textarea');
      if (!input) return;
      var value = input.value.trim(), err = '';
      if (input.hasAttribute('required') && !value) {
        err = 'This field is required.';
      } else if (value && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        err = 'Please enter a valid email address.';
      } else if (value && input.type === 'tel' && !/^[\d\s()+-]{8,}$/.test(value)) {
        err = 'Please enter a valid phone number.';
      }
      if (err) { valid = false; fieldError(field, input, err); if (!first) first = input; }
      else clearField(field, input);
    });
    if (first) first.focus();
    return valid;
  }
  function payload(form) {
    var data = { page: location.pathname };
    new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v : ''; });
    return data;
  }
  function send(data) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'fetch' },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
        return j;
      });
    });
  }
  function setBusy(form, busy) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.innerHTML; btn.innerHTML = 'Sending…'; btn.disabled = true; }
    else { if (btn.dataset.label) btn.innerHTML = btn.dataset.label; btn.disabled = false; }
  }
  function show(form, sel, on) {
    var el = form.querySelector(sel);
    if (!el) return;
    el.classList.toggle('is-visible', on);
    if (on && el.focus) el.focus();
  }

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      show(form, '.form-success', false);
      show(form, '.form-error', false);
      if (!validate(form)) return;
      setBusy(form, true);
      send(payload(form)).then(function () {
        form.reset();
        form.querySelectorAll('input[name="ts"]').forEach(function (el) { el.value = String(Date.now()); });
        show(form, '.form-success', true);
      }).catch(function () {
        show(form, '.form-error', true);
      }).then(function () { setBusy(form, false); });
    });
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field) field.classList.remove('has-error');
    });
  });

  /* Footer newsletter sign-up goes to the same endpoint */
  document.querySelectorAll('form.newsletter-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var email = input ? input.value.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { if (input) input.focus(); return; }
      var btn = form.querySelector('button');
      if (btn) btn.disabled = true;
      send({ form_type: 'newsletter', email: email, page: location.pathname, ts: String(Date.now() - 10000) })
        .then(function () { form.innerHTML = '<p class="newsletter-done">Thanks, you are on the list.</p>'; })
        .catch(function () { if (btn) btn.disabled = false; if (input) input.setAttribute('aria-invalid', 'true'); });
    });
  });
}());
