// D6 · Una entrada no basta: el saqueador tiene que llegar a un edificio.

import { describe, expect, it } from 'vitest';
import { THREAT, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { tick, run } from '@engine/sim';
import { resistance } from '@engine/world/garrison';
import { createVillage } from '../../src/render3d/life/village';
import { foundTwenty } from '../helpers/founding';
import type { GameState } from '@engine/state';

/** Un asalto pequeño pero real, con la misma puerta 1×1 que monta el motor. */
function stormed(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  let id = state.buildings.reduce((next, building) => Math.max(next, building.id + 1), 0);
  const put = (kind: 'palisade' | 'gate', x: number, y: number): void => {
    state.buildings.push({
      id: id++, kind, x, y, w: 1, h: 1, builtTick: state.tick,
      lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
  };
  put('gate', 30, 40);
  for (let offset = 1; offset <= 6; offset += 1) put('palisade', 30 + offset, 40);
  state.threat.comingTick = state.tick + 1;
  state.threat.comingBand = Math.ceil(resistance(state) * THREAT.STORM_ODDS) + 1;
  tick(state, CATALOG);
  return state;
}

describe('D6 · el saqueo tras el boquete', () => {
  it.each([7, 23])('en semilla %i sale de la jamba, carga y se retira sin tocar el motor', (seed) => {
    const state = stormed(seed);
    const before = JSON.stringify(state);
    const life = createVillage(state, 0);
    let sawSeeking = false;
    const loaded = new Set<number>();
    for (let step = 0; step < 7_200; step += 1) {
      for (const raider of life.raiders) {
        if (raider.phase === 'seeking') {
          sawSeeking = true;
          expect(raider.load, `el saqueador ${raider.body.id} aún no ha llegado`).toBeNull();
        }
        if (raider.load !== null && raider.load !== undefined) loaded.add(raider.body.id);
      }
      life.step();
      if (life.sack?.phase === 'complete') break;
    }
    const carriedHome = life.raiders.filter((raider) => loaded.has(raider.body.id));
    expect(sawSeeking, 'la ruta se recorre antes del gesto').toBe(true);
    expect(loaded.size, 'la carga sólo nace al alcanzar una puerta').toBeGreaterThan(0);
    expect(life.sack?.traces, 'cada carga conserva una huella').toBe(loaded.size);
    expect(new Set(life.sack?.targets.map((target) => target.id)).size, 'los objetivos no se duplican').toBe(life.sack?.targets.length);
    expect(carriedHome.some((raider) => raider.phase === 'gone' && !raider.forced),
      'al menos una carga vuelve por una salida alcanzable').toBe(true);
    expect(JSON.stringify(state), 'la escena sólo representa el resultado del motor').toBe(before);
  });
});
