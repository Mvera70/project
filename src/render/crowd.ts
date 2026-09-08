// M-18 · Cosmetic villagers. Positions are derived; GameState is never written.

import { isHere } from '@engine/people/demography';
import type { Building, GameState, VillagerId } from '@engine/state';
import { route } from '@engine/world/astar';
import { routesFor } from '@engine/world/paths';
import type { Figure } from './layers/figures';

interface Point { x: number; y: number }
interface CachedPaths { tick: number; paths: Map<VillagerId, number[]> }
const SUNDAY = new WeakMap<GameState, CachedPaths>();
const WORKDAY = new WeakMap<GameState, CachedPaths>();

function centre(building: Building, width: number): number {
  return (building.y + Math.floor(building.h / 2)) * width + building.x + Math.floor(building.w / 2);
}

function plaza(state: GameState): number {
  const standing = state.buildings.filter((building) => building.lostTick === null);
  const well = standing.find((building) => building.kind === 'well');
  if (well !== undefined) return centre(well, state.map.width);
  if (standing.length === 0) return Math.floor(state.map.height / 2) * state.map.width + Math.floor(state.map.width / 2);
  const x = Math.round(standing.reduce((sum, building) => sum + building.x + building.w / 2, 0) / standing.length);
  const y = Math.round(standing.reduce((sum, building) => sum + building.y + building.h / 2, 0) / standing.length);
  return Math.min(state.map.terrain.length - 1, Math.max(0, y * state.map.width + x));
}

function sundayPaths(state: GameState): Map<VillagerId, number[]> {
  const known = SUNDAY.get(state);
  if (known !== undefined && known.tick === state.tick) return known.paths;
  const target = plaza(state);
  const homes = new Map(state.buildings.filter((building) => building.lostTick === null)
    .map((building) => [building.id, centre(building, state.map.width)]));
  const paths = new Map<VillagerId, number[]>();
  for (const person of state.people.villagers) {
    if (!isHere(person)) continue;
    const from = person.homeId === null ? undefined : homes.get(person.homeId);
    const cells = from === undefined ? [target] : route(state.map, from, target);
    paths.set(person.id, cells.length > 0 ? cells : [from ?? target]);
  }
  SUNDAY.set(state, { tick: state.tick, paths });
  return paths;
}

function workdayPaths(state: GameState): Map<VillagerId, number[]> {
  const known = WORKDAY.get(state);
  if (known !== undefined && known.tick === state.tick) return known.paths;
  const paths = new Map(routesFor(state));
  const target = plaza(state);
  const homes = new Map(state.buildings.filter((building) => building.lostTick === null)
    .map((building) => [building.id, centre(building, state.map.width)]));
  for (const person of state.people.villagers) {
    if (!isHere(person) || paths.has(person.id)) continue;
    const home = person.homeId === null ? undefined : homes.get(person.homeId);
    paths.set(person.id, [home ?? target]);
  }
  WORKDAY.set(state, { tick: state.tick, paths });
  return paths;
}

function onPath(cells: readonly number[], progress: number, width: number): Point {
  const distance = Math.max(0, cells.length - 1) * Math.max(0, Math.min(1, progress));
  const at = Math.min(cells.length - 1, Math.floor(distance));
  const next = Math.min(cells.length - 1, at + 1);
  const amount = distance - at;
  const a = cells[at] as number;
  const b = cells[next] as number;
  return {
    x: (a % width) + 0.5 + (((b % width) - (a % width)) * amount),
    y: Math.floor(a / width) + 0.5 + ((Math.floor(b / width) - Math.floor(a / width)) * amount),
  };
}

function phaseOffset(id: number): number {
  const hash = Math.imul(id + 1, 1103515245) >>> 0;
  return ((hash % 1000) / 999 - 0.5) * 0.08;
}

function clampFigure(point: Point, state: GameState): Point {
  return {
    x: Math.max(0, Math.min(state.map.width - 1, point.x - 0.5)),
    y: Math.max(0, Math.min(state.map.height - 1.8, point.y - 1.35)),
  };
}

export function crowdPositions(state: GameState, tickFraction: number): Figure[] {
  const fraction = Math.max(0, Math.min(1, tickFraction));
  if (fraction >= 0.8) return [];
  const routes = state.tick % 4 === 0 ? sundayPaths(state) : workdayPaths(state);
  const namedOrder = new Map(state.people.namedIds.map((id, index) => [id, index]));
  const figures: Figure[] = [];
  for (const person of state.people.villagers.filter(isHere).sort((a, b) => a.id - b.id).slice(0, 80)) {
    const cells = routes.get(person.id);
    if (cells === undefined || cells.length === 0) continue;
    const shifted = fraction - phaseOffset(person.id);
    let point: Point;
    if (shifted < 0.15) {
      point = onPath(cells, shifted / 0.15, state.map.width);
    } else if (shifted < 0.6) {
      point = onPath(cells, 1, state.map.width);
      point.x += Math.sin(person.id * 2.17 + fraction * Math.PI * 2) * 0.5;
      point.y += Math.cos(person.id * 1.73 + fraction * Math.PI * 2) * 0.5;
    } else {
      point = onPath(cells, 1 - ((shifted - 0.6) / 0.2), state.map.width);
    }
    const placed = clampFigure(point, state);
    figures.push({
      id: person.id,
      x: placed.x,
      y: placed.y,
      named: person.named,
      namedIndex: namedOrder.get(person.id) ?? 0,
    });
  }
  return figures;
}
