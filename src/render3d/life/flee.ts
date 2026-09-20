// E1 · La huida civil durante un asalto. design.md §1b y encargo-combate.md.
//
// Es una reacción efímera de la jornada: el motor ya decidió que el clan entró;
// esta capa sólo hace visible que quien no defiende busca refugio. No escribe en
// GameState, no inventa víctimas y no atraviesa paredes para conseguirlo.

import { hash32 } from '@engine/rng';
import { gap, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import type { Neighbourhood } from './grid';
import { clearBetween, follow, pathTo, type Waypoint } from './navigate';
import { nearestReachable, reachableFrom } from './terrain';
import { drive, separate } from './steering';
import { LIFE_STEP } from './clock';

export interface Flight {
  readonly since: number;
  readonly target: Point;
  route: Waypoint[];
  sheltered: boolean;
}

/**
 * TUNE visual: seis celdas. Es una carrera legible desde el portón sin mandar
 * a media aldea al extremo del mapa; una celda son tres metros.
 */
export const FLEE_DISTANCE = 6;

/**
 * TUNE visual: 1,55 veces el paso propio. `drive` ya limita cualquier cuerpo a
 * 1,6, así que correr no abre una velocidad nueva capaz de saltarse paredes.
 */
export const FLEE_PACE = 1.55;

/** TUNE: el mismo alcance con el que `follow` da por terminado un tramo. */
export const FLEE_REACHED = 0.45;

function routeTo(body: Body, land: Terrain, target: Point, threat: Point): Waypoint[] | null {
  const route = pathTo(land, body, target, body.radius);
  if (route === null || route.length === 0) return null;
  const first = route.find((point) => gap(point, body) > 0.1);
  if (first === undefined) return null;
  const towardX = threat.x - body.x;
  const towardZ = threat.z - body.z;
  const firstX = first.x - body.x;
  const firstZ = first.z - body.z;
  // Una casa más lejana no sirve si para alcanzarla el primer paso corre
  // directamente hacia quien acaba de entrar.
  if (firstX * towardX + firstZ * towardZ > 0) return null;
  // Tampoco se acepta un rodeo que pase más cerca de la amenaza que el punto
  // de partida. No es un buscador nuevo: sólo descarta una ruta A* insegura.
  const safeGap = gap(body, threat) - 0.25;
  if (route.some((point) => gap(point, threat) < safeGap)) return null;
  return route;
}

/**
 * Empieza una huida hacia casa si la casa queda realmente más lejos de la
 * amenaza. Si no, busca suelo alcanzable en el lado opuesto. Todo desempate
 * sale de ids y semilla de jornada: reconstruir el día reconstruye la carrera.
 */
export function beginFlight(
  body: Body,
  land: Terrain,
  threat: Point,
  shelter: Point | undefined,
  seed: number,
  step: number,
): Flight | null {
  if (shelter !== undefined && gap(shelter, threat) > gap(body, threat) + 0.25) {
    const homeward = routeTo(body, land, shelter, threat);
    if (homeward !== null) {
      return { since: step, target: shelter, route: homeward, sheltered: false };
    }
  }

  let awayX = body.x - threat.x;
  let awayZ = body.z - threat.z;
  let length = Math.hypot(awayX, awayZ);
  if (length < 1e-6) {
    const angle = (hash32(seed, `flight:${body.id}`) / 4_294_967_296) * Math.PI * 2;
    awayX = Math.sin(angle);
    awayZ = Math.cos(angle);
    length = 1;
  }
  const base = Math.atan2(awayX, awayZ);
  const reach = reachableFrom(land, body);
  let best: { target: Point; route: Waypoint[]; safety: number } | null = null;

  // El frente puede estar cerrado por una casa. Se prueban abanicos del lado
  // seguro, nunca el lado que apunta de vuelta al atacante.
  for (const offset of [0, -Math.PI / 4, Math.PI / 4, -Math.PI / 2, Math.PI / 2]) {
    const wanted = {
      x: body.x + Math.sin(base + offset) * FLEE_DISTANCE,
      z: body.z + Math.cos(base + offset) * FLEE_DISTANCE,
    };
    const target = nearestReachable(land, reach, wanted, body.radius);
    if (target === null) continue;
    const route = routeTo(body, land, target, threat);
    if (route === null) continue;
    const safety = gap(target, threat);
    if (safety <= gap(body, threat) + 0.25 || (best !== null && safety <= best.safety)) continue;
    best = { target, route, safety };
  }
  return best === null
    ? null
    : { since: step, target: best.target, route: best.route, sheltered: false };
}

/**
 * Un paso de carrera. Devuelve si avanzó de verdad, para que el reparto nunca
 * enseñe `flee` mientras el cuerpo está quieto en el refugio.
 */
export function stepFlight(
  body: Body,
  flight: Flight,
  land: Terrain,
  around: Neighbourhood,
): boolean {
  if (flight.sheltered) {
    body.vx = 0;
    body.vz = 0;
    return false;
  }

  const next = follow(body, flight.route, FLEE_REACHED);
  if (next === null) {
    flight.sheltered = true;
    body.vx = 0;
    body.vz = 0;
    return false;
  }

  const distance = gap(body, next);
  const pace = Math.min(body.pace * FLEE_PACE, distance / LIFE_STEP);
  const want = distance <= 1e-9 ? { x: 0, z: 0 } : {
    x: (next.x - body.x) / distance * pace,
    z: (next.z - body.z) / distance * pace,
  };
  const push = separate(body, around);
  const norm = Math.hypot(want.x, want.z);
  const along = norm > 0 ? (push.x * want.x + push.z * want.z) / (norm * norm) : 0;
  const before = { x: body.x, z: body.z };
  drive(body, {
    x: want.x + (push.x - want.x * along) * 0.25,
    z: want.z + (push.z - want.z * along) * 0.25,
  });
  if (!clearBetween(land, body,
    { x: body.x + body.vx * LIFE_STEP, z: body.z + body.vz * LIFE_STEP }, body.radius)) {
    body.vx = want.x;
    body.vz = want.z;
  }
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  integrate(body, land, LIFE_STEP);
  return gap(before, body) > 1e-6;
}
