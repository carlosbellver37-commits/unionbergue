// Páginas del acceso Nukleo Preview (contraseña y plazo vencido).
// Cada web aporta su paleta e imagen; el resto del diseño es común.
const THEMES = {
  'web-union-bergue': {
    label: 'Unión Bergue',
    page: '#e9e6d9',
    panel: '#efeee4',
    ink: '#33200f',
    soft: '#6b5340',
    accent: '#964b36',
    accentHover: '#7f3d2b',
    image: '/__nk/img/cafe.jpg',
    imageClass: 'is-photo',
    imagePosition: '70% 62%',
  },
  'bergue-montecarmelo': {
    label: 'Bergue Montecarmelo',
    page: '#e5e2db',
    panel: '#efede8',
    ink: '#1c1513',
    soft: '#5f5650',
    accent: '#561d1f',
    accentHover: '#3f1416',
    image: '/__nk/img/cafetera.webp',
    imageClass: 'is-cutout',
    imagePosition: '50% 100%',
  },
};
const FALLBACK = THEMES['web-union-bergue'];

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const MASK = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 520 680' preserveAspectRatio='none'><path d='M40 0H452Q484 0 480 32L430 640Q427 680 387 680H40Q0 680 0 640V40Q0 0 40 0Z'/></svg>",
);

const css = (t) => `
:root{--page:${t.page};--panel:${t.panel};--ink:${t.ink};--soft:${t.soft};--accent:${t.accent};--accent-hover:${t.accentHover};--nk-ink:#14140f;--nk-blue:#1b3358;--line:color-mix(in srgb,var(--ink) 20%,transparent)}
*{box-sizing:border-box}
html,body{min-height:100%;margin:0}
body{background:var(--page);color:var(--ink);font-family:'Instrument Sans',system-ui,sans-serif;font-weight:500;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:clamp(12px,3vw,40px);position:relative;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0 auto 0 0;width:46%;background:var(--panel);clip-path:polygon(0 0,100% 0,84% 100%,0 100%);opacity:.9;z-index:0}
.card{position:relative;z-index:1;width:min(1080px,100%);display:grid;grid-template-columns:minmax(0,1.02fr) minmax(0,1fr);background:#fff;border-radius:clamp(28px,4vw,52px);padding:clamp(8px,1vw,12px);box-shadow:0 30px 80px -30px rgb(20 14 10/.35)}
.art{position:relative;min-height:clamp(520px,68vh,680px);overflow:hidden;background:var(--panel);-webkit-mask:url("data:image/svg+xml,${MASK}") center/100% 100% no-repeat;mask:url("data:image/svg+xml,${MASK}") center/100% 100% no-repeat}
.art img{position:absolute;inset:0;width:100%;height:100%;object-position:${t.imagePosition}}
.art.is-photo img{object-fit:cover}
.art.is-cutout{background:linear-gradient(180deg,var(--panel),color-mix(in srgb,var(--panel) 84%,#000))}
.art.is-cutout img{object-fit:contain;inset:auto 6% 5% 6%;width:88%;height:60%}
.art__top{position:absolute;inset:26px 40px auto 34px;display:flex;justify-content:space-between;align-items:center;font-size:.9rem;font-weight:600;color:var(--ink)}
.lockup{position:absolute;inset:18% 8% auto 8%;display:flex;flex-wrap:wrap;align-items:baseline;justify-content:center;gap:.22em .3em;text-align:center;line-height:.9}
.lockup .bergue{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(2.6rem,6vw,4.4rem);letter-spacing:-.04em;font-variation-settings:'opsz' 144,'SOFT' 0,'WONK' 1;color:var(--accent)}
.lockup .x{font-family:'Instrument Sans',sans-serif;font-weight:500;font-size:clamp(1.3rem,2.6vw,1.9rem);color:var(--soft)}
.lockup .nukleo{font-family:'Instrument Sans',sans-serif;font-weight:700;font-size:clamp(2.4rem,5.6vw,4.1rem);letter-spacing:-.045em;color:var(--nk-ink)}
.lockup .nukleo i{display:inline-block;width:.17em;height:.17em;margin-left:.04em;background:var(--nk-blue)}
.form{min-width:0;display:flex;flex-direction:column;justify-content:center;padding:clamp(28px,5vw,64px) clamp(24px,5vw,72px);gap:6px}
.form__tag{align-self:flex-start;font-size:.78rem;font-weight:600;color:var(--soft);padding:7px 14px;border:1px solid var(--line);border-radius:999px;margin-bottom:clamp(28px,7vh,64px)}
h1{font-weight:700;font-size:clamp(2.1rem,4.4vw,3.1rem);line-height:1.02;letter-spacing:-.035em;margin:0;color:var(--nk-ink)}
.lead{margin:12px 0 30px;color:var(--soft);line-height:1.5}
form{display:grid;gap:12px}
.field{display:grid;gap:6px;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff;transition:border-color .2s,box-shadow .2s}
.field:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.field span{font-size:.72rem;color:var(--soft)}
input{font:inherit;color:var(--nk-ink);background:transparent;border:0;outline:0;padding:0;width:100%}
.error{margin:0;min-height:1.3em;color:#b3321f;font-size:.88rem}
button{font:inherit;font-weight:600;cursor:pointer;color:#fff;background:var(--accent);border:0;border-radius:999px;padding:16px 22px;margin-top:6px;transition:transform .2s,background .2s}
button:hover{background:var(--accent-hover)}
button:active{transform:scale(.985)}
button:focus-visible{outline:2px solid var(--nk-blue);outline-offset:3px}
.note{margin:26px 0 0;font-size:.8rem;color:var(--soft);line-height:1.5}
@media (max-width:820px){
  body::before{display:none}
  .card{grid-template-columns:1fr}
  .art{min-height:300px;-webkit-mask:none;mask:none;border-radius:calc(clamp(28px,4vw,52px) - 8px)}
  .lockup{inset:22% 6% auto 6%}
  .art.is-cutout img{height:54%}
  .form{padding:28px 22px 30px}
  .form__tag{margin-bottom:26px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const shell = (t, title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,900,0,1&family=Instrument+Sans:wght@500;600;700&display=swap" rel="stylesheet">
<style>${css(t)}</style></head><body>${body}</body></html>`;

