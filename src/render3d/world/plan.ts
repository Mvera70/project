// G-06 · What the scene should contain, as data. design.md D.5, D.6.
//
// The plan is a pure description of the valley at one instant: which ground,
// which buildings, what each of them looks like. It knows nothing about
// Three.js. `renderer.ts` takes a plan and a previous plan, asks what changed
// and touches only that.
//
// Splitting it this way is what makes the round testable at all. A renderer
// that only exists as WebGL calls can be checked with a screenshot and nothing
// else; a plan can be checked in the fast suite, with a real game, for the
// things D.6 actually asks for — that a ruin stops being a house, that a new
// game throws everything away, that painting twice as many frames changes
// nothing. The picture still needs looking at. The bookkeeping does not.

import type { Building, BuildingId, BuildingKind, GameState, ValleyMap } from '@engine/state';
import { TIME } from '@engine/balance';
import { SEASONS, clockOf, weekOf } from '@engine/time';
import { BUILDING_ASSETS } from './buildings';
import { BUILDING_LOOKS, RUIN, type BuildingLook } from '../visual-config';

export interface PlannedBuilding {
  readonly id: BuildingId;
  readonly kind: BuildingKind;
  /** Top-left corner, in cells. */
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly ruin: boolean;
  readonly walls: number;
  readonly roof: number;
  readonly wallColour: string;
  readonly roofColour: string;
  readonly roofed: boolean;
  /**
   * G-10 · Qué recurso del catálogo le toca, o `null` para la caja con tejado.
   *
   * Va en el plan y no en el renderer porque es parte de **qué hay que ver**, no
   * de cómo se dibuja: un campo segado y uno sembrado son dos cosas distintas en
   * la escena, y el diff tiene que notar el cambio para reconstruir ese edificio
   * y sólo ese la semana de la siega.
   */
  readonly asset: string | null;
}

export interface ScenePlan {
  /**
   * Which game this is. A different seed is a different valley, and everything
   * built for the previous one has to go rather than be updated into place.
   */
  readonly game: string;
  /** Changes whenever the ground's look changes: terrain, paths, cleared land. */
  readonly ground: number;
  readonly buildings: readonly PlannedBuilding[];
}

export interface PlanChange {
  readonly ground: boolean;
  readonly cleared: boolean;
  readonly added: readonly PlannedBuilding[];
  readonly changed: readonly PlannedBuilding[];
  readonly removed: readonly BuildingId[];
}

/**
 * A number that changes when the ground's appearance changes, and not otherwise.
 *
 * Terrain and paths are two arrays of about two thousand bytes. Walking them
 * once a frame costs almost nothing and saves keeping a version counter inside
 * `GameState`, which §4 would not have: the engine does not know a screen
 * exists, and a field whose only reader is a renderer is exactly the kind of
 * thing D.5 forbids adding.
 */
export function groundSignature(map: ValleyMap, tick: number): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < map.terrain.length; index += 1) {
    hash = Math.imul(hash ^ (map.terrain[index] ?? 0), 16_777_619);
    hash = Math.imul(hash ^ (map.path[index] ?? 0), 16_777_619);
  }
  // G-08 · la estación cambia el color del suelo sin cambiar el terreno, y las
  // dos primeras semanas de cada estación la nueva crece de la vieja (§10.3).
  // Sin esto, el valle seguía verde en enero: el suelo sólo se reconstruía
  // cuando alguien talaba un árbol.
  const clock = clockOf(tick);
  hash = Math.imul(hash ^ SEASONS.indexOf(clock.season), 16_777_619);
  hash = Math.imul(hash ^ Math.min(2, clock.seasonWeek), 16_777_619);
  return hash >>> 0;
}

function look(building: Building): BuildingLook {
  return BUILDING_LOOKS[building.kind];
}

/** Semana en la que el sembrado ya se ve. TUNE: media primavera. */
const SOWN_FROM = 6;

/**
 * El recurso que le toca a un edificio esta semana.
 *
 * Casi todos tienen uno fijo. El campo no: entre la siembra y la siega está
 * sembrado y el resto del año está segado, y eso se ve desde arriba. La regla
 * sale de `TIME.HARVEST_WEEK`, la misma semana en la que el motor recoge el
 * grano, así que si alguien mueve la cosecha el campo cambia con ella.
 */
function assetFor(building: Building, tick: number): string | null {
  if (building.lostTick !== null) return null;
  if (building.kind === 'field') {
    const week = weekOf(tick);
    return week >= SOWN_FROM && week < TIME.HARVEST_WEEK ? 'field' : 'field-cut';
  }
  return BUILDING_ASSETS[building.kind] ?? null;
}

function plannedFrom(building: Building, tick: number): PlannedBuilding {
  const ruin = building.lostTick !== null;
  const shape = look(building);
  return {
    asset: assetFor(building, tick),
    id: building.id,
    kind: building.kind,
    x: building.x,
    z: building.y,
    w: building.w,
    h: building.h,
    ruin,
    // A ruin is the same footprint, lower and greyer, and it loses its roof.
    // §7.4 leaves it standing on the map, so it has to read as a ruin from the
    // panoramic view where nobody is reading labels.
    walls: ruin ? RUIN.height : shape.walls,
    roof: ruin ? 0 : shape.roof,
    wallColour: ruin ? RUIN.colour : shape.wallColour,
    roofColour: shape.roofColour,
    roofed: ruin ? false : shape.roofed,
  };
}

export function planFor(state: GameState): ScenePlan {
  return {
    game: `${state.seed}:${state.terrainSeed}`,
    ground: groundSignature(state.map, state.tick),
    buildings: state.buildings.map((building) => plannedFrom(building, state.tick))
      .sort((a, b) => a.id - b.id),
  };
}

function same(a: PlannedBuilding, b: PlannedBuilding): boolean {
  return a.kind === b.kind && a.x === b.x && a.z === b.z && a.w === b.w && a.h === b.h
    && a.ruin === b.ruin && a.walls === b.walls && a.roof === b.roof
    && a.wallColour === b.wallColour && a.roofColour === b.roofColour && a.roofed === b.roofed
    && a.asset === b.asset;
}

/**
 * What has to be touched to go from one plan to the next.
 *
 * `cleared` means start again from nothing: a different game, or a load. There
 * is no sense updating a house from another valley into a house in this one,
 * and trying would leave whatever the two plans happened to share.
 */
export function planChange(previous: ScenePlan | null, next: ScenePlan): PlanChange {
  if (previous === null || previous.game !== next.game) {
    return {
      ground: true, cleared: true, added: next.buildings, changed: [], removed: [],
    };
  }

  const before = new Map(previous.buildings.map((building) => [building.id, building]));
  const added: PlannedBuilding[] = [];
  const changed: PlannedBuilding[] = [];
  for (const building of next.buildings) {
    const was = before.get(building.id);
    if (was === undefined) added.push(building);
    else if (!same(was, building)) changed.push(building);
    before.delete(building.id);
  }

  return {
    ground: previous.ground !== next.ground,
    cleared: false,
    added,
    changed,
    removed: [...before.keys()],
  };
}

/** Whether a change asks for any work at all. Most frames ask for none. */
export function isQuiet(change: PlanChange): boolean {
  return !change.ground && !change.cleared
    && change.added.length === 0 && change.changed.length === 0 && change.removed.length === 0;
}
