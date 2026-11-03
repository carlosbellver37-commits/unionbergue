// Aviso al equipo por WhatsApp cuando el cliente crea un aviso o responde.
// No hace nada hasta que se configuran las variables del proveedor en Vercel:
//   NK_WA_PROVIDER = callmebot | meta
//   callmebot: NK_WA_TARGETS = "34600111222:APIKEY,34600333444:APIKEY"
//   meta:      NK_WA_TOKEN, NK_WA_PHONE_ID, NK_WA_TO = "34600111222,34600333444"
//              y, si hace falta fuera de la ventana de 24 h, NK_WA_TEMPLATE (plantilla con 1 variable)
import { waitUntil } from '@vercel/functions';
import { themeFor } from './nk-pages.js';

const MAX_TEXT = 280;
const GRAPH = 'https://graph.facebook.com/v21.0';
const env = (key) => process.env[key] || '';
const list = (value) => value.split(',').map((part) => part.trim()).filter(Boolean);
const clip = (value) => (value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT - 1)}…` : value);

function describe(note, origin, project, event) {
  const site = themeFor(project).label;
  const typeLabel = { cambiar: 'Cambiar', quitar: 'Quitar', gusta: 'Me gusta', pregunta: 'Pregunta', texto: 'Texto' }[note.type] || note.type;
  const last = (note.replies || []).at(-1);
  const body = event === 'reply' && last ? `Respuesta: ${last.message}` : note.type === 'texto' ? `"${note.before}" → "${note.after}"` : note.message;
  return `🔔 ${site}\n${event === 'reply' ? 'Respuesta del cliente' : `Nuevo aviso (${typeLabel})`}\n${clip(body)}\n${origin}`;
}

async function sendCallMeBot(message) {
  const targets = list(env('NK_WA_TARGETS')).map((entry) => entry.split(':'));
  await Promise.all(targets.map(async ([phone, apikey]) => {
    if (!phone || !apikey) return;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CallMeBot ${res.status}`);
  }));
}

async function sendMeta(message) {
  const template = env('NK_WA_TEMPLATE');
  await Promise.all(list(env('NK_WA_TO')).map(async (to) => {
    const payload = template
      ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: template, language: { code: 'es' }, components: [{ type: 'body', parameters: [{ type: 'text', text: message.replace(/\n/g, ' · ') }] }] } }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } };
    const res = await fetch(`${GRAPH}/${env('NK_WA_PHONE_ID')}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env('NK_WA_TOKEN')}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`WhatsApp Cloud API ${res.status}`);
  }));
}

// Se envía en segundo plano: un fallo del aviso nunca impide guardar el cambio del cliente.
export function notifyTeam(note, request, project, event = 'note') {
  const provider = env('NK_WA_PROVIDER');
  if (!provider) return;
  const message = describe(note, new URL(request.url).origin, project, event);
  const job = (provider === 'meta' ? sendMeta(message) : provider === 'callmebot' ? sendCallMeBot(message) : Promise.resolve())
    .catch((error) => console.error('[nukleo-preview] WhatsApp:', error.message));
  waitUntil(job);
}
