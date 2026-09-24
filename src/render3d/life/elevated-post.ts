// E3a · La ruta privada que une el suelo con el puesto del bastión.
//
// La escalera sigue cerrada en `terrain.ts`: esta polilínea sólo la puede usar
// quien ya fue asignado a este puesto. Separarla de la máscara evita que un
// acceso de guardia convierta por accidente la huella en un camino público.

import type { BastionAccess } from '@derive/bastion-access';
import type { ElevatedRing } from '@derive/elevated-ring';
import { fitsCircle, type Point, type Terrain } from './body';
import { canReach } from './terrain';

/** La misma huella que ocupa un aldeano en el suelo. */
export const ELEVATED_POST_RADIUS = 0.32;
/** Cota aprobada del suelo de plataforma; 1,36 son almenas, no suelo. */
export const ELEVATED_POST_HEIGHT = 1.02;
/** El candidato G-27 tiene exactamente catorce peldaños. */
export const ELEVATED_POST_STEPS = 14;

export interface ElevatedPoint extends Point { readonly y: number }

/**
 * Ruta local ya puesta en el mundo. `climb` sigue arista vertical y huella
 * horizontal, de modo que no dibuja una diagonal que atraviese los peldaños.
 */
export interface ElevatedPost {
  /** La orientación canónica que eligió el selector; no se vuelve a inferir. */
  readonly access: BastionAccess;
  readonly approach: ElevatedPoint;
  readonly foot: ElevatedPoint;
  readonly supports: readonly ElevatedPoint[];
  readonly exit: ElevatedPoint;
  readonly post: ElevatedPoint;
  readonly climb: readonly ElevatedPoint[];
  readonly descent: readonly ElevatedPoint[];
}

/** Resultado de avanzar sin superar la velocidad dada, incluso al cruzar aristas. */
export interface ElevatedAdvance {
  readonly at: ElevatedPoint;
  readonly next: number;
  readonly arrived: boolean;
}

function angleOf(access: BastionAccess): number {
  if (access.x === 1) return Math.PI / 2;
  if (access.x === -1) return -Math.PI / 2;
  return access.z === -1 ? Math.PI : 0;
}

/** La transformación cardinal del README, alrededor del centro lógico (0,5; 0,5). */
function worldPoint(origin: Point, access: BastionAccess, x: number, z: number, y: number): ElevatedPoint {
  const angle = angleOf(access);
  const u = x - 0.5, v = z - 0.5;
  return {
    x: origin.x + 0.5 + u * Math.cos(angle) + v * Math.sin(angle),
    z: origin.z + 0.5 - u * Math.sin(angle) + v * Math.cos(angle),
    y,
  };
}

/**
 * La ruta exacta de G-27 para un bastión cuyo origen es su esquina lógica.
 * No consulta el terreno: así las cuatro orientaciones se pueden falsar sin
 * Three, física ni una partida del motor.
 */
export function elevatedPostRoute(origin: Point, access: BastionAccess, approachY = 0,
  stairShift = 0): ElevatedPost {
  const point = (x: number, z: number, y: number) => worldPoint(origin, access, x, z, y);
  // La fuente ancla66 separa la escalera del retorno diagonal. Su acceso
  // comparte el pie; E3a conserva sus puntos anteriores con desplazamiento 0.
  const approach = point(0.5, stairShift === 0 ? 2.4 : 2 + stairShift, approachY);
  const foot = point(0.5, 2 + stairShift, 0);
  const supports = Array.from({ length: ELEVATED_POST_STEPS }, (_, index) => {
    const step = index + 1;
    return point(0.5, 2 + stairShift - (step - 0.5) / ELEVATED_POST_STEPS,
      step * ELEVATED_POST_HEIGHT / ELEVATED_POST_STEPS);
  });
  const climb: ElevatedPoint[] = [approach, foot];
  for (let step = 1; step <= ELEVATED_POST_STEPS; step += 1) {
    const z = 2 + stairShift - (step - 1) / ELEVATED_POST_STEPS;
    const after = step * ELEVATED_POST_HEIGHT / ELEVATED_POST_STEPS;
    climb.push(point(0.5, z, after));
    climb.push(point(0.5, 2 + stairShift - step / ELEVATED_POST_STEPS, after));
  }
  const exit = point(0.5, 1 + stairShift, ELEVATED_POST_HEIGHT);
  const post = point(0.5, 0.58, ELEVATED_POST_HEIGHT);
  climb.push(exit, post);
  return { access, approach, foot, supports, exit, post, climb, descent: [...climb].reverse() };
}

