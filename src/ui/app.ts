// M-20 · The first running application shell.

import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { tick, type TickReport } from '@engine/sim';
import type { Decision, GameState, SaveFile } from '@engine/state';
import { yearOf } from '@engine/time';
import { createRenderer } from '@render/renderer';
import { inspectAt, panelFor, type InspectTarget } from './inspect';
import { recogniseGesture, type Point } from './gestures';
import { startLoop } from './loop';
import { openChronicle } from './screens/chronicle';
import { openCrossroad } from './screens/crossroad';
import { isSpeed, speedLabel, type Speed } from './speed';

export interface App {
  setSpeed(speed: Speed): void;
  state(): Readonly<GameState>;
  decide(optionId: string): boolean;
}

export interface DecisionAttempt {
  accepted: boolean;
  forceTick: boolean;
}

/**
 * The pure core of `App.decide` (v2.60, §2.60): whether the queue accepts the
 * option, and whether accepting it should force an immediate tick. Split from
 * `boot`'s DOM and render loop so the four rules of the decision contract can
 * be checked without booting either — the same way `loop.ts` keeps
 * `advanceAccumulator` pure and leaves `startLoop` as the DOM-bound wrapper.
 *
 * Rule 1: an option is accepted only if a crossroad is pending and nothing is
 * already queued — decided is decided, a second tap cannot replace it.
 * Rules 2–3: accepting forces a tick unless the game is paused; paused, §8.7
 * still lets the decision wait rather than making the player unable to pause.
 */
export function attemptDecision(
  hasPendingCrossroad: boolean,
  alreadyQueued: boolean,
  speed: Speed,
): DecisionAttempt {
  const accepted = hasPendingCrossroad && !alreadyQueued;
  return { accepted, forceTick: accepted && speed !== 0 };
}

export function roman(value: number): string {
  const numerals: readonly [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let left = Math.max(1, Math.floor(value));
  let result = '';
  for (const [amount, glyph] of numerals) {
    while (left >= amount) { result += glyph; left -= amount; }
  }
  return result;
}

function freshSeed(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] as number;
}

