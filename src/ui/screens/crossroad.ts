// M-22 · The crossroad, full screen. design.md §11.2, §17 M-22.
//
// §11.2: the valley dimmed behind, title, three or four sentences of context,
// and the options as big blocks with the verb and the price — the price
// always visible, never behind a second tap. No close button: a decision is
// taken, or a swipe returns to the valley and the crossroad stays pending,
// marked with a discreet dot the player can tap to come back to it.

import { CATALOG } from '@engine/crossroads/catalog';
import { namesOf } from '@engine/crossroads/resolve';
import { renderEntry, renderUiText } from '@engine/chronicle/render';
import type { GameState, PendingCrossroad } from '@engine/state';
import type { TickReport } from '@engine/sim';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { recogniseGesture, type Point } from '../gestures';

const STYLE_ID = 'valley-crossroad-style';
const STYLE = `
/* §11.2 pide el valle atenuado y no tapado, pero **el valle no es un fondo
   uniforme**: su suelo es claro y las opciones caen justo encima. Visto en
   captura, el coste de cada opción perdía contraste contra el prado. Se deja
   ver arriba, donde no hay letra, y se cierra hacia abajo, donde sí. */
.crossroad-scrim { position: fixed; inset: 0; z-index: 10; display: flex; align-items: flex-end;
  background: linear-gradient(to bottom, rgba(26,21,17,.72) 0%, rgba(26,21,17,.93) 38%, rgba(26,21,17,.97) 100%);
  color: var(--parchment, #f2e9d8); font: 14px/1.35 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif); }
.crossroad { box-sizing: border-box; width: 100%; max-height: 100%; overflow: auto;
  padding: max(22px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom)); }
/* U-01 · La encrucijada es el momento en que el jugador decide, y tiene que
   pesar como tal: un filete de latón encima del título, como el encabezamiento
   de un capítulo, y el cuerpo en la misma voz con que está escrita la crónica. */
.crossroad h1 { margin: 0 0 12px; padding-top: 14px; text-wrap: balance;
  border-top: 2px solid var(--gild-lit, #c9ab6b); color: var(--parchment, #f2e9d8);
  font: 600 23px/1.18 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); }
.crossroad p.crossroad-body { margin: 0 0 20px; color: var(--paper-dim, #d9cfbc);
  font: 15px/1.5 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif);
  text-wrap: pretty; }
.crossroad-options { display: flex; flex-direction: column; gap: 9px; }
/* Cada opción es una carta que se levanta: un canto claro a la izquierda la
   marca como elegible, y al pulsarla se hunde en vez de cambiar de color. */
.crossroad-options button { display: block; width: 100%; box-sizing: border-box; text-align: left;
  padding: 13px 15px 13px 14px; border: 1px solid rgba(217,207,188,.28);
  border-left: 3px solid var(--gild-lit, #c9ab6b); border-radius: 4px;
  background: rgba(217,207,188,.07); color: inherit; font: inherit; min-height: 44px;
  cursor: pointer; -webkit-tap-highlight-color: transparent; }
.crossroad-options button:active { background: rgba(217,207,188,.16); transform: translateY(1px); }
.crossroad-options button:focus-visible { outline: 2px solid var(--gild-lit, #c9ab6b); outline-offset: 2px; }
.crossroad-label { display: block; color: var(--parchment, #f2e9d8);
  font: 600 16px/1.25 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); }
/* El precio no es una nota al pie: es la mitad de la decisión.
   **Y no va en mayúsculas**, que era como estaba y se vio en una captura: «A
   HUNDRED AND TWENTY OF GRAIN, AND SHE IS THIN» grita, y el precio de una
   decisión no grita, se dice. El banco lo escribe en minúscula con su
   mayúscula inicial (§9.3) y la hoja de estilo lo estaba reescribiendo. En
   cursiva y en la misma serif de la crónica: es la voz de quien te vende la
   vaca, no una etiqueta de sistema. */
.crossroad-cost { display: block; margin-top: 5px; color: var(--gild-lit, #c9ab6b);
  font: italic 13.5px/1.35 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif);
  letter-spacing: .005em; }
/* U-07 · la marca discreta de §11.2 pasaba por un punto rojo de 14 px que
   nadie lee como "lo mas importante que el juego tiene que pedirte". Misma
   piel que la regleta de velocidad y la barra de abajo (index.html,
   .valley-speeds, .valley-tabbar): pergamino (--plate) con un filete de
   latón, porque es el mismo tipo de mando de estado, no un aviso de sistema. */
.crossroad-marker { position: fixed; z-index: 9; top: max(9px, env(safe-area-inset-top));
  right: max(12px, env(safe-area-inset-right)); display: flex; align-items: center; gap: 6px;
  min-height: 44px; padding: 0 14px; border: 1.5px solid var(--gild, #7d5c2e); border-radius: 22px;
  background: var(--plate, rgba(242,233,216,.90)); color: var(--ink, #221d18);
  font: 650 12px/1 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif);
  letter-spacing: .02em; cursor: pointer; -webkit-tap-highlight-color: transparent;
  box-shadow: 0 2px 6px rgba(34,29,24,.20); backdrop-filter: blur(2px); }
.crossroad-marker:active { background: rgba(217,207,188,.55); transform: translateY(1px); }
.crossroad-marker:focus-visible { outline: 2px solid var(--gild, #7d5c2e); outline-offset: 2px; }
/* **La pantalla entera es de la decisión** (§11.2), y eso incluye la cabecera.
   Se vio en una captura: la tira, las tres palancas y la línea de estado se
   leían a través de la encrucijada —las tarjetas son translúcidas—, y ahí
   arriba no hay nada que hacer mientras se contesta: las órdenes permanentes
   valen para la semana que viene, no para esto. El aviso de §11.6 ya se
   ocultaba por la misma razón (index.html). */
.crossroad-open .valley-speeds,
.crossroad-open .valley-speed-badge,
.crossroad-open .valley-orders-now,
.crossroad-open .valley-orders,
.crossroad-open .valley-vitals,
.crossroad-open .valley-orders,
.crossroad-open .valley-doing,
.crossroad-open .valley-year,
.crossroad-open .valley-season { visibility: hidden; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/** A `crossroad.<template>.<key>` line, filled with this crossroad's cast and year. */
function textOf(state: GameState, p: PendingCrossroad, key: string): string {
  return renderEntry(
    { tick: p.posedTick, kind: 'crossroad_posed', templateKey: key, params: { year: yearOf(p.posedTick), ...namesOf(state, p.cast) }, weight: 3 },
    state.rng,
  );
}

/**
 * §11.2's two seconds: zoom on the map cell a decision changed. `transform-
 * origin` as a percentage of the canvas box does the centring for free — the
 * canvas always draws the whole map (§11.3: "no hay desplazamiento de cámara
 * a 1×"), so a fraction of its box is exactly a fraction of the map.
 */
function focus(state: GameState, report: TickReport): void {
  const point = report.visualEffects[0];
  if (point === undefined) return;
  const canvas = document.querySelector<HTMLCanvasElement>('#valley');
  if (canvas === null) return;
  // No CSS transition: an eased zoom is a real-clock animation riding on top
  // of a simulation the tick's own clock drives, and the two have no reason
  // to agree — the animation can still be mid-flight when a later tick (or a
  // test's fake clock) has already moved the two seconds on. A hard cut reads
  // as emphasis and stays exactly two seconds, not "about" two seconds.
  canvas.style.transformOrigin = `${(point.x / state.map.width) * 100}% ${(point.y / state.map.height) * 100}%`;
  canvas.style.transform = 'scale(2.5)';
  setTimeout(() => {
    canvas.style.transform = 'scale(1)';
    canvas.style.transformOrigin = '50% 50%';
  }, 2_000);
}

interface Shown { key: string; overlay: HTMLElement | null; marker: HTMLElement | null }
let shown: Shown | null = null;

function key(p: PendingCrossroad): string {
  return `${p.templateId}:${p.posedTick}`;
}

function removeShown(): void {
  shown?.overlay?.remove();
  shown?.marker?.remove();
  document.documentElement.classList.remove('crossroad-open');
}

/** Remove a question that belongs to a game which has just ended. */
export function closeCrossroad(): void {
  removeShown();
  shown = null;
}

function mountMarker(app: App, p: PendingCrossroad): void {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'crossroad-marker';
  // The visible label and the screen-reader label answer different questions
  // — the pill's own text is the affordance ("what is this"), the aria-label
  // is the summons ("a crossroad is waiting") that already had its wording
  // and was not to change.
  marker.setAttribute('aria-label', renderUiText('crossroad.waiting'));
  const text = document.createElement('span');
  text.textContent = renderUiText('crossroad.pending_pill');
  marker.append(text);
  marker.addEventListener('click', () => {
    marker.remove();
    mountOverlay(app, p);
  });
  document.body.append(marker);
  shown = { key: key(p), overlay: null, marker };
}

function mountOverlay(app: App, p: PendingCrossroad): void {
  ensureStyle();
  const state = app.state();
  const template = CATALOG.find((t) => t.id === p.templateId);
  if (template === undefined) return;
  document.documentElement.classList.add('crossroad-open');

  const scrim = document.createElement('div');
  scrim.className = 'crossroad-scrim';
  const card = document.createElement('section');
  card.className = 'crossroad';
  const h1 = document.createElement('h1');
  h1.textContent = textOf(state, p, template.title);
  const body = document.createElement('p');
  body.className = 'crossroad-body';
  body.textContent = textOf(state, p, template.body);
  const options = document.createElement('div');
  options.className = 'crossroad-options';

  for (const optionId of p.optionIds) {
    const option = template.options.find((o) => o.id === optionId);
    if (option === undefined) continue;
    const button = document.createElement('button');
    button.type = 'button';
    const labelText = textOf(state, p, option.label);
    const costText = textOf(state, p, option.cost);
    // Screen readers hear the price too — "siempre visible" (§11.2) is not
    // only a pixel promise.
    button.setAttribute('aria-label', `${labelText}. ${costText}`);
    const label = document.createElement('span');
    label.className = 'crossroad-label';
    label.textContent = labelText;
    // The price, in the same block and the same tap as the verb: §11.2's
    // "siempre visible" is not a promise a second screen can keep.
    const cost = document.createElement('span');
    cost.className = 'crossroad-cost';
    cost.textContent = costText;
    button.append(label, cost);
    button.addEventListener('click', () => {
      // Registered *before* calling `decide`: rule 2 (§2.60) forces the tick
      // — and dispatches the event — synchronously inside that call, so a
      // listener added after it returns would already have missed it.
      const onDecided = ((event: CustomEvent<TickReport>) => {
        focus(app.state(), event.detail);
      }) as EventListener;
      document.addEventListener('valley:decided', onDecided, { once: true });
      const accepted = app.decide(optionId);
      // Rule 1 (§2.60): a decision already in flight refuses a second one.
      // The screen simply stays open, and this listener never fires — remove
      // it rather than leave it to catch some later, unrelated decision.
      if (!accepted) { document.removeEventListener('valley:decided', onDecided); return; }
      removeShown();
      shown = null;
    });
    options.append(button);
  }

  card.append(h1, body, options);
  scrim.append(card);

  // §11.2: no close button. A swipe down returns to the valley; the crossroad
  // stays pending and a discreet mark takes its place.
  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') {
      scrim.remove();
      document.documentElement.classList.remove('crossroad-open');
      mountMarker(app, p);
    }
  });

  document.body.append(scrim);
  shown = { key: key(p), overlay: scrim, marker: null };
}

/**
 * Opens the crossroad, or does nothing if this one is already on screen (as
 * a full card or as its discreet mark) — `boot` calls this every tick while a
 * crossroad is pending, and re-mounting it each time would steal the swipe
 * gesture's own dismissal and reset any card the player is mid-read of.
 */
export function openCrossroad(app: App, p: PendingCrossroad): void {
  if (shown !== null && shown.key === key(p)) return;
  removeShown();
  mountOverlay(app, p);
}
