// D1 · Lo que cuesta la física. design.md §1b.
//
// Dos preguntas, y las dos deciden si el asedio cabe en un móvil:
//
//   1. **Cuánto cuesta un paso** con N cuerpos en el aire, contra el
//      presupuesto de la capa de vida: 1/30 de segundo son 33 000 µs, y la
//      gente ya se come unos 236 µs de ellos (`life/clock.ts`).
//   2. **Cuánto pesa** el paquete, que es el precio que el dueño del diseño
//      aceptó al elegir Rapier sabiendo que eran «cerca de un megabyte».
//
//   npx tsx tools/reports/physics-report.ts [--bodies 200] [--seconds 10]

import { createPhysics, loadPhysics } from '../../src/render3d/life/physics';
import { LIFE_STEP } from '../../src/render3d/life/clock';
import type { Terrain } from '../../src/render3d/life/body';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const BODIES = arg('bodies', 200);
const SECONDS = arg('seconds', 10);

/** Un valle de juguete con una muralla recta, para no depender de una semilla. */
function land(): Terrain {
  const width = 72;
  const height = 112;
  const blocked = new Uint8Array(width * height);
  for (let x = 20; x < 52; x += 1) blocked[40 * width + x] = 1;
  return { width, height, blocked };
}

const started = Date.now();
const RAPIER = await loadPhysics();
if (RAPIER === null) {
  console.log('Rapier no se pudo cargar en este entorno.');
  process.exit(0);
}
const loadMs = Date.now() - started;

const world = await createPhysics(land());
if (world === null) {
  console.log('el mundo no se pudo montar.');
  process.exit(0);
}

// Se lanzan todas desde la muralla, hacia el otro lado, con un ángulo alto.
for (let n = 0; n < BODIES; n += 1) {
  const x = 20 + (n % 32);
  world.launch({ x, y: 2, z: 40 }, { x: 0, y: 6, z: 8 + (n % 5) });
}

const steps = Math.round(SECONDS / LIFE_STEP);
const t0 = process.hrtime.bigint();
for (let n = 0; n < steps; n += 1) world.step();
const t1 = process.hrtime.bigint();

const perStepUs = Number(t1 - t0) / 1000 / steps;
const BUDGET_US = LIFE_STEP * 1_000_000;

console.log(`\n## La física, medida · ${BODIES} cuerpos · ${SECONDS} s escénicos`);
console.log(`arrancar Rapier (WASM incluido): ${loadMs} ms`);
console.log(`un paso con ${BODIES} cuerpos: **${perStepUs.toFixed(0)} µs**`);
console.log(`presupuesto de un paso de vida: ${BUDGET_US.toFixed(0)} µs`
  + ` · esto se come el ${((perStepUs / BUDGET_US) * 100).toFixed(1)} %`);
console.log(`(la gente del valle ya gastaba unos 236 µs, el 0,7 %)`);
world.dispose();
