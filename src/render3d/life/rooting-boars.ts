// v5.85 · Los jabalíes de otoño. Vera, 2 oct 2026: «jabalíes al
// robledal/bosque en otoño» — la montanera, cuando la bellota cae y el jabalí
// sale a hozar a la linde.
//
// No son la presa de la caza (`wild-prey.ts`, id 42 002): ésa la decide la
// caza del motor y aparece cuando alguien va a por ella. Éstos son paisaje,
// como los ciervos (`deer.ts`) y los conejos (`rabbits.ts`): paso fijo, sin
// escribir en `GameState`, sin azar del motor —la variación sale de un hash de
// la jornada— y sin embestir: un jabalí que hoza y ve gente se mete en el
// bosque. Cuántos hay lo dice `faunaSeason(state).boars` (dos en otoño,
// ninguno el resto del año).

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import type { Animal } from '@derive/animals';
import { faunaSeason } from '@derive/seasonal-fauna';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP } from './clock';
import { escapeFrom } from './wild-prey';
import { canReach, reachableNear } from './terrain';

/** Fuera de los ciervos (40 000..), la presa (42 000..), los conejos (43 000..) y el perro, el zorro, los patos y las mulas (44 000..). */
const BOAR_ID = 45_000;
/** El radio del jabalí de la caza (`wild-prey.ts`), para que quepa donde cabe aquél. */
const RADIUS = 0.38;
/** TUNE: lejos de la aldea como el ciervo (`deer.ts`): doce del corazón y ocho de cada casa. */
const VILLAGE_CLEARANCE = 12;
const BUILDING_CLEARANCE = 8;
/** TUNE: a cuánto de una persona se van al bosque. Lo que ya usa la presa para huir (siete). */
const ALARM = 7;
/** Hozando y huyendo, en celdas por segundo: el paso del jabalí de la caza y su carrera. */
const PACE = 0.5;
const FLEE_PACE = 1.2;
/**
 * TUNE: cuánto bosque quiere alrededor la celda donde hoza, en su cuadro de
 * siete: con seis o más es la linde de un bosque de verdad —el robledal— y no
 * un árbol suelto en el prado. **Y ninguno a dos celdas o menos**: en las
 * capturas, hozando pegado al árbol, la copa lo tapaba entero, y a una celda
 * todavía tapaba a la cría; a dos pasos de la linde se ven los dos.
 */
const WOODED = 6;
/** De dos celdas a ninguna: si ningún prado del valle cumple, se acerca de uno en uno. */
const CANOPY_GAPS = [2, 1, 0] as const;

export interface RootingBoar {
  readonly body: Body;
  readonly home: Point;
  readonly range: readonly Point[];
  target: Point;
  nextChoice: number;
  fleeingUntil: number;
  choices: number;
}

function woodedEdge(state: GameState, x: number, z: number, canopyGap: number): boolean {
  const { width, height, terrain } = state.map;
  if (terrain[z * width + x] !== TERRAIN_CODE.meadow) return false;
  let trees = 0;
  for (let dz = -3; dz <= 3; dz += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      if (terrain[nz * width + nx] !== TERRAIN_CODE.forest) continue;
      if (Math.abs(dx) <= canopyGap && Math.abs(dz) <= canopyGap) return false;
      trees += 1;
    }
  }
  return trees >= WOODED;
}

/**
 * TUNE: si hay bosque entre la celda y la cámara de reposo, que mira desde +x,
 * +z (`VIEW`, `camera.ts`): cuatro celdas en diagonal hacia ella. La tercera
 * captura lo enseñó: a dos celdas de la linde, el jabalí quedaba tapado por las
 * copas que tenía **delante**, entre él y quien mira, y no por las de al lado.
 */
const SCREEN_REACH = 4;

