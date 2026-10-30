# Web Pastelería Bergue

Astro + GSAP + Lenis. Web estática: `npm run build` genera `dist/`, que se puede subir a cualquier hosting.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build
```

## Dónde cambiar cada cosa

| Qué | Archivo |
|---|---|
| Teléfonos, horarios, WhatsApp, email, razón social, datos "X" de encargos | `src/data/site.ts` |
| Carta de productos (panes, bollería, salados, gourmet, heladería, cafetería) | `src/data/carta.ts` |
| Colores y tipografía | `src/styles/tokens.css` |

## Publicar

```bash
npm run publicar
```

Compila y crea **`Bergue/publicar/`** con solo la web lista para subir: HTML, recursos, `robots.txt`, sitemap, `vercel.json` y `_headers` (mismas cabeceras para Vercel y Netlify; se editan solo en `web/vercel.json`). Volver a ejecutarlo antes de cada subida.

- **Vercel:** subir la carpeta `publicar/` como proyecto (`npx vercel --prod` dentro de ella, o arrastrarla). No hay que compilar nada allí.
- **Netlify:** arrastrar `publicar/` a Netlify Drop.
- La clave `PUBLIC_WEB3FORMS_KEY` tiene que estar en `web/.env` **antes** de `npm run publicar`: queda dentro de la web al compilar. El script avisa si falta.
- Dominio: `https://pasteleriabergue.com` (confirmado; es `site` en `astro.config.mjs`). En el hosting, ponerlo como dominio principal y redirigir `www.pasteleriabergue.com` a él.

Alternativa con despliegue automático: subir el repositorio `web/` a GitHub e importarlo en Vercel (usa `web/vercel.json` y compila allí; la clave se pone en *Settings → Environment Variables*).

Incluido: sitemap (`/sitemap-index.xml`), `robots.txt`, URL canónica y Open Graph en cada página (`public/og.jpg`), icono para iOS y página 404.

Los efectos de movimiento se ejecutan siempre, aunque el dispositivo tenga activado "reducir movimiento".

## Seguridad

- **CSP en cada página** (`astro.config.mjs`): Astro añade una etiqueta `<meta>` con los hashes de sus scripts y estilos, así que solo se ejecuta código de la propia web. Sin scripts, fuentes ni cookies de terceros.
- **Cabeceras** (`vercel.json`, copiadas a `publicar/` para Vercel y Netlify): HSTS, una segunda CSP con `frame-ancestors 'none'` y `upgrade-insecure-requests` (no funcionan en `<meta>`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`.
- HSTS va **sin `includeSubDomains`**: el dominio del cliente puede tener subdominios (correo, panel del hosting) sin HTTPS. Añadirlo solo cuando se sepa que todos lo tienen.
- Formulario de encargos: campo trampa antispam, validación en el navegador y la clave de Web3Forms solo en `.env` (pública por diseño, no es un secreto).
- Antes de cada publicación: `npm audit` sin vulnerabilidades.

## Pendiente

- `site.whatsapp`: vacío hasta que haya móvil de empresa. Mientras tanto no se muestra WhatsApp: el botón flotante llama al fijo y, si tampoco hay clave de email, la página de encargos pide llamar a la tienda en vez de mostrar el formulario. Con el número puesto, todo vuelve solo.
- Tamaños y raciones de las tartas: varían según la tarta; el cliente los irá concretando (`encargos` en `src/data/site.ts`).
- Envío de encargos por email: pedir la clave gratuita en https://web3forms.com con el correo que debe recibir los encargos, copiar `.env.example` a `.env` y ponerla en `PUBLIC_WEB3FORMS_KEY`. En el hosting, añadir la misma variable de entorno.
- Logo en vector (ahora se usa el PNG de la web antigua como máscara monocolor).
- Textos legales: son los de la web original, copiados tal cual a petición del cliente (`src/components/legal/`). La política de cookies dice que se usan cookies de estadísticas, y esta web no instala ninguna: conviene que el cliente la actualice.
- Fuente `Bringbold Nineties` (licencia comercial): poner `BringboldNineties.woff2` en `public/fonts/`. Sin ella se usa Fraunces y el build avisa de que no la encuentra.

Las páginas y componentes de la versión anterior (páginas por sector, ilustraciones SVG…) están guardados en `../assets/version-anterior/`, fuera de la web.
