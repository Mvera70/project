// G-11 · El estado de la jornada. design.md D.6, §4.3.
//
// Lo que se prueba aquí no es un módulo: es **la propiedad que el módulo existe
// para regalar**. Un sistema de render cualquiera —los que hay y los que se
// escriban después— dibuja lo que le llega, y lo que le llega tiene que estar
// quieto mientras se mira. Si estas pruebas pasan, un sistema nuevo hereda la
// garantía sin escribir una línea; si alguien las rompe, el valle vuelve a dar
// saltos y esta vez se entera alguien antes que el jugador.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { NIGHT } from '@derive/animals';
import { createScenicState } from '../../src/render3d/scenic-state';

function village(years: number, seed = 7): GameState {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

describe('G-11 · el estado de la jornada', () => {
  it('no cambia mientras la jornada está a la vista, por muchas semanas que corran', () => {
    // El caso de ×64: sesenta y cuatro semanas dentro de un solo
    // amanecer-anochecer. Ninguna de ellas puede mover lo que se está pintando.
    const state = village(14);
    const scenic = createScenicState();
    const opened = scenic.of(state, 0.0);
    const startedAt = opened.tick;

    for (let step = 1; step <= 64; step += 1) {
      run(state, 1, 'prudent', CATALOG);
      // Hasta el filo de la noche, y sin llegar a ella.
      const phase = (step / 64) * (NIGHT - 0.001);
      const shown = scenic.of(state, phase);
      expect(shown, 'la jornada entrega siempre el mismo objeto').toBe(opened);
      expect(shown.tick, 'y el motor no se lo ha movido por debajo').toBe(startedAt);
    }
    expect(state.tick, 'el motor sí ha corrido: la prueba no es trivial')
      .toBeGreaterThan(startedAt);
  });

  it('el motor no puede mover por debajo lo que ya se está pintando', () => {
    // La trampa que costó una ronda: el motor construye empujando sobre el
    // mismo array y muere escribiendo en el aldeano que ya estaba, así que una
    // copia superficial no guarda nada.
    const state = village(14);
    const scenic = createScenicState();
    const shown = scenic.of(state, 0.1);
    const houses = shown.buildings.length;
    const alive = shown.people.villagers.filter((who) => who.diedTick === null).length;
    const herd = { ...shown.herd };

    run(state, 60, 'prudent', CATALOG);

    expect(shown.buildings.length, 'lo construido después no está en la jornada de hoy')
      .toBe(houses);
    expect(shown.people.villagers.filter((who) => who.diedTick === null).length,
      'ni quien se haya muerto se cae del valle a media vista').toBe(alive);
    expect(shown.herd, 'ni la cabaña cambia de cuenta').toEqual(herd);
  });

  it('releva al caer la noche, que es cuando no lo ve nadie', () => {
    const state = village(14);
    const scenic = createScenicState();
    const day = scenic.of(state, 0.3);
    run(state, 10, 'prudent', CATALOG);

    expect(scenic.of(state, NIGHT - 0.01), 'antes de la noche, lo de la jornada').toBe(day);
    const night = scenic.of(state, NIGHT + 0.01);
    expect(night, 'cruzada la línea, se estrena').not.toBe(day);
    expect(night.tick, 'y lo estrenado es lo de ahora').toBe(state.tick);
  });

  it('una partida nueva no hereda la jornada de la anterior', () => {
    const first = village(14);
    const scenic = createScenicState();
    const before = scenic.of(first, 0.3);

    // Otro valle: otra gente, otras casas. Nada de lo de antes vale, y sin el
    // olvido el jugador vería el pueblo viejo hasta el anochecer.
    const second = village(6, 23);
    scenic.reset();
    const after = scenic.of(second, 0.3);

    expect(after, 'la jornada se estrena entera').not.toBe(before);
    expect(after.tick).toBe(second.tick);
  });
});
