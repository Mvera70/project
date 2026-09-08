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
/** Where "early" ends and "late" begins, for the per-category split (v2.44). */
const HALFWAY_TICK = 100 * TIME.WEEKS_PER_YEAR;
/**
 * How long after a hard decision the population is checked again (v2.44).
 * Long enough to let a spent harvest or a burnt field actually starve someone
 * — the harvest penalty alone can run a year and the field stays gone for
 * years after — short enough that it is still that decision being measured
 * and not the rest of the game.
 */
const LOSS_WINDOW_TICKS = 5 * TIME.WEEKS_PER_YEAR;
/** An option only counts as "hard" if it can cost the village people directly. */
const HARD_EFFECT_KINDS = new Set(['kill', 'destroy', 'harvest']);
function isHardOption(templateId: string, optionId: string): boolean {
  const option = CATALOG.find((t) => t.id === templateId)?.options.find((o) => o.id === optionId);
  return option !== undefined && option.effects.some((e) => HARD_EFFECT_KINDS.has(e.k));
}

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
  /** `template:option` -> times chosen. §12.9, v2.22: a policy trapped
   * answering the same question over and over is not measuring the
   * catalogue, it is measuring the trap. */
  decisionsByOption: Record<string, number>;
  decisions: number;
  /** Category appearances split at year 100 (v2.44): whether `story`'s late-game
   * suppressors leave `lord`/`stranger` mute in the second half. */
  posedByCategoryEarly: Record<string, number>;
  posedByCategoryLate: Record<string, number>;
  /** Population lost per hard option `worst` takes, measured 5 years out
   * (v2.44) — the table the contract campaign was for. */
  hardOptionLoss: Record<string, { totalLoss: number; occurrences: number }>;
  /** Fields standing when the trial stops, and whether that was year 200
   * (v2.45's capacity experiment) or an earlier ending. */
  fieldsAtEnd: number;
  reachedHorizon: boolean;
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
    decisionsByOption: {}, decisions: 0,
    posedByCategoryEarly: {}, posedByCategoryLate: {}, hardOptionLoss: {},
    fieldsAtEnd: 0, reachedHorizon: false,
    invalid: [], geometry: [], probes: 0, longestDwindlingTicks: 0, deathsByCause: {},
    shocked: false, shockExtinct: false };
  let shock: GameState | null = null;
  let counted = 0;
  let allCounted = 0;
  let previousPosed: number | null = null;
  // §12.9, v2.44: only `worst` is asked whether its hard options bit. Pending
  // checks wait out LOSS_WINDOW_TICKS before they are charged against the
  // population they found at the moment of the decision.
  let pendingLoss: { optionKey: string; popBefore: number; dueTick: number }[] = [];
  const settleLoss = (tick: number, popNow: number, force: boolean): void => {
    const [due, notYet] = [
      pendingLoss.filter((p) => force || tick >= p.dueTick),
      pendingLoss.filter((p) => !force && tick < p.dueTick),
    ];
    for (const p of due) {
      const entry = result.hardOptionLoss[p.optionKey] ?? { totalLoss: 0, occurrences: 0 };
      entry.totalLoss += Math.max(0, p.popBefore - popNow);
      entry.occurrences += 1;
      result.hardOptionLoss[p.optionKey] = entry;
    }
    pendingLoss = notYet;
  };
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
    const popBeforeTick = population(state);
    const report = run(state, 1, policy, CATALOG)[0];
    if (report === undefined) throw new Error('Live simulation did not advance');
    // Where the deaths come from, so that an extinction rate above its band can
    // be attributed rather than guessed at.
    for (const death of report.deaths) {
      result.deathsByCause[death.cause] = (result.deathsByCause[death.cause] ?? 0) + 1;
    }
    if (report.decided !== null) {
      const key = `${report.decided.templateId}:${report.decided.optionId}`;
      result.decisionsByOption[key] = (result.decisionsByOption[key] ?? 0) + 1;
      result.decisions += 1;
      if (policy === 'worst' && isHardOption(report.decided.templateId, report.decided.optionId)) {
        pendingLoss.push({ optionKey: key, popBefore: popBeforeTick, dueTick: state.tick + LOSS_WINDOW_TICKS });
      }
    }
    if (report.posed !== null) {
      allCounted += 1;
      result.posedByTemplate[report.posed] = (result.posedByTemplate[report.posed] ?? 0) + 1;
      if (!FOREST_TEMPLATES.has(report.posed)) counted += 1;
      const category = CATALOG.find((t) => t.id === report.posed)?.category;
      if (category !== undefined) {
        const half = state.tick < HALFWAY_TICK ? result.posedByCategoryEarly : result.posedByCategoryLate;
        half[category] = (half[category] ?? 0) + 1;
      }
      if (previousPosed !== null) {
        result.intervals += 1;
        // Selection measures from the preceding decision, one tick after pose.
        if (state.tick - previousPosed === CROSSROADS.MIN_TICKS_BETWEEN + 1) result.ceilingIntervals += 1;
      }
      previousPosed = state.tick;
    }
    result.peak = Math.max(result.peak, population(state));
    if (policy === 'worst' && pendingLoss.length > 0) settleLoss(state.tick, population(state), false);
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
        { templateId: 'balance_shock', optionId: 'shock', killed: [], left: [], arrived: [], seedsPlanted: [], build: [], destroy: [], fell: [], visible: [] });
      samples.push(sample(shock, policy, 'shock'));
    }
  }
  // Whatever the game ended before its window closed settles now, against
  // whatever population the ending left — zero, for the three ways of losing.
  if (policy === 'worst') settleLoss(state.tick, population(state), true);
  // v2.45: fields standing wherever the trial actually stops. A game that
  // ended early stopped being about capacity the moment it ended; recorded
  // anyway, with `reachedHorizon` saying whether it is the year-200 reading
  // or an earlier one.
  result.fieldsAtEnd = state.buildings.filter((b) => b.kind === 'field' && b.lostTick === null).length;
  result.reachedHorizon = state.tick >= YEARS * TIME.WEEKS_PER_YEAR;
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
  /** §12.9, v2.22: the single option that ate the largest share of this
   * policy's decisions, and what share that was. */
  busiestOption: string | null;
  busiestOptionShare: number;
  /** Category appearances split at year 100 (v2.44). */
  categoryEarly: Record<string, number>;
  categoryLate: Record<string, number>;
  /** Average population lost 5 years after `worst` takes a hard option
   * (v2.44), and how many times each was actually taken. */
  hardOptionLoss: Record<string, { average: number; occurrences: number }>;
  /** Fields standing at the end, median over all trials, and how many of
   * those trials actually reached year 200 rather than ending early (v2.45). */
  medianFieldsAtEnd: number;
  reachedHorizonTrials: number;
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
    ...(() => {
      const byOption = group.reduce<Record<string, number>>((acc, t) => {
        for (const [key, n] of Object.entries(t.decisionsByOption)) acc[key] = (acc[key] ?? 0) + n;
        return acc;
      }, {});
      const decisions = total((t) => t.decisions);
      let busiestOption: string | null = null;
      let busiest = 0;
      for (const [key, n] of Object.entries(byOption)) {
        if (n > busiest) { busiest = n; busiestOption = key; }
      }
      return {
        busiestOption,
        busiestOptionShare: decisions === 0 ? 0 : busiest / decisions,
      };
    })(),
    // Sampled every PROBE_EVERY ticks, so the denominator is the probes taken.
    eligibility: Object.fromEntries(CATALOG.map((template) => [template.id,
      total((t) => t.eligibleTicks[template.id] ?? 0) / Math.max(1, total((t) => t.probes))])),
    restUtilization: Object.fromEntries(CATALOG.map((template) => {
      const allowed = total((t) => t.allowedByTemplate[template.id] ?? 0);
      return [template.id, allowed === 0 ? null : total((t) => t.posedByTemplate[template.id] ?? 0) / allowed];
    })),
    categoryEarly: group.reduce<Record<string, number>>((acc, t) => {
      for (const [c, n] of Object.entries(t.posedByCategoryEarly)) acc[c] = (acc[c] ?? 0) + n;
      return acc;
    }, {}),
    categoryLate: group.reduce<Record<string, number>>((acc, t) => {
      for (const [c, n] of Object.entries(t.posedByCategoryLate)) acc[c] = (acc[c] ?? 0) + n;
      return acc;
    }, {}),
    hardOptionLoss: (() => {
      const combined: Record<string, { totalLoss: number; occurrences: number }> = {};
      for (const t of group) {
        for (const [key, v] of Object.entries(t.hardOptionLoss)) {
          const entry = combined[key] ?? { totalLoss: 0, occurrences: 0 };
          entry.totalLoss += v.totalLoss;
          entry.occurrences += v.occurrences;
          combined[key] = entry;
        }
      }
      return Object.fromEntries(Object.entries(combined).map(([key, v]) =>
        [key, { average: v.occurrences === 0 ? 0 : v.totalLoss / v.occurrences, occurrences: v.occurrences }]));
    })(),
    medianFieldsAtEnd: median(group.map((t) => t.fieldsAtEnd)),
    reachedHorizonTrials: group.filter((t) => t.reachedHorizon).length };
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
    console.info(`${summary.policy}: busiest option ${summary.busiestOption ?? 'n/a'} at ${(summary.busiestOptionShare * 100).toFixed(1)}% of decisions (§12.9: < 45%)`);
  }

  // v2.44: whether story's late-game suppressors leave lord/stranger mute in
  // the second half rather than merely rarer.
  console.info('Category appearances, year 0-100 vs 100-200:');
  const categories = [...new Set(summaries.flatMap((s) => [
    ...Object.keys(s.categoryEarly), ...Object.keys(s.categoryLate),
  ]))].sort();
  console.table(categories.map((c) => Object.fromEntries([
    ['category', c],
    ...summaries.flatMap((s) => [
      [`${s.policy} 0-100`, s.categoryEarly[c] ?? 0],
      [`${s.policy} 100-200`, s.categoryLate[c] ?? 0],
    ]),
  ])));

  // v2.44: the table the contract campaign was for — do worst's hard options
  // now cost population, five years out.
  const worstLoss = summaries.find((s) => s.policy === 'worst')?.hardOptionLoss ?? {};
  console.info('Population lost, 5 years after `worst` takes a hard option:');
  console.table(Object.entries(worstLoss)
    .sort((a, b) => b[1].average - a[1].average)
    .map(([option, v]) => ({ option, 'avg. lost': v.average.toFixed(2), occurrences: v.occurrences })));

  // v2.45: the capacity experiment's own dependent variable.
  console.info('Fields standing where each trial stops (median), and how many reached year 200:');
  console.table(summaries.map((s) => ({
    policy: s.policy, medianFieldsAtEnd: s.medianFieldsAtEnd, reachedYear200: `${s.reachedHorizonTrials}/${SEEDS}`,
  })));

  for (const summary of summaries) {
    console.info(`${summary.policy}: forest 40-70% at year 100 in ${summary.forestInBand}/${summary.forestTrials} trials that got there (median ${summary.medianForestRatio === null ? 'n/a' : (100 * summary.medianForestRatio).toFixed(1) + '%'})`);
  }
  console.info(`Series: artifacts/balance.csv; raw trials: artifacts/balance-summary.json; runtime ${(durationMs / 1000).toFixed(2)}s`);
  return { trials, summaries, durationMs };
}
