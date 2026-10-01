// K1+K2+K3 (Vera, 1 oct 2026) · **El bosque que se gasta, se reproduce y pesa.**
// `world/forest.ts`, `docs/medidas/k1-k3-madera-2026-10-01.md`.
//
// K1: se tala lo más cercano, con celdas que caen deprisa, y dentro del cerco no rebrota.
// K2: el bosque se extiende a celdas vecinas, lejos del pueblo, con su propio
// azar (`forest`); lo que brota es un plantón que no se tala hasta hacerse, y
// nunca se tala el último foco. K3: talar lejos cuesta (`woodHaul`), y la aldea
// manda más leñadores, hasta el techo.

import { describe, expect, it } from 'vitest';
import { LABOUR, TIME, WORLD } from '@engine/balance';
import { allocateLabour } from '@engine/subsistence/labour';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { fellForest, fellingTarget, forestCells, regrowForest, sapling, woodHaul } from '@engine/world/forest';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [7, 11, 23];

const fromPlaza = (s: GameState, i: number): number =>
  Math.hypot((i % s.map.width) + 0.5 - (s.plaza.x + 0.5), Math.floor(i / s.map.width) + 0.5 - (s.plaza.y + 0.5));

const forestList = (s: GameState): number[] =>
  [...s.map.terrain.keys()].filter((i) => s.map.terrain[i] === TERRAIN_CODE.forest);

/** El primer tick de un año: `regrowForest` sólo trabaja ahí. */
function atYear(s: GameState): GameState {
  s.tick = Math.ceil((s.tick + 1) / TIME.WEEKS_PER_YEAR) * TIME.WEEKS_PER_YEAR;
  return s;
}

describe('K1 · el bosque se gasta dentro del cerco', () => {
  it('se tala la celda hecha más cercana al pueblo, y con celdas de 100 el frente avanza', () => {
    // La regla de Vera: lo más cercano. Lo que vacía el interior es que cada
    // celda guarde 100 de madera y no 300 (medido: 9 % del bosque de dentro al
    // cerrarse la villa, frente al 58 % de antes).
    for (const seed of SEEDS) {
      const s = foundTwenty(seed);
      const cell = fellingTarget(s)!;
      const cx = s.buildings.filter((b) => b.lostTick === null).reduce((n, b) => n + b.x + b.w / 2, 0)
        / s.buildings.filter((b) => b.lostTick === null).length;
      const cy = s.buildings.filter((b) => b.lostTick === null).reduce((n, b) => n + b.y + b.h / 2, 0)
        / s.buildings.filter((b) => b.lostTick === null).length;
      const d = (i: number): number => Math.hypot((i % s.map.width) + 0.5 - cx, Math.floor(i / s.map.width) + 0.5 - cy);
      const closer = forestList(s).filter((i) => !sapling(s.map.forestAge[i] as number) && d(i) < d(cell) - 1e-9);
      expect(closer, `semilla ${seed}`).toEqual([]);
      expect(s.map.forestStock[cell], `semilla ${seed}`).toBeLessThanOrEqual(WORLD.WOOD_PER_FOREST_TILE * 1.5);
    }
  });

  it('y dentro del cerco lo talado no rebrota', () => {
    for (const seed of SEEDS) {
      const s = foundTwenty(seed);
      s.ring = 30;
      // Un claro de ocho años con tres vecinas de bosque rebrotaría (§7.5); dentro del cerco, no.
      const forest = forestList(s).filter((i) => fromPlaza(s, i) < s.ring! - 2);
      const cell = forest.find((i) => [i - 1, i + 1, i - s.map.width].every((n) => s.map.terrain[n] === TERRAIN_CODE.forest));
      if (cell === undefined) continue;
      s.map.terrain[cell] = TERRAIN_CODE.cleared;
      s.map.forestStock[cell] = 0;
      s.map.forestAge[cell] = WORLD.FOREST_REGROWTH_YEARS;
      regrowForest(atYear(s));
      expect(s.map.terrain[cell], `semilla ${seed}`).toBe(TERRAIN_CODE.cleared);
    }
  });
});

