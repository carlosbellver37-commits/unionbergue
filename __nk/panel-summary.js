/* Nukleo Preview — contador del plazo y resumen de cambios (abajo a la izquierda). */
(function () {
  'use strict';
  var panel = window.__nkPanel;
  var status = window.__nkStatus;
  if (!panel || !status || window.__nkSummary) return;
  window.__nkSummary = true;

  var TOTAL_MS = (status.days || 7) * 86400000;
  var TYPES = [['cambiar', 'Cambiar'], ['quitar', 'Quitar'], ['gusta', 'Me gusta'], ['pregunta', 'Preguntas'], ['texto', 'Textos']];
  var ACCENT = /^#[0-9a-f]{3,8}$/i.test(status.accent || '') ? status.accent : '#1b3358';
  var notes = [];
  var open = false;

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

  var pad = function (n) { return String(n).padStart(2, '0'); };
  function parts(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
  }

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483644';
  var shadow = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent =
    '*{box-sizing:border-box}.w{font:500 13px/1.4 "Instrument Sans",system-ui,sans-serif;color:#f3f1ea;display:grid;gap:8px;justify-items:start}' +
    'button,a{font:inherit;color:inherit;cursor:pointer;border:0;background:none;text-decoration:none}' +
    'button:focus-visible,a:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
    '.pill{display:flex;align-items:center;gap:9px;padding:10px 15px;border-radius:999px;background:rgba(20,20,15,.92);font-weight:600;font-variant-numeric:tabular-nums;backdrop-filter:blur(8px);box-shadow:0 6px 24px rgba(0,0,0,.28)}' +
    '.pill i{width:8px;height:8px;border-radius:50%;background:#5f86c4;flex:none}.pill.low i{background:#ff9d8a}' +
    '.pill .sep{opacity:.4}.pill .cnt{background:rgba(243,241,234,.16);padding:2px 9px;border-radius:999px}' +
    '.card{display:none;width:min(300px,calc(100vw - 32px));padding:16px;border-radius:20px;background:rgba(20,20,15,.96);box-shadow:0 18px 44px rgba(0,0,0,.4);gap:14px}' +
    '.card.on{display:grid}' +
    '.cap{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:rgba(243,241,234,.55);margin:0 0 6px}' +
    '.big{display:flex;gap:14px;font-variant-numeric:tabular-nums}.big div{display:grid}.big b{font-size:26px;line-height:1;font-weight:700}.big span{font-size:11px;color:rgba(243,241,234,.55)}' +
    '.bar{height:6px;border-radius:3px;background:rgba(243,241,234,.16);overflow:hidden;margin-top:10px}.bar div{height:100%;background:#5f86c4;border-radius:3px;transition:width .6s}' +
    '.low .bar div{background:#ff9d8a}.until{margin:8px 0 0;color:rgba(243,241,234,.6);font-size:12px}' +
    '.tot{font-size:15px;font-weight:600;margin:0 0 8px}.rows{display:grid;gap:5px}.rows p{display:flex;align-items:center;gap:8px;margin:0}' +
    '.rows i{width:9px;height:9px;border-radius:50%;flex:none}.rows b{margin-left:auto;font-weight:600}.muted{color:rgba(243,241,234,.55)}' +
    '.acts{display:flex;gap:8px}.acts button,.acts a{flex:1;text-align:center;padding:9px 12px;border-radius:999px;background:rgba(243,241,234,.14);font-weight:600}' +
    '.acts button:hover,.acts a:hover{background:rgba(243,241,234,.26)}.acts .main{background:#f3f1ea;color:#14140f}.acts .main:hover{background:#fff}' +
    '@media (prefers-reduced-motion:reduce){*{transition:none!important}}';

  var wrap = h('div', { class: 'w' });
  var card = h('div', { class: 'card', role: 'region', 'aria-label': 'Plazo y resumen de cambios' });
  var pill = h('button', { class: 'pill', type: 'button', 'aria-expanded': 'false', onclick: toggle });
  wrap.appendChild(card); wrap.appendChild(pill);
  shadow.appendChild(style); shadow.appendChild(wrap);

  function toggle() {
    open = !open;
    pill.setAttribute('aria-expanded', String(open));
    render();
  }

  function expiresAt() { return status.expires || null; }

  function renderPill(left) {
    var pending = notes.filter(function (n) { return n.status !== 'done'; }).length;
    var text;
    if (!expiresAt()) text = panel.isAdmin ? 'Nukleo · equipo · plazo sin iniciar' : 'Propuesta Nukleo';
    else {
      var p = parts(left);
      text = (panel.isAdmin ? 'Nukleo · equipo · ' : 'Propuesta Nukleo · ') + p.d + 'd ' + pad(p.h) + 'h ' + pad(p.m) + 'm ' + pad(p.s) + 's';
    }
    pill.className = 'pill' + (expiresAt() && left < 86400000 ? ' low' : '');
    pill.textContent = '';
    pill.appendChild(h('i'));
    pill.appendChild(h('span', {}, text));
    if (notes.length) { pill.appendChild(h('span', { class: 'sep' }, '·')); pill.appendChild(h('span', { class: 'cnt' }, pending + (pending === 1 ? ' cambio' : ' cambios'))); }
  }

  function renderCard(left) {
    card.classList.toggle('on', open);
    card.className = 'card' + (open ? ' on' : '') + (expiresAt() && left < 86400000 ? ' low' : '');
    if (!open) return;
    card.textContent = '';
    var pending = notes.filter(function (n) { return n.status !== 'done'; });
    var done = notes.length - pending.length;
    var block;
    if (expiresAt()) {
      var p = parts(left);
      var elapsed = Math.min(100, Math.max(0, (1 - left / TOTAL_MS) * 100));
      block = h('div', {}, [
        h('p', { class: 'cap' }, 'Tiempo restante de la propuesta'),
        h('div', { class: 'big' }, [['d', 'días', p.d], ['h', 'horas', p.h], ['m', 'min', p.m]].map(function (u) {
          return h('div', {}, [h('b', {}, pad(u[2])), h('span', {}, u[1])]);
        })),
        h('div', { class: 'bar' }, h('div', { style: 'width:' + elapsed + '%' })),
        h('p', { class: 'until' }, 'Termina el ' + new Date(expiresAt()).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))
      ]);
    } else {
      block = h('div', {}, [h('p', { class: 'cap' }, 'Plazo'), h('p', { class: 'until' }, 'Todavía no ha entrado ningún cliente: el plazo no ha empezado.')]);
    }
    var rows = TYPES.map(function (t) {
      var count = pending.filter(function (n) { return n.type === t[0]; }).length;
      if (!count) return null;
      return h('p', {}, [h('i', { style: 'background:' + panel.colors[t[0]] }), t[1], h('b', {}, String(count))]);
    }).filter(Boolean);
    var summary = h('div', {}, [
      h('p', { class: 'cap' }, panel.isAdmin ? 'Resumen de avisos' : 'Cambios solicitados'),
      h('p', { class: 'tot' }, notes.length ? pending.length + (pending.length === 1 ? ' pendiente' : ' pendientes') + (done ? ' · ' + done + ' hechos' : '') : 'Aún no hay cambios'),
      rows.length ? h('div', { class: 'rows' }, rows) : h('p', { class: 'muted' }, notes.length ? 'Todo está hecho.' : 'Usa la tira de la derecha para pedir el primero.')
    ]);
    var actions = h('div', { class: 'acts' }, [
      h('button', { type: 'button', class: 'main', onclick: function () { panel.openList(); } }, panel.isAdmin ? 'Ver avisos' : 'Ver mis cambios'),
      h('a', { href: '/__nk/logout', 'aria-label': panel.isAdmin ? 'Salir del modo equipo' : 'Salir' }, 'Salir')
    ]);
    [block, summary, actions].forEach(function (el) { card.appendChild(el); });
  }

  function render() {
    var left = expiresAt() ? expiresAt() - Date.now() : 0;
    if (expiresAt() && left <= 0) { location.reload(); return; }
    renderPill(left);
    renderCard(left);
  }

  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && open) toggle(); });
  document.addEventListener('pointerdown', function (event) { if (open && event.composedPath().indexOf(host) === -1) toggle(); });

  document.documentElement.appendChild(host);
  panel.subscribe(function (list) { notes = list; render(); });
  setInterval(render, 1000);

  // El plazo manda el servidor: se refresca por si el equipo lo cambia.
  setInterval(function () {
    fetch('/__nk/status', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (fresh) { if (fresh && fresh.expires !== undefined) status.expires = fresh.expires; })
      .catch(function () { /* se mantiene el último valor */ });
  }, 60000);
})();
