/**
 * Movimiento global: scroll suave (Lenis) sincronizado con GSAP y apariciones
 * al hacer scroll. Se activa por atributos data-* en el HTML:
 *  data-reveal          aparece al entrar en pantalla (data-reveal-delay opcional)
 *  data-reveal-stagger  los hijos directos aparecen en cascada
 * Los efectos se aplican siempre, también con "reducir movimiento" activado en el sistema.
 * Los efectos que siguen al ratón están en scripts/puntero.ts.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { posicionEnDocumento } from './geometria';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'expo.out';

function smoothScroll(): Lenis {
  const instancia = new Lenis({ lerp: 0.1 });
  instancia.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => instancia.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.addEventListener('bergue:menu', (e) => {
    (e as CustomEvent<boolean>).detail ? instancia.stop() : instancia.start();
  });
  return instancia;
}

export const lenis = smoothScroll();

/**
 * Desplaza con el mismo scroll suave de toda la web (no el nativo, que se pelea con Lenis).
 * Si la página acaba de cambiar de alto (abrir o cerrar un sector), Lenis aún tiene el
 * límite de scroll anterior: se actualiza antes para no quedarse corto.
 * El destino se calcula sin transformaciones: un sector que entra animado se mediría
 * desplazado. Con 'start' se respeta el scroll-margin-top de global.css (barra fija).
 */
export function desplazarA(el: HTMLElement, bloque: 'start' | 'center' = 'start'): void {
  lenis.resize();
  const { y, h } = posicionEnDocumento(el);
  const destino = bloque === 'center'
    ? y - (window.innerHeight - h) / 2
    : y - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
  lenis.scrollTo(destino);
}

function reveals(): void {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: EASE,
      delay: Number(el.dataset.revealDelay ?? 0),
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  gsap.utils.toArray<HTMLElement>('[data-reveal-stagger]').forEach((group) => {
    gsap.from(group.children, {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: EASE,
      stagger: 0.08,
      scrollTrigger: { trigger: group, start: 'top 85%' },
    });
  });
}

reveals();
window.addEventListener('load', () => ScrollTrigger.refresh());
