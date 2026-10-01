// RD-4 (Vera, 1 oct 2026) · **El niño perdido, en dos tiempos** (`world/lost-child.ts`).
// La semana del suceso el niño se pierde; la siguiente lo trae quien fue a
// buscarlo —el ánimo vuelve y el niño se lo debe— o lo encuentra el valle al
// anochecer, y el ánimo perdido no vuelve. Y el acto no desplaza la partida.

import { describe, expect, it } from 'vitest';
import { FATE, LIFE, OPINION, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { opinionOf } from '@engine/people/opinions';
import { ageOf } from '@engine/people/villagers';
import { isHere } from '@engine/people/demography';
import { deserialize, serialize } from '@engine/save';
import { run, tick } from '@engine/sim';
import type { GameState, VillagerId } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [7, 23];

/** Una aldea con niños, y un niño perdido esta semana (el suceso lo deja así). */
function lostThisWeek(seed: number): { state: GameState; child: VillagerId; searcher: VillagerId } {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 6, 'prudent', CATALOG);
  const here = state.people.villagers.filter((v) => isHere(v));
  const child = here.find((v) => ageOf(v, state.tick) < LIFE.ADULT[0])!;
  const searcher = here.find((v) => ageOf(v, state.tick) >= LIFE.ADULT[0])!;
  state.happenings.push({ tick: state.tick, id: 'child_lost', visible: [], who: [child.id] });
  return { state, child: child.id, searcher: searcher.id };
}

describe('RD-4 · el niño perdido', () => {
  it('quien fue a buscarlo lo trae: el ánimo vuelve y el niño se lo debe', () => {
    for (const seed of SEEDS) {
      const { state, child, searcher } = lostThisWeek(seed);
      const plain = structuredClone(state);
      const before = opinionOf(state, child, searcher);
      tick(state, CATALOG, undefined, [{ kind: 'search', sourceTick: state.tick, child, searcher }]);
      tick(plain, CATALOG);
      const line = state.chronicle.find((e) => e.tick === state.tick && e.templateKey.startsWith('child.found_by'));
      expect(line, `semilla ${seed}`).toBeDefined();
      expect(plain.chronicle.some((e) => e.tick === plain.tick && e.templateKey === 'child.found_at_dusk'), `semilla ${seed}`).toBe(true);
      expect(state.acts.at(-1)!.done).toBe(true);
      expect(opinionOf(state, child, searcher)).toBeGreaterThan(before);
      expect(opinionOf(state, child, searcher) - opinionOf(plain, child, searcher)).toBeGreaterThanOrEqual(OPINION.WAS_SAVED - 1);
      // El ánimo: lo mismo que sin búsqueda más casi todo lo que vuelve (el
      // resto de la semana lo deriva un poco, y el tope lo corta).
      const gap = state.village.morale - plain.village.morale;
      expect(gap > FATE.CHILD_FOUND_MORALE * 0.8 || state.village.morale === 100, `semilla ${seed}: ${gap}`).toBe(true);
      // Y no consume tirada: el azar sigue igual que sin búsqueda.
      expect(state.rng).toEqual(plain.rng);
    }
  });

  it('un acto de otra semana, u otro niño, no hace nada', () => {
    const { state, child, searcher } = lostThisWeek(7);
    tick(state, CATALOG, undefined, [{ kind: 'search', sourceTick: state.tick - 1, child, searcher }]);
    expect(state.acts.at(-1)!.done).toBe(false);
    expect(state.chronicle.some((e) => e.tick === state.tick && e.templateKey === 'child.found_at_dusk')).toBe(true);
  });

  it('una partida con una búsqueda se guarda y se carga', () => {
    const { state, child, searcher } = lostThisWeek(7);
    tick(state, CATALOG, undefined, [{ kind: 'search', sourceTick: state.tick, child, searcher }]);
    const file = serialize(state, [], [], 1);
    expect(() => deserialize(structuredClone(file))).not.toThrow();
  });
});
