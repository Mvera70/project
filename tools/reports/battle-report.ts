// La batalla del banco, sin navegador. 27 sep 2026.
//
// Lo mismo que `?sandbox=battle` (`src/ui/sandbox.ts`) pero sin pintar: la
// villa, las armas, el asalto de hoy y la capa de vida paso a paso con Rapier
// de verdad. Sirve para comprobar en segundos que un cambio del combate sigue
// funcionando —llegan, se dispara, cae el portón, entran— cuando el navegador
// de pruebas va a un fotograma por segundo y la jornada no le da para llegar.
//
//   npx tsx tools/reports/battle-report.ts [--seed 7] [--year 60]
//     [--defenders 10] [--arm bow|spear] [--raiders 24] [--steps 3000] [--every 250]
//
// Imprime, cada `--every` pasos de vida, las fases de los asaltantes, la
// defensa (flechas, aciertos, bajas, portón) y la física (cuerpos y ms por
// paso), y al final un resumen. No toca el motor ni guarda nada.

import { stateAt, giveNow, raidNow } from '../../src/ui/debug';
import { createVillage } from '../../src/render3d/life/village';
import { garrisonAs } from '../../src/derive/garrison';
import { LIFE_STEP } from '../../src/render3d/life/clock';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : fallback;
};
const seed = Number(opt('seed', '7'));
const year = Number(opt('year', '60'));
const defenders = Number(opt('defenders', '10'));
const arm = opt('arm', 'bow') === 'spear' ? 'spear' : 'bow';
const raiders = Number(opt('raiders', '24'));
const steps = Number(opt('steps', '3000'));
const every = Number(opt('every', '250'));

const state = stateAt({ seed, year, season: 'summer' });
giveNow(state, 'arms');
giveNow(state, 'bows');
raidNow(state, raiders, true);
const life = createVillage(state, 0, { battle: { raiders, garrison: garrisonAs(state, defenders, arm) } });
process.stdout.write(`semilla ${seed}, año ${year}: ${life.manned.length} en el cerco `
  + `(${life.manned.filter((post) => post.post.arm === 'bow').length} con arco) contra ${life.raiders.length}\n`);

const started = Date.now();
let endedAt: number | null = null;
for (let step = 0; step <= steps; step += 1) {
  life.step(0.45);
  // Rapier se carga en una promesa la primera vez que llegan: hay que ceder.
  if (step % 50 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  const fighting = life.raiders.filter((r) => !['down', 'gone', 'leaving', 'coming'].includes(r.phase)).length;
  if (endedAt === null && step > 0 && fighting === 0 && life.raiders.every((r) => r.phase !== 'coming')) endedAt = step;
  if (step % every === 0) {
    const phases: Record<string, number> = {};
    for (const raider of life.raiders) phases[raider.phase] = (phases[raider.phase] ?? 0) + 1;
    const d = life.defence;
    const physics = life.physics?.stats;
    process.stdout.write(`${String(step).padStart(5)} · ${(step * LIFE_STEP).toFixed(0).padStart(4)} s · `
      + `${JSON.stringify(phases)} · flechas ${d.loosed}/${d.hits} · bajas ${d.lost}/${d.fallen} · `
      + `portón ${d.gate?.hits ?? '-'}${d.gate?.broken === true ? ' roto' : ''}${d.gate?.entered === true ? ' dentro' : ''} · `
      + `${physics === undefined ? 'sin física' : `física ${physics.bodies} cuerpos ${physics.stepMsAverage.toFixed(2)} ms`}\n`);
  }
}
const d = life.defence;
process.stdout.write(`\nResumen: ${d.loosed} flechas, ${d.hits} aciertos, ${d.fallen} asaltantes y ${d.lost} defensores caídos; `
  + `portón ${d.gate?.hits ?? 0}/60${d.gate?.broken === true ? ', roto' : ''}${d.gate?.entered === true ? ', entraron' : ''}; `
  + `acabó en el paso ${endedAt ?? '—'} (${endedAt === null ? '—' : (endedAt * LIFE_STEP).toFixed(0)} s de escena). `
  + `${Date.now() - started} ms de reloj.\n`);
