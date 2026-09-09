// M-28 · What just happened, over the valley. design.md §11.6, §9.2.
//
// The valley of §11.1 shows STATE — how many people, how much grain, whether
// there is hunger or plague. Every row of that table is a condition, and not
// one of them is an event. Measured on a real session (v2.84): in twenty years
// the village fought off a raid for its granary, buried someone killed by
// another hand, lost a house to fire, lit its forge and chose a leader, and
// the screen showed people walking. All of it existed, in the chronicle,
// behind a gesture nobody made.
//
// This is the smallest honest fix: when something the chronicle would print in
// bold happens, its own line appears over the valley for a few seconds. No new
// vocabulary of sprites — that belongs to the art work being planned
// separately — and no numbers, which §11.1 forbids. The chronicle's voice,
// where the player is already looking.

import { TIME } from '@engine/balance';
import { renderEntry } from '@engine/chronicle/render';
import type { ChronicleEntry, GameState } from '@engine/state';

/**
 * Which of a tick's entries deserve the valley's attention.
 *
 * §9.2's own filter, and no other: weights 2 and 3 are what the chronicle
 * screen shows by default, so they are exactly what "something happened"
 * means in this game. Weight 1 — an ordinary birth, the turn of a season — is
 * the quiet ticking underneath and would drown the rest.
 */
export function noticeworthy(entries: readonly ChronicleEntry[]): ChronicleEntry[] {
  return entries.filter((entry) => entry.weight >= 2);
}

const STYLE_ID = 'valley-notice-style';
const STYLE = `
/* Sits clear of the speed controls of §11.2 rather than over them: 44 px of
   button plus its own bottom inset, plus a gap. */
.valley-notice { position: absolute; z-index: 4; left: 0; right: 0;
  bottom: calc(56px + max(12px, env(safe-area-inset-bottom)));
  box-sizing: border-box; padding: 12px 16px;
  background: rgba(18,17,14,.9); border-top: 1px solid rgba(242,244,246,.18);
  border-bottom: 1px solid rgba(242,244,246,.18);
  color: #f2f4f6; font: 15px/1.35 Georgia, serif; text-wrap: pretty; }
.valley-notice[hidden] { display: none !important; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

export interface Notices {
  /** Show the last noticeworthy entry of this tick, if there is one. */
  show(state: GameState, entries: readonly ChronicleEntry[]): void;
  /** Hide at once — the crossroad and the epitaph own the whole screen. */
  clear(): void;
}

/**
 * Mounts the band and returns the handle the loop drives.
 *
 * The line is composed by `renderEntry` with the entry's own position in the
 * chronicle as the discriminant, the same one `renderYear` uses, so the
 * sentence read here and the sentence read later in the chronicle are the same
 * sentence (§9.1: scrolling the chronicle must not reword the village's past).
 */
export function mountNotices(root: HTMLElement): Notices {
  ensureStyle();
  const band = document.createElement('aside');
  band.className = 'valley-notice';
  band.hidden = true;
  band.setAttribute('aria-live', 'polite');
  root.append(band);

  let timer = 0;
  const clear = (): void => {
    if (timer !== 0) { clearTimeout(timer); timer = 0; }
    band.hidden = true;
    band.textContent = '';
  };

  return {
    clear,
    show(state: GameState, entries: readonly ChronicleEntry[]): void {
      const worthy = noticeworthy(entries);
      const entry = worthy.at(-1);
      if (entry === undefined) return;
      // Bounded search: the tick's entries were just pushed, so the index is
      // near the end. `indexOf` on reference equality finds the same position
      // `renderYear` will use.
      const from = Math.max(0, state.chronicle.length - entries.length - 2);
      const at = state.chronicle.indexOf(entry, from);
      band.textContent = renderEntry(entry, state.rng, at < 0 ? 0 : at);
      band.hidden = false;
      if (timer !== 0) clearTimeout(timer);
      // Real time, and cut hard rather than faded: §11.4 allows an affordance
      // to use the wall clock only if it has a defined state at every instant
      // and survives a jump of the game's own clock. Hidden or shown does.
      timer = window.setTimeout(clear, TIME.NOTICE_MS);
    },
  };
}
