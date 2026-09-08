// M-22 · The chronicle, full screen. design.md §9.2, §11.2, §17 M-22.
//
// A scrollable list by year, newest first — the question the player opens
// this for is "what just happened", not "what happened in year one". The
// welcome digest of a return from absence (§9.2, §13.2) is M-23's `sinceTick`
// to spend; today it only decides where the list opens.

import { renderYear } from '@engine/chronicle/render';
import type { GameState } from '@engine/state';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { roman } from '../app';
import { recogniseGesture, type Point } from '../gestures';

const STYLE_ID = 'valley-chronicle-style';
const STYLE = `
.chronicle-scrim { position: fixed; inset: 0; z-index: 10; overflow: auto; box-sizing: border-box;
  padding: max(20px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
  background: #14130f; color: #f2f4f6; font: 14px/1.4 system-ui, sans-serif; }
.chronicle-scrim h2 { margin: 20px 0 8px; font: 600 15px/1.2 Georgia, serif; color: #c9b46b; }
.chronicle-scrim h2:first-child { margin-top: 0; }
.chronicle-scrim p { margin: 4px 0; color: #d7dadd; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

function yearBlock(state: GameState, year: number): HTMLElement | null {
  const lines = renderYear(state, year);
  if (lines.length === 0) return null;
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = `ANNO ${roman(year + 1)}`;
  section.append(heading, ...lines.map((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    return p;
  }));
  return section;
}

let open: HTMLElement | null = null;

/**
 * Opens the chronicle. `sinceTick`, when given, is where the list scrolls to
 * once mounted — the most recent year still renders in full above it, since a
 * year is never split by the tick that happened to open the screen.
 */
export function openChronicle(app: App, sinceTick?: number): void {
  if (open !== null) return;
  ensureStyle();
  const state = app.state();
  const scrim = document.createElement('div');
  scrim.className = 'chronicle-scrim';

  const lastYear = yearOf(state.tick);
  let scrollTarget: HTMLElement | null = null;
  for (let year = lastYear; year >= 0; year -= 1) {
    const block = yearBlock(state, year);
    if (block === null) continue;
    scrim.append(block);
    if (sinceTick !== undefined && scrollTarget === null && year <= yearOf(sinceTick)) scrollTarget = block;
  }

  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') {
      scrim.remove();
      open = null;
    }
  });

  document.body.append(scrim);
  open = scrim;
  scrollTarget?.scrollIntoView();
}
