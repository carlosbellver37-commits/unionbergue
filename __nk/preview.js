/* Nukleo Preview — aviso de entrada y carga de la tira de cambios. */
(function () {
  'use strict';
  var SEEN_KEY = 'nk-intro-seen';
  var ALWAYS_SHOW = false; // true: el tutorial sale en cada entrada. Poner false para que salga solo una vez por sesión.
  var CLIENT_SCRIPTS = ['/__nk/panel.js', '/__nk/panel-summary.js', '/__nk/panel-proposal.js', '/__nk/panel-tour.js'];
  var TEAM_SCRIPTS = ['/__nk/panel.js', '/__nk/panel-editor.js', '/__nk/panel-summary.js', '/__nk/panel-proposal.js'];
  var root = document.documentElement;

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '.nk-intro{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;overflow:auto;background:#14140f;color:#f3f1ea;font:500 16px/1.5 "Instrument Sans",system-ui,sans-serif;opacity:1;transition:opacity .5s ease}' +
      '.nk-intro.is-out{opacity:0;pointer-events:none}' +
      '.nk-intro__box{width:min(640px,100%);margin:auto}' +
      '.nk-tour{list-style:none;margin:24px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}' +
      '.nk-tour li{border-radius:18px;overflow:hidden;background:rgba(243,241,234,.07);border:1px solid rgba(243,241,234,.1)}' +
      '.nk-tour svg{display:block;width:100%;height:auto;background:#1d1d17}' +
      '.nk-tour div{padding:10px 14px 13px}.nk-tour b{display:flex;align-items:center;gap:8px;color:#f3f1ea;font-weight:600;font-size:15px}' +
      '.nk-tour b i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#5f86c4;color:#14140f;font:700 12px/1 "Instrument Sans",system-ui,sans-serif;font-style:normal;flex:none}' +
      '.nk-tour span{display:block;margin-top:3px;color:rgba(243,241,234,.66);font-size:13.5px;line-height:1.4}' +
      '.nk-ring{transform-box:fill-box;transform-origin:center;animation:nk-ring 1.8s ease-out infinite}' +
      '.nk-draw{stroke-dasharray:6 4;animation:nk-dash 1.2s linear infinite}' +
      '.nk-tap{animation:nk-tap 1.8s ease-in-out infinite}' +
      '@keyframes nk-ring{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.5);opacity:0}}' +
      '@keyframes nk-dash{to{stroke-dashoffset:-20}}' +
      '@keyframes nk-tap{0%,100%{transform:translate(0,0)}50%{transform:translate(-4px,-4px)}}' +
      '.nk-intro__mark{display:flex;align-items:center;gap:10px;font-weight:600;margin-bottom:48px}' +
      '.nk-intro__mark i{width:11px;height:11px;border-radius:50%;background:#5f86c4;box-shadow:0 0 0 5px rgba(95,134,196,.18)}' +
      '.nk-intro h2{font-weight:600;font-size:clamp(1.8rem,6vw,2.4rem);line-height:1.05;letter-spacing:-.025em;margin:0 0 18px}' +
      '.nk-intro p{margin:0 0 10px;color:rgba(243,241,234,.7)}' +
      '@media (max-width:520px){.nk-intro{padding:16px}.nk-intro__mark{margin-bottom:22px}.nk-tour{gap:8px}.nk-tour div{padding:8px 10px 11px}.nk-tour b{font-size:13.5px}.nk-tour span{font-size:12px}}' +
      '@media (min-width:900px){.nk-intro__box{width:min(1040px,100%)}.nk-tour{grid-template-columns:repeat(4,minmax(0,1fr))}}' +
      '@media (prefers-reduced-motion:reduce){.nk-ring,.nk-draw,.nk-tap{animation:none}}' +
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
      '<p>Tienes <strong>' + days + ' días</strong> con esta URL para revisar la propuesta. Después se cancela, con posibilidad de renegociar.</p>' +
      '<ul class="nk-tour">' +
      '<li><svg viewBox=\"0 0 160 100\" aria-hidden=\"true\"><rect x=\"14\" y=\"16\" width=\"70\" height=\"6\" rx=\"3\" fill=\"#3a3a30\"/><rect x=\"14\" y=\"30\" width=\"70\" height=\"6\" rx=\"3\" fill=\"#3a3a30\"/><rect x=\"14\" y=\"46\" width=\"132\" height=\"6\" rx=\"3\" fill=\"#3a3a30\"/><circle class=\"nk-ring\" cx=\"96\" cy=\"40\" r=\"14\" fill=\"none\" stroke=\"#5f86c4\" stroke-width=\"2\"/><circle cx=\"96\" cy=\"40\" r=\"9\" fill=\"#5f86c4\"/><text x=\"96\" y=\"43.5\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"700\" fill=\"#14140f\">1</text><rect x=\"70\" y=\"60\" width=\"78\" height=\"24\" rx=\"8\" fill=\"#f3f1ea\"/><rect x=\"78\" y=\"68\" width=\"50\" height=\"4\" rx=\"2\" fill=\"#14140f\" opacity=\".7\"/><rect x=\"78\" y=\"75\" width=\"34\" height=\"4\" rx=\"2\" fill=\"#14140f\" opacity=\".35\"/><g class=\"nk-tap\"><path d=\"M104 44l0 14 4-4 3 7 3-1.5-3-7 6 0z\" fill=\"#f3f1ea\" stroke=\"#14140f\" stroke-width=\"1\"/></g></svg><div><b><i>1</i>Comenta</b><span>Toca un punto y escribe.</span></div></li>' +
      '<li><svg viewBox=\"0 0 160 100\" aria-hidden=\"true\"><rect x=\"14\" y=\"12\" width=\"70\" height=\"6\" rx=\"3\" fill=\"#3a3a30\"/><rect x=\"14\" y=\"26\" width=\"132\" height=\"56\" rx=\"6\" fill=\"#2a2a22\"/><path d=\"M14 74l34-24 26 18 22-14 50 26v4H14z\" fill=\"#3a3a30\"/><rect class=\"nk-draw\" x=\"36\" y=\"32\" width=\"92\" height=\"44\" rx=\"6\" fill=\"#5f86c4\" fill-opacity=\".18\" stroke=\"#5f86c4\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"32\" r=\"3.5\" fill=\"#5f86c4\"/><circle cx=\"128\" cy=\"76\" r=\"3.5\" fill=\"#5f86c4\"/><g class=\"nk-tap\"><path d=\"M124 70l0 14 4-4 3 7 3-1.5-3-7 6 0z\" fill=\"#f3f1ea\" stroke=\"#14140f\" stroke-width=\"1\"/></g></svg><div><b><i>2</i>Marca una zona</b><span>Arrastra para rodearla.</span></div></li>' +
      '<li><svg viewBox=\"0 0 160 100\" aria-hidden=\"true\"><text x=\"14\" y=\"34\" font-size=\"13\" fill=\"#8c8a7e\" text-decoration=\"line-through\" font-family=\"Georgia,serif\">Título antiguo</text><path d=\"M80 42v10\" stroke=\"#5f86c4\" stroke-width=\"2\" stroke-linecap=\"round\"/><path d=\"M75 48l5 6 5-6\" fill=\"none\" stroke=\"#5f86c4\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"10\" y=\"60\" width=\"140\" height=\"26\" rx=\"8\" fill=\"#f3f1ea\"/><text x=\"20\" y=\"78\" font-size=\"13\" fill=\"#14140f\" font-family=\"Georgia,serif\">Título nuevo</text><rect class=\"nk-ring\" x=\"104\" y=\"66\" width=\"2\" height=\"14\" fill=\"#5f86c4\"/></svg><div><b><i>3</i>Cambia un texto</b><span>Pulsa el texto y pon el nuevo.</span></div></li>' +
      '<li><svg viewBox=\"0 0 160 100\" aria-hidden=\"true\"><rect x=\"14\" y=\"12\" width=\"100\" height=\"6\" rx=\"3\" fill=\"#3a3a30\"/><rect x=\"14\" y=\"26\" width=\"80\" height=\"6\" rx=\"3\" fill=\"#3a3a30\"/><rect x=\"148\" y=\"8\" width=\"5\" height=\"60\" rx=\"2.5\" fill=\"#5f86c4\"/><rect x=\"96\" y=\"38\" width=\"44\" height=\"16\" rx=\"8\" fill=\"#f3f1ea\"/><rect x=\"102\" y=\"44\" width=\"32\" height=\"4\" rx=\"2\" fill=\"#14140f\" opacity=\".6\"/><rect x=\"10\" y=\"72\" width=\"82\" height=\"20\" rx=\"10\" fill=\"#0c0c08\" stroke=\"#3a3a30\"/><circle cx=\"21\" cy=\"82\" r=\"3\" fill=\"#5f86c4\"/><text x=\"29\" y=\"85.5\" font-size=\"9.5\" font-weight=\"700\" fill=\"#f3f1ea\" font-family=\"system-ui,sans-serif\">6d 23h 59m</text></svg><div><b><i>4</i>Tu tiempo y tus cambios</b><span>Contador abajo a la izquierda. «Mis cambios» en la tira.</span></div></li>' +
      '</ul>' +
      '<button type="button">Ver la web</button>' +
      '</div>';
    var button = el.querySelector('button');
    button.addEventListener('click', function () {
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
      el.classList.add('is-out');
      // Tras la bienvenida, recorrido guiado sobre la web real (paso 1, paso 2…).
      if (window.__nkStartTour) window.__nkStartTour();
      else window.__nkTourPending = true;
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
