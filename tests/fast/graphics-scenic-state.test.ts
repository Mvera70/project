// Lo lento de este fichero vive en `tests/journeys/graphics-scenic-state-long.test.ts` (v5.56).
//
// G-11 · El estado de la jornada. design.md D.6, §4.3.
//
// Lo que se prueba aquí no es un módulo: es **la propiedad que el módulo existe
// para regalar**. Un sistema de render cualquiera —los que hay y los que se
// escriban después— dibuja lo que le llega, y lo que le llega tiene que estar
// quieto mientras se mira. Si estas pruebas pasan, un sistema nuevo hereda la
// garantía sin escribir una línea; si alguien las rompe, el valle vuelve a dar
// saltos y esta vez se entera alguien antes que el jugador.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
describe('G-11 · el estado de la jornada', () => {
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
});
