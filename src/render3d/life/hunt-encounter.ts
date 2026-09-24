// Encuentro escénico de caza: cuerpos y proyectiles a paso fijo; el resultado
// sale como parte para que el llamante lo entregue al motor al cerrar la semana.

import type { GameState } from '@engine/state';
import { valleyCore } from '@derive/anchors';
import type { Animal } from '@derive/animals';
import type { ArrowSighting } from '../world/arrows';
import type { ClipName } from '../clips';
import type { HuntSpecies, HuntWeapon } from '@engine/world/hunting';
import { hash32 } from '@engine/rng';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { pathTo } from './navigate';
import { LIFE_STEP } from './clock';
import { createWildPrey, stepWildPrey, wildPreyPosition, type WildKind, type WildPrey } from './wild-prey';
import { launchHuntShot, spearCanHit, stepHuntShots, type HuntShot, type HuntTarget } from './hunt-shot';

const HIT_POINTS: Readonly<Record<HuntSpecies, number>> = {
  partridge: 1, rabbit: 1, deer: 1, boar: 2, bear: 4,
};
const SPEED = 1.15;
const HUNTER_RADIUS = 0.3;
const HUNTER_ID = 80_000;
const MAX_DURATION_STEPS = 600;
const CORPSE_STEPS = 75;
const SHOT_STEPS = Math.round(2.1 / LIFE_STEP);
const SPEAR_STEPS = Math.round(0.9 / LIFE_STEP);

export interface HuntReport {
  readonly sourceTick: number;
  readonly species: HuntSpecies;
  readonly weapon: HuntWeapon;
  readonly hits: number;
  readonly killed: boolean;
}

export interface HuntHunterPose {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly facing: number;
  readonly clip: ClipName;
  readonly travelled: number;
}

export interface HuntEncounter {
  readonly weapon: HuntWeapon;
  readonly targetId: number;
  readonly animals: readonly Animal[];
  readonly hunter: HuntHunterPose;
  readonly projectiles: readonly ArrowSighting[];
  readonly completed: HuntReport | null;
  /** El jugador ordena un golpe; espera a alcance y recuperación del arma. */
  attack(): boolean;
  step(wildlife: readonly Animal[]): void;
}

function findHunter(land: Terrain, target: Point, seed: number): Point | null {
  const start = hash32(seed, 'hunt-hunter-spawn') % 24;
  for (let n = 0; n < 24; n += 1) {
    const angle = (start + n) * Math.PI / 12;
    for (const distance of [4.2, 3.8, 4.8, 3.4, 5.2]) {
      const at = { x: target.x + Math.cos(angle) * distance,
        z: target.z + Math.sin(angle) * distance };
      if (fitsCircle(land, at.x, at.z, HUNTER_RADIUS)) return at;
    }
  }
  return null;
}

/**
 * Prepara un encuentro fuera del estado guardado. Las presas comunes se crean
 * en terreno transitable; ciervo y oso deben existir ya en las instantáneas.
 * `ground` devuelve la altura absoluta del suelo en coordenadas de escena.
 */
