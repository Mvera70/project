// Ninguna clave de la crónica puede llegar a la pantalla entre corchetes.
//
// Es la hermana de `ui-keys.test.ts`, un nivel más arriba: aquélla vigila los
// títulos de ficha (`UI_BANK`); ésta vigila **la frase del juego** —el título
// y el cuerpo de una encrucijada, el verbo y el precio de cada opción, lo que
// la crónica dice cuando se contesta, y lo que dice años después, cuando la
// semilla de esa decisión da su fruto (§8.5).
//
// **Por qué recorrer `CATALOG` y no una lista escrita a mano.** Es el mismo
// principio que `ui-keys.test.ts` aplica a los edificios: `CATALOG` es la
// tabla de verdad que el motor juega, así que una plantilla nueva o una opción
// nueva se comprueba sola, sin que nadie tenga que acordarse de añadirla aquí.
//
// **Y una trampa que ya costó media hora, escrita para que no vuelva a
// costarla.** Las variantes de «la decisión tomada» (`crossroad.<id>.<opción>`)
// y de «la consecuencia tardía» (`consequence.<semilla>`) no viven en el
// objeto `BANK` que se ve al abrir `bank.en.ts`: viven en un cuarto bloque,
// `CROSSROAD_CHRONICLE`, declarado sin `export` y volcado dentro de `BANK` en
// tiempo de módulo —`for (const [key, variants] of
// Object.entries(CROSSROAD_CHRONICLE)) BANK[key] = variants;`, al final del
// fichero—. Un barrido que sólo mire el objeto `BANK` literal encuentra 56 de
// 62 opciones «sin banco» y ninguna lo está: por eso esta prueba usa
// `renderEntry`, que es lo que el juego usa de verdad, y no una copia del
// banco hecha a mano.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { renderEntry } from '@engine/chronicle/render';
import { makeBundle } from '@engine/rng';
import type { ChronicleEntry } from '@engine/state';

/**
 * Si `renderEntry` no encuentra la clave, devuelve `[clave]` — es la misma
 * señal que `missingUi`, pero pasando por `CROSSROAD_BANK`/`BANK` y no por
 * `UI_BANK`, que es el camino real de una línea de crónica (§9).
 */
function missingStory(templateKey: string): boolean {
  const rng = makeBundle(1);
  const entry: ChronicleEntry = { tick: 0, kind: 'built', templateKey, params: {}, weight: 2 };
  return renderEntry(entry, rng).startsWith('[');
}

describe('ninguna clave de la crónica llega entre corchetes', () => {
  it('el catálogo no está vacío, o esta prueba no comprueba nada', () => {
    expect(CATALOG.length, 'plantillas de encrucijada').toBeGreaterThan(10);
  });

  it('cada encrucijada tiene título y cuerpo', () => {
    // Título y cuerpo viven en `CROSSROAD_BANK`, no en `UI_BANK`: `missingStory`
    // pasa por `renderEntry`, que es quien de verdad mira los dos.
    for (const template of CATALOG) {
      expect(missingStory(template.title), `${template.id}: title`).toBe(false);
      expect(missingStory(template.body), `${template.id}: body`).toBe(false);
    }
  });

  it('cada opción tiene su verbo y su precio', () => {
    for (const template of CATALOG) {
      for (const option of template.options) {
        expect(missingStory(option.label), `${template.id}.${option.id}: label`).toBe(false);
        expect(missingStory(option.cost), `${template.id}.${option.id}: cost`).toBe(false);
      }
    }
  });

  it('cada decisión tomada se cuenta en la crónica', () => {
    // La clave no está escrita en el catálogo — la arma `resolve.ts` con
    // `crossroad.${template.id}.${option.id}` el día que se contesta — así que
    // aquí se arma igual, contra el motor de verdad.
    for (const template of CATALOG) {
      for (const option of template.options) {
        const key = `crossroad.${template.id}.${option.id}`;
        expect(missingStory(key), key).toBe(false);
      }
    }
  });

  it('cada semilla sabe nombrar la decisión de la que viene', () => {
    // §8.5: «a consequence line that cannot name its origin is a bug in the
    // line». Recorre las semillas de cada opción, si las tiene.
    let seedsSeen = 0;
    for (const template of CATALOG) {
      for (const option of template.options) {
        for (const seed of option.seeds) {
          seedsSeen += 1;
          expect(missingStory(seed.chronicleKey), `${template.id}.${option.id} → ${seed.chronicleKey}`).toBe(false);
        }
      }
    }
    // Si el catálogo se queda sin una sola semilla, esta prueba dejaría de
    // comprobar nada sin decirlo: mejor que falle a que pase por descuido.
    expect(seedsSeen, 'semillas de consecuencia en todo el catálogo').toBeGreaterThan(10);
  });

  it('cada opción cambia algo en pantalla', () => {
    // El principio 1 del juego (CLAUDE.md), la otra mitad de leer el catálogo:
    // no es sólo que la frase exista, es que `visible` no esté vacío.
    for (const template of CATALOG) {
      for (const option of template.options) {
        expect(option.visible.length, `${template.id}.${option.id}: visible.length`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
