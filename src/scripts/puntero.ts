/**
 * Un solo `pointermove` para toda la web. Los efectos que siguen al ratón
 * (titulares, taza, sombras de la fachada) se suscriben aquí y reciben la
 * posición como mucho una vez por fotograma, y solo mientras su elemento está
 * en pantalla (IntersectionObserver: sin medir el DOM en cada movimiento).
 * Con pantalla táctil no se activa nada.
 */
type AlMover = (x: number, y: number) => void;

const suscritos = new Map<Element, { alMover: AlMover; visible: boolean }>();
let x = 0;
let y = 0;
let pendiente = false;

const visibilidad = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    const s = suscritos.get(e.target);
    if (s) s.visible = e.isIntersecting;
  });
});

function repartir() {
  pendiente = false;
  suscritos.forEach((s) => { if (s.visible) s.alMover(x, y); });
}

window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  x = e.clientX;
  y = e.clientY;
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(repartir);
}, { passive: true });

/** Llama a `alMover(x, y)` en cada fotograma con movimiento mientras `el` esté visible. */
export function seguirPuntero(el: Element, alMover: AlMover): void {
  suscritos.set(el, { alMover, visible: false });
  visibilidad.observe(el);
}

