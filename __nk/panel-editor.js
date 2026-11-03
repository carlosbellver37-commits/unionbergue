/* Nukleo Preview — bandeja del equipo: ver avisos, responder, marcar hecho. */
(function () {
  'use strict';
  var panel = window.__nkPanel;
  if (!panel || !panel.isAdmin || !panel.core || window.__nkEditor) return;
  window.__nkEditor = true;

  var c = panel.core;
  var h = c.h;
  var FILTERS = [['pending', 'Pendientes'], ['unanswered', 'Sin responder'], ['done', 'Hechos'], ['all', 'Todos']];
  var filter = 'pending';
  var replyOpen = null;
  var drafts = {};

  var style = document.createElement('style');
  style.textContent =
    '.inbox{width:min(430px,calc(100vw - 84px))}' +
    '.tabs{display:flex;gap:6px;padding:0 14px 10px;flex-wrap:wrap}' +
    '.tab{padding:6px 12px;border-radius:999px;background:rgba(20,20,15,.07);font-size:13px;font-weight:600}' +
    '.tab[aria-pressed="true"]{background:#14140f;color:#fff}' +
    '.ecard{display:grid;gap:8px;padding:12px;border-radius:16px;background:#fff;border:1px solid rgba(20,20,15,.1)}' +
    '.ecard.is-done{opacity:.6}.ecard.is-new{border-color:#b3321f;box-shadow:0 0 0 3px rgba(179,50,31,.12)}' +
    '.eacts{display:flex;flex-wrap:wrap;gap:6px}.eacts button{padding:7px 12px;border-radius:999px;background:rgba(20,20,15,.07);font-size:13px;font-weight:600}' +
    '.eacts button:hover{background:rgba(20,20,15,.14)}.eacts .ok{background:#14140f;color:#fff}.eacts .danger{color:#b3321f}' +
    '.eacts .danger.sure{background:#b3321f;color:#fff}' +
    '.ebox{display:grid;gap:6px}.ebox textarea{min-height:64px}.ebox .row{justify-content:flex-end}' +
    '.ebox .go{padding:8px 14px;border-radius:999px;background:var(--a,#14140f);color:#fff;font-weight:600}.ebox .go[disabled]{opacity:.5}';
  c.shadow.appendChild(style);

  function summary(notes) {
    var pending = notes.filter(function (n) { return n.status !== 'done'; });
    var unanswered = pending.filter(isUnanswered);
    return { pending: pending.length, unanswered: unanswered.length, done: notes.length - pending.length, all: notes.length };
  }

  // "Sin responder": avisos del cliente abiertos cuya última palabra no es del equipo.
  function isUnanswered(note) {
    if (note.status === 'done' || note.author !== 'cliente') return false;
    var replies = note.replies || [];
    return !replies.length || replies[replies.length - 1].by === 'cliente';
  }

  function matches(note) {
    if (filter === 'pending') return note.status !== 'done';
    if (filter === 'unanswered') return isUnanswered(note);
    if (filter === 'done') return note.status === 'done';
    return true;
  }

  function deleteButton(note) {
    var button = h('button', { type: 'button', class: 'danger' }, 'Borrar');
    button.addEventListener('click', function () {
      if (button.classList.contains('sure')) { c.removeNote(note); return; }
      button.classList.add('sure'); button.textContent = '¿Seguro? Borrar';
      setTimeout(function () { button.classList.remove('sure'); button.textContent = 'Borrar'; }, 4000);
    });
    return button;
  }

  function replyForm(note) {
    var area = h('textarea', { maxlength: '1000', 'aria-label': 'Responder al cliente', placeholder: 'Escribe tu respuesta al cliente…' });
    area.value = drafts[note.id] || '';
    area.addEventListener('input', function () { drafts[note.id] = area.value; });
    var error = h('p', { class: 'err', role: 'alert' });
    var send = h('button', { type: 'button', class: 'go' }, 'Enviar respuesta');
    send.addEventListener('click', function () {
      var value = area.value.trim();
      if (!value) { error.textContent = 'Escribe algo antes de enviar.'; return; }
      send.disabled = true; error.textContent = '';
      c.api('/__nk/notes/reply', 'POST', { id: note.id, message: value }).then(function () {
        delete drafts[note.id]; replyOpen = null; c.say('Respuesta enviada ✓'); return c.reload();
      }).then(function () { render(host); })
        .catch(function (err) { send.disabled = false; error.textContent = err.message; });
    });
    setTimeout(function () { area.focus(); }, 30);
    return h('div', { class: 'ebox' }, [area, error, h('div', { class: 'row' }, [send])]);
  }

  function card(note, number) {
    var fresh = note.author === 'cliente' && !note.ackAt;
    var needsReply = isUnanswered(note);
    var acts = h('div', { class: 'eacts' }, [
      h('button', { type: 'button', onclick: function () { c.goTo(note); } }, 'Ver en la web'),
      h('button', { type: 'button', onclick: function () { replyOpen = replyOpen === note.id ? null : note.id; render(host); } }, replyOpen === note.id ? 'Cerrar respuesta' : 'Responder'),
      h('button', { type: 'button', class: 'ok', onclick: function () { c.updateNote(note, { status: note.status === 'done' ? 'open' : 'done' }); } }, note.status === 'done' ? 'Reabrir' : 'Marcar hecho'),
      deleteButton(note)
    ]);
    return h('article', { class: 'ecard' + (note.status === 'done' ? ' is-done' : '') + (fresh ? ' is-new' : '') }, [
      h('div', { class: 'row' }, [
        h('span', { class: 'n', style: 'background:' + c.colorOf(note) }, String(number)),
        h('span', { class: 'chip' }, c.TYPES[note.type].label), c.statusChip(note),
        needsReply ? h('span', { class: 'chip new' }, 'Sin responder') : null,
        h('span', { class: 'when' }, c.ago(note.createdAt))
      ]),
      c.noteBody(note), c.threadOf(note), acts,
      replyOpen === note.id ? replyForm(note) : null
    ]);
  }

  var host = null;
  function render(container) {
    host = container;
    var notes = c.notes();
    var counts = summary(notes);
    container.textContent = '';
    container.classList.add('inbox');
    container.appendChild(h('header', {}, ['Bandeja de avisos', h('button', { type: 'button', onclick: c.close }, 'Cerrar')]));
    container.appendChild(h('p', { class: 'sub' }, counts.pending + ' pendientes · ' + counts.unanswered + ' sin responder · ' + counts.done + ' hechos'));
    container.appendChild(h('div', { class: 'tabs', role: 'tablist' }, FILTERS.map(function (f) {
      return h('button', { type: 'button', class: 'tab', role: 'tab', 'aria-pressed': String(filter === f[0]), onclick: function () { filter = f[0]; render(container); } }, f[1] + ' (' + counts[f[0]] + ')');
    })));
    var list = h('div', { class: 'list' });
    var shown = 0;
    notes.forEach(function (note, index) {
      if (!matches(note)) return;
      shown += 1;
      list.appendChild(card(note, index + 1));
    });
    if (!shown) list.appendChild(h('p', { class: 'empty' }, filter === 'all' ? 'Todavía no hay avisos del cliente.' : 'No hay avisos en esta lista.'));
    container.appendChild(list);
  }

  panel.setInbox(render);
})();
