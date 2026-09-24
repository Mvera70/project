// VZ-02 · Todo lo que el valle dice cabe en el hueco de la voz.
// plan-voz.md §3.2, §5 VZ-02.
//
// **Por qué existe esta prueba.** El arreglo de VZ-02 es que la bandeja mida
// siempre lo mismo: con la altura fija, nada de lo que hay encima —los círculos
// de velocidad— vuelve a moverse, y cada ronda de interfaz deja de reajustar a
// mano lo que se le monta arriba. Esa promesa la rompe una sola frase que no
// quepa, así que hay que vigilarla desde el banco y no desde la captura.
//
// **Y es un sucedáneo, con su medida detrás.** La suite rápida no tiene DOM, así
// que se cuenta caracteres. El listón sale de medir en el navegador, a 390 px de
// ancho y con la hoja de verdad (EB Garamond 15 itálica para la pista, 17 para
// las demás, interlínea 21,8 px): la pista de 129 caracteres ocupaba **tres**
// líneas —65 px— y la de 97 ocupa **dos** —50 px, que es el alto del hueco—.
// El tope se pone en 104 con ese margen medido, no a ojo. La comprobación de
// verdad es la captura de VZ-06, que mide la pila a los dos anchos.

import { describe, expect, it } from 'vitest';
import { BANK, UI_BANK } from '@engine/chronicle/bank.en';

/** Medido en el navegador: 97 caracteres caben en dos líneas, 129 no. */
const CABE_EN_DOS_LINEAS = 104;

/**
 * Las claves que hablan por el hueco de la voz, por familias.
 *
 * `doing.*` el fondo (qué está haciendo la aldea), `offer.*.say` lo que ofrece
 * quien espera en el camino (M-0), `intro.*` la pista del inicio guiado,
 * `founding.*` y `valley.*` lo que se dice al fundar. **`answer.*` se retiró en
 * M-4** con las órdenes permanentes: ya no hay orden que no se pueda cumplir. Lo que sale de la crónica —los sucesos y
 * los hitos— no se mide aquí: sus plantillas se comprueban enteras en
 * `chronicle.test.ts`, y lo que llega al hueco es una línea de crónica, que ya
 * está acotada por §9.1.
 */
const FAMILIAS = ['doing.', 'intro.', 'founding.settled', 'valley.'] as const;

/**
 * Y de las ofertas del camino, **sólo lo que se dice en la voz**: `offer.*.say`
 * es la frase del hueco y `offer.*.taken`/`.gone` son líneas de crónica, que
 * viven acotadas por §9.1 y llegan al hueco ya cortadas como cualquier entrada.
 */
function hablaPorLaVoz(key: string): boolean {
  if (key.startsWith('offer.')) return key.endsWith('.say');
  return FAMILIAS.some((familia) => key.startsWith(familia));
}

function laLargaDe(fuente: Record<string, unknown>): { key: string; text: string }[] {
  const frases: { key: string; text: string }[] = [];
  for (const [key, valor] of Object.entries(fuente)) {
    if (!hablaPorLaVoz(key)) continue;
    // El banco guarda o una frase o varias variantes de la misma; se miden todas.
    const textos = typeof valor === 'string' ? [valor] : Array.isArray(valor) ? valor : [];
    for (const texto of textos) {
      if (typeof texto === 'string') frases.push({ key, text: texto });
    }
  }
  return frases;
}

describe('VZ-02 · la bandeja mide siempre lo mismo', () => {
  const frases = [...laLargaDe(UI_BANK), ...laLargaDe(BANK)];

  it('hay frases que medir: la lista no se ha quedado vacía por un renombrado', () => {
    // Si alguien renombra una familia, esta prueba dejaría de vigilar nada sin
    // ponerse roja. Es la trampa que CLAUDE.md nombra: una prueba que congela
    // una lista y deja de mirar cuando la lista cambia.
    expect(frases.length).toBeGreaterThan(20);
    expect(frases.some(({ key }) => key.startsWith('intro.'))).toBe(true);
    expect(frases.some(({ key }) => key.startsWith('doing.'))).toBe(true);
  });

  it('ninguna frase del hueco de la voz se va a una tercera línea', () => {
    // Las plantillas traen huecos (`{count}`, `{year}`); se miden tal cual, que
    // es la cota superior razonable: un número ocupa menos que su nombre.
    for (const { key, text } of frases) {
      expect(text.length, `${key} mide ${text.length} caracteres: "${text}"`)
        .toBeLessThanOrEqual(CABE_EN_DOS_LINEAS);
    }
  });

  it('la pista del inicio guiado señala el carro sin depender de su posición', () => {
    // El acceso al carro es ahora una acción explícita; una dirección fija
    // quedaría obsoleta al variar la composición entre móvil y escritorio.
    const orders = UI_BANK['intro.orders'] ?? '';
    expect(orders.toLowerCase()).toContain('cart');
    expect(orders).not.toContain('above');
    expect(orders).not.toContain('below');
  });
});
