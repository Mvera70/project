// F3b/F3c · La lápida y la hoja de cuentas, en lo que se puede probar sin DOM.
// docs/plan-final.md §1 y §2.
//
// **El proyecto no trae `jsdom`** (`docs/ui-redesign/rounds/UI-R1.md` §4), así
// que de una pantalla se prueba aquí lo que no toca el DOM y lo demás se
// acredita con captura —el mismo criterio que `ui-chronicle.test.ts`—. Lo que
// no toca el DOM de esta pantalla resulta ser justo su fallo más probable:
// **una clave que no está en el banco**. `renderUiText` devuelve `[la.clave]`
// cuando falta, o sea un corchete en mitad del final de una partida, y es la
// clase de cosa que nadie ve hasta que la ve un jugador.
//
// Y una propiedad de diseño que sí se puede afirmar sin pintar nada: **la
// inscripción no dice «game over»** (decisión 1 de `plan-final.md` §5). Es la
// única frase del juego que hablaría del juego y no del valle, y si algún día
// alguien la mete, esto se pone rojo.

import { describe, expect, it } from 'vitest';
import { renderUiText } from '@engine/chronicle/render';
import { ledgerFromChronicle } from '@engine/chronicle/ledger';
import type { EndState, Ledger } from '@engine/state';

/** Las cuatro maneras de acabar (`EndState.cause`). */
const CAUSES: readonly EndState['cause'][] = ['extinction', 'abandoned', 'dispersed', 'stormed'];

/** Las filas de la hoja, tal como las recorre `epitaph.ts`. */
const ROWS: readonly (keyof Ledger)[] = [
  'born', 'died', 'arrived', 'left',
  'built', 'lostWorks', 'houses', 'wall',
  'decisions', 'given', 'kings', 'stoneYear',
  'raids', 'slain', 'fallen',
];

/** Una clave resuelta, o la marca de que falta. */
function text(key: string, params?: Record<string, string | number>): string {
  return renderUiText(key, params);
}

/** Si el banco no tiene esa clave, `renderUiText` la devuelve entre corchetes. */
function missing(rendered: string): boolean {
  return rendered.startsWith('[');
}

describe('F3 · la lápida y la hoja, sin pintar nada', () => {
  it('las cuatro causas tienen capitular, inscripción y año', () => {
    for (const cause of CAUSES) {
      const initial = text(`epitaph.initial.${cause}`);
      const inscription = text(`epitaph.inscription.${cause}`);
      expect(missing(initial), `${cause}: capitular`).toBe(false);
      expect(missing(inscription), `${cause}: inscripción`).toBe(false);
      // La capitular es **una letra**: es un cuadrado de 112 px con una letra
      // dentro, y dos no caben.
      expect(initial.length, `${cause}: la capitular es una letra`).toBe(1);
      // **Y es la letra de la palabra que nombra el final**, no la primera de la
      // frase. Esta prueba destapó que la regla fácil —«la inicial de la
      // inscripción»— no vale para nada aquí: las cuatro inscripciones empiezan
      // por «THE», así que con ella las cuatro capitulares serían una T y el
      // cuadrado dejaría de distinguir nada. Lo que se exige es que la letra
      // pertenezca a la palabra que cuenta: **T**AKEN, **E**MPTY, **L**AST,
      // **B**ROKE. Es lo que hace un manuscrito iluminado con una capitular: la
      // pone en la palabra, no en el artículo.
      const words = inscription.split(' ');
      expect(words.some((word) => word.startsWith(initial)),
        `${cause}: ${initial} tiene que ser de una palabra de «${inscription}»`).toBe(true);
    }
    expect(missing(text('epitaph.inscription.anno', { year: 43 })), 'el año').toBe(false);
    // **Y con el año como año absoluto**, que es una convención del renderer y
    // no un descuido: `{year}` se pinta **más uno** porque `yearOf` cuenta desde
    // cero y el tick cero es ANNO I (`chronicle/render.ts`, `ABSOLUTE_YEARS`).
    // `{years}` —la cuenta de años transcurridos de la línea de resumen— no lo
    // hace. Esta prueba existe también para que nadie vuelva a confundir las
    // dos: la misma pantalla llegó a decir ANNO I arriba y «in year 0» abajo.
    expect(text('epitaph.inscription.anno', { year: 43 }), 'ANNO del año siguiente')
      .toContain('44');
  });

  it('y ninguna dice «game over»', () => {
    // La decisión 1 del plan, hecha aserto. Nada de lo que lee el jugador se
    // sale de la ficción; la lápida **es** el game over.
    for (const cause of CAUSES) {
      for (const key of [`epitaph.inscription.${cause}`, `epitaph.${cause}`, 'epitaph.title']) {
        expect(text(key, { year: 43 }).toLowerCase(), key).not.toContain('game over');
      }
    }
  });

  it('las tres cifras grandes y todas las filas tienen su nombre en el banco', () => {
    for (const key of ['title', 'years', 'peak', 'held']) {
      expect(missing(text(`epitaph.ledger.${key}`)), `epitaph.ledger.${key}`).toBe(false);
    }
    for (const row of ROWS) {
      expect(missing(text(`epitaph.ledger.${row}`)), `epitaph.ledger.${row}`).toBe(false);
    }
  });

  it('un libro recontado de una crónica vacía se puede enseñar entero', () => {
    // El caso que la pantalla tiene que aguantar sin un hueco: una partida
    // archivada antes de F3a, sin libro, cuya crónica no dice nada. Las filas
    // que no se pueden saber salen vacías —y la pantalla las salta— y las demás
    // salen a cero, que **sí** se enseña: cero asaltos sufridos es una cifra.
    const ledger = ledgerFromChronicle([], 2064, 61);
    expect(ledger.houses, 'lo que no se puede saber, vacío').toBeNull();
    expect(ledger.wall).toBeNull();
    expect(ledger.stoneYear, 'y la piedra que nunca llegó, también').toBeNull();
    const shown = ROWS.filter((row) => ledger[row] !== null);
    expect(shown.length, 'quedan filas que enseñar').toBeGreaterThan(8);
    expect(ledger.years, 'y las tres grandes siempre están').toBeGreaterThan(0);
    expect(ledger.peak).toBe(61);
    expect(ledger.raidsHeld).toBe(0);
  });
});
