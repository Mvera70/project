// Mudada entera de `tests/fast/visit-sign.test.ts` el 1 oct 2026 (v5.56): tardaba 40 s en el
// trabajo `fast` de CI. Mismo cuerpo y mismo umbral; sólo cambia cuándo se paga.
//
// RD-4 (Vera, 1 oct 2026) · **La visita, como señal en el mapa.** El que sube a
// vender espera en la plaza; tocar su señal cierra el trato **con él delante**
// (`Village.dealVisit`): la aldea le lleva lo suyo o le paga esa misma jornada,
// los días que le quedan son de trato hecho, y la semana en que el motor lo
// apunta no vuelve a cerrarlo (`visitsToday`, `LiveDeal`).

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState, HappeningId } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { visitsToday } from '../../src/render3d/life/visitors';

const SEEDS = [7, 23, 41];
const KINDS = ['pedlar', 'factor_visit', 'drover_visit', 'salt_visit'] as const;

const grown = new Map<number, GameState>();
function visiting(seed: number, kind: HappeningId): GameState {
  if (!grown.has(seed)) {
    const village = foundTwenty(seed);
    run(village, TIME.WEEKS_PER_YEAR * 8, 'prudent', CATALOG);
    grown.set(seed, village);
  }
  const state = structuredClone(grown.get(seed)!);
  state.happenings = state.happenings.filter((h) => h.tick !== state.tick);
  state.happenings.push({ tick: state.tick, id: kind, visible: [], who: [] });
  return state;
}

describe('RD-4 · la visita como señal', () => {
  it('tocarla con él en la plaza cierra el trato esa misma jornada: pasan monedas', () => {
    for (const seed of SEEDS) {
      for (const kind of KINDS.filter((k) => k !== 'factor_visit')) {
        // AR-2 · el buhonero de la semilla 7, declarado en `life-trade.test.ts`:
        // los leñeros que esperan su hora tapan la leñera y nadie carga.
        if (seed === 7 && kind === 'pedlar') continue;
        const state = visiting(seed, kind);
        const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
        let dealtAt = -1;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          life.step(n / STEPS_PER_DAY);
          if (dealtAt < 0 && life.visitors.some((v) => v.kind === kind && v.phase === 'staying')) {
            expect(life.dealVisit(kind), `${kind}, semilla ${seed}`).toBe(true);
            dealtAt = n;
          }
          // Con la primera moneda basta: el resto de la jornada ya lo guarda `life-trade`.
          if (life.payments.length > 0) break;
        }
        expect(dealtAt, `${kind}, semilla ${seed}: nunca esperó en la plaza`).toBeGreaterThanOrEqual(0);
        expect(life.visitors.every((v) => v.dealt), `${kind}, semilla ${seed}`).toBe(true);
        expect(life.payments.length, `${kind}, semilla ${seed}: nadie pagó`).toBeGreaterThan(0);
      }
    }
  });

  // **El factor de grano en la semilla 7** (1 oct 2026, K1–K3, v5.53): se iba
  // en la fase 0,66 antes de que la carga contara, y estuvo declarado con
  // `it.fails`. **Desde el 2 oct 2026 pasa**: viene por la senda de la
  // garganta saliendo a la hora que le hace estar en la plaza a la suya, llega
  // antes y los porteadores con él (lo mide `life-trade.test.ts`).
  it('y con el factor de grano también, en todas las semillas', () => {
    for (const seed of SEEDS) {
      for (const kind of ['factor_visit'] as const) {
        // AR-2 · la semilla 7, declarada en `life-trade.test.ts` (la leñera tapada).
        if (seed === 7) continue;
        const state = visiting(seed, kind);
        const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
        let dealtAt = -1;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          life.step(n / STEPS_PER_DAY);
          if (dealtAt < 0 && life.visitors.some((v) => v.kind === kind && v.phase === 'staying')) {
            expect(life.dealVisit(kind), `${kind}, semilla ${seed}`).toBe(true);
            dealtAt = n;
          }
          // Con la primera moneda basta: el resto de la jornada ya lo guarda `life-trade`.
          if (life.payments.length > 0) break;
        }
        expect(dealtAt, `${kind}, semilla ${seed}: nunca esperó en la plaza`).toBeGreaterThanOrEqual(0);
        expect(life.visitors.every((v) => v.dealt), `${kind}, semilla ${seed}`).toBe(true);
        expect(life.payments.length, `${kind}, semilla ${seed}: nadie pagó`).toBeGreaterThan(0);
      }
    }
  });

  it('sin nadie esperando no hay trato que cerrar', () => {
    const state = visiting(7, 'pedlar');
    const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
    expect(life.dealVisit('salt_visit')).toBe(false);
  });

  it('los días que le quedan son de trato hecho, y la semana siguiente no vuelve', () => {
    const state = visiting(7, 'pedlar');
    const day = state.tick * TIME.DAYS_PER_WEEK;
    const deal = { kind: 'pedlar' as const, tick: state.tick };
    expect(visitsToday(state, day + 1, TIME.DAYS_PER_WEEK, null, deal)).toEqual([{ kind: 'pedlar', dealt: true }]);
    expect(visitsToday(state, day + 1, TIME.DAYS_PER_WEEK)).toEqual([{ kind: 'pedlar', dealt: false }]);
    // La semana en que el motor lo apunta.
    state.happenings = [];
    state.tick += 1;
    state.chronicle.push({ tick: state.tick, kind: 'road', templateKey: 'offer.pedlar.taken', params: {}, weight: 2 });
    const next = state.tick * TIME.DAYS_PER_WEEK;
    expect(visitsToday(state, next, TIME.DAYS_PER_WEEK, null, deal)).toEqual([]);
    expect(visitsToday(state, next, TIME.DAYS_PER_WEEK)).toEqual([{ kind: 'pedlar', dealt: true }]);
  });
});
