// G-11 · El estado de la jornada. design.md D.6, §4.3.
//
// Lo que se prueba aquí no es un módulo: es **la propiedad que el módulo existe
// para regalar**. Un sistema de render cualquiera —los que hay y los que se
// escriban después— dibuja lo que le llega, y lo que le llega tiene que estar
// quieto mientras se mira. Si estas pruebas pasan, un sistema nuevo hereda la
// garantía sin escribir una línea; si alguien las rompe, el valle vuelve a dar
// saltos y esta vez se entera alguien antes que el jugador.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NIGHT } from '@derive/animals';
import { createScenicState } from '../../src/render3d/scenic-state';

function village(years: number, seed = 7): GameState {
  const state = foundTwenty(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

describe('G-11 · el estado de la jornada', () => {
  it('no cambia mientras la jornada está a la vista, por muchas semanas que corran', () => {
    // El caso de ×64: sesenta y cuatro semanas dentro de un solo
    // amanecer-anochecer. Ninguna de ellas puede mover lo que se está pintando.
    //
    // **Se intentó acotarlo y se revirtió, medido.** Relevar cada ocho semanas
    // y al cambiar de estación hacía saltar al rebaño 5,096 celdas contra un
    // techo de 0,4: un relevo sólo es invisible cuando el bicho no está en
    // pantalla, y eso sólo pasa de noche. El desfase se ataca por el color, que
    // no mueve a nadie — ver la prueba de abajo.
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
    run(state, 7, 'prudent', CATALOG);

    // Siete semanas y no diez: con ocho salta el tope y el relevo sería ése y
    // no el de la noche, que es lo que esta prueba mira.
    expect(scenic.of(state, NIGHT - 0.01), 'antes de la noche, lo de la jornada').toBe(day);
    const night = scenic.of(state, NIGHT + 0.01);
    expect(night, 'cruzada la línea, se estrena').not.toBe(day);
    expect(night.tick, 'y lo estrenado es lo de ahora').toBe(state.tick);
  });

  it('el color del valle lo elige el reloj vivo, no el de la jornada', () => {
    // **La contradicción que el jugador veía**, y donde se arregla. La cabecera
    // saca la estación del estado vivo (U-06) y el valle se pintaba con la
    // paleta del congelado (§10.3), que a ×64 es de hasta sesenta y cuatro
    // semanas atrás: WINTER arriba y el prado verde debajo.
    //
    // Se comprueba sobre el fuente porque montar el renderer pide una GPU que
    // la suite rápida no tiene, y lo que puede volver a romperse en silencio es
    // de dónde sale el reloj — el cálculo ya lo cubre `paletteFor`.
    const renderer = readFileSync(
      resolve(import.meta.dirname, '..', '..', 'src', 'render3d', 'renderer.ts'), 'utf8',
    );
    expect(renderer, 'la clave del color sale del tick vivo')
      .toMatch(/const live = clockOf\(state\.tick\)/u);
    expect(renderer, 'y el suelo se rehace cuando esa clave cambia')
      .toMatch(/colour !== painted/u);
    expect(renderer, 'y no del tick de la jornada')
      .not.toMatch(/paletteFor\(clockOf\(shown\.tick\)/u);
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
