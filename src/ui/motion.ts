/**
 * Retira una superposición después de un gesto breve de salida. El cambio
 * lógico ocurre antes de llamar aquí; esta copia visual ya no admite toques ni
 * foco. El movimiento es sólo decorativo y se omite si el sistema lo pide.
 */
export function retireOverlay(overlay: HTMLElement, panel?: HTMLElement): void {
  overlay.inert = true;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.pointerEvents = 'none';
  if (!overlay.isConnected || typeof overlay.animate !== 'function'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.remove();
    return;
  }
  const timing: KeyframeAnimationOptions = { duration: 170, easing: 'ease-in', fill: 'forwards' };
  const fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], timing);
  panel?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(10px)' }], timing);
  void fade.finished.then(() => overlay.remove(), () => overlay.remove());
}

/** Pide a la carcasa cerrar su hoja con gesto; fuera de ella usa la ruta normal. */
export function requestSheetClose(source: HTMLElement, fallback: () => void): void {
  const request = new Event('valley:sheet-close', { bubbles: true, cancelable: true });
  if (source.dispatchEvent(request)) fallback();
}
