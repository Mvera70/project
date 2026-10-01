// RD-4 (Vera, 1 oct 2026) · **El niño perdido, a la vista** (`life/lost-child.ts`).
// Los dos primeros días de la semana del suceso el niño espera en la linde, no
// en casa; si se manda a buscarlo, el adulto libre más cercano llega hasta él y
// vuelven; si no, al anochecer del segundo día vuelve solo. Y siempre acaba.

import { describe, expect, it } from 'vitest';
import { LIFE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { isHere } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import { run } from '@engine/sim';
import { TERRAIN_CODE, type GameState, type VillagerId } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { LOST_DAYS } from '../../src/render3d/life/lost-child';

const SEEDS = [7, 23, 41];

const grown = new Map<number, GameState>();
function lostThisWeek(seed: number): { state: GameState; child: VillagerId } {
  if (!grown.has(seed)) {
    const village = foundTwenty(seed);
    run(village, TIME.WEEKS_PER_YEAR * 6, 'prudent', CATALOG);
    grown.set(seed, village);
  }
  const state = structuredClone(grown.get(seed)!);
  state.happenings = state.happenings.filter((h) => h.tick !== state.tick);
  const child = state.people.villagers.find((v) => isHere(v) && ageOf(v, state.tick) < LIFE.ADULT[0])!;
  state.happenings.push({ tick: state.tick, id: 'child_lost', visible: [], who: [child.id] });
  return { state, child: child.id };
}

function forestGap(state: GameState, x: number, z: number): number {
  let best = Infinity;
  for (let cz = 0; cz < state.map.height; cz += 1) {
    for (let cx = 0; cx < state.map.width; cx += 1) {
      if (state.map.terrain[cz * state.map.width + cx] !== TERRAIN_CODE.forest) continue;
      best = Math.min(best, Math.hypot(cx + 0.5 - x, cz + 0.5 - z));
    }
  }
  return best;
}

describe('RD-4 · el niño perdido, a la vista', () => {
  it('espera en la linde, no en casa, y quien va a buscarlo llega y lo trae', () => {
    for (const seed of SEEDS) {
      const { state, child } = lostThisWeek(seed);
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      const lost = life.lostChild!;
      expect(lost, `semilla ${seed}`).not.toBeNull();
      expect(lost.villager).toBe(child);
      expect(life.dwellers.some((d) => d.villager === child), `semilla ${seed}: también en casa`).toBe(false);
      expect(forestGap(state, lost.body.x, lost.body.z), `semilla ${seed}: lejos del bosque`).toBeLessThan(4);
      let searcher: VillagerId | null = null;
      let foundAt = -1;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        const phase = n / STEPS_PER_DAY;
        life.step(phase);
        // Se le manda a media mañana, cuando la aldea ya está en pie.
        if (searcher === null && phase >= 0.35) {
          searcher = life.searchChild();
          expect(searcher, `semilla ${seed}: nadie a quien mandar`).not.toBeNull();
          expect(life.searchChild(), 'dos veces no').toBeNull();
        }
        if (foundAt < 0 && lost.phase !== 'lost') foundAt = phase;
      }
      expect(foundAt, `semilla ${seed}: nadie llegó hasta él`).toBeGreaterThan(0.35);
      expect(foundAt, `semilla ${seed}: llegó tarde`).toBeLessThan(0.75);
      expect(lost.phase, `semilla ${seed}`).toBe('gone');
    }
  });

  it('sin búsqueda, al anochecer del último día vuelve solo; y después ya no se pierde', () => {
    for (const seed of SEEDS) {
      const { state } = lostThisWeek(seed);
      const first = state.tick * TIME.DAYS_PER_WEEK;
      const day0 = createVillage(state, first);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) day0.step(n / STEPS_PER_DAY);
      expect(day0.lostChild!.phase, `semilla ${seed}: el primer día no vuelve solo`).toBe('lost');
      const last = createVillage(state, first + LOST_DAYS - 1);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) last.step(n / STEPS_PER_DAY);
      expect(last.lostChild!.phase, `semilla ${seed}`).not.toBe('lost');
      expect(createVillage(state, first + LOST_DAYS).lostChild, `semilla ${seed}`).toBeNull();
    }
  });

  it('mandado a buscar, los días que se rehacen ya no lo dejan en la linde', () => {
    const { state, child } = lostThisWeek(7);
    const day = state.tick * TIME.DAYS_PER_WEEK + 1;
    expect(createVillage(state, day, { lostFound: { villager: child, tick: state.tick } }).lostChild).toBeNull();
  });
});
