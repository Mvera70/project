#!/usr/bin/env tsx
/**
 * v2.17: isolate the one-way migration gate without changing saved balance.
 *
 *   npm run migration:ab
 *
 * Both arms run the same 60 seeds for 200 years with `prudent`. Arm B changes
 * ARRIVE_MIN_PEOPLE only for this process and the original value is restored
 * in a finally block. This is an experiment, not a balance override.
 */
import { MIGRATION, TIME } from '../src/engine/balance';
import { CATALOG } from '../src/engine/crossroads/catalog/index';
import { foundGame } from '../src/engine/found';
import { freeBeds, population } from '../src/engine/people/demography';
import { run } from '../src/engine/sim';
import type { TickReport } from '../src/engine/sim';
import type { DeathCause } from '../src/engine/state';

const SEEDS = 60;
const YEARS = 200;
const YEAR = TIME.WEEKS_PER_YEAR;
const DECADES = 3;
const DECADE_TICKS = 10 * YEAR;

interface Flow {
  births: number;
  arrivals: number;
  departures: number;
  deaths: Partial<Record<DeathCause, number>>;
}

interface Trial {
  seed: number;
  endTick: number | null;
  peak: number;
  fullMap: boolean;
  reports: TickReport[];
  gates: GateSnapshot[];
}

interface GateSnapshot {
  tick: number;
  moraleValue: number;
  people: boolean;
  morale: boolean;
  grain: boolean;
  reputation: boolean;
  beds: boolean;
}

interface Scenario {
  threshold: number;
  trials: Trial[];
}

const mutableMigration = MIGRATION as unknown as { ARRIVE_MIN_PEOPLE: number };

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? null;
}

function isFullMap(state: ReturnType<typeof foundGame>): boolean {
  const standing = state.buildings.filter((building) => building.lostTick === null);
  const fields = standing.filter((building) => building.kind === 'field').length;
  const houses = standing.filter((building) =>
    building.kind === 'house' || building.kind === 'stone_house').length;
  return fields >= 8 && houses >= 16;
}

function play(seed: number): Trial {
  const state = foundGame(seed);
  const reports: TickReport[] = [];
  const gates: GateSnapshot[] = [];
  let peak = population(state);
  let fullMap = false;

  while (state.tick < YEARS * YEAR && state.ended === null) {
    const report = run(state, 1, 'prudent', CATALOG)[0];
    if (report === undefined) throw new Error('Live simulation did not advance');
    reports.push(report);
    peak = Math.max(peak, population(state));
    if (state.tick < 120 * YEAR) fullMap ||= isFullMap(state);
    if (state.tick % YEAR === 0) {
      const people = population(state);
      const hostileUntil = state.flags['hostile'];
      const grainYears = people === 0
        ? Number.POSITIVE_INFINITY
        : state.village.grain / (people * YEAR);
      gates.push({
        tick: state.tick,
        moraleValue: state.village.morale,
        people: people >= MIGRATION.ARRIVE_MIN_PEOPLE,
        morale: state.village.morale >= MIGRATION.ARRIVE_MIN_MORALE,
        grain: grainYears >= MIGRATION.ARRIVE_MIN_GRAIN_YEARS,
        reputation: hostileUntil === undefined || (hostileUntil !== 0 && hostileUntil <= state.tick),
        beds: freeBeds(state) >= MIGRATION.ARRIVE_MIN_FREE_BEDS,
      });
    }
  }

  return { seed, endTick: state.ended === null ? null : state.tick, peak, fullMap, reports, gates };
}

function scenario(threshold: number): Scenario {
  mutableMigration.ARRIVE_MIN_PEOPLE = threshold;
  return { threshold, trials: Array.from({ length: SEEDS }, (_, seed) => play(seed)) };
}

function addReport(flow: Flow, report: TickReport): void {
  flow.births += report.births;
  flow.arrivals += report.arrived;
  flow.departures += report.left;
  for (const death of report.deaths) {
    flow.deaths[death.cause] = (flow.deaths[death.cause] ?? 0) + 1;
  }
}