function screened(state: GameState, x: number, z: number): boolean {
  const { width, height, terrain } = state.map;
  for (let k = 1; k <= SCREEN_REACH; k += 1) {
    for (const [dx, dz] of [[k, k], [k - 1, k], [k, k - 1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx >= width || nz >= height) continue;
      if (terrain[nz * width + nx] === TERRAIN_CODE.forest) return true;
    }
  }
  return false;
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

/** Los jabalíes de hoy, en la linde del bosque más espeso y en la orilla de la aldea. */
export function createRootingBoars(state: GameState, land: Terrain, seed: number, heart: Point): RootingBoar[] {
  const wanted = faunaSeason(state).boars;
  if (wanted === 0) return [];
  const shore = reachableNear(land, heart);
  const buildings = state.buildings.filter((building) => building.lostTick === null);
  const spots: Point[] = [];
  for (const canopyGap of CANOPY_GAPS) {
    for (let z = 1; z < land.height - 1; z += 1) {
      for (let x = 1; x < land.width - 1; x += 1) {
        if (!woodedEdge(state, x, z, canopyGap)) continue;
        if (canopyGap > 0 && screened(state, x, z)) continue;
        const at = { x: x + 0.5, z: z + 0.5 };
        if (Math.hypot(at.x - heart.x, at.z - heart.z) < VILLAGE_CLEARANCE) continue;
        if (buildings.some((building) => Math.hypot(
          Math.max(building.x - at.x, 0, at.x - building.x - building.w),
          Math.max(building.y - at.z, 0, at.z - building.y - building.h)) < BUILDING_CLEARANCE)) continue;
        if (canReach(land, shore, at) && fitsCircle(land, at.x, at.z, RADIUS)) spots.push(at);
      }
    }
    if (spots.length > 0) break;
  }
  // Cerca del pueblo antes que lejos, como el conejo: un jabalí al fondo del
  // mapa no lo ve nadie. El hash cambia de linde cada jornada.
  const score = (at: Point): number => Math.hypot(at.x - heart.x, at.z - heart.z) * 1000
    + hash32(seed, `boar:${at.x}:${at.z}`) % 8000;
  spots.sort((a, b) => score(a) - score(b));
  const first = spots[0];
  if (first === undefined) return [];
  // Los dos juntos: la hembra y la cría del año van en piara, no cada uno a una linde.
  const range = spots.filter((spot) => Math.hypot(spot.x - first.x, spot.z - first.z) <= 4 && clearLine(land, first, spot));
  const homes = [first, ...range.filter((spot) => Math.hypot(spot.x - first.x, spot.z - first.z) >= 1)].slice(0, wanted);
  // Con la linde estrecha no hay otra celda en el corro: la cría va pegada a la
  // hembra, a un cuerpo de distancia, donde quepa. Sin esto, en seis valles de
  // ocho salía la hembra sola.
  for (const [dx, dz] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]] as const) {
    if (homes.length >= wanted) break;
    const at = { x: first.x + dx, z: first.z + dz };
    if (fitsCircle(land, at.x, at.z, RADIUS) && canReach(land, shore, at)) homes.push(at);
  }
  return homes.map((home, index) => ({
    body: { id: BOAR_ID + index, x: home.x, z: home.z, vx: 0, vz: 0, facing: 0, radius: RADIUS, pace: PACE },
    home, range, target: home, nextChoice: 50 + index * 70, fleeingUntil: 0, choices: 0,
  }));
}

export function stepRootingBoars(
  boars: readonly RootingBoar[], land: Terrain, seed: number, step: number,
  people: readonly { readonly body: Point }[],
): void {
  for (const boar of boars) {
    const { body } = boar;
    let threat: Point | null = null;
    let nearest = ALARM;
    for (const person of people) {
      const gap = Math.hypot(body.x - person.body.x, body.z - person.body.z);
      if (gap < nearest) { nearest = gap; threat = person.body; }
    }
    if (threat !== null && step >= boar.fleeingUntil) {
      boar.target = escapeFrom(body, boar.home, threat, land);
      boar.fleeingUntil = step + 150;
      boar.nextChoice = boar.fleeingUntil + 90;
    }
    if (threat === null && step >= boar.nextChoice) {
      const choices = boar.range.filter((point) => clearLine(land, body, point));
      const index = choices.length === 0 ? -1 : hash32(seed, `root:${body.id}:${boar.choices}`) % choices.length;
      boar.target = index < 0 ? boar.home : choices[index]!;
      boar.choices += 1;
      // Hozar es quedarse: paradas largas con el hocico en el suelo.
      boar.nextChoice = step + 180 + hash32(seed, `snout:${body.id}:${boar.choices}`) % 180;
    }
    const distance = Math.hypot(boar.target.x - body.x, boar.target.z - body.z);
    const moving = distance > 0.2;
    const speed = moving ? (step < boar.fleeingUntil ? FLEE_PACE : PACE) : 0;
    body.vx = speed * (boar.target.x - body.x) / Math.max(distance, 1e-6);
    body.vz = speed * (boar.target.z - body.z) / Math.max(distance, 1e-6);
    if (moving) {
      integrate(body, land, LIFE_STEP);
      turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
    } else { body.vx = 0; body.vz = 0; }
  }
}

/** TUNE: la cría del año, a tres cuartos de la hembra: en otoño ya no lleva rayas, pero se nota. */
const YEARLING = 0.75;

export function rootingBoarPositions(boars: readonly RootingBoar[]): Animal[] {
  return boars.map((boar, index) => ({ id: boar.body.id, kind: 'boar' as const, x: boar.body.x, y: boar.body.z,
    facing: boar.body.facing, ...(index > 0 ? { scale: YEARLING } : {}), action: Math.hypot(boar.body.vx, boar.body.vz) > 0.01 ? 'walk' as const : undefined }));
}
