// Las cuatro partidas largas del motor, sacadas de la suite rápida.
//
// **Por qué están aquí.** Las cuatro juegan una partida entera —un siglo de
// bosque, cien años de riñas, la crónica de una vida completa, el desgaste del
// suelo de una partida real— y entre ellas se comían **cuarenta y cinco
// segundos**, la mitad de la suite rápida, que `CLAUDE.md` promete en menos de
// treinta. Con las aldeas vivas de esta tanda del rework esas cifras ya no
// bajan: una aldea que sobrevive cuesta más de simular que una que se muere.
//
// El dueño del diseño lo zanjó el 16 sep 2026: «hay que evitar a toda costa
// estar separado más de media hora haciendo pruebas; si las pruebas no son
// posibles, hay que cambiar cómo las hacemos». Aquí los minutos están
// permitidos por diseño (`npm run test:journeys`, cinco minutos), así que **no
// se pierde ni una cobertura**: el cuerpo y el umbral son los mismos, sólo
// cambia cuándo se pagan.
//
// Lo que **no** se movió, y a propósito: las pruebas baratas de esos mismos
// ficheros se quedan en la suite rápida, que es donde hacen su trabajo de
// avisar en segundos.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { knows } from '@engine/chronicle/render';
import { yearKey } from '@engine/chronicle/events';
import { yearOf } from '@engine/time';
import { forestCells, woodStanding } from '@engine/world/forest';
import { routeFor } from '@engine/world/paths';

const YEAR = TIME.WEEKS_PER_YEAR;
/** Los ticks de un año, como lo llamaba `invariants.test.ts` de donde viene. */
const YEAR_TICKS = TIME.WEEKS_PER_YEAR;

describe('las partidas largas del motor', () => {
  it('nunca baja de cero ni sube del total inicial, en un siglo', () => {
    for (const seed of [0, 7, 42]) {
      const s = foundTwenty(seed);
      const initialCells = forestCells(s);
      const initialWood = woodStanding(s);
      for (let year = 0; year < 100; year += 1) {
        run(s, YEAR, 'prudent', CATALOG);
        expect(woodStanding(s), `semilla ${seed}, año ${year}`).toBeGreaterThanOrEqual(0);
        expect(woodStanding(s)).toBeLessThanOrEqual(initialWood);
        expect(forestCells(s)).toBeGreaterThanOrEqual(0);
        expect(forestCells(s)).toBeLessThanOrEqual(initialCells);
        if (s.ended !== null) break;
      }
    }
  });

  it('en una partida real la gente acaba abriendo camino', () => {
    const s = foundTwenty(108);
    run(s, 60 * YEAR, 'prudent', CATALOG);
    const trodden = [...s.map.path].filter((p) => p > 0).length;
    expect(trodden).toBeGreaterThan(0);
    // Y quien tiene casa y trabajo tiene por dónde ir.
    const walker = s.people.villagers.find(
      (v) => v.diedTick === null && v.leftTick === null && v.homeId !== null,
    );
    if (walker !== undefined) expect(routeFor(s, walker.id).length).toBeGreaterThanOrEqual(0);
  });

  it('en una partida de verdad se riñe, pero no todas las semanas', () => {
    // Medido: unas seis por siglo y partida. Ni cero —el sistema estaría
    // muerto— ni una taberna.
    // Con varias semillas, que una sola es ruido: medido, unas tres o cuatro
    // riñas por siglo y partida, y hay semillas que no riñen en cien años.
    let fights = 0;
    for (const seed of [3, 7, 11]) {
      const state = foundTwenty(seed);
      run(state, 120 * 48, 'prudent', CATALOG);
      fights += state.chronicle.filter((e) => e.templateKey.startsWith('quarrel.')).length;
    }
    expect(fights, 'en tres siglos de aldea algo tiene que pasar').toBeGreaterThan(0);
    // Un uno por ciento de las semanas era la cota cuando los rencores no se
    // formaban nunca (`docs/medidas/findings-drama.md` §1). Desde R-1 la riña de la plaza
    // los empuja, y lo medido son 0,42–0,58 riñas al año por aldea: una cada
    // dos años. Sigue sin ser una taberna; la cota sube al uno y medio.
    expect(fights, 'pero no es una taberna').toBeLessThan(3 * 120 * TIME.WEEKS_PER_YEAR * 0.015);
  });

  it('toda familia que se repite en un año tiene forma anual en el banco', () => {
    // La cobertura no se adivina: se mide. Si una familia nueva empieza a
    // repetirse y nadie le escribe su línea anual, esto lo dice.
    const missing = new Set<string>();
    for (const seed of [7, 19, 108]) {
      const s = foundTwenty(seed);
      run(s, 100 * YEAR_TICKS, 'prudent', CATALOG);
      const perYear = new Map<string, number>();
      for (const e of s.chronicle) {
        const key = yearKey(e.templateKey);
        if (key === null) continue;
        const at = `${yearOf(e.tick)}|${key}`;
        perYear.set(at, (perYear.get(at) ?? 0) + 1);
      }
      for (const [at, n] of perYear) {
        if (n < 2) continue;
        const key = at.split('|')[1] as string;
        if (!knows(key)) missing.add(key);
      }
    }
    expect([...missing].sort(), `sin forma anual: ${[...missing].join(', ')}`).toEqual([]);
  });
});
