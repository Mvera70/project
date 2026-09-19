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
// **Por qué conserva la clase `people-scrim`.** `tools/shots/valley.shots.ts`
// localiza esta pantalla por `.people-scrim` (líneas 174 y 179) — un fichero
// que este brief no puede tocar—, así que el nombre se queda igual aunque ya
// no sea un velo de pantalla completa: antes vivía con
// `position: fixed; inset: 0` por encima de todo; aquí es un hijo normal de
// `.ui-shell-content`, que ya pone su propio fondo, borde, sombra y cierre
// (`shell.css`, `shell.ts`).
import { renderUiText } from '@engine/chronicle/render';
import { crownStyleKey, isKing, roleKeyFor } from '@derive/crown';
import { isHere, population } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import type { GameState, Villager } from '@engine/state';
import type { PanelFactory, UiSnapshot } from './contracts';

const STYLE_ID = 'valley-people-panel-style';
const STYLE = `
/* UI-V5b · La piel de la lista. \`plan-piel.md\` no tiene sección para ella y el
   prototipo 03 dibuja **una ficha**, no una lista, así que —como el menú de
   inicio— esto se diseña en vez de calcarse, con el vocabulario que la ficha ya
   dejó puesto: medallón con la inicial, nombre en la voz de Cinzel y la fila
   como una tira de pergamino con el canto rasgado.

   **Lo que se decidió NO traer de la ficha, y por qué.** Los rasgos se quedan
   en texto y no como chips. En la ficha hay tres chips y son medio dibujo; aquí
   puede haber veintisiete filas con tres chips cada una, y ochenta y un
   recuadros convierten una lista que se recorre con el pulgar en un muro. Una
   lista tiene que seguir siendo una lista. */
.people-scrim { color: var(--skin-ink); font-family: var(--skin-font-read); font-size: 15px; }
.people-scrim > h2 { margin: 0 0 4px; color: var(--skin-ink);
  font: 600 21px/1.15 var(--skin-font-voice); letter-spacing: var(--skin-track-inscription);
  text-transform: uppercase; }
.people-scope { margin: 0 0 14px; color: var(--skin-ink-faded);
  font: italic 13px/1.4 var(--skin-font-read); }

/* La fila: papel con su canto, el medallón a la izquierda y dos líneas a la
   derecha. \`display: flex\` y no \`block\`, que es lo que la hacía un bloque de
   texto con un borde. */
.people-row { display: flex; align-items: center; gap: 12px; box-sizing: border-box;
  width: 100%; min-height: 56px; margin: 0 0 8px; padding: 8px 12px;
  border: 0; border-radius: 0; text-align: left; cursor: pointer;
  color: var(--skin-ink); font: inherit;
  background-color: var(--skin-parchment-deep);
  background-image: var(--skin-parchment-texture);
  background-repeat: repeat; background-size: 256px 256px;
  background-blend-mode: multiply;
  clip-path: var(--skin-deckle-chip);
  -webkit-tap-highlight-color: transparent; }
/* Cuatro cantos alternados, el mismo truco que los chips de la cabecera: con
   uno solo, veintisiete filas se leen como veintisiete copias del mismo
   recorte y el borde deja de parecer papel. */
.people-row:nth-child(4n + 2) { clip-path: var(--skin-deckle-chip-b); }
.people-row:nth-child(4n + 3) { clip-path: var(--skin-deckle-chip-c); }
.people-row:nth-child(4n + 4) { clip-path: var(--skin-deckle-chip-d); }
.people-row:active { background-color: var(--skin-parchment-aged); }
.people-row:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }
/* El medallón es el mismo de la ficha, en su talla pequeña: tocar una fila
   abre esa ficha, y la inicial es lo que hace que sea la misma persona y no
   otra pantalla. */
.people-row .skin-medallion { flex: 0 0 42px; width: 42px; height: 42px; font-size: 19px; }
.people-row-text { flex: 1 1 auto; min-width: 0; }
.people-row b { display: block; color: var(--skin-ink);
  font: 600 16px/1.2 var(--skin-font-voice); letter-spacing: .01em; }
.people-row span { display: block; margin-top: 2px; color: var(--skin-ink-soft);
  font: italic 13px/1.35 var(--skin-font-read); }
.people-row span + span { color: var(--skin-ink-faded); font-style: normal; font-size: 12.5px; }
.people-empty { margin: 0; color: var(--skin-ink-faded);
  font: italic 14px/1.4 var(--skin-font-read); }

/* K-8 · **La fila del rey.** Del dueño del diseño, 18 sep 2026: «cuando
   selecciones un rey, tiene que destacar después en la lista. No se ve rey en
   chiquitito, parece uno más». Y tenía razón: la palabra salía por la misma
   línea que el oficio de cualquiera —cursiva de trece píxeles, tinta suave—,
   así que coronar a alguien cambiaba una palabra donde antes decía «leader» y
   nada más.

   Lo que la separa son tres cosas, ninguna inventada: el **lacre** del medallón
   (\`--skin-red-deep\`, el de la gota de cera del prototipo 02, el único rojo de
   la paleta que no es papel), la **corona** del sprite con la palabra en
   versalitas de oro sobre ese lacre —una chapa, no una cursiva— y **el primer
   sitio de la lista**. Y una cuarta que es información y no adorno: debajo, a
   qué atiende ese rey (\`crown.style.*\`), que es lo que de verdad cambia en la
   aldea según a quién se corone. */
.people-row--king { min-height: 72px; background-color: var(--skin-parchment);
  box-shadow: inset 5px 0 0 var(--skin-red-deep), inset 0 0 0 1px var(--skin-rule-gold);
  /* **El canto de una placa y no el de un chip**, y se vio en la captura: con
     el recorte rasgado de las demás filas, el filete de lacre del canto
     izquierdo se partía en dos cuñas —el chip muerde un 3 % justo a media
     altura— y parecía un desperfecto. El rasgado de placa apenas se sale del
     1 %, así que el filete sale recto y la fila del rey se lee como lo que es:
     una placa entre tiras. */
  clip-path: var(--skin-deckle-plate); }
.people-row--king b { font-size: 17.5px; }
.people-row--king .skin-medallion { background-color: var(--skin-red-deep);
  background-image: none; color: var(--skin-gold-lit);
  box-shadow: inset 0 0 0 2px var(--skin-gold); }
/* La chapa: \`inline-flex\` con dos clases para ganarle al \`display: block\` de
   \`.people-row span\`, que es lo que hace de cada línea un renglón. */
.people-row .people-crown { display: inline-flex; align-items: center; gap: 5px;
  margin-top: 4px; padding: 2px 9px 2px 7px;
  background: var(--skin-red-deep); color: var(--skin-gold-lit);
  box-shadow: inset 0 0 0 1px var(--skin-rule-gold);
  font: 600 12px/1.6 var(--skin-font-voice);
  letter-spacing: var(--skin-track-label); text-transform: uppercase;
  font-style: normal; }
.people-row .people-crown .skin-icon { width: 14px; height: 14px; flex: 0 0 14px; }
/* La palabra va en un \`<i>\` —es una voz distinta dentro de la fila, no énfasis—
   y hay que devolverle la vertical: el navegador la inclina por su cuenta y una
   versalita de Cinzel inclinada parece un error de la fuente. */
.people-row .people-crown i { font-style: normal; }
.people-row .people-king-lean { margin-top: 3px; color: var(--skin-ink-soft);
  font: italic 13px/1.35 var(--skin-font-read); }
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

/**
 * K-8 · El rey delante, y los demás en el orden que trae el motor.
 *
 * **Es la única clasificación que esta lista hace, y la pidió el dueño del
 * diseño**: «cuando selecciones un rey, tiene que destacar después en la
 * lista». Buscarlo entre veintisiete tiras iguales no es destacar. El resto de
 * la lista sigue como estaba —orden del motor, ninguna ordenación inventada—,
 * así que sin corona esto devuelve exactamente lo que recibe.
 */
export function kingFirst(state: GameState, people: readonly Villager[]): readonly Villager[] {
  const crowned = people.find((v) => isKing(state, v));
  if (crowned === undefined) return people;
  return [crowned, ...people.filter((v) => v.id !== crowned.id)];
}

/** Cuántos nombrados enseña la lista, de cuántos habitantes tiene el valle en total. */
export function peopleScope(state: GameState): { named: number; population: number } {
  return { named: namedPresent(state).length, population: population(state) };
}

/**
 * A trade word if the villager has one, in the same voice as a trait: lowercase,
 * no sentence.
 *
 * K-5 · **y «king» si lleva la corona.** El motor llama `leader` a ese asiento y
 * lo seguirá llamando así —se guarda en las partidas—, así que la palabra la
 * pone `derive/crown.ts` y esta línea sólo la pide.
 */
function tradeLine(state: GameState, v: Villager): string | null {
  const key = roleKeyFor(state, v);
  return key === null ? null : renderUiText(key);
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
    const villagers = kingFirst(state, namedPresent(state));
    const counted = peopleScope(state);
    scope.textContent = renderUiText('people.scope', { named: counted.named, population: counted.population });
    // K-8 · La corona entra en la llave: coronar no cambia el oficio del que la
    // recibe —sigue siendo `leader`—, así que sin esto la lista se quedaba con
    // las filas de antes y el rey no aparecía hasta que alguien cumpliera años.
    const key = `${state.crown?.id ?? 0}/`
      + villagers.map((v) => `${v.id}:${v.name}:${v.role}:${v.traits.join('|')}:${ageOf(v, state.tick)}`).join(',');
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
      // El medallón con la inicial, el mismo que la ficha (UI-V4): tocar la
      // fila abre esa ficha, y es lo que dice que es la misma persona.
      const face = document.createElement('div');
      face.className = 'skin-medallion';
      face.setAttribute('aria-hidden', 'true');
      face.textContent = v.name === '' ? '?' : v.name.charAt(0).toUpperCase();
      const text = document.createElement('div');
      text.className = 'people-row-text';
      const name = document.createElement('b');
      // La edad va detrás del nombre y en la misma línea, como en la placa de
      // la ficha: son la misma persona vista dos veces, y leerla igual en las
      // dos ahorra el trabajo de volver a situarse.
      name.textContent = `${v.name} · ${renderUiText('inspect.age.short', { age: ageOf(v, state.tick) })}`;
      const traits = document.createElement('span');
      traits.textContent = traitsLine(v);
      if (isKing(state, v)) {
        // La chapa de lacre con la corona, y debajo a qué atiende: las dos cosas
        // que hacen que un rey se lea como rey y no como un oficio más.
        row.classList.add('people-row--king');
        const mark = document.createElement('span');
        mark.className = 'people-crown';
        const crown = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        crown.setAttribute('class', 'skin-icon');
        crown.setAttribute('aria-hidden', 'true');
        crown.setAttribute('focusable', 'false');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#crown');
        crown.append(use);
        const word = document.createElement('i');
        word.textContent = renderUiText('role.king');
        mark.append(crown, word);
        const lean = document.createElement('span');
        lean.className = 'people-king-lean';
        const styleKey = crownStyleKey(state);
        lean.textContent = styleKey === null ? '' : renderUiText(styleKey);
        lean.hidden = styleKey === null;
        text.append(name, mark, lean, traits);
      } else {
        const trade = tradeLine(state, v);
        const stats = document.createElement('span');
        stats.textContent = trade ?? '';
        stats.hidden = trade === null;
        text.append(name, stats, traits);
      }
      row.append(face, text);
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
