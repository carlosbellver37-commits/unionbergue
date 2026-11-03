// Páginas del acceso Nukleo Preview (contraseña y plazo vencido).
const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const STYLES = `
:root{--ink:#14140f;--paper:#f3f1ea;--accent:#1b3358;--line:rgba(243,241,234,.18)}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:var(--ink);color:var(--paper);font-family:'Instrument Sans',system-ui,sans-serif;font-weight:500;display:grid;place-items:center;padding:24px}
main{width:min(440px,100%)}
.mark{display:flex;align-items:center;gap:10px;font-weight:600;font-size:1.05rem;letter-spacing:-.01em;margin-bottom:56px}
.mark i{width:11px;height:11px;border-radius:50%;background:#5f86c4;box-shadow:0 0 0 5px rgba(95,134,196,.18)}
h1{font-weight:600;font-size:clamp(1.9rem,6vw,2.5rem);line-height:1.05;letter-spacing:-.025em;margin:0 0 14px}
p{margin:0 0 32px;color:rgba(243,241,234,.66);line-height:1.5}
form{display:grid;gap:12px}
input{font:inherit;color:inherit;background:transparent;border:0;border-bottom:1px solid var(--line);padding:14px 2px;outline:none;transition:border-color .2s}
input:focus-visible{border-color:#5f86c4}
button{font:inherit;font-weight:600;cursor:pointer;color:var(--ink);background:var(--paper);border:0;border-radius:999px;padding:14px 22px;margin-top:10px;transition:transform .2s,background .2s}
button:hover{background:#fff}
button:active{transform:scale(.98)}
button:focus-visible{outline:2px solid #5f86c4;outline-offset:3px}
.error{color:#ff9d8a;margin:0 0 4px;min-height:1.4em;font-size:.92rem}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const shell = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600&display=swap" rel="stylesheet">
<style>${STYLES}</style></head><body><main>${body}</main></body></html>`;

export function gatePage(message) {
  return shell(
    'Propuesta de diseño · Nukleo',
    `<div class="mark"><i></i>Nukleo</div>
<h1>Propuesta de diseño privada</h1>
<p>Introduce la contraseña que te hemos facilitado para ver la web.</p>
<form method="post" action="/__nk/login">
  <label class="error" id="msg" role="alert">${escapeHtml(message)}</label>
  <input type="password" name="password" placeholder="Contraseña" autocomplete="current-password" autofocus required aria-describedby="msg">
  <button type="submit">Entrar</button>
</form>`,
  );
}

export function expiredPage() {
  return shell(
    'Plazo finalizado · Nukleo',
    `<div class="mark"><i></i>Nukleo</div>
<h1>El plazo de la propuesta ha terminado</h1>
<p>Esta web y la propuesta de diseño estuvieron disponibles durante 7 días desde el primer acceso. Si quieres retomarla, podemos renegociarla: ponte en contacto con Nukleo.</p>`,
  );
}
