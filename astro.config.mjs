// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Dominio público (confirmado por el cliente): se usa para la URL canónica, Open Graph y
// el sitemap. En el hosting, www.pasteleriabergue.com debe redirigir a este.
export default defineConfig({
  site: 'https://pasteleriabergue.com',
  integrations: [sitemap()],
  // Política de seguridad de contenidos: Astro añade en cada página una etiqueta <meta>
  // con los hashes de sus scripts y estilos incrustados, así que solo se ejecuta código
  // de la propia web. frame-ancestors y upgrade-insecure-requests no funcionan en <meta>:
  // van como cabecera Content-Security-Policy en vercel.json (se suma a esta).
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:", // data: para el grano de harina del fondo (global.css)
        "font-src 'self'",
        "connect-src 'self' https://api.web3forms.com", // envío de encargos por email
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      styleDirective: {
        // Los atributos style del marcado (posiciones del expositor, la fachada…)
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },
});
