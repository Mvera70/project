// Cuánto cuesta un tick del motor, en milisegundos por semana de juego.
//
// **Existe porque un commit multiplicó el tick por 2,3 y nadie lo vio en nueve
// días** (`6fa7fda1`, 21 sep 2026): lo que se notaba era «la CI tarda», no «el
// motor es más lento», y la respuesta natural fue subir topes. Entre el 16 sep y
// el 1 oct el tick pasó de 0,78 a 8,3 ms por semana y `npm test` de unos minutos
// a 36 (docs/medidas/ci-lentitud-2026-10-02.md).
//
//   npx tsx tools/reports/tick-bench.ts                    # semillas 7, 23 y 41, 40 años
//   npx tsx tools/reports/tick-bench.ts --seeds 7,23 --years 20
//
// **El coste crece con la gente** (más rutas), así que dos medidas sólo se
// comparan con aldeas del mismo tamaño: por eso imprime los vivos al final de
// cada valle. Para comparar dos commits, el mismo guion en un `git worktree`
// de cada uno, con `node_modules` enlazado.
//
// Juega con `run` y la política prudente, como el juego (CLAUDE.md: un bucle de
// `tick` no mide este juego). Cronómetro de pared en un hilo; el resto de la
// máquina, quieto.

import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { run } from '../../src/engine/sim';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] as string : fallback;
};

const seeds = arg('seeds', '7,23,41').split(',').map(Number);
const years = Number(arg('years', '40'));

let weeks = 0;
let ms = 0;
for (const seed of seeds) {
  const state = foundGame(seed);
  const start = performance.now();
  let played = 0;
  for (let week = 0; week < TIME.WEEKS_PER_YEAR * years && state.ended === null; week += 1) {
    run(state, 1, 'prudent', CATALOG);
    played += 1;
  }
  const took = performance.now() - start;
  weeks += played;
  ms += took;
  const ended = state.ended === null ? '' : ` · acabó (${state.ended.cause})`;
  console.log(`semilla ${seed}: ${(took / played).toFixed(2)} ms/semana, ${played} semanas, `
    + `${population(state)} vivos${ended}`);
}
console.log(`\n${(ms / weeks).toFixed(2)} ms por semana de juego (${weeks} semanas, ${(ms / 1000).toFixed(1)} s)`);
