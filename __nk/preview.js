/* Nukleo Preview — aviso de entrada y carga de la tira de cambios. */
(function () {
  'use strict';
  var SEEN_KEY = 'nk-intro-seen';
  var ALWAYS_SHOW = true; // true: el tutorial sale en cada entrada. Poner false para que salga solo una vez por sesión.
  var CLIENT_SCRIPTS = ['/__nk/panel.js', '/__nk/panel-summary.js'];
  var TEAM_SCRIPTS = ['/__nk/panel.js', '/__nk/panel-editor.js', '/__nk/panel-summary.js'];
  var root = document.documentElement;

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '.nk-intro{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;overflow:auto;background:#14140f;color:#f3f1ea;font:500 16px/1.5 "Instrument Sans",system-ui,sans-serif;opacity:1;transition:opacity .5s ease}' +
      '.nk-intro.is-out{opacity:0;pointer-events:none}' +
      '.nk-intro__box{width:min(540px,100%);margin:auto}' +
      '.nk-steps{list-style:none;margin:26px 0 0;padding:0;display:grid;gap:12px}' +
      '.nk-steps li{display:grid;grid-template-columns:34px 1fr;gap:14px;align-items:start;padding:14px 16px;border-radius:16px;background:rgba(243,241,234,.07);border:1px solid rgba(243,241,234,.1)}' +
      '.nk-steps i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#5f86c4;color:#14140f;font:700 15px/1 "Instrument Sans",system-ui,sans-serif;font-style:normal}' +
      '.nk-steps b{display:block;color:#f3f1ea;font-weight:600}' +
      '.nk-steps span{display:block;margin-top:2px;color:rgba(243,241,234,.68);font-size:15px}' +
      '.nk-intro__mark{display:flex;align-items:center;gap:10px;font-weight:600;margin-bottom:48px}' +
      '.nk-intro__mark i{width:11px;height:11px;border-radius:50%;background:#5f86c4;box-shadow:0 0 0 5px rgba(95,134,196,.18)}' +
      '.nk-intro h2{font-weight:600;font-size:clamp(1.8rem,6vw,2.4rem);line-height:1.05;letter-spacing:-.025em;margin:0 0 18px}' +
      '.nk-intro p{margin:0 0 10px;color:rgba(243,241,234,.7)}' +
      '@media (max-width:520px){.nk-intro{padding:18px}.nk-intro__mark{margin-bottom:26px}.nk-steps li{padding:12px 13px}}' +
      '.nk-intro button{font:inherit;font-weight:600;cursor:pointer;color:#14140f;background:#f3f1ea;border:0;border-radius:999px;padding:14px 26px;margin-top:20px}' +
      '.nk-intro button:focus-visible{outline:2px solid #5f86c4;outline-offset:3px}' +
      '@media (prefers-reduced-motion:reduce){.nk-intro{transition:none}}';
    document.head.appendChild(style);
  }

  function buildIntro(days) {
    var el = document.createElement('div');
    el.className = 'nk-intro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'nk-intro-title');
    el.innerHTML =
      '<div class="nk-intro__box">' +
      '<div class="nk-intro__mark"><i></i>Nukleo</div>' +
      '<h2 id="nk-intro-title">Esta web ha sido diseñada por Nukleo</h2>' +
      '<p>Tienes <strong>' + days + ' días</strong> con esta URL para revisar la propuesta. Abajo a la izquierda verás cuánto tiempo queda. Después se cancela, con posibilidad de renegociar.</p>' +
      '<ol class="nk-steps">' +
      '<li><i>1</i><div><b>Elige una herramienta</b><span>En la tira de la derecha: comentar, marcar una zona o cambiar un texto.</span></div></li>' +
      '<li><i>2</i><div><b>Toca la web y escribe</b><span>Donde quieras el cambio. Nos llega al momento.</span></div></li>' +
      '<li><i>3</i><div><b>Revisa tus cambios</b><span>En «Mis cambios» puedes editarlos, moverlos o borrarlos cuando quieras.</span></div></li>' +
      '</ol>' +
      '<button type="button">Ver la web</button>' +
      '</div>';
    var button = el.querySelector('button');
    button.addEventListener('click', function () {
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 600);
    });
    document.body.appendChild(el);
    button.focus();
  }

  function seenIntro() {
    if (ALWAYS_SHOW) return false;
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }

  function loadScripts(status) {
    var list = status.role === 'admin' ? TEAM_SCRIPTS : CLIENT_SCRIPTS;
    var version = encodeURIComponent(status.v || Date.now());
    list.forEach(function (src) {
      var script = document.createElement('script');
      script.src = src + '?v=' + version;
      script.async = false; // se ejecutan en orden: primero la tira, luego el resumen
      document.head.appendChild(script);
    });
  }

  function start(status) {
    window.__nkStatus = status;
    injectStyles();
    window.__nkShowIntro = function () { if (!document.querySelector('.nk-intro')) buildIntro(status.days); };
    if (status.role === 'client' && !seenIntro()) buildIntro(status.days);
    root.classList.remove('nk-pending');
    loadScripts(status);
  }

  fetch('/__nk/status', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (status) {
      if (!status) { root.classList.remove('nk-pending'); return; }
      if (document.body) start(status);
      else document.addEventListener('DOMContentLoaded', function () { start(status); });
    })
    .catch(function () { root.classList.remove('nk-pending'); });
})();
