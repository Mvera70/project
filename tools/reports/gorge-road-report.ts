// La senda de la garganta contra la malla dibujada, por semilla (2 oct 2026).
//
//   npx tsx tools/reports/gorge-road-report.ts                 # 8 semillas
//   npx tsx tools/reports/gorge-road-report.ts --seeds 7,11,23
//
// Por valle: cuántos vértices de la cinta van más de `FLOATS` celdas por
// encima del suelo que se dibuja, el peor y dónde, cuántos van por debajo, qué
// parte de los puntos de dentro de los triángulos tapa el suelo, y lo lejos que
// queda el extremo de dentro de cada cinta del camino pintado del valle. La
// medida está en `gorge-road-measure.ts`.

import { foundGame } from '../../src/engine/found';
import { FLOATS, measureGorgeRoads, summarise } from './gorge-road-measure';

const flag = process.argv.indexOf('--seeds');
const seeds = flag >= 0 && process.argv[flag + 1] !== undefined
  ? process.argv[flag + 1]!.split(',').map(Number)
  : [3, 7, 11, 23, 41, 5, 19, 31];

const fmt = (n: number, d = 2): string => n.toFixed(d);
console.log(`semilla  vértices  flotan>${FLOATS}  peor   (x, z)          bajo  tapado  empalme`);
let allFloat = 0, allCount = 0, allWorst = 0;
for (const seed of seeds) {
  const state = foundGame(seed);
  const s = summarise(measureGorgeRoads(state));
  allFloat += s.floating; allCount += s.count; allWorst = Math.max(allWorst, s.worst);
  const at = s.worstAt === null ? '-' : `(${fmt(s.worstAt.x, 1)}, ${fmt(s.worstAt.z, 1)})`;
  console.log(`${String(seed).padStart(7)}  ${String(s.count).padStart(8)}  ${(fmt(100 * s.floating / s.count, 1) + ' %').padStart(10)}  ${fmt(s.worst).padStart(5)}  ${at.padEnd(15)} ${String(s.under).padStart(5)}  ${(fmt(100 * s.buriedShare, 1) + ' %').padStart(6)}  ${s.joins.map((j) => fmt(j, 1)).join(' / ')}`);
}
console.log(`\ntotal: ${fmt(100 * allFloat / allCount, 1)} % flotan, peor ${fmt(allWorst)} celdas`);
