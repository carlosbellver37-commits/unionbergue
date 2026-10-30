// Prepara Bergue/publicar/ con SOLO la web compilada, lista para subir tal cual:
// arrastrarla a Netlify Drop o usarla como raíz del proyecto en Vercel (sin compilar nada allí).
//
// Copia dist/ (lo genera `astro build`) y añade:
//   - vercel.json: las cabeceras de web/vercel.json, sin los ajustes de compilación,
//   - _headers:    las mismas cabeceras en formato Netlify.
// Las cabeceras solo se editan en web/vercel.json; este script las copia a los dos archivos.
//
//   npm run publicar   (compila y ejecuta este script; repetir antes de cada subida)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(WEB, 'dist');
const OUT = path.join(WEB, '..', 'publicar');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  throw new Error('publicar: no existe dist/index.html. Ejecuta antes `npm run build`.');
}

const config = JSON.parse(fs.readFileSync(path.join(WEB, 'vercel.json'), 'utf8'));

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(DIST, OUT, { recursive: true });

// Vercel: carpeta ya compilada, sin framework ni comando de build
const estatico = {
  $schema: config.$schema,
  trailingSlash: config.trailingSlash,
  headers: config.headers,
};
fs.writeFileSync(path.join(OUT, 'vercel.json'), JSON.stringify(estatico, null, 2) + '\n');

// Netlify: mismo contenido. "/(.*)" de Vercel equivale a "/*"
const netlify = config.headers.map(({ source, headers }) => {
  const ruta = source.replace('(.*)', '*');
  return [ruta, ...headers.map((h) => `  ${h.key}: ${h.value}`)].join('\n');
});
fs.writeFileSync(
  path.join(OUT, '_headers'),
  '# Cabeceras para Netlify. Generado por tools/publicar.mjs desde web/vercel.json: no editar aquí.\n' +
    netlify.join('\n\n') + '\n',
);

const clave = (process.env.PUBLIC_WEB3FORMS_KEY ?? '') ||
  (fs.existsSync(path.join(WEB, '.env')) && /PUBLIC_WEB3FORMS_KEY=\S+/.test(fs.readFileSync(path.join(WEB, '.env'), 'utf8')));

const archivos = fs.readdirSync(OUT, { recursive: true }).filter((f) => fs.statSync(path.join(OUT, f)).isFile());
const bytes = archivos.reduce((t, f) => t + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`publicar/ lista: ${archivos.length} archivos, ${(bytes / 1048576).toFixed(1)} MB → ${OUT}`);
if (!clave) {
  console.warn('AVISO: sin PUBLIC_WEB3FORMS_KEY en web/.env: el formulario de encargos solo sale si hay WhatsApp; si no, se pide llamar a la tienda.');
}

// Datos provisionales que acabarían publicados (ver PENDIENTE en src/data/site.ts y astro.config.mjs)
const html = archivos.filter((f) => f.endsWith('.html')).map((f) => fs.readFileSync(path.join(OUT, f), 'utf8')).join('\n');
const pendientes = [
  [html.includes('wa.me/34600000000'), 'el número de WhatsApp es el de ejemplo (src/data/site.ts)'],
  [html.includes('Texto provisional'), 'los textos legales llevan el aviso de "Texto provisional" (src/pages/[legal].astro)'],
  [/PENDIENTE: confirmar el dominio/.test(fs.readFileSync(path.join(WEB, 'astro.config.mjs'), 'utf8')),
    'el dominio no está confirmado (astro.config.mjs): canonical, sitemap y robots.txt lo usan'],
].filter(([hay]) => hay);
if (pendientes.length) {
  console.warn('\nANTES DE PUBLICAR, falta:');
  pendientes.forEach(([, texto]) => console.warn(`  - ${texto}`));
}
