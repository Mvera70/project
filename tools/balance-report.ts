// M-12: observational measurements of the real M-10 engine, design.md §12.9.
import { mkdirSync, writeFileSync } from 'node:fs';
import { CROSSROADS, TIME } from '../src/engine/balance';
import { CATALOG } from '../src/engine/crossroads/catalog/index';
import { eligible } from '../src/engine/crossroads/select';
import { applyEffect } from '../src/engine/crossroads/resolve';
import { foundGame } from '../src/engine/found';
import { population } from '../src/engine/people/demography';
import { run } from '../src/engine/sim';
import { TERRAIN_CODE } from '../src/engine/state';
import type { GameState } from '../src/engine/state';

// v2.13: `prudent` first, because it is the reference §12.9 measures its bands
// with. The other three are bounds reported beside it.
export const POLICIES = ['prudent', 'first', 'last', 'worst'] as const;
export type BenchPolicy = typeof POLICIES[number];
const YEARS = 200;
const SEEDS = 60;
const GENERATION = TIME.GENERATION_YEARS * TIME.WEEKS_PER_YEAR;
const FOREST_TEMPLATES = new Set(['forest_cut', 'wolf_winter']);
/**
 * How often the eligibility probe runs. Eligibility is a fraction over
 * hundreds of thousands of ticks and does not move in the third decimal for
 * being sampled; running `eligible()` over the whole catalogue on every tick of
 * every trial was the single most expensive thing in the bench and pushed it
 * past the five minutes of §14.2.
 */
const PROBE_EVERY = 8;
/** A village this small is not living, it is taking a long time to die (§5.2). */
const DYING_BELOW = 6;

export interface Sample {
  policy: BenchPolicy;
  seed: number;
  scenario: 'base' | 'shock';
  tick: number;
  population: number;
  grain: number;
  morale: number;
  buildings: number;
  ended: boolean;
}

export interface Trial {
  policy: BenchPolicy;
  seed: number;
  ticks: number;
  extinct: boolean;
  peak: number;
  generationOne: number;
  fullMap: boolean;
  forestRatio: number | null;
  cadence: number;
  allCadence: number;
  ceilingIntervals: number;
  intervals: number;
  eligibleTicks: Record<string, number>;
  posedByTemplate: Record<string, number>;
  allowedByTemplate: Record<string, number>;
  invalid: string[];
  geometry: string[];
  probes: number;
  longestDwindlingTicks: number;
  deathsByCause: Record<string, number>;
  shocked: boolean;
  shockExtinct: boolean;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) throw new Error('Cannot take the median of an empty sample');
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : sorted[mid] ?? 0;
}

function forest(state: GameState): number {
  return state.map.terrain.reduce((n, cell) => n + Number(cell === TERRAIN_CODE.forest), 0);
}

function sample(state: GameState, policy: BenchPolicy, scenario: Sample['scenario']): Sample {
  return { policy, seed: state.seed, scenario, tick: state.tick, population: population(state),
    grain: state.village.grain, morale: state.village.morale,
    buildings: state.buildings.filter((b) => b.lostTick === null).length,
    ended: state.ended !== null };
}

/**
 * M-14 geometry, checked on the live engine rather than on a hand-built state:
 * no two standing buildings or open works share a cell, and nothing stands on
 * water or marsh (§7.4). An upgrade legitimately covers its own source's plot,
 * so its work is measured against everything except that building.
 */
function checkGeometry(state: GameState, failures: string[]): void {
  const owner = new Map<number, string>();
  const boxes: { what: string; x: number; y: number; w: number; h: number; skip: number | null }[] = [
    ...state.buildings.filter((b) => b.lostTick === null)
      .map((b) => ({ what: `${b.kind}#${b.id}`, x: b.x, y: b.y, w: b.w, h: b.h, skip: b.id })),
    ...state.works.map((w) => ({ what: `work ${w.kind}#${w.id}`, x: w.x, y: w.y, w: w.w, h: w.h, skip: w.upgradeOf })),
  ];
  for (const box of boxes) {
    for (let y = box.y; y < box.y + box.h; y += 1) {
      for (let x = box.x; x < box.x + box.w; x += 1) {
        const cell = y * state.map.width + x;
        const held = owner.get(cell);
        const source = box.skip === null ? null : `#${box.skip}`;
        if (held !== undefined && (source === null || !held.endsWith(source))) {
          if (!failures.some((f) => f.startsWith('overlap'))) {
            failures.push(`overlap: ${box.what} over ${held}, tick ${state.tick}`);
          }
        }
        if (held === undefined || box.skip === null) owner.set(cell, box.what);
        const terrain = state.map.terrain[cell];
        if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.marsh) {
          if (!failures.some((f) => f.startsWith('unbuildable'))) {
            failures.push(`unbuildable ground: ${box.what} at ${x},${y}, tick ${state.tick}`);
          }
        }
      }
    }
  }
}