export function createHuntEncounter(
  state: Readonly<GameState>, land: Terrain, species: HuntSpecies, weapon: HuntWeapon,
  ground: (x: number, z: number) => number, wildlife: readonly Animal[], seed: number,
  den: Point | null = null,
): HuntEncounter | null {
  const wild: WildPrey | null = species === 'partridge' || species === 'rabbit' || species === 'boar'
    ? createWildPrey(state as GameState, land, seed,
      (() => { const core = valleyCore(state as GameState); return { x: core.x, z: core.y }; })(), species as WildKind)
    : null;
  const initialTarget = wild === null
    ? wildlife.find(animal => animal.kind === species) ?? null
    : null;
  if (wild === null && initialTarget === null) return null;
  const targetId = wild?.body.id ?? initialTarget!.id;
  const initialAt = wild === null
    ? { x: initialTarget!.x, z: initialTarget!.y }
    : { x: wild.body.x, z: wild.body.z };
  const spawn = findHunter(land, initialAt, seed);
  if (spawn === null) return null;

  const hunterBody: Body = { id: HUNTER_ID + (hash32(seed, 'hunt-hunter-id') % 10_000),
    x: spawn.x, z: spawn.z, vx: 0, vz: 0,
    facing: Math.atan2(initialAt.x - spawn.x, initialAt.z - spawn.z),
    radius: HUNTER_RADIUS, pace: SPEED };
  const shots: HuntShot[] = [];
  let stepNumber = 0;
  let travelled = 0;
  let hits = 0;
  // El primer disparo necesita un gesto legible antes de soltar la cuerda.
  let lastShot = 0;
  let clip: ClipName = weapon === 'spear' ? 'walk' : 'bow_draw';
  let report: HuntReport | null = null;
  let corpseUntil = -1;
  let shotsMade = 0;
  let externalTarget: Animal | null = initialTarget;
  let bearWounds = 0;
  let lastBearSwipe = 0;
  let bearAction: Animal['action'] = undefined;
  let retreatSince = -1;
  let retreatRoute: Point[] | null = null;
  let requested = false;

  const currentTarget = (snapshots: readonly Animal[]): Point | null => {
    if (wild !== null) {
      if (wild.phase === 'gone') return null;
      return { x: wild.body.x, z: wild.body.z };
    }
    const found = snapshots.find(animal => animal.id === targetId);
    if (found !== undefined && (species !== 'bear' || stepNumber === 0)) externalTarget = found;
    if (found === undefined && species !== 'bear') return null;
    return externalTarget === null ? null : { x: externalTarget.x, z: externalTarget.y };
  };

  const targetY = (point: Point): number => ground(point.x, point.z)
    + (wild?.altitude ?? externalTarget?.altitude ?? 0) + 0.42;

  const animalOutput = (snapshots: readonly Animal[]): Animal[] => {
    const point = currentTarget(snapshots);
    if (point === null) return [];
    if (report?.killed && stepNumber > corpseUntil) return [];
    if (species === 'bear' && report !== null && !report.killed) return [];
    if (wild !== null) {
      if (report?.killed) return [{ id: targetId, kind: species, x: point.x, y: point.z, action: 'down' }];
      return wildPreyPosition(wild);
    }
    const source = externalTarget;
    return source === null ? [] : [{ ...source,
      action: report?.killed ? 'down' : species === 'bear' ? bearAction : source.action }];
  };

  return {
    weapon,
    targetId,
    get animals() { return animalOutput(externalTarget === null ? wildlife : [externalTarget]); },
    get hunter() {
      return { id: hunterBody.id, x: hunterBody.x, z: hunterBody.z,
        facing: hunterBody.facing, clip, travelled };
    },
    get projectiles() {
      return shots.map(shot => ({ id: shot.id, x: shot.x, y: shot.y, z: shot.z,
        vx: shot.vx, vy: shot.vy, vz: shot.vz, weapon: shot.weapon }));
    },
    get completed() { return report; },
    attack() {
      if (report !== null || retreatSince >= 0) return false;
      requested = true;
      return true;
    },
    step(snapshots: readonly Animal[]): void {
      if (report !== null) {
        if (!report.killed || stepNumber > corpseUntil) return;
        stepNumber += 1;
        return;
      }
      if (retreatSince >= 0 && species === 'bear' && externalTarget !== null) {
        const home = den ?? initialAt;
        retreatRoute ??= pathTo(land,
          { x: externalTarget.x, z: externalTarget.y }, home, 0.52)?.map(at => ({ x: at.x, z: at.z })) ?? [home];
        while (retreatRoute.length > 0 && Math.hypot(retreatRoute[0]!.x - externalTarget.x,
          retreatRoute[0]!.z - externalTarget.y) < 0.24) retreatRoute.shift();
        const next = retreatRoute[0] ?? home;
        const dx = next.x - externalTarget.x, dz = next.z - externalTarget.y;
        const gap = Math.hypot(dx, dz);
        if ((retreatRoute.length === 0 && gap < 0.24) || stepNumber - retreatSince > 360) {
          report = { sourceTick: state.tick, species, weapon, hits, killed: false };
          return;
        }
        const x = externalTarget.x + dx / gap * LIFE_STEP * 0.9;
        const z = externalTarget.y + dz / gap * LIFE_STEP * 0.9;
        if (fitsCircle(land, x, z, 0.52)) externalTarget = { ...externalTarget, x, y: z };
        bearAction = 'flee';
        clip = 'fall';
        stepNumber += 1;
        return;
      }
      const target = currentTarget(snapshots);
      if (target === null) {
        report = { sourceTick: state.tick, species, weapon, hits, killed: false };
        return;
      }
      if (stepNumber >= MAX_DURATION_STEPS) {
        report = { sourceTick: state.tick, species, weapon, hits, killed: false };
        return;
      }

      if (wild !== null) {
        stepWildPrey(wild, land, seed, stepNumber, [{ body: hunterBody }]);
      } else if (species === 'bear' && externalTarget !== null) {
        const dx = hunterBody.x - externalTarget.x;
        const dz = hunterBody.z - externalTarget.y;
        const gap = Math.hypot(dx, dz);
        if (gap > 1.2 && gap < 7) {
          const x = externalTarget.x + dx / gap * LIFE_STEP * 0.72;
          const z = externalTarget.y + dz / gap * LIFE_STEP * 0.72;
          if (fitsCircle(land, x, z, 0.52)) externalTarget = { ...externalTarget, x, y: z };
          bearAction = 'charge';
        }
      }
      const dx = target.x - hunterBody.x, dz = target.z - hunterBody.z;
      const distance = Math.hypot(dx, dz);
      const meleeReach = 1.1 + (wild?.body.radius ?? (species === 'bear' ? 0.52 : 0.34));
      const desired = weapon === 'spear' ? meleeReach * 0.82 : 4.2;
      const moving = distance > desired + 0.15;
      hunterBody.vx = moving ? SPEED * dx / Math.max(distance, 1e-6) : 0;
      hunterBody.vz = moving ? SPEED * dz / Math.max(distance, 1e-6) : 0;
      if (moving) {
        const beforeX = hunterBody.x, beforeZ = hunterBody.z;
        integrate(hunterBody, land, LIFE_STEP);
        travelled += Math.hypot(hunterBody.x - beforeX, hunterBody.z - beforeZ);
      }
      if (distance > 0.01) turnTo(hunterBody, Math.atan2(dx, dz), LIFE_STEP);

      if (weapon === 'spear') {
        clip = moving ? 'walk' : stepNumber - lastShot < 18 ? 'spear_thrust' : 'idle';
        if (requested && !moving && stepNumber - lastShot >= SPEAR_STEPS
          && spearCanHit(hunterBody, target, wild?.body.radius ?? 0.34)) {
          hits += 1;
          lastShot = stepNumber;
          requested = false;
          clip = 'spear_thrust';
        }
      } else {
        const sinceShot = stepNumber - lastShot;
        clip = sinceShot < 18 && shotsMade > 0 ? 'bow_loose' : 'bow_draw';
        if (requested && sinceShot >= SHOT_STEPS) {
          const from = { x: hunterBody.x, y: ground(hunterBody.x, hunterBody.z) + 1.2, z: hunterBody.z };
          const aim = { x: target.x, y: targetY(target), z: target.z };
          const shot = launchHuntShot(from, aim, weapon, hunterBody.id, 100_000 + shotsMade++);
          if (shot !== null) {
            shots.push(shot);
            lastShot = stepNumber;
            requested = false;
            clip = 'bow_loose';
          }
        }
      }

      const hitTargets: HuntTarget[] = [{ id: targetId, x: target.x, y: targetY(target), z: target.z,
        radius: wild?.body.radius ?? (species === 'bear' ? 0.52 : species === 'deer' ? 0.34 : 0.38), alive: true }];
      hits += stepHuntShots(shots, hitTargets, ground).length;
      if (hits >= HIT_POINTS[species]) {
        report = { sourceTick: state.tick, species, weapon, hits, killed: true };
        corpseUntil = stepNumber + CORPSE_STEPS;
        if (wild !== null) { wild.phase = 'down'; wild.health = 0; }
        hunterBody.vx = 0; hunterBody.vz = 0;
        clip = 'idle';
      } else if (species === 'bear' && externalTarget !== null
        && Math.hypot(externalTarget.x - hunterBody.x, externalTarget.y - hunterBody.z) < 1.35
        && stepNumber - lastBearSwipe >= 45) {
        bearAction = 'attack';
        lastBearSwipe = stepNumber;
        bearWounds += 1;
        clip = 'hit_take';
        if (bearWounds >= 3) retreatSince = stepNumber;
      }
      stepNumber += 1;
    },
  };
}
