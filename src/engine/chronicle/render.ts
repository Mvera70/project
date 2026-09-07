// M-09 · Composing the text. design.md §9.1, §9.2.

import { hash32 } from '../rng';
import type { RngBundle } from '../rng';
import type { ChronicleEntry, GameState } from '../state';
import { yearOf } from '../time';
import { BANK } from './bank.en';

/**
 * Small counts read as words, because a chronicle says "three children" and a
 * ledger says "3 children". Past twelve the digits are less trouble than the
 * words, and a village of eighty rarely needs them.
 */
const WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const;

export function numberWord(n: number): string {
  const i = Math.round(n);
  return i >= 0 && i < WORDS.length ? (WORDS[i] as string) : String(i);
}

/**
 * Which of the variants this entry gets.
 *
 * §9.1 says the choice comes from the `chronicle` stream and never from another
 * one — the point being that composing text must not be able to displace the
 * simulation. This goes one step further and does not advance the stream at
 * all: the choice is a hash of the stream's current state together with the
 * entry's own key and tick.
 *
 * That keeps the isolation §4.3 is after and buys stability with it. The same
 * entry renders the same way every time it is shown, so scrolling the chronicle
 * away and back does not quietly reword the village's history — which it would
 * if every render consumed a draw.
 */
function variantOf(b: RngBundle, e: ChronicleEntry): string | undefined {
  const variants = BANK[e.templateKey];
  if (variants === undefined || variants.length === 0) return undefined;
  const pickIndex = hash32(b.chronicle, `${e.templateKey}:${e.tick}`) % variants.length;
  return variants[pickIndex];
}

/**
 * Fill a template's `{holes}` from the entry's parameters.
 *
 * `{count}` is spelled out; every other number is printed as it is. A parameter
 * the entry does not carry is left as its literal `{name}`, on purpose: a
 * missing parameter is a bug in whatever pushed the entry, and it should be
 * visible in the text and catchable by a test rather than silently blank.
 */
function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = params[key];
    if (value === undefined) return whole;
    if (key === 'count' && typeof value === 'number') return numberWord(value);
    return String(value);
  });
}

/**
 * One entry, as a sentence. Pure: it does not touch the state or the bundle.
 *
 * A key with no entry in the bank renders as `[the.key]` rather than throwing.
 * The chronicle is what the player reads; a missing line should spoil one
 * sentence and be obvious, not take down the screen. The catalogue test of
 * M-08 is what turns that into a failure at build time.
 */
export function renderEntry(e: ChronicleEntry, b: RngBundle): string {
  const template = variantOf(b, e);
  if (template === undefined) return `[${e.templateKey}]`;
  return fill(template, e.params);
}

/**
 * A year of the chronicle, in the order it happened.
 *
 * §9.2: the screen shows weights 2 and 3 by default, and weight 1 — ordinary
 * births and deaths, the turn of the seasons — only when a year is opened up.
 */
export function renderYear(state: GameState, year: number, minWeight: 1 | 2 | 3 = 2): string[] {
  return state.chronicle
    .filter((e) => yearOf(e.tick) === year && e.weight >= minWeight)
    .sort((a, b) => a.tick - b.tick)
    .map((e) => renderEntry(e, state.rng));
}

/** Every key the bank knows. M-08's catalogue test checks its keys against it. */
export function bankKeys(): string[] {
  return Object.keys(BANK).sort();
}

/** Whether the bank can render a key at all. */
export function knows(key: string): boolean {
  return (BANK[key]?.length ?? 0) > 0;
}
