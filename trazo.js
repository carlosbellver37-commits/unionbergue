// Dos líneas que rodean la tarjeta de cristal, una por arriba y otra por abajo,
// y se dibujan al cargar (como las de la taza en bergueandfamily.com).

// En móvil no hay tarjeta y el CSS oculta las líneas.

const HUECO = 14;        // separación entre la línea y el cristal
const DURACION = 2200;
const RETRASO = 150;

const hero = document.querySelector(".hero");
const vidrio = hero.querySelector(".vidrio");
const svg = hero.querySelector(".trazo");
const lineas = {
  arriba: svg.querySelector('[data-linea="arriba"]'),
  abajo: svg.querySelector('[data-linea="abajo"]'),
};

const n = (v) => v.toFixed(1);

// lado -1: rodea por arriba · lado 1: rodea por abajo
function trazado({ x0, y0, x1, y1, r }, y, lado) {
  const R = r + HUECO;
  const xi = x0 - HUECO;
  const xd = x1 + HUECO;
  if (lado < 0) {
    return `M${n(xi)} ${n(y)}V${n(y0 + r)}`
      + `A${n(R)} ${n(R)} 0 0 1 ${n(x0 + r)} ${n(y0 - HUECO)}H${n(x1 - r)}`
      + `A${n(R)} ${n(R)} 0 0 1 ${n(xd)} ${n(y0 + r)}V${n(y)}`;
  }
  return `M${n(xi)} ${n(y)}V${n(y1 - r)}`
    + `A${n(R)} ${n(R)} 0 0 0 ${n(x0 + r)} ${n(y1 + HUECO)}H${n(x1 - r)}`
    + `A${n(R)} ${n(R)} 0 0 0 ${n(xd)} ${n(y1 - r)}V${n(y)}`;
}

function dibujar() {
  const ancho = hero.clientWidth;
  const alto = hero.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);

  // offset* ignora el transform de la animación de entrada: medimos la posición final
  const caja = {
    x0: vidrio.offsetLeft,
    y0: vidrio.offsetTop,
    x1: vidrio.offsetLeft + vidrio.offsetWidth,
    y1: vidrio.offsetTop + vidrio.offsetHeight,
    r: parseFloat(getComputedStyle(vidrio).borderTopLeftRadius) || 0,
  };
  // Las dos mitades se unen a media altura: al terminar el dibujo el marco queda cerrado
  const mitad = (caja.y0 + caja.y1) / 2;

  lineas.arriba.setAttribute("d", trazado(caja, mitad, -1));
  lineas.abajo.setAttribute("d", trazado(caja, mitad, 1));
}

// Se anima siempre, aunque el dispositivo tenga activado "reducir movimiento"
function animarEntrada() {
  const opciones = { duration: DURACION, delay: RETRASO, easing: "cubic-bezier(0.45, 0, 0.55, 1)", fill: "backwards" };
  // "abajo" se dibuja de izquierda a derecha y "arriba" al revés
  lineas.abajo.animate([{ strokeDashoffset: 1000 }, { strokeDashoffset: 0 }], opciones);
  lineas.arriba.animate([{ strokeDashoffset: -1000 }, { strokeDashoffset: 0 }], opciones);
}

dibujar();
animarEntrada();

// Se recalcula si cambia el tamaño de la ventana o de la tarjeta (p. ej. al cargar las fuentes)
const observador = new ResizeObserver(dibujar);
observador.observe(hero);
observador.observe(vidrio);
