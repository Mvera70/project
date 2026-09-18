// B3 · Qué es «caer». design.md §1b, fase 4; §12.
//
// **La decisión del dueño del diseño del 18 sep 2026, hecha mecánica:** «caer
// tiene dos tamaños — un asalto pequeño se saquea y se sigue; uno grande que
// rompa el portón y entre entero acaba la partida».
//
// Lo que estas pruebas guardan no es el número —el nivelado va al final y es
// del dueño— sino las cuatro propiedades del diseño:
//
//  1 · **Hay un final que no es la aldea acabándose sola.** Los tres que había
//      (extinción, abandono, dispersión) son un valle que se agota; `stormed`
//      es un valle **tomado**, y es el primero que causa alguien de fuera.
//  2 · **Decide lo que se dio.** La misma partida contra el mismo valle entra o
//      no según lo que tenga para defenderse, que es §1b: «se cae por las
//      decisiones».
//  3 · **Cuesta gente y cuesta el cerco.** Un final que no se cobra nada no es
//      un final, es una cifra.
//  4 · **Y se cuenta**, con peso de titular.

import { describe, expect, it } from 'vitest';
import { THREAT, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import { resistance } from '@engine/world/garrison';
import type { GameState, ValleyTrait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/**
 * Una aldea hecha, con cerco, y el clan llamando a la puerta esta semana.
 *
 * El cerco se pone a mano por lo mismo que en `garrison.test.ts`: el anillo
 * tarda de trece a treinta y cuatro años en fijarse y lo que se mide aquí es
 * qué pasa cuando llegan, no cuándo se construye la muralla.
 */
function besieged(seed = 7): GameState {
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
  return state;
}

/**
 * La partida que basta para tomar **ese** valle.
 *
 * Se calcula y no se escribe: `STORM_ODDS` y la resistencia son números de
 * balance que el dueño del diseño va a mover (G4), y una prueba que congele un
 * sesenta se rompe el día que los mueva sin que nada de lo que guarda haya
 * cambiado. Con esto, lo que se mide es la **regla**.
 */
function enough(state: GameState): number {
  return Math.ceil(resistance(state) * THREAT.STORM_ODDS) + 1;
}

/** Los que quedan en pie. */
function alive(state: GameState): number {
  return state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null).length;
}

describe('B3 · el valle tomado', () => {
  it('una partida que triplica la resistencia entra, y la partida se acaba', () => {
    const state = besieged();
    const band = enough(state);
    state.threat.comingBand = band;
    tick(state, CATALOG);
    expect(state.ended?.cause, `partida de ${band}`).toBe('stormed');
    expect(state.ended?.tick, 'y la semana queda apuntada').toBe(state.tick);
  });

  it('y una que no la triplica sólo saquea: la aldea sigue', () => {
    // La mitad pequeña de «caer», que es la que ya existía desde B1.
    const state = besieged();
    const band = Math.max(1, Math.floor(resistance(state) * THREAT.STORM_ODDS) - 1);
    state.threat.comingBand = band;
    tick(state, CATALOG);
    expect(state.ended, `partida de ${band}`).toBeNull();
    // **Nadie muere defendiendo**, que es lo que distingue un saqueo de un
    // asalto. Se mira la causa y no la cuenta: una semana cualquiera puede
    // llevarse a un viejo, y eso no lo hizo el clan vecino.
    expect(state.people.villagers.filter((v) => v.diedTick === state.tick
      && v.causeOfDeath === 'violence'), 'ni un muerto de violencia').toHaveLength(0);
    expect(state.chronicle.some((e) => e.templateKey.startsWith('raid.')),
      'pero se cuenta que vinieron').toBe(true);
  });

  it('lo que se dio decide: el mismo valle y la misma partida, con y sin defensa', () => {
    // **La propiedad de §1b**, y la razón de que los medios de C1 existan: una
    // aldea a la que se le dieron lanzas, arcos y fragua pone el doble contra la
    // misma partida, y con eso una que la habría tomado sólo la saquea.
    const bare = besieged();
    const armed = besieged();
    (armed.traits as ValleyTrait[]).push('arms', 'bows');
    expect(resistance(armed), 'lo dado sube la resistencia')
      .toBeGreaterThan(resistance(bare));

    // Una partida entre las dos cuentas: entra en la aldea desnuda y no en la
    // armada. Que exista ese número **es** la propiedad.
    const band = enough(bare);
    expect(band, 'y hay partidas que una aguanta y la otra no')
      .toBeLessThan(resistance(armed) * THREAT.STORM_ODDS);
    bare.threat.comingBand = band;
    armed.threat.comingBand = band;
    tick(bare, CATALOG);
    tick(armed, CATALOG);
    expect(bare.ended?.cause, 'la desnuda cae').toBe('stormed');
    expect(armed.ended, 'la armada aguanta').toBeNull();
  });

  it('cuesta el portón, el cerco de al lado y los que lo defendían', () => {
    const state = besieged();
    const before = alive(state);
    state.threat.comingBand = enough(state);
    tick(state, CATALOG);
    expect(state.ended?.cause).toBe('stormed');
    // El portón, roto.
    expect(state.buildings.some((b) => b.kind === 'gate' && b.lostTick === null),
      'el portón cae').toBe(false);
    // Y el boquete a su lado, no el anillo entero: una aldea tomada sigue
    // teniendo su muralla, con un agujero.
    const walls = state.buildings.filter((b) => b.kind === 'palisade');
    expect(walls.some((b) => b.lostTick !== null), 'hay boquete').toBe(true);
    expect(walls.some((b) => b.lostTick === null), 'y queda muralla en pie').toBe(true);
    // Gente: los que subieron mueren, y **no todo el mundo**. Un valle tomado
    // no es un valle extinguido, y ésa es la diferencia que la crónica cuenta.
    expect(alive(state), 'mueren los que defendían').toBeLessThan(before);
    expect(alive(state), 'y no muere el pueblo entero').toBeGreaterThan(0);
    // Y lo que se ve desde fuera se lo llevan entero (§1b: «rompa todo»).
    expect(state.village.silver, 'la plata').toBe(0);
    expect(state.village.grain, 'el grano').toBe(0);
    for (const kind of ['cows', 'pigs', 'hens'] as const) {
      expect(state.herd[kind], `el corral: ${kind}`).toBe(0);
    }
  });

  it('se cuenta con peso de titular, y no como una extinción', () => {
    const state = besieged();
    state.threat.comingBand = enough(state);
    tick(state, CATALOG);
    const said = state.chronicle.filter((e) => e.templateKey === 'raid.stormed');
    expect(said.length, 'una línea, una vez').toBe(1);
    expect(said[0]?.weight, 'peso 3: el momento del siglo').toBe(3);
    expect(state.chronicle.some((e) => e.kind === 'extinction'),
      'y no es una extinción: queda gente').toBe(false);
  });

  it('un valle al que no bajan no cae nunca por esto', () => {
    // La otra dirección de la propiedad 1: `stormed` no es una manera nueva de
    // morirse de hambre. Sin partida en camino no hay nada que resolver.
    const state = besieged();
    state.threat.comingTick = null;
    state.threat.comingBand = 0;
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    expect(state.ended?.cause ?? null).not.toBe('stormed');
  });
});
