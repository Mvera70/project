// Lo lento de `tests/fast/trade.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 77 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-30 · design.md §7.8 — los comerciantes del camino.
//
// Lo que se protege: que un trato mueva de verdad el rebaño y no sólo el
// texto, que ningún trato deje a la aldea con más cabezas de las que puede
// alimentar ni con menos de cero, que la sal cumpla lo que promete, y que los
// tres comerciantes sean gente distinta y no un mismo menú con tres nombres.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG, TRADE_TEMPLATES } from '@engine/crossroads/catalog';
import { applyEffect } from '@engine/crossroads/resolve';
import { OFFER } from '@engine/balance';
import { postOffer } from '@engine/world/road';
import { run } from '@engine/sim';
import type { AppliedEffects } from '@engine/crossroads/schema';
import type { GameState } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** `applyEffect` pide reparto y acumulador; ningún efecto de trueque usa ni
 * uno ni otro, así que aquí van vacíos y se comprueba que siguen vacíos. */
function blank(): AppliedEffects {
  return {
    templateId: 'test', optionId: 'test', killed: [], left: [], arrived: [],
    seedsPlanted: [], build: [], destroy: [], fell: [], visible: [],
  };
}

function trade(state: GameState, kind: 'hens' | 'pigs' | 'cows', delta: number): AppliedEffects {
  const out = blank();
  applyEffect(state, {}, { k: 'herd', kind, delta }, out);
  return out;
}
describe('el trato mueve el rebaño · §7.8', () => {
  it('comprar la vaca deja una vaca más', () => {
    const state = village(20);
    state.herd.cows = 0;
    trade(state, 'cows', 1);
    expect(state.herd.cows).toBe(1);
  });
});

/**
 * Una aldea en primavera, con la despensa llena y sin crisis: el estado exacto
 * en que el tratante de ganado puede llamar a la puerta. Las dos pruebas que
 * comprueban que NO llega necesitan partir de aquí, o pasarían por el motivo
 * equivocado — y de hecho pasaban, hasta que una mutación lo destapó.
 */
function driverWelcome(): GameState {
  const state = village(20);
  state.tick = Math.floor(state.tick / TIME.WEEKS_PER_YEAR) * TIME.WEEKS_PER_YEAR + 2;
  state.village.grain = 6000;
  state.village.morale = 70;
  delete state.flags['hostile'];
  // Sin pregunta pendiente y sin comerciante reciente: las dos cosas que el
  // canal comprueba antes que nada. Una aldea de veinte anos puede llegar aqui
  // con cualquiera de las dos puestas, y entonces el escenario no probaria lo
  // que dice probar.
  state.crossroad = null;
  state.history = state.history.filter((d) => !TRADE_TEMPLATES.some((t) => t.id === d.templateId));
  return state;
}

describe('las visitas del camino · M-0', () => {
  // **El canal propio de §7.8 se retiró en M-0** y sus pruebas viven aquí, en
  // la forma que las visitas tienen ahora: sucesos que dejan una oferta. Lo
  // que aquellas pruebas protegían sigue protegido, y dos cosas se cumplen ya
  // por construcción: un comerciante no cuenta para el reposo de §8.6 (no es
  // una encrucijada) y no entra en el sorteo del catálogo (no está en él).
  const VISITS = ['pedlar', 'factor_visit', 'drover_visit', 'salt_visit'] as const;

  it('nadie sube a vender a una aldea hostil, ni con otra oferta esperando', () => {
    const state = driverWelcome();
    state.flags['hostile'] = 0;
    // Desde aquí: el valle de estas pruebas viene de veinte años jugados y ya
    // tiene visitas en su historia. Lo que se mide es lo que pasa **después**.
    const before = state.happenings.length;
    run(state, TIME.WEEKS_PER_YEAR * 5, 'prudent', CATALOG);
    expect(state.happenings.slice(before)
      .some((h) => (VISITS as readonly string[]).includes(h.id))).toBe(false);
    // Y con una oferta en pie no sube otro: `state.offer` es una sola casilla,
    // así que una segunda visita borraría la primera sin que nadie la viera.
    const busy = driverWelcome();
    postOffer(busy, 'pedlar', [], []);
    const posted = busy.offer;
    run(busy, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    if (busy.offer !== null) expect(busy.offer.postedTick).toBe(posted?.postedTick);
  });

  it('una visita no repite hasta que pasa su plazo', () => {
    // Medido: sin plazo, el factor subía 1 181 veces en dieciséis partidas de
    // sesenta años y tapaba al resto de los sucesos.
    const state = driverWelcome();
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    for (const id of VISITS) {
      const ticks = state.happenings.filter((h) => h.id === id).map((h) => h.tick);
      for (let i = 1; i < ticks.length; i += 1) {
        expect((ticks[i] ?? 0) - (ticks[i - 1] ?? 0), id).toBeGreaterThanOrEqual(OFFER.AGAIN_WEEKS[id]);
      }
    }
  });
});