// Return at most the first occurrence of each invalid statistic per trial.
function checkRanges(state: GameState, failures: string[]): void {
  for (const [key, value] of Object.entries(state.village)) {
    if (!Number.isFinite(value) || value < 0 || ((key === 'morale' || key === 'faith') && value > 100)) {
      const description = `${key} out of range`;
      if (!failures.some((f) => f.startsWith(description))) failures.push(`${description}: ${value}, tick ${state.tick}`);
    }
  }
  for (const v of state.people.villagers) {
    for (const value of Object.values(v.opinions)) {
      if (!Number.isFinite(value) || value < -100 || value > 100) {
        if (!failures.some((f) => f.startsWith('opinion'))) failures.push(`opinion out of range: ${value}, tick ${state.tick}`);
      }
    }
  }
}

function trial(seed: number, policy: BenchPolicy, samples: Sample[]): Trial {
  const state = foundGame(seed);
  const initialForest = forest(state);
  const result: Trial = { policy, seed, ticks: 0, extinct: false, peak: population(state),
    generationOne: 0, fullMap: false, forestRatio: null, cadence: 0, allCadence: 0,
    ceilingIntervals: 0, intervals: 0, eligibleTicks: Object.fromEntries(CATALOG.map((t) => [t.id, 0])),
    posedByTemplate: Object.fromEntries(CATALOG.map((t) => [t.id, 0])), allowedByTemplate: {},
    invalid: [], geometry: [], probes: 0, longestDwindlingTicks: 0, deathsByCause: {},
    shocked: false, shockExtinct: false };
  let shock: GameState | null = null;
  let counted = 0;
  let allCounted = 0;
  let previousPosed: number | null = null;
  samples.push(sample(state, policy, 'base'));
  checkRanges(state, result.invalid);
  checkGeometry(state, result.geometry);
  while (state.tick < YEARS * TIME.WEEKS_PER_YEAR && state.ended === null) {
    // eligible only mutates rng.cast; copying the RNG keeps instrumentation
    // from consuming any of the game's streams. This is a start-of-tick probe,
    // before ANNUAL/DECISION, not a claim to observe the internal step 15.
    if (state.tick % PROBE_EVERY === 0) {
      result.probes += 1;
      for (const candidate of eligible({ ...state, rng: { ...state.rng } }, CATALOG)) {
        const id = candidate.template.id;
        result.eligibleTicks[id] = (result.eligibleTicks[id] ?? 0) + 1;
      }
    }
    const report = run(state, 1, policy, CATALOG)[0];
    if (report === undefined) throw new Error('Live simulation did not advance');
    // Where the deaths come from, so that an extinction rate above its band can
    // be attributed rather than guessed at.
    for (const death of report.deaths) {
      result.deathsByCause[death.cause] = (result.deathsByCause[death.cause] ?? 0) + 1;
    }
    if (report.posed !== null) {
      allCounted += 1;
      result.posedByTemplate[report.posed] = (result.posedByTemplate[report.posed] ?? 0) + 1;
      if (!FOREST_TEMPLATES.has(report.posed)) counted += 1;
      if (previousPosed !== null) {
        result.intervals += 1;
        // Selection measures from the preceding decision, one tick after pose.
        if (state.tick - previousPosed === CROSSROADS.MIN_TICKS_BETWEEN + 1) result.ceilingIntervals += 1;
      }
      previousPosed = state.tick;
    }
    result.peak = Math.max(result.peak, population(state));
    // §5.7, v2.17: measure the longest consecutive spell, because the
    // abandonment clock correctly resets whenever the village recovers.
    if (state.dwindlingSince !== null) {
      result.longestDwindlingTicks = Math.max(
        result.longestDwindlingTicks,
        state.tick - state.dwindlingSince,
      );
    }
    checkRanges(state, result.invalid);
    if (state.tick === GENERATION) result.generationOne = population(state);
    if (state.tick < 120 * TIME.WEEKS_PER_YEAR) {
      const standing = state.buildings.filter((b) => b.lostTick === null);
      result.fullMap ||= standing.filter((b) => b.kind === 'field').length >= 8 &&
        standing.filter((b) => b.kind === 'house' || b.kind === 'stone_house').length >= 16;
    }
    if (state.tick === 100 * TIME.WEEKS_PER_YEAR) result.forestRatio = forest(state) / initialForest;
    if (state.tick % TIME.WEEKS_PER_YEAR === 0 || state.ended !== null) {
      samples.push(sample(state, policy, 'base'));
      checkGeometry(state, result.geometry);
    }
    if (state.tick === 40 * TIME.WEEKS_PER_YEAR && state.ended === null) {
      shock = structuredClone(state);
      result.shocked = true;
      applyEffect(shock, {}, { k: 'kill', who: 'random', count: 'fraction', fraction: 0.9 },
        { templateId: 'balance_shock', optionId: 'shock', killed: [], arrived: [], seedsPlanted: [], build: [], destroy: [], visible: [] });
      samples.push(sample(shock, policy, 'shock'));
    }
  }
  result.ticks = state.tick;
  result.extinct = state.ended !== null;
  for (const template of CATALOG) {
    const exposure = Math.max(0, state.tick - (template.minYear ?? 0) * TIME.WEEKS_PER_YEAR);
    // A theoretical upper bound from the template's rest alone; deliberately
    // ignores conditions, global spacing and decisions. Reserve is separate.
    result.allowedByTemplate[template.id] = template.id === 'quiet_years' ? 0 : Math.min(
      template.maxPerGame ?? Number.POSITIVE_INFINITY,
      template.cooldownYears > 0 ? Math.ceil(exposure / (template.cooldownYears * TIME.WEEKS_PER_YEAR)) : exposure,
    );
  }
  // Exposure stops at extinction; empty centuries must not dilute cadence.
  result.cadence = counted / (state.tick / GENERATION);
  result.allCadence = allCounted / (state.tick / GENERATION);
  if (shock !== null) {
    while (shock.tick < YEARS * TIME.WEEKS_PER_YEAR && shock.ended === null) {
      run(shock, 1, policy, CATALOG);
      checkRanges(shock, result.invalid);
      if (shock.tick % TIME.WEEKS_PER_YEAR === 0 || shock.ended !== null) samples.push(sample(shock, policy, 'shock'));
    }
    result.shockExtinct = shock.ended !== null;
  }
  return result;
}