const art = (t) => `<div class="art ${t.imageClass}">
  <img src="${t.image}" alt="" width="1200" height="900" decoding="async">
  <div class="art__top"><span>Propuesta de diseño</span></div>
  <div class="lockup" role="img" aria-label="Bergue por Nukleo"><span class="bergue">Bergue</span><span class="x">×</span><span class="nukleo">Nukleo<i></i></span></div>
</div>`;

export function gatePage(message, project = '') {
  const t = THEMES[project] || FALLBACK;
  return shell(
    t,
    'Propuesta de diseño · Bergue × Nukleo',
    `<main class="card">
${art(t)}
<section class="form">
  <span class="form__tag">Acceso privado</span>
  <h1>Bienvenido a tu propuesta</h1>
  <p class="lead">Introduce la contraseña que te hemos facilitado para ver la web de ${escapeHtml(t.label)}.</p>
  <form method="post" action="/__nk/login">
    <label class="field"><span>Contraseña</span>
      <input type="password" name="password" autocomplete="current-password" autofocus required aria-describedby="msg"></label>
    <p class="error" id="msg" role="alert">${escapeHtml(message)}</p>
    <button type="submit">Entrar</button>
  </form>
  <p class="note">Propuesta confidencial diseñada por Nukleo. Dispones de 7 días desde tu primer acceso.</p>
</section></main>`,
  );
}

export function expiredPage(project = '') {
  const t = THEMES[project] || FALLBACK;
  return shell(
    t,
    'Plazo finalizado · Bergue × Nukleo',
    `<main class="card">
${art(t)}
<section class="form">
  <span class="form__tag">Plazo finalizado</span>
  <h1>La propuesta ha terminado su plazo</h1>
  <p class="lead">Esta web y la propuesta de diseño estuvieron disponibles durante 7 días desde el primer acceso. Si quieres retomarla, podemos renegociarla: ponte en contacto con Nukleo.</p>
</section></main>`,
  );
}
