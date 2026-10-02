// K5 · La sastrería y el lino (`world/tailor.ts`, `subsistence/harvest.ts`,
// `subsistence/mood.ts`). docs/design.md §7.18; decisiones de Vera del 2 oct 2026.
//
// Lo que guardan estas pruebas es el dilema: **un campo de lino es grano que no
// se cosecha** y a cambio da lienzo; **el lienzo se hace ropa**, que abriga en
// invierno —menos leña y más ánimo—; y se pide **en la sastrería**, que la aldea levanta sola cuando crece.
// Y la regla de todos los actos: pedir no tira dados.
//
// Las aldeas se buscan entre candidatas por su precondición (sastrería en pie,
// tejedora y cuatro campos trabajados), nunca se fija una semilla.

import { describe, expect, it } from 'vitest';
import { TAILOR, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import type { GameState } from '@engine/state';
import { tailorOrdersOpen } from '@engine/world/tailor';
import { seasonOf } from '@engine/time';
import { foundTwenty } from '../helpers/founding';

const CANDIDATES = [3, 7, 11, 17, 23, 31, 41];
const ENOUGH = 2;

const fields = (s: GameState): number => s.buildings.filter((b) => b.kind === 'field' && b.lostTick === null).length;
const ready = (s: GameState): boolean =>
  tailorOrdersOpen(s).find((o) => o.id === 'flax')?.refusal === null;

/** Aldeas con sastrería, tejedora y campos de sobra, jugadas como el juego (`run`, prudente). */
const villages: GameState[] = [];
for (const seed of CANDIDATES) {
  if (villages.length >= ENOUGH) break;
  const s = foundTwenty(seed);
  for (let year = 0; year < 14 && !ready(s); year += 1) run(s, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
  if (ready(s)) villages.push(s);
}

const clone = (s: GameState): GameState => structuredClone(s);
/** Hasta pasar la siega del año, semana a semana. */
const throughHarvest = (s: GameState): void => {
  for (let i = 0; i <= TIME.WEEKS_PER_YEAR; i += 1) {
    tick(s, CATALOG);
    if (s.tick % TIME.WEEKS_PER_YEAR === TIME.HARVEST_WEEK + 1) return;
  }
};

describe('K5 · la sastrería', () => {
  it('la aldea la levanta sola al crecer, con su tejedora', () => {
    expect(villages.length, 'aldeas con sastrería y tejedora entre las candidatas').toBe(ENOUGH);
    for (const s of villages) {
      expect(s.buildings.some((b) => b.kind === 'tailor' && b.lostTick === null)).toBe(true);
      expect(s.people.villagers.some((v) => v.diedTick === null && v.leftTick === null && v.role === 'weaver')).toBe(true);
    }
  });

  it('sin sastrería el tablón no deja pedir nada, y con pocos campos no hay lino', () => {
    const s = foundTwenty(7);
    for (const order of tailorOrdersOpen(s)) expect(order.refusal, order.id).toBe('tailor');
    for (const base of villages) {
      const few = clone(base);
      // Que se queden tres campos en pie: el lino pide cuatro.
      for (const b of few.buildings.filter((one) => one.kind === 'field' && one.lostTick === null).slice(3)) b.lostTick = few.tick;
      expect(tailorOrdersOpen(few).find((o) => o.id === 'flax')?.refusal).toBe('fields');
    }
  });
});

describe('K5 · comida contra tela', () => {
  it('un año de lino: la siega trae lienzo y menos grano que el mismo valle sin pedirlo', () => {
    for (const base of villages) {
      const wheat = clone(base);
      const flax = clone(base);
      tick(flax, CATALOG, undefined, [{ kind: 'tailor', order: 'flax' }]);
      tick(wheat, CATALOG);
      expect(flax.acts.at(-1)?.done, 'el encargo se hace').toBe(true);
      throughHarvest(flax);
      throughHarvest(wheat);
      const said = flax.chronicle.find((e) => e.templateKey === 'tailor.flax.harvest');
      expect(said, 'la siega del lino se cuenta').toBeDefined();
      expect(flax.village.linen, 'hay lienzo').toBeGreaterThan(0);
      expect(flax.village.linen).toBe(Number(said!.params['linen']));
      // **Pedir no tira dados**: las dos partidas viven lo mismo y sólo
      // difieren en el grano del campo de lino.
      expect(flax.village.grain, 'y menos grano').toBeLessThan(wheat.village.grain);
      expect(wheat.village.linen, 'sin pedirlo no hay lienzo').toBe(0);
    }
  });

  it('la ropa gasta lienzo y abriga: en invierno se quema menos leña y el ánimo sube', () => {
    // Vera: «la ropa no es sólo ánimo; abriga en invierno, y por eso sube el
    // ánimo». Se pide al llegar el invierno y se compara con el mismo valle sin
    // pedirla: pedir no tira dados, así que sólo difieren la leña y el ánimo.
    for (const base of villages) {
      const start = clone(base);
      start.village.linen = TAILOR.ORDERS.clothes.linen;
      // El primer invierno con la ropa a mano: la tejedora puede faltar unos
      // meses (el oficio se cubre al empezar el año, §6.2).
      const canSew = (s: GameState): boolean => tailorOrdersOpen(s).find((o) => o.id === 'clothes')?.refusal === null;
      for (let i = 0; i < TIME.WEEKS_PER_YEAR * 3 && !(seasonOf(start.tick) === 'winter' && canSew(start)); i += 1) {
        tick(start, CATALOG);
        start.village.linen = TAILOR.ORDERS.clothes.linen;
      }
      expect(canSew(start), 'un invierno con tejedora y lienzo').toBe(true);
      const bare = clone(start);
      const dressed = clone(start);
      for (const s of [bare, dressed]) {
        s.village.linen = TAILOR.ORDERS.clothes.linen;
        s.village.wood = 2000;
      }
      tick(dressed, CATALOG, undefined, [{ kind: 'tailor', order: 'clothes' }]);
      tick(bare, CATALOG);
      expect(dressed.village.linen, 'el lienzo se cose').toBe(0);
      expect(dressed.chronicle.some((e) => e.templateKey === 'tailor.clothes.ordered')).toBe(true);
      run(dressed, 8, 'prudent', CATALOG);
      run(bare, 8, 'prudent', CATALOG);
      expect(dressed.village.wood, 'abrigados, el invierno quema menos leña').toBeGreaterThan(bare.village.wood);
      expect(dressed.village.morale, 'y se está más contento').toBeGreaterThan(bare.village.morale);
    }
  });

  it('una aldea que no trabaja cuatro campos no siembra el lino: ni lienzo ni grano de menos', () => {
    // La regla que impide la espiral del hambre: el encargo puede seguir en
    // marcha, pero sin brazos para cuatro campos el lino se queda sin sembrar.
    const s = foundTwenty(7);
    run(s, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    expect(fields(s), 'una aldea joven tiene menos de cuatro campos').toBeLessThan(TAILOR.FLAX_MIN_FIELDS);
    const wheat = clone(s);
    s.flags['tailor:flax'] = s.tick + TAILOR.ORDER_WEEKS;
    wheat.flags['tailor:flax'] = -1;
    throughHarvest(s);
    throughHarvest(wheat);
    expect(s.village.linen).toBe(0);
    expect(s.village.grain).toBe(wheat.village.grain);
  });
});
