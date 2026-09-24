// Proyectiles de caza a paso fijo. Un segmento barrido decide el impacto:
// a esta escala una flecha puede cruzar toda una perdiz entre dos fotogramas.

import { aimAt } from './archery';
import { LIFE_STEP } from './clock';
import type { Point } from './body';
import type { HuntWeapon } from '@engine/world/hunting';

const GRAVITY = 9.81 / 3;
const MAX_AGE = Math.round(2.5 / LIFE_STEP);

export interface HuntShot {
  readonly id: number;
  readonly weapon: 'bow' | 'sling';
  readonly from: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number;
  spent: boolean;
}

export interface HuntTarget {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly alive: boolean;
}

/** Puntería balística compartida con los arqueros del cerco. */
export function launchHuntShot(from: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number }, weapon: HuntWeapon,
  hunterId: number, shotId: number): HuntShot | null {
  if (weapon === 'spear') return null;
  const speed = weapon === 'bow' ? 12 : 9;
  const velocity = aimAt(from, target, speed);
  if (velocity === null) return null;
  return { id: shotId, weapon, from: hunterId,
    x: from.x, y: from.y, z: from.z,
    vx: velocity.x, vy: velocity.y, vz: velocity.z,
    age: 0, spent: false };
}

function segmentGapSquared(from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number }, target: HuntTarget): number {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const length2 = dx * dx + dy * dy + dz * dz;
  const t = length2 < 1e-9 ? 0 : Math.max(0, Math.min(1,
    ((target.x - from.x) * dx + (target.y - from.y) * dy + (target.z - from.z) * dz) / length2));
  return (from.x + t * dx - target.x) ** 2
    + (from.y + t * dy - target.y) ** 2
    + (from.z + t * dz - target.z) ** 2;
}

/** Devuelve los ids alcanzados; el llamador decide herida, muerte y huida. */
export function stepHuntShots(shots: HuntShot[], targets: readonly HuntTarget[],
  ground: (x: number, z: number) => number): number[] {
  const hits: number[] = [];
  for (const shot of shots) {
    if (shot.spent) continue;
    const before = { x: shot.x, y: shot.y, z: shot.z };
    shot.x += shot.vx * LIFE_STEP;
    shot.y += shot.vy * LIFE_STEP - 0.5 * GRAVITY * LIFE_STEP * LIFE_STEP;
    shot.z += shot.vz * LIFE_STEP;
    shot.vy -= GRAVITY * LIFE_STEP;
    shot.age += 1;
    const after = { x: shot.x, y: shot.y, z: shot.z };
    for (const target of targets) {
      if (!target.alive || segmentGapSquared(before, after, target)
        > (target.radius + (shot.weapon === 'sling' ? 0.09 : 0.06)) ** 2) continue;
      shot.spent = true;
      hits.push(target.id);
      break;
    }
    if (shot.y <= ground(shot.x, shot.z) || shot.age >= MAX_AGE) shot.spent = true;
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    if (shots[i]!.spent) shots.splice(i, 1);
  }
  return hits;
}

/** La lanza sólo puede tocar desde el alcance del cuerpo, sin proyectil. */
export function spearCanHit(hunter: Point, target: Point, radius: number): boolean {
  return Math.hypot(hunter.x - target.x, hunter.z - target.z) <= 1.1 + radius;
}
