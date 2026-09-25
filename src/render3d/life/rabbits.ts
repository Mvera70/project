// El valle más vivo (25 sep 2026) · Conejos en la linde del bosque.
//
// Hasta aquí el conejo sólo salía en la caza (`wild-prey.ts`): una presa que
// aparece cuando alguien va a por ella. Lo que faltaba es el animal de paso,
// el que se ve sin buscarlo: unos pocos conejos que salen del bosque al prado
// al alba y al atardecer, mordisquean a saltos y corren a la espesura en cuanto
// alguien se acerca. Como los ciervos (`deer.ts`): paso fijo, sin escribir en
// `GameState` y sin azar del motor; la variación sale de un hash de la jornada.

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import type { Animal } from '@derive/animals';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP } from './clock';
import { canReach, reachableNear } from './terrain';

/** Fuera del hueco de la presa de caza (42 000..42 002) y de los ciervos (40 000..). */
const RABBIT_ID = 43_000;
/**
 * TUNE: tres conejos. Son pequeños —se leen de cerca— y con más la linde
 * parece una granja; con uno pasan desapercibidos.
 */
const MAX_RABBITS = 3;
/** Lejos del corro de casas, como el ciervo: no pastan junto a una puerta. */
const VILLAGE_CLEARANCE = 10;
const BUILDING_CLEARANCE = 5;
/** A cuánto de una persona echan a correr, en celdas. */
const ALARM = 4;
const RADIUS = 0.22;
/** Paseando a saltos y huyendo, en celdas por segundo. */
const HOP_PACE = 0.8;
const FLEE_PACE = 2.4;
/**
 * Cuándo están fuera, en fase de jornada: del alba a media mañana y de media
 * tarde al anochecer, que es cuando sale el conejo. A mediodía y de noche, en
 * la madriguera. TUNE: 0,14–0,34 y 0,62–0,8.
 */
const OUT: readonly (readonly [number, number])[] = [[0.14, 0.34], [0.62, 0.8]];

export interface Rabbit {
  readonly body: Body;
  readonly home: Point;
  readonly range: readonly Point[];
  target: Point;
  nextChoice: number;
  fleeingUntil: number;
  choices: number;
  out: boolean;
}

/** Si a esta hora los conejos están fuera de la madriguera. */
export function rabbitsOut(phase: number): boolean {
  return OUT.some(([from, to]) => phase >= from && phase <= to);
}

function clearLine(land: Terrain, from: Point, to: Point): boolean {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(distance * 4));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    if (!fitsCircle(land, from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, RADIUS)) return false;
  }
  return true;
}

/** El prado que linda con el bosque: una celda de hierba con árboles al lado. */
export function edgeOfWood(state: GameState, x: number, z: number): boolean {
  const { width, height, terrain } = state.map;
  if (terrain[z * width + x] !== TERRAIN_CODE.meadow) return false;
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      if (terrain[nz * width + nx] === TERRAIN_CODE.forest) return true;
    }
  }
  return false;
}

export function createRabbits(state: GameState, land: Terrain, seed: number, heart: Point): Rabbit[] {
  const shore = reachableNear(land, heart);
  const buildings = state.buildings.filter(building => building.lostTick === null);
  const spots: Point[] = [];
  for (let z = 1; z < land.height - 1; z += 1) {
    for (let x = 1; x < land.width - 1; x += 1) {
      if (!edgeOfWood(state, x, z)) continue;
      const at = { x: x + 0.5, z: z + 0.5 };
      if (Math.hypot(at.x - heart.x, at.z - heart.z) < VILLAGE_CLEARANCE) continue;
      if (buildings.some(building => {
        const dx = Math.max(building.x - at.x, 0, at.x - building.x - building.w);
        const dz = Math.max(building.y - at.z, 0, at.z - building.y - building.h);
        return Math.hypot(dx, dz) < BUILDING_CLEARANCE;
      })) continue;
      if (canReach(land, shore, at) && fitsCircle(land, at.x, at.z, RADIUS)) spots.push(at);
    }
  }
  // Cerca del pueblo antes que lejos: un conejo al fondo del mapa no lo ve nadie.
  // El hash desempata, y cambia de prado cada jornada sin tocar el azar del motor.
  const score = (at: Point): number => Math.hypot(at.x - heart.x, at.z - heart.z) * 1000
    + hash32(seed, `rabbit:${at.x}:${at.z}`) % 6000;
  spots.sort((a, b) => score(a) - score(b));
  const chosen: Point[] = [];
  for (const spot of spots) {
    if (chosen.some(other => Math.hypot(other.x - spot.x, other.z - spot.z) < 5)) continue;
    chosen.push(spot);
    if (chosen.length === MAX_RABBITS) break;
  }
  return chosen.map((home, index) => ({
    body: { id: RABBIT_ID + index, x: home.x, z: home.z, vx: 0, vz: 0, facing: 0, radius: RADIUS, pace: HOP_PACE },
    home,
    range: spots.filter(spot => Math.hypot(spot.x - home.x, spot.z - home.z) <= 3 && clearLine(land, home, spot)),
    target: home,
    nextChoice: 30 + index * 40,
    fleeingUntil: 0,
    choices: 0,
    out: false,
  }));
}

