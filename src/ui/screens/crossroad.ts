// M-22 · The crossroad, full screen. design.md §11.2, §17 M-22.
//
// §11.2: the valley dimmed behind, title, three or four sentences of context,
// and the options as big blocks with the verb and the price — the price
// always visible, never behind a second tap. No close button: a decision is
// taken, or a swipe returns to the valley and the crossroad stays pending,
// marked with a discreet dot the player can tap to come back to it.

import { CATALOG } from '@engine/crossroads/catalog';
import { namesOf } from '@engine/crossroads/resolve';
import { renderEntry } from '@engine/chronicle/render';
import type { GameState, PendingCrossroad } from '@engine/state';
import type { TickReport } from '@engine/sim';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { recogniseGesture, type Point } from '../gestures';

const STYLE_ID = 'valley-crossroad-style';
const STYLE = `
.crossroad-scrim { position: fixed; inset: 0; z-index: 10; display: flex; align-items: flex-end;
  background: rgba(18,17,14,.82); color: #f2f4f6; font: 14px/1.35 system-ui, sans-serif; }
.crossroad { box-sizing: border-box; width: 100%; max-height: 100%; overflow: auto;
  padding: max(20px, env(safe-area-inset-top)) 20px max(18px, env(safe-area-inset-bottom)); }
.crossroad h1 { margin: 0 0 10px; font: 600 21px/1.2 Georgia, serif; }
.crossroad p.crossroad-body { margin: 0 0 16px; color: #d7dadd; }
.crossroad-options { display: flex; flex-direction: column; gap: 10px; }
.crossroad-options button { display: block; width: 100%; box-sizing: border-box; text-align: left;
  padding: 12px 14px; border: 1px solid rgba(242,244,246,.35); border-radius: 10px;
  background: rgba(242,244,246,.08); color: inherit; font: inherit; min-height: 44px; }
.crossroad-options button:active { background: rgba(242,244,246,.2); }
.crossroad-label { display: block; font: 600 15px/1.2 Georgia, serif; }
.crossroad-cost { display: block; margin-top: 4px; color: #c9b46b; font-size: 13px; }
.crossroad-marker { position: fixed; z-index: 9; top: max(9px, env(safe-area-inset-top));
  right: max(12px, env(safe-area-inset-right)); width: 14px; height: 14px; border-radius: 50%;
  background: #c9463c; border: 2px solid #f2f4f6; padding: 0; min-width: 0; min-height: 0; }
.crossroad-open .valley-speeds { visibility: hidden; }
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

function mountMarker(app: App, p: PendingCrossroad): void {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'crossroad-marker';
  marker.setAttribute('aria-label', 'A crossroad is waiting');
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
