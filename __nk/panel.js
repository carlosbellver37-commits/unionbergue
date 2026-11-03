/* Nukleo Preview — tira lateral para comentar, marcar zonas y cambiar textos. */
(function () {
  'use strict';
  var status = window.__nkStatus;
  if (!status || window.__nkPanelLoaded) return;
  window.__nkPanelLoaded = true;

  var ACCENT = /^#[0-9a-f]{3,8}$/i.test(status.accent || '') ? status.accent : '#1b3358';
  var IS_ADMIN = status.role === 'admin';
  var POLL_MS = 15000;
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

  var state = { notes: [], tool: null, drawer: false, composer: null, bubble: null, signature: '' };

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
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
        return data;
      });
    });
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
    '.pin{position:absolute;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);display:grid;place-items:center;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.3);border:2px solid #fff}' +
    '.pin span{transform:rotate(45deg);font-size:12px;font-weight:700}' +
    '.pin.is-done{background:#8a8a82!important}' +
    '.pin.is-loose{outline:2px dashed #fff}' +
    '.zone{position:absolute;border:2px dashed;border-radius:6px;pointer-events:none}' +
    '.zone .tag{position:absolute;top:-13px;left:-2px;pointer-events:auto;min-width:26px;height:26px;padding:0 8px;border-radius:999px;color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.3)}' +
    '.is-pulse{animation:pulse .9s ease 2}@keyframes pulse{50%{transform:scale(1.35) rotate(-45deg)}}' +
    '.zone.is-pulse{animation:zp .9s ease 2}@keyframes zp{50%{opacity:.35}}' +
    '.catcher{position:fixed;inset:0;display:none;cursor:crosshair;background:rgba(20,20,15,.04);touch-action:pan-y}' +
    '.catcher.on{display:block}.catcher.zone-mode{touch-action:none}' +
    '.hl{position:fixed;display:none;pointer-events:none;border:2px solid ' + ACCENT + ';background:color-mix(in srgb,' + ACCENT + ' 14%,transparent);border-radius:4px}' +
    '.drag{position:fixed;display:none;pointer-events:none;border:2px dashed ' + ACCENT + ';background:color-mix(in srgb,' + ACCENT + ' 12%,transparent);border-radius:6px}' +
    '.hint{position:fixed;top:14px;left:50%;transform:translateX(-50%);display:none;align-items:center;gap:12px;padding:9px 10px 9px 16px;border-radius:999px;background:#14140f;color:#f3f1ea;box-shadow:0 10px 30px rgba(0,0,0,.3)}' +
    '.hint.on{display:flex}.hint button{padding:5px 12px;border-radius:999px;background:rgba(243,241,234,.16)}.hint button:hover{background:rgba(243,241,234,.28)}' +
    '.strip{position:fixed;right:10px;top:50%;transform:translateY(-50%);width:46px;padding:6px;border-radius:24px;background:rgba(251,250,246,.96);border:1px solid rgba(20,20,15,.1);box-shadow:0 12px 36px rgba(20,20,15,.22);display:flex;flex-direction:column;gap:2px;overflow:hidden;backdrop-filter:blur(8px);transition:width .22s cubic-bezier(.16,1,.3,1)}' +
    '.strip:hover,.strip:focus-within{width:176px}' +
    '.tool{position:relative;display:flex;align-items:center;gap:12px;height:34px;padding:0 7px;border-radius:17px;white-space:nowrap;text-align:left;transition:background .15s}' +
    '.tool:hover{background:rgba(20,20,15,.07)}.tool[aria-pressed="true"]{background:' + ACCENT + ';color:#fff}' +
    '.tool .ico{flex:none;width:20px;height:20px}.tool .ico svg{width:20px;height:20px;display:block}' +
    '.tool .lbl{opacity:0;transition:opacity .15s}.strip:hover .lbl,.strip:focus-within .lbl{opacity:1}' +
    '.badge{position:absolute;left:21px;top:1px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#b3321f;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center}' +
    '.drawer{position:fixed;right:66px;top:12px;bottom:12px;width:min(340px,calc(100vw - 84px));display:none;flex-direction:column;border-radius:22px;background:#fbfaf6;border:1px solid rgba(20,20,15,.1);box-shadow:0 20px 50px rgba(20,20,15,.28);overflow:hidden}' +
    '.drawer.on{display:flex}.drawer header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 10px 18px;font-weight:700;font-size:16px}' +
    '.drawer header button{padding:4px 10px;border-radius:999px;background:rgba(20,20,15,.07)}' +
    '.list{flex:1;overflow:auto;padding:4px 10px 14px;display:grid;gap:8px;align-content:start}' +
    '.empty{padding:18px 10px;color:#6b6a63}' +
    '.item{display:grid;gap:4px;text-align:left;padding:10px 12px;border-radius:14px;background:#fff;border:1px solid rgba(20,20,15,.08);width:100%}' +
    '.item:hover{border-color:' + ACCENT + '}.item.is-done{opacity:.55}' +
    '.row{display:flex;align-items:center;gap:8px}.n{width:22px;height:22px;border-radius:50%;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;flex:none}' +
    '.chip{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:rgba(20,20,15,.07)}.when{margin-left:auto;font-size:11px;color:#8a8982}' +
    '.msg{color:#33322c;overflow-wrap:anywhere}.swap{font-size:13px;overflow-wrap:anywhere}.swap s{color:#8a8982}.swap b{font-weight:600}' +
    '.card{position:fixed;width:min(320px,calc(100vw - 24px));padding:14px;border-radius:18px;background:#fbfaf6;border:1px solid rgba(20,20,15,.1);box-shadow:0 20px 50px rgba(20,20,15,.32);display:grid;gap:10px}' +
    '.card h3{margin:0;font-size:15px}.chips{display:flex;flex-wrap:wrap;gap:6px}' +
    '.opt{padding:6px 12px;border-radius:999px;border:1px solid rgba(20,20,15,.16);background:#fff;font-size:13px}.opt[aria-pressed="true"]{background:#14140f;color:#fff;border-color:#14140f}' +
    'textarea{width:100%;min-height:84px;resize:vertical;padding:10px 12px;border-radius:12px;border:1px solid rgba(20,20,15,.18);background:#fff;font:inherit;color:inherit}' +
    '.quote{font-size:13px;color:#6b6a63;padding:8px 10px;border-radius:10px;background:rgba(20,20,15,.05);overflow-wrap:anywhere;max-height:84px;overflow:auto}' +
    '.actions{display:flex;justify-content:flex-end;gap:8px}.actions button{padding:9px 16px;border-radius:999px;background:rgba(20,20,15,.07)}' +
    '.actions .go{background:' + ACCENT + ';color:#fff;font-weight:600}.actions .go[disabled]{opacity:.5;cursor:default}' +
    '.err{color:#b3321f;font-size:13px;min-height:1em;margin:0}' +
    '.toast{position:fixed;left:50%;bottom:72px;transform:translate(-50%,12px);padding:10px 18px;border-radius:999px;background:#14140f;color:#f3f1ea;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}' +
    '.toast.on{opacity:1;transform:translate(-50%,0)}' +
    '@media (max-width:640px){.strip:hover,.strip:focus-within{width:46px}.tool .lbl{display:none}.drawer{right:10px;left:10px;width:auto;bottom:70px}}' +
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}';

  var layer = h('div', { class: 'layer' });
  var ui = h('div', { class: 'ui' });
  var catcher = h('div', { class: 'catcher' });
  var hl = h('div', { class: 'hl' });
  var drag = h('div', { class: 'drag' });
  var hint = h('div', { class: 'hint', role: 'status' });
  var strip = h('nav', { class: 'strip', 'aria-label': 'Herramientas de comentarios' });
  var drawer = h('aside', { class: 'drawer', 'aria-label': 'Avisos enviados' });
  var toast = h('div', { class: 'toast', role: 'status' });
  var popup = h('div', {});
  ui.appendChild(catcher); ui.appendChild(hl); ui.appendChild(drag); ui.appendChild(hint);
  ui.appendChild(drawer); ui.appendChild(popup); ui.appendChild(strip); ui.appendChild(toast);
  shadow.appendChild(style); shadow.appendChild(layer); shadow.appendChild(ui);

  /* ---------- avisos efímeros y herramientas ---------- */
  var toastTimer = 0;
  function say(message) {
    toast.textContent = message;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('on'); }, 2600);
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

  function closePopups() {
    popup.textContent = '';
    state.composer = null;
    state.bubble = null;
  }

  /* ---------- tira lateral ---------- */
  function renderStrip() {
    var open = state.notes.filter(function (n) { return n.status !== 'done'; }).length;
    strip.textContent = '';
    [['pin', 'Comentar'], ['zone', 'Marcar zona'], ['text', 'Cambiar texto']].forEach(function (def) {
      strip.appendChild(h('button', {
        class: 'tool', type: 'button', 'aria-pressed': String(state.tool === def[0]), 'aria-label': def[1],
        onclick: function () { state.drawer = false; renderDrawer(); setTool(def[0]); }
      }, [icon(def[0]), h('span', { class: 'lbl' }, def[1])]));
    });
    var list = h('button', {
      class: 'tool', type: 'button', 'aria-pressed': String(state.drawer), 'aria-label': 'Avisos enviados',
      onclick: function () { if (state.tool) setTool(state.tool); state.drawer = !state.drawer; renderDrawer(); renderStrip(); }
    }, [icon('list'), h('span', { class: 'lbl' }, 'Avisos'), open ? h('span', { class: 'badge' }, String(open)) : null]);
    strip.appendChild(list);
  }

  /* ---------- pines y zonas ---------- */
  function colorOf(note) { return (TYPES[note.type] || TYPES.cambiar).color; }

  function renderPins() {
    layer.textContent = '';
    state.notes.forEach(function (note, index) {
      var pos = locate(note);
      var done = note.status === 'done';
      var label = note.type === 'texto' ? 'T' : String(index + 1);
      var openBubble = function (event) { event.stopPropagation(); showBubble(note, index, pos); };
      if (note.kind === 'zone' && pos.w > 0) {
        var zone = h('div', { class: 'zone', 'data-id': note.id }, h('button', {
          class: 'tag', type: 'button', 'aria-label': 'Aviso ' + (index + 1), onclick: openBubble
        }, String(index + 1)));
        zone.style.cssText = 'left:' + pos.x + 'px;top:' + pos.y + 'px;width:' + pos.w + 'px;height:' + pos.h + 'px;border-color:' + (done ? '#8a8a82' : colorOf(note));
        zone.firstChild.style.background = done ? '#8a8a82' : colorOf(note);
        layer.appendChild(zone);
        return;
      }
      var pin = h('button', {
        class: 'pin' + (done ? ' is-done' : '') + (pos.exact ? '' : ' is-loose'), type: 'button', 'data-id': note.id,
        'aria-label': 'Aviso ' + (index + 1), onclick: openBubble
      }, h('span', {}, done ? '✓' : label));
      pin.style.left = pos.x + 'px';
      pin.style.top = pos.y + 'px';
      pin.style.background = colorOf(note);
      layer.appendChild(pin);
    });
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

  /* ---------- tarjeta de aviso existente ---------- */
  function noteBody(note) {
    if (note.type === 'texto') {
      return h('div', { class: 'swap' }, [h('s', {}, note.before), ' → ', h('b', {}, note.after)]);
    }
    return h('div', { class: 'msg' }, note.message);
  }

  function showBubble(note, index, pos) {
    closePopups();
    var canDelete = IS_ADMIN || note.author === 'cliente';
    var actions = h('div', { class: 'actions' }, [
      canDelete ? h('button', { type: 'button', onclick: function () { removeNote(note); } }, 'Borrar') : null,
      IS_ADMIN ? h('button', { type: 'button', class: 'go', onclick: function () { toggleDone(note); } }, note.status === 'done' ? 'Reabrir' : 'Marcar hecho') : null,
      h('button', { type: 'button', onclick: closePopups }, 'Cerrar')
    ]);
    var card = h('div', { class: 'card', role: 'dialog', 'aria-label': 'Aviso ' + (index + 1) }, [
      h('div', { class: 'row' }, [
        h('span', { class: 'n', style: 'background:' + colorOf(note) }, String(index + 1)),
        h('span', { class: 'chip' }, TYPES[note.type].label),
        h('span', { class: 'when' }, (note.author === 'equipo' ? 'Equipo · ' : '') + ago(note.createdAt))
      ]),
      noteBody(note), actions
    ]);
    placeCard(card, pos.x - window.scrollX, pos.y - window.scrollY);
    popup.appendChild(card);
    state.bubble = note.id;
  }

  function placeCard(card, vx, vy) {
    var width = Math.min(320, window.innerWidth - 24);
    card.style.left = Math.max(12, Math.min(vx + 18, window.innerWidth - width - 70)) + 'px';
    card.style.top = Math.max(12, Math.min(vy - 20, window.innerHeight - 330)) + 'px';
  }

  function removeNote(note) {
    api('/__nk/notes/delete', 'POST', { id: note.id }).then(function () {
      state.notes = state.notes.filter(function (n) { return n.id !== note.id; });
      closePopups(); refresh(true); say('Aviso borrado');
    }).catch(function (error) { say(error.message); });
  }

  function toggleDone(note) {
    var next = note.status === 'done' ? 'open' : 'done';
    api('/__nk/notes/update', 'POST', { id: note.id, status: next }).then(function (data) {
      state.notes = state.notes.map(function (n) { return n.id === note.id ? data.note : n; });
      closePopups(); refresh(true);
    }).catch(function (error) { say(error.message); });
  }

  /* ---------- crear aviso ---------- */
  function openComposer(draft, vx, vy) {
    closePopups();
    var type = draft.kind === 'text' ? 'texto' : 'cambiar';
    var area = h('textarea', { 'aria-label': draft.kind === 'text' ? 'Texto nuevo' : 'Tu comentario', maxlength: '1000', placeholder: draft.kind === 'text' ? 'Escribe el texto nuevo' : 'Cuéntanos qué quieres aquí…' });
    if (draft.kind === 'text') area.value = draft.before;
    var error = h('p', { class: 'err', role: 'alert' });
    var send = h('button', { type: 'button', class: 'go' }, 'Enviar');
    var chips = h('div', { class: 'chips' });
    var paintChips = function () {
      chips.textContent = '';
      ['cambiar', 'quitar', 'gusta', 'pregunta'].forEach(function (key) {
        chips.appendChild(h('button', { type: 'button', class: 'opt', 'aria-pressed': String(type === key), onclick: function () { type = key; paintChips(); } }, TYPES[key].label));
      });
    };
    if (draft.kind !== 'text') paintChips();

    var submit = function () {
      var value = area.value.trim();
      if (!value || (draft.kind === 'text' && value === draft.before)) { error.textContent = draft.kind === 'text' ? 'Escribe un texto distinto al actual.' : 'Escribe tu comentario.'; return; }
      send.disabled = true; error.textContent = '';
      api('/__nk/notes', 'POST', {
        kind: draft.kind, type: type, anchor: draft.anchor, page: location.pathname,
        message: draft.kind === 'text' ? '' : value, before: draft.before || '', after: draft.kind === 'text' ? value : '',
        viewport: { w: window.innerWidth, h: window.innerHeight }
      }).then(function (data) {
        state.notes = state.notes.concat(data.note);
        closePopups(); setTool(null); refresh(true); say('Enviado a Nukleo ✓');
      }).catch(function (err) { send.disabled = false; error.textContent = err.message; });
    };
    send.addEventListener('click', submit);
    area.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit();
    });

    var titles = { pin: 'Nuevo comentario', zone: 'Zona marcada', text: 'Cambiar este texto' };
    var card = h('div', { class: 'card', role: 'dialog', 'aria-label': titles[draft.kind] }, [
      h('h3', {}, titles[draft.kind]),
      draft.kind === 'text' ? h('div', { class: 'quote' }, 'Ahora dice: ' + draft.before) : chips,
      area, error,
      h('div', { class: 'actions' }, [h('button', { type: 'button', onclick: function () { closePopups(); setTool(null); } }, 'Cancelar'), send])
    ]);
    placeCard(card, vx, vy);
    popup.appendChild(card);
    state.composer = draft;
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
    var el = elementAt(left + 2, top + 2);
    openComposer({ kind: 'zone', anchor: anchorFor(el, left, top, width, height) }, left + width, top);
  });

  catcher.addEventListener('click', function (event) {
    if (state.tool === 'pin') {
      var el = elementAt(event.clientX, event.clientY);
      openComposer({ kind: 'pin', anchor: anchorFor(el, event.clientX, event.clientY) }, event.clientX, event.clientY);
    } else if (state.tool === 'text') {
      var target = textTargetAt(event.clientX, event.clientY);
      if (!target) { say('Toca sobre un texto'); return; }
      var r = target.getBoundingClientRect();
      openComposer({ kind: 'text', before: ownText(target).slice(0, 1000), anchor: anchorFor(target, r.left + r.width / 2, r.top + r.height / 2) }, event.clientX, event.clientY);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (state.composer || state.bubble) closePopups();
    else if (state.tool) setTool(state.tool);
    else if (state.drawer) { state.drawer = false; renderDrawer(); renderStrip(); }
  });

  /* ---------- lista de avisos ---------- */
  function renderDrawer() {
    drawer.classList.toggle('on', state.drawer);
    drawer.textContent = '';
    if (!state.drawer) return;
    var list = h('div', { class: 'list' });
    if (!state.notes.length) list.appendChild(h('p', { class: 'empty' }, 'Todavía no hay avisos. Usa Comentar, Marcar zona o Cambiar texto para empezar.'));
    state.notes.forEach(function (note, index) {
      list.appendChild(h('button', { type: 'button', class: 'item' + (note.status === 'done' ? ' is-done' : ''), onclick: function () { goTo(note); } }, [
        h('span', { class: 'row' }, [
          h('span', { class: 'n', style: 'background:' + colorOf(note) }, String(index + 1)),
          h('span', { class: 'chip' }, TYPES[note.type].label + (note.status === 'done' ? ' · hecho' : '')),
          h('span', { class: 'when' }, ago(note.createdAt))
        ]),
        noteBody(note)
      ]));
    });
    drawer.appendChild(h('header', {}, ['Avisos (' + state.notes.length + ')', h('button', { type: 'button', onclick: function () { state.drawer = false; renderDrawer(); renderStrip(); } }, 'Cerrar')]));
    drawer.appendChild(list);
  }

  /* ---------- sincronización ---------- */
  function refresh(force) {
    var signature = state.notes.map(function (n) { return n.id + n.status; }).join('|');
    if (!force && signature === state.signature) return;
    state.signature = signature;
    renderPins(); renderStrip(); renderDrawer();
  }

  function load() {
    return api('/__nk/notes', 'GET').then(function (data) {
      state.notes = data.notes || [];
      refresh(false);
    }).catch(function () { /* se reintenta en el siguiente ciclo */ });
  }

  var relayout = 0;
  function scheduleLayout() { cancelAnimationFrame(relayout); relayout = requestAnimationFrame(renderPins); }
  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('load', scheduleLayout);
  if (window.ResizeObserver) new ResizeObserver(scheduleLayout).observe(document.body);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });

  document.documentElement.appendChild(host);
  renderStrip();
  load();
  setInterval(function () { if (!document.hidden) load(); }, POLL_MS);
})();
