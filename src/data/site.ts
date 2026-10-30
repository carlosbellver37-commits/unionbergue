/**
 * Datos del negocio. Todo lo marcado como PENDIENTE está sin confirmar
 * por el cliente: se sustituye aquí y se actualiza en toda la web.
 */

/** Valor provisional para datos que el cliente aún no ha facilitado. */
export const PENDIENTE = 'X';

export const site = {
  nombre: 'Pastelería Bergue',
  lema: 'Tradición artesanal para disfrutar cada día',
  descripcion:
    'Pastelería, panadería y cafetería artesanal en Las Tablas (Madrid). Tartas, pan, bollería, salados y productos de temporada.',
  anios: 'más de 30 años',
  email: 'info@pasteleriabergue.com',
  // PENDIENTE: número de WhatsApp en formato internacional sin "+" ni espacios (ej. 34600111222).
  // Vacío mientras no haya móvil de empresa: no se muestra WhatsApp y los encargos van al fijo.
  whatsapp: '',
  /**
   * Clave de Web3Forms para que el formulario de encargos envíe el email desde la
   * web (llega a la dirección con la que se pidió la clave). Es pública por diseño.
   * PENDIENTE: pedirla en https://web3forms.com y ponerla en web/.env
   */
  web3formsKey: import.meta.env.PUBLIC_WEB3FORMS_KEY ?? '',
  legal: {
    razonesSociales: ['BERGUE E HIJOS S.L.', 'BERGUE & FAMILY S.L.'],
    cif: 'B-86452182',
    domicilio: 'C/ Monasterio de Liébana, 7, 28049 Madrid',
  },
} as const;

/** Hay WhatsApp de empresa; si no, el botón flotante y los encargos llevan al teléfono. */
export const hayWhatsapp = site.whatsapp !== '';

export const encargos = {
  antelacionMinima: '24 horas',
  // PENDIENTE: varían según la tarta; el cliente los irá concretando
  tamanos: `${PENDIENTE} tamaños`,
  raciones: `de ${PENDIENTE} a ${PENDIENTE} raciones`,
  tiposConsulta: [
    'Tarta por encargo',
    'Celebración / cumpleaños',
    'Salados para reunión',
    'Pedido para empresa',
    'Producto de temporada',
    'Otra consulta',
  ],
} as const;

export interface Tienda {
  id: string;
  nombre: string;
  direccion: string;
  acceso: string;
  cp: string;
  telefono: string;
  telefonoHref: string;
  autobuses: string[];
  metro: string[];
  mapa: string;
}

/** La web es solo de la tienda de Las Tablas (se mantiene como lista por si se añade otra). */
export const tiendas: Tienda[] = [
  {
    id: 'las-tablas',
    nombre: 'Las Tablas',
    direccion: 'Calle Sierra de Atapuerca, 31',
    acceso: 'Acceso por la calle San Millán de la Cogolla',
    cp: '28050 Madrid',
    telefono: '91 750 56 03',
    telefonoHref: '+34917505603',
    autobuses: ['172', '176'],
    metro: ['L10 · Las Tablas', 'ML1 · Las Tablas', 'ML1 · Palas del Rey'],
    mapa: 'https://www.google.com/maps/search/?api=1&query=Calle+Sierra+de+Atapuerca+31+28050+Madrid',
  },
];

export const horario = {
  general: 'Lunes a domingo · 8:00 – 21:30',
  nota: 'Horario ininterrumpido',
  agosto: [
    { periodo: '1 – 14 de agosto', horas: '8:00 – 15:00' },
    { periodo: '15 – 31 de agosto', horas: 'Cerrado' },
  ],
};

/** Menú desplegable: los servicios abren su sector en "Qué hacemos" de la portada. */
export const nav = [
  { href: '/#pasteleria', label: 'Pastelería' },
  { href: '/#pan', label: 'Pan y bollería' },
  { href: '/#salados', label: 'Salados' },
  { href: '/#temporada', label: 'Temporada' },
  { href: '/#cafeteria', label: 'Cafetería' },
  { href: '/#gourmet', label: 'Gourmet' },
  { href: '/#heladeria', label: 'Heladería' },
  { href: '/#conocenos', label: 'Conócenos' },
  { href: '/#tiendas', label: 'La tienda' },
];

/** Enlace de WhatsApp con mensaje precargado. */
export function whatsappUrl(mensaje = 'Hola, quería hacer una consulta.'): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