export interface PolicySummary {
  policy: BenchPolicy;
  extinction: number;
  medianPeak: number;
  medianGenerationOne: number;
  fullMap: number;
  cadence: number;
  maxCadence: number;
  allCadence: number;
  ceilingFraction: number;
  shockTrials: number;
  shockExtinction: number | null;
  invalidCases: number;
  geometryCases: number;
  maxYearsDying: number;
  medianYearsDying: number;
  /** Trials that reached year 100, and how many of them kept 40-70% of the wood. */
  forestTrials: number;
  forestInBand: number;
  medianForestRatio: number | null;
  deathsByCause: Record<string, number>;
  eligibility: Record<string, number>;
  restUtilization: Record<string, number | null>;
}

export function summarize(trials: readonly Trial[], policy: BenchPolicy): PolicySummary {
  const group = trials.filter((t) => t.policy === policy);
  const total = (get: (t: Trial) => number): number => group.reduce((n, t) => n + get(t), 0);
  const shocked = group.filter((t) => t.shocked);
  return { policy, extinction: total((t) => Number(t.extinct)) / group.length,
    medianPeak: median(group.map((t) => t.peak)), medianGenerationOne: median(group.map((t) => t.generationOne)),
    fullMap: total((t) => Number(t.fullMap)) / group.length,
    cadence: total((t) => t.cadence) / group.length, maxCadence: Math.max(...group.map((t) => t.cadence)),
    allCadence: total((t) => t.allCadence) / group.length,
    ceilingFraction: total((t) => t.ceilingIntervals) / Math.max(1, total((t) => t.intervals)),
    shockTrials: shocked.length,
    shockExtinction: shocked.length === 0 ? null : shocked.filter((t) => t.shockExtinct).length / shocked.length,
    invalidCases: total((t) => t.invalid.length),
    geometryCases: total((t) => t.geometry.length),
    // Only the games that actually died: a survivor never had a deathbed.
    maxYearsDying: Math.max(0, ...group.filter((t) => t.extinct)
      .map((t) => t.longestDwindlingTicks / TIME.WEEKS_PER_YEAR)),
    medianYearsDying: median([0, ...group.filter((t) => t.extinct)
      .map((t) => t.longestDwindlingTicks / TIME.WEEKS_PER_YEAR)]),
    // §12.9's forest row, live since M-15. Only games that reached year 100
    // have a reading: a valley nobody lived in kept its wood for other reasons.
    forestTrials: group.filter((t) => t.forestRatio !== null).length,
    forestInBand: group.filter((t) => t.forestRatio !== null &&
      (t.forestRatio as number) >= 0.4 && (t.forestRatio as number) <= 0.7).length,
    medianForestRatio: group.some((t) => t.forestRatio !== null)
      ? median(group.filter((t) => t.forestRatio !== null).map((t) => t.forestRatio as number))
      : null,
    deathsByCause: group.reduce<Record<string, number>>((acc, t) => {
      for (const [cause, n] of Object.entries(t.deathsByCause)) acc[cause] = (acc[cause] ?? 0) + n;
      return acc;
    }, {}),
    // Sampled every PROBE_EVERY ticks, so the denominator is the probes taken.
    eligibility: Object.fromEntries(CATALOG.map((template) => [template.id,
      total((t) => t.eligibleTicks[template.id] ?? 0) / Math.max(1, total((t) => t.probes))])),
    restUtilization: Object.fromEntries(CATALOG.map((template) => {
      const allowed = total((t) => t.allowedByTemplate[template.id] ?? 0);
      return [template.id, allowed === 0 ? null : total((t) => t.posedByTemplate[template.id] ?? 0) / allowed];
    })) };
}

