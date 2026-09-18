import { BUILDINGS, LIFE, TIME } from '../balance';
import { housingCapacity, isHere } from '../people/demography';
import { storageCapacity } from '../subsistence/harvest';
import type { BuildingId, BuildingKind, GameState } from '../state';
import { will } from '../people/crown';

export interface BuiltEvent { id: BuildingId; kind: BuildingKind; upgradeOf: BuildingId | null }

export function capacityOf(state: GameState): { housing: number; storage: number } {
  return { housing: housingCapacity(state), storage: storageCapacity(state) };
}

/** Upgraded houses and chapels retain the original family's cap. */
export function familyOf(kind: BuildingKind): BuildingKind {
  return BUILDINGS[kind].upgradeOf ?? kind;
}

export function withinCap(state: GameState, kind: BuildingKind): boolean {
  const family = familyOf(kind);
  const base = BUILDINGS[family].cap;
  if (base === null) return true;
  // K-2 · **el rey del campo rotura tierra nueva.** Es el único sitio donde la
  // corona levanta un tope de §12, y tiene su motivo medido: multiplicar «lo que
  // hace falta sembrar» no cambia nada en una aldea hecha, porque los ocho
  // campos ya están todos trabajados (ver `CROWN.PLOUGH_MORE_FIELDS`).
  const cap = family === 'field' ? base + will(state).moreFields : base;
  const standing = state.buildings.filter((b) => b.lostTick === null && familyOf(b.kind) === family).length;
  const reserved = state.works.filter((w) => w.upgradeOf === null && familyOf(w.kind) === family).length;
  return standing + reserved < cap;
}

/** Ruin bytes are occupancy, while building history preserves their material. */
export function destroyBuilding(state: GameState, id: BuildingId, blockYears = 0): void {
  const building = state.buildings.find((b) => b.id === id && b.lostTick === null);
  if (building === undefined) return;
  building.lostTick = state.tick;
  // v2.25: burnt ground nobody will build on for a while. Zero leaves §7.4 as
  // it was — a wooden ruin anyone may build over.
  if (blockYears > 0) building.blockedUntil = state.tick + Math.round(blockYears * TIME.WEEKS_PER_YEAR);
  for (let y = building.y; y < building.y + building.h; y += 1) {
    for (let x = building.x; x < building.x + building.w; x += 1) state.map.ruins[y * state.map.width + x] = 1;
  }
  // An upgrade cannot survive the loss of its source; already spent materials
  // and labour are lost with the building. No new refund rule is invented.
  state.works = state.works.filter((w) => w.upgradeOf !== id);
  for (const person of state.people.villagers) if (person.homeId === id) person.homeId = null;
}

/** Give available beds to present villagers without moving existing tenants. */
export function houseHomeless(state: GameState): void {
  // K-4 · **la sala del rey también es techo.** Si no entrara aquí, el rey se
  // mudaría a ella y `houseHomeless` lo devolvería a una casa al tick siguiente,
  // porque no la contaría entre las que valen.
  const houses = state.buildings.filter(
    (b) => b.lostTick === null && (familyOf(b.kind) === 'house' || b.kind === 'hall'),
  );
  for (const person of state.people.villagers.filter(isHere)) {
    if (person.homeId !== null && houses.some((h) => h.id === person.homeId)) continue;
    person.homeId = null;
    const house = houses.find((h) => state.people.villagers.filter((v) => isHere(v) && v.homeId === h.id).length < LIFE.HOUSE_CAPACITY);
    if (house !== undefined) person.homeId = house.id;
  }
}
