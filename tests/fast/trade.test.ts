// M-30 · design.md §7.8 — los comerciantes del camino.
//
// Lo que se protege: que un trato mueva de verdad el rebaño y no sólo el
// texto, que ningún trato deje a la aldea con más cabezas de las que puede
// alimentar ni con menos de cero, que la sal cumpla lo que promete, y que los
// tres comerciantes sean gente distinta y no un mismo menú con tres nombres.
import { describe, expect, it } from 'vitest';
import { ANIMALS, TIME } from '@engine/balance';
import { BANK, CROSSROAD_BANK } from '@engine/chronicle/bank.en';
import { CATALOG, TRADE_TEMPLATES } from '@engine/crossroads/catalog';
import { applyEffect } from '@engine/crossroads/resolve';
import {
  crisisOf, eligible, lastCrossroadTick, lastTradeTick, selectTrader,
} from '@engine/crossroads/select';
import { all } from '@engine/crossroads/conditions';
import { fillCast } from '@engine/crossroads/cast';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { herdCapacity } from '@engine/subsistence/herd';
import { consume } from '@engine/subsistence/consumption';
import type { AppliedEffects } from '@engine/crossroads/schema';
import type { GameState } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
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

/** Todas las opciones de los tres comerciantes, aplanadas. */
const OPTIONS = TRADE_TEMPLATES.flatMap((t) => t.options.map((o) => ({ t, o })));

describe('el trato mueve el rebaño · §7.8', () => {
  it('comprar la vaca deja una vaca más', () => {
    const state = village(20);
    state.herd.cows = 0;
    trade(state, 'cows', 1);
    expect(state.herd.cows).toBe(1);
  });

  it('vender cerdos deja dos cerdos menos y no baja de cero', () => {
    const state = village(20);
    state.herd.pigs = 3;
    trade(state, 'pigs', -2);
    expect(state.herd.pigs).toBe(1);

    state.herd.pigs = 1;
    trade(state, 'pigs', -2);
    expect(state.herd.pigs).toBe(0);
  });

  it('nadie puede venderle a la aldea más cabezas de las que alimenta', () => {
    // Un tratante no deja un valle con más vacas que pasto: es el mismo techo
    // que respeta la cría de §7.7.
    const state = village(20);
    const ceiling = herdCapacity(state).cows;
    state.herd.cows = ceiling;
    trade(state, 'cows', 5);
    expect(state.herd.cows).toBe(ceiling);
  });

  it('un trato de ganado no toca ninguna otra especie', () => {
    const state = village(20);
    const before = { ...state.herd };
    trade(state, 'pigs', -1);
    expect(state.herd.hens).toBe(before.hens);
    expect(state.herd.cows).toBe(before.cows);
  });

  it('comerciar no consume una sola tirada de azar', () => {
    const state = village(20);
    const before = { ...state.rng };
    const out = trade(state, 'cows', 1);
    trade(state, 'pigs', -2);
    expect(state.rng).toEqual(before);
    // Y un trueque no mata, ni expulsa, ni construye: sólo mueve cabezas.
    expect(out.killed).toEqual([]);
    expect(out.arrived).toEqual([]);
    expect(out.build).toEqual([]);
  });
});