export function runBalance(): { trials: Trial[]; summaries: PolicySummary[]; durationMs: number } {
  const started = performance.now();
  const samples: Sample[] = [];
  const trials: Trial[] = [];
  for (const policy of POLICIES) {
    for (let seed = 0; seed < SEEDS; seed += 1) trials.push(trial(seed, policy, samples));
    console.info(`M-12: ${policy}, ${SEEDS} seeds completed`);
  }
  const summaries = POLICIES.map((policy) => summarize(trials, policy));
  mkdirSync('artifacts', { recursive: true });
  const columns: (keyof Sample)[] = ['policy', 'seed', 'scenario', 'tick', 'population', 'grain', 'morale', 'buildings', 'ended'];
  writeFileSync('artifacts/balance.csv', [columns.join(','), ...samples.map((row) => columns.map((key) => row[key]).join(','))].join('\n') + '\n');
  const durationMs = performance.now() - started;
  writeFileSync('artifacts/balance-summary.json', JSON.stringify({ durationMs, summaries, trials }, null, 2) + '\n');
  console.table(summaries.map((summary) => Object.fromEntries(Object.entries(summary)
    .filter(([key]) => key !== 'eligibility' && key !== 'restUtilization' && key !== 'deathsByCause'))));
  console.info(`Eligibility sampled every ${PROBE_EVERY} ticks; longest consecutive spell below ${DYING_BELOW} measured as dying.`);
  console.info('Deaths by cause:');
  console.table(summaries.map((s) => ({ policy: s.policy, ...s.deathsByCause })));
  console.table(CATALOG.map((t) => ({ template: t.id, ...Object.fromEntries(summaries.map((s) => [s.policy, s.eligibility[t.id]])) })));
  console.info('Posed / theoretical maximum from template rest (reserve excluded):');
  console.table(CATALOG.filter((t) => t.id !== 'quiet_years').map((t) => ({ template: t.id,
    ...Object.fromEntries(summaries.map((s) => [s.policy, s.restUtilization[t.id]])) })));
  console.info('quiet_years is the guarantee reserve; raw counts are in the per-seed JSON.');
  const band = (policy: BenchPolicy): number =>
    summaries.find((s) => s.policy === policy)?.extinction ?? Number.NaN;
  console.info(`Extinction spread, worst - prudent: ${((band('worst') - band('prudent')) * 100).toFixed(1)} points (§12.9: >= 20)`);

  for (const summary of summaries) {
    console.info(`${summary.policy}: forest 40-70% at year 100 in ${summary.forestInBand}/${summary.forestTrials} trials that got there (median ${summary.medianForestRatio === null ? 'n/a' : (100 * summary.medianForestRatio).toFixed(1) + '%'})`);
  }
  console.info(`Series: artifacts/balance.csv; raw trials: artifacts/balance-summary.json; runtime ${(durationMs / 1000).toFixed(2)}s`);
  return { trials, summaries, durationMs };
}
