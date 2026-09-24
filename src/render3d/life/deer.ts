// Ciervos libres: vida escénica de paso fijo, sin escribir en GameState.
// La caza y su alimento siguen siendo decisión del motor; aquí se ve a los
// cazadores acercarse y al animal reaccionar, sin inventar una presa cobrada.

import { hash32 } from '@engine/rng';
import { FORAGE } from '@engine/balance';
import { ratioOf } from '@engine/crossroads/conditions';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { fellingTarget } from '@engine/world/forest';
import type { Animal } from '@derive/animals';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP } from './clock';
import { reachableNear, canReach } from './terrain';

// Los lobos de montaña ocupan 30_000..; Fauna indexa por id entre especies.
const DEER_ID = 40_000;
// TUNE: dos ciervos (~6 000 triángulos en total), fuera del pueblo.
const MAX_DEER = 2;
// Un ciervo no pasta junto a una casa y sale antes de que alguien lo alcance.
const VILLAGE_CLEARANCE = 12;
const BUILDING_CLEARANCE = 8;
const PERSON_ALARM = 7;
const HUNTER_ALARM = 11;
const WOLF_ALARM = 9;
const RADIUS = 0.34;

export interface Deer {
  readonly body: Body;
  readonly home: Point;
  readonly pasture: readonly Point[];
  target: Point;
  nextChoice: number;
  nextAlarm: number;
  fleeingUntil: number;
  choices: number;
}

function clearLine(land: Terrain, from: Point, to: Point): boolean {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  for (let step = 0; step <= Math.ceil(distance * 4); step += 1) {
    const t = step / Math.max(1, Math.ceil(distance * 4));
    if (!fitsCircle(land, from.x + (to.x - from.x) * t,
      from.z + (to.z - from.z) * t, RADIUS)) return false;
  }
  return true;
}

/** Pastos a la linde del bosque que usa la caza real, en la misma orilla. */
export function createDeer(state: GameState, land: Terrain, seed: number, heart: Point): Deer[] {
  if (ratioOf(state, 'forestLeft') < FORAGE.MIN_FOREST) return [];
  const tree = fellingTarget(state);
  if (tree === null) return [];
  const treeAt = { x: tree % land.width + 0.5, z: Math.floor(tree / land.width) + 0.5 };
  const shore = reachableNear(land, heart);
  const buildings = state.buildings.filter(building => building.lostTick === null);
  const spots: Point[] = [];
  for (let z = Math.max(1, Math.floor(treeAt.z) - 20); z <= Math.min(land.height - 2, Math.floor(treeAt.z) + 20); z += 1) {
    for (let x = Math.max(1, Math.floor(treeAt.x) - 20); x <= Math.min(land.width - 2, Math.floor(treeAt.x) + 20); x += 1) {
      const distance = Math.hypot(x + 0.5 - treeAt.x, z + 0.5 - treeAt.z);
      if (distance < 2 || distance > 20) continue;
      if (state.map.terrain[z * land.width + x] !== TERRAIN_CODE.meadow) continue;
      const at = { x: x + 0.5, z: z + 0.5 };
      if (Math.hypot(at.x - heart.x, at.z - heart.z) < VILLAGE_CLEARANCE
        || buildings.some(building => {
          const dx = Math.max(building.x - at.x, 0, at.x - building.x - building.w);
          const dz = Math.max(building.y - at.z, 0, at.z - building.y - building.h);
          return Math.hypot(dx, dz) < BUILDING_CLEARANCE;
        })) continue;
      if (canReach(land, shore, at) && fitsCircle(land, at.x, at.z, RADIUS)) spots.push(at);
    }
  }
  // Misma semilla, mismos animales; variar el día cambia su prado sin tocar el RNG del motor.
  spots.sort((a, b) => hash32(seed, `deer:${a.x}:${a.z}`) - hash32(seed, `deer:${b.x}:${b.z}`));
  const chosen: Point[] = [];
  for (const spot of spots) {
    if (chosen.some(other => Math.hypot(other.x - spot.x, other.z - spot.z) < 4)) continue;
    chosen.push(spot);
    if (chosen.length === MAX_DEER) break;
  }
  return chosen.map((home, index) => {
    const pasture = spots.filter(spot => Math.hypot(spot.x - home.x, spot.z - home.z) <= 3.5
      && clearLine(land, home, spot));
    return {
      body: { id: DEER_ID + index, x: home.x, z: home.z, vx: 0, vz: 0,
        facing: 0, radius: RADIUS, pace: 0.72 },
      home, pasture, target: home, nextChoice: 60 + index * 45,
      nextAlarm: 0,
      fleeingUntil: 0, choices: 0,
    };
  });
}

