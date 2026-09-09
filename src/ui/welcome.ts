// M-23 · The welcome report. design.md §9.2, §13.2, §17 M-23.
//
// What closes the lethargy: the headline, up to four things that mattered,
// and the numbers — never the whole chronicle, and never a screen the player
// has to reconstruct by hand to know what happened while they were gone.

import type { Digest } from '@engine/chronicle/digest';
import { renderEntry } from '@engine/chronicle/render';
import type { ChronicleEntry, GameState } from '@engine/state';
import type { App } from './app';
import { recogniseGesture, type Point } from './gestures';

const STYLE_ID = 'valley-welcome-style';
const STYLE = `
.welcome-scrim { position: fixed; inset: 0; z-index: 11; display: flex; align-items: flex-end;
  background: #12110e; color: #f2f4f6; font: 14px/1.4 system-ui, sans-serif; }
.welcome { box-sizing: border-box; width: 100%; max-height: 100%; overflow: auto;
  padding: max(20px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom)); }
.welcome h1 { margin: 0 0 14px; font: 600 20px/1.2 Georgia, serif; }
.welcome p { margin: 6px 0; color: #d7dadd; }
.welcome p.welcome-headline { color: #f2f4f6; font-weight: 600; }
.welcome p.welcome-count { color: #c9b46b; margin-top: 14px; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/** A synthetic entry for a bank key that carries no chronicle event of its own. */
function synthetic(tick: number, templateKey: string, params: Record<string, string | number>): ChronicleEntry {
  // `kind` is never read by `renderEntry` — 'season' is the closest existing
  // kind to "background narration, not a specific happening" (§9.2).
  return { tick, kind: 'season', templateKey, params, weight: 1 };
}

/**
 * §9.2, literally: the most recent weight-3 headline, up to four weight-2
 * entries, and a numeric summary — nothing else. Pure text, so it can be
 * checked without a screen and reused by one.
 */
export function welcomeLines(state: GameState, digest: Digest): string[] {
  const lines: string[] = [];
  if (digest.headline !== null) lines.push(renderEntry(digest.headline, state.rng, 0));
  digest.entries.forEach((e, i) => lines.push(renderEntry(e, state.rng, i + 1)));

  const s = digest.summary;
  lines.push(renderEntry(synthetic(state.tick, 'welcome.time', { weeks: s.weeks }), state.rng, 900));
  lines.push(renderEntry(synthetic(state.tick, 'welcome.people', {
    people: s.people, born: s.born, died: s.died, arrived: s.arrived, left: s.left,
  }), state.rng, 901));
  lines.push(renderEntry(synthetic(state.tick, 'welcome.buildings', {
    built: s.built, lost: s.lost,
  }), state.rng, 902));
  return lines;
}

let shown: HTMLElement | null = null;

/**
 * Opens the welcome report full screen. Unlike the crossroad (§17 M-22) this
 * asks nothing: any tap or a swipe down closes it, because there is no
 * decision here to protect from a stray touch.
 */
export function openWelcome(app: App, digest: Digest): void {
  if (shown !== null) return;
  ensureStyle();
  const state = app.state();

  const scrim = document.createElement('div');
  scrim.className = 'welcome-scrim';
  const card = document.createElement('section');
  card.className = 'welcome';
  const h1 = document.createElement('h1');
  h1.textContent = 'While you were gone';

  const lines = welcomeLines(state, digest);
  const headlineCount = digest.headline !== null ? 1 : 0;
  const paragraphs = lines.map((line, i) => {
    const p = document.createElement('p');
    p.textContent = line;
    if (i === 0 && headlineCount === 1) p.className = 'welcome-headline';
    if (i >= lines.length - 3) p.className = 'welcome-count';
    return p;
  });

  card.append(h1, ...paragraphs);
  scrim.append(card);

  const close = (): void => { scrim.remove(); shown = null; };
  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    const gesture = recogniseGesture({ points: trace });
    if (gesture === 'tap' || gesture === 'swipe_down') close();
  });

  document.body.append(scrim);
  shown = scrim;
}
