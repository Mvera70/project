// B4 · La puerta de vuelta al motor. design.md §1b, fase 4; §4.2 paso 1b.
//
// **Es la frontera del proyecto, escrita como prueba.** §1b abre una excepción
// al innegociable más antiguo —«todo determinista»— y sólo una: el asalto se
// resuelve en físico y no tiene por qué dar lo mismo dos veces. Lo que estas
// pruebas guardan es que esa excepción **entre por la puerta** y no por la
// ventana:
//
//  1 · El parte de la batalla es un `PlayerAct`, igual que aceptar una oferta o
//      dar una corona: el motor sigue siendo determinista **dadas sus
//      entradas**, y una partida guardada vuelve a contar la misma historia.
//  2 · **La semana de espera.** El asalto se anuncia al llegar y se resuelve la
//      siguiente, que es lo que deja que la pelea tenga la última palabra sin
//      que el motor tenga que deshacer nada.
//  3 · **Sin parte, manda la cuenta** (B3). Un valle que nadie mira no se
//      salva por no haber sido mirado.
//  4 · **Y el parte no salva por existir**: salva si la defensa adelgazó la
//      partida por debajo de lo que hace falta para tomar el valle.

import { describe, expect, it } from 'vitest';
import { THREAT, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { tick } from '@engine/sim';
import { run } from '@engine/sim';
import { resistance } from '@engine/world/garrison';
import type { GameState, PlayerAct } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/** Una aldea con cerco y una partida que basta para tomarla, llegando ya. */
function assaulted(seed = 7): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  let id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
  const put = (kind: 'palisade' | 'gate', x: number, y: number): void => {
    state.buildings.push({
      id: id++, kind, x, y, w: 1, h: 1, builtTick: state.tick,
      lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
  };
  put('gate', 30, 40);
  for (let n = 1; n <= 6; n += 1) put('palisade', 30 + n, 40);
  state.threat.comingTick = state.tick + 1;
  state.threat.comingBand = Math.ceil(resistance(state) * THREAT.STORM_ODDS) + 1;
  return state;
}

/** El parte de una batalla que tumbó a esa parte de la partida. */
function fought(state: GameState, share: number, breached = false): PlayerAct {
  return {
    kind: 'battle',
    slain: Math.round(state.threat.lastBand * share),
    lost: 0,
    breached,
  };
}

describe('B4 · el parte de la batalla', () => {
  it('el asalto se anuncia al llegar y se resuelve la semana siguiente', () => {
    const state = assaulted();
    tick(state, CATALOG);
    // La semana de la llegada: se saquea, se cuenta, y **no se decide**.
    expect(state.ended, 'todavía no ha caído').toBeNull();
    expect(state.flags['assault'], 'y queda marcado que hay asalto').toBeDefined();
    expect(state.chronicle.some((e) => e.templateKey === 'raid.assault'),
      'la crónica dice que vienen a por el pueblo').toBe(true);
  });

  it('sin parte manda la cuenta de B3: entran', () => {
    const state = assaulted();
    tick(state, CATALOG);
    tick(state, CATALOG);
    expect(state.ended?.cause, 'nadie peleó y entraron').toBe('stormed');
    expect(state.flags['assault'], 'y la marca se consume').toBeUndefined();
  });

  it('un parte que adelgaza la partida la para, y el clan pierde a los suyos', () => {
    const state = assaulted();
    tick(state, CATALOG);
    const before = state.threat.strength;
    const band = state.threat.lastBand;
    tick(state, CATALOG, undefined, [fought(state, 0.6)]);
    expect(state.ended, 'el cerco aguantó').toBeNull();
    // **Y los que se dejaron aquí no vuelven a bajar**, que es la consecuencia
    // que hace que valga la pena pelear en vez de dejar que el motor resuelva.
    expect(state.threat.strength, `de ${before} a ${state.threat.strength}`)
      .toBeLessThan(before);
    // Se pierde lo que se mató y no más, y nunca por debajo de cero: esta aldea
    // de dos años tiene un vecino de cuatro hombres y la partida de la prueba
    // es de sesenta, así que aquí el clan se queda en nada. Es exacto: no
    // quedan.
    expect(before - state.threat.strength, `perdió ${before - state.threat.strength}`)
      .toBeLessThanOrEqual(Math.round(band * 0.6));
    expect(state.threat.strength, 'y nunca menos que cero').toBeGreaterThanOrEqual(0);
    const said = state.chronicle.filter((e) => e.templateKey === 'raid.held');
    expect(said.length, 'y se cuenta, una vez').toBe(1);
    expect(said[0]?.weight, 'con peso de titular').toBe(3);
  });

  it('pero no salva por existir: un parte flojo no para un asalto grande', () => {
    // La propiedad que impide que mirar la pantalla vuelva al valle inmortal.
    const state = assaulted();
    // Una partida muy por encima de la cuenta: matar a uno de cada veinte no
    // cambia que sobren hombres para tomar el sitio.
    state.threat.comingBand = Math.ceil(resistance(state) * THREAT.STORM_ODDS) * 3;
    tick(state, CATALOG);
    tick(state, CATALOG, undefined, [fought(state, 0.05)]);
    expect(state.ended?.cause, 'entraron de todas formas').toBe('stormed');
  });

  it('y si la escena vio entrar a alguien, entraron: eso no se discute', () => {
    // La otra dirección, y es la que D5 va a usar: el portón que cede pierde
    // una partida que los números daban por salvada.
    const state = assaulted();
    tick(state, CATALOG);
    tick(state, CATALOG, undefined, [fought(state, 0.9, true)]);
    expect(state.ended?.cause, 'el portón cedió').toBe('stormed');
  });

  it('queda en el registro, que es lo que hace reproducible una partida', () => {
    const state = assaulted();
    tick(state, CATALOG);
    const act = fought(state, 0.6);
    tick(state, CATALOG, undefined, [act]);
    expect(state.acts.at(-1), 'el parte se apunta como cualquier acto')
      .toMatchObject({ act: { kind: 'battle' }, done: true });
  });

  it('un parte sin asalto que resolver no hace nada, y lo dice', () => {
    // El mismo trato que una oferta que ya no se puede pagar: se apunta como no
    // hecha. Si esto se tragara cualquier parte, el mundo podría matar gente
    // una semana cualquiera.
    const state = assaulted();
    state.threat.comingTick = null;
    state.threat.comingBand = 0;
    const before = state.threat.strength;
    tick(state, CATALOG, undefined, [{ kind: 'battle', slain: 40, lost: 5, breached: true }]);
    expect(state.ended, 'no pasa nada').toBeNull();
    expect(state.threat.strength, 'y el clan no pierde a nadie').toBe(before);
    expect(state.acts.at(-1)).toMatchObject({ act: { kind: 'battle' }, done: false });
  });

  it('y el motor sigue siendo determinista dadas sus entradas', () => {
    // El innegociable de siempre, con la frontera de §1b puesta: **mismo parte,
    // misma partida**. Lo que no es determinista es lo que la batalla produce,
    // y eso pasa fuera del motor.
    const a = assaulted();
    const b = assaulted();
    const act: PlayerAct = { kind: 'battle', slain: 12, lost: 2, breached: false };
    for (const state of [a, b]) {
      tick(state, CATALOG);
      tick(state, CATALOG, undefined, [act]);
      run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    }
    expect(JSON.stringify(a), 'dos partidas con el mismo parte son la misma')
      .toBe(JSON.stringify(b));
  });
});