function escape(rabbit: Rabbit, threat: Point, land: Terrain): Point | null {
  const { body } = rabbit;
  const away = Math.atan2(body.z - threat.z, body.x - threat.x);
  for (const distance of [4, 3, 2]) {
    for (const turn of [0, 0.5, -0.5, 1, -1, 1.5, -1.5]) {
      const at = { x: body.x + Math.cos(away + turn) * distance, z: body.z + Math.sin(away + turn) * distance };
      if (clearLine(land, body, at)) return at;
    }
  }
  return null;
}

export function stepRabbits(
  rabbits: readonly Rabbit[], land: Terrain, seed: number, step: number, phase: number,
  people: readonly { readonly body: Point }[],
): void {
  const out = rabbitsOut(phase);
  for (const rabbit of rabbits) {
    const { body } = rabbit;
    // Vuelve a salir por donde vive: la madriguera no se mueve con el conejo.
    if (out && !rabbit.out) { body.x = rabbit.home.x; body.z = rabbit.home.z; rabbit.target = rabbit.home; }
    rabbit.out = out;
    if (!out) { body.vx = 0; body.vz = 0; continue; }
    let threat: Point | null = null;
    let nearest = ALARM;
    for (const person of people) {
      const gap = Math.hypot(body.x - person.body.x, body.z - person.body.z);
      if (gap < nearest) { nearest = gap; threat = person.body; }
    }
    if (threat !== null && step >= rabbit.fleeingUntil) {
      const target = escape(rabbit, threat, land);
      if (target !== null) {
        rabbit.target = target;
        rabbit.fleeingUntil = step + 90;
        rabbit.nextChoice = rabbit.fleeingUntil + 60;
      }
    }
    if (threat === null && step >= rabbit.nextChoice) {
      const choices = rabbit.range.filter(point => clearLine(land, body, point));
      const index = choices.length === 0 ? -1 : hash32(seed, `hop:${body.id}:${rabbit.choices}`) % choices.length;
      rabbit.target = index < 0 ? rabbit.home : choices[index]!;
      rabbit.choices += 1;
      // Un saltito y a comer: paradas largas, que es lo que hace un conejo.
      rabbit.nextChoice = step + 120 + hash32(seed, `nibble:${body.id}:${rabbit.choices}`) % 160;
    }
    const distance = Math.hypot(rabbit.target.x - body.x, rabbit.target.z - body.z);
    const moving = distance > 0.15;
    const speed = moving ? (step < rabbit.fleeingUntil ? FLEE_PACE : HOP_PACE) : 0;
    body.vx = speed * (rabbit.target.x - body.x) / Math.max(distance, 1e-6);
    body.vz = speed * (rabbit.target.z - body.z) / Math.max(distance, 1e-6);
    if (moving) {
      integrate(body, land, LIFE_STEP);
      turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
    } else { body.vx = 0; body.vz = 0; }
  }
}

export function rabbitPositions(rabbits: readonly Rabbit[], step: number): Animal[] {
  return rabbits.filter(rabbit => rabbit.out).map(rabbit => ({
    id: rabbit.body.id, kind: 'rabbit' as const, x: rabbit.body.x, y: rabbit.body.z,
    action: step < rabbit.fleeingUntil && Math.hypot(rabbit.body.vx, rabbit.body.vz) > 0.01 ? 'flee' as const
      : Math.hypot(rabbit.body.vx, rabbit.body.vz) > 0.01 ? 'walk' as const : undefined,
  }));
}