export function boot(root: HTMLElement, save?: SaveFile): App {
  const state = save?.state ?? foundGame(freshSeed());
  let speed: Speed = 1;
  let lastFraction = 0;
  root.replaceChildren();
  root.className = 'valley-app';

  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  canvas.setAttribute('aria-label', 'The valley');
  const year = document.createElement('div');
  year.className = 'valley-year';
  const controls = document.createElement('div');
  controls.className = 'valley-speeds';
  controls.setAttribute('aria-label', 'Simulation speed');
  const buttons = ([0, 1, 4, 16] as const).map((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = speedLabel(value);
    button.setAttribute('aria-label', speedLabel(value));
    button.addEventListener('click', () => app.setSpeed(value));
    controls.append(button);
    return [value, button] as const;
  });
  root.append(canvas, year, controls);

  const panel = document.createElement('section');
  panel.className = 'valley-panel';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  root.append(panel);

  const renderer = createRenderer(canvas, root);
  const paint = (fraction: number): void => {
    lastFraction = fraction;
    year.textContent = `ANNO ${roman(yearOf(state.tick) + 1)}`;
    renderer.paint(state, fraction);
    // §11.2's third screen opens itself the moment there is something to
    // answer — including the very first paint, for a save or a debug
    // fast-forward that already lands on a posed crossroad. `openCrossroad`
    // is its own no-op once this one is already on screen.
    if (state.crossroad !== null) openCrossroad(app, state.crossroad);
  };

  const showPanel = (target: InspectTarget): void => {
    const model = panelFor(target, state);
    const heading = document.createElement('h2'); heading.textContent = model.title;
    panel.replaceChildren(heading, ...model.lines.map((line) => { const p = document.createElement('p'); p.textContent = line; return p; }));
    panel.hidden = false;
  };
  const trace = new Map<number, Point[]>();
  let pinchStart: number | null = null;
  let zoom = 1;
  const mapPoint = (event: PointerEvent): { x: number; y: number } => {
    const box = canvas.getBoundingClientRect();
    return { x: (event.clientX - box.left) * 36 / box.width, y: (event.clientY - box.top) * 56 / box.height };
  };
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    trace.set(event.pointerId, [{ x: event.clientX, y: event.clientY, atMs: event.timeStamp }]);
    if (trace.size === 2) {
      const starts = [...trace.values()].map((points) => points[0]!);
      pinchStart = Math.hypot(starts[1]!.x - starts[0]!.x, starts[1]!.y - starts[0]!.y);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const points = trace.get(event.pointerId); if (points === undefined) return;
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (pinchStart !== null && trace.size === 2) {
      const ends = [...trace.values()].map((items) => items.at(-1)!);
      const distance = Math.hypot(ends[1]!.x - ends[0]!.x, ends[1]!.y - ends[0]!.y);
      zoom = Math.max(1, Math.min(2.5, zoom * distance / pinchStart));
      pinchStart = distance;
      canvas.style.transform = `scale(${zoom})`;
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    const points = trace.get(event.pointerId) ?? [];
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    const gesture = recogniseGesture({ points });
    trace.delete(event.pointerId); if (trace.size < 2) pinchStart = null;
    if (gesture === 'tap' || gesture === 'hold') {
      const point = mapPoint(event); const target = inspectAt(state, point.x, point.y, lastFraction);
      if (target !== null) {
        showPanel(target);
        if (gesture === 'hold' && target.kind === 'villager') renderer.track(target.id);
      }
    } else if (gesture === 'swipe_down') panel.hidden = true;
    else if (gesture === 'swipe_up') openChronicle(app);
  });
  root.addEventListener('pointerdown', (event) => { if (event.target === root) panel.hidden = true; });

  // The queue behind `decide` (v2.60). `runTick` is the one and only place a
  // queued decision is ever spent: it hands it to `tick`, which applies it at
  // step 3 (§4.2) and nowhere earlier. Consuming it here — not inside
  // `decide` — is what makes "in pause the decision waits" true for free: a
  // paused game just never calls `runTick`, so a decision queued while paused
  // sits untouched until the player unpauses and a real tick runs.
  let pendingDecision: Decision | undefined;
  const runTick = (): void => {
    if (state.ended !== null) return;
    const decision = pendingDecision;
    pendingDecision = undefined;
    const report = tick(state, CATALOG, decision);
    // Rule 4 (§2.60): the engine hands back what changed and where; `document`
    // and not `root` because the crossroad screen mounts on `document.body`
    // (§11.2's "ocupa la pantalla entera"), outside the app's own root.
    if (report.decided !== null) {
      document.dispatchEvent(new CustomEvent<TickReport>('valley:decided', { detail: report }));
    }
  };
  const loop = startLoop(() => speed, runTick, paint);
  window.addEventListener('pagehide', () => loop.stop(), { once: true });

  const app: App = {
    setSpeed(value: Speed): void {
      if (!isSpeed(value)) throw new Error(`Unsupported speed: ${value as number}`);
      speed = value;
      for (const [candidate, button] of buttons) button.setAttribute('aria-pressed', String(candidate === speed));
    },
    state(): Readonly<GameState> { return state; },
    decide(optionId: string): boolean {
      const attempt = attemptDecision(state.crossroad !== null, pendingDecision !== undefined, speed);
      if (!attempt.accepted || state.crossroad === null) return false;
      pendingDecision = { templateId: state.crossroad.templateId, optionId };
      if (attempt.forceTick) { runTick(); paint(lastFraction); }
      return true;
    },
  };
  app.setSpeed(speed);
  paint(0);
  document.documentElement.dataset.appReady = 'true';
  return app;
}
