// E0 · Pagar al clan es una salida única, con carga y por el portón real.

import { describe, expect, it } from 'vitest';
import { THREAT, TIME } from '@engine/balance';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { castOf } from '../../src/render3d/life/cast';
import { payoffActive } from '../../src/render3d/life/payoff';
import { createVillage } from '../../src/render3d/life/village';

function land(state: GameState) {
  return { width: state.map.width, height: state.map.height, blocked: new Uint8Array(state.map.width * state.map.height) };
}

function paid(seed = 7): GameState {
  const state = foundTwenty(seed);
  state.tick = 20;
  state.buildings.push({ id: 90_001, kind: 'gate', x: 30, y: 40, w: 1, h: 1, builtTick: state.tick,
    lostTick: null, tier: 0, lit: true, blockedUntil: null });
  state.flags['bought_off'] = state.tick + TIME.WEEKS_PER_YEAR;
  state.history.push({ tick: state.tick - THREAT.WARNING_WEEKS, templateId: 'raiders_coming', optionId: 'pay', cast: {} });
  state.threat.comingTick = null;
  return state;
}

describe('E0 · pago al clan', () => {
  it('sólo abre la escena cuando bought_off llega al turned_back y nunca otro día', () => {
    const state = paid(7);
    const day = state.tick * TIME.DAYS_PER_WEEK;
    expect(payoffActive(state, day)).toBe(true);
    expect(payoffActive(state, day + 1)).toBe(false);
    const active = createVillage(state, day, { land: land(state) });
    const tomorrow = createVillage(state, day + 1, { land: land(state) });
    expect(active.dwellers.filter((dweller) => dweller.payoff !== undefined).length).toBeGreaterThanOrEqual(2);
    expect(active.dwellers.filter((dweller) => dweller.payoff !== undefined).length).toBeLessThanOrEqual(3);
    expect(tomorrow.dwellers.filter((dweller) => dweller.payoff !== undefined)).toHaveLength(0);
  });

  it('manda dos o tres adultos con carga por rutas reales y no desarma la guarnición', () => {
    const state = paid(23);
    const day = state.tick * TIME.DAYS_PER_WEEK;
    const life = createVillage(state, day, { land: land(state) });
    const control = structuredClone(state);
    delete control.flags['bought_off'];
    const ordinary = createVillage(control, day, { land: land(control) });
    const porters = life.dwellers.filter((dweller) => dweller.payoff !== undefined);
    expect(porters.length).toBeGreaterThanOrEqual(2);
    expect(porters.length).toBeLessThanOrEqual(3);
    const gate = { x: 30.5, z: 40.5 };
    expect(porters.every((porter) => porter.payoff!.route.length > 0)).toBe(true);
    expect(porters.every((porter) => porter.payoff!.route.some((point) => point.x === gate.x && point.z === gate.z))).toBe(true);
    // La carga se añade a quien ya estaba en el valle: no aparece junto a la
    // puerta. El control sólo quita E0 y conserva el mismo amanecer.
    for (const porter of porters) {
      const usual = ordinary.dwellers.find((dweller) => dweller.villager === porter.villager);
      expect(usual).toBeDefined();
      expect({ x: porter.body.x, z: porter.body.z }).toEqual({ x: usual!.body.x, z: usual!.body.z });
    }
    expect(porters.every((porter) => !porter.dayPlan?.job?.place.startsWith('post:'))).toBe(true);
    const cast = castOf(life, 0, new Map(), new Set());
    expect(cast.filter((actor) => porters.some((porter) => porter.villager === actor.id) && actor.load !== null)).toHaveLength(porters.length);

    const nearestGate = new Map(porters.map((porter) => [porter.villager, Number.POSITIVE_INFINITY]));
    for (let step = 0; step < 3_600; step += 1) {
      life.step();
      for (const porter of life.dwellers.filter((dweller) => nearestGate.has(dweller.villager))) {
        nearestGate.set(porter.villager, Math.min(nearestGate.get(porter.villager)!, Math.hypot(porter.body.x - gate.x, porter.body.z - gate.z)));
      }
    }
    expect([...nearestGate.values()].every((distance) => distance < 0.7)).toBe(true);
  });

  it('termina la salida sin retener el reparto ni escribir el estado', () => {
    const state = paid(41);
    const before = JSON.stringify(state);
    const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK, { land: land(state) });
    for (let step = 0; step < 3_600; step += 1) life.step();
    expect(life.dwellers.filter((dweller) => dweller.payoff !== undefined)).toHaveLength(0);
    expect(life.dwellers.filter((dweller) => dweller.holding !== null && dweller.holding <= -5_000_000)).toHaveLength(0);
    expect(JSON.stringify(state)).toBe(before);
  });
});
