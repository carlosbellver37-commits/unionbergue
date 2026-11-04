/* Nukleo Preview — tira lateral para comentar, marcar zonas y cambiar textos. */
(function () {
  'use strict';
  var status = window.__nkStatus;
  if (!status || window.__nkPanel) return;

  var ACCENT = /^#[0-9a-f]{3,8}$/i.test(status.accent || '') ? status.accent : '#1b3358';
  var IS_ADMIN = status.role === 'admin';
  var OWNER = IS_ADMIN ? 'equipo' : 'cliente';
  var POLL_MS = 12000;
  var RETRY_MS = [0, 1500, 4000];
  var DRAG_PX = 5;
  var HELLO_KEY = 'nk-hello-seen';
  var TYPES = {
    cambiar: { label: 'Cambiar', color: ACCENT },
    quitar: { label: 'Quitar', color: '#b3321f' },
    gusta: { label: 'Me gusta', color: '#2e7d4f' },
    pregunta: { label: 'Pregunta', color: '#2a5fa8' },
    texto: { label: 'Texto', color: ACCENT }
  };
  var HINTS = {
    pin: 'Toca donde quieras comentar',
    zone: 'Arrastra para marcar una zona',
    text: 'Toca el texto que quieres cambiar'
  };
  var ICONS = {
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
    zone: '<rect x="4" y="5" width="16" height="14" rx="2" stroke-dasharray="3 3"/>',
    text: '<path d="M5 6h14M12 6v13M9 19h6"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'
  };

  var state = { notes: [], tool: null, drawer: false, bubble: null, signature: '', hidePins: false };
  var inboxRenderer = null;
  var listeners = [];

  /* ---------- utilidades ---------- */
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

  function icon(name) {
    var wrap = document.createElement('span');
    wrap.className = 'ico';
    wrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
    return wrap;
  }

  function ago(ms) {
    var diff = Math.round((ms - Date.now()) / 60000);
    var rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    if (Math.abs(diff) < 60) return rtf.format(diff, 'minute');
    if (Math.abs(diff) < 1440) return rtf.format(Math.round(diff / 60), 'hour');
    return rtf.format(Math.round(diff / 1440), 'day');
  }

  function api(path, method, body) {
    return fetch(path, {
      method: method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 403 && data.error === 'expired') { location.reload(); }
        if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
        return data;
      });
    });
  }

  function colorOf(note) { return note.status === 'done' ? '#8a8a82' : (TYPES[note.type] || TYPES.cambiar).color; }
  function canEdit(note) { return note.status !== 'done' && note.author === OWNER; }
  function canDelete(note) { return IS_ADMIN || note.author === 'cliente'; }
  function isMovable(note) { return canEdit(note) && (note.kind === 'pin' || note.kind === 'zone'); }

  function deliveryLabel(note) {
    if (note.status === 'done') return 'Hecho ✓';
    if (note.author === 'equipo') return 'Del equipo';
    if (IS_ADMIN) return note.ackAt ? 'Recibido' : 'Nuevo';
    return note.ackAt ? 'Recibido por Nukleo ✓' : 'Enviado';
  }

  /* ---------- anclaje en la página ---------- */
  function cssPath(el) {
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 8) {
      if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) {
        parts.unshift('#' + CSS.escape(node.id));
        return parts.join(' > ');
      }
      var index = 1;
      for (var sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
        if (sib.tagName === node.tagName) index += 1;
      }
      parts.unshift(node.tagName.toLowerCase() + ':nth-of-type(' + index + ')');
      node = node.parentElement;
    }
    return 'body > ' + parts.join(' > ');
  }

  function docWidth() { return Math.max(document.documentElement.scrollWidth, 1); }

  function anchorFor(el, px, py, width, height) {
    var r = el.getBoundingClientRect();
    var w = Math.max(r.width, 1);
    var hh = Math.max(r.height, 1);
    return {
      sel: cssPath(el),
      fx: (px - r.left) / w,
      fy: (py - r.top) / hh,
      fw: width ? width / w : 0,
      fh: height ? height / hh : 0,
      dx: (px + window.scrollX) / docWidth(),
      dy: py + window.scrollY
    };
  }

  function locate(note) {
    var a = note.anchor;
    var el = null;
    try { el = a.sel ? document.querySelector(a.sel) : null; } catch (e) { el = null; }
    var r = el ? el.getBoundingClientRect() : null;
    if (r && r.width > 0 && r.height > 0) {
      return { x: r.left + window.scrollX + a.fx * r.width, y: r.top + window.scrollY + a.fy * r.height, w: a.fw * r.width, h: a.fh * r.height, exact: true };
    }
    return { x: a.dx * docWidth(), y: a.dy, w: 0, h: 0, exact: false };
  }

  function elementAt(x, y) {
    var list = document.elementsFromPoint(x, y);
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] !== host && list[i] !== document.documentElement) return list[i];
    }
    return document.body;
  }

  function ownText(el) {
    return [].filter.call(el.childNodes, function (n) { return n.nodeType === 3; })
      .map(function (n) { return n.textContent; }).join(' ').replace(/\s+/g, ' ').trim();
  }

  function textTargetAt(x, y) {
    var list = document.elementsFromPoint(x, y);
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] !== host && ownText(list[i])) return list[i];
    }
    return null;
  }

  /* ---------- estructura (Shadow DOM) ---------- */
  var host = document.createElement('div');
  host.id = 'nk-panel-host';
  host.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483645';
  var shadow = host.attachShadow({ mode: 'open' });

  var font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600;700&display=swap';
  document.head.appendChild(font);

  var style = document.createElement('style');
  style.textContent =
    ':host{all:initial}*{box-sizing:border-box}' +
    '.ui{font:500 14px/1.4 "Instrument Sans",system-ui,sans-serif;color:#14140f}' +
    'button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}' +
    'button:focus-visible,textarea:focus-visible{outline:2px solid ' + ACCENT + ';outline-offset:2px}' +
    '.layer{position:absolute;top:0;left:0;width:0;height:0}' +
    '.pin{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);display:grid;place-items:center;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.3);border:2px solid #fff;touch-action:none}' +
    '.pin span{transform:rotate(45deg);font-size:12px;font-weight:700;pointer-events:none}' +
    '.pin.can-move{cursor:grab}.pin.is-dragging{cursor:grabbing;opacity:.8;transform:rotate(-45deg) scale(1.15)}' +
    '.pin.is-loose{outline:2px dashed #fff}.pin.is-open{box-shadow:0 0 0 4px color-mix(in srgb,' + ACCENT + ' 35%,transparent),0 4px 14px rgba(0,0,0,.3)}' +
    '.zone{position:absolute;border:2px dashed;border-radius:6px;pointer-events:none}' +
    '.zone.is-open{background:color-mix(in srgb,' + ACCENT + ' 10%,transparent)}' +
    '.zone .tag{position:absolute;top:-14px;left:-2px;pointer-events:auto;touch-action:none;min-width:28px;height:28px;padding:0 9px;border-radius:999px;color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.3)}' +
    '.zone .tag.can-move{cursor:grab}' +
    '.zone .grip{position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid;pointer-events:auto;touch-action:none;cursor:nwse-resize}' +
    '.is-pulse{animation:pulse .9s ease 2}@keyframes pulse{50%{transform:scale(1.35) rotate(-45deg)}}' +
    '.zone.is-pulse{animation:zp .9s ease 2}@keyframes zp{50%{opacity:.35}}' +
    '.catcher{position:fixed;inset:0;display:none;cursor:crosshair;background:rgba(20,20,15,.04);touch-action:pan-y}' +
    '.catcher.on{display:block}.catcher.zone-mode{touch-action:none}' +
    '.hl{position:fixed;display:none;pointer-events:none;border:2px solid ' + ACCENT + ';background:color-mix(in srgb,' + ACCENT + ' 14%,transparent);border-radius:4px}' +
    '.drag{position:fixed;display:none;pointer-events:none;border:2px dashed ' + ACCENT + ';background:color-mix(in srgb,' + ACCENT + ' 12%,transparent);border-radius:6px}' +
    '.hint{position:fixed;top:14px;left:50%;transform:translateX(-50%);display:none;align-items:center;gap:12px;padding:9px 10px 9px 16px;border-radius:999px;background:#14140f;color:#f3f1ea;box-shadow:0 10px 30px rgba(0,0,0,.3);white-space:nowrap}' +
    '.hint.on{display:flex}.hint button{padding:5px 12px;border-radius:999px;background:rgba(243,241,234,.16)}.hint button:hover{background:rgba(243,241,234,.28)}' +
    '.strip{position:fixed;right:10px;top:50%;transform:translateY(-50%);width:46px;padding:6px;border-radius:24px;background:rgba(251,250,246,.96);border:1px solid rgba(20,20,15,.1);box-shadow:0 12px 36px rgba(20,20,15,.22);display:flex;flex-direction:column;gap:2px;overflow:hidden;backdrop-filter:blur(8px);transition:width .22s cubic-bezier(.16,1,.3,1)}' +
    '.strip:hover,.strip:focus-within,.strip.is-hello,.strip.is-tour{width:184px}' +
    '.tool{position:relative;display:flex;align-items:center;gap:12px;height:34px;padding:0 7px;border-radius:17px;white-space:nowrap;text-align:left;transition:background .15s}' +
    '.tool:hover{background:rgba(20,20,15,.07)}.tool[aria-pressed="true"]{background:' + ACCENT + ';color:#fff}' +
    '.tool .ico{flex:none;width:20px;height:20px}.tool .ico svg{width:20px;height:20px;display:block}' +
    '.tool .lbl{opacity:0;transition:opacity .15s}.strip:hover .lbl,.strip:focus-within .lbl,.strip.is-hello .lbl,.strip.is-tour .lbl{opacity:1}' +
    '.badge{position:absolute;left:21px;top:1px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#14140f;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center}' +
    '.badge.is-new{background:#b3321f}' +
    '.drawer{position:fixed;right:66px;top:12px;bottom:12px;width:min(350px,calc(100vw - 84px));display:none;flex-direction:column;border-radius:22px;background:#fbfaf6;border:1px solid rgba(20,20,15,.1);box-shadow:0 20px 50px rgba(20,20,15,.28);overflow:hidden}' +
    '.drawer.on{display:flex}.drawer header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 4px 18px;font-weight:700;font-size:16px}' +
    '.drawer header button{padding:4px 10px;border-radius:999px;background:rgba(20,20,15,.07)}' +
    '.sub{padding:0 18px 8px;color:#6b6a63;font-size:13px}' +
    '.list{flex:1;overflow:auto;padding:4px 10px 14px;display:grid;gap:8px;align-content:start}' +
    '.empty{padding:18px 10px;color:#6b6a63}' +
    '.item{display:grid;gap:4px;text-align:left;padding:10px 12px;border-radius:14px;background:#fff;border:1px solid rgba(20,20,15,.08);width:100%}' +
    '.item:hover{border-color:' + ACCENT + '}.item.is-done{opacity:.6}' +
    '.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.n{width:22px;height:22px;border-radius:50%;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;flex:none}' +
    '.chip{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:rgba(20,20,15,.07)}.chip.ok{background:#dcefe3;color:#1f5a38}.chip.new{background:#f6d9d3;color:#8d2616}' +
    '.when{margin-left:auto;font-size:11px;color:#8a8982}' +
    '.msg{color:#33322c;overflow-wrap:anywhere}.swap{font-size:13px;overflow-wrap:anywhere}.swap s{color:#8a8982}.swap b{font-weight:600}' +
    '.card{position:fixed;width:min(330px,calc(100vw - 24px));padding:14px;border-radius:18px;background:#fbfaf6;border:1px solid rgba(20,20,15,.1);box-shadow:0 20px 50px rgba(20,20,15,.32);display:grid;gap:10px}' +
    '.card h3{margin:0;font-size:15px}.chips{display:flex;flex-wrap:wrap;gap:6px}' +
    '.opt{padding:6px 12px;border-radius:999px;border:1px solid rgba(20,20,15,.16);background:#fff;font-size:13px}.opt[aria-pressed="true"]{background:#14140f;color:#fff;border-color:#14140f}' +
    'textarea{width:100%;min-height:84px;resize:vertical;padding:10px 12px;border-radius:12px;border:1px solid rgba(20,20,15,.18);background:#fff;font:inherit;color:inherit}' +
    '.quote{font-size:13px;color:#6b6a63;padding:8px 10px;border-radius:10px;background:rgba(20,20,15,.05);overflow-wrap:anywhere;max-height:84px;overflow:auto}' +
    '.tip{font-size:12px;color:#6b6a63;padding:7px 10px;border-radius:10px;background:color-mix(in srgb,' + ACCENT + ' 9%,transparent)}' +
    '.actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.actions button{padding:9px 15px;border-radius:999px;background:rgba(20,20,15,.07)}' +
    '.actions .go{background:' + ACCENT + ';color:#fff;font-weight:600}.actions .go[disabled]{opacity:.5;cursor:default}' +
    '.actions .danger{color:#b3321f}.actions .danger.sure{background:#b3321f;color:#fff;font-weight:600}' +
    '.thread{display:grid;gap:6px;max-height:170px;overflow:auto}.reply{display:grid;gap:1px;padding:7px 10px;border-radius:12px;background:rgba(20,20,15,.06);font-size:13px;overflow-wrap:anywhere}' +
    '.reply.team{background:color-mix(in srgb,' + ACCENT + ' 14%,#fff)}.reply b{font-size:11px;letter-spacing:.03em}.reply small{color:#8a8982;font-size:11px}' +
    '.err{color:#b3321f;font-size:13px;min-height:1em;margin:0}' +
    '.toast{position:fixed;left:50%;bottom:72px;transform:translate(-50%,12px);padding:10px 18px;border-radius:999px;background:#14140f;color:#f3f1ea;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;max-width:calc(100vw - 24px)}' +
    '.toast.on{opacity:1;transform:translate(-50%,0)}' +
    '@media (max-width:640px){.strip:hover,.strip:focus-within{width:46px}.strip.is-hello,.strip.is-tour{width:46px}.tool .lbl{display:none}.drawer{right:10px;left:10px;width:auto;bottom:70px}.card{left:12px!important;right:12px;top:auto!important;bottom:76px;width:auto}.hint{white-space:normal;max-width:calc(100vw - 24px)}}' +
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}';

  var layer = h('div', { class: 'layer' });
  var ui = h('div', { class: 'ui' });
  var catcher = h('div', { class: 'catcher' });
  var hl = h('div', { class: 'hl' });
  var drag = h('div', { class: 'drag' });
  var hint = h('div', { class: 'hint', role: 'status' });
  var strip = h('nav', { class: 'strip', 'aria-label': 'Herramientas de comentarios' });
  var drawer = h('aside', { class: 'drawer', 'aria-label': IS_ADMIN ? 'Avisos del cliente' : 'Mis cambios' });
  var toast = h('div', { class: 'toast', role: 'status' });
  var popup = h('div', {});
  [catcher, hl, drag, hint, drawer, popup, strip, toast].forEach(function (el) { ui.appendChild(el); });
  shadow.appendChild(style); shadow.appendChild(layer); shadow.appendChild(ui);

  /* ---------- avisos efímeros y herramientas ---------- */
  var toastTimer = 0;
  function say(message) {
    toast.textContent = message;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('on'); }, 3000);
  }

  function closePopups() {
    popup.textContent = '';
    state.bubble = null;
    layer.querySelectorAll('.is-open').forEach(function (el) { el.classList.remove('is-open'); });
  }

  function setTool(tool) {
    state.tool = state.tool === tool ? null : tool;
    closePopups();
    catcher.classList.toggle('on', !!state.tool);
    catcher.classList.toggle('zone-mode', state.tool === 'zone');
    hint.classList.toggle('on', !!state.tool);
    hl.style.display = 'none';
    hint.textContent = '';
    if (state.tool) {
      hint.appendChild(document.createTextNode(HINTS[state.tool]));
      hint.appendChild(h('button', { type: 'button', onclick: function () { setTool(state.tool); } }, 'Cancelar'));
    }
    renderStrip();
  }

  function setDrawer(open) {
    state.drawer = open;
    if (open && state.tool) setTool(state.tool);
    renderDrawer(); renderStrip();
    if (open) ackNew();
  }

  /* ---------- tira lateral ---------- */
  function newCount() {
    return state.notes.filter(function (n) { return n.author === 'cliente' && !n.ackAt; }).length;
  }

  function renderStrip() {
    var open = state.notes.filter(function (n) { return n.status !== 'done'; }).length;
    var fresh = IS_ADMIN ? newCount() : 0;
    var count = IS_ADMIN ? (fresh || open) : open;
    strip.textContent = '';
    if (IS_ADMIN) {
      strip.appendChild(h('button', {
        class: 'tool', type: 'button', 'aria-pressed': String(state.drawer), 'aria-label': 'Bandeja de avisos',
        onclick: function () { setDrawer(!state.drawer); }
      }, [icon('list'), h('span', { class: 'lbl' }, 'Bandeja'), count ? h('span', { class: 'badge' + (fresh ? ' is-new' : '') }, String(count)) : null]));
      strip.appendChild(h('button', {
        class: 'tool', type: 'button', 'aria-pressed': String(state.hidePins), 'aria-label': state.hidePins ? 'Mostrar marcas' : 'Ocultar marcas',
        onclick: function () { state.hidePins = !state.hidePins; layer.style.display = state.hidePins ? 'none' : ''; closePopups(); renderStrip(); }
      }, [icon('pin'), h('span', { class: 'lbl' }, state.hidePins ? 'Mostrar marcas' : 'Ocultar marcas')]));
      return;
    }
    [['pin', 'Comentar'], ['zone', 'Marcar zona'], ['text', 'Cambiar texto']].forEach(function (def) {
      strip.appendChild(h('button', {
        class: 'tool', type: 'button', 'aria-pressed': String(state.tool === def[0]), 'aria-label': def[1],
        onclick: function () { if (state.drawer) { state.drawer = false; renderDrawer(); } setTool(def[0]); }
      }, [icon(def[0]), h('span', { class: 'lbl' }, def[1])]));
    });
    var listLabel = IS_ADMIN ? 'Avisos' : 'Mis cambios';
    strip.appendChild(h('button', {
      class: 'tool', type: 'button', 'aria-pressed': String(state.drawer), 'aria-label': listLabel,
      onclick: function () { setDrawer(!state.drawer); }
    }, [icon('list'), h('span', { class: 'lbl' }, listLabel), count ? h('span', { class: 'badge' + (fresh ? ' is-new' : '') }, String(count)) : null]));
  }

  function sayHello() {
    var seen = false;
    try { seen = localStorage.getItem(HELLO_KEY) === '1'; } catch (e) { seen = false; }
    if (seen || IS_ADMIN || state.notes.length) return;
    try { localStorage.setItem(HELLO_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
    strip.classList.add('is-hello');
    setTimeout(function () { strip.classList.remove('is-hello'); }, 4500);
  }

  /* ---------- guardar cambios en el servidor ---------- */
  function replaceNote(note) {
    state.notes = state.notes.map(function (n) { return n.id === note.id ? note : n; });
    refresh(true);
  }

  function updateNote(note, patch, done) {
    var body = { id: note.id };
    Object.keys(patch).forEach(function (key) { body[key] = patch[key]; });
    return api('/__nk/notes/update', 'POST', body).then(function (data) {
      replaceNote(data.note);
      if (done) done(data.note);
    }).catch(function (error) { say(error.message); refresh(true); });
  }

  function sendWithRetry(payload, attempt) {
    return new Promise(function (resolve) { setTimeout(resolve, RETRY_MS[attempt]); })
      .then(function () { return api('/__nk/notes', 'POST', payload); })
      .catch(function (error) {
        if (attempt + 1 >= RETRY_MS.length) throw error;
        return sendWithRetry(payload, attempt + 1);
      });
  }

  function ackNew() {
    if (!IS_ADMIN) return;
    var ids = state.notes.filter(function (n) { return n.author === 'cliente' && !n.ackAt; }).map(function (n) { return n.id; });
    if (!ids.length) return;
    api('/__nk/notes/ack', 'POST', { ids: ids }).then(load).catch(function () { /* se reintenta al abrir */ });
  }

  /* ---------- arrastrar pines y zonas ---------- */
  function startDrag(el, event, onMove, onDrop, onTap) {
    var startX = event.clientX; var startY = event.clientY; var moved = false;
    el.setPointerCapture(event.pointerId);
    var move = function (e) {
      var dx = e.clientX - startX; var dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < DRAG_PX) return;
      moved = true;
      onMove(dx, dy, e);
    };
    var up = function (e) {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (moved) onDrop(e.clientX - startX, e.clientY - startY, e); else if (onTap) onTap();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function dropPin(note, pos, dx, dy) {
    var vx = pos.x - window.scrollX + dx; var vy = pos.y - window.scrollY + dy;
    var target = elementAt(vx, vy);
    updateNote(note, { anchor: anchorFor(target, vx, vy) }, function () { say('Aviso movido'); });
  }

  function dropZone(note, rect, mode, dx, dy) {
    var left = rect.x - window.scrollX + (mode === 'move' ? dx : 0);
    var top = rect.y - window.scrollY + (mode === 'move' ? dy : 0);
    var width = Math.max(24, rect.w + (mode === 'resize' ? dx : 0));
    var height = Math.max(24, rect.h + (mode === 'resize' ? dy : 0));
    var target = elementAt(left + 2, top + 2);
    updateNote(note, { anchor: anchorFor(target, left, top, width, height) }, function () { say(mode === 'move' ? 'Zona movida' : 'Zona ajustada'); });
  }

  /* ---------- pines y zonas ---------- */
  function renderPins() {
    layer.textContent = '';
    state.notes.forEach(function (note, index) {
      var pos = locate(note);
      var movable = isMovable(note);
      var open = function () { showBubble(note, index, pos); };
      if (note.kind === 'zone' && pos.w > 0) { layer.appendChild(buildZone(note, index, pos, movable, open)); return; }
      var pin = h('button', {
        class: 'pin' + (movable ? ' can-move' : '') + (pos.exact ? '' : ' is-loose'), type: 'button', 'data-id': note.id,
        'aria-label': 'Aviso ' + (index + 1) + (movable ? '. Arrástralo para moverlo' : ''),
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }
      }, h('span', {}, note.status === 'done' ? '✓' : note.type === 'texto' ? 'T' : String(index + 1)));
      pin.style.cssText = 'left:' + pos.x + 'px;top:' + pos.y + 'px;background:' + colorOf(note);
      if (movable) {
        pin.addEventListener('pointerdown', function (event) {
          event.stopPropagation();
          startDrag(pin, event,
            function (dx, dy) { pin.classList.add('is-dragging'); pin.style.left = pos.x + dx + 'px'; pin.style.top = pos.y + dy + 'px'; },
            function (dx, dy) { dropPin(note, pos, dx, dy); },
            open);
        });
      } else {
        pin.style.touchAction = 'auto';
        pin.addEventListener('click', open);
      }
      layer.appendChild(pin);
    });
  }

  function buildZone(note, index, pos, movable, open) {
    var color = colorOf(note);
    var tag = h('button', { class: 'tag' + (movable ? ' can-move' : ''), type: 'button', 'aria-label': 'Aviso ' + (index + 1) }, note.status === 'done' ? '✓' : String(index + 1));
    var zone = h('div', { class: 'zone', 'data-id': note.id }, tag);
    zone.style.cssText = 'left:' + pos.x + 'px;top:' + pos.y + 'px;width:' + pos.w + 'px;height:' + pos.h + 'px;border-color:' + color;
    tag.style.background = color;
    var rect = { x: pos.x, y: pos.y, w: pos.w, h: pos.h };
    if (movable) {
      tag.addEventListener('pointerdown', function (event) {
        event.stopPropagation();
        startDrag(tag, event,
          function (dx, dy) { zone.style.left = rect.x + dx + 'px'; zone.style.top = rect.y + dy + 'px'; },
          function (dx, dy) { dropZone(note, rect, 'move', dx, dy); },
          open);
      });
    } else {
      tag.style.touchAction = 'auto';
      tag.addEventListener('click', open);
    }
    if (movable) {
      var grip = h('span', { class: 'grip', role: 'presentation' });
      grip.style.borderColor = color;
      grip.addEventListener('pointerdown', function (event) {
        event.stopPropagation();
        startDrag(grip, event,
          function (dx, dy) { zone.style.width = Math.max(24, rect.w + dx) + 'px'; zone.style.height = Math.max(24, rect.h + dy) + 'px'; },
          function (dx, dy) { dropZone(note, rect, 'resize', dx, dy); });
      });
      zone.appendChild(grip);
    }
    return zone;
  }

  function pulse(id) {
    var el = layer.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    el.classList.add('is-pulse');
    setTimeout(function () { el.classList.remove('is-pulse'); }, 1900);
  }

  function goTo(note) {
    var pos = locate(note);
    window.scrollTo({ top: Math.max(pos.y - window.innerHeight / 3, 0), behavior: 'smooth' });
    setTimeout(function () { pulse(note.id); }, 450);
  }

  /* ---------- tarjeta de un aviso ---------- */
  function noteBody(note) {
    if (note.type === 'texto') return h('div', { class: 'swap' }, [h('s', {}, note.before), ' → ', h('b', {}, note.after)]);
    return h('div', { class: 'msg' }, note.message);
  }

  function statusChip(note) {
    var label = deliveryLabel(note);
    return h('span', { class: 'chip' + (/✓/.test(label) ? ' ok' : label === 'Nuevo' ? ' new' : '') }, label);
  }

  function replyBox(note, onSent) {
    var area = h('textarea', { maxlength: '1000', 'aria-label': 'Escribe una respuesta', placeholder: 'Escribe una respuesta…' });
    area.style.minHeight = '60px';
    var error = h('p', { class: 'err', role: 'alert' });
    var send = h('button', { type: 'button', class: 'go' }, 'Enviar respuesta');
    send.addEventListener('click', function () {
      var value = area.value.trim();
      if (!value) { error.textContent = 'Escribe algo antes de enviar.'; return; }
      send.disabled = true; error.textContent = '';
      api('/__nk/notes/reply', 'POST', { id: note.id, message: value }).then(function (data) {
        replaceNote(data.note); say('Respuesta enviada ✓'); if (onSent) onSent(data.note);
      }).catch(function (err) { send.disabled = false; error.textContent = err.message; });
    });
    return h('div', { class: 'replybox' }, [area, error, h('div', { class: 'actions' }, [send])]);
  }

  function threadOf(note) {
    var replies = note.replies || [];
    if (!replies.length) return null;
    return h('div', { class: 'thread' }, replies.map(function (r) {
      return h('div', { class: 'reply' + (r.by === 'equipo' ? ' team' : '') }, [h('b', {}, r.by === 'equipo' ? 'NUKLEO' : 'CLIENTE'), h('span', {}, r.message), h('small', {}, ago(r.at))]);
    }));
  }

  function placeCard(card, vx, vy) {
    var width = Math.min(330, window.innerWidth - 24);
    card.style.left = Math.max(12, Math.min(vx + 18, window.innerWidth - width - 70)) + 'px';
    card.style.top = Math.max(12, Math.min(vy - 20, window.innerHeight - 340)) + 'px';
  }

  // Coloca la tarjeta dentro de la pantalla y la mantiene visible aunque crezca (p. ej. al abrir "Responder").
  function mountCard(card, vx, vy) {
    placeCard(card, vx, vy);
    card.style.maxHeight = window.innerHeight - 24 + 'px';
    card.style.overflow = 'auto';
    popup.appendChild(card);
    var fit = function () {
      var r = card.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 12) card.style.top = Math.max(12, window.innerHeight - 12 - r.height) + 'px';
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(fit); }).observe(card); // fuera del ciclo del observador: evita el aviso "loop completed"
  }

  function chipPicker(current, onPick) {
    var box = h('div', { class: 'chips' });
    var paint = function () {
      box.textContent = '';
      ['cambiar', 'quitar', 'gusta', 'pregunta'].forEach(function (key) {
        box.appendChild(h('button', { type: 'button', class: 'opt', 'aria-pressed': String(current === key), onclick: function () { current = key; onPick(key); paint(); } }, TYPES[key].label));
      });
    };
    paint();
    return box;
  }

  function showBubble(note, index, pos) {
    closePopups();
    var el = layer.querySelector('[data-id="' + note.id + '"]');
    if (el) el.classList.add('is-open');
    var editable = canEdit(note);
    var body = h('div', {});
    body.appendChild(noteBody(note));
    var tip = null;
    if (isMovable(note)) tip = h('div', { class: 'tip' }, note.kind === 'zone' ? 'Para moverla, arrastra el número. Para cambiar el tamaño, arrastra el círculo de la esquina.' : 'Para moverlo, arrastra el pin hasta donde quieras.');
    var deleteBtn = canDelete(note) ? h('button', { type: 'button', class: 'danger' }, 'Borrar') : null;
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        if (deleteBtn.classList.contains('sure')) { removeNote(note); return; }
        deleteBtn.classList.add('sure'); deleteBtn.textContent = '¿Seguro? Borrar';
        setTimeout(function () { deleteBtn.classList.remove('sure'); deleteBtn.textContent = 'Borrar'; }, 4000);
      });
    }
    var actions = h('div', { class: 'actions' }, [
      deleteBtn,
      editable ? h('button', { type: 'button', onclick: function () { editBubble(note, index, pos); } }, 'Editar') : null,
      IS_ADMIN ? h('button', { type: 'button', class: 'go', onclick: function () { updateNote(note, { status: note.status === 'done' ? 'open' : 'done' }, closePopups); } }, note.status === 'done' ? 'Reabrir' : 'Marcar hecho') : null,
      h('button', { type: 'button', onclick: closePopups }, 'Cerrar')
    ]);
    var card = h('div', { class: 'card', role: 'dialog', 'aria-label': 'Aviso ' + (index + 1) }, [
      h('div', { class: 'row' }, [
        h('span', { class: 'n', style: 'background:' + colorOf(note) }, String(index + 1)),
        h('span', { class: 'chip' }, TYPES[note.type].label), statusChip(note),
        h('span', { class: 'when' }, ago(note.createdAt))
      ]),
      body, threadOf(note), tip, actions
    ]);
    var replyToggle = h('button', { type: 'button', onclick: function () { replyToggle.replaceWith(replyBox(note, function (fresh) { showBubble(fresh, index, pos); })); } }, 'Responder');
    actions.insertBefore(replyToggle, actions.lastChild);
    mountCard(card, pos.x - window.scrollX, pos.y - window.scrollY);
    state.bubble = note.id;
  }

  function editBubble(note, index, pos) {
    closePopups();
    var isText = note.kind === 'text';
    var type = note.type;
    var area = h('textarea', { maxlength: '1000', 'aria-label': 'Editar aviso' });
    area.value = isText ? note.after : note.message;
    var error = h('p', { class: 'err', role: 'alert' });
    var save = h('button', { type: 'button', class: 'go' }, 'Guardar');
    save.addEventListener('click', function () {
      var value = area.value.trim();
      if (!value) { error.textContent = 'No puede quedar vacío.'; return; }
      save.disabled = true;
      var patch = isText ? { after: value } : { message: value, type: type };
      updateNote(note, patch, function () { closePopups(); say('Cambio guardado'); });
    });
    var card = h('div', { class: 'card', role: 'dialog', 'aria-label': 'Editar aviso ' + (index + 1) }, [
      h('h3', {}, 'Editar aviso ' + (index + 1)),
      isText ? h('div', { class: 'quote' }, 'Ahora dice: ' + note.before) : chipPicker(type, function (key) { type = key; }),
      area, error,
      h('div', { class: 'actions' }, [h('button', { type: 'button', onclick: function () { showBubble(note, index, pos); } }, 'Cancelar'), save])
    ]);
    mountCard(card, pos.x - window.scrollX, pos.y - window.scrollY);
    setTimeout(function () { area.focus(); }, 30);
  }

  function removeNote(note) {
    api('/__nk/notes/delete', 'POST', { id: note.id }).then(function () {
      state.notes = state.notes.filter(function (n) { return n.id !== note.id; });
      closePopups(); refresh(true); say('Aviso borrado');
    }).catch(function (error) { say(error.message); });
  }

  /* ---------- crear aviso ---------- */
  function openComposer(draft, vx, vy) {
    closePopups();
    var type = draft.kind === 'text' ? 'texto' : 'cambiar';
    var isText = draft.kind === 'text';
    var area = h('textarea', { 'aria-label': isText ? 'Texto nuevo' : 'Tu comentario', maxlength: '1000', placeholder: isText ? 'Escribe el texto nuevo' : 'Cuéntanos qué quieres aquí…' });
    if (isText) area.value = draft.before;
    var error = h('p', { class: 'err', role: 'alert' });
    var send = h('button', { type: 'button', class: 'go' }, 'Enviar');

    var submit = function () {
      var value = area.value.trim();
      if (!value || (isText && value === draft.before)) { error.textContent = isText ? 'Escribe un texto distinto al actual.' : 'Escribe tu comentario.'; return; }
      send.disabled = true; send.textContent = 'Enviando…'; error.textContent = '';
      sendWithRetry({
        kind: draft.kind, type: type, anchor: draft.anchor, page: location.pathname,
        message: isText ? '' : value, before: draft.before || '', after: isText ? value : '',
        viewport: { w: window.innerWidth, h: window.innerHeight }
      }, 0).then(function (data) {
        state.notes = state.notes.concat(data.note);
        closePopups(); setTool(null); refresh(true); say('Enviado a Nukleo ✓');
      }).catch(function (err) {
        send.disabled = false; send.textContent = 'Reintentar';
        error.textContent = 'No se ha podido enviar (' + err.message + '). Tu texto sigue aquí: pulsa Reintentar.';
      });
    };
    send.addEventListener('click', submit);
    area.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit(); });

    var titles = { pin: 'Nuevo comentario', zone: 'Zona marcada', text: 'Cambiar este texto' };
    var card = h('div', { class: 'card', role: 'dialog', 'aria-label': titles[draft.kind] }, [
      h('h3', {}, titles[draft.kind]),
      isText ? h('div', { class: 'quote' }, 'Ahora dice: ' + draft.before) : chipPicker(type, function (key) { type = key; }),
      area, error,
      h('div', { class: 'actions' }, [h('button', { type: 'button', onclick: function () { closePopups(); setTool(null); } }, 'Cancelar'), send])
    ]);
    mountCard(card, vx, vy);
    setTimeout(function () { area.focus(); }, 30);
  }

  /* ---------- captura de clics sobre la página ---------- */
  var dragStart = null;
  function viewportRect(r) { return 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;display:block'; }

  catcher.addEventListener('pointermove', function (event) {
    if (state.tool === 'text') {
      var target = textTargetAt(event.clientX, event.clientY);
      hl.style.cssText = target ? viewportRect(target.getBoundingClientRect()) : 'display:none';
    }
    if (state.tool === 'zone' && dragStart) {
      var left = Math.min(dragStart.x, event.clientX); var top = Math.min(dragStart.y, event.clientY);
      drag.style.cssText = viewportRect({ left: left, top: top, width: Math.abs(event.clientX - dragStart.x), height: Math.abs(event.clientY - dragStart.y) });
    }
  });

  catcher.addEventListener('pointerdown', function (event) {
    if (state.tool !== 'zone') return;
    dragStart = { x: event.clientX, y: event.clientY };
    catcher.setPointerCapture(event.pointerId);
  });

  catcher.addEventListener('pointerup', function (event) {
    if (state.tool !== 'zone' || !dragStart) return;
    var start = dragStart; dragStart = null; drag.style.display = 'none';
    var width = Math.abs(event.clientX - start.x); var height = Math.abs(event.clientY - start.y);
    if (width < 14 || height < 14) { say('Arrastra un poco más para marcar la zona'); return; }
    var left = Math.min(start.x, event.clientX); var top = Math.min(start.y, event.clientY);
    openComposer({ kind: 'zone', anchor: anchorFor(elementAt(left + 2, top + 2), left, top, width, height) }, left + width, top);
  });

  catcher.addEventListener('click', function (event) {
    if (state.tool === 'pin') {
      openComposer({ kind: 'pin', anchor: anchorFor(elementAt(event.clientX, event.clientY), event.clientX, event.clientY) }, event.clientX, event.clientY);
    } else if (state.tool === 'text') {
      var target = textTargetAt(event.clientX, event.clientY);
      if (!target) { say('Toca sobre un texto'); return; }
      var r = target.getBoundingClientRect();
      openComposer({ kind: 'text', before: ownText(target).slice(0, 1000), anchor: anchorFor(target, r.left + r.width / 2, r.top + r.height / 2) }, event.clientX, event.clientY);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (popup.firstChild) closePopups();
    else if (state.tool) setTool(state.tool);
    else if (state.drawer) setDrawer(false);
  });

  /* ---------- lista de avisos ---------- */
  function renderDrawer() {
    drawer.classList.toggle('on', state.drawer);
    if (IS_ADMIN && inboxRenderer) { if (state.drawer) inboxRenderer(drawer); else drawer.textContent = ''; return; }
    drawer.textContent = '';
    if (!state.drawer) return;
    var open = state.notes.filter(function (n) { return n.status !== 'done'; }).length;
    var list = h('div', { class: 'list' });
    if (!state.notes.length) list.appendChild(h('p', { class: 'empty' }, 'Todavía no hay cambios. Usa Comentar, Marcar zona o Cambiar texto para pedir el primero.'));
    state.notes.forEach(function (note, index) {
      list.appendChild(h('button', { type: 'button', class: 'item' + (note.status === 'done' ? ' is-done' : ''), onclick: function () { goTo(note); } }, [
        h('span', { class: 'row' }, [
          h('span', { class: 'n', style: 'background:' + colorOf(note) }, String(index + 1)),
          h('span', { class: 'chip' }, TYPES[note.type].label), statusChip(note),
          (note.replies && note.replies.length) ? h('span', { class: 'chip ok' }, '💬 ' + note.replies.length) : null,
          h('span', { class: 'when' }, ago(note.createdAt))
        ]),
        noteBody(note)
      ]));
    });
    drawer.appendChild(h('header', {}, [IS_ADMIN ? 'Avisos del cliente' : 'Mis cambios', h('button', { type: 'button', onclick: function () { setDrawer(false); } }, 'Cerrar')]));
    drawer.appendChild(h('p', { class: 'sub' }, state.notes.length ? open + ' pendientes · ' + (state.notes.length - open) + ' hechos. Toca uno para verlo en la web.' : ''));
    drawer.appendChild(list);
  }

  /* ---------- sincronización ---------- */
  function refresh(force) {
    var signature = state.notes.map(function (n) { return [n.id, n.status, n.ackAt || 0, n.editedAt || 0, (n.replies || []).length, n.message, n.after, n.type].join(); }).join('|');
    if (!force && signature === state.signature) return;
    state.signature = signature;
    renderPins(); renderStrip(); renderDrawer();
    listeners.forEach(function (fn) { fn(state.notes); });
  }

  function load() {
    return api('/__nk/notes', 'GET').then(function (data) {
      state.notes = data.notes || [];
      refresh(false);
      if (state.drawer) ackNew();
    }).catch(function () { /* se reintenta en el siguiente ciclo */ });
  }

  var relayout = 0;
  function scheduleLayout() { cancelAnimationFrame(relayout); relayout = requestAnimationFrame(renderPins); }
  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('load', scheduleLayout);
  if (window.ResizeObserver) new ResizeObserver(scheduleLayout).observe(document.body);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });

  window.__nkPanel = {
    status: status,
    isAdmin: IS_ADMIN,
    colors: { cambiar: TYPES.cambiar.color, quitar: TYPES.quitar.color, gusta: TYPES.gusta.color, pregunta: TYPES.pregunta.color, texto: TYPES.texto.color },
    getNotes: function () { return state.notes; },
    subscribe: function (fn) { listeners.push(fn); fn(state.notes); },
    openList: function () { setDrawer(true); },
    // Para el recorrido guiado: posición de cada herramienta y tira abierta con sus etiquetas.
    toolRect: function (name) {
      var order = { pin: 0, zone: 1, text: 2, list: 3 };
      var button = strip.querySelectorAll('.tool')[order[name]];
      return button ? button.getBoundingClientRect() : null;
    },
    tourStrip: function (on) { strip.classList.toggle('is-tour', !!on); },
    setInbox: function (fn) { inboxRenderer = fn; renderDrawer(); },
    core: {
      h: h, api: api, ago: ago, say: say, shadow: shadow, TYPES: TYPES, colorOf: colorOf,
      noteBody: noteBody, statusChip: statusChip, threadOf: threadOf, replyBox: replyBox,
      goTo: goTo, removeNote: removeNote, updateNote: updateNote, setDrawer: setDrawer,
      notes: function () { return state.notes; }, close: function () { setDrawer(false); }, reload: load
    }
  };

  document.documentElement.appendChild(host);
  renderStrip();
  load().then(sayHello);
  setInterval(function () { if (!document.hidden) load(); }, POLL_MS);
})();
