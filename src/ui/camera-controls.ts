// La brújula y el teclado de la cámara. 27 sep 2026.
//
// Vera: «es muy incómodo moverse, y con el ratón no me sé todos los controles:
// sólo mover la cámara en el ángulo que viene puesta». Girar existía —dos dedos
// en el móvil, mayúsculas y arrastrar en el ordenador— pero nada en pantalla lo
// decía, y en el teclado no había nada. Esto añade:
//
//   · **el gizmo de navegación**, como el de Blender (Vera: «no la brújula
//     como un botón, sino como un objeto 3D que rota sobre sí mismo como la
//     tierra»): una bola arriba a la derecha con el horizonte y los dos
//     meridianos, que gira en directo con la cámara. Arrastrarla a los lados
//     gira la vista y arriba y abajo la inclina, como girar una bola del mundo;
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
  /** Rumbo e inclinación absolutos, para dibujar la bola como mira la cámara. */
  viewAngles(): { yaw: number; pitch: number };
  pan(dxCss: number, dyCss: number): void;
  orbit(dYaw: number, dPitch: number): void;
  zoom(factor: number, atXCss: number, atYCss: number): void;
}

/**
 * Cuánto gira la bola por píxel arrastrado. TUNE: 0,8° de rumbo y 0,5° de
 * inclinación por píxel; la bola mide 86, así que cruzarla es más de media
 * vuelta, que es lo que se siente como girar una bola del mundo con el dedo.
 */
const ORBIT_PER_PX = (0.8 * Math.PI) / 180;
const PITCH_PER_PX = (0.5 * Math.PI) / 180;
/** El radio de la bola dentro de su caja de 100 × 100: casi hasta el borde del fondo. */
const RADIUS = 44;
/** Los anillos: el horizonte, el meridiano norte-sur y el este-oeste. */
const RINGS = [
  { axis: [0, 1, 0], colour: '#7fb069' },
  { axis: [1, 0, 0], colour: '#d9544f' },
  { axis: [0, 0, 1], colour: '#4f86d9' },
] as const;

type V3 = readonly [number, number, number];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit3 = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/**
 * La bola vista como la ve la cámara: la base de la pantalla sale de los mismos
 * ángulos que `camera.ts` usa para colocarla (`direction`). Devuelve, para
 * un punto de la esfera unidad, dónde cae en la caja de 100 y si queda delante.
 */
function projector(yaw: number, pitch: number): (p: V3) => { x: number; y: number; front: boolean } {
  const toCamera: V3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const forward: V3 = [-toCamera[0], -toCamera[1], -toCamera[2]];
  const right = unit3(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return (p) => ({ x: 50 + dot(p, right) * RADIUS, y: 50 - dot(p, up) * RADIUS, front: dot(p, toCamera) >= 0 });
}
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
  compass.className = 'valley-compass';
  compass.setAttribute('aria-label', renderUiText('app.compass'));
  compass.title = renderUiText('app.compass.help');
  // Cada anillo en dos trazos: la mitad de delante, entera, y la de detrás,
  // tenue, que es lo que hace que se lea como una bola y no como un dibujo.
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const rim = document.createElementNS(svgNs, 'circle');
  rim.setAttribute('cx', '50'); rim.setAttribute('cy', '50'); rim.setAttribute('r', String(RADIUS));
  rim.setAttribute('fill', 'none'); rim.setAttribute('stroke', 'rgba(255,248,230,.55)'); rim.setAttribute('stroke-width', '1.5');
  svg.append(rim);
  const strokes = RINGS.map((ring) => {
    const back = document.createElementNS(svgNs, 'path');
    const front = document.createElementNS(svgNs, 'path');
    for (const [path, opacity, width] of [[back, '0.28', '2'], [front, '1', '3']] as const) {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', ring.colour);
      path.setAttribute('stroke-opacity', opacity);
      path.setAttribute('stroke-width', width);
      path.setAttribute('stroke-linecap', 'round');
    }
    svg.append(back);
    return { ring, back, front };
  });
  for (const stroke of strokes) svg.append(stroke.front);
  // El norte del valle es -Z (la garganta de arriba del mapa).
  const north = document.createElementNS(svgNs, 'g');
  const northDot = document.createElementNS(svgNs, 'circle');
  northDot.setAttribute('r', '9'); northDot.setAttribute('fill', '#d9544f');
  const northText = document.createElementNS(svgNs, 'text');
  northText.textContent = renderUiText('app.compass.north');
  northText.setAttribute('text-anchor', 'middle'); northText.setAttribute('dominant-baseline', 'central');
  northText.setAttribute('fill', '#fff'); northText.setAttribute('font-size', '12'); northText.setAttribute('font-weight', '700');
  north.append(northDot, northText);
  svg.append(north);
  compass.append(svg);
  const RING_STEPS = 48;
  const draw = (yaw: number, pitch: number): void => {
    const project = projector(yaw, pitch);
    for (const { ring, back, front } of strokes) {
      // Dos vectores perpendiculares al eje del anillo recorren su círculo.
      const helper: V3 = Math.abs(ring.axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = unit3(cross(ring.axis, helper));
      const e2 = cross(ring.axis, e1);
      let dFront = '', dBack = '';
      let wasFront: boolean | null = null;
      for (let k = 0; k <= RING_STEPS; k += 1) {
        const t = (k / RING_STEPS) * Math.PI * 2;
        const p: V3 = [e1[0] * Math.cos(t) + e2[0] * Math.sin(t), e1[1] * Math.cos(t) + e2[1] * Math.sin(t), e1[2] * Math.cos(t) + e2[2] * Math.sin(t)];
        const at = project(p);
        const cmd = `${at.x.toFixed(1)} ${at.y.toFixed(1)}`;
        if (at.front) dFront += `${wasFront === true ? 'L' : 'M'}${cmd}`;
        else dBack += `${wasFront === false ? 'L' : 'M'}${cmd}`;
        wasFront = at.front;
      }
      front.setAttribute('d', dFront);
      back.setAttribute('d', dBack);
    }
    const n = project([0, 0, -1]);
    north.setAttribute('transform', `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`);
    north.setAttribute('opacity', n.front ? '1' : '0.35');
  };
  let drawn = '';

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
    // La bola gira con la vista: sólo se redibuja cuando la vista cambia.
    const angles = api.viewAngles();
    const key = `${angles.yaw.toFixed(4)}|${angles.pitch.toFixed(4)}`;
    if (key !== drawn) { drawn = key; draw(angles.yaw, angles.pitch); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  // La bola: arrastrar gira (a los lados) e inclina (arriba y abajo), como
  // girar una bola del mundo con el dedo; tocar vuelve al norte.
  let dragFrom: { x: number; y: number; moved: boolean } | null = null;
  compass.addEventListener('pointerdown', (event) => {
    compass.setPointerCapture(event.pointerId);
    dragFrom = { x: event.clientX, y: event.clientY, moved: false };
    turning = null;
    event.preventDefault();
  });
  compass.addEventListener('pointermove', (event) => {
    if (dragFrom === null) return;
    const dx = event.clientX - dragFrom.x;
    const dy = event.clientY - dragFrom.y;
    if (!dragFrom.moved && Math.hypot(dx, dy) < DRAG_PX) return;
    dragFrom.moved = true;
    dragFrom.x = event.clientX;
    dragFrom.y = event.clientY;
    if (camera().movesCamera) camera().orbit(-dx * ORBIT_PER_PX, dy * PITCH_PER_PX);
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
