/** Carta de productos (cartas Bergue 2014, actualizadas con el cliente en octubre de 2026). */

export const panes = [
  { nombre: 'Chapata', def: 'Miga alveolada y corteza fina, de larga fermentación.' },
  { nombre: 'Baguette', def: 'La clásica francesa: crujiente por fuera, tierna por dentro.' },
  { nombre: 'Pistola', def: 'La barra de siempre, la de la mesa de cada día.' },
  { nombre: 'Barra gallega', def: 'Corteza gruesa y miga húmeda, como el pan gallego, en barra.' },
  { nombre: 'Barra integral', def: 'Harina integral para una barra con más fibra y sabor a cereal.' },
  { nombre: 'Pan de pueblo', def: 'Corteza dura y miga prieta, como el de los hornos de antes.' },
  { nombre: 'Pan de cereales', def: 'Semillas y harinas variadas para un pan con carácter.' },
  { nombre: 'Pan de trigo sarraceno', def: 'Harina de alforfón, de sabor tostado y ligeramente terroso.' },
  { nombre: 'Pan con aceitunas', def: 'Con aceitunas en la masa, ideal para el aperitivo.' },
  { nombre: 'Pan de pasas y nueces', def: 'Dulzor natural de la fruta y el crujido de la nuez.' },
  { nombre: 'Pan de espelta', def: 'Cereal antiguo, aromático y fácil de digerir.' },
  { nombre: 'Hogaza de maíz e higo', def: 'Una hogaza dorada con un punto dulce y afrutado.' },
  { nombre: 'Bogavante', def: 'Pan rústico de cuatro picos, de fermentación natural.' },
  { nombre: 'Bretón', def: 'Pan rústico de miga aireada y corteza crujiente.' },
  { nombre: 'Pan rústico', def: 'Forma irregular, harina por encima y mucho sabor.' },
  { nombre: 'Colón chato', def: 'Pieza tradicional de miga compacta y corteza lisa.' },
  { nombre: 'Pan de picos', def: 'Corteza en puntas, la más crujiente de la casa.' },
];

export const bolleria = [
  'Bizcochos artesanos',
  'Croissants',
  'Ensaimadas',
  'Napolitanas',
  'Sneken',
  'Palmeras',
  'Bayonesas',
  'Donuts',
];

/** Surtido de palmeras rellenas y bañadas ("palmeritas jugositas"). */
export const palmeritas = [
  'Chocolate Dubái', 'Lotus', 'Kinder', 'Oreo', 'Ferrero', 'Pistacho',
  'Choco fondant', 'Chocolate blanco con frambuesa', 'Limón',
];

export const salados = [
  'Medias noches rellenas', 'Sándwiches', 'Agujas de ternera', 'Empanadillas',
  'Pastel de queso', 'Empanada de hojaldre de atún', 'Empanada de hojaldre de ternera',
  'Quiches variados', 'Petit pain',
];

export const gourmet = [
  { grupo: 'Bodega', items: ['Vinos', 'Cavas'] },
  { grupo: 'Despensa', items: ['Foie', 'Quesos', 'Embutidos ibéricos', 'Conservas'] },
  {
    grupo: 'De Extremadura',
    items: ['Mermeladas artesanas Sabores del Guijo', 'Miel 100 % pura La Virgen de Extremadura'],
  },
  { grupo: 'Cafés de origen', items: ['Colombia', 'Kenia', 'Guatemala'] },
  { grupo: 'Dulce', items: ['Bombones'] },
];

export const heladeria = [
  'Copa Ibiza', 'Copa Alicante', 'Copa Fantasía', 'Granizados', 'Batidos',
  'Sorbetes', 'Smoothies', 'Yogur', 'Frappelatte',
];

export const cafeteria = {
  acompanar: [
    'Croissants', 'Ensaimadas', 'Napolitanas', 'Bizcochos',
    'Tortitas con nata', 'Gofres', 'Chocolate con churros',
  ],
  tostadas: [
    'Con aguacate', 'Con atún', 'Con aguacate y atún', 'Con aguacate y jamón ibérico',
  ],
  bocadillos: [
    'Tortilla de patatas', 'Bacon y queso', 'Jamón ibérico con aceite de oliva virgen',
    'Jamón serrano con tomate', 'Atún con tomate', 'Jamón york y queso',
  ],
  bebidas: ['Café de Colombia de la casa', 'Infusiones', 'Refrescos', 'Vinos', 'Cavas'],
};

/** Mieles 100 % puras, sin mezcla (La Virgen de Extremadura). */
export const mieles = [
  'Azahar', 'Romero', 'Tomillo', 'Mil flores', 'Eucalipto',
  'Sierra de Guadalupe', 'Brezo', 'Castaño', 'Encina', 'Roble',
];
