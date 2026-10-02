// Mudada entera de `tests/fast/life-expeditions.test.ts` el 1 oct 2026 (v5.56): tardaba 76 s en el
// trabajo `fast` de CI. Mismo cuerpo y mismo umbral; sólo cambia cuándo se paga.
//
// §7.15 · Las expediciones, a la vista (28 sep 2026). Vera: «algunas se
// podrían ver físicamente en el mapa, y en otras veremos a los elegidos irse
// por el camino». Propiedades: el día que salen, cada uno sale andando desde
// su casa y se pierde de vista; al bosque se les ve recoger los días
// siguientes; el día que vuelven entran andando, sin estar a la vez en casa.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import type { GameState, MissionId } from '@engine/state';
import { seasonOf } from '@engine/time';
import { foundTwenty } from '../helpers/founding';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { createVillage } from '../../src/render3d/life/village';

const SEEDS = [7, 23, 41];
const grown = new Map<number, GameState>();

function summer(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
    while (seasonOf(base.tick) !== 'summer') tick(base, CATALOG);
    base.village.silver = 100;
    grown.set(seed, base);
  }
  return structuredClone(base);
}

function send(state: GameState, mission: MissionId, count: number): void {
  tick(state, CATALOG, undefined, [{ kind: 'expedition', mission, count }]);
}

describe('las expediciones, a la vista · §7.15', () => {
  it('el día que salen, cada uno sale de su casa andando y se pierde de vista', () => {
    for (const seed of SEEDS) {
      for (const mission of ['mushrooms', 'market'] as const) {
        const state = summer(seed);
        send(state, mission, 2);
        const trip = state.expeditions.find((e) => e.mission === mission && e.end === null);
        expect(trip, `semilla ${seed}, ${mission}: salió`).toBeDefined();
        const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
        expect(life.travellers.map((t) => t.villager).sort()).toEqual([...trip!.who].sort());
        // Nadie de ellos tiene cuerpo de vecino en casa: se han ido.
        for (const id of trip!.who) expect(life.dwellers.some((d) => d.villager === id)).toBe(false);
        let seen = 0;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          life.step(n / STEPS_PER_DAY);
          if (life.travellers.some((t) => t.phase === 'walking')) seen += 1;
        }
        expect(seen, `semilla ${seed}, ${mission}: se les ve andar`).toBeGreaterThan(STEPS_PER_DAY * 0.05);
        expect(life.travellers.every((t) => t.phase === 'gone'), `semilla ${seed}, ${mission}: se pierden de vista`).toBe(true);
      }
    }
  });

  it('al bosque se les ve recoger los días siguientes; a la montaña no', () => {
    for (const seed of SEEDS) {
      const state = summer(seed);
      send(state, 'mushrooms', 2);
      const second = createVillage(state, state.tick * TIME.DAYS_PER_WEEK + 3);
      expect(second.travellers.length, `semilla ${seed}`).toBe(2);
      const hill = summer(seed);
      send(hill, 'high_seam', 2);
      expect(createVillage(hill, hill.tick * TIME.DAYS_PER_WEEK + 3).travellers).toHaveLength(0);
    }
  });

  it('el día que vuelven entran andando hasta casa, y sólo los que vuelven', () => {
    for (const seed of SEEDS) {
      const state = summer(seed);
      send(state, 'high_seam', 3);
      while (state.expeditions.every((e) => e.end === null)) tick(state, CATALOG);
      const trip = state.expeditions.find((e) => e.end !== null)!;
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      const back = trip.who.filter((id) => !trip.dead.includes(id));
      expect(life.travellers.map((t) => t.villager).sort()).toEqual([...back].sort());
      for (const id of back) expect(life.dwellers.some((d) => d.villager === id)).toBe(false);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step(n / STEPS_PER_DAY);
      expect(life.travellers.every((t) => t.phase === 'gone'), `semilla ${seed}: llegan a casa`).toBe(true);
      // Y al día siguiente, en casa.
      const tomorrow = createVillage(state, state.tick * TIME.DAYS_PER_WEEK + 1);
      for (const id of back) expect(tomorrow.dwellers.some((d) => d.villager === id)).toBe(true);
    }
  });
});
