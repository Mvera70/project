// Qué le pasa a un cuerpo, antes de tocar nada. docs/rework.md §3.4.
//
// El dueño: «los animales ahora mismo es que están fatal, atraviesan paredes,
// dan vueltas sobre sí mismos». Este informe mide las cuatro cosas del brief,
// sobre personas **y** animales a la vez, para tener el «antes» escrito antes
// de cambiar una línea de `body.ts`, `navigate.ts` o `beasts.ts` — la misma
// disciplina que `tools/fate-report.ts` fijó para los pesos de los sucesos:
// medir primero, y volver a medir con el mismo informe después.
//
//   npx tsx tools/life-report.ts [semillas...] [--days N]
//
// Por semilla y por jornada, contando cada 30 pasos de `life.step()`
// (un segundo escénico, `LIFE_STEP = 1/30`):
//
//   - **centro en muro**: `blockedAt` sobre el centro del cuerpo. Tiene que
//     ser 0 con el motor tal como está — nadie nace ahí a propósito — y sirve
//     de canario si algún día deja de serlo.
//   - **círculo en muro** («atraviesan paredes»): además del centro, los
//     cuatro puntos a `radius` en X y en Z. Es lo que `blockedAt` del centro
//     no ve: medio cuerpo metido en la pared con el centro todavía en celda
//     libre.
//   - **giros** («dan vueltas sobre sí mismos»): cambio de `facing` mayor de
//     π/2 entre dos muestras separadas un segundo, mientras
//     `hypot(vx, vz) < 0.1`. Girar deprisa sin moverse es exactamente la
//     vuelta sobre sí mismo que se ve en pantalla.
//   - **parados con hambre**: `doing === null` y el mayor de los seis
//     impulsos (`needs.ts`) por encima de 0,9. El síntoma humano que E.3.4 ya
//     vio una vez sin buscarlo, en la semilla 23.
//
// **Nunca con `tick` en un bucle.** `CLAUDE.md` cuenta la conclusión falsa que
// costó medir el mundo así: un informe que avanza la partida a mano no juega
// las encrucijadas ni deja que sus consecuencias entren en el estado. Aquí se
// funda con `foundTwenty` y se juega con `run(state, 12 * 48, 'prudent',
// CATALOG)`, tal como pide el brief (§3.4).
//
// **Varias semillas y varias jornadas, nunca una.** Cada jornada tiene su
// propia semilla (`seedOfDay`, `clock.ts`): el día 0 de seis semillas son seis
// muestras de un mismo instante del calendario, no seis aldeas distintas, y
// el día 3 de una semilla es una aldea distinta del día 0 de la misma. Las dos
// dimensiones hacen falta para que un umbral no sea ruido de un solo tiro.

import { CATALOG } from '@engine/crossroads/catalog';
import { TIME } from '@engine/balance';
import { run } from '@engine/sim';
import { foundTwenty } from '../tests/helpers/founding';
import { blockedAt, type Body, type Terrain } from '../src/render3d/life/body';
import { STEPS_PER_DAY } from '../src/render3d/life/clock';
import { terrainOf } from '../src/render3d/life/terrain';
import { createVillage, type Dweller } from '../src/render3d/life/village';

const args = process.argv.slice(2);
const daysAt = args.indexOf('--days');
const DAYS = daysAt >= 0 ? Number(args[daysAt + 1]) : 4;
const given = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--days').map(Number);
const SEEDS = given.length > 0 ? given : [3, 7, 11, 23, 41, 97];

/** Cada cuánto se muestrea, en pasos: treinta son un segundo escénico. */
const SAMPLE_EVERY = 30;

/** Si algún punto del círculo del cuerpo cae en celda cerrada, además del centro. */
function circleBlocked(land: Terrain, body: Body): boolean {
  const { x, z, radius } = body;
  return blockedAt(land, x, z)
    || blockedAt(land, x - radius, z) || blockedAt(land, x + radius, z)
    || blockedAt(land, x, z - radius) || blockedAt(land, x, z + radius);
}

interface Totals {
  bodySeconds: number;
  centreInWall: number;
  circleStepsInWall: number;
  spins: number;
  stuckHungry: number;
  /** Labradores en su puesto: dentro de su campo, y fuera. */
  fieldIn: number;
  fieldOut: number;
}

function zero(): Totals {
  return { bodySeconds: 0, centreInWall: 0, circleStepsInWall: 0, spins: 0, stuckHungry: 0, fieldIn: 0, fieldOut: 0 };
}

function add(a: Totals, b: Totals): void {
  a.bodySeconds += b.bodySeconds;
  a.centreInWall += b.centreInWall;
  a.circleStepsInWall += b.circleStepsInWall;
  a.spins += b.spins;
  a.stuckHungry += b.stuckHungry;
  a.fieldIn += b.fieldIn;
  a.fieldOut += b.fieldOut;
}

