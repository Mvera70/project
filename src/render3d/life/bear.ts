// La visita del oso se apoya en el suceso real `bear_in_the_wood`.
// Es una escena efímera: la moral y la crónica ya las decidió el motor.

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { fellingTarget } from '@engine/world/forest';
import type { Animal } from '@derive/animals';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP, stepOfPhase } from './clock';
import { canReach, reachableNear } from './terrain';

const BEAR_ID = 50_000;
// TUNE: un ejemplar, radio 0,52; sólo vive mientras dura el suceso.
const RADIUS = 0.52;
const PACE = 0.56;
const ALARM = 5;
const WARNING_STEPS = Math.round(1.55 / LIFE_STEP);
const VISIT_END = stepOfPhase(0.78);

export interface Bear {
  readonly body: Body;
  readonly den: Point;
  readonly clearing: Point;
  readonly pasture: readonly Point[];
  phase: 'approach' | 'forage' | 'warning' | 'retreat' | 'gone';
  target: Point;
  nextChoice: number;
  warningUntil: number;
  choices: number;
}

function clearLine(land: Terrain, from: Point, to: Point): boolean {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const segments = Math.max(1, Math.ceil(distance * 4));
  for (let n = 0; n <= segments; n += 1) {
    const t = n / segments;
    if (!fitsCircle(land, from.x + (to.x - from.x) * t,
      from.z + (to.z - from.z) * t, RADIUS)) return false;
  }
  return true;
}

/** Una linde visible y transitable cerca del bosque de caza, nunca en una casa. */
export function createBear(state: GameState, land: Terrain, heart: Point): Bear | null {
  // La guarida es el encuentro final: los avistamientos tempranos quedan en
  // la crónica, pero no adelantan una pelea antes de superar al jabalí.
  if (state.flags['hunt:boar'] !== 0 || state.flags['hunt:bear'] === 0
    || (state.flags['bear'] ?? -1) <= state.tick) return null;
  const tree = fellingTarget(state);
  if (tree === null) return null;
  const treeAt = { x: tree % land.width + 0.5, z: Math.floor(tree / land.width) + 0.5 };
  const shore = reachableNear(land, heart);
  const meadows: Point[] = [];
  const woods: Point[] = [];
  for (let z = Math.max(1, Math.floor(treeAt.z) - 14); z < Math.min(land.height - 1, Math.floor(treeAt.z) + 15); z++) {
    for (let x = Math.max(1, Math.floor(treeAt.x) - 14); x < Math.min(land.width - 1, Math.floor(treeAt.x) + 15); x++) {
      const at = { x: x + 0.5, z: z + 0.5 };
      if (Math.hypot(at.x - heart.x, at.z - heart.z) < 8
        || !canReach(land, shore, at) || !fitsCircle(land, at.x, at.z, RADIUS)) continue;
      const kind = state.map.terrain[z * land.width + x];
      if (kind === TERRAIN_CODE.meadow) meadows.push(at);
      else if (kind === TERRAIN_CODE.forest) woods.push(at);
    }
  }
  // Un claro a la linde y una entrada entre árboles, unidos por suelo real.
  let best: { clearing: Point; den: Point; score: number } | null = null;
  for (const clearing of meadows) {
    for (const den of woods) {
      const distance = Math.hypot(clearing.x - den.x, clearing.z - den.z);
      if (distance < 1.5 || distance > 5 || !clearLine(land, den, clearing)) continue;
      const fromTree = Math.hypot(clearing.x - treeAt.x, clearing.z - treeAt.z);
      const noise = hash32(state.terrainSeed, `bear:${clearing.x}:${clearing.z}:${den.x}:${den.z}`) / 4_294_967_296;
      const score = fromTree + Math.abs(distance - 3) * 0.4 + noise;
      if (best === null || score < best.score) best = { clearing, den, score };
    }
  }
  if (best === null) return null;
  const { clearing, den } = best;
  const pasture = meadows.filter(at => Math.hypot(at.x - clearing.x, at.z - clearing.z) < 3.5
    && clearLine(land, clearing, at));
  return {
    body: { id: BEAR_ID, x: den.x, z: den.z, vx: 0, vz: 0, facing: 0,
      radius: RADIUS, pace: PACE },
    den, clearing, pasture, phase: 'approach', target: clearing,
    nextChoice: 0, warningUntil: 0, choices: 0,
  };
}

/** Sale del bosque, hoza en el claro y se retira al ver gente. */
export function stepBear(bear: Bear, land: Terrain, seed: number, step: number,
  people: readonly { readonly body: Point }[]): void {
  if (bear.phase === 'gone') return;
  const { body } = bear;
  const nearPerson = people.some(person => Math.hypot(person.body.x - body.x,
    person.body.z - body.z) < ALARM);
  if (bear.phase !== 'warning' && bear.phase !== 'retreat' && nearPerson) {
    bear.phase = 'warning';
    bear.warningUntil = step + WARNING_STEPS;
    body.vx = 0; body.vz = 0;
  }
  if (bear.phase === 'warning') {
    body.vx = 0; body.vz = 0;
    if (step >= bear.warningUntil) {
      bear.phase = 'retreat';
      bear.target = bear.den;
    } else return;
  }
  if (step >= VISIT_END && bear.phase !== 'retreat') {
    bear.phase = 'retreat';
    bear.target = bear.den;
  }
  const distance = Math.hypot(bear.target.x - body.x, bear.target.z - body.z);
  if (distance < 0.22) {
    body.vx = 0; body.vz = 0;
    if (bear.phase === 'retreat') bear.phase = 'gone';
    else if (bear.phase === 'approach') {
      bear.phase = 'forage';
      bear.nextChoice = step + 75;
    } else if (step >= bear.nextChoice) {
      const choices = bear.pasture.filter(at => clearLine(land, body, at));
      const index = choices.length === 0 ? -1
        : hash32(seed, `bear-graze:${bear.choices++}`) % choices.length;
      bear.target = index < 0 ? bear.clearing : choices[index]!;
      bear.nextChoice = step + 120 + hash32(seed, `bear-rest:${bear.choices}`) % 100;
    }
    return;
  }
  body.vx = PACE * (bear.target.x - body.x) / distance;
  body.vz = PACE * (bear.target.z - body.z) / distance;
  integrate(body, land, LIFE_STEP);
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
}

export function bearPosition(bear: Bear | null): Animal[] {
  if (bear === null || bear.phase === 'gone') return [];
  return [{ id: bear.body.id, kind: 'bear', x: bear.body.x, y: bear.body.z,
    action: bear.phase === 'warning' ? 'attack' : undefined }];
}
