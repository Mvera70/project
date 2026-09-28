// La madera de una en una (esquema 12, 28 sep 2026): propiedades del plan de
// entregas, no su implementación. Lo que el prototipo de Vera promete es que
// cada «+1» es una unidad real, que entra una sola vez, a su hora y de día, y
// que ni guardar, ni los fotogramas, ni el letargo mueven la leñera.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { deserialize, serialize } from '@engine/save';
import { tick } from '@engine/sim';
import { closeWoodRun, creditWoodRun, planWoodRun } from '@engine/subsistence/wood-run';
import type { GameState } from '@engine/state';
import { valleyClock } from '@derive/clock';
import { DUSK, MORNING } from '../../src/render3d/effects/day-phases';

const SEEDS = [3, 7, 11, 19];

/** Una aldea de veinte con unas semanas encima, justo después de un tick. */
function village(seed: number, weeks = 6): GameState {
  const state = foundTwenty(seed);
  for (let week = 0; week < weeks; week += 1) tick(state, CATALOG);
  return state;
}

/** Vive la semana en curso a pasos de `step` de fracción, acreditando como el bucle. */
function liveWeek(state: GameState, step: number): number {
  let entered = 0;
  for (let fraction = step; fraction < 1; fraction += step) entered += creditWoodRun(state, fraction);
  return entered;
}

const snapshot = (state: GameState): string => JSON.stringify(serialize(state, [], [], 0).state);

describe('la madera llega de una en una · esquema 12', () => {
  it('el tick deja la semana planificada y no mete la madera de golpe', () => {
    for (const seed of SEEDS) {
      const state = village(seed);
      const run = state.woodRun;
      expect(run).not.toBeNull();
      expect(run!.tick).toBe(state.tick);
      expect(run!.credited).toBe(0);
      expect(run!.at.length).toBeGreaterThan(0);
    }
  });

  it('cada entrega entra una sola vez, y la semana entera suma lo producido', () => {
    for (const seed of SEEDS) {
      const state = village(seed);
      const run = structuredClone(state.woodRun!);
      const before = state.village.wood;
      const entered = liveWeek(state, 1 / 97);
      // Volver a pedir lo mismo, o una hora anterior, no mete nada más.
      expect(creditWoodRun(state, 0.999)).toBe(0);
      expect(creditWoodRun(state, 0.2)).toBe(0);
      expect(entered).toBe(run.at.length);
      expect(state.village.wood).toBe(before + run.at.length);
      // Y al cerrar, sólo la fracción que no hacía una unidad.
      const owed = closeWoodRun(state);
      expect(owed).toBeCloseTo(run.rest, 9);
      expect(state.village.wood).toBeCloseTo(before + run.at.length + run.rest, 9);
    }
  });

  it('el plan reparte exactamente la madera que se le da', () => {
    const state = village(7);
    for (const wood of [0, 0.4, 1, 5.75, 23.2]) {
      const run = planWoodRun(state, wood);
      expect(run.at.length + run.rest).toBeCloseTo(wood, 9);
      expect(run.rest).toBeGreaterThanOrEqual(0);
      expect(run.rest).toBeLessThan(1);
    }
  });

  it('las entregas van en orden, dentro de la semana y siempre de día', () => {
    for (const seed of SEEDS) {
      const state = village(seed, 10);
      const at = state.woodRun!.at;
      at.forEach((t, i) => {
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(1);
        if (i > 0) expect(t).toBeGreaterThanOrEqual(at[i - 1]!);
        const sun = valleyClock(state.tick, t).sunPhase;
        expect(sun).toBeGreaterThanOrEqual(MORNING);
        expect(sun).toBeLessThanOrEqual(DUSK);
      });
    }
  });

  it('a treinta, a sesenta fotogramas o de un salto, la semana acaba igual', () => {
    for (const seed of SEEDS) {
      const base = village(seed);
      const ends = [1 / 30 / 840, 1 / 60 / 840, 0.25, 0.9999].map((step) => {
        const state = structuredClone(base);
        liveWeek(state, step);
        tick(state, CATALOG);
        return snapshot(state);
      });
      const untouched = structuredClone(base);
      tick(untouched, CATALOG);
      for (const end of ends) expect(end).toBe(snapshot(untouched));
    }
  });

  it('guardar y cargar a media semana conserva la leñera y lo que queda en camino', () => {
    for (const seed of SEEDS) {
      const state = village(seed);
      creditWoodRun(state, 0.5);
      // Por un almacén real: clonado estructurado, como IndexedDB (`save.test.ts`).
      const reloaded = deserialize(structuredClone(serialize(state, [], [], 0))).state;
      expect(reloaded.village.wood).toBe(state.village.wood);
      expect(reloaded.woodRun).toEqual(state.woodRun);
      // Seguir la semana en las dos da lo mismo, y nada entra dos veces.
      liveWeek(state, 1 / 50);
      liveWeek(reloaded, 1 / 50);
      tick(state, CATALOG);
      tick(reloaded, CATALOG);
      expect(snapshot(reloaded)).toBe(snapshot(state));
    }
  });

  it('el letargo, que sólo da semanas enteras, termina en la misma aldea que quien miró', () => {
    for (const seed of SEEDS) {
      const watched = village(seed, 2);
      const away = structuredClone(watched);
      for (let week = 0; week < 12; week += 1) {
        liveWeek(watched, 1 / 40);
        tick(watched, CATALOG);
        tick(away, CATALOG);
      }
      expect(snapshot(away)).toBe(snapshot(watched));
    }
  });
});
