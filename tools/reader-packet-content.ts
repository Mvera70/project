// Hito 0 · Pure content of the blind packet. The writer lives beside this file.

import { TIME } from '../src/engine/balance';
import { renderEntry } from '../src/engine/chronicle/render';
import { CATALOG } from '../src/engine/crossroads/catalog';
import { foundGame } from '../src/engine/found';
import { run } from '../src/engine/sim';
import { yearOf } from '../src/engine/time';

const SEEDS = [7, 42, 108] as const;
const YEARS = 60;
const MIN_WEIGHT = 2;

export interface ReaderFile {
  name: string;
  content: string;
}

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

/** The exact four files handed to the outside reader, with no run metadata. */
export function buildReaderPacket(): ReaderFile[] {
  const labels = ['a', 'b', 'c'] as const;
  const chronicles = SEEDS.map((seed, index) => ({
    name: `chronicle-${labels[index] as string}.txt`,
    content: transcript(seed),
  }));
  return [...chronicles, {
    name: 'reader-question.txt',
    content: 'Read chronicle-a.txt, chronicle-b.txt and chronicle-c.txt in any order.\n\nHow do these three villages differ?\n',
  }];
}
