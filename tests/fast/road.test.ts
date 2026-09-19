// M-0 · Las ofertas del camino y el diezmo. `docs/historico/rework.md` §4b, brief M-0.
//
// Propiedades del diseño, no cifras: qué es una oferta (algo que no cambia el
// estado hasta que el jugador contesta), qué no puede hacer el diezmo (matar de
// hambre), y que un acto del jugador no desplaza la partida —que es lo que
// mantiene el determinismo de §2.4—.

import { describe, expect, it } from 'vitest';
import { FOOD, OFFER, TIME, TITHE } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run, tick } from '@engine/sim';
import type { GameState, Offer, PlayerAct } from '@engine/state';
import { canAccept, collectTithe, factorWants, postOffer } from '@engine/world/road';
import { foundTwenty } from '../helpers/founding';

const ACCEPT: PlayerAct[] = [{ kind: 'offer', accept: true }];
const LEAVE: PlayerAct[] = [{ kind: 'offer', accept: false }];

/** Una oferta cualquiera: seis de plata por ochenta de leña, el buhonero. */
function pedlar(state: GameState): Offer {
  return postOffer(state,
    'pedlar',
    [{ k: 'stat', stat: 'silver', amount: OFFER.PEDLAR_SILVER }],
    [{ k: 'stat', stat: 'wood', amount: OFFER.PEDLAR_WOOD }]);
}

describe('la oferta del camino', () => {
  it('no cambia nada mientras espera respuesta', () => {
    const s = foundTwenty(7);
    const wood = s.village.wood;
    pedlar(s);
    expect(s.village.wood).toBe(wood);
    expect(s.village.silver).toBe(0);
    // Y una semana entera del mundo sin contestarla tampoco la cobra.
    run(s, 1, 'prudent', CATALOG);
    expect(s.village.wood).toBeGreaterThanOrEqual(wood);
    expect(s.village.silver).toBe(0);
  });

  it('aceptar paga y cobra en el mismo acto', () => {
    const s = foundTwenty(7);
    const control = foundTwenty(7);
    s.village.wood = 500;
    control.village.wood = 500;
    pedlar(s);
    pedlar(control);
    const report = tick(s, CATALOG, undefined, ACCEPT);
    tick(control, CATALOG, undefined, LEAVE);
    expect(report.offer?.accepted).toBe(true);
    expect(s.village.silver).toBe(OFFER.PEDLAR_SILVER);
    // Contra un valle idéntico que dejó pasar al buhonero, y no contra los 500
    // de partida: la misma semana los leñadores traen leña, así que el número
    // absoluto no dice lo que costó el trato.
    expect(control.village.wood - s.village.wood).toBeCloseTo(OFFER.PEDLAR_WOOD, 6);
    expect(s.offer).toBeNull();
    // Y queda en el registro, que es lo que hace la partida reproducible.
    expect(s.acts.at(-1)).toMatchObject({ act: { kind: 'offer', accept: true }, done: true });
  });

  it('dejarla pasar no escribe en la crónica: quien no compra no hace historia', () => {
    const s = foundTwenty(7);
    pedlar(s);
    const report = tick(s, CATALOG, undefined, LEAVE);
    expect(report.offer?.accepted).toBe(false);
    expect(s.offer).toBeNull();
    expect(report.entries.some((e) => e.templateKey.startsWith('offer.'))).toBe(false);
  });

  it('aceptar lo que no se puede pagar no se hace, y la oferta sigue en pie', () => {
    const s = foundTwenty(7);
    s.village.wood = 0;
    const offer = pedlar(s);
    expect(canAccept(s, offer)).toBe(false);
    const report = tick(s, CATALOG, undefined, ACCEPT);
    expect(report.offer?.refused).toBe(true);
    expect(s.village.silver).toBe(0);
    // Sigue ahí: el jugador puede juntar la leña antes de que caduque.
    expect(s.offer).not.toBeNull();
    expect(s.acts.at(-1)?.done).toBe(false);
  });

  it('se va sola cuando nadie contesta', () => {
    const s = foundTwenty(7);
    pedlar(s);
    const before = s.tick;
    let gone = false;
    for (let week = 0; week <= OFFER.WEEKS + 1 && !gone; week += 1) {
      const report = tick(s, CATALOG);
      gone = report.entries.some((e) => e.templateKey === 'offer.pedlar.gone');
    }
    expect(gone).toBe(true);
    expect(s.offer).toBeNull();
    expect(s.tick - before).toBeLessThanOrEqual(OFFER.WEEKS + 2);
  });

  it('una vaca que no cabe en el corral no se compra', () => {
    const s = foundGame(7); // la pareja: sin casas, sin corral
    s.village.silver = 100;
    const offer = postOffer(s, 'drover_visit',
      [{ k: 'herd', kind: 'cows', amount: 1 }],
      [{ k: 'stat', stat: 'silver', amount: OFFER.DROVER_SILVER }]);
    expect(canAccept(s, offer)).toBe(false);
  });

  it('un acto del jugador no mueve una sola tirada del mundo', () => {
    // La propiedad que sostiene §2.4: contestar a un buhonero no puede
    // desplazar la partida. Dos valles iguales, uno acepta y el otro no, y los
    // flujos de azar tienen que quedar en el mismo sitio.
    const a = foundTwenty(11);
    const b = foundTwenty(11);
    a.village.wood = 500;
    b.village.wood = 500;
    pedlar(a);
    pedlar(b);
    tick(a, CATALOG, undefined, ACCEPT);
    tick(b, CATALOG, undefined, LEAVE);
    expect(a.rng).toEqual(b.rng);
  });
});

