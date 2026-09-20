// E0c · La huella efímera de la semana posterior al saqueo.
//
// El motor ya cobró la pérdida. Aquí sólo se vuelve visible, desde el mismo
// estado congelado con el que se reconstruye cualquier jornada de vida.

import { hash32 } from '@engine/rng';
import type { BuildingKind, GameState } from '@engine/state';
import { fitsCircle, type Point, type Terrain } from './body';
import { doorOf } from './offers';
import { pathTo } from './navigate';
import type { Prop } from './props';

const AFTERMATH_ID_BASE = -3_200_000;
const RAID_ENTRIES = new Set(['raid.open', 'raid.walled', 'raid.assault']);
const STORE_KINDS = new Set<BuildingKind>(['granary', 'mill']);
const HOME_KINDS = new Set<BuildingKind>(['house', 'stone_house']);

type Building = GameState['buildings'][number];

function happened(state: GameState): number | null {
  const arrived = state.threat.arrivedTick;
  const until = state.flags['just_sacked'];
  if (state.ended !== null || arrived === null || until === undefined || until <= state.tick
    || state.tick !== arrived + 1) return null;
  return state.chronicle.some((entry) => entry.tick === arrived && RAID_ENTRIES.has(entry.templateKey))
    ? arrived : null;
}

function anchorOf(land: Terrain, building: Building): Point | null {
  return doorOf(land, building.x, building.y, building.w, building.h);
}

/** Un punto de suelo real, y alcanzable desde la puerta que lo ancla. */
function clearOfPlots(at: Point, buildings: readonly Building[], anchor: Building): boolean {
  return buildings.every((building) => {
    const margin = building.kind === 'field' ? 0.9 : building.id === anchor.id ? 0.45 : 0.7;
    const nearX = Math.max(building.x - margin, Math.min(at.x, building.x + building.w + margin));
    const nearZ = Math.max(building.y - margin, Math.min(at.z, building.y + building.h + margin));
    return Math.hypot(at.x - nearX, at.z - nearZ) > 0.05;
  });
}

function nearby(
  land: Terrain, buildings: readonly Building[], anchor: { building: Building; at: Point },
  seed: number, key: string, used: readonly Point[],
): Point | null {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const angle = hash32(seed, `${key}:angle:${attempt}`) / 4_294_967_296 * Math.PI * 2;
    const distance = 1.0 + hash32(seed, `${key}:distance:${attempt}`) / 4_294_967_296 * 2.1;
    const at = { x: anchor.at.x + Math.cos(angle) * distance, z: anchor.at.z + Math.sin(angle) * distance };
    if (!fitsCircle(land, at.x, at.z, 0.11) || pathTo(land, anchor.at, at, 0.11) === null) continue;
    if (!clearOfPlots(at, buildings, anchor.building)) continue;
    if (used.some((other) => Math.hypot(other.x - at.x, other.z - at.z) < 0.32)) continue;
    return at;
  }
  return null;
}

function fixed(id: number, kind: 'grain' | 'bundle', at: Point): Prop {
  return {
    id, kind, x: at.x, z: at.z, y: 0, vx: 0, vz: 0, vy: 0,
    held: null, restUntil: Number.POSITIVE_INFINITY, for: null, fixed: true,
  };
}

function placements(
  land: Terrain, all: readonly Building[], candidates: readonly Building[], seed: number,
  key: string, count: number, used: readonly Point[],
): { anchor: { building: Building; at: Point }; at: Point[] } | null {
  for (const building of candidates) {
    const at = anchorOf(land, building);
    if (at === null) continue;
    const anchor = { building, at };
    const placed: Point[] = [];
    for (let index = 0; index < count; index += 1) {
      const point = nearby(land, all, anchor, seed, `${key}:${building.id}:${index}`, [...used, ...placed]);
      if (point === null) break;
      placed.push(point);
    }
    if (placed.length === count) return { anchor, at: placed };
  }
  return null;
}

/**
 * Props que deja una incursión ya resuelta. No se guardan, no ofrecen acciones
 * y se recalculan igual en cada uno de los siete días escénicos del tick.
 */
export function aftermathProps(state: GameState, land: Terrain): Prop[] {
  const arrived = happened(state);
  if (arrived === null) return [];

  const standing = state.buildings.filter((building) => building.lostTick === null);
  const stores = standing.filter((building) => STORE_KINDS.has(building.kind));
  const homes = standing.filter((building) => HOME_KINDS.has(building.kind));
  const made: Prop[] = [];
  const used: Point[] = [];
  const count = 2 + (hash32(state.seed, `aftermath:${arrived}:loads`) & 1);
  const primary = placements(land, standing, stores.length > 0 ? stores : homes, state.seed,
    `aftermath:${arrived}:load`, count, used);
  if (primary !== null) {
    for (const at of primary.at) {
      used.push(at);
      made.push(fixed(AFTERMATH_ID_BASE - made.length,
        primary.anchor.building.kind === 'granary' ? 'grain' : 'bundle', at));
    }
  }

  const beastLost = state.chronicle.some((entry) => entry.tick === arrived && entry.templateKey === 'raid.beast');
  if (!beastLost) return made;
  const corralCandidates = [
    ...standing.filter((building) => HOME_KINDS.has(building.kind)),
    ...standing.filter((building) => building.kind === 'field'),
  ];
  const corral = placements(land, standing, corralCandidates, state.seed,
    `aftermath:${arrived}:beam`, 2, used);
  if (corral === null) return made;
  // Dos travesaños sólo si los dos caben: un corral medio inventado cuenta la
  // misma mentira que uno atravesando una casa.
  return [...made, ...corral.at.map((at, index) => fixed(AFTERMATH_ID_BASE - made.length - index, 'bundle', at))];
}
