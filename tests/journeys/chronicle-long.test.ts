// Lo lento de `tests/fast/chronicle.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 250 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-09 · design.md §3.7, §9.1, §9.2, §9.3.
//
// Lo que hay que proteger es la voz. Las prohibiciones de §9.3 son tests porque
// una sola frase que juzgue al jugador rompe el principio del que cuelga todo
// el capítulo 9: la crónica narra, no califica.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { makeBundle } from '@engine/rng';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { renderEntry } from '@engine/chronicle/render';

describe('Ninguna frase de la crónica sale rota', () => {
  // **`numberWord(0)` es «no»**, y eso funciona en «no bread» y es una frase
  // rota en «{count} of them» → «No of them left the fields for the trees and
  // the water». Salió en pantalla, en una captura, en el año uno de la semilla
  // siete: el reparto de mano de obra es fraccionario y `Math.round` lo dejaba
  // en cero aunque alguien hubiera ido al río.
  //
  // El arreglo está en `sim.ts` —si la entrada se cuenta, alguien fue— y esto
  // es lo que impide que vuelva por otra puerta: se leen las crónicas de
  // partidas de verdad y se busca la familia entera del defecto.

  it('en cuarenta años de cuatro semillas, ninguna dice «no of them»', () => {
    const bad = /no (?:of them|died|were born|left)/iu;
    for (const seed of [7, 11, 23, 41]) {
      const state = foundTwenty(seed);
      run(state, 40 * 48, 'prudent', CATALOG);
      const bundle = makeBundle(seed);
      state.chronicle.forEach((entry, at) => {
        const text = renderEntry(entry, bundle, at);
        expect(text, `semilla ${seed}, entrada ${at}: ${text}`).not.toMatch(bad);
      });
      expect(state.chronicle.length, 'y hay crónica que leer').toBeGreaterThan(20);
    }
  });
});

describe('Un hueco de reparto llega a la pantalla', () => {
  // **Arreglado el 19 sep 2026 (S-09).** El banco no inventa nombres (§9.3) y
  // `namesOf` dejaba el hueco tal cual, así que una plantilla cuyo texto
  // escribía una letra repartida a un anónimo se leía con la llave puesta.
  // Medido antes del arreglo: la semilla 23 escribía «{B} was given the forge
  // in year 26» con `feud_inherited`, cuyo `{as:'B', childOf:'A'}` acepta
  // hijos sin nombre — y lo acepta a propósito, que hay prueba de §8.3 que lo
  // exige: un hijo de verdad es casi siempre anónimo.
  //
  // **Y el arreglo no toca `fillCast`.** La otra opción —que el reparto sólo
  // aceptara gente ya nombrada— habría cambiado la lista de candidatos de
  // `childOf` y con ella el flujo `crossroads`, moviendo la trayectoria de
  // toda partida que use esa plantilla: medido entonces, la cadena de pases de
  // V-09 pasaba de cinco a ninguna de tres en treinta muestras. Lo que se hizo
  // en su lugar (`applyOption`, `resolve.ts`) es nombrar a quien sale elegido
  // **después** de resolver el reparto y **antes** de aplicar los efectos —es
  // lo que el juego ya hace cuando alguien se vuelve notable
  // (`promoteToNamed`)—, así que sólo gasta una tirada del flujo `names`, no
  // del `crossroads`, y sólo la semana exacta en que la plantilla se contesta.
  //
  // Medido tras el arreglo, en las doce semillas de la fundación a cuarenta
  // años: 22 líneas de `feud_inherited` vistas, todas con nombre, y **cero**
  // huecos `{X}` en cualquier entrada de cualquier plantilla.

  it('ninguna entrada llega con un parámetro sin rellenar', () => {
    for (const seed of [7, 11, 23, 41]) {
      const state = foundTwenty(seed);
      run(state, 40 * 48, 'prudent', CATALOG);
      const bundle = makeBundle(seed);
      state.chronicle.forEach((entry, at) => {
        expect(renderEntry(entry, bundle, at), `semilla ${seed}, entrada ${at}`)
          .not.toMatch(/\{\w+\}/u);
      });
    }
  });
});
