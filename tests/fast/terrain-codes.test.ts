// Los códigos de terreno, uno por uno. design.md §3.5, §7.4, §7.6.
//
// El mapa grande, paso 1 (`docs/next-plan.md`): la montaña y el lago existen
// como terreno —coste de A*, prohibición de construir, color en las dos
// paletas, cota en el relieve— **con el mapa al tamaño de hoy y sin que nada
// los genere todavía**. El paso se hace solo porque veinte ficheros de `src/`
// miran `TERRAIN_CODE` y unos cuantos daban por hecho que los códigos eran
// seis; el validador de partidas guardadas era uno, y decía `cell <= 5`.
//
// Lo que se prueba aquí no es «la montaña funciona», que sería el paso 3. Es
// que **ningún código se cae por un `default`**: cada terreno que existe tiene
// respuesta en los cuatro sitios que deciden algo con él. Escrito como
// recorrido de la tabla y no como lista de casos, así que el día que aparezca
// el séptimo terreno estas pruebas hablan de él sin que nadie las toque.

import { describe, expect, it } from 'vitest';
import { PALETTES } from '../../src/derive/palette';
import { foundGame } from '@engine/found';
import { TERRAIN_CODE } from '@engine/state';
import { stepCost } from '@engine/world/astar';
import { canPlace } from '@engine/world/placement';
import { cellColour } from '../../src/render3d/world/ground';
import { terrainOf } from '../../src/render3d/life/terrain';
import { SEASONS } from '@engine/time';

/**
 * Los códigos que cierran el paso, y **no son la misma lista en cada capa.**
 *
 * Eso no es descuido, está decidido y escrito en los dos sitios:
 *
 *  - A* no entra en agua ni marisma (`astar.ts`), y la roca la cruza pagando.
 *  - Un cuerpo de la capa de vida no se pone de pie en agua ni en roca, y **sí
 *    en la marisma**: `routesFor` no manda a nadie ahí, y cerrarla aislaría
 *    trozos de orilla sin motivo (`life/terrain.ts`).
 *
 * La montaña y el lago cierran en las dos, que es lo que los define.
 */
const CLOSED_TO_ROUTES = ['water', 'marsh', 'mountain', 'lake'] as const;
const CLOSED_TO_BODIES = ['water', 'rock', 'mountain', 'lake'] as const;
const NO_BUILDING = ['water', 'marsh', 'mountain', 'lake'] as const;
const NAMES = Object.keys(TERRAIN_CODE) as (keyof typeof TERRAIN_CODE)[];

describe('TERRAIN_CODE · ningún terreno se cae por un default', () => {
  it('los ocho códigos son los ocho números seguidos, y la tabla no se reordena', () => {
    // §3.5: los bytes de cada partida guardada dependen de estos valores. Un
    // terreno nuevo coge el siguiente número libre; ninguno se mueve nunca.
    expect(Object.values(TERRAIN_CODE)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(TERRAIN_CODE.meadow).toBe(0);
    expect(TERRAIN_CODE.mountain).toBe(6);
    expect(TERRAIN_CODE.lake).toBe(7);
  });

  it('cada terreno tiene su color, en las cuatro estaciones', () => {
    // La prueba de verdad es la comparación con el prado: `cellColour` acaba en
    // un `default` que devuelve el prado, así que un código sin caso propio se
    // pinta como hierba y en pantalla no se distingue de un campo vacío. Es el
    // fallo silencioso que el paso 1 existe para evitar.
    const state = foundGame(7);
    for (const season of SEASONS) {
      const palette = PALETTES[season];
      for (const name of NAMES) {
        const code = TERRAIN_CODE[name];
        state.map.terrain[0] = code;
        state.map.path[0] = 0;
        const colour = cellColour(state.map, 0, palette);
        expect(colour, `${name} en ${season}`).toMatch(/^#[0-9a-f]{6}$/iu);
        if (name !== 'meadow') {
          expect(colour, `${name} en ${season} se pinta como el prado`)
            .not.toBe(palette.meadow);
        }
      }
    }
  });

  it('lo que cierra el paso lo cierra en los tres sitios que lo deciden', () => {
    // Tres capas distintas y tres preguntas distintas sobre la misma celda: si
    // A* puede pisarla, si un edificio puede ocuparla, y si un cuerpo de la capa
    // de vida puede estar de pie en ella. Un terreno que cierra en una y no en
    // las otras es gente andando hacia el agua — el fallo que V-06 pagó con la
    // aldea clavada.
    const state = foundGame(7);
    // Una esquina lejos de la aldea fundada, para no chocar con lo que hay.
    const x = state.map.width - 3;
    const y = state.map.height - 3;
    const cell = y * state.map.width + x;
    const put = (name: keyof typeof TERRAIN_CODE): void => {
      state.map.terrain[cell] = TERRAIN_CODE[name];
    };
    for (const name of CLOSED_TO_ROUTES) {
      put(name);
      expect(stepCost(state.map, cell), `A* entra en ${name}`).toBeNull();
    }
    for (const name of NO_BUILDING) {
      put(name);
      expect(canPlace(state, 'house', x, y), `se construye en ${name}`).toBe(false);
      expect(canPlace(state, 'field', x, y), `se siembra en ${name}`).toBe(false);
    }
    for (const name of CLOSED_TO_BODIES) {
      put(name);
      expect(terrainOf(state).blocked[cell], `un cuerpo se pone en ${name}`).toBe(1);
    }
    state.map.terrain[cell] = TERRAIN_CODE.meadow;
  });

  it('y el prado sigue abierto, que es la otra mitad de la prueba', () => {
    // Sin esto, una comprobación que devolviera «cerrado» para todo pasaría.
    const state = foundGame(7);
    const x = state.map.width - 3;
    const y = state.map.height - 3;
    const cell = y * state.map.width + x;
    state.map.terrain[cell] = TERRAIN_CODE.meadow;
    expect(stepCost(state.map, cell)).not.toBeNull();
    expect(terrainOf(state).blocked[cell]).toBe(0);
  });
});
