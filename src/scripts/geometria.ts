/**
 * Posición de un elemento respecto al documento (no a la pantalla), sin contar
 * transformaciones (animaciones de entrada, efectos del ratón). Para usarla en
 * cada fotograma, medir al cargar o al cambiar de tamaño y restar el scroll.
 */
export function posicionEnDocumento(el: HTMLElement): { x: number; y: number; w: number; h: number } {
  let px = 0;
  let py = 0;
  let n: HTMLElement | null = el;
  while (n) {
    px += n.offsetLeft;
    py += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x: px, y: py, w: el.offsetWidth, h: el.offsetHeight };
}
