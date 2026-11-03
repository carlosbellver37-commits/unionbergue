// Nukleo Preview — acceso por contraseña y plazo de 7 días compartido.
// Variables de entorno (Vercel): NK_SECRET, NK_CLIENT_PASSWORD, NK_ADMIN_PASSWORD,
// NK_PROJECT, NK_EDGE_CONFIG_ID, NK_API_TOKEN.
import { next } from '@vercel/functions';
import { gatePage, expiredPage } from './nk-pages.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7;
const COOKIE = 'nk_access';
const ADMIN_DAYS = 30;
const PUBLIC_PATHS = new Set(['/__nk/preview.js']);
const API = 'https://api.vercel.com/v1/edge-config';

const enc = new TextEncoder();
const env = (key) => process.env[key] || '';

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env('NK_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

async function digest(text) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i += 1) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

// Cookie firmada: role.start.expires.firma
async function signSession(role, start, expires) {
  const body = `${role}.${start}.${expires}`;
  return `${body}.${await hmac(body)}`;
}

async function readSession(request) {
  const raw = (request.headers.get('cookie') || '')
    .split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [role, start, expires, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!sig || !(await safeEqual(sig, await hmac(`${role}.${start}.${expires}`)))) return null;
  if (Number(expires) <= Date.now()) return null;
  return { role, start: Number(start) || 0, expires: Number(expires) };
}

function sessionCookie(value, expires) {
  const maxAge = Math.max(0, Math.floor((expires - Date.now()) / 1000));
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

const html = (body, status = 200, headers = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// ---- Reloj compartido en Edge Config (lectura consistente por la API de gestión) ----
const itemKey = () => `${env('NK_PROJECT')}_start`;
const apiHeaders = () => ({ authorization: `Bearer ${env('NK_API_TOKEN')}`, 'content-type': 'application/json' });

async function readStart() {
  const res = await fetch(`${API}/${env('NK_EDGE_CONFIG_ID')}/item/${itemKey()}`, { headers: apiHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Edge Config lectura ${res.status}`);
  const value = Number(await res.json());
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function writeStart(value) {
  const res = await fetch(`${API}/${env('NK_EDGE_CONFIG_ID')}/items`, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify({ items: [{ operation: 'upsert', key: itemKey(), value }] }),
  });
  if (!res.ok) throw new Error(`Edge Config escritura ${res.status}`);
}

async function ensureStart() {
  const existing = await readStart();
  if (existing) return existing;
  const now = Date.now();
  await writeStart(now);
  return now;
}

// ---- Acciones ----
async function login(request) {
  const form = await request.formData().catch(() => null);
  const password = String((form && form.get('password')) || '');
  const failure = async (message) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return html(gatePage(message), 401);
  };
  if (!password) return failure('Introduce la contraseña.');

  if (await safeEqual(password, env('NK_ADMIN_PASSWORD'))) {
    const expires = Date.now() + ADMIN_DAYS * DAY_MS;
    return new Response(null, {
      status: 303,
      headers: { location: '/', 'set-cookie': sessionCookie(await signSession('admin', 0, expires), expires) },
    });
  }

  if (!(await safeEqual(password, env('NK_CLIENT_PASSWORD')))) return failure('Contraseña incorrecta.');

  let start;
  try {
    start = await ensureStart();
  } catch (error) {
    console.error('[nukleo-preview]', error.message);
    return html(gatePage('No se pudo comprobar el plazo. Inténtalo de nuevo en unos minutos.'), 503);
  }
  const expires = start + TRIAL_DAYS * DAY_MS;
  if (expires <= Date.now()) return html(expiredPage(), 403);

  return new Response(null, {
    status: 303,
    headers: { location: '/', 'set-cookie': sessionCookie(await signSession('client', start, expires), expires) },
  });
}

async function status(session) {
  if (session.role === 'admin') {
    let start = null;
    try {
      start = await readStart();
    } catch (error) {
      console.error('[nukleo-preview]', error.message);
    }
    return json({ role: 'admin', days: TRIAL_DAYS, expires: start ? start + TRIAL_DAYS * DAY_MS : null });
  }
  return json({ role: 'client', days: TRIAL_DAYS, expires: session.expires });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname)) return next();

  if (url.pathname === '/__nk/login' && request.method === 'POST') return login(request);

  const session = await readSession(request);
  if (!session) {
    if (url.pathname.startsWith('/__nk/')) return json({ error: 'unauthorized' }, 401);
    return html(gatePage(''), 401);
  }

  if (url.pathname === '/__nk/status') return status(session);
  if (url.pathname === '/__nk/logout') {
    return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': sessionCookie('', Date.now()) } });
  }
  return next();
}