function escape(deer: Deer, threat: Point, land: Terrain): Point | null {
  const { body } = deer;
  const away = Math.atan2(body.z - threat.z, body.x - threat.x);
  for (const distance of [5, 4, 3]) {
    for (const turn of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4]) {
      const at = { x: body.x + Math.cos(away + turn) * distance,
        z: body.z + Math.sin(away + turn) * distance };
      if (clearLine(land, body, at)) return at;
    }
  }
  return null;
}

export function stepDeer(
  deer: readonly Deer[], land: Terrain, seed: number, step: number,
  people: readonly { readonly body: Point; readonly dayPlan?: { readonly job: { readonly place: string } | null } }[],
  wolf: Point | null,
  bear: Point | null = null,
): void {
  for (const animal of deer) {
    const { body } = animal;
    let alarmAt: Point | undefined;
    let alarmRatio = 1;
    for (const person of people) {
      const radius = person.dayPlan?.job?.place.startsWith('hunt:') ? HUNTER_ALARM : PERSON_ALARM;
      const ratio = Math.hypot(body.x - person.body.x, body.z - person.body.z) / radius;
      if (ratio < alarmRatio) { alarmRatio = ratio; alarmAt = person.body; }
    }
    const wolfDistance = wolf === null ? Infinity : Math.hypot(body.x - wolf.x, body.z - wolf.z);
    const bearDistance = bear === null ? Infinity : Math.hypot(body.x - bear.x, body.z - bear.z);
    let threat: Point | undefined = alarmAt;
    if (wolf !== null && wolfDistance < WOLF_ALARM && wolfDistance / WOLF_ALARM < alarmRatio) {
      threat = wolf;
      alarmRatio = wolfDistance / WOLF_ALARM;
    }
    if (bear !== null && bearDistance < WOLF_ALARM && bearDistance / WOLF_ALARM < alarmRatio) {
      threat = bear;
    }
    if (threat !== undefined && step >= animal.nextAlarm) {
      const target = escape(animal, threat, land);
      if (target !== null) {
        animal.target = target;
        animal.fleeingUntil = step + 150;
        animal.nextChoice = animal.fleeingUntil;
      }
      animal.nextAlarm = step + 10;
    }
    if (threat === undefined && step >= animal.nextChoice) {
      const choices = animal.pasture.filter(point => clearLine(land, body, point));
      const index = choices.length === 0 ? -1 : hash32(seed, `graze:${body.id}:${animal.choices}`) % choices.length;
      animal.target = index < 0 ? animal.home : choices[index]!;
      animal.choices += 1;
      animal.nextChoice = step + 100 + hash32(seed, `rest:${body.id}:${animal.choices}`) % 100;
    }
    const distance = Math.hypot(animal.target.x - body.x, animal.target.z - body.z);
    const moving = distance > 0.3;
    const speed = moving ? (step < animal.fleeingUntil ? 1.35 : body.pace) : 0;
    body.vx = speed * (animal.target.x - body.x) / Math.max(distance, 1e-6);
    body.vz = speed * (animal.target.z - body.z) / Math.max(distance, 1e-6);
    if (moving) {
      integrate(body, land, LIFE_STEP);
      turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
    } else { body.vx = 0; body.vz = 0; }
  }
}

export function deerPositions(deer: readonly Deer[]): Animal[] {
  return deer.map(animal => ({ id: animal.body.id, kind: 'deer', x: animal.body.x, y: animal.body.z,
    action: Math.hypot(animal.body.vx, animal.body.vz) > 0.01 ? 'walk' : undefined }));
}
