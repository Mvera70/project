#!/usr/bin/env tsx
// Hito 0 · Three blind chronicles for a reader outside the project.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TIME } from '../src/engine/balance';
import { renderEntry } from '../src/engine/chronicle/render';
import { CATALOG } from '../src/engine/crossroads/catalog';
import { foundGame } from '../src/engine/found';
import { run } from '../src/engine/sim';
import { yearOf } from '../src/engine/time';

const SEEDS = [7, 42, 108] as const;
const YEARS = 60;
const MIN_WEIGHT = 2;

function transcript(seed: number): string {
  const state = foundGame(seed);
  run(state, YEARS * TIME.WEEKS_PER_YEAR, 'first', CATALOG);
  const lines: string[] = [];
  let currentYear = -1;
  for (const [index, entry] of state.chronicle.entries()) {
    if (entry.weight < MIN_WEIGHT) continue;
    const year = yearOf(entry.tick);
    if (year !== currentYear) {
      if (lines.length > 0) lines.push('');
      lines.push(`  — Year ${year} —`);
      currentYear = year;
    }
    lines.push(`  ${renderEntry(entry, state.rng, index)}`);
  }
  return `${lines.join('\n')}\n`;
}

const output = resolve('artifacts', 'hito-0-reader');
await mkdir(output, { recursive: true });
const labels = ['a', 'b', 'c'] as const;
for (const [index, seed] of SEEDS.entries()) {
  await writeFile(resolve(output, `chronicle-${labels[index] as string}.txt`), transcript(seed), 'utf8');
}
await writeFile(
  resolve(output, 'reader-question.txt'),
  'Read chronicle-a.txt, chronicle-b.txt and chronicle-c.txt in any order.\n\nHow do these three villages differ?\n',
  'utf8',
);
process.stdout.write(`Wrote three blind chronicles and one question to ${output}\n`);

