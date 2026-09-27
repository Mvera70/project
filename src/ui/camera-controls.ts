// La brújula y el teclado de la cámara. 27 sep 2026.
//
// Vera: «es muy incómodo moverse, y con el ratón no me sé todos los controles:
// sólo mover la cámara en el ángulo que viene puesta». Girar existía —dos dedos
// en el móvil, mayúsculas y arrastrar en el ordenador— pero nada en pantalla lo
// decía, y en el teclado no había nada. Esto añade:
//
//   · **la brújula**: un redondo más del rincón, con la aguja al norte del
//     valle. Arrastrarla gira la vista uno a uno con el dedo o el ratón;
//     tocarla vuelve al norte con un giro corto. Al pasar el ratón enseña los
//     controles, que es donde un jugador de ordenador los busca.
//   · **el teclado**: WASD o flechas para mover, Q/E para girar, R/F para
//     inclinar, +/− para acercar y N para volver al norte.
//
// Es interfaz pura: sólo llama a lo que la cámara ya tenía (`pan`, `orbit`,
// `zoom`) y lee hacia dónde mira (`heading`). No toca el motor.

import { renderUiText } from '@engine/chronicle/render';

export interface CameraApi {
  readonly movesCamera: boolean;
  /** Cuánto se ha girado desde la vista de partida, en radianes. */
  heading(): number;
  pan(dxCss: number, dyCss: number): void;
  orbit(dYaw: number, dPitch: number): void;
  zoom(factor: number, atXCss: number, atYCss: number): void;
}

/** Cuánto gira la brújula por píxel arrastrado: como el giro con mayúsculas. */
const ORBIT_PER_PX = (0.4 * Math.PI) / 180;
/** TUNE: el teclado, por segundo con la tecla pulsada. */
const KEYS = {
  panPx: 520,
  orbit: (80 * Math.PI) / 180,
  pitch: (35 * Math.PI) / 180,
  zoom: 2.2,
} as const;
/** Lo que tarda el giro de vuelta al norte, en milisegundos. */
const NORTH_MS = 320;
/** Lo que hay que arrastrar la brújula para que deje de ser un toque. */
const DRAG_PX = 4;

/** Un ángulo en (-π, π]. */
function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export interface CameraControls {
  readonly compass: HTMLButtonElement;
  dispose(): void;
}

export function mountCameraControls(camera: () => CameraApi, surface: () => HTMLElement): CameraControls {
  const compass = document.createElement('button');
  compass.type = 'button';
  compass.className = 'valley-compass hud-round-btn skin-plate skin-plate--round';
  compass.setAttribute('aria-label', renderUiText('app.compass'));
  compass.title = renderUiText('app.compass.help');
  compass.innerHTML = '<svg class="valley-compass-rose" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".45"/>'
    + '<path d="M12 3.2 L14.6 12 L12 10.9 L9.4 12 Z" fill="#9b2f24"/>'
    + '<path d="M12 20.8 L9.4 12 L12 13.1 L14.6 12 Z" fill="currentColor" opacity=".7"/>'
    + '<circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>';
  const rose = (): SVGElement | null => compass.querySelector('svg');

  let raf = 0;
  let turning: { from: number; startMs: number } | null = null;
  const held = new Set<string>();
  let last = performance.now();

  const faceNorth = (): void => {
    if (!camera().movesCamera) return;
    turning = { from: wrap(camera().heading()), startMs: performance.now() };
  };

  const frame = (now: number): void => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const api = camera();
    if (turning !== null && api.movesCamera) {
      const t = Math.min(1, (now - turning.startMs) / NORTH_MS);
      const eased = 1 - (1 - t) ** 3;
      const target = turning.from * (1 - eased);
      api.orbit(target - wrap(api.heading()), 0);
      if (t >= 1) turning = null;
    }
    if (held.size > 0 && api.movesCamera) {
      let dx = 0, dy = 0, yaw = 0, pitch = 0, zoom = 0;
      if (held.has('left')) dx += 1;
      if (held.has('right')) dx -= 1;
      if (held.has('up')) dy += 1;
      if (held.has('down')) dy -= 1;
      if (held.has('turnLeft')) yaw += 1;
      if (held.has('turnRight')) yaw -= 1;
      if (held.has('tiltUp')) pitch += 1;
      if (held.has('tiltDown')) pitch -= 1;
      if (held.has('zoomIn')) zoom -= 1;
      if (held.has('zoomOut')) zoom += 1;
      if (dx !== 0 || dy !== 0) api.pan(dx * KEYS.panPx * dt, dy * KEYS.panPx * dt);
      if (yaw !== 0 || pitch !== 0) api.orbit(yaw * KEYS.orbit * dt, pitch * KEYS.pitch * dt);
      if (zoom !== 0) {
        const box = surface().getBoundingClientRect();
        api.zoom(KEYS.zoom ** (zoom * dt), box.width / 2, box.height / 2);
      }
    }
    // Sin cámara que girar (el 2D de respaldo), no hay brújula.
    compass.hidden = !api.movesCamera;
    // La aguja apunta al norte del valle: gira al revés que la vista.
    const svg = rose();
    if (svg !== null) svg.style.transform = `rotate(${(camera().heading() * 180) / Math.PI}deg)`;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  // La brújula: arrastrar gira, tocar vuelve al norte.
  let dragFrom: { x: number; moved: boolean } | null = null;
  compass.addEventListener('pointerdown', (event) => {
    compass.setPointerCapture(event.pointerId);
    dragFrom = { x: event.clientX, moved: false };
    turning = null;
  });
  compass.addEventListener('pointermove', (event) => {
    if (dragFrom === null) return;
    const dx = event.clientX - dragFrom.x;
    if (!dragFrom.moved && Math.abs(dx) < DRAG_PX) return;
    dragFrom.moved = true;
    dragFrom.x = event.clientX;
    if (camera().movesCamera) camera().orbit(-dx * ORBIT_PER_PX, 0);
  });
  const release = (): void => {
    if (dragFrom !== null && !dragFrom.moved) faceNorth();
    dragFrom = null;
  };
  compass.addEventListener('pointerup', release);
  compass.addEventListener('pointercancel', () => { dragFrom = null; });

  // El teclado. Por `code` y no por `key`: la tecla está en el mismo sitio en
  // un teclado español que en uno inglés, que es lo que importa para WASD.
  const MAP: Record<string, string> = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    KeyQ: 'turnLeft', KeyE: 'turnRight', KeyR: 'tiltUp', KeyF: 'tiltDown',
    Equal: 'zoomIn', NumpadAdd: 'zoomIn', BracketRight: 'zoomIn',
    Minus: 'zoomOut', NumpadSubtract: 'zoomOut', Slash: 'zoomOut',
  };
  const typing = (event: KeyboardEvent): boolean => {
    const target = event.target as HTMLElement | null;
    return target !== null && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
  };
  const onDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || typing(event)) return;
    if (!compass.isConnected || !camera().movesCamera) return;
    if (event.code === 'KeyN') { faceNorth(); event.preventDefault(); return; }
    const action = MAP[event.code];
    if (action === undefined) return;
    held.add(action);
    turning = null;
    // Las flechas desplazarían la página entera debajo del valle.
    event.preventDefault();
  };
  const onUp = (event: KeyboardEvent): void => {
    const action = MAP[event.code];
    if (action !== undefined) held.delete(action);
  };
  const onBlur = (): void => { held.clear(); };
  document.addEventListener('keydown', onDown);
  document.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);

  return {
    compass,
    dispose(): void {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      compass.remove();
    },
  };
}
