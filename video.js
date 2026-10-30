// Garantiza que el vídeo de fondo se reproduzca en bucle en todos los navegadores.
// Si el navegador bloquea la reproducción automática (p. ej. iPhone en modo ahorro
// de energía), arranca con la primera interacción: tocar, hacer clic, teclear o hacer scroll.

const EVENTOS_INTERACCION = ["pointerdown", "touchstart", "keydown", "scroll"];

const video = document.querySelector(".hero__video");

// Safari exige que esté silenciado como propiedad, no solo como atributo
video.muted = true;
video.defaultMuted = true;
video.playsInline = true;

function reproducir() {
  const intento = video.play();
  // Navegadores antiguos no devuelven promesa
  if (!intento) return Promise.resolve(!video.paused);
  return intento.then(() => true, () => false);
}

function alInteractuar() {
  reproducir().then((reproduciendo) => {
    if (!reproduciendo) return;
    EVENTOS_INTERACCION.forEach((evento) => window.removeEventListener(evento, alInteractuar));
  });
}

reproducir().then((reproduciendo) => {
  if (reproduciendo) return;
  EVENTOS_INTERACCION.forEach((evento) =>
    window.addEventListener(evento, alInteractuar, { passive: true }));
});

// Al volver a la pestaña, el navegador puede haberlo pausado
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && video.paused) reproducir();
});
