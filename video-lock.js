// Los vídeos de la web son decoración fija: no se pueden pausar, tocar, minimizar
// (imagen en imagen), ampliar ni descargar. Siempre en bucle y en silencio.
(function () {
  'use strict';
  var STYLE_ID = 'nk-video-lock';
  var MEDIA_KEYS = ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      'video{pointer-events:none!important;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}' +
      'video::-webkit-media-controls,video::-webkit-media-controls-enclosure,video::-webkit-media-controls-panel,' +
      'video::-webkit-media-controls-overlay-play-button,video::-webkit-media-controls-start-playback-button{display:none!important;-webkit-appearance:none}';
    document.head.appendChild(style);
  }

  function play(video) {
    var attempt = video.play();
    return attempt && attempt.catch ? attempt.catch(function () { /* se reintenta al interactuar */ }) : attempt;
  }

  // Algunos navegadores (p. ej. Safari en iPhone) piden el vídeo sin la cookie de sesión y la web
  // protegida responde 401. Si no carga, se descarga con la sesión y se reproduce desde memoria.
  var MAX_RESCUE_BYTES = 25 * 1024 * 1024;
  function rescue(video) {
    if (video.__nkRescued || !window.fetch || !window.URL || !URL.createObjectURL) return;
    var src = video.currentSrc || video.src;
    if (!src || src.indexOf('blob:') === 0) return;
    video.__nkRescued = true;
    fetch(src, { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.blob() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (blob) {
        if (blob.size > MAX_RESCUE_BYTES) return;
        video.removeAttribute('src');
        [].forEach.call(video.querySelectorAll('source'), function (s) { s.remove(); });
        video.src = URL.createObjectURL(blob);
        video.load();
        play(video);
      })
      .catch(function () { video.__nkRescued = false; /* se reintenta en el siguiente fallo */ });
  }

  function lock(video) {
    if (video.__nkLocked) return;
    video.__nkLocked = true;

    video.removeAttribute('controls');
    video.controls = false;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
    video.setAttribute('disableremoteplayback', '');
    video.setAttribute('x-webkit-airplay', 'deny'); // Safari: sin botón de AirPlay
    video.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback noplaybackrate');
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('tabindex', '-1');
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    if ('remote' in video && video.remote && video.remote.cancelWatchAvailability) video.remote.cancelWatchAvailability().catch(function () {});

    // Nada de menú contextual, arrastrar, imagen en imagen ni pantalla completa.
    ['contextmenu', 'dragstart', 'selectstart'].forEach(function (name) {
      video.addEventListener(name, function (event) { event.preventDefault(); });
    });
    video.addEventListener('enterpictureinpicture', function () {
      if (document.exitPictureInPicture) document.exitPictureInPicture().catch(function () {});
    });
    video.addEventListener('webkitbeginfullscreen', function () {
      if (video.webkitExitFullscreen) video.webkitExitFullscreen();
    });
    video.addEventListener('webkitpresentationmodechanged', function () {
      if (video.webkitSetPresentationMode && video.webkitPresentationMode !== 'inline') video.webkitSetPresentationMode('inline');
    });

    // Si algo lo pausa o cambia la velocidad, vuelve a su estado.
    video.addEventListener('pause', function () { if (!document.hidden && !video.ended) play(video); });
    video.addEventListener('ratechange', function () { if (video.playbackRate !== 1) video.playbackRate = 1; });
    video.addEventListener('volumechange', function () { if (!video.muted) video.muted = true; });

    video.addEventListener('error', function () { rescue(video); });
    setTimeout(function () { if (video.readyState === 0 && (video.networkState === 3 || video.error)) rescue(video); }, 3000);

    play(video);
  }

  function lockAll() {
    injectStyles();
    [].forEach.call(document.querySelectorAll('video'), lock);
  }

  // Si el navegador bloquea el arranque automático (p. ej. ahorro de energía), arranca con la primera interacción.
  function resumeOnInteraction() {
    var events = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown', 'scroll']; // iOS solo admite touchend/click como gesto
    var handler = function () {
      var paused = [].filter.call(document.querySelectorAll('video'), function (v) { return v.paused; });
      paused.forEach(play);
      if (!paused.length) events.forEach(function (name) { window.removeEventListener(name, handler); });
    };
    events.forEach(function (name) { window.addEventListener(name, handler, { passive: true }); });
  }

  function blockMediaKeys() {
    if (!('mediaSession' in navigator)) return;
    MEDIA_KEYS.forEach(function (action) {
      try { navigator.mediaSession.setActionHandler(action, function () { /* ignorado a propósito */ }); } catch (e) { /* acción no admitida */ }
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    [].forEach.call(document.querySelectorAll('video'), function (v) { if (v.paused) play(v); });
  });

  lockAll();
  resumeOnInteraction();
  blockMediaKeys();
  document.addEventListener('DOMContentLoaded', lockAll);
  new MutationObserver(lockAll).observe(document.documentElement, { childList: true, subtree: true });
})();