function flowRows(result: Scenario): Record<string, string | number>[] {
  const ended = result.trials.filter((trial) => trial.endTick !== null);
  const causes = [...new Set(ended.flatMap((trial) =>
    trial.reports.flatMap((report) => report.deaths.map((death) => death.cause))))].sort();
  const rows: Record<string, string | number>[] = [];

  for (let decade = DECADES; decade >= 1; decade -= 1) {
    const startBeforeEnd = decade * DECADE_TICKS;
    const endBeforeEnd = (decade - 1) * DECADE_TICKS;
    const complete = ended.filter((trial) => (trial.endTick ?? 0) >= startBeforeEnd);
    const flow: Flow = { births: 0, arrivals: 0, departures: 0, deaths: {} };

    for (const trial of complete) {
      const end = trial.endTick as number;
      const from = end - startBeforeEnd;
      const to = end - endBeforeEnd;
      for (const report of trial.reports) {
        if (report.tick > from && report.tick <= to) addReport(flow, report);
      }
    }

    const divisor = Math.max(1, complete.length);
    const deaths = Object.values(flow.deaths).reduce((sum, count) => sum + (count ?? 0), 0);
    const row: Record<string, string | number> = {
      decade: `${decade * 10}-${(decade - 1) * 10} years before end`,
      villages: complete.length,
      births: flow.births / divisor,
      arrivals: flow.arrivals / divisor,
      departures: flow.departures / divisor,
      deaths: deaths / divisor,
      net: (flow.births + flow.arrivals - flow.departures - deaths) / divisor,
    };
    for (const cause of causes) row[`death.${cause}`] = (flow.deaths[cause] ?? 0) / divisor;
    rows.push(row);
  }
  return rows;
}

function gateRows(result: Scenario): Record<string, string | number>[] {
  const ended = result.trials.filter((trial) => trial.endTick !== null);
  const rows: Record<string, string | number>[] = [];
  for (let decade = DECADES; decade >= 1; decade -= 1) {
    const startBeforeEnd = decade * DECADE_TICKS;
    const endBeforeEnd = (decade - 1) * DECADE_TICKS;
    const complete = ended.filter((trial) => (trial.endTick ?? 0) >= startBeforeEnd);
    const snapshots = complete.flatMap((trial) => {
      const end = trial.endTick as number;
      const from = end - startBeforeEnd;
      const to = end - endBeforeEnd;
      return trial.gates.filter((gate) => gate.tick > from && gate.tick <= to);
    });
    const share = (gate: 'people' | 'morale' | 'grain' | 'reputation' | 'beds'): number =>
      snapshots.filter((snapshot) => snapshot[gate]).length / Math.max(1, snapshots.length);
    const moraleAtLeast = (threshold: number): number =>
      snapshots.filter((snapshot) => snapshot.moraleValue >= threshold).length /
      Math.max(1, snapshots.length);
    rows.push({
      decade: `${decade * 10}-${(decade - 1) * 10} years before end`,
      samples: snapshots.length,
      medianMorale: median(snapshots.map((snapshot) => snapshot.moraleValue)) ?? Number.NaN,
      morale30: moraleAtLeast(30),
      morale40: moraleAtLeast(40),
      morale50: moraleAtLeast(50),
      people: share('people'),
      morale: share('morale'),
      grain: share('grain'),
      reputation: share('reputation'),
      beds: share('beds'),
    });
  }
  return rows;
}

function print(result: Scenario): void {
  const ended = result.trials.filter((trial) => trial.endTick !== null);
  console.info(`\nARRIVE_MIN_PEOPLE = ${result.threshold}`);
  console.table([{
    terminated: `${ended.length}/${result.trials.length}`,
    medianPeak: median(result.trials.map((trial) => trial.peak)),
    fullMapBefore120: `${result.trials.filter((trial) => trial.fullMap).length}/${result.trials.length}`,
    medianEndYear: median(ended.map((trial) => (trial.endTick as number) / YEAR)),
  }]);
  console.info('Mean population flow per completed ten-year window among terminated villages:');
  console.table(flowRows(result));
  console.info('Share of post-annual snapshots with each arrival gate open:');
  console.table(gateRows(result));
}

const original = MIGRATION.ARRIVE_MIN_PEOPLE;
try {
  const a = scenario(8);
  print(a);
  if (!process.argv.includes('--baseline')) print(scenario(3));
} finally {
  mutableMigration.ARRIVE_MIN_PEOPLE = original;
}
