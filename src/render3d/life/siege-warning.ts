// E0b · El aviso se vive en el terreno, sin escribir en el motor.

import { gap, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import type { Neighbourhood } from './grid';
import { follow, pathTo, type Waypoint } from './navigate';
import { drive, separate } from './steering';
import { LIFE_STEP } from './clock';

/** La tarea efímera de quien vuelve con el aviso antes de la reunión. */
export interface SiegeWarning {
  readonly since: number;
  /** Desde qué punto exterior empezó el regreso, para la traza. */
  readonly origin: Point;
  /** Regreso al núcleo, siempre por suelo alcanzable. */
  route: Waypoint[];
  phase: 'return';
}

/** El aviso sólo nace de la decisión B2 resuelta en este tick, nunca de la amenaza sola. */
export function warningActive(
  decisionId: string | null | undefined,
  tick: number,
  comingTick: number | null,
): boolean {
  return decisionId === 'raiders_coming' && comingTick !== null && tick < comingTick;
}

/**
 * Devuelve el punto exterior de la entrada real que puede volver al núcleo.
 */
export function lookoutOf(land: Terrain, approach: Point, village: Point): Point | null {
  const dx = approach.x - village.x;
  const dz = approach.z - village.z;
  const length = Math.hypot(dx, dz);
  if (length <= 1e-6) return null;
  const ux = dx / length;
  const uz = dz / length;
  const wanted = length * 0.78;
  let best: { readonly at: Point; readonly score: number } | null = null;

  for (let z = 0; z < land.height; z += 1) {
    for (let x = 0; x < land.width; x += 1) {
      const at = { x: x + 0.5, z: z + 0.5 };
      const along = (at.x - village.x) * ux + (at.z - village.z) * uz;
      const across = Math.abs((at.x - village.x) * uz - (at.z - village.z) * ux);
      // TUNE visual: dos celdas mantienen la silueta en el corredor aunque una
      // casa obligue al camino a abrirse un poco; no inventa otro acceso.
      if (along <= length / 2 || along >= length || across > 2) continue;
      if (gap(at, approach) >= gap(at, village)) continue;
      const back = pathTo(land, at, village);
      if (back === null) continue;
      const score = Math.abs(along - wanted) + across * 0.25;
      if (best === null || score < best.score) best = { at, score };
    }
  }
  return best?.at ?? null;
}

/**
 * Reconstruye el primer estado visible tras cerrar la decisión: el tramo de
 * salida estaba tapado por la modal, así que el cuerpo nace efímeramente en el
 * corredor real y desde ahí sólo tiene una vuelta que vivir.
 */
export function beginWarning(
  body: Body, land: Terrain, approach: Point, village: Point, step: number,
): SiegeWarning | null {
  const origin = lookoutOf(land, approach, village);
  if (origin === null) return null;
  const homeward = pathTo(land, origin, village, body.radius);
  if (homeward === null) return null;
  body.x = origin.x;
  body.z = origin.z;
  body.vx = 0;
  body.vz = 0;
  return {
    since: step,
    origin: { x: body.x, z: body.z },
    route: homeward,
    phase: 'return',
  };
}

function move(body: Body, route: Waypoint[], land: Terrain, around: Neighbourhood): boolean {
  const next = follow(body, route);
  if (next === null) {
    body.vx = 0;
    body.vz = 0;
    return false;
  }
  const distance = gap(body, next);
  const want = distance <= 1e-9 ? { x: 0, z: 0 } : {
    x: (next.x - body.x) / distance * Math.min(body.pace, distance / LIFE_STEP),
    z: (next.z - body.z) / distance * Math.min(body.pace, distance / LIFE_STEP),
  };
  const push = separate(body, around);
  drive(body, { x: want.x + push.x * 0.25, z: want.z + push.z * 0.25 });
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  integrate(body, land, LIFE_STEP);
  return true;
}

/** Vive el regreso continuo hacia el núcleo, sin paseo ni espera de salida. */
export function stepWarning(
  body: Body, warning: SiegeWarning, land: Terrain, around: Neighbourhood,
): boolean {
  if (warning.route.length === 0 || !move(body, warning.route, land, around)) return false;
  return true;
}
