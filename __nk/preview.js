/* Nukleo Preview — aviso de entrada y contador de plazo. */
(function () {
  'use strict';
  var SEEN_KEY = 'nk-intro-seen';
  var root = document.documentElement;

  function formatRemaining(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(total / 86400);
    var h = Math.floor((total % 86400) / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d + 'd ' + pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
  }

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
      '.nk-timer{position:fixed;left:16px;bottom:16px;z-index:2147483646;display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;background:rgba(20,20,15,.9);color:#f3f1ea;font:600 12.5px/1 "Instrument Sans",system-ui,sans-serif;font-variant-numeric:tabular-nums;backdrop-filter:blur(8px);box-shadow:0 6px 24px rgba(0,0,0,.25)}' +
      '.nk-timer i{width:8px;height:8px;border-radius:50%;background:#5f86c4}' +
      '.nk-timer.is-low i{background:#ff9d8a}' +
      '.nk-timer a{margin-left:4px;padding:5px 10px;border-radius:999px;background:rgba(243,241,234,.14);color:inherit;text-decoration:none}' +
      '.nk-timer a:hover,.nk-timer a:focus-visible{background:rgba(243,241,234,.28);outline:none}' +
      '@media (prefers-reduced-motion:reduce){.nk-intro{transition:none}}';
    document.head.appendChild(style);
  }

  function buildIntro(days, onDone) {
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
      '<p>Pasado ese plazo, la web y la propuesta se cancelan, con posibilidad de renegociación.</p>' +
      '<button type="button">Ver la web</button>' +
      '</div>';
    var button = el.querySelector('button');
    button.addEventListener('click', function () {
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 600);
      onDone();
    });
    document.body.appendChild(el);
    button.focus();
  }

  function buildTimer(status) {
    var el = document.createElement('div');
    el.className = 'nk-timer';
    el.setAttribute('role', 'timer');
    var label = document.createElement('span');
    el.appendChild(document.createElement('i'));
    el.appendChild(label);
    if (status.role === 'admin') {
      var exit = document.createElement('a');
      exit.href = '/__nk/logout';
      exit.textContent = 'Salir';
      exit.setAttribute('aria-label', 'Salir del modo equipo');
      el.appendChild(exit);
    }
    document.body.appendChild(el);

    function tick() {
      if (!status.expires) {
        label.textContent = 'Nukleo · modo equipo · plazo sin iniciar';
        return;
      }
      var left = status.expires - Date.now();
      if (left <= 0) { location.reload(); return; }
      el.classList.toggle('is-low', left < 24 * 3600 * 1000);
      label.textContent = (status.role === 'admin' ? 'Nukleo · equipo · ' : 'Propuesta Nukleo · ') + formatRemaining(left);
    }
    tick();
    setInterval(tick, 1000);
  }

  function seenIntro() {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }

  function start(status) {
    injectStyles();
    buildTimer(status);
    if (status.role === 'client' && !seenIntro()) buildIntro(status.days, function () {});
    root.classList.remove('nk-pending');
    window.__nkStatus = status;
    var panel = document.createElement('script');
    panel.src = '/__nk/panel.js';
    panel.defer = true;
    document.head.appendChild(panel);
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