describe('la sal cumple lo que promete · §7.8', () => {
  it('con sal, cada res cunde más y hace falta matar menos', () => {
    // v2.97: esta prueba medía antes la carne TOTAL de la semana, y eso es la
    // métrica equivocada — con sal se para de matar antes, así que el total
    // puede salir menor. Lo que la sal salva son cabezas, y eso es lo que se
    // mide aquí.
    const make = (): GameState => {
      const s = village(20);
      s.village.grain = 0;
      s.herd = { hens: 0, pigs: 4, cows: 0 };
      return s;
    };

    const plain = make();
    consume(plain);

    const salted = make();
    salted.flags['salted'] = salted.tick + 5 * TIME.WEEKS_PER_YEAR;
    consume(salted);

    expect(salted.herd.pigs).toBeGreaterThan(plain.herd.pigs);
  });

  it('una sola res salada alimenta más que una sin salar', () => {
    // La misma regla vista de cerca: una cabeza, y lo que rinde.
    const one = (flagged: boolean): number => {
      const s = village(20);
      s.village.grain = 0;
      s.herd = { hens: 0, pigs: 1, cows: 0 };
      if (flagged) s.flags['salted'] = s.tick + 5 * TIME.WEEKS_PER_YEAR;
      return consume(s).herd.meat;
    };
    expect(one(true)).toBeCloseTo(one(false) * ANIMALS.SALTED_MEAT);
  });

  it('la sal caducada ya no vale', () => {
    const state = village(20);
    state.village.grain = 0;
    state.herd = { hens: 0, pigs: 4, cows: 0 };
    // Una bandera que expiró la semana pasada.
    state.flags['salted'] = state.tick - 1;

    const plain = village(20);
    plain.village.grain = 0;
    plain.herd = { hens: 0, pigs: 4, cows: 0 };

    expect(consume(state).herd.meat).toBeCloseTo(consume(plain).herd.meat);
    expect(state.herd.pigs).toBe(plain.herd.pigs);
  });
});

