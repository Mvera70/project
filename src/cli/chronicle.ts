#!/usr/bin/env tsx
/**
 * M-10 · The milestone-0 runner. design.md §15.1, §9.5.
 *
 *   npm run chronicle -- --seed 7 --years 60 --policy first
 *
 * Founds a village, runs it, and prints its chronicle. The console lives here
 * and nowhere else: `tick` writes nothing (§17 M-10), which is what lets the
 * same loop drive the CLI, the tests and the lethargy of §13.2.
 *
 * The whole point of §9.5 is that somebody outside the project reads three of
 * these and can say how they differ. So the output is the chronicle and almost
 * nothing else — no tables, no statistics, no commentary from the runner.
 */
import { CATALOG } from '../engine/crossroads/catalog/index';
import { foundGame } from '../engine/found';
import { population } from '../engine/people/demography';
import { renderEntry } from '../engine/chronicle/render';
import { run } from '../engine/sim';
import type { Policy } from '../engine/sim';
import { TIME } from '../engine/balance';
import { yearOf } from '../engine/time';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i + 1];
  if (k?.startsWith('--') && v !== undefined) args.set(k.slice(2), v);
}

const seed = Number(args.get('seed') ?? 7);
const years = Number(args.get('years') ?? 60);
const policyName = args.get('policy') ?? 'first';
const minWeight = Number(args.get('weight') ?? 2);

const POLICIES = new Set(['first', 'last', 'random', 'worst']);
if (!POLICIES.has(policyName)) {
  console.error(`unknown policy '${policyName}'. one of: ${[...POLICIES].join(', ')}`);
  process.exitCode = 1;
} else {
  const state = foundGame(seed);
  run(state, years * TIME.WEEKS_PER_YEAR, policyName as Policy, CATALOG);

  console.log(`\n  THE VALLEY · seed ${seed} · ${years} years · policy ${policyName}\n`);

  let year = -1;
  state.chronicle.forEach((entry, i) => {
    if (entry.weight < minWeight) return;
    const y = yearOf(entry.tick);
    if (y !== year) {
      year = y;
      console.log(`\n  — Year ${y} —`);
    }
    console.log(`  ${renderEntry(entry, state.rng, i)}`);
  });

  const alive = population(state);
  console.log(
    `\n  ${alive === 0 ? 'The valley is empty.' : `${alive} still live in the valley.`}` +
      ` ${state.history.length} decisions taken.\n`,
  );
}