describe('K2 · el bosque se reproduce', () => {
  it('brota junto al bosque, lejos del pueblo, y como plantón', () => {
    let grown = 0;
    for (const seed of SEEDS) {
      const s = foundTwenty(seed);
      for (let year = 0; year < 10; year += 1) {
        const before = Uint8Array.from(s.map.terrain);
        regrowForest(atYear(s));
        for (let i = 0; i < before.length; i += 1) {
          if (before[i] === TERRAIN_CODE.forest || s.map.terrain[i] !== TERRAIN_CODE.forest) continue;
          grown += 1;
          expect(fromPlaza(s, i), `semilla ${seed}: brotó en el pueblo`).toBeGreaterThanOrEqual(WORLD.FOREST_SPREAD_CLEAR);
          const touching = [i - 1, i + 1, i - s.map.width, i + s.map.width].some((n) => before[n] === TERRAIN_CODE.forest);
          expect(touching, `semilla ${seed}: brotó sin bosque al lado`).toBe(true);
          expect(sapling(s.map.forestAge[i] as number), `semilla ${seed}`).toBe(true);
        }
      }
    }
    expect(grown, 'en diez años algo brota').toBeGreaterThan(0);
  });

  it('el plantón no se tala, y se hace en FOREST_REGROWTH_YEARS', () => {
    const s = foundTwenty(7);
    const cells = forestList(s);
    // Todo el bosque son plantones de un año salvo el foco: no hay nada que talar.
    for (const i of cells) { s.map.forestAge[i] = 1; s.map.forestStock[i] = 1; }
    expect(fellingTarget(s)).toBeNull();
    for (let year = 1; year < WORLD.FOREST_REGROWTH_YEARS; year += 1) regrowForest(atYear(s));
    const one = cells.find((i) => s.map.terrain[i] === TERRAIN_CODE.forest)!;
    expect(sapling(s.map.forestAge[one] as number)).toBe(false);
    expect(s.map.forestStock[one]).toBeGreaterThan(WORLD.WOOD_PER_FOREST_TILE * 0.8);
    expect(fellingTarget(s)).not.toBeNull();
  });

  it('nunca se tala el último foco', () => {
    for (const seed of SEEDS) {
      const s = foundTwenty(seed);
      fellForest(s, 1e9);
      expect(forestCells(s), `semilla ${seed}`).toBe(WORLD.FOREST_FLOOR_CELLS);
      expect(fellingTarget(s), `semilla ${seed}`).toBeNull();
    }
  });

  it('su azar es suyo: no mueve ningún otro flujo', () => {
    const s = foundTwenty(11);
    const before = { ...s.rng };
    for (let year = 0; year < 5; year += 1) regrowForest(atYear(s));
    for (const [stream, value] of Object.entries(before)) {
      if (stream === 'forest') continue;
      expect(s.rng[stream as keyof typeof s.rng], stream).toBe(value);
    }
    expect(s.rng.forest).not.toBe(before.forest);
  });
});

describe('K3 · talar lejos cuesta', () => {
  it('cerca trae lo de siempre; lejos, menos, y nunca menos del suelo', () => {
    for (const seed of SEEDS) {
      const s = foundTwenty(seed);
      const near = woodHaul(s);
      expect(near).toBeLessThanOrEqual(1);
      // Se tala todo lo de cerca: el leñador va cada vez más lejos y trae menos.
      let last = near;
      for (let n = 0; n < 40; n += 1) {
        const cell = fellingTarget(s);
        if (cell === null) break;
        fellForest(s, s.map.forestStock[cell] as number);
        const haul = woodHaul(s);
        expect(haul, `semilla ${seed}`).toBeGreaterThanOrEqual(LABOUR.HAUL_MIN);
        last = haul;
      }
      const cell = fellingTarget(s)!;
      if (fromPlaza(s, cell) > LABOUR.HAUL_NEAR) expect(last, `semilla ${seed}`).toBeLessThan(1);
    }
  });

  it('con el bosque lejos la aldea manda más leñadores, hasta el techo', () => {
    for (const seed of SEEDS) {
      const s = foundTwenty(seed);
      s.village.wood = 0; // la leñera vacía: quiere leña
      const near = allocateLabour(s, 1);
      const far = allocateLabour(s, LABOUR.HAUL_MIN);
      expect(far.cutters, `semilla ${seed}`).toBeGreaterThanOrEqual(near.cutters);
      const spare = far.cutters + far.builders;
      expect(far.cutters, `semilla ${seed}: más del techo`).toBeLessThanOrEqual(spare * LABOUR.CUTTER_CAP_SHARE + 1e-9);
    }
  });
});