describe('el factor y lo que de verdad sobra', () => {
  it('nunca compra el grano que hace falta para comer', () => {
    const s = foundTwenty(7);
    const people = population(s);
    const year = people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON;
    s.village.grain = year * OFFER.FACTOR_KEEP_YEARS;
    expect(factorWants(s)).toBe(0);
    s.village.grain = year * OFFER.FACTOR_KEEP_YEARS + OFFER.FACTOR_MIN_GRAIN + 10;
    expect(factorWants(s)).toBeGreaterThan(0);
    expect(s.village.grain - factorWants(s)).toBeGreaterThanOrEqual(year * OFFER.FACTOR_KEEP_YEARS);
  });

  it('a la pareja fundadora no le compra nada, por mucho grano que tenga', () => {
    // Medido: con un solo año de reserva la semilla 9 se extinguía en el año 2
    // porque vendía lo que la separaba del hambre. Un caserío no recibe
    // comerciantes (`OFFER.MIN_PEOPLE`), y esto lo guarda desde el otro lado.
    const s = foundGame(9);
    s.village.grain = 5000;
    expect(population(s)).toBeLessThan(OFFER.MIN_PEOPLE);
    run(s, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
    expect(s.happenings.some((h) => h.id === 'factor_visit')).toBe(false);
  });
});

describe('el diezmo del señor', () => {
  it('se cobra una vez al año y en plata cuando hay plata', () => {
    const s = foundTwenty(7);
    s.village.silver = 200;
    let paid = 0;
    let weeks = 0;
    for (; weeks < TIME.WEEKS_PER_YEAR * 2; weeks += 1) {
      s.tick += 1;
      const tithe = collectTithe(s);
      if (tithe !== null && tithe.silver > 0) paid += 1;
    }
    expect(paid).toBe(2);
    expect(s.village.silver).toBeLessThan(200);
  });

  it('no le interesa un caserío', () => {
    const s = foundGame(7);
    s.village.silver = 200;
    s.tick = TIME.HARVEST_WEEK + TITHE.WEEKS_AFTER_HARVEST;
    expect(population(s)).toBeLessThan(TITHE.MIN_PEOPLE);
    expect(collectTithe(s)).toBeNull();
  });

  it('sin plata sólo se lleva del grano que sobra, y nunca el que se come', () => {
    const s = foundTwenty(7);
    s.village.silver = 0;
    s.tick = TIME.HARVEST_WEEK + TITHE.WEEKS_AFTER_HARVEST;
    const people = population(s);
    const yearOfFood = people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON;
    // Con menos de un año de comida en el granero no se lleva ni un grano: la
    // decisión 4 del dueño del diseño dice que el mundo no mata sin motivo.
    s.village.grain = yearOfFood - 1;
    expect(collectTithe(s)).toEqual({ silver: 0, grain: 0 });
    expect(s.village.grain).toBe(yearOfFood - 1);
    // Con excedente, una parte del excedente y nada más.
    s.village.grain = yearOfFood + 1000;
    const tithe = collectTithe(s);
    expect(tithe?.grain).toBeGreaterThan(0);
    expect(s.village.grain).toBeGreaterThanOrEqual(yearOfFood);
  });
});

describe('la mesa entera', () => {
  it('la plata entra y sale sin que el jugador toque nada', () => {
    // La medida del brief M-0, en pequeño: un valle que nadie juega ve plata
    // —el forastero la deja— y la pierde —el señor la cobra—.
    let entered = 0;
    let left = 0;
    for (const seed of [7, 11, 23]) {
      const s = foundGame(seed);
      let last = 0;
      for (let week = 0; week < TIME.WEEKS_PER_YEAR * 40 && s.ended === null; week += 1) {
        run(s, 1, 'prudent', CATALOG);
        if (s.village.silver > last) entered += 1;
        if (s.village.silver < last) left += 1;
        last = s.village.silver;
      }
    }
    expect(entered).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(0);
  });

  it('la piedra se cantea sola cuando la obra no tiene nada que hacer', () => {
    const s = foundTwenty(7);
    run(s, TIME.WEEKS_PER_YEAR * 60, 'prudent', CATALOG);
    if (s.ended === null) {
      // Con fragua y roca en el valle, a los sesenta años hay piedra en el
      // montón o piedra puesta en algo. Lo que no puede haber es ninguna de las
      // dos cosas: eso era la última década vacía de `docs/historico/plan-juego.md` §3.1.
      const quarried = s.village.stone > 0
        || s.buildings.some((b) => b.tier === 1);
      expect(quarried || !s.buildings.some((b) => b.kind === 'smithy')).toBe(true);
    }
  });
});
