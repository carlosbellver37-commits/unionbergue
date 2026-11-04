/* Nukleo Preview — modo «solo propuesta»: un único botón flotante «Ver propuesta». */
(function () {
  'use strict';
  var status = window.__nkStatus;
  if (!status || window.__nkSolo) return;
  window.__nkSolo = true;
  var theme = status.theme || {};
  var accent = theme.accent || '#964b36';
  var hover = theme.accentHover || accent;

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483644';
  var shadow = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent =
    'button{font:600 15px/1 "Instrument Sans",system-ui,sans-serif;cursor:pointer;border:0;color:#fff;background:' + accent + ';padding:15px 24px;border-radius:999px;box-shadow:0 8px 28px rgba(0,0,0,.28);transition:transform .2s,background .2s}' +
    'button:hover{background:' + hover + ';transform:translateY(-2px)}' +
    'button:focus-visible{outline:2px solid #fff;outline-offset:3px}' +
    '@media (prefers-reduced-motion:reduce){button{transition:none}}';
  var button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Ver propuesta';
  button.addEventListener('click', function () { if (window.__nkOpenProposal) window.__nkOpenProposal(); });
  shadow.appendChild(style);
  shadow.appendChild(button);
  document.documentElement.appendChild(host);
})();
