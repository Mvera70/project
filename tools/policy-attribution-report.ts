#!/usr/bin/env tsx
/**
 * v2.21: which choices distinguish prudent play from the adverse policies.
 *
 *   npm run policy:attribution
 *
 * Observational only. It uses the real catalogue and the same 60 seeds × 200
 * years as §12.9, then counts the decisions already recorded in GameState.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { TIME } from '../src/engine/balance';
import { CATALOG } from '../src/engine/crossroads/catalog/index';
import { foundGame } from '../src/engine/found';
import { population } from '../src/engine/people/demography';
import { run } from '../src/engine/sim';
import type { Policy } from '../src/engine/sim';

const SEEDS = 60;
const YEARS = 200;
const POLICIES = ['prudent', 'last', 'worst'] as const satisfies readonly Policy[];

interface Trial {
  policy: typeof POLICIES[number];
  seed: number;
  ticks: number;
  ended: boolean;
  finalPopulation: number;
  decisions: number;
  choices: Record<string, number>;
}

interface ChoiceRow {
  choice: string;
  [column: string]: string | number;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? 0;
}

function play(policy: Trial['policy'], seed: number): Trial {
  const state = foundGame(seed);
  run(state, YEARS * TIME.WEEKS_PER_YEAR, policy, CATALOG);
  const choices: Record<string, number> = {};
  for (const decision of state.history) {
    const key = `${decision.templateId}:${decision.optionId}`;
    choices[key] = (choices[key] ?? 0) + 1;
  }
  return {
    policy,
    seed,
    ticks: state.tick,
    ended: state.ended !== null,
    finalPopulation: population(state),
    decisions: state.history.length,
    choices,
  };
}

const trials: Trial[] = [];
for (const policy of POLICIES) {
  for (let seed = 0; seed < SEEDS; seed += 1) trials.push(play(policy, seed));
  console.info(`policy attribution: ${policy}, ${SEEDS} seeds completed`);
}

const summaries = POLICIES.map((policy) => {
  const group = trials.filter((trial) => trial.policy === policy);
  const survivors = group.filter((trial) => !trial.ended);
  const generations = group.reduce((sum, trial) =>
    sum + trial.ticks / (TIME.GENERATION_YEARS * TIME.WEEKS_PER_YEAR), 0);
  const choiceCount = (choice: string): number => group.reduce((sum, trial) =>
    sum + (trial.choices[choice] ?? 0), 0);
  const succession = group.reduce((sum, trial) => sum + Object.entries(trial.choices)
    .filter(([choice]) => choice.startsWith('succession:'))
    .reduce((n, [, count]) => n + count, 0), 0);
  return {
    policy,
    ended: `${group.filter((trial) => trial.ended).length}/${group.length}`,
    decisions: group.reduce((sum, trial) => sum + trial.decisions, 0),
    decisionsPerGeneration: group.reduce((sum, trial) => sum + trial.decisions, 0) / generations,
    succession,
    noOne: choiceCount('succession:no_one'),
    chooseA: choiceCount('succession:choose_a'),
    chooseB: choiceCount('succession:choose_b'),
    medianFinalPopulationOfSurvivors: median(survivors.map((trial) => trial.finalPopulation)),
  };
});

const allChoices = [...new Set(trials.flatMap((trial) => Object.keys(trial.choices)))].sort();
const choices: ChoiceRow[] = allChoices.map((choice): ChoiceRow => ({
  choice,
  ...Object.fromEntries(POLICIES.flatMap((policy) => {
    const group = trials.filter((trial) => trial.policy === policy);
    const total = group.reduce((sum, trial) => sum + (trial.choices[choice] ?? 0), 0);
    const exposed = group.filter((trial) => (trial.choices[choice] ?? 0) > 0).length;
    return [[`${policy}.count`, total], [`${policy}.trials`, exposed]];
  })),
})).sort((a, b) => {
  const adverseA = Number(a['worst.count']) + Number(a['last.count']);
  const adverseB = Number(b['worst.count']) + Number(b['last.count']);
  return adverseB - adverseA || a.choice.localeCompare(b.choice);
});

console.info('\nPolicy summary:');
console.table(summaries);
console.info('\nChoices, ordered by adverse-policy count:');
console.table(choices);

mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/policy-attribution.json', JSON.stringify({ summaries, choices, trials }, null, 2) + '\n');
console.info('\nraw: artifacts/policy-attribution.json');
