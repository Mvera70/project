// V-03 · Por dónde se pasa, y qué corta el paso. Anexo E, docs/historico/rework.md §3.5.6.
//
// El dueño: «atraviesan paredes». Una causa barata de descartar es que
// `WALLED` (terrain.ts) se hubiera quedado corto frente a los tipos de
// edificio que el motor conoce de verdad. Esta prueba no compara con una
// copia congelada de la lista de `WALLED` —eso se rompe solo con añadir un
// tipo nuevo sin que nada de lo que guarda haya cambiado, justo lo que
// `CLAUDE.md` pide evitar— sino con la tabla real del motor (`BUILDINGS`,
// `@engine/balance`), y obliga a decidir de qué lado cae cualquier tipo
// nuevo el día que aparezca.

import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '@engine/balance';
import type { BuildingKind } from '@engine/state';
import { WALLED } from '../../src/render3d/life/terrain';

/**
 * Lo que el propio motor llama «suelo, no interior» (`src/engine/world/
 * placement.ts`, design.md §7.2): edificios que se pisan, sin puerta que
 * cruzar. La propiedad que esta prueba guarda no es esta lista de tres —es
 * que **todo** tipo de edificio caiga en uno de los dos lados, nunca en
 * ninguno y nunca en los dos.
 */
// A2 · **el portón es suelo**, y es literalmente para lo que está: es la única
// celda de la línea de muralla por la que se pasa. Si algún día un portón
// cerrado tiene que cortar el paso de verdad —un asedio con la puerta echada—
// eso no se decide aquí: aquí se decide qué es la cosa, y una puerta es un
// hueco con hoja.
const GROUND: ReadonlySet<BuildingKind> = new Set(['field', 'well', 'grave_yard', 'gate']);

describe('V-03 · qué corta el paso', () => {
  it('todo tipo de edificio es suelo o corta el paso, y nada se queda sin decidir', () => {
    const kinds = Object.keys(BUILDINGS) as BuildingKind[];
    expect(kinds.length, 'la tabla del motor no está vacía').toBeGreaterThan(0);
    for (const kind of kinds) {
      const ground = GROUND.has(kind);
      const walled = WALLED.has(kind);
      expect(ground !== walled, `«${kind}» tiene que ser suelo o pared, no las dos ni ninguna`).toBe(true);
    }
  });

  it('el campo se pisa: nadie lo necesita en WALLED para andar por él', () => {
    // El caso que el brief nombra explícitamente (docs/historico/rework.md §3.5.6): «los
    // campos no van». Lo mismo vale para el pozo y el camposanto (arriba),
    // pero el campo es el que más celdas cubre del valle, así que es el que
    // más se nota si se cuela por error.
    expect(WALLED.has('field')).toBe(false);
  });
});
