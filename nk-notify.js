// Aviso al equipo al móvil cuando el cliente crea un aviso o responde.
// No hace nada hasta que se configuran las variables del proveedor en Vercel:
//   NK_WA_PROVIDER = telegram | ntfy | callmebot | meta
//   telegram:  NK_TG_TOKEN (de @BotFather), NK_TG_CHAT_IDS = "123456,789012"
//   ntfy:      NK_NTFY_TOPIC (nombre secreto largo), opcional NK_NTFY_SERVER (por defecto https://ntfy.sh)
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

const TYPE_LABELS = { cambiar: '✏️ Cambiar', quitar: '🗑️ Quitar', gusta: '❤️ Me gusta', pregunta: '❓ Pregunta', texto: '🔤 Cambiar texto' };
const KIND_LABELS = { pin: '📍 punto', zone: '🔲 zona marcada', text: '🔤 texto' };
const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Mensaje del aviso en texto plano y en HTML (Telegram). Una línea de campo = [etiqueta, valor].
function describe(note, origin, project, event) {
  const site = themeFor(project).label;
  const device = note.viewport && note.viewport.w ? (note.viewport.w < 700 ? 'móvil' : 'ordenador') : '';
  const where = [KIND_LABELS[note.kind], device && `desde ${device}`].filter(Boolean).join(' · ');
  const when = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const link = `${origin}${note.page && note.page.startsWith('/') ? note.page : '/'}`;
  const replies = note.replies || [];
  const last = replies.at(-1);
  const isReply = event === 'reply' && last;

  const head = isReply ? `💬 ${site} · Respuesta del cliente` : `🔔 ${site} · Nuevo aviso`;
  const fields = [];
  if (isReply) {
    fields.push(['Respuesta', clip(last.message)]);
    fields.push(['Sobre su aviso', clip(note.type === 'texto' ? `"${note.before}" → "${note.after}"` : note.message || '(sin texto)')]);
    fields.push(['Tipo', TYPE_LABELS[note.type] || note.type]);
    fields.push(['Mensajes en el hilo', String(replies.length)]);
  } else {
    fields.push(['Tipo', TYPE_LABELS[note.type] || note.type]);
    if (note.type === 'texto') {
      fields.push(['Antes', clip(note.before || '(vacío)')]);
      fields.push(['Ahora', clip(note.after || '(vacío)')]);
      if (note.message) fields.push(['Nota', clip(note.message)]);
    } else {
      fields.push(['Mensaje', clip(note.message || '(sin texto)')]);
    }
    if (where) fields.push(['Dónde', where]);
    if (note.anchor && note.anchor.sel) fields.push(['Elemento', clip(note.anchor.sel)]);
  }
  fields.push(['Enlace', link], ['Hora', when]);

  const text = [head, '', ...fields.map(([label, value]) => `${label}: ${value}`), '', 'Respóndele desde la bandeja de la web (modo equipo).'].join('\n');
  const html = [`<b>${escapeHtml(head)}</b>`, '', ...fields.map(([label, value]) => `<b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`), '', '<i>Respóndele desde la bandeja de la web (modo equipo).</i>'].join('\n');
  return { text, html };
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

async function sendTelegram(_text, html) {
  const token = env('NK_TG_TOKEN');
  await Promise.all(list(env('NK_TG_CHAT_IDS')).map(async (chat) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) throw new Error(`Telegram ${res.status}`);
  }));
}

async function sendNtfy(message) {
  const server = env('NK_NTFY_SERVER') || 'https://ntfy.sh';
  const [title, ...rest] = message.split('\n');
  const res = await fetch(`${server}/${encodeURIComponent(env('NK_NTFY_TOPIC'))}`, {
    method: 'POST',
    headers: { title: `=?UTF-8?B?${Buffer.from(title).toString('base64')}?=`, priority: 'high', tags: 'bell' },
    body: rest.join('\n'),
  });
  if (!res.ok) throw new Error(`ntfy ${res.status}`);
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
  const { text, html } = describe(note, new URL(request.url).origin, project, event);
  const senders = { telegram: sendTelegram, ntfy: sendNtfy, callmebot: sendCallMeBot, meta: sendMeta };
  const job = (senders[provider] ? senders[provider](text, html) : Promise.resolve())
    .catch((error) => console.error('[nukleo-preview] aviso:', error.message));
  waitUntil(job);
}
