import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { BUILDINGS } from '@engine/balance';
import { TERRAIN_CODE, type BuildingKind, type GameState } from '@engine/state';
import { canPlace, placeBuilding, ringClosed } from '@engine/world/placement';
import { routesFor, upgradePaths } from '@engine/world/paths';
import { plotAccess, walkingBlocked } from '@engine/world/spatial';
import { foundTwenty } from '../helpers/founding';

function add(state: GameState, kind: BuildingKind, x: number, y: number): void {
  const spec = BUILDINGS[kind];
  state.buildings.push({ id: state.buildings.length, kind, x, y, w: spec.w, h: spec.h,
    tier: spec.tier, builtTick: 0, lostTick: null, blockedUntil: null, lit: true });
}

function enclosed(): GameState {
  const state = foundGame(7);
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  state.map.path.fill(0);
  state.buildings = [];
  state.works = [];
  state.plaza = { x: 35, y: 55 };
  state.ring = 8;
  add(state, 'house', 30, 54);
  for (let n = 0; n < 100; n++) {
    const spot = placeBuilding(state, 'palisade');
    if (spot === null) break;
    add(state, 'palisade', spot.x, spot.y);
  }
  return state;
}

describe('el trazado respeta lo que se puede recorrer', () => {
  it('las estacas de ribera admiten marisma, pero nunca casas, campos ni edificios sobre el vado', () => {
    const state = foundGame(7);
    state.buildings = [];
    state.plaza = { x: 35, y: 55 };
    state.map.terrain.fill(TERRAIN_CODE.marsh);
    for (const kind of ['palisade', 'wall', 'gate', 'bastion'] as const) expect(canPlace(state, kind, 20, 40)).toBe(true);
    for (const kind of ['house', 'field', 'hall', 'church'] as const) expect(canPlace(state, kind, 20, 40)).toBe(false);
    state.map.terrain.fill(TERRAIN_CODE.ford);
    expect(canPlace(state, 'palisade', 20, 40)).toBe(false);
    expect(canPlace(state, 'gate', 20, 40)).toBe(false);
  });
  it('completa el anillo sobre el río sin ocupar el vado', () => {
    const state = enclosed();
    const gate = placeBuilding(state, 'gate');
    expect(gate).not.toBeNull();
    state.buildings.find(b => b.x === gate!.x && b.y === gate!.y)!.kind = 'gate';
    const crossing = state.buildings.find(b => b.kind === 'palisade' && b.x === 43 && b.y === 55)!;
    crossing.lostTick = 1;
    state.map.terrain[55 * state.map.width + 43] = TERRAIN_CODE.water;

    expect(canPlace(state, 'palisade', 43, 55)).toBe(true);
    expect(canPlace(state, 'wall', 43, 55)).toBe(true);
    expect(canPlace(state, 'house', 43, 55)).toBe(false);
    expect(canPlace(state, 'gate', 43, 55)).toBe(false);
    expect(ringClosed(state)).toBe(false);
    expect(placeBuilding(state, 'palisade')).toEqual({ x: 43, y: 55 });

    add(state, 'palisade', 43, 55);
    expect(ringClosed(state)).toBe(true);
  });
  it('el desgaste sale por una fachada y nunca cruza paredes ni la fuente', () => {
    for (const seed of [7, 11, 23, 41]) {
      const state = foundTwenty(seed);
      const blocked = walkingBlocked(state);
      const routes = [...routesFor(state).values()];
      expect(routes.length).toBeGreaterThan(0);
      for (const route of routes) for (const cell of route) expect(blocked[cell]).toBe(0);
      const house = state.buildings.find(b => b.kind === 'house')!;
      const inside = house.y * state.map.width + house.x;
      state.map.path[inside] = 3;
      state.map.traffic[inside] = 65535;
      upgradePaths(state);
      expect(state.map.path[inside]).toBe(0);
    }
  });

  it('una obra nueva invalida rutas ya calculadas, sin esperar a que cambie el camino', () => {
    const state = foundTwenty(23);
    const old = [...routesFor(state).values()].find(route => route.length > 3)!;
    expect(old).toBeDefined();
    const cell = old[Math.floor(old.length / 2)]!;
    add(state, 'house', cell % state.map.width, Math.floor(cell / state.map.width));
    const blocked = walkingBlocked(state);
    for (const route of routesFor(state).values()) for (const step of route) expect(blocked[step]).toBe(0);
  });

  it('el bosque bajo un tejado no se convierte en destino de tala en su fachada', () => {
    const state = foundTwenty(7);
    state.tick = 36;
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    for (const b of state.buildings.filter(b => b.kind === 'house')) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
        state.map.terrain[y * state.map.width + x] = TERRAIN_CODE.forest;
      }
    }
    const tree = 40 * state.map.width + 20;
    state.map.terrain[tree] = TERRAIN_CODE.forest;
    const routes = [...routesFor(state).values()];
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(route[route.length - 1]).toBe(tree);
  });

  it('completar estacas sin una puerta real todavía no cierra la villa', () => {
    const state = enclosed();
    expect(placeBuilding(state, 'palisade')).toBeNull();
    expect(ringClosed(state)).toBe(false);
    const gate = placeBuilding(state, 'gate');
    expect(gate).not.toBeNull();
    state.buildings.find(b => b.x === gate!.x && b.y === gate!.y)!.kind = 'gate';
    expect(ringClosed(state)).toBe(true);
    const wall = state.buildings.find(b => b.kind === 'palisade' && b.x === 43 && b.y === 55)!;
    expect(wall).toBeDefined();
    wall.lostTick = 1;
    state.map.terrain[55 * state.map.width + 43] = TERRAIN_CODE.ford;
    expect(placeBuilding(state, 'palisade')).toBeNull();
    expect(ringClosed(state)).toBe(false);
  });

  it('las casas varían con la semilla, conservan accesos y no consumen azar', () => {
    const plots = new Set<string>();
    for (const seed of [7, 11, 23, 41]) {
      const state = foundGame(seed);
      state.map.terrain.fill(TERRAIN_CODE.meadow);
      state.map.path.fill(0);
      state.buildings = [];
      state.plaza = { x: 35, y: 55 };
      const before = { ...state.rng };
      const spot = placeBuilding(state, 'house')!;
      expect(spot).not.toBeNull();
      expect(placeBuilding(structuredClone(state), 'house')).toEqual(spot);
      expect(state.rng).toEqual(before);
      plots.add(`${spot.x},${spot.y}`);
      expect(plotAccess(state.map, walkingBlocked(state), { ...spot, w: 2, h: 2 }).length).toBeGreaterThan(1);
    }
    expect(plots.size).toBeGreaterThan(1);
  });

  it('la ampliación de una capilla no invade la plaza', () => {
    const state = foundGame(7);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.buildings = [];
    state.plaza = { x: 35, y: 55 };
    add(state, 'chapel', 38, 54);
    expect(canPlace(state, 'church', 37, 54, 0)).toBe(false);
  });

  it('reserva una celda interior del anillo para el paso elevado, sin prohibir campos', () => {
    const state = foundGame(7);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.buildings = [];
    state.works = [];
    state.plaza = { x: 35, y: 55 };
    state.ring = 8;
    expect(canPlace(state, 'house', 41, 54)).toBe(false);
    expect(canPlace(state, 'field', 41, 54)).toBe(true);
    expect(canPlace(state, 'house', 34, 50)).toBe(true);
    expect(placeBuilding(state, 'house')).not.toBeNull();
  });
});
