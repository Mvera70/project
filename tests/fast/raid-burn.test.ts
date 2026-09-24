// E4 · «Si toman la villa, los asaltantes queman casas» (Vera, 25 sep 2026).
//
// Tomada: arden las casas de madera más cercanas al portón, por donde entraron.
// Saqueada a campo abierto: arde una, nunca la última. Saqueada tras la
// muralla: no arde nada, porque no entraron. Toda quema pasa por
// `burnBuilding`, así que la pantalla la ve (`fire-marks.test.ts`), y se cuenta
// en la crónica. Varias semillas, porque una sola es ruido.

import { describe, expect, it } from 'vitest';
import { THREAT, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import { resistance } from '@engine/world/garrison';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [7, 11, 23];

function grown(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  return state;
}

function fence(state: GameState): void {
  let id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
  const put = (kind: 'palisade' | 'gate', x: number, y: number): void => {
    state.buildings.push({ id: id++, kind, x, y, w: 1, h: 1, builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null });
  };
  put('gate', 30, 40);
  for (let n = 1; n <= 6; n += 1) put('palisade', 30 + n, 40);
}

const burntThisWeek = (state: GameState): number =>
  state.buildings.filter((b) => b.lostTick === state.tick && state.flags[`burnt:${b.id}`] !== undefined).length;

describe('E4 · lo que queman al entrar', () => {
  it('una villa tomada arde por el portón, y se cuenta', () => {
    for (const seed of SEEDS) {
      const state = grown(seed);
      fence(state);
      state.threat.comingTick = state.tick + 1;
      state.threat.comingBand = Math.ceil(resistance(state) * THREAT.STORM_ODDS) + 1;
      const wooden = state.buildings.filter((b) => b.kind === 'house' && b.tier === 0 && b.lostTick === null).length;
      tick(state, CATALOG);
      tick(state, CATALOG);
      expect(state.ended?.cause, `semilla ${seed}`).toBe('stormed');
      expect(burntThisWeek(state), `semilla ${seed}`).toBe(Math.min(THREAT.STORM_BURN, wooden));
      expect(state.chronicle.some((e) => e.templateKey === 'raid.burnt'), `semilla ${seed}`).toBe(true);
    }
  });

  it('una aldea abierta saqueada pierde una casa, y nunca la última', () => {
    for (const seed of SEEDS) {
      const state = grown(seed);
      state.threat.comingTick = state.tick + 1;
      state.threat.comingBand = 1;
      tick(state, CATALOG);
      expect(state.ended, `semilla ${seed}`).toBeNull();
      expect(burntThisWeek(state), `semilla ${seed}`).toBe(THREAT.SACK_BURN);

      // Con un solo techo en pie, el saqueo no lo quema.
      const lonely = grown(seed);
      const roofs = lonely.buildings.filter((b) => b.lostTick === null && (b.kind === 'house' || b.kind === 'stone_house'));
      for (const roof of roofs.slice(1)) roof.lostTick = lonely.tick;
      lonely.threat.comingTick = lonely.tick + 1;
      lonely.threat.comingBand = 1;
      tick(lonely, CATALOG);
      expect(burntThisWeek(lonely), `semilla ${seed}, una sola casa`).toBe(0);
    }
  });

  it('tras la muralla no arde nada: no entraron', () => {
    for (const seed of SEEDS) {
      const state = grown(seed);
      fence(state);
      state.threat.comingTick = state.tick + 1;
      state.threat.comingBand = 1;
      tick(state, CATALOG);
      expect(state.ended, `semilla ${seed}`).toBeNull();
      expect(burntThisWeek(state), `semilla ${seed}`).toBe(0);
    }
  });
});
