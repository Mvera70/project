// Lo lento de este fichero vive en `tests/journeys/ui-annals-long.test.ts` (v5.56).
//
// F3d · El cronicón, en lo que se puede probar sin DOM.
//
// **El proyecto no trae `jsdom`** (`docs/ui-redesign/rounds/UI-R1.md` §4), así
// que de una pantalla se prueba aquí lo que no toca el DOM y lo demás se
// acredita con captura — el mismo criterio que `ui-epitaph.test.ts` y
// `ui-chronicle.test.ts`.
//
// Y lo que no toca el DOM resulta ser, otra vez, su fallo más probable: **una
// clave que no está en el banco**. `renderUiText` devuelve `[la.clave]` cuando
// falta, o sea un corchete en mitad de la pantalla, y es la clase de cosa que
// nadie ve hasta que la ve un jugador. Pasó en este mismo menú: las tres claves
// del selector de idioma faltaban y lo cazó una captura del paquete de prensa,
// no una prueba.

import { describe, expect, it } from 'vitest';
import { renderUiText, setLocale } from '@engine/chronicle/render';
import type { EndState } from '@engine/state';

/** Las cuatro maneras de acabar, que son las cuatro lápidas del índice. */
const CAUSES: readonly EndState['cause'][] = ['extinction', 'abandoned', 'dispersed', 'stormed'];

/** Si el banco no tiene esa clave, `renderUiText` la devuelve entre corchetes. */
const missing = (rendered: string): boolean => rendered.startsWith('[');

describe('F3d · el cronicón dice lo que tiene que decir', () => {
  it('todas sus claves están en el banco, y en los dos idiomas', () => {
    const KEYS: readonly (readonly [string, Record<string, string | number>])[] = [
      ['title.annals', {}],
      ['annals.title', {}],
      ['annals.empty', {}],
      ['annals.count', { count: 3 }],
      ['annals.anno', { year: 31, seed: 7 }],
      ['annals.figures', { years: 31, peak: 46, built: 12 }],
      ['app.close', {}],
    ];
    for (const locale of ['en', 'es'] as const) {
      setLocale(locale);
      for (const [key, params] of KEYS) {
        const line = renderUiText(key, params);
        expect(missing(line), `${locale}: falta ${key}`).toBe(false);
        expect(line.length, `${locale}: ${key} está vacía`).toBeGreaterThan(2);
      }
    }
    setLocale('en');
  });

  it('y las cuatro lápidas tienen capitular e inscripción', () => {
    // Son las de F3c y se reutilizan tal cual: si alguien añadiera una quinta
    // manera de acabar sin su inscripción, el índice enseñaría un corchete
    // donde va la piedra.
    for (const cause of CAUSES) {
      expect(missing(renderUiText(`epitaph.initial.${cause}`)), cause).toBe(false);
      expect(missing(renderUiText(`epitaph.inscription.${cause}`)), cause).toBe(false);
    }
  });

  it('la página vacía dice qué la llenará, no que esté vacía', () => {
    // La decisión del dueño del diseño, 19 sep 2026: el cronicón **empieza
    // vacío y se llena**, así que esa página es una pantalla del juego y no un
    // hueco. Un «no hay nada» no le dice a nadie qué hacer; la línea tiene que
    // nombrar lo que la llena.
    const line = renderUiText('annals.empty').toLowerCase();
    expect(line, 'la línea vacía no nombra lo que la llena').toMatch(/\bend/u);
  });

  it('la línea de cifras no repite el año que la lápida ya dice', () => {
    // **Lo cazó la captura y no una prueba.** `ANNO` va en base 1 —así numera
    // la crónica los años (`ABSOLUTE_YEARS` de `render.ts`)— y los años
    // vividos no, así que el mismo valle salía con «ANNO 39» arriba y «38
    // years» dos líneas más abajo. Es el mismo defecto que F3b le quitó al
    // epitafio: una línea que repite las cifras de la hoja a dos centímetros.
    const anno = renderUiText('annals.anno', { year: 38, seed: 46 });
    const figures = renderUiText('annals.figures', { peak: 46, built: 12 });
    expect(anno).toContain('39');
    expect(figures.toLowerCase(), 'la línea de cifras vuelve a hablar de años')
      .not.toMatch(/year|año/u);
  });
});
