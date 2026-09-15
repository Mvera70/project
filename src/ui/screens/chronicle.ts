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
