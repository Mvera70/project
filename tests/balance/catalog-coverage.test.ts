// M-08 · design.md §14.2, Anexo A.
//
// El barrido completo de cobertura del catálogo: 30 semillas × 150 años sobre
// el banco de tests/helpers/catalogue-bench.ts. Vive aquí y no en la suite
// rápida porque cuesta unos veinticinco segundos él solo, y §14.1 da veinte
// para todo. La suite rápida corre un barrido menor sobre el mismo banco.
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import type { CrossroadCategory } from '@engine/crossroads/schema';
import { silentIn, sweep } from '../helpers/catalogue-bench';

describe('M-08 · cobertura del catálogo, 30 semillas × 150 años', () => {
  const seen = sweep(30, 150);

  it('ninguna plantilla se queda a cero apariciones', () => {
    // Contenido muerto: condiciones que no se cumplen nunca. Con dieciséis
    // plantillas escritas a mano es el fallo más fácil de cometer y el más
    // difícil de ver.
    //
    // Las dos de `lord` estuvieron muertas hasta la v2.8: A.1 pedía el granero
    // vacío en invierno, y el invierno empieza la semana 36, justo después de
    // la cosecha. Con `grainToHarvest` y la semana mínima disparan.
    const missing = silentIn(seen);
    expect(missing, `sin salir nunca: ${missing.join(', ')}`).toEqual([]);
  });

  it('ninguna categoría se queda muda', () => {
    const byCategory = new Set(
      CATALOG.filter((t) => (seen.get(t.id) ?? 0) > 0).map((t) => t.category),
    );
    for (const c of [
      'famine', 'plague', 'lord', 'feud', 'faith', 'forest', 'stranger', 'succession',
    ] as CrossroadCategory[]) {
      expect(byCategory.has(c), c).toBe(true);
    }
  });
});
