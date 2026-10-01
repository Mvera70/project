// K3a (Vera, 1 oct 2026) · **La leña del invierno no se gasta en obras.**
//
// Medido en `main` (`docs/medidas/k1-k3-madera-2026-10-01.md`): la madera
// apretaba en 11 de 12 partidas porque la aldea abría un granero a las puertas
// del invierno y se quedaba sin leña. Vera quiere que la escasez venga del
// bosque: en otoño y en invierno la aldea no abre una obra que la deje sin el
// invierno que queda (`winterReserve`), y fuera de ellos no guarda nada.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { winterReserve } from '@engine/subsistence/consumption';
import { seasonOf } from '@engine/time';
import type { GameState } from '@engine/state';
import { nextProject, woodCostOf } from '@engine/world/works';
import { foundTwenty } from '../helpers/founding';

/** Una aldea hecha, a los dos años. */
function grown(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  return state;
}

/** La misma aldea en la semana `week` del año: el calendario es lo único que cambia. */
function at(state: GameState, week: number): GameState {
  return { ...state, tick: Math.floor(state.tick / TIME.WEEKS_PER_YEAR) * TIME.WEEKS_PER_YEAR + week };
}

/** Lo que esa aldea abriría con madera de sobra, y lo que cuesta; o `null`. */
function wish(state: GameState): number | null {
  const project = nextProject({ ...state }, Number.POSITIVE_INFINITY);
  return project === null ? null : woodCostOf(state, typeof project === 'string' ? project : project.kind);
}

/** La aldea con `wood` en la leñera. */
const withWood = (state: GameState, wood: number): GameState => ({ ...state, village: { ...state.village, wood } });

describe('K3a · la leña del invierno', () => {
  it('en otoño e invierno se guarda lo que queda de invierno, y en primavera y verano nada', () => {
    const state = grown(7);
    for (let week = 0; week < TIME.WEEKS_PER_YEAR; week += 1) {
      const season = seasonOf(at(state, week).tick);
      const reserve = winterReserve(at(state, week));
      if (season === 'spring' || season === 'summer') expect(reserve, `semana ${week}`).toBe(0);
      else expect(reserve, `semana ${week}`).toBeGreaterThan(0);
    }
    // Y lo guardado baja según pasa el invierno: al final ya no queda que guardar.
    const winter = TIME.WEEKS_PER_SEASON * 3;
    expect(winterReserve(at(state, winter + 1))).toBeLessThan(winterReserve(at(state, winter)));
  });

  it('no se abre una obra que deje la leñera sin el invierno, y con él guardado sí', () => {
    let measured = 0;
    for (const seed of [7, 11, 23, 41, 3, 5]) {
      const autumn = at(grown(seed), TIME.WEEKS_PER_SEASON * 2);
      const cost = wish(autumn);
      if (cost === null || cost === 0) continue;
      measured += 1;
      // Hacia arriba: 180 + 134,4 − 134,4 es 179,999… en coma flotante.
      const reserve = Math.ceil(winterReserve(autumn));
      const spent = (s: GameState): number => {
        const p = nextProject({ ...s });
        return p === null ? 0 : woodCostOf(s, typeof p === 'string' ? p : p.kind);
      };
      // Con un tronco de menos: o nada, o algo que deja el invierno intacto.
      const short = withWood(autumn, cost + reserve - 1);
      expect(short.village.wood - spent(short), `semilla ${seed}`).toBeGreaterThanOrEqual(winterReserve(autumn));
      expect(nextProject({ ...withWood(autumn, cost + reserve) }), `semilla ${seed}: con el invierno guardado`)
        .not.toBeNull();
    }
    expect(measured, 'aldeas con una obra que pedir en otoño').toBeGreaterThanOrEqual(3);
  });

  it('en primavera la misma leña basta, sin guardar nada', () => {
    let measured = 0;
    for (const seed of [7, 11, 23, 41, 3, 5]) {
      const spring = at(grown(seed), 1);
      const cost = wish(spring);
      if (cost === null || cost === 0) continue;
      measured += 1;
      expect(nextProject({ ...withWood(spring, cost) }), `semilla ${seed}`).not.toBeNull();
    }
    expect(measured, 'aldeas con una obra que pedir en primavera').toBeGreaterThanOrEqual(3);
  });
});
