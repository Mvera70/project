// El valle más vivo · El puesto en la plaza y el trato cerrado
// (`life/visitors.ts`, `preparation.ts` · `tradeSites`, `village.ts`).
//
// Medido al escribirlo, semillas 7, 23 y 41 al año 8: el puesto no se atraviesa
// (nadie dentro de su huella) y de 3 a 6 vecinos se acercan a mirar el género;
// con el trato cerrado llegan 1 o 2 bultos a la plaza, que se van con la mula;
// la vaca vendida llega al pasto; la sal comprada se queda.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState, HappeningId } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { stallOf, visitsToday } from '../../src/render3d/life/visitors';
import { fitsCircle, penetration } from '../../src/render3d/life/body';

const SEEDS = [7, 23, 41];

function grown(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 8, 'prudent', CATALOG);
  state.happenings = state.happenings.filter((h) => h.tick !== state.tick);
  return state;
}

function visiting(seed: number, kind: HappeningId): GameState {
  const state = grown(seed);
  state.happenings.push({ tick: state.tick, id: kind, visible: [], who: [] });
  return state;
}

function dealing(seed: number, kind: HappeningId): GameState {
  const state = grown(seed);
  state.chronicle.push({ tick: state.tick, kind: 'road', templateKey: `offer.${kind}.taken`, params: {}, weight: 2 });
  return state;
}

describe('El valle más vivo · el puesto y el trato', () => {
  it('el puesto no se atraviesa, y los vecinos de alrededor se acercan a mirar', () => {
    let browsers = 0;
    for (const seed of SEEDS) {
      const state = visiting(seed, 'pedlar');
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      const seen = new Set<number>();
      let up = 0;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step(n / STEPS_PER_DAY);
        const site = stallOf(life.visitors[0]!);
        if (site === null) continue;
        up += 1;
        // La huella entra al empezar el paso siguiente al que lo monta.
        if (up === 1) continue;
        expect(fitsCircle(life.land, site.x, site.z, 0.1), `semilla ${seed}: el puesto no es sólido`).toBe(false);
        for (const d of life.dwellers) {
          if (d.doing?.offer.id === 'browse' && d.doing.there) seen.add(d.villager);
          const into = penetration(life.land, d.body.x, d.body.z, d.body.radius);
          if (Math.hypot(d.body.x - site.x, d.body.z - site.z) < 0.6) expect(into, `semilla ${seed}`).toBeLessThan(0.05);
        }
      }
      expect(up, `semilla ${seed}: no se montó`).toBeGreaterThan(0);
      // Recogido el puesto, su huella se va con él.
      expect(fitsCircle(life.land, life.visitors[0]!.spot.x, life.visitors[0]!.spot.z, 0.1)).toBe(true);
      browsers += seen.size;
    }
    expect(browsers).toBeGreaterThanOrEqual(SEEDS.length * 2);
  });

  it('el que cerró el trato vuelve la semana en que el motor lo apunta, un día', () => {
    const state = dealing(7, 'pedlar');
    const day = state.tick * TIME.DAYS_PER_WEEK;
    expect(visitsToday(state, day, TIME.DAYS_PER_WEEK)).toEqual([{ kind: 'pedlar', dealt: true }]);
    expect(visitsToday(state, day + 1, TIME.DAYS_PER_WEEK)).toEqual([]);
  });

  it('con el trato cerrado le llevan la leña o el grano, y se va con ello a lomos de la mula', () => {
    for (const kind of ['pedlar', 'factor_visit'] as const) {
      let delivered = 0;
      for (const seed of SEEDS) {
        const state = dealing(seed, kind);
        const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
        const visitor = life.visitors[0]!;
        const goods = (): number => life.props.filter((p) => p.id <= -40_000_000 && p.kind === (kind === 'pedlar' ? 'bundle' : 'grain')).length;
        let most = 0;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          life.step(n / STEPS_PER_DAY);
          most = Math.max(most, goods());
        }
        delivered += most;
        expect(visitor.loaded, `${kind}, semilla ${seed}`).toBe(true);
        expect(goods(), `${kind}, semilla ${seed}: bultos olvidados en la plaza`).toBe(0);
      }
      expect(delivered, kind).toBeGreaterThanOrEqual(SEEDS.length);
    }
  });

  it('la vaca vendida se queda en el pasto, y la sal comprada en la plaza', () => {
    for (const seed of SEEDS) {
      const cow = dealing(seed, 'drover_visit');
      const life = createVillage(cow, cow.tick * TIME.DAYS_PER_WEEK);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step(n / STEPS_PER_DAY);
      expect(life.visitors[0]!.beast?.home, `semilla ${seed}`).toBe(true);
      const salt = dealing(seed, 'salt_visit');
      const market = createVillage(salt, salt.tick * TIME.DAYS_PER_WEEK);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) market.step(n / STEPS_PER_DAY);
      expect(market.visitors[0]!.phase, `semilla ${seed}`).toBe('gone');
      expect(stallOf(market.visitors[0]!), `semilla ${seed}: la sal se fue con él`).not.toBeNull();
    }
  });

  it('en cada trato cerrado pasan monedas de mano, del que compra al que vende', () => {
    for (const seed of SEEDS) {
      for (const kind of ['pedlar', 'factor_visit', 'drover_visit', 'salt_visit'] as const) {
        const state = dealing(seed, kind);
        const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
        const seller = life.visitors[0]!;
        let sellerAt = { x: seller.body.x, z: seller.body.z };
        let seen = 0;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          life.step(n / STEPS_PER_DAY);
          if (seller.phase === 'staying') sellerAt = { x: seller.body.x, z: seller.body.z };
          for (const payment of life.payments.slice(seen)) {
            // El buhonero y el factor compran: pagan ellos. Al tratante y al
            // salinero les compra la aldea: cobran ellos.
            const end = kind === 'pedlar' || kind === 'factor_visit' ? payment.from : payment.to;
            expect(Math.hypot(end.x - sellerAt.x, end.z - sellerAt.z), `${kind}, semilla ${seed}`).toBeLessThan(0.5);
          }
          seen = life.payments.length;
        }
        expect(life.payments.length, `${kind}, semilla ${seed}: nadie pagó`).toBeGreaterThan(0);
        if (kind === 'drover_visit' || kind === 'salt_visit') expect(life.payments).toHaveLength(1);
      }
    }
  });
});