const grand = zero();
const perSeed = new Map<number, Totals>();

for (const seed of SEEDS) {
  const state = foundTwenty(seed);
  run(state, 12 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
  const land = terrainOf(state);
  const seedTotals = zero();

  for (let day = 0; day < DAYS; day += 1) {
    const life = createVillage(state, day);
    // Labradores fuera de su campo: lo vio el dueño el 16 sep 2026 y medido era
    // el 96 %. Se cuenta para que no vuelva a crecer.
    const fields = new Map(state.buildings
      .filter((b) => b.kind === 'field' && b.lostTick === null)
      .map((b) => [`field:${b.id}`, b]));
    // Todo cuerpo con vida hoy, persona o bestia, con el mismo trato: el
    // brief pide medir las dos, no dos informes separados.
    const bodies: Dweller[] = [...life.dwellers, ...life.beasts.map((b) => b.dweller)];
    // El `facing` de la muestra anterior, para medir el giro por segundo.
    // Por `id` de cuerpo, que es estable dentro de la jornada (`village.ts`,
    // `beasts.ts`: personas y bestias viven en rangos de id separados).
    const lastFacing = new Map<number, number>();

    for (let n = 0; n < STEPS_PER_DAY; n += 1) {
      life.step();
      if ((n + 1) % SAMPLE_EVERY !== 0) continue;
      for (const d of bodies) {
        const { body } = d;
        seedTotals.bodySeconds += 1;
        if (blockedAt(land, body.x, body.z)) seedTotals.centreInWall += 1;
        if (circleBlocked(land, body)) seedTotals.circleStepsInWall += 1;

        const speed = Math.hypot(body.vx, body.vz);
        const previous = lastFacing.get(body.id);
        if (previous !== undefined && speed < 0.1) {
          let turn = body.facing - previous;
          while (turn > Math.PI) turn -= Math.PI * 2;
          while (turn < -Math.PI) turn += Math.PI * 2;
          if (Math.abs(turn) > Math.PI / 2) seedTotals.spins += 1;
        }
        lastFacing.set(body.id, body.facing);

        const hungriest = Math.max(...Object.values(d.needs));
        if (d.doing === null && hungriest >= 0.9) seedTotals.stuckHungry += 1;
        const at = d.doing;
        if (at !== null && at.there && at.place.id.startsWith('field:')) {
          const f = fields.get(at.place.id);
          if (f !== undefined) {
            const inside = body.x >= f.x && body.x < f.x + f.w && body.z >= f.y && body.z < f.y + f.h;
            if (inside) seedTotals.fieldIn += 1; else seedTotals.fieldOut += 1;
          }
        }
      }
    }
  }

  perSeed.set(seed, seedTotals);
  add(grand, seedTotals);
  const pct = (n: number, of: number): string => (of === 0 ? '—' : `${(100 * n / of).toFixed(2)}%`);
  process.stdout.write(
    `semilla ${String(seed).padStart(3)} · ${seedTotals.bodySeconds} cuerpo-segundos en ${DAYS} jornadas`
    + ` · centro en muro ${seedTotals.centreInWall}`
    + ` · círculo en muro ${pct(seedTotals.circleStepsInWall, seedTotals.bodySeconds)}`
    + ` · giros/seg ${pct(seedTotals.spins, seedTotals.bodySeconds)}`
    + ` · parados con hambre ${pct(seedTotals.stuckHungry, seedTotals.bodySeconds)}`
    + ` · labradores fuera ${pct(seedTotals.fieldOut, seedTotals.fieldIn + seedTotals.fieldOut)}\n`,
  );
}

process.stdout.write(
  `\ntotal · ${grand.bodySeconds} cuerpo-segundos, ${SEEDS.length} semillas × ${DAYS} jornadas\n`
  + `  centro en celda cerrada:        ${grand.centreInWall} (tiene que ser 0)\n`
  + `  círculo en celda cerrada:       ${grand.circleStepsInWall} (${(100 * grand.circleStepsInWall / grand.bodySeconds).toFixed(2)}%)\n`
  + `  giros > π/2 en un segundo:      ${grand.spins} (${(100 * grand.spins / grand.bodySeconds).toFixed(2)}%)\n`
  + `  parados con impulso ≥ 0,9:      ${grand.stuckHungry} (${(100 * grand.stuckHungry / grand.bodySeconds).toFixed(2)}%)\n`
  + `  labradores fuera de su campo:   ${grand.fieldOut} de ${grand.fieldIn + grand.fieldOut} (${(100 * grand.fieldOut / Math.max(1, grand.fieldIn + grand.fieldOut)).toFixed(1)}%)\n`,
);
