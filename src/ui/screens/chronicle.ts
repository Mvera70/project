// M-22 · The chronicle, full screen. design.md §9.2, §11.2, §17 M-22.
//
// A scrollable list by year, newest first — the question the player opens
// this for is "what just happened", not "what happened in year one". The
// welcome digest of a return from absence (§9.2, §13.2) is M-23's `sinceTick`
// to spend; today it only decides where the list opens.

import { renderChronicleYear, renderUiText } from '@engine/chronicle/render';
import { makeBundle, type RngBundle } from '@engine/rng';
import type { ArchivedGame, ChronicleEntry } from '@engine/state';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { roman } from '../app';
import { recogniseGesture, type Point } from '../gestures';
import type { PanelFactory, UiSnapshot } from '../redesign/contracts';

const STYLE_ID = 'valley-chronicle-style';
const STYLE = `
.chronicle-scrim { position: fixed; inset: 0; z-index: 13; overflow: auto; box-sizing: border-box;
  /* El hueco de abajo es para la barra de destinos, que se queda encima. */
  padding: max(20px, env(safe-area-inset-top)) 20px calc(74px + env(safe-area-inset-bottom));
  background: var(--night, #1a1511); color: var(--parchment, #f2e9d8); font: 14px/1.4 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif); }
.chronicle-scrim h2 { margin: 20px 0 8px; font: 600 15px/1.2 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); color: var(--gild-lit, #c9ab6b); }
.chronicle-scrim h2:first-child { margin-top: 0; }
.chronicle-scrim p { margin: 4px 0; color: var(--paper-dim, #d9cfbc); }
.chronicle-source { position: sticky; top: -20px; z-index: 1; display: grid; gap: 6px;
  margin: -20px -20px 18px; padding: max(20px, env(safe-area-inset-top)) 20px 12px;
  background: var(--night, #1a1511); color: var(--gild-lit, #c9ab6b); font: 600 12px/1.2 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif); }
.chronicle-source select { box-sizing: border-box; width: 100%; min-height: 44px; padding: 9px 34px 9px 11px;
  border: 1px solid #756c55; border-radius: 8px; background: var(--night-soft, #262019); color: var(--parchment, #f2e9d8);
  font: 14px/1.2 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif); }
/* U-14 · **La salida, visible.** Las dos pantallas se cerraban sólo deslizando
   hacia abajo, y el velo tapaba la barra de destinos: quien entraba a ver a los
   aldeanos o la crónica se quedaba dentro. Lo dijo el dueño del diseño el 15
   sep 2026: «no hay forma de volver atrás». Ahora hay un botón y la barra de
   abajo sigue a la vista, que es lo que un dedo espera de una barra de
   pestañas. El deslizamiento se queda: era correcto, sólo estaba solo. */
.chronicle-close { position: sticky; top: 0; float: right; min-height: 40px; margin: -4px -6px 0 8px;
  padding: 6px 12px; border: 1px solid #756c55; border-radius: 8px; background: var(--night-soft, #262019);
  color: var(--gild-lit, #c9ab6b); font: 600 13px/1 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif);
  cursor: pointer; -webkit-tap-highlight-color: transparent; }
.chronicle-close:active { background: #322a20; }
/* UI-R3 · desde esta ronda la crónica puede vivir anidada dentro de la
   bandeja de la carcasa (\`shell.content\`, que UI-R2 ya deja con
   \`pointer-events: auto\`). Se declara aquí también, explícito, para que la
   piel de la crónica no dependa de una regla ajena que un día podría
   cambiar — el mismo criterio que \`shell.css\` ya sigue consigo mismo. */
.chronicle-scrim { pointer-events: auto; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

interface ChronicleSource {
  chronicle: readonly ChronicleEntry[];
  rng: RngBundle;
  lastTick: number;
}

function yearBlock(source: ChronicleSource, year: number): HTMLElement | null {
  const lines = renderChronicleYear(source.chronicle, source.rng, year);
  if (lines.length === 0) return null;
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = renderUiText('app.year', { year: roman(year + 1) });
  section.append(heading, ...lines.map((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    return p;
  }));
  return section;
}

let open: HTMLElement | null = null;
/** A quién avisar cuando esta pantalla se cierre, se cierre como se cierre. */
let closed: (() => void) | null = null;

/** Cierra la pantalla si está abierta. La barra de destinos la usa (U-14). */
export function closeChronicle(): void {
  open?.remove();
  open = null;
  const tell = closed;
  closed = null;
  tell?.();
}

function archivedSource(game: ArchivedGame): ChronicleSource {
  return { chronicle: game.chronicle, rng: makeBundle(game.seed), lastTick: game.endedTick };
}

/**
 * Opens the chronicle. `sinceTick`, when given, is where the list scrolls to
 * once mounted — the most recent year still renders in full above it, since a
 * year is never split by the tick that happened to open the screen.
 */
export function openChronicle(app: App, sinceTick?: number, onClose?: () => void): void {
  if (open !== null) return;
  ensureStyle();
  closed = onClose ?? null;
  const state = app.state();
  const previous = app.archive()
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => !(game.seed === state.seed && game.endedTick === state.ended?.tick));
  const scrim = document.createElement('div');
  scrim.className = 'chronicle-scrim';

  const body = document.createElement('div');
  body.className = 'chronicle-body';
  const current: ChronicleSource = { chronicle: state.chronicle, rng: state.rng, lastTick: state.tick };
  const renderSource = (source: ChronicleSource, scrollSince?: number): HTMLElement | null => {
    body.replaceChildren();
    let scrollTarget: HTMLElement | null = null;
    for (let year = yearOf(source.lastTick); year >= 0; year -= 1) {
      const block = yearBlock(source, year);
      if (block === null) continue;
      body.append(block);
      if (scrollSince !== undefined && scrollTarget === null && year <= yearOf(scrollSince)) scrollTarget = block;
    }
    return scrollTarget;
  };

  if (previous.length > 0) {
    const label = document.createElement('label');
    label.className = 'chronicle-source';
    label.textContent = renderUiText('chronicle.source');
    const select = document.createElement('select');
    select.setAttribute('aria-label', renderUiText('chronicle.source'));
    const currentOption = document.createElement('option');
    currentOption.value = 'current';
    currentOption.textContent = renderUiText('chronicle.current');
    select.append(currentOption);
    for (const { game, index } of [...previous].reverse()) {
      const option = document.createElement('option');
      option.value = `archive:${index}`;
      option.textContent = renderUiText('chronicle.archived', {
        number: index + 1,
        years: yearOf(game.endedTick),
        peak: game.peakPeople,
      });
      select.append(option);
    }
    select.addEventListener('change', () => {
      const index = Number(select.value.split(':')[1]);
      const game = app.archive()[index];
      renderSource(select.value === 'current' || game === undefined ? current : archivedSource(game));
      scrim.scrollTop = 0;
    });
    label.append(select);
    scrim.append(label);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'chronicle-close';
  close.textContent = renderUiText('app.close');
  close.addEventListener('click', closeChronicle);
  scrim.append(close, body);
  const scrollTarget = renderSource(current, sinceTick);

  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') closeChronicle();
  });

  document.body.append(scrim);
  open = scrim;
  scrollTarget?.scrollIntoView();
}

/**
 * UI-R3 · La crónica migrada de verdad al contenedor común (`shell.content`),
 * como un `PanelFactory`. Reutiliza `ensureStyle`/`STYLE`/`yearBlock`/
 * `ChronicleSource`/`archivedSource` de arriba: la piel y el renderizado de un
 * año son los mismos que el camino del epitafio (`openChronicle`), que sigue
 * vivo sin tocar — `screens/epitaph.ts` está fuera del alcance de esta ronda,
 * lo llama directamente y no pasa por la barra de navegación.
 *
 * **Por qué la bandeja se destapa a mano, y no es un olvido.**
 * `contentRouteFor` (`redesign/shell.ts`, UI-R1) sólo conoce `orders` e
 * `inspect` — el propio comentario de esa ronda dice que crónica y gente
 * «siguen sirviéndose por los adaptadores de pantalla completa… que
 * UI-R3/UI-R4 migran», y `shell.ts`/`contracts.ts` están fuera del alcance de
 * este brief. `app.ts` (el único enganche que este brief concede) destapa
 * `.ui-shell-content` a mano tras `shell.setRoute`, exactamente por la misma
 * vía que UI-R1 ya usó para la ranura del mensaje
 * (`shell.element.querySelector` sobre una clase pública y estable, nunca una
 * API nueva de `shell.ts`). Visualmente no cambia nada: `.chronicle-scrim`
 * sigue siendo `position: fixed; inset: 0` con el mismo z-index (13) de
 * siempre, así que cubre la pantalla entera igual que cuando colgaba
 * directamente de `document.body` — la barra de navegación (z-index 14)
 * sigue viéndose encima, que es lo que exige U-14.
 *
 * **Por qué una entrada nueva no roba el desplazamiento.** `update` no
 * reconstruye la lista entera en cada fotograma (se llama uno por uno desde
 * el bucle de pintado de `app.ts` mientras esta ruta esté activa): sólo lo
 * hace cuando la fuente cambia de verdad —otra partida, no sólo «actual» vs.
 * «archivada»: `chronicleIdentity` lleva la semilla, porque una sucesora
 * (`foundSuccessor`) sigue siendo «la partida actual» con una crónica
 * distinta de cero, y confundir las dos mezclaría dos aldeas en una lista—.
 * Con la misma fuente, sólo se toca el bloque del año en curso: los años
 * cerrados no cambian nunca (§9 del diseño, la crónica no reescribe el
 * pasado), así que no hace falta ni tocarlos. Y si quien lee no está pegado
 * arriba del todo (`element.scrollTop > 2`), se compensa el alto que ese
 * bloque haya ganado para que el texto que tenía bajo el dedo siga ahí.
 */

/**
 * Pura: qué identidad tiene la fuente que se está leyendo. Distinta semilla
 * ⇒ distinta identidad aunque las dos sean «la partida actual» — una
 * sucesora tras el epitafio (`foundSuccessor`) sigue siendo «actual» con una
 * crónica que empieza de cero, y tratarla como la misma fuente mezclaría dos
 * aldeas en una sola lista. Separada de `chroniclePanel` porque este
 * proyecto no trae `jsdom` (UI-R1 §4, UI-R2 §7.4): es la parte que una
 * prueba rápida puede examinar sin levantar DOM.
 */
export function chronicleIdentity(selectedArchive: number | null, currentSeed: number): string {
  return selectedArchive === null ? `current:${currentSeed}` : `archive:${selectedArchive}`;
}

/**
 * Pura: qué partidas archivadas puede elegir el selector, y en qué orden
 * (más reciente primero, como ya hacía la pantalla vieja). Excluye la que
 * coincide con la partida actual —misma semilla, mismo tick de cierre—, que
 * ya se ve bajo «This valley» y no necesita una segunda entrada.
 */
export function selectableArchive(
  archive: readonly ArchivedGame[],
  currentSeed: number,
  currentEndedTick: number | undefined,
): readonly { readonly game: ArchivedGame; readonly index: number }[] {
  return archive
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => !(game.seed === currentSeed && game.endedTick === currentEndedTick))
    .reverse();
}

export const chroniclePanel: PanelFactory = (actions) => {
  ensureStyle();
  const element = document.createElement('div');
  element.className = 'chronicle-scrim';

  const body = document.createElement('div');
  body.className = 'chronicle-body';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'chronicle-close';
  close.textContent = renderUiText('app.close');
  close.addEventListener('click', () => { actions.navigate({ kind: 'valley' }); });

  element.append(close, body);

  // El mismo gesto que el resto del valle (S-05, U-14): deslizar hacia abajo
  // cierra, y siempre por `actions.navigate` — nunca un callback propio, que
  // es lo que hacía la pantalla vieja (`closed`, arriba) porque no tenía un
  // propietario único de la navegación a quien avisar.
  const trace: Point[] = [];
  element.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  element.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') actions.navigate({ kind: 'valley' });
  });

  let sourceLabel: HTMLLabelElement | null = null;
  let archiveCount = -1;
  let selectedArchive: number | null = null;
  let renderedIdentity: string | null = null;
  let renderedYear: number | null = null;
  let renderedTick: number | null = null;

  const sourceFor = (snapshot: UiSnapshot): ChronicleSource => {
    const game = selectedArchive === null ? undefined : snapshot.archive[selectedArchive];
    if (game !== undefined) return archivedSource(game);
    return { chronicle: snapshot.state.chronicle, rng: snapshot.state.rng, lastTick: snapshot.state.tick };
  };

  const fullRender = (source: ChronicleSource): void => {
    body.replaceChildren();
    for (let year = yearOf(source.lastTick); year >= 0; year -= 1) {
      const block = yearBlock(source, year);
      if (block !== null) body.append(block);
    }
    renderedYear = yearOf(source.lastTick);
    renderedTick = source.lastTick;
  };

  /**
   * Sólo el bloque del año en curso, o los que hayan empezado desde el
   * último pintado — nunca los años ya cerrados, que no vuelven a cambiar.
   */
  const refreshCurrentYear = (source: ChronicleSource): void => {
    const year = yearOf(source.lastTick);
    const beforeHeight = element.scrollHeight;
    const beforeScroll = element.scrollTop;
    const atTop = beforeScroll <= 2;
    if (year === renderedYear) {
      const block = yearBlock(source, year);
      if (block !== null) {
        const first = body.firstElementChild;
        if (first !== null) first.replaceWith(block); else body.prepend(block);
      }
    } else {
      // Uno o más años nuevos empezaron: se anteponen en orden (el más nuevo
      // queda arriba), y el año que antes estaba «en curso» se deja tal cual.
      const blocks: HTMLElement[] = [];
      for (let y = year; y > (renderedYear ?? -1); y -= 1) {
        const block = yearBlock(source, y);
        if (block !== null) blocks.push(block);
      }
      if (blocks.length > 0) body.prepend(...blocks);
    }
    renderedYear = year;
    renderedTick = source.lastTick;
    // No se toca el scroll de quien está pegado arriba: sigue viendo crecer
    // el año en curso de primera mano, que es lo que se espera al leer «lo
    // que acaba de pasar». Quien ya había bajado a leer historia conserva su
    // sitio: se compensa exactamente el alto que el bloque de arriba ganó.
    if (!atTop) element.scrollTop = beforeScroll + (element.scrollHeight - beforeHeight);
  };

  const rebuildSourcePicker = (snapshot: UiSnapshot): void => {
    sourceLabel?.remove();
    sourceLabel = null;
    const state = snapshot.state;
    const previous = selectableArchive(snapshot.archive, state.seed, state.ended?.tick);
    if (previous.length === 0) return;
    const label = document.createElement('label');
    label.className = 'chronicle-source';
    label.textContent = renderUiText('chronicle.source');
    const select = document.createElement('select');
    select.setAttribute('aria-label', renderUiText('chronicle.source'));
    const currentOption = document.createElement('option');
    currentOption.value = 'current';
    currentOption.textContent = renderUiText('chronicle.current');
    select.append(currentOption);
    // `previous` ya viene del más reciente al más antiguo (`selectableArchive`).
    for (const { game, index } of previous) {
      const option = document.createElement('option');
      option.value = `archive:${index}`;
      option.textContent = renderUiText('chronicle.archived', {
        number: index + 1, years: yearOf(game.endedTick), peak: game.peakPeople,
      });
      select.append(option);
    }
    select.value = selectedArchive === null ? 'current' : `archive:${selectedArchive}`;
    select.addEventListener('change', () => {
      selectedArchive = select.value === 'current' ? null : Number(select.value.split(':')[1]);
      element.scrollTop = 0;
      // La identidad cambió: el próximo `update` reconstruye entero.
      renderedIdentity = null;
    });
    label.append(select);
    sourceLabel = label;
    element.insertBefore(label, close);
  };

  return {
    element,
    update(snapshot: UiSnapshot): void {
      // El selector de archivo sólo se reconstruye cuando de verdad hay una
      // partida nueva archivada — no en cada fotograma.
      if (snapshot.archive.length !== archiveCount) {
        archiveCount = snapshot.archive.length;
        rebuildSourcePicker(snapshot);
      }
      const identity = chronicleIdentity(selectedArchive, snapshot.state.seed);
      const source = sourceFor(snapshot);
      if (identity !== renderedIdentity) {
        fullRender(source);
        element.scrollTop = 0;
        renderedIdentity = identity;
        return;
      }
      // Una partida archivada no cambia nunca; sólo la actual avanza.
      if (selectedArchive === null && source.lastTick !== renderedTick) refreshCurrentYear(source);
    },
    // Como `orders.ts` (UI-R2 §7.2): sólo `addEventListener` sobre elementos
    // propios. Quitar `element` del árbol basta.
    dispose(): void { /* ver el comentario de arriba */ },
  };
};
