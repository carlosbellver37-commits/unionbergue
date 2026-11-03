/* Nukleo Preview — aviso de entrada y carga de la tira de cambios. */
(function () {
  'use strict';
  var SEEN_KEY = 'nk-intro-seen';
  var CLIENT_SCRIPTS = ['/__nk/panel.js', '/__nk/panel-summary.js'];
  var TEAM_SCRIPTS = ['/__nk/panel.js', '/__nk/panel-editor.js', '/__nk/panel-summary.js'];
  var root = document.documentElement;

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '.nk-intro{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#14140f;color:#f3f1ea;font:500 16px/1.5 "Instrument Sans",system-ui,sans-serif;opacity:1;transition:opacity .5s ease}' +
      '.nk-intro.is-out{opacity:0;pointer-events:none}' +
      '.nk-intro__box{width:min(520px,100%)}' +
      '.nk-intro__mark{display:flex;align-items:center;gap:10px;font-weight:600;margin-bottom:48px}' +
      '.nk-intro__mark i{width:11px;height:11px;border-radius:50%;background:#5f86c4;box-shadow:0 0 0 5px rgba(95,134,196,.18)}' +
      '.nk-intro h2{font-weight:600;font-size:clamp(1.8rem,6vw,2.4rem);line-height:1.05;letter-spacing:-.025em;margin:0 0 18px}' +
      '.nk-intro p{margin:0 0 14px;color:rgba(243,241,234,.7)}' +
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
      '<p>Una vez realizado el primer contacto, dispones de un plazo de <strong>' + days + ' días</strong> con esta URL pública bajo nuestro diseño, donde se mantiene la propuesta.</p>' +
      '<p>Con la tira de la derecha puedes marcar lo que quieras cambiar y nos llega al momento. Pasado el plazo, la web y la propuesta se cancelan, con posibilidad de renegociación.</p>' +
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