describe('son tres personas distintas · §7.8', () => {
  it('cada comerciante toca un sistema que los otros no tocan', () => {
    const kinds = (id: string): Set<string> => {
      const t = TRADE_TEMPLATES.find((x) => x.id === id)!;
      return new Set(t.options.flatMap((o) => o.effects.map((e) => e.k)));
    };
    // El tratante mueve el rebaño, el salinero deja bandera, el factor no
    // hace ninguna de las dos con el ganado.
    expect(kinds('cattle_drover').has('herd')).toBe(true);
    expect(kinds('salt_carrier').has('flag')).toBe(true);
    expect(kinds('grain_factor').has('herd')).toBe(false);
  });

  it('cada uno llega en una estación distinta', () => {
    // Tres comerciantes que llegaran el mismo mes serían el mismo comerciante.
    const seasons = TRADE_TEMPLATES.map((t) => {
      const c = t.requires.find((r) => r.k === 'season');
      return c === undefined ? null : c.season;
    });
    expect(new Set(seasons).size).toBe(seasons.length);
    expect(seasons.includes(null)).toBe(false);
  });

  it('ninguno entra en una aldea hostil', () => {
    // Nadie sube por ese camino a vender si le van a recibir con piedras.
    for (const t of TRADE_TEMPLATES) {
      expect(t.requires, t.id).toContainEqual({ k: 'flag', flag: 'hostile', set: false });
    }
  });

  it('vender el excedente se paga en ser visto, no en grano', () => {
    const sell = TRADE_TEMPLATES.find((t) => t.id === 'grain_factor')!
      .options.find((o) => o.id === 'sell_the_surplus')!;
    expect(sell.effects).toContainEqual({ k: 'flag', flag: 'watched', years: 15 });
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

/**
 * ¿Llega alguien en 500 intentos? El canal tira un dado del 3,5 % cada semana,
 * así que una sola llamada devuelve `null` casi siempre y no prueba nada.
 */
function arrives(state: GameState): boolean {
  for (let n = 0; n < 500; n += 1) {
    if (selectTrader(state, CATALOG) !== null) return true;
  }
  return false;
}

describe('el canal propio · §7.8, v2.97', () => {
  it('el estado de partida de estas pruebas deja pasar de verdad al tratante', () => {
    // Sin esto, las dos pruebas siguientes no valen nada: comprobarían que no
    // llega nadie en un estado donde no podía llegar nadie de todos modos.
    const state = driverWelcome();
    expect(crisisOf(state)).toBeNull();
    const drover = TRADE_TEMPLATES.find((t) => t.id === 'cattle_drover')!;
    expect(all(drover.requires, state)).toBe(true);
    // Y su reparto se puede cubrir: si no, quedaría fuera del sorteo por una
    // razón que no es la que estas pruebas quieren medir.
    expect(fillCast(drover, state)).not.toBeNull();
    // Y de hecho llega, si se le da la oportunidad suficientes veces. Sin
    // esto, todas las pruebas de «no llega» de aquí abajo pasarían solas: el
    // dado del canal dice que no el 96 % de las semanas.
    expect(arrives(driverWelcome())).toBe(true);
  });

  it('un comerciante no cuenta como encrucijada para el reposo de §8.6', () => {
    // Lo esencial de todo el canal: que un buhonero no retrase la siguiente
    // pregunta de la aldea ni un solo tick.
    const state = village(20);
    const before = lastCrossroadTick(state);
    state.history.push({
      tick: state.tick, templateId: 'cattle_drover', optionId: 'buy_the_cow',
      cast: {},
    });
    expect(lastCrossroadTick(state)).toBe(before);
    // Pero sí cuenta para el reloj de los comerciantes.
    expect(lastTradeTick(state)).toBe(state.tick);
  });

  it('una encrucijada normal sí mueve el reposo', () => {
    // El contraste, para que la prueba anterior signifique algo.
    const state = village(20);
    state.history.push({
      tick: state.tick, templateId: 'strangers_at_the_ford', optionId: 'take_them_in',
      cast: {},
    });
    expect(lastCrossroadTick(state)).toBe(state.tick);
    expect(lastTradeTick(state)).toBeLessThan(state.tick);
  });

  it('los comerciantes no entran en el sorteo del catálogo', () => {
    // Con sus condiciones cumplidas y todo: si entraran ahí, volverían a
    // quitarle el turno a una hambruna, que es justo lo que v2.96 midió.
    const state = driverWelcome();
    const ids = new Set(eligible(state, CATALOG).map((c) => c.template.id));
    for (const t of TRADE_TEMPLATES) expect(ids.has(t.id), t.id).toBe(false);
  });

  it('nadie sube a vender con una encrucijada sin responder', () => {
    const state = driverWelcome();
    state.crossroad = {
      templateId: 'strangers_at_the_ford', posedTick: state.tick, cast: {}, optionIds: [],
    };
    expect(arrives(state)).toBe(false);
  });

  it('nadie sube a vender en plena crisis', () => {
    // Partiendo de un estado donde el tratante SÍ podría llegar, y añadiendo
    // sólo la crisis: así lo que se mide es la crisis y no otra cosa. Con
    // hambre de verdad no valdría, porque entonces tampoco se cumplirían las
    // condiciones del propio tratante.
    const state = driverWelcome();
    state.flags['threatened'] = 0;
    expect(crisisOf(state)).not.toBeNull();
    expect(arrives(state)).toBe(false);
  });

  it('dos comerciantes no se pisan: hay un reposo entre ellos', () => {
    const state = driverWelcome();
    state.history.push({
      tick: state.tick, templateId: 'salt_carrier', optionId: 'buy_the_salt',
      cast: {},
    });
    expect(arrives(state)).toBe(false);
  });

  it('el canal tira sólo de su propio flujo de azar', () => {
    // §4.3: que venga o no venga un comerciante no puede desplazar una muerte.
    const state = village(20);
    const before = { ...state.rng };
    for (let n = 0; n < 50; n += 1) selectTrader(state, CATALOG);
    for (const stream of Object.keys(before) as (keyof typeof before)[]) {
      if (stream === 'traders' || stream === 'cast') continue;
      expect(state.rng[stream], stream).toBe(before[stream]);
    }
  });
});

describe('los textos existen · §9.1', () => {
  it('cada comerciante tiene título, cuerpo y todas sus etiquetas', () => {
    for (const t of TRADE_TEMPLATES) {
      expect(CROSSROAD_BANK[t.title], t.title).toBeTruthy();
      expect(CROSSROAD_BANK[t.body], t.body).toBeTruthy();
      for (const o of t.options) {
        expect(CROSSROAD_BANK[o.label], o.label).toBeTruthy();
        expect(CROSSROAD_BANK[o.cost], o.cost).toBeTruthy();
      }
    }
  });

  it('cada opción tiene su línea de crónica', () => {
    for (const { t, o } of OPTIONS) {
      const key = `crossroad.${t.id}.${o.id}`;
      expect(BANK[key], key).toBeTruthy();
    }
  });

  it('toda opción de un comerciante cambia algo en pantalla', () => {
    // El principio 1 del juego, aplicado a la categoría nueva.
    for (const { t, o } of OPTIONS) {
      expect(o.visible.length, `${t.id}.${o.id}`).toBeGreaterThanOrEqual(1);
    }
  });
});
