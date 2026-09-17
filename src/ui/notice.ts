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

/**
 * VZ-02 · **la frase de este tick, o nada.** Ya no monta nada ni mide tiempo:
 * quien la lee es el hueco de la voz de la bandeja (`voice.ts`, `shell.ts`),
 * que es el único sitio desde el que el valle habla. Antes este módulo tenía su
 * propia banda `position: absolute`, su `setTimeout` y su piel —un cartón
 * oscuro sobre el prado— y las tres cosas sobraban desde UI-V2, cuando la
 * bandeja pasó a poner la frase en tinta sobre su papel.
 *
 * La línea la compone `renderEntry` con la posición de la entrada en la crónica
 * como discriminante, la misma que usa `renderYear`, para que la frase que se
 * lee aquí y la que se lee luego en la crónica sean **la misma frase** (§9.1:
 * desplazar la crónica no puede reescribir el pasado de la aldea).
 */
export function noticeText(state: GameState, entries: readonly ChronicleEntry[]): string | null {
  const entry = noticeworthy(entries).at(-1);
  if (entry === undefined) return null;
  // Búsqueda acotada: las entradas de este tick se acaban de empujar, así que
  // el índice está cerca del final. `indexOf` por identidad encuentra la misma
  // posición que `renderYear` va a usar.
  const from = Math.max(0, state.chronicle.length - entries.length - 2);
  const at = state.chronicle.indexOf(entry, from);
  return renderEntry(entry, state.rng, at < 0 ? 0 : at);
}
