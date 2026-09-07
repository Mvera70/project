#!/usr/bin/env tsx
/**
 * M-13 · The ASCII dump of §17: "un volcado del mapa por consola se reconoce
 * como un valle con río".
 *
 *   npm run map -- --seed 7 --years 0
 *
 * With `--years n` the village is run first, so the buildings show up on the
 * terrain M-14 put them on. This is the only way to look at the valley until
 * M-19 takes screenshots, and it is a tool, not part of the engine.
 */
import { CATALOG } from '../src/engine/crossroads/catalog/index';
import { foundGame } from '../src/engine/found';
import { population } from '../src/engine/people/demography';
import { run } from '../src/engine/sim';
import { TERRAIN_CODE } from '../src/engine/state';
import type { BuildingKind, GameState } from '../src/engine/state';
import type { Policy } from '../src/engine/sim';
import { TIME } from '../src/engine/balance';

const TERRAIN: Record<number, string> = {
  [TERRAIN_CODE.meadow]: '.',
  [TERRAIN_CODE.forest]: '#',
  [TERRAIN_CODE.water]: '~',
  [TERRAIN_CODE.rock]: '^',
  [TERRAIN_CODE.marsh]: ',',
  [TERRAIN_CODE.cleared]: '-',
};

const GLYPH: Record<BuildingKind, string> = {
  house: 'h', stone_house: 'H', field: 'f', granary: 'g', well: 'o',
  chapel: 'c', church: 'C', smithy: 's', mill: 'm', palisade: 'p',
  wall: 'W', grave_yard: 't', watchtower: 'T',
};

function draw(state: GameState): string[] {
  const grid: string[][] = [];
  for (let y = 0; y < state.map.height; y += 1) {
    const row: string[] = [];
    for (let x = 0; x < state.map.width; x += 1) {
      const i = y * state.map.width + x;
      row.push(state.map.ruins[i] === 1 ? 'x' : TERRAIN[state.map.terrain[i] ?? 0] ?? '?');
    }
    grid.push(row);
  }
  for (const b of state.buildings.filter((b) => b.lostTick === null)) {
    for (let y = b.y; y < b.y + b.h; y += 1) {
      for (let x = b.x; x < b.x + b.w; x += 1) {
        const row = grid[y];
        if (row !== undefined && row[x] !== undefined) row[x] = GLYPH[b.kind];
      }
    }
  }
  return grid.map((row) => row.join(''));
}

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i + 1];
  if (k?.startsWith('--') && v !== undefined) args.set(k.slice(2), v);
}
const seed = Number(args.get('seed') ?? 7);
const years = Number(args.get('years') ?? 0);

const state = foundGame(seed);
const policy = (args.get('policy') ?? 'first') as Policy;
if (years > 0) run(state, years * TIME.WEEKS_PER_YEAR, policy, CATALOG);

console.log(`\n  THE VALLEY · seed ${seed} · year ${Math.floor(state.tick / TIME.WEEKS_PER_YEAR)}\n`);
for (const line of draw(state)) console.log(`  ${line}`);
const counts = new Map<string, number>();
for (const b of state.buildings.filter((b) => b.lostTick === null)) {
  counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
}
console.log(`\n  . meadow  # forest  ~ water  ^ rock  , marsh  - cleared  x ruin`);
console.log(`  ${[...counts].sort().map(([k, n]) => `${GLYPH[k as BuildingKind]}=${k} ${n}`).join('  ')}`);
console.log(`  ${population(state)} living.\n`);
