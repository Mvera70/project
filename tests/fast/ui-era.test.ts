// A5 · La fase del valle, dicha. plan-meta.md, fila A5; §1b.
//
// La fila pide que «la cabecera y la crónica digan en qué fase está el valle»,
// y lo que estas pruebas guardan son las dos propiedades de las que eso depende.
// No se prueba el DOM —el proyecto no trae `jsdom` (UI-R1 §4)— sino el contrato:
//
//  1 · **Cada era tiene su frase en el banco.** `renderUiText` devuelve la
//      clave entre corchetes cuando no está, y eso es lo único de este módulo
//      que el jugador vería como un fallo: `[era.town]` bajo el ornamento.
//  2 · **Y la crónica la fecha bien.** Una cabecera de año que dijera la fase
//      de hoy estaría contando mal la historia: el año doce de una villa
//      cerrada era un caserío. `eraAtYear` lee la crónica, que es lo que esa
//      pantalla tiene delante.

import { describe, expect, it } from 'vitest';
import { renderUiText } from '@engine/chronicle/render';
import { TIME } from '@engine/balance';
import { eraAtYear, eraOf } from '@derive/era';
import type { ChronicleEntry } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/** Las tres de §1b, escritas aquí para que añadir una cuarta rompa la prueba. */
const ERAS = ['hamlet', 'village', 'town'] as const;

/** Una entrada de crónica del año que se diga, con la clave que se diga. */
function entry(year: number, templateKey: string): ChronicleEntry {
  return {
    tick: year * TIME.WEEKS_PER_YEAR,
    kind: 'built',
    templateKey,
    params: {},
    weight: 2,
  };
}

describe('A5 · la fase del valle se dice', () => {
  it('cada era tiene su nombre en el banco', () => {
    for (const era of ERAS) {
      const said = renderUiText(`era.${era}`);
      expect(said.startsWith('['), `era.${era}: ${said}`).toBe(false);
      expect(said.length, `era.${era}: vacía`).toBeGreaterThan(3);
    }
  });

  it('y el nombre de la fase 3 dice que está cerrada, no que sea grande', () => {
    // §1b no nombra un tamaño de pueblo: nombra un pueblo **cerrado**, que es
    // de lo que va la meta del juego. Si un día alguien lo acorta a «Town»,
    // esto lo dice.
    expect(renderUiText('era.town').toLowerCase()).toContain('walled');
  });

  it('la crónica fecha la fase: el año doce de una villa no era una villa', () => {
    const chronicle: ChronicleEntry[] = [
      entry(20, 'built.smithy'),
      { ...entry(38, 'wall.closed'), weight: 3 },
    ];
    expect(eraAtYear(chronicle, 5), 'antes de la fragua').toBe('hamlet');
    expect(eraAtYear(chronicle, 12), 'antes de la fragua').toBe('hamlet');
    expect(eraAtYear(chronicle, 20), 'el año de la fragua').toBe('village');
    expect(eraAtYear(chronicle, 30), 'con fragua y sin cerco').toBe('village');
    expect(eraAtYear(chronicle, 38), 'el año en que se cierra').toBe('town');
    expect(eraAtYear(chronicle, 60), 'y después').toBe('town');
  });

  it('y no depende del orden en que la crónica venga', () => {
    // La crónica no promete orden, y una lectura que cortara en la primera
    // coincidencia se la jugaría a eso.
    const chronicle: ChronicleEntry[] = [
      { ...entry(38, 'wall.closed'), weight: 3 },
      entry(20, 'built.smithy'),
    ];
    expect(eraAtYear(chronicle, 25), 'el cerco es posterior').toBe('village');
  });

  it('una crónica vacía es un caserío, no un hueco', () => {
    // Es el primer fotograma de toda partida: la bandeja tiene que decir algo.
    expect(eraAtYear([], 0)).toBe('hamlet');
    expect(renderUiText(`era.${eraAtYear([], 0)}`).startsWith('['), 'y con frase').toBe(false);
  });

  it('lo que dice la cabecera y lo que dice la crónica son la misma escala', () => {
    // Las dos pantallas leen `derive/era.ts`, así que no pueden discrepar; lo
    // que esto guarda es que las dos lecturas devuelven **los mismos tres
    // valores**, y por tanto que la clave del banco existe para las dos.
    const state = foundTwenty(7);
    expect((ERAS as readonly string[]).includes(eraOf(state))).toBe(true);
    expect((ERAS as readonly string[]).includes(eraAtYear(state.chronicle, 0))).toBe(true);
  });
});
