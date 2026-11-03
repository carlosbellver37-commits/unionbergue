// Notas del cliente: se guardan una a una en el Blob privado del proyecto.
import { get, list, put, del } from '@vercel/blob';

const MAX_BODY = 8 * 1024;
const MAX_NOTES = 300;
const KINDS = new Set(['pin', 'zone', 'text']);
const TYPES = new Set(['cambiar', 'quitar', 'gusta', 'pregunta', 'texto']);
const STATUSES = new Set(['open', 'done']);
const ID_PATTERN = /^[a-z0-9-]{8,40}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
const num = (value, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};

const prefix = (project) => `notes/${project}/`;
const pathOf = (project, id) => `${prefix(project)}${id}.json`;

async function readNote(pathname) {
  const found = await get(pathname, { access: 'private', useCache: false });
  if (!found || found.statusCode === 404) return null;
  return JSON.parse(await new Response(found.stream).text());
}

async function readBody(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  const raw = await request.text();
  if (raw.length > MAX_BODY) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Solo se guardan campos conocidos y acotados; nada del cliente se usa tal cual.
function cleanAnchor(anchor = {}) {
  return {
    sel: text(anchor.sel, 300),
    fx: num(anchor.fx, -1, 2),
    fy: num(anchor.fy, -1, 2),
    fw: num(anchor.fw, 0, 3),
    fh: num(anchor.fh, 0, 3),
    dx: num(anchor.dx, 0, 1),
    dy: num(anchor.dy, 0, 100000),
  };
}

function cleanNote(input, role) {
  if (!input || !KINDS.has(input.kind) || !TYPES.has(input.type)) return null;
  const note = {
    kind: input.kind,
    type: input.type,
    message: text(input.message, 1000),
    before: text(input.before, 1000),
    after: text(input.after, 1000),
    anchor: cleanAnchor(input.anchor),
    viewport: { w: num(input.viewport && input.viewport.w, 0, 10000), h: num(input.viewport && input.viewport.h, 0, 10000) },
    page: text(input.page, 200),
    author: role === 'admin' ? 'equipo' : 'cliente',
    status: 'open',
  };
  if (!note.message && !note.after) return null;
  return note;
}

async function listNotes(project) {
  const { blobs } = await list({ prefix: prefix(project), limit: MAX_NOTES });
  const notes = await Promise.all(blobs.map((blob) => readNote(blob.pathname).catch(() => null)));
  return notes.filter(Boolean).sort((a, b) => a.createdAt - b.createdAt);
}

async function createNote(request, session, project) {
  const note = cleanNote(await readBody(request), session.role);
  if (!note) return json({ error: 'nota no válida' }, 400);
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const saved = { ...note, id, createdAt: Date.now() };
  await put(pathOf(project, id), JSON.stringify(saved), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return json({ note: saved }, 201);
}

const ownerOf = (role) => (role === 'admin' ? 'equipo' : 'cliente');

async function saveNote(pathname, note) {
  await put(pathname, JSON.stringify(note), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return note;
}

// El equipo cambia el estado; el autor edita su propio aviso mientras no esté hecho.
async function updateNote(request, session, project) {
  const body = await readBody(request);
  if (!body || !ID_PATTERN.test(body.id || '')) return json({ error: 'petición no válida' }, 400);
  const pathname = pathOf(project, body.id);
  const note = await readNote(pathname);
  if (!note) return json({ error: 'El aviso ya no existe' }, 404);

  if (body.status !== undefined) {
    if (session.role !== 'admin' || !STATUSES.has(body.status)) return json({ error: 'solo el equipo' }, 403);
    return json({ note: await saveNote(pathname, { ...note, status: body.status }) });
  }

  if (note.author !== ownerOf(session.role)) return json({ error: 'No puedes editar este aviso' }, 403);
  if (note.status === 'done') return json({ error: 'Este aviso ya está hecho' }, 409);
  const patch = {};
  if (typeof body.message === 'string' && note.kind !== 'text') patch.message = text(body.message, 1000);
  if (typeof body.after === 'string' && note.kind === 'text') patch.after = text(body.after, 1000);
  if (body.type !== undefined && TYPES.has(body.type) && note.kind !== 'text') patch.type = body.type;
  if (body.anchor && note.kind !== 'text') patch.anchor = cleanAnchor(body.anchor);
  if (!Object.keys(patch).length) return json({ error: 'nada que cambiar' }, 400);
  return json({ note: await saveNote(pathname, { ...note, ...patch, editedAt: Date.now() }) });
}

// El equipo confirma que ha recibido los avisos; el cliente lo ve como "Recibido".
async function ackNotes(request, session, project) {
  if (session.role !== 'admin') return json({ error: 'solo el equipo' }, 403);
  const body = await readBody(request);
  const ids = Array.isArray(body && body.ids) ? body.ids.filter((id) => ID_PATTERN.test(id)).slice(0, MAX_NOTES) : [];
  const now = Date.now();
  const updated = await Promise.all(ids.map(async (id) => {
    const pathname = pathOf(project, id);
    const note = await readNote(pathname).catch(() => null);
    if (!note || note.ackAt) return null;
    return saveNote(pathname, { ...note, ackAt: now });
  }));
  return json({ acked: updated.filter(Boolean).length });
}

async function deleteNote(request, session, project) {
  const body = await readBody(request);
  if (!body || !ID_PATTERN.test(body.id || '')) return json({ error: 'petición no válida' }, 400);
  const pathname = pathOf(project, body.id);
  const note = await readNote(pathname);
  if (!note) return json({ ok: true });
  const mine = note.author === ownerOf(session.role);
  if (session.role !== 'admin' && !mine) return json({ error: 'no permitido' }, 403);
  await del(pathname);
  return json({ ok: true });
}

// Devuelve la respuesta de la ruta de notas, o null si la ruta no es de notas.
export async function handleNotes(request, url, session, project) {
  if (!url.pathname.startsWith('/__nk/notes')) return null;
  try {
    if (url.pathname === '/__nk/notes' && request.method === 'GET') return json({ notes: await listNotes(project) });
    if (url.pathname === '/__nk/notes' && request.method === 'POST') return await createNote(request, session, project);
    if (url.pathname === '/__nk/notes/update' && request.method === 'POST') return await updateNote(request, session, project);
    if (url.pathname === '/__nk/notes/ack' && request.method === 'POST') return await ackNotes(request, session, project);
    if (url.pathname === '/__nk/notes/delete' && request.method === 'POST') return await deleteNote(request, session, project);
  } catch (error) {
    console.error('[nukleo-preview] notas:', error.message);
    return json({ error: 'No se pudo guardar. Inténtalo de nuevo.' }, 503);
  }
  return json({ error: 'ruta no encontrada' }, 404);
}
