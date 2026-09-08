#!/usr/bin/env tsx
/**
 * Where the villages die. design.md §12.9, and the question v2.16 asks.
 *
 *   npm run attribution
 *
 * Not a threshold and not a gate: four measurements, so that whoever decides
 * which crossroad effect to touch decides it against numbers instead of against
 * a hunch. It changes nothing and asserts nothing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { CROSSROADS, MIGRATION, TIME } from '../src/engine/balance';
import { CATALOG } from '../src/engine/crossroads/catalog/index';
import { foundGame } from '../src/engine/found';
import { population } from '../src/engine/people/demography';
import { run } from '../src/engine/sim';
import type { GameState } from '../src/engine/state';

const SEEDS = 60;
const YEARS = 200;
const YEAR = TIME.WEEKS_PER_YEAR;
const LOOKBACK_YEARS = 20;
const DECIDED_AT = 40; // the year §12.9 asks about

interface Trial {
  seed: number;
  ended: null | 'extinction' | 'abandoned';
  endYear: number;
  atYear40: number | null;
  hostileTicks: number;
  ticks: number;
  lastOptions: string[]; // the decisions of the final LOOKBACK_YEARS
  deaths: Record<string, number>;
}

function hostileNow(state: GameState): boolean {
  const until = state.flags['hostile'];
  return until !== undefined && (until === 0 || until > state.tick);
}

function play(seed: number): Trial {
  const state = foundGame(seed);
  const trial: Trial = {
    seed, ended: null, endYear: 0, atYear40: null,
    hostileTicks: 0, ticks: 0, lastOptions: [], deaths: {},
  };

  while (state.tick < YEARS * YEAR && state.ended === null) {
    const report = run(state, 1, 'prudent', CATALOG)[0];
    if (report === undefined) break;
    for (const death of report.deaths) {
      trial.deaths[death.cause] = (trial.deaths[death.cause] ?? 0) + 1;
    }
    if (hostileNow(state)) trial.hostileTicks += 1;
    if (state.tick === DECIDED_AT * YEAR) trial.atYear40 = population(state);
  }

  trial.ticks = state.tick;
  trial.endYear = Math.floor(state.tick / YEAR);
  trial.ended = state.ended === null ? null : state.ended.cause;
  // A village that lived to the horizon still has a "last twenty years"; that
  // is what makes the comparison with the ones that died worth anything.
  const from = state.tick - LOOKBACK_YEARS * YEAR;
  trial.lastOptions = state.history
    .filter((d) => d.tick >= from)
    .map((d) => `${d.templateId}:${d.optionId}`);
  return trial;
}

function share(n: number, of: number): string {
  return of === 0 ? 'n/a' : `${((100 * n) / of).toFixed(1)} %`;
}

function median(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
    : (sorted[mid] as number);
}

const trials: Trial[] = [];
for (let seed = 0; seed < SEEDS; seed += 1) trials.push(play(seed));

const dead = trials.filter((t) => t.ended !== null);
const alive = trials.filter((t) => t.ended === null);
const extinct = trials.filter((t) => t.ended === 'extinction');
const abandoned = trials.filter((t) => t.ended === 'abandoned');

console.info(`\nprudent · ${SEEDS} seeds x ${YEARS} years\n`);
console.info(`ended: ${dead.length}/${SEEDS} (${share(dead.length, SEEDS)})` +
  `  — extinction ${extinct.length}, abandoned ${abandoned.length}`);
console.info(`survived to year ${YEARS}: ${alive.length}\n`);

// ---------------------------------------------------------------- (a) options
console.info(`(a) options taken in the last ${LOOKBACK_YEARS} years before the end`);
const inEndings = new Map<string, number>();
for (const t of dead) for (const o of new Set(t.lastOptions)) {
  inEndings.set(o, (inEndings.get(o) ?? 0) + 1);
}
const inSurvivals = new Map<string, number>();
for (const t of alive) for (const o of new Set(t.lastOptions)) {
  inSurvivals.set(o, (inSurvivals.get(o) ?? 0) + 1);
}
const rows = [...inEndings]
  .map(([option, n]) => ({
    option,
    endings: n,
    endingShare: n / Math.max(1, dead.length),
    survivalShare: (inSurvivals.get(option) ?? 0) / Math.max(1, alive.length),
  }))
  .sort((a, b) => b.endings - a.endings || a.option.localeCompare(b.option));
console.table(rows.slice(0, 20).map((r) => ({
  option: r.option,
  'in endings': `${r.endings}/${dead.length}`,
  'of endings': share(r.endings, dead.length),
  'of survivals': share(inSurvivals.get(r.option) ?? 0, alive.length),
  'lift': alive.length === 0 || r.survivalShare === 0
    ? 'only in endings'
    : (r.endingShare / r.survivalShare).toFixed(2),
})));

// ---------------------------------------------------------------- (b) hostile
console.info('\n(b) the `hostile` flag');
const withHostile = (xs: Trial[]): number => xs.filter((t) => t.hostileTicks > 0).length;
const meanHostileYears = (xs: Trial[]): number => {
  const had = xs.filter((t) => t.hostileTicks > 0);
  return had.length === 0 ? 0 : had.reduce((n, t) => n + t.hostileTicks, 0) / had.length / YEAR;
};
console.table([
  { group: 'ended', n: dead.length, 'ever hostile': share(withHostile(dead), dead.length),
    'mean years hostile (of those)': meanHostileYears(dead).toFixed(1) },
  { group: 'survived', n: alive.length, 'ever hostile': share(withHostile(alive), alive.length),
    'mean years hostile (of those)': meanHostileYears(alive).toFixed(1) },
]);

// ------------------------------------------------------------------ (c) deaths
console.info('\n(c) causes of death, prudent');
const causes: Record<string, number> = {};
for (const t of trials) for (const [cause, n] of Object.entries(t.deaths)) {
  causes[cause] = (causes[cause] ?? 0) + n;
}
const total = Object.values(causes).reduce((a, b) => a + b, 0);
console.table(Object.entries(causes)
  .sort((a, b) => b[1] - a[1])
  .map(([cause, n]) => ({ cause, deaths: n, share: share(n, total) })));

// ------------------------------------------------------------- (d) year forty
console.info(`\n(d) population at year ${DECIDED_AT}`);
const at40 = (xs: Trial[]): number[] =>
  xs.map((t) => t.atYear40).filter((n): n is number => n !== null);
console.table([
  { group: 'ended', reached: at40(dead).length, median: median(at40(dead)),
    min: Math.min(...at40(dead)), max: Math.max(...at40(dead)) },
  { group: 'survived', reached: at40(alive).length, median: median(at40(alive)),
    min: Math.min(...at40(alive)), max: Math.max(...at40(alive)) },
]);
console.info(`ended before year ${DECIDED_AT}: ${dead.filter((t) => t.atYear40 === null).length}`);
console.info(`ceiling between questions: ${CROSSROADS.MIN_TICKS_BETWEEN} ticks; ` +
  `abandonment below ${MIGRATION.VIABLE_POPULATION} for ${MIGRATION.ABANDON_YEARS} years`);

mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/attribution.json', JSON.stringify({ trials, rows }, null, 2) + '\n');
console.info('\nraw: artifacts/attribution.json');
