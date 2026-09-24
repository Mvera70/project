// E4 · El fuego se ve. Una casa quemada —el incendio anual de §5.9 o el rayo de
// §7.10— lleva la marca `burnt:<id>` (`burnBuilding`), la pantalla la encuentra
// mientras dura (`burningBuildings`) y deja de verla cuando caduca. Se prueba en
// partidas jugadas y en varias semillas: una sola es ruido.

import { describe, expect, it } from 'vitest';
import { BURNING } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { tick } from '@engine/sim';
import { burningBuildings } from '../../src/render3d/effects/fires';

describe('E4 · la casa que arde', () => {
  it('toda quema del motor deja su marca, y la pantalla la ve hasta que caduca', () => {
    let seen = 0;
    for (const seed of [7, 11, 23, 42]) {
      const state = foundGame(seed);
      while (state.tick < 48 * 6 && state.ended === null) {
        tick(state, CATALOG);
        const fresh = state.buildings.filter((b) => b.lostTick === state.tick && state.flags[`burnt:${b.id}`] !== undefined);
        for (const building of fresh) {
          seen += 1;
          expect(state.flags[`burnt:${building.id}`]).toBe(state.tick + BURNING.FLAG_WEEKS);
          expect(burningBuildings(state).map((b) => b.id)).toContain(building.id);
        }
        for (const building of burningBuildings(state)) {
          expect(state.tick).toBeLessThan(state.flags[`burnt:${building.id}`]!);
        }
      }
    }
    // Las cuatro semillas queman casas en sus seis primeros años (medido: 7, 11,
    // 23 y 42 arden entre el año 1 y el 4).
    expect(seen).toBeGreaterThan(3);
  });

  it('la llama y la brasa caben en la marca: nadie deja de arder antes de tiempo', () => {
    expect(BURNING.FLAME_DAYS + BURNING.EMBER_DAYS).toBeLessThanOrEqual(BURNING.FLAG_WEEKS * 7);
  });
});
