// El valle más vivo (25 sep 2026) · la comida en corro al mediodía y la hoguera
// de la tarde, en la plaza. Varias semillas; la jornada con su hora real.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { hearthAt } from '../../src/render3d/effects/hearth';

function day(seed: number): { meal: number[]; hearth: number[]; people: number } {
  const state = foundTwenty(seed);
  run(state, 48 * 20, 'prudent', CATALOG);
  const life = createVillage(state, 0);
  const meal: number[] = [];
  const hearth: number[] = [];
  for (let n = 0; n < STEPS_PER_DAY; n += 1) {
    const phase = n / STEPS_PER_DAY;
    life.step(phase);
    for (const d of life.dwellers) {
      if (d.doing?.there !== true) continue;
      if (d.doing.offer.id === 'meal') meal.push(phase);
      if (d.doing.offer.id === 'hearth') hearth.push(phase);
    }
  }
  return { meal, hearth, people: life.dwellers.length };
}

describe('la plaza se llena a sus horas', () => {
  it('se come en corro al mediodía y se sientan al fuego por la tarde, y a su hora', () => {
    for (const seed of [7, 23]) {
      const { meal, hearth } = day(seed);
      expect(meal.length, `semilla ${seed}: alguien come`).toBeGreaterThan(0);
      expect(hearth.length, `semilla ${seed}: alguien va al fuego`).toBeGreaterThan(0);
      // La mayor parte de la comida cae alrededor del mediodía, y ninguna de
      // noche; el fuego, por la tarde y nunca de mañana.
      expect(meal.filter((p) => p >= 0.4 && p <= 0.62).length / meal.length, `semilla ${seed}`).toBeGreaterThan(0.8);
      expect(hearth.every((p) => p >= 0.55 && p <= 0.72), `semilla ${seed}`).toBe(true);
    }
  });

  it('la hoguera arde sólo a su hora, y se enciende y se apaga sin saltos', () => {
    expect(hearthAt(0.3)).toBe(0);
    expect(hearthAt(0.62)).toBe(1);
    expect(hearthAt(0.9)).toBe(0);
    expect(hearthAt(0.555)).toBeGreaterThan(0);
    expect(hearthAt(0.555)).toBeLessThan(1);
  });
});

// Con lluvia la gente se resguarda: no hay ocio al aire libre.
import { skyAt } from '../../src/derive/weather';

describe('con lluvia, a cubierto', () => {
  it('un día de tormenta nadie está de charla, de juego o de comida en la calle', () => {
    const OPEN = new Set(['gossip', 'meal', 'hearth', 'loiter', 'play', 'chase', 'pet', 'feed']);
    let wetDays = 0;
    for (const seed of [7, 11, 23, 42]) {
      const state = foundTwenty(seed);
      run(state, 48 * 20 + 20, 'prudent', CATALOG);
      let day = -1;
      for (let d = state.tick * 7 - 70; d < state.tick * 7 + 7 && day < 0; d += 1) {
        const kind = skyAt(state, d).kind;
        if (kind === 'rain' || kind === 'storm') day = d;
      }
      if (day < 0) continue;
      wetDays += 1;
      const life = createVillage(state, day);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        const phase = n / STEPS_PER_DAY;
        life.step(phase);
        if (phase < 0.2 || phase > 0.7) continue;
        for (const d of life.dwellers) {
          const outside = OPEN.has(d.doing?.offer.id ?? '') || d.doing?.place.id.startsWith('leisure:') === true;
          expect(outside, `semilla ${seed}, día ${day}`).toBe(false);
        }
      }
    }
    expect(wetDays, 'hay días de lluvia que medir').toBeGreaterThan(1);
  });
});
