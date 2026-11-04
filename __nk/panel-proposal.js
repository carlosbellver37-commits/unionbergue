/* Nukleo Preview — «Ver propuesta»: precio, qué incluye, plazo de cambios, SEO/GEO y branding. */
(function () {
  'use strict';
  var status = window.__nkStatus;
  if (!status || window.__nkOpenProposal) return;

  var FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,400;1,9..144,500&family=Instrument+Sans:wght@400;500;600;700&display=swap';
  var IMG_BASE = '/__nk/proposal/';
  var cache = null;
  var current = null;

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
  var list = function (cls, items) { return h('ul', { class: cls }, items); };
  var pad = function (n) { return String(n).padStart(2, '0'); };

  function loadFonts() {
    if (document.querySelector('link[data-nk-fonts]')) return;
    var link = h('link', { rel: 'stylesheet', href: FONTS, 'data-nk-fonts': '' });
    document.head.appendChild(link);
  }

  function fetchText(url, type) {
    return fetch(url, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return type === 'json' ? res.json() : res.text();
    });
  }

  function load() {
    if (cache) return Promise.resolve(cache);
    var v = encodeURIComponent(status.v || '');
    return Promise.all([fetchText('/__nk/proposal.css?v=' + v), fetchText('/__nk/proposal-data.json?v=' + v, 'json')])
      .then(function (r) { cache = { css: r[0], data: r[1] }; return cache; });
  }

  function themeCss() {
    var t = status.theme || {};
    var safe = function (value, fallback) { return /^#[0-9a-f]{3,8}$/i.test(value || '') ? value : fallback; };
    return ':host{all:initial;--page:' + safe(t.page, '#e9e6d9') + ';--panel:' + safe(t.panel, '#efeee4') + ';--ink:' + safe(t.ink, '#33200f') +
      ';--soft:' + safe(t.soft, '#6b5340') + ';--accent:' + safe(t.accent, '#964b36') + ';--tint:' + safe(t.tint, '#d9b9a3') + '}';
  }

  // Cada web puede ajustar su propuesta (precio, dominio…) sobre la base común.
  function dataFor(key) {
    var all = cache.data;
    var override = all.variants && all.variants[status.project] && all.variants[status.project][key];
    return override ? Object.assign({}, all[key], override) : all[key];
  }

  function reveal(el) { el.classList.add('rv'); return el; }

  function lockup() {
    return h('div', { class: 'lockup', 'aria-hidden': 'true' }, [
      h('span', { class: 'bergue' }, 'Bergue'),
      status.sub ? h('span', { class: 'sub' }, status.sub) : null,
      h('span', { class: 'x' }, '×'),
      h('span', { class: 'nukleo' }, ['Nukleo', h('i')])
    ]);
  }

  function hero(d) {
    return reveal(h('section', { class: 'hero' }, [
      h('div', { class: 'art' }, lockup()),
      h('div', { class: 'copy' }, [
        h('span', { class: 'pill' }, d.tag),
        h('h1', {}, d.title),
        h('p', { class: 'lead' }, d.lead)
      ])
    ]));
  }

  function priceNumbers(p) {
    if (p.free) {
      return [
        h('div', { class: 'nums' }, h('div', { class: 'big word' }, p.free.title)),
        h('p', { class: 'free-text' }, p.free.text),
        h('div', { class: 'nums' }, [
          h('span', { class: 'plus' }, [h('b', {}, '+'), p.free.monthly + ' €']),
          h('span', { class: 'unit' }, p.free.monthlyLabel)
        ]),
        h('span', { class: 'iva' }, p.free.split)
      ];
    }
    return [
      h('div', { class: 'nums' }, [
        h('div', { class: 'big' }, [String(p.initial), h('small', {}, '€')]),
        h('span', { class: 'unit' }, p.initialLabel)
      ]),
      h('div', { class: 'nums' }, [
        h('span', { class: 'plus' }, [h('b', {}, '+'), p.monthly + ' €']),
        h('span', { class: 'unit' }, p.monthlyLabel)
      ]),
      h('span', { class: 'iva' }, p.note)
    ];
  }

  function priceCard(p) {
    return reveal(h('section', { class: 'price', 'aria-label': p.label }, [
      h('div', {}, [h('p', { class: 'lab' }, p.label)].concat(priceNumbers(p))),
      h('div', { class: 'covers' }, [
        h('h3', {}, p.coversTitle),
        list('', p.covers.map(function (c) { return h('li', {}, [h('b', {}, c[0]), h('span', {}, c[1])]); }))
      ])
    ]));
  }

  function paymentBlock(p) {
    return reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, [h('h2', {}, p.title), h('p', { class: 'note' }, p.intro)]),
      list('pay', p.steps.map(function (s) {
        return h('li', {}, [
          h('span', { class: 'pay-tag' }, s.tag),
          h('div', { class: 'pay-amt' }, [s.amount, s.sub ? h('small', {}, s.sub) : null]),
          h('b', {}, s.title),
          h('span', { class: 'pay-text' }, s.text)
        ]);
      })),
      h('p', { class: 'note' }, p.note)
    ]));
  }

  function includes(d) {
    return reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.includesTitle)),
      list('list', d.includes.map(function (i) { return h('li', {}, [h('b', {}, i[0]), h('span', {}, i[1])]); }))
    ]));
  }

  function countdownText() {
    if (!status.expires) return 'Tu plazo empieza cuando entres por primera vez';
    var left = Math.max(0, Math.floor((status.expires - Date.now()) / 1000));
    return 'Te quedan ' + Math.floor(left / 86400) + 'd ' + pad(Math.floor((left % 86400) / 3600)) + 'h ' + pad(Math.floor((left % 3600) / 60)) + 'm';
  }

  function daysBlock(c, ticker) {
    var count = h('span', {}, countdownText());
    ticker.push(function () { count.textContent = countdownText(); });
    return reveal(h('section', { class: 'days' }, [
      h('div', {}, [
        h('div', { class: 'seven', 'aria-hidden': 'true' }, c.number),
        h('h2', {}, c.number + ' ' + c.title),
        h('p', {}, c.text),
        h('p', { class: 'after' }, c.after),
        h('div', { class: 'count' }, [h('i'), count])
      ]),
      list('line', c.steps.map(function (s) { return h('li', {}, [h('b', {}, s[0]), h('span', {}, s[1])]); }))
    ]));
  }

  function searchBlock(d) {
    function box(b, alt) {
      return h('div', { class: 'sbox' + (alt ? ' alt' : '') }, [
        h('div', { class: 'name', 'aria-hidden': 'true' }, b.name),
        h('p', { class: 'sub' }, b.name + ' · ' + b.sub),
        list('', b.items.map(function (i) { return h('li', {}, i); }))
      ]);
    }
    return reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.searchTitle)),
      h('div', { class: 'search' }, [box(d.seo, false), box(d.geo, true)]),
      h('p', { class: 'note' }, d.searchNote)
    ]));
  }

  function nextBlock(d) {
    return reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.nextTitle)),
      list('steps', d.next.map(function (s) { return h('li', {}, [h('b', {}, s[0]), h('span', {}, s[1])]); })),
      h('p', { class: 'foot' }, (d.price.footnote ? d.price.footnote + ' ' : '') + d.days_note)
    ]));
  }

  function proposalView(d, ticker) {
    d = Object.assign({}, d, { days_note: 'Cualquier duda, escríbenos y lo vemos.' });
    return [hero(d), priceCard(d.price)].concat(d.payment ? [paymentBlock(d.payment)] : [], [includes(d)], d.changes ? [daysBlock(d.changes, ticker)] : [], [searchBlock(d), nextBlock(d)]);
  }

  function brandingView(d, zoom) {
    var bag = h('img', { src: IMG_BASE + 'recorte-bolsa.webp', alt: '', width: '600', height: '800' });
    var bhero = reveal(h('section', { class: 'bhero' }, [
      h('div', {}, [h('span', { class: 'pill' }, d.tag), h('h1', {}, d.title), h('p', { class: 'lead' }, d.lead)]),
      bag
    ]));
    var phrases = reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.phrasesTitle)),
      list('phrases', d.phrases.map(function (p) { return h('li', {}, [h('small', {}, p[0]), h('span', {}, p[1])]); }))
    ]));
    var bands = reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.paletteTitle)),
      h('div', { class: 'bands' }, d.palette.map(function (c) {
        var light = c[3] === 'light';
        return h('div', { class: 'band', style: 'background:' + c[1] + ';color:' + (light ? '#fbf3ea' : '#33200f') }, [
          h('small', {}, c[1]), h('h3', {}, c[0]), h('p', {}, c[2])
        ]);
      }))
    ]));
    var types = reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.typeTitle)),
      list('types', d.type.map(function (t) {
        return h('li', {}, [h('h3', {}, [t[0], h('span', {}, t[1])]), h('div', { class: 't-' + t[3] }, t[2])]);
      }))
    ]));
    var gallery = reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.packTitle)),
      h('div', { class: 'gallery' }, d.pack.map(function (p) {
        var src = IMG_BASE + p[0] + '.webp';
        var img = h('img', { src: src, alt: p[1], loading: 'lazy', decoding: 'async', onclick: function () { zoom(src, p[1]); } });
        return h('figure', {}, [img, h('figcaption', {}, [h('b', {}, p[1]), h('span', {}, p[2])])]);
      }))
    ]));
    var c = d.contest;
    var contest = reveal(h('section', { class: 'contest' }, [
      h('div', {}, [h('p', { class: 'eyebrow' }, 'Una idea para el barrio'), h('h2', {}, c.title), h('p', { class: 'lead' }, c.text), h('p', { class: 'note' }, c.note)]),
      list('csteps', c.steps.map(function (s) { return h('li', {}, [h('b', {}, s[0]), h('span', {}, s[1])]); }))
    ]));
    function col(b, withBold) {
      return h('div', {}, [h('h3', {}, b.title), list('', b.items.map(function (i) { return h('li', {}, [h('b', {}, i[0]), ' ' + i[1]]); }))]);
    }
    var decide = reveal(h('section', {}, [
      h('div', { class: 'sec-head' }, h('h2', {}, d.nextTitle)),
      h('div', { class: 'two' }, [col(d.choose), col(d.after)])
    ]));
    return [bhero, phrases, bands, types, gallery, contest, decide];
  }

  function observe(root, scroller) {
    var items = [].slice.call(root.querySelectorAll('.rv'));
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return null; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { root: scroller, threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
    return io;
  }

  function open(tab) {
    if (current) return;
    loadFonts();
    var previousFocus = document.activeElement;
    var host = h('div', { 'data-nk-proposal': '' });
    var shadow = host.attachShadow({ mode: 'open' });
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    var ov = h('div', { class: 'ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Propuesta' });
    var tickers = [];
    var timer = null;
    var io = null;
    var active = tab === 'branding' ? 'branding' : 'propuesta';

    var zoomImg = h('img', { alt: '' });
    var zoomEl = h('div', { class: 'zoom', onclick: function () { zoomEl.classList.remove('on'); } }, zoomImg);
    function zoom(src, alt) { zoomImg.src = src; zoomImg.alt = alt; zoomEl.classList.add('on'); }

    function close() {
      if (!current) return;
      clearInterval(timer);
      if (io) io.disconnect();
      document.removeEventListener('keydown', onKey, true);
      document.documentElement.style.overflow = prevOverflow;
      ov.classList.remove('on');
      var gone = host;
      current = null;
      setTimeout(function () { gone.remove(); }, 300);
      if (previousFocus && previousFocus.focus) { try { previousFocus.focus(); } catch (e) { /* sin foco */ } }
    }
    function onKey(event) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (zoomEl.classList.contains('on')) zoomEl.classList.remove('on'); else close();
    }
    document.addEventListener('keydown', onKey, true);

    var main = h('main');
    var tabs = {};
    function tabBtn(key, label) {
      var b = h('button', { type: 'button', class: 'tab', role: 'tab', onclick: function () { show(key); } }, label);
      tabs[key] = b;
      return b;
    }
    var closeBtn = h('button', { type: 'button', class: 'close', onclick: close }, 'Cerrar');
    var bar = h('header', { class: 'bar' }, [
      h('div', { class: 'mini' }, [h('b', {}, 'Bergue'), h('span', {}, '×'), h('strong', {}, ['Nukleo', h('i')])]),
      h('div', { class: 'tabs', role: 'tablist' }, [tabBtn('propuesta', 'Propuesta'), tabBtn('branding', 'Branding')]),
      closeBtn
    ]);
    ov.appendChild(bar); ov.appendChild(main); ov.appendChild(zoomEl);

    var style = document.createElement('style');
    shadow.appendChild(style);
    shadow.appendChild(ov);
    document.documentElement.appendChild(host);
    current = host;

    function show(key, data) {
      active = key;
      Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute('aria-selected', String(k === key)); });
      if (io) io.disconnect();
      tickers = [];
      main.textContent = '';
      var d = dataFor(key);
      var nodes = key === 'branding' ? brandingView(d, zoom) : proposalView(d, tickers);
      nodes.forEach(function (n) { main.appendChild(n); });
      ov.scrollTop = 0;
      io = observe(main, ov);
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        [].forEach.call(main.querySelectorAll('.rv'), function (el) { el.classList.add('in'); });
      }
    }

    requestAnimationFrame(function () { ov.classList.add('on'); });
    closeBtn.focus();

    load().then(function (loaded) {
      if (current !== host) return;
      style.textContent = themeCss() + loaded.css;
      show(active);
      timer = setInterval(function () { tickers.forEach(function (fn) { fn(); }); }, 30000);
    }).catch(function () {
      if (current !== host) return;
      style.textContent = themeCss() + '.ov{position:fixed;inset:0;background:var(--page);font:500 16px system-ui,sans-serif;color:var(--ink);opacity:1}.err{margin:30vh auto 0;width:min(420px,90%);padding:24px;border-radius:20px;background:#fff;text-align:center}button{font:inherit;padding:9px 16px;border-radius:999px;border:1px solid #0003;background:#fff;cursor:pointer}';
      main.textContent = '';
      main.appendChild(h('div', { class: 'err' }, [h('p', {}, 'No hemos podido cargar la propuesta. Inténtalo de nuevo en unos segundos.')]));
    });
  }

  window.__nkOpenProposal = open;
})();
