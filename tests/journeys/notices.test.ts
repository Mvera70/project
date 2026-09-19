// Qué lee el jugador sobre el valle. design.md §9.2, §9.3, §11.6.
//
// «Los mensajes que aparecen ahí son horrorosos» — el dueño del diseño, dos
// veces, y las dos veces se buscó el fallo en la redacción. No estaba ahí. Lo
// que estaba mal era **cuál** de las frases salía: medido con
// `tools/reports/notice-report.ts` sobre cinco semillas y cuarenta años, 2 831 de los
// 3 309 avisos eran la misma clave —la temporada de caza, quinientos sesenta y
// seis por partida, catorce al año durante cuarenta años—. La frase daba igual:
// a la décima vez cualquier frase es ruido.
//
// Lo que se prueba aquí es la propiedad que lo impide para siempre, y no el
// arreglo de esa clave: **ninguna voz puede quedarse con el valle.** Si mañana
// alguien vuelve a poner un aviso semanal para algo que pasa todas las semanas,
// esto se pone rojo antes de que lo vea un jugador.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { ChronicleEntry } from '@engine/state';
import { noticeworthy } from '../../src/ui/notice';

const SEEDS = [7, 11, 23, 31, 41];
const YEARS = 40;

/** Los avisos de una partida entera, en el orden en que el jugador los vería. */
function noticesOf(seed: number): ChronicleEntry[] {
  const state = foundGame(seed);
  const seen: ChronicleEntry[] = [];
  let read = 0;
  for (let year = 0; year < YEARS; year += 1) {
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    seen.push(...noticeworthy(state.chronicle.slice(read)));
    read = state.chronicle.length;
    if (state.ended !== null) break;
  }
  return seen;
}

describe('los avisos sobre el valle · §11.6', () => {
  it('ninguna voz se queda con el valle', () => {
    // El techo es un tercio, y no está elegido para que pase lo que hay: con lo
    // medido hoy la clave más repetida es la temporada de caza, y se queda en
    // el 29 % —191 de 669 en las cinco semillas—. Un tercio deja sitio a que el
    // reparto cambie y sigue siendo una cota que sólo se rompe si una voz se
    // vuelve semanal.
    const counted = new Map<string, number>();
    let total = 0;
    for (const seed of SEEDS) {
      for (const entry of noticesOf(seed)) {
        counted.set(entry.templateKey, (counted.get(entry.templateKey) ?? 0) + 1);
        total += 1;
      }
    }
    expect(total, 'y hay avisos que mirar').toBeGreaterThan(100);
    const [key, times] = [...counted.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
    expect(times / total, `la más repetida es ${key}, ${times} de ${total}`)
      .toBeLessThan(1 / 3);
  });

  it('y el valle no habla catorce veces al año', () => {
    // El otro lado de lo mismo, dicho en el ritmo que el jugador siente. Antes
    // del arreglo el valle hablaba **ciento treinta y dos veces al año**; lo
    // medido ahora, en las cinco semillas canónicas y cuarenta años, son 107,
    // 150, 132, 172 y 108 avisos en total — de 2,7 a 4,3 al año.
    //
    // La cota es seis, y está puesta donde está a propósito: al doble de lo
    // medido no llega ninguna semilla, y una voz que se vuelva semanal se pasa
    // de ahí en cuanto lo haga. Ponerla en cuatro habría sido clavarla en la
    // semilla 31, que es justo lo que este proyecto no hace con los umbrales.
    for (const seed of SEEDS) {
      const perYear = noticesOf(seed).length / YEARS;
      expect(perYear, `semilla ${seed}: ${perYear.toFixed(1)} avisos al año`)
        .toBeLessThan(6);
    }
  });

  it('una temporada de caza se cuenta al empezar y no cada semana', () => {
    // La clave concreta, con la cuenta que la delató. Cuarenta años dan unas
    // cuarenta temporadas —una al año, más o menos—, no quinientas.
    for (const seed of SEEDS) {
      // Sólo las temporadas: los cuervos de §7.7 comparten `kind` con ellas y
      // pueden caer en la misma semana de cosecha —la semilla 31 lo hizo con la
      // fundación en pareja—, y esta prueba habla de la temporada de caza.
      const spells = noticesOf(seed).filter((e) => e.templateKey.startsWith('forage.'));
      expect(spells.length, `semilla ${seed}: ${spells.length} temporadas`)
        .toBeLessThan(YEARS * 2);
      // Y dos temporadas nunca empiezan en semanas seguidas: entre una y la
      // siguiente hay por lo menos las semanas de gracia de `FORAGE.SPELL_GRACE`.
      for (let n = 1; n < spells.length; n += 1) {
        const gap = (spells[n]?.tick ?? 0) - (spells[n - 1]?.tick ?? 0);
        expect(gap, `semilla ${seed}: dos temporadas a ${gap} semanas`).toBeGreaterThan(1);
      }
    }
  });
});
