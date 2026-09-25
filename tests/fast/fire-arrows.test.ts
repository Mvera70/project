// E4 · Flechas incendiarias (decisión del dueño del diseño, 25 sep 2026): sólo
// cuando el cerco aguanta un asalto; uno o dos tejados de madera junto a la
// muralla; y la aldea los apaga con cubos si tiene agua cerca
// (`THREAT.SAVE_REACH`), o arden. Se cuenta en la crónica. Tres semillas.

import { describe, expect, it } from 'vitest';
import { THREAT, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import { resistance } from '@engine/world/garrison';
import { TERRAIN_CODE, type GameState, type PlayerAct } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [7, 11, 23];

function assaulted(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  let id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
  const put = (kind: 'palisade' | 'gate', x: number, y: number): void => {
    state.buildings.push({ id: id++, kind, x, y, w: 1, h: 1, builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null });
  };
  put('gate', 30, 40);
  for (let n = 1; n <= 6; n += 1) put('palisade', 30 + n, 40);
  state.threat.comingTick = state.tick + 1;
  state.threat.comingBand = Math.ceil(resistance(state) * THREAT.STORM_ODDS) + 1;
  return state;
}

/** Una batalla que para el asalto: tumba a la mayor parte de la partida. */
function held(state: GameState): PlayerAct {
  return { kind: 'battle', slain: Math.round(state.threat.lastBand * 0.9), lost: 0, breached: false };
}

function nearWater(state: GameState, b: { x: number; y: number; w: number; h: number }): boolean {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  if (state.buildings.some((w) => w.kind === 'well' && w.lostTick === null
    && Math.hypot(w.x + w.w / 2 - cx, w.y + w.h / 2 - cy) <= THREAT.SAVE_REACH)) return true;
  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    const t = state.map.terrain[cell];
    if (t !== TERRAIN_CODE.water && t !== TERRAIN_CODE.lake) continue;
    if (Math.hypot(cell % state.map.width + 0.5 - cx, Math.floor(cell / state.map.width) + 0.5 - cy) <= THREAT.SAVE_REACH) return true;
  }
  return false;
}

describe('E4 · flechas incendiarias contra un cerco que aguanta', () => {
  it('prenden uno o dos tejados; con agua cerca se salvan y sin ella arden', () => {
    for (const seed of SEEDS) {
      const state = assaulted(seed);
      tick(state, CATALOG);
      tick(state, CATALOG, undefined, [held(state)]);
      expect(state.ended, `semilla ${seed}: el cerco aguantó`).toBeNull();
      const burnt = state.buildings.filter((b) => b.lostTick === state.tick && state.flags[`burnt:${b.id}`] !== undefined);
      const saved = state.buildings.filter((b) => b.lostTick === null && state.flags[`doused:${b.id}`] !== undefined);
      const hit = burnt.length + saved.length;
      expect(hit, `semilla ${seed}`).toBeGreaterThanOrEqual(THREAT.ARROW_ROOFS);
      expect(hit, `semilla ${seed}`).toBeLessThanOrEqual(THREAT.ARROW_ROOFS_STRONG);
      for (const house of saved) expect(nearWater(state, house), `semilla ${seed}: salvada con agua`).toBe(true);
      for (const house of burnt) expect(nearWater(state, house), `semilla ${seed}: ardió sin agua`).toBe(false);
      const line = state.chronicle.find((e) => e.templateKey.startsWith('raid.arrows.'));
      expect(line?.templateKey, `semilla ${seed}`).toBe(burnt.length > 0 ? 'raid.arrows.burnt' : 'raid.arrows.saved');
    }
  });

  it('en un saqueo no hay flechas: sólo contra el cerco que aguanta', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
      state.threat.comingTick = state.tick + 1;
      state.threat.comingBand = 1;
      tick(state, CATALOG);
      expect(state.chronicle.some((e) => e.templateKey.startsWith('raid.arrows.')), `semilla ${seed}`).toBe(false);
      expect(Object.keys(state.flags).some((k) => k.startsWith('doused:')), `semilla ${seed}`).toBe(false);
    }
  });
});
