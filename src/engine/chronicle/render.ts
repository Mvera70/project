// M-09 · Composing the text. design.md §9.1, §9.2.

import { hash32 } from '../rng';
import type { RngBundle } from '../rng';
import type { ChronicleEntry, GameState } from '../state';
import { yearOf } from '../time';
import { tallyOf, yearKey } from './events';
import { BANK, CROSSROAD_BANK } from './bank.en';

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
function variantOf(b: RngBundle, key: string, tick: number, discriminant: number): string | undefined {
  // A crossroad's title and body live in the other bank, one entry each and no
  // variants (§8.1): they are the situation itself, shown once. The chronicle
  // quotes the title when it records that the question was asked, so it has to
  // be able to reach them.
  const single = CROSSROAD_BANK[key];
  if (single !== undefined) return single;

  const variants = BANK[key];
  if (variants === undefined || variants.length === 0) return undefined;
  const pickIndex = hash32(b.chronicle, `${key}:${tick}:${discriminant}`) % variants.length;
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
 * `discriminant` separates two entries that share a key and a tick — a village
 * that buries two named people in the same week should not bury them in the
 * same words. Their position in `state.chronicle` does the job (§9.1).
 *
 * A key with no entry in the bank renders as `[the.key]` rather than throwing.
 * The chronicle is what the player reads; a missing line should spoil one
 * sentence and be obvious, not take down the screen. The catalogue test of
 * M-08 is what turns that into a failure at build time.
 */
export function renderEntry(e: ChronicleEntry, b: RngBundle, discriminant = 0): string {
  const template = variantOf(b, e.templateKey, e.tick, discriminant);
  if (template === undefined) return `[${e.templateKey}]`;

  const main = capitalise(fill(template, e.params));

  // §9.4: a named death drags what the person was behind it. The subordinate
  // is a key of its own rather than a phrase built by the system that recorded
  // the death — the systems still push keys, never prose.
  const tailKey = e.params['tail'];
  if (typeof tailKey !== 'string') return main;
  const tail = variantOf(b, tailKey, e.tick, discriminant + 1);
  if (tail === undefined) return main;
  return `${main} ${capitalise(fill(tail, e.params))}`;
}

/**
 * A sentence starts with a capital.
 *
 * It has to happen here and not in the bank: a template that opens with
 * `{count}` becomes "three came over the ridge" once the number is spelled out,
 * and no amount of care writing the templates can fix that, because the same
 * hole is mid-sentence in another line.
 */
function capitalise(text: string): string {
  return text.length === 0 ? text : text[0]?.toUpperCase() + text.slice(1);
}

/**
 * A year of the chronicle, in the order it happened.
 *
 * §9.2: the screen shows weights 2 and 3 by default, and weight 1 — ordinary
 * births and deaths, the turn of the seasons — only when a year is opened up.
 * **Every dump goes through here**, which is what makes the filter something
 * the chronicle has rather than something each caller remembers to apply.
 *
 * Entries of the same family are aggregated into one line with a count, in the
 * position of the first of them. Without it a year of building buries the
 * plague, the decision and the dead that happened alongside it: twenty-one
 * lengths of palisade are one line, not twenty-one.
 *
 * A family with only one entry that year is left exactly as it was — "a child
 * was born that spring" is a better sentence than "one child was born that
 * year", and it is also the truth about when it happened.
 */
export function renderYear(state: GameState, year: number, minWeight: 1 | 2 | 3 = 2): string[] {
  // The discriminant is the entry's place in the chronicle, so that two deaths
  // of the same kind in the same week do not come out word for word identical.
  const inYear = state.chronicle
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => yearOf(e.tick) === year && e.weight >= minWeight)
    .sort((a, b) => a.e.tick - b.e.tick || a.i - b.i);

  interface Group { entries: number; total: number; at: number }
  const groups = new Map<string, Group>();
  for (const { e, i } of inYear) {
    const key = yearKey(e.templateKey);
    // A family the bank has no yearly line for is left alone rather than
    // rendered as `[the.key]`: a missing aggregate must cost repetition, never
    // the entries themselves.
    if (key === null || !knows(key)) continue;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, { entries: 1, total: tallyOf(e), at: i });
    else {
      group.entries += 1;
      group.total += tallyOf(e);
    }
  }

  const out: string[] = [];
  const emitted = new Set<string>();
  for (const { e, i } of inYear) {
    const key = yearKey(e.templateKey);
    const group = key === null ? undefined : groups.get(key);
    if (key === undefined || group === undefined || group.entries < 2) {
      out.push(renderEntry(e, state.rng, i));
      continue;
    }
    if (emitted.has(key as string)) continue; // swallowed by the aggregate
    emitted.add(key as string);
    out.push(renderEntry(
      { ...e, templateKey: key as string, params: { ...e.params, count: group.total } },
      state.rng,
      group.at,
    ));
  }
  return out;
}

/** Every key the bank knows. M-08's catalogue test checks its keys against it. */
export function bankKeys(): string[] {
  return Object.keys(BANK).sort();
}

/** Whether either bank can render a key at all. */
export function knows(key: string): boolean {
  return (BANK[key]?.length ?? 0) > 0 || CROSSROAD_BANK[key] !== undefined;
}
