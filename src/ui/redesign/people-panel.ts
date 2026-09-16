// UI-R4 · La lista de la gente, migrada de verdad a la bandeja de la carcasa
// (`ShellHandle.content`). docs/ui-redesign/implementation-prompt.md, sección
// UI-R4; docs/ui-redesign/implementation-plan.md §2.5; design.md §11.2, U-08.
//
// **Qué retira, y qué conserva.** Sustituye a `src/ui/screens/people.ts`
// (U-08), que este brief retira porque su único consumidor era `app.ts` y
// pasaba por un velo de pantalla completa propio en vez de la bandeja común.
// `namedPresent` es exactamente el filtro que aquel fichero ya comprobaba:
// nombrados y presentes, en el orden que trae el motor — ninguna
// clasificación inventada aquí. La cifra global de población puede ser mayor
// (los anónimos no salen nunca, CLAUDE.md), así que la cabecera lo dice con
// `people.scope` en vez de dejar que la lista corta parezca la aldea entera
// (brief UI-R4: "la lista muestra personas nombradas y presentes, aclarando
// ese alcance").
//
// **Por qué esta lista no guarda a quién se seleccionó.** La ficha de un
// nombrado ya no vive dentro de esta pantalla — es la ruta `inspect`
// compartida con el valle (`{kind:'inspect', target, from:'people'}`,
// `contracts.ts`, UI-R1) — así que este panel no tiene ningún estado propio
// que sobreviva a un toque: pintar dos veces el mismo `state` pinta siempre
// la misma lista, y volver de una ficha (`app.ts`) nunca puede reabrir una
// identidad distinta de la que ya se cerró.
//
// **Por qué conserva la clase `people-scrim`.** `tools/valley.shots.ts`
// localiza esta pantalla por `.people-scrim` (líneas 174 y 179) — un fichero
// que este brief no puede tocar—, así que el nombre se queda igual aunque ya
// no sea un velo de pantalla completa: antes vivía con
// `position: fixed; inset: 0` por encima de todo; aquí es un hijo normal de
// `.ui-shell-content`, que ya pone su propio fondo, borde, sombra y cierre
// (`shell.css`, `shell.ts`).
import { renderUiText } from '@engine/chronicle/render';
import { isHere, population } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import type { GameState, Villager } from '@engine/state';
import type { PanelFactory, UiSnapshot } from './contracts';

const STYLE_ID = 'valley-people-panel-style';
const STYLE = `
.people-scrim { color: var(--ui-paper-ink); font: var(--ui-text-control-size)/var(--ui-text-control-line) var(--ui-font-plain); }
.people-scope { margin: 0 0 10px; color: var(--ui-paper-ink-soft); font-size: 12px; line-height: 1.4; }
.people-row { display: block; box-sizing: border-box; width: 100%; min-height: 44px; margin: 0 0 8px; padding: 9px 12px;
  border: 1px solid var(--ui-edge); border-radius: var(--ui-radius-control); background: transparent;
  color: var(--ui-paper-ink); font: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.people-row:active { background: rgba(34, 29, 24, .08); }
.people-row b { display: block; font: 600 15px/1.2 var(--ui-font-voice); }
.people-row span { display: block; margin-top: 2px; color: var(--ui-paper-ink-soft); font-size: 12px; line-height: 1.4; }
.people-empty { margin: 0; color: var(--ui-paper-ink-soft); }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/**
 * Los nombrados y presentes, en el orden que trae el motor — ninguna
 * clasificación inventada aquí. Pura: no toca el DOM, así que una prueba
 * rápida puede comprobar el filtro sin abrir un navegador (este proyecto no
 * trae jsdom, `docs/ui-redesign/rounds/UI-R1.md` §4).
 */
export function namedPresent(state: GameState): readonly Villager[] {
  return state.people.villagers.filter((v) => v.named && isHere(v));
}

/** Cuántos nombrados enseña la lista, de cuántos habitantes tiene el valle en total. */
export function peopleScope(state: GameState): { named: number; population: number } {
  return { named: namedPresent(state).length, population: population(state) };
}

/** A trade word if the villager has one, in the same voice as a trait: lowercase, no sentence. */
function tradeLine(v: Villager): string | null {
  return v.role === null ? null : renderUiText(`role.${v.role}`);
}

function traitsLine(v: Villager): string {
  return v.traits.length > 0
    ? v.traits.map((trait) => renderUiText(`trait.${trait}`)).join(', ')
    : renderUiText('inspect.traits.none');
}

/** La pantalla de la gente. `PanelFactory` de verdad, igual que `ordersPanel`. */
export const peoplePanel: PanelFactory = (actions) => {
  ensureStyle();
  const element = document.createElement('section');
  element.className = 'people-scrim';

  const heading = document.createElement('h2');
  heading.textContent = renderUiText('nav.people');
  const scope = document.createElement('p');
  scope.className = 'people-scope';
  const list = document.createElement('div');
  element.append(heading, scope, list);

  // `update` se llama en cada fotograma mientras la ruta 'people' está abierta
  // (`app.ts`, `paint`), no en cada tick: sin memoria, reconstruir la lista
  // entera sesenta veces por segundo desmontaba cada fila antes de que un
  // toque de verdad llegara a completarse — medido con un clic real de
  // Playwright, que veía la fila «detached from the DOM, retrying» hasta
  // agotar el tiempo. `key` es la única parte que de verdad cambia entre dos
  // fotograms cualesquiera (identidad, nombre, oficio, rasgos, edad en
  // años); si no cambió, las filas ya montadas se quedan donde están.
  let lastKey = '';
  const render = (state: GameState): void => {
    const villagers = namedPresent(state);
    const counted = peopleScope(state);
    scope.textContent = renderUiText('people.scope', { named: counted.named, population: counted.population });
    const key = villagers.map((v) => `${v.id}:${v.name}:${v.role}:${v.traits.join('|')}:${ageOf(v, state.tick)}`).join(',');
    if (key === lastKey) return;
    lastKey = key;
    if (villagers.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'people-empty';
      empty.textContent = renderUiText('people.empty');
      list.replaceChildren(empty);
      return;
    }
    list.replaceChildren(...villagers.map((v) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'people-row';
      const name = document.createElement('b');
      name.textContent = v.name;
      const trade = tradeLine(v);
      const stats = document.createElement('span');
      stats.textContent = trade === null
        ? renderUiText('inspect.age', { age: ageOf(v, state.tick) })
        : `${renderUiText('inspect.age', { age: ageOf(v, state.tick) })} — ${trade}`;
      const traits = document.createElement('span');
      traits.textContent = traitsLine(v);
      row.append(name, stats, traits);
      // La identidad viaja por `id`, nunca por el nombre que se lee en la
      // fila: dos aldeanos pueden compartir nombre (AC-9, `docs/ui-redesign/
      // acceptance-scenarios.md`), y el motor sólo distingue por `id`.
      row.addEventListener('click', () => {
        actions.navigate({ kind: 'inspect', target: { kind: 'villager', id: v.id }, from: 'people' });
      });
      return row;
    }));
  };

  return {
    element,
    update(snapshot: UiSnapshot): void { render(snapshot.state); },
    // Las filas se sustituyen enteras en cada `update` (`replaceChildren`),
    // así que no queda ningún listener suelto que soltar aparte del árbol —
    // el mismo razonamiento que `orders.ts` hace de los suyos.
    dispose(): void { /* ver el comentario de arriba */ },
  };
};