/** La misma transformación cardinal de E3a, aplicada al giro certificado de E3b. */
function walkwayPoint(origin: Point, access: BastionAccess, x: number, z: number): ElevatedPoint {
  return worldPoint(origin, access, x, z, ELEVATED_POST_HEIGHT);
}

/**
 * Ruta privada desde la escalera del bastión hasta el centro del segundo tramo
 * recto. Sólo describe el giro aprobado: el selector decide si existen ambos.
 */
export function elevatedWallRoute(origin: Point, access: BastionAccess, approachY = 0): ElevatedPost {
  const stair = elevatedPostRoute(origin, access, approachY);
  const walkway = [
    walkwayPoint(origin, access, 0.5, 0.72),
    walkwayPoint(origin, access, 0.95, 0.72),
    walkwayPoint(origin, access, 1.2, 0.79),
    walkwayPoint(origin, access, 1.5, 0.79),
    walkwayPoint(origin, access, 2.5, 0.79),
  ];
  const climb = [...stair.climb.slice(0, -1), ...walkway];
  const post = walkway.at(-1)!;
  return { ...stair, post, climb, descent: [...climb].reverse() };
}

/** Un circuito privado completo; sólo se ofrece cuando toda su geometría está aprobada. */
export function elevatedRingCircuit(stair: ElevatedPost, ring: ElevatedRing): ElevatedPost | null {
  if (!ring.geometryReady || !ring.topologyClosed || ring.route.length < 4) return null;
  const first = ring.route[0]!, last = ring.route.at(-1)!;
  const joins = (point: ElevatedPoint): boolean =>
    Math.hypot(point.x - stair.post.x, point.z - stair.post.z, point.y - stair.post.y) < 0.02;
  if (!joins(first) || !joins(last)) return null;
  for (let index = 1; index < ring.route.length; index += 1) {
    const before = ring.route[index - 1]!, after = ring.route[index]!;
    const length = Math.hypot(after.x - before.x, after.z - before.z, after.y - before.y);
    if (!Number.isFinite(length) || length > Math.SQRT2 + 0.1 || length < 0.01) return null;
  }
  const climb = [...stair.climb, ...ring.route.slice(1)];
  return { ...stair, post: last, climb, descent: [...climb].reverse() };
}

/**
 * Un puesto elevado existe sólo cuando el disco cabe y llega al punto exterior
 * de entrada. Desde ahí el guardia abandona el router de suelo y toma la ruta
 * privada; exigir que la máscara global contenga la escalera la haría pública
 * o negaría todos los bastiones por diseño.
 */
export function elevatedPostOf(
  land: Terrain, reach: Uint8Array | undefined, origin: Point, access: BastionAccess,
  ground?: (x: number, z: number) => number,
  stairShift = 0,
): ElevatedPost | null {
  const flat = elevatedPostRoute(origin, access, 0, stairShift);
  const approachY = ground?.(flat.approach.x, flat.approach.z) ?? 0;
  const footY = ground?.(flat.foot.x, flat.foot.z) ?? 0;
  // El GLB está anclado a cero: una ladera no se compensa sumándola a la
  // plataforma. La entrada admite como máximo media contrahuella: es el
  // límite geométrico derivado de los 14 peldaños, no una cota inventada.
  if (!Number.isFinite(approachY) || !Number.isFinite(footY)
    || Math.abs(approachY) > ELEVATED_POST_HEIGHT / (ELEVATED_POST_STEPS * 2)
    || Math.abs(footY) > ELEVATED_POST_HEIGHT / (ELEVATED_POST_STEPS * 2)) return null;
  const route = elevatedPostRoute(origin, access, approachY, stairShift);
  if (!fitsCircle(land, route.approach.x, route.approach.z, ELEVATED_POST_RADIUS)) return null;
  if (reach !== undefined && !canReach(land, reach, route.approach)) return null;
  return route;
}

/** Avanza por una ruta privada sin saltar aristas ni rebasar `pace × seconds`. */
export function advanceElevated(
  at: ElevatedPoint, route: readonly ElevatedPoint[], next: number, pace: number, seconds: number,
): ElevatedAdvance {
  let current = at, index = next, left = Math.max(0, pace) * Math.max(0, seconds);
  while (index < route.length) {
    const target = route[index]!;
    const distance = Math.hypot(target.x - current.x, target.z - current.z, target.y - current.y);
    if (distance <= 1e-9) { current = target; index += 1; continue; }
    if (left < distance) {
      const part = left / distance;
      return { at: { x: current.x + (target.x - current.x) * part, z: current.z + (target.z - current.z) * part, y: current.y + (target.y - current.y) * part }, next: index, arrived: false };
    }
    current = target;
    left -= distance;
    index += 1;
  }
  return { at: current, next: index, arrived: true };
}
