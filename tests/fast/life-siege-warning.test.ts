// E0b · El aviso es una coreografía pura sobre el terreno existente.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createNeighbourhood } from '../../src/render3d/life/grid';
import { pathTo } from '../../src/render3d/life/navigate';
import { beginWarning, lookoutOf, stepWarning, warningActive } from '../../src/render3d/life/siege-warning';
import { createVillage } from '../../src/render3d/life/village';

function land(width = 36, height = 56) {
  return { width, height, blocked: new Uint8Array(width * height) };
}

function warned(seed = 7): GameState {
  const state = foundTwenty(seed);
  state.threat.comingTick = state.tick + 8;
  state.threat.comingBand = 20;
  state.crossroad = null;
  state.history.push({ tick: state.tick, templateId: 'raiders_coming', optionId: 'brace', cast: {} });
  return state;
}

function warningDay(state: GameState): number {
  return state.tick * TIME.DAYS_PER_WEEK;
}

describe('E0b · ventana B2', () => {
  it('reconoce B2 resuelta con llegada futura, no una amenaza cualquiera', () => {
    expect(warningActive('raiders_coming', 10, 11)).toBe(true);
    expect(warningActive('raiders_coming', 10, null)).toBe(false);
    expect(warningActive('raiders_coming', 10, 10)).toBe(false);
    expect(warningActive('raiders_coming', 10, 9)).toBe(false);
    expect(warningActive('brace', 10, 11)).toBe(false);
    expect(warningActive(null, 10, 11)).toBe(false);
  });
});

describe('E0b · punto y recorrido', () => {
  it('elige un punto del lado de llegada, exterior y con regreso real', () => {
    const ground = land(32, 32);
    const village = { x: 8.5, z: 15.5 };
    const approach = { x: 27.5, z: 15.5 };
    const lookout = lookoutOf(ground, approach, village);
    expect(lookout).not.toBeNull();
    const at = lookout!;
    const along = at.x - village.x;
    expect(along).toBeGreaterThan((approach.x - village.x) / 2);
    expect(Math.hypot(at.x - approach.x, at.z - approach.z))
      .toBeLessThan(Math.hypot(at.x - village.x, at.z - village.z));
    expect(pathTo(ground, at, village)).not.toBeNull();
  });

  it('no degrada a un punto inventado cuando el corredor no tiene vuelta', () => {
    const ground = land(20, 20);
    for (let z = 0; z < ground.height; z += 1) ground.blocked[z * ground.width + 10] = 1;
    expect(lookoutOf(ground, { x: 17.5, z: 10.5 }, { x: 3.5, z: 10.5 })).toBeNull();
  });

  it('mira y vuelve por una ruta sin atravesar el bloqueo', () => {
    const ground = land(30, 30);
    for (let z = 3; z < 27; z += 1) if (z !== 15) ground.blocked[z * ground.width + 16] = 1;
    const body = { id: 1, x: 22.5, z: 15.5, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.2 };
    const warning = beginWarning(body, ground, { x: 26.5, z: 15.5 }, { x: 5.5, z: 15.5 }, 0);
    expect(warning).not.toBeNull();
    const around = createNeighbourhood(ground.width, ground.height);
    around.rebuild([body]);
    for (let step = 0; step < 3600 && warning !== null; step += 1) {
      around.rebuild([body]);
      const active = stepWarning(body, warning, ground, around);
      const cell = Math.floor(body.z) * ground.width + Math.floor(body.x);
      expect(ground.blocked[cell]).toBe(0);
      if (!active) break;
    }
    expect(Math.hypot(body.x - 5.5, body.z - 15.5)).toBeLessThan(1);
  });
});

describe('E0b · selección y pureza', () => {
  it('reconstruye el mismo observador y no escribe el estado del motor', () => {
    for (const seed of [7, 23]) {
      const state = warned(seed);
      const before = JSON.stringify(state);
      const first = createVillage(state, warningDay(state), { land: land(state.map.width, state.map.height) });
      const second = createVillage(structuredClone(state), warningDay(state), { land: land(state.map.width, state.map.height) });
      const pick = (life: typeof first) => life.dwellers
        .filter((dweller) => dweller.warning !== undefined)
        .map((dweller) => ({ id: dweller.villager, warning: dweller.warning }));
      expect(pick(second), `semilla ${seed}`).toEqual(pick(first));
      expect(pick(first), `semilla ${seed}`).toHaveLength(1);
      for (let step = 0; step < 900; step += 1) first.step();
      expect(JSON.stringify(state), `semilla ${seed}`).toBe(before);
    }
  });

  it('el control con la misma amenaza no añade coreografía', () => {
    const state = warned(23);
    const control = structuredClone(state);
    control.history.pop();
    const active = createVillage(state, warningDay(state), { land: land(state.map.width, state.map.height) });
    const quiet = createVillage(control, warningDay(control), { land: land(control.map.width, control.map.height) });
    expect(active.dwellers.filter((dweller) => dweller.warning !== undefined)).toHaveLength(1);
    expect(quiet.dwellers.filter((dweller) => dweller.warning !== undefined)).toHaveLength(0);
  });

  it('no confunde la modal pendiente, una decisión antigua ni una llegada pasada con B2 resuelta hoy', () => {
    const base = warned(7);
    const pending = structuredClone(base);
    pending.history.pop();
    pending.crossroad = { templateId: 'raiders_coming', posedTick: pending.tick, cast: {}, optionIds: [] };
    const old = structuredClone(base);
    old.history[old.history.length - 1]!.tick -= 1;
    const past = structuredClone(base);
    past.threat.comingTick = past.tick;
    for (const state of [pending, old, past]) {
      const life = createVillage(state, warningDay(state), { land: land(state.map.width, state.map.height) });
      expect(life.dwellers.filter((dweller) => dweller.warning !== undefined)).toHaveLength(0);
    }
  });

  it('no repite el mensajero en las otras jornadas de la misma semana', () => {
    const state = warned(7);
    const nextDay = createVillage(state, warningDay(state) + 1, {
      land: land(state.map.width, state.map.height),
    });
    expect(nextDay.dwellers.filter((dweller) => dweller.warning !== undefined)).toHaveLength(0);
  });
});
