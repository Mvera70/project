// La línea de estado de la tira. design.md §11.1.1 — `src/ui/doing.ts`.
//
// Lo que esto guarda es que la frase **no miente**. Es la única línea de la
// pantalla que afirma algo sobre lo que la aldea está haciendo ahora mismo, y
// una etiqueta de estado que se equivoca es peor que no tenerla: el jugador
// aprende a no mirarla y con ella deja de mirar el resto.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { renderUiText } from '@engine/chronicle/render';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run, tick } from '@engine/sim';
import { nextProject } from '@engine/world/works';
import { doingNow } from '@ui/doing';

const SEEDS = [7, 11, 23, 41];

describe('doingNow · la aldea dice qué está haciendo', () => {
  it('siempre tiene algo que decir mientras la aldea viva, y siempre está en el banco', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      for (let year = 0; year < 40 && state.ended === null; year += 1) {
        run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
        // **«Mientras la aldea viva» incluye el año en que deja de vivir.** El
        // año se juega entero antes de preguntar, y desde B3 (18 sep 2026) un
        // valle puede acabar **tomado** a media semana: la semilla 7 cae en el
        // año 21. A un valle acabado `doingNow` no le pregunta nadie —la
        // pantalla enseña el epitafio— así que aquí se sale.
        if (state.ended !== null) break;
        const said = doingNow(state);
        expect(said, `semilla ${seed}, año ${year}`).not.toBeNull();
        if (said === null) continue;
        const line = renderUiText(said.key, said.params);
        // `renderUiText` devuelve `[clave]` cuando la clave no existe: es el
        // único fallo de este módulo que el jugador vería como un corchete en
        // mitad de la pantalla.
        expect(line, `${said.key} no está en el banco`).not.toMatch(/^\[/u);
        expect(line.length, `${said.key} está vacía`).toBeGreaterThan(3);
      }
    }
  });

  it('no dice que no se construye nada mientras hay obra abierta', () => {
    // La contradicción más fácil de cometer y la más visible: el andamio en
    // pantalla y la línea diciendo que no se levanta nada.
    //
    // **Dos semillas y veinte años, no cuatro y cuarenta**, y la razón es el
    // coste: comprobar esto exige preguntar `nextProject`, que recorre el mapa
    // entero buscando solar. Con cuatro semillas y cuarenta años la suite
    // rápida se iba de 18 a 29 segundos, y su presupuesto son 20 (`CLAUDE.md`).
    // La propiedad no necesita más muestras: es una contradicción lógica, así
    // que basta con que ocurra la situación.
    for (const seed of SEEDS.slice(0, 2)) {
      const state = foundTwenty(seed);
      for (let week = 0; week < 20 * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
        tick(state, CATALOG);
        const said = doingNow(state);
        if (said === null) continue;
        if (said.key === 'doing.nothing') {
          expect(state.works.length, `semilla ${seed}, semana ${week}`).toBe(0);
          expect(nextProject(state), `semilla ${seed}: hay algo que empezar`).toBeNull();
        }
        if (said.key.startsWith('doing.raising.')) {
          const kind = said.key.slice('doing.raising.'.length);
          expect(state.works.map((work) => work.kind), `semilla ${seed}, semana ${week}`)
            .toContain(kind);
        }
      }
    }
  });

  it('y una aldea acabada no dice nada: ahí habla el epitafio', () => {
    const state = foundGame(7);
    run(state, 5 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    for (const villager of state.people.villagers) villager.diedTick = state.tick;
    expect(doingNow(state)).toBeNull();
  });

  it('hay obra que anunciar y silencio que declarar, las dos cosas', () => {
    // Si una aldea de cuarenta años sólo dijera una de las cinco frases, esta
    // línea no estaría midiendo nada. Y la cuenta de cuál sale cuántas veces es
    // la misma que `tools/reports/works-report.ts` mide por otro camino: **la aldea
    // pasa la mayor parte de su vida sin nada que construir**, y por eso esta
    // línea tiene que poder decirlo.
    const seen = new Map<string, number>();
    for (const seed of SEEDS.slice(0, 2)) {
      const state = foundTwenty(seed);
      for (let week = 0; week < 20 * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
        tick(state, CATALOG);
        const said = doingNow(state);
        if (said === null) continue;
        const family = said.key.startsWith('doing.raising.') ? 'doing.raising' : said.key;
        seen.set(family, (seen.get(family) ?? 0) + 1);
      }
    }
    expect(seen.get('doing.raising') ?? 0, 'se anuncia obra alguna vez').toBeGreaterThan(50);
    expect(seen.get('doing.nothing') ?? 0, 'y el silencio se declara').toBeGreaterThan(50);
  });
});
