// v5.71 · El banco del tick: cuánto cuesta simular una semana y si la partida
// sigue siendo la misma. `docs/medidas/ci-lentitud-2026-10-02.md` §7–8.
//
// Juega `foundGame(seed)` con la política prudente, imprime milisegundos por
// semana y los vivos del final —el coste crece con la población, así que dos
// medidas sólo se comparan con aldeas del mismo tamaño— y un resumen de la
// crónica, la gente, los edificios, el tráfico y las sendas. Dos commits con
// los mismos resúmenes juegan la misma partida.
//
// Un cambio del motor que toque `paths.ts`, `astar.ts`, `placement.ts` o
// `works.ts` lo pasa antes y después (CLAUDE.md). Bajo `tsx` el reparto por
// función engaña (envuelve cada cierre en `__name`), pero la comparación entre
// dos commits vale; un perfil por función se toma bajo vitest.
//
//   npx tsx tools/reports/tick-bench.ts [--seeds 7,23,41] [--years 40]
//
// Para comparar con otro commit sin tocar el árbol de trabajo:
//   git worktree add --detach /tmp/antes <commit>
//   ln -s "$PWD/node_modules" /tmp/antes/node_modules
//   cp tools/reports/tick-bench.ts /tmp/antes/tools/reports/
//   (cd /tmp/antes && npx tsx tools/reports/tick-bench.ts)

import { createHash } from 'node:crypto';
import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { isHere } from '../../src/engine/people/demography';
import { run } from '../../src/engine/sim';

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

const seeds = arg('seeds', '7,23,41').split(',').map(Number);
const years = Number(arg('years', '40'));

function digest(value: unknown): string {
  const json = JSON.stringify(value, (_key, v: unknown) => (ArrayBuffer.isView(v) ? Array.from(v as Uint8Array) : v));
  return createHash('sha1').update(json).digest('hex').slice(0, 8);
}

let weeksAll = 0;
let msAll = 0;
console.log('semilla  ms/semana  vivos  crónica   gente     edificios tráfico   sendas');
for (const seed of seeds) {
  const state = foundGame(seed);
  let weeks = 0;
  const start = performance.now();
  for (let w = 0; w < TIME.WEEKS_PER_YEAR * years && state.ended === null; w += 1) {
    run(state, 1, 'prudent', CATALOG);
    weeks += 1;
  }
  const ms = performance.now() - start;
  weeksAll += weeks;
  msAll += ms;
  const alive = state.people.villagers.filter(isHere).length;
  console.log([
    String(seed).padEnd(8), (ms / weeks).toFixed(2).padStart(9), String(alive).padStart(6),
    digest(state.chronicle), digest(state.people), digest(state.buildings),
    digest(state.map.traffic), digest(state.map.path),
  ].join('  '));
}
console.log(`total    ${(msAll / weeksAll).toFixed(2).padStart(9)} ms por semana, ${years} años`);
