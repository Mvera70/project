#!/usr/bin/env tsx
/**
 * Runner del hito 0 — design.md §15.1.
 * M-10 lo implementa. Uso previsto:
 *   npm run chronicle -- --seed 7 --years 60 --policy first
 */
const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i + 1];
  if (k?.startsWith('--') && v !== undefined) args.set(k.slice(2), v);
}

const seed = Number(args.get('seed') ?? 7);
const years = Number(args.get('years') ?? 60);
const policy = args.get('policy') ?? 'first';

console.log(`the-valley · seed=${seed} years=${years} policy=${policy}`);
console.log('Sin implementar. Este es el entregable de M-10 (design.md §17).');
process.exitCode = 0;
