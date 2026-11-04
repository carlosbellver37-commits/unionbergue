/* Nukleo Preview — recorrido guiado sobre la web real: foco en cada herramienta, paso a paso. */
(function () {
  'use strict';
  var panel = window.__nkPanel;
  if (!panel || panel.isAdmin || window.__nkTour) return;
  window.__nkTour = true;

  var SEEN_KEY = 'nk-tour-seen';
  var SETTLE_MS = 320; // la tira tarda un momento en abrirse del todo
  var STEPS = [
    { key: 'pin', title: 'Comentar', text: 'Pulsa aquí y después toca el punto de la web que quieras. Escribe qué te gustaría cambiar.' },
    { key: 'zone', title: 'Marcar una zona', text: 'Pulsa aquí y arrastra sobre la web para rodear una zona o una imagen.' },
    { key: 'text', title: 'Cambiar un texto', text: 'Pulsa aquí, toca cualquier texto y escribe cómo quieres que quede.' },
    { key: 'list', title: 'Mis cambios', text: 'Aquí ves todo lo que has pedido. Puedes editarlo, moverlo o borrarlo cuando quieras.' },
    { key: 'timer', title: 'Tu tiempo', text: 'Abajo a la izquierda ves cuánto queda de la propuesta y un resumen de lo que has pedido.' }
  ];

  var index = 0;
  var root = null;
  var parts = null;
  var onResize = null;
  var onKey = null;

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'class') el.className = attrs[key];
      else if (key.indexOf('on') === 0) el.addEventListener(key.slice(2), attrs[key]);
      else el.setAttribute(key, attrs[key]);
    });
    [].concat(children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  var CSS =
    '*{box-sizing:border-box}' +
    '.wrap{position:fixed;inset:0;z-index:2147483646;font:500 15px/1.45 "Instrument Sans",system-ui,sans-serif;color:#f3f1ea}' +
    '.spot{position:fixed;border-radius:26px;box-shadow:0 0 0 100vmax rgba(10,10,8,.72);transition:left .35s cubic-bezier(.16,1,.3,1),top .35s cubic-bezier(.16,1,.3,1),width .35s cubic-bezier(.16,1,.3,1),height .35s cubic-bezier(.16,1,.3,1);pointer-events:none}' +
    '.spot::after{content:"";position:absolute;inset:-4px;border-radius:inherit;border:2px solid #5f86c4;animation:pulse 1.6s ease-out infinite}' +
    '@keyframes pulse{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(1.14)}}' +
    '.tip{position:fixed;width:min(340px,calc(100vw - 24px));padding:18px 18px 16px;border-radius:20px;background:#14140f;box-shadow:0 20px 56px rgba(0,0,0,.5);border:1px solid rgba(243,241,234,.12)}' +
    '.step{margin:0 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8fb0e6;font-weight:700}' +
    '.title{margin:0 0 6px;font-size:20px;line-height:1.15;font-weight:600;letter-spacing:-.01em}' +
    '.text{margin:0 0 16px;color:rgba(243,241,234,.74)}' +
    '.dots{display:flex;gap:6px;margin:0 0 14px}.dots i{width:7px;height:7px;border-radius:50%;background:rgba(243,241,234,.22)}.dots i.on{background:#5f86c4;width:20px;border-radius:4px}' +
    '.row{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
    'button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}' +
    'button:focus-visible{outline:2px solid #8fb0e6;outline-offset:3px}' +
    '.skip{color:rgba(243,241,234,.6);padding:8px 4px;text-decoration:underline;text-underline-offset:3px}.skip:hover{color:#fff}' +
    '.next{background:#f3f1ea;color:#14140f;font-weight:700;padding:11px 20px;border-radius:999px}.next:hover{background:#fff}' +
    '@media (prefers-reduced-motion:reduce){.spot{transition:none}.spot::after{animation:none}}';

  function rectFor(step) {
    if (step.key === 'timer') return window.__nkSummaryApi && window.__nkSummaryApi.rect ? window.__nkSummaryApi.rect() : null;
    return panel.toolRect ? panel.toolRect(step.key) : null;
  }

  function placeTip(rect, step) {
    var tip = parts.tip;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    tip.style.cssText = '';
    if (vw < 640) {
      tip.style.left = '12px';
      if (rect.top + rect.height / 2 < vh / 2) tip.style.bottom = '16px';
      else tip.style.top = '16px';
      return;
    }
    if (step.key === 'timer') {
      tip.style.left = Math.max(16, rect.left) + 'px';
      tip.style.bottom = (vh - rect.top + 18) + 'px';
      return;
    }
    var height = tip.offsetHeight;
    tip.style.right = (vw - rect.left + 20) + 'px';
    tip.style.top = Math.min(Math.max(16, rect.top + rect.height / 2 - height / 2), vh - height - 16) + 'px';
  }

  function render() {
    var step = STEPS[index];
    var last = index === STEPS.length - 1;
    parts.step.textContent = 'Paso ' + (index + 1) + ' de ' + STEPS.length;
    parts.title.textContent = step.title;
    parts.text.textContent = step.text;
    parts.dots.textContent = '';
    STEPS.forEach(function (s, i) { parts.dots.appendChild(h('i', { class: i === index ? 'on' : '' })); });
    parts.next.textContent = last ? 'Entendido' : 'Siguiente';
    parts.skip.style.visibility = last ? 'hidden' : 'visible';
    position();
  }

  function position() {
    if (!root) return;
    var step = STEPS[index];
    var rect = rectFor(step);
    if (!rect || !rect.width) { next(); return; } // si no existe en este dispositivo, se salta
    var pad = 6;
    parts.spot.style.left = rect.left - pad + 'px';
    parts.spot.style.top = rect.top - pad + 'px';
    parts.spot.style.width = rect.width + pad * 2 + 'px';
    parts.spot.style.height = rect.height + pad * 2 + 'px';
    parts.spot.style.borderRadius = Math.min(26, (rect.height + pad * 2) / 2) + 'px';
    placeTip(rect, step);
  }

  function finish() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
    if (panel.tourStrip) panel.tourStrip(false);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey, true);
    if (root) root.remove();
    root = null;
    parts = null;
  }

  function next() {
    if (index >= STEPS.length - 1) { finish(); return; }
    index += 1;
    render();
  }

  function start() {
    if (root) return;
    index = 0;
    var host = h('div', { 'data-nk-tour': '' });
    var shadow = host.attachShadow({ mode: 'open' });
    parts = {
      spot: h('div', { class: 'spot' }),
      step: h('p', { class: 'step' }),
      title: h('h2', { class: 'title' }),
      text: h('p', { class: 'text' }),
      dots: h('div', { class: 'dots', 'aria-hidden': 'true' }),
      skip: h('button', { type: 'button', class: 'skip', onclick: finish }, 'Saltar guía'),
      next: h('button', { type: 'button', class: 'next', onclick: next }, 'Siguiente')
    };
    parts.tip = h('div', { class: 'tip', role: 'dialog', 'aria-modal': 'true', 'aria-live': 'polite' }, [
      parts.step, parts.title, parts.text, parts.dots, h('div', { class: 'row' }, [parts.skip, parts.next])
    ]);
    var wrap = h('div', { class: 'wrap' }, [parts.spot, parts.tip]);
    var style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    root = host;
    document.documentElement.appendChild(host);

    onResize = position;
    onKey = function (event) {
      if (event.key === 'Escape') { event.stopPropagation(); finish(); }
      else if (event.key === 'Enter' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); next(); }
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey, true);

    if (panel.tourStrip) panel.tourStrip(true);
    setTimeout(function () { if (root) { render(); parts.next.focus(); } }, SETTLE_MS);
  }

  window.__nkStartTour = start;
  if (window.__nkTourPending) { window.__nkTourPending = false; start(); }
})();
