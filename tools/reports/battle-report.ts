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
//
// **F-0 · la flecha que toca, en sombra** (29 sep 2026,
// `docs/diagnostico-fisica-combate-2026-09-29.md` §3):
//
//   npx tsx tools/reports/battle-report.ts --seeds 7,11,21 --shadow 0.12,0.17,0.37
//     [--probe-height 0.65] [--relief] [--quiet]
//
// Con `--shadow`, cada asaltante en pie lleva una cápsula de Rapier de ese radio
// que nada toca, y cada flecha apunta a quién habría dado si decidiera el
// contacto; al final, la tabla de acuerdo con el cilindro que decide hoy y lo
// que cuestan las sondas. Varios radios o semillas se corren uno tras otro, y
// cada batalla se corre también **sin** sombra para comprobar que la sombra no
// cambia nada. `--relief` pone el relieve del juego (`elevationAt`) como suelo,
// que es lo que el juego le pasa a la jornada; sin él el suelo es plano.
//
// **K5 · el peto en la pelea** (2 oct 2026, v5.80):
//
//   npx tsx tools/reports/battle-report.ts --jerkins --seeds 7,11,21,42 --days 5
//     [--relief] [--arm spear]
//
// Con `--jerkins`, cada jornada (`--days` por semilla: cada una tiene su propia
// semilla de escena) se corre dos veces: sin peto y con peto. Desde v5.81 el
// peto decide en la escena (`life/wounds.ts`: vida en porcentaje, daño por arma
// y la tabla arma × pieza). Al final, la distribución de bajas de cada rama y
// lo que el motor de verdad hace con cada parte.

import type { GameState } from '../../src/engine/state';
import { stateAt, giveNow, raidNow } from '../../src/ui/debug';
import { createVillage, type Village } from '../../src/render3d/life/village';
import { garrisonAs } from '../../src/derive/garrison';
import { LIFE_STEP } from '../../src/render3d/life/clock';
import { elevationAt } from '../../src/render3d/world/ground';
import type { ShadowArrow } from '../../src/render3d/life/archery';
import { advanceThreat } from '../../src/engine/world/threat';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : fallback;
};
const flag = (name: string): boolean => args.includes(`--${name}`);
const seeds = opt('seeds', opt('seed', '7')).split(',').map(Number);
const year = Number(opt('year', '60'));
const defenders = Number(opt('defenders', '10'));
const arm = opt('arm', 'bow') === 'spear' ? 'spear' : 'bow';
const raiders = Number(opt('raiders', '24'));
const steps = Number(opt('steps', '3000'));
const every = Number(opt('every', '250'));
const radii = flag('shadow') ? opt('shadow', '0.12').split(',').map(Number) : [];
const probeHeight = Number(opt('probe-height', '0.65'));
const relief = flag('relief');
const jerkinMode = flag('jerkins');
const days = Number(opt('days', '1'));
const quiet = flag('quiet') || seeds.length > 1 || radii.length > 1 || jerkinMode;

interface Run {
  readonly seed: number;
  readonly radius: number | null;
  readonly summary: string;
  readonly defence: Village['defence'];
  readonly shadow: readonly ShadowArrow[];
  readonly steps: number;
  readonly stepMsTotal: number;
  readonly probeMsTotal: number;
  readonly probesPeak: number;
}

interface Armour {
  /** Si los del cerco llevan peto. */
  readonly jerkins: boolean;
  /** La jornada de escena: cada una con su semilla. */
  readonly day: number;
}

const NO_ARMOUR: Armour = { jerkins: false, day: 0 };

async function battle(prepared: GameState, seed: number, radius: number | null, armour = NO_ARMOUR): Promise<Run> {
  const state = structuredClone(prepared);
  const life = createVillage(state, armour.day, {
    battle: { raiders, garrison: garrisonAs(state, defenders, arm, armour.jerkins) },
    ...(relief ? { ground: (x: number, z: number) => elevationAt(state.map, x, z) } : {}),
    ...(radius === null ? {} : { shadow: { radius, height: probeHeight } }),
  });
  if (!quiet) {
    process.stdout.write(`semilla ${seed}, año ${year}: ${life.manned.length} en el cerco `
      + `(${life.manned.filter((post) => post.post.arm === 'bow').length} con arco) contra ${life.raiders.length}\n`);
  }
  const started = Date.now();
  let endedAt: number | null = null;
  let probesPeak = 0;
  for (let step = 0; step <= steps; step += 1) {
    life.step(0.45);
    // Rapier se carga en una promesa la primera vez que llegan: hay que ceder.
    if (step % 50 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    const fighting = life.raiders.filter((r) => !['down', 'gone', 'leaving', 'coming'].includes(r.phase)).length;
    if (endedAt === null && step > 0 && fighting === 0 && life.raiders.every((r) => r.phase !== 'coming')) endedAt = step;
    const physics = life.physics?.stats;
    probesPeak = Math.max(probesPeak, physics?.probes ?? 0);
    if (!quiet && step % every === 0) {
      const phases: Record<string, number> = {};
      for (const raider of life.raiders) phases[raider.phase] = (phases[raider.phase] ?? 0) + 1;
      const d = life.defence;
      process.stdout.write(`${String(step).padStart(5)} · ${(step * LIFE_STEP).toFixed(0).padStart(4)} s · `
        + `${JSON.stringify(phases)} · flechas ${d.loosed}/${d.hits} · bajas ${d.lost}/${d.fallen} · `
        + `portón ${d.gate?.hits ?? '-'}${d.gate?.broken === true ? ' roto' : ''}${d.gate?.entered === true ? ' dentro' : ''} · `
        + `${physics === undefined ? 'sin física' : `física ${physics.bodies} cuerpos ${physics.stepMsAverage.toFixed(2)} ms`}\n`);
    }
  }
  const d = life.defence;
  const stats = life.physics?.stats;
  const summary = `${d.loosed} flechas, ${d.hits} aciertos, ${d.fallen} asaltantes y ${d.lost} defensores caídos; `
    + `portón ${d.gate?.hits ?? 0}/60${d.gate?.broken === true ? ', roto' : ''}${d.gate?.entered === true ? ', entraron' : ''}; `
    + `acabó en el paso ${endedAt ?? '—'} (${endedAt === null ? '—' : (endedAt * LIFE_STEP).toFixed(0)} s de escena)`;
  if (!quiet) process.stdout.write(`\nResumen: ${summary}. ${Date.now() - started} ms de reloj.\n`);
  return {
    seed, radius, summary, defence: d, shadow: life.shadow?.arrows ?? [],
    steps: stats?.steps ?? 0, stepMsTotal: stats?.stepMsTotal ?? 0, probeMsTotal: stats?.probeMsTotal ?? 0, probesPeak,
  };
}

/** Cómo acabó una flecha para cada juez. */
function verdict(arrow: ShadowArrow): 'ambos' | 'otro' | 'sólo cilindro' | 'sólo Rapier' | 'ninguno' {
  if (arrow.cylinder !== null && arrow.rapier !== null) return arrow.cylinder.id === arrow.rapier.id ? 'ambos' : 'otro';
  if (arrow.cylinder !== null) return 'sólo cilindro';
  if (arrow.rapier !== null) return 'sólo Rapier';
  return 'ninguno';
}

const quantile = (values: readonly number[], q: number): number => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
};

function shadowTable(runs: readonly Run[], feetOf: (seed: number, x: number, z: number) => number): string {
  const arrows = runs.flatMap((run) => run.shadow.filter((arrow) => arrow.done));
  const counts: Record<string, number> = { ambos: 0, otro: 0, 'sólo cilindro': 0, 'sólo Rapier': 0, ninguno: 0 };
  for (const arrow of arrows) counts[verdict(arrow)] = (counts[verdict(arrow)] ?? 0) + 1;
  const cylinderOnly = runs.flatMap((run) => run.shadow.filter((arrow) => arrow.done && verdict(arrow) === 'sólo cilindro')
    .map((arrow) => ({ arrow, seed: run.seed })));
  const blocked = cylinderOnly.filter(({ arrow }) => arrow.blocked).length;
  // A qué altura sobre los pies iba la flecha que el cilindro contó y Rapier no.
  const lost = cylinderOnly.map(({ arrow, seed }) => {
    const hit = arrow.cylinder!;
    return hit.at.y - (hit.body.y ?? feetOf(seed, hit.body.x, hit.body.z));
  }).sort((a, b) => a - b);
  const reach = cylinderOnly.map(({ arrow }) => {
    const hit = arrow.cylinder!;
    return Math.hypot(hit.at.x - hit.body.x, hit.at.z - hit.body.z);
  }).sort((a, b) => a - b);
  const heights = arrows.flatMap((arrow) => arrow.rapier === null ? [] : [arrow.rapier.height]);
  // Las cotas de los huesos del aldeano publicado en reposo: cadera 0,287,
  // arranque de la cabeza 0,493, coronilla 0,651 (medido el 29 sep 2026).
  const legs = heights.filter((h) => h < 0.29).length;
  const trunk = heights.filter((h) => h >= 0.29 && h < 0.49).length;
  const head = heights.filter((h) => h >= 0.49).length;
  const ahead = arrows.flatMap((arrow) => arrow.rapier?.ahead ?? []);
  const beyond = arrows.flatMap((arrow) => arrow.beyond ?? []);
  const cylinderHits = arrows.filter((arrow) => arrow.cylinder !== null).length;
  const rapierHits = arrows.filter((arrow) => arrow.rapier !== null).length;
  const changed = (counts['otro'] ?? 0) + (counts['sólo cilindro'] ?? 0) + (counts['sólo Rapier'] ?? 0);
  const pct = (n: number, of: number): string => of === 0 ? '—' : `${(100 * n / of).toFixed(0)} %`;
  return [
    `  flechas acabadas ${arrows.length}: aciertos del cilindro ${cylinderHits}, de Rapier ${rapierHits}`,
    `  ambos al mismo ${counts['ambos']} · a otro ${counts['otro']} · sólo cilindro ${counts['sólo cilindro']}`
      + ` (${blocked} con muro o suelo delante) · sólo Rapier ${counts['sólo Rapier']} · ninguno ${counts['ninguno']}`,
    `  cambiaría el resultado en ${changed} flechas: ${pct(changed, arrows.length)} de las flechas, `
      + `${pct(changed, Math.max(cylinderHits, rapierHits))} de los aciertos`,
    `  los de sólo cilindro iban a ${lost.map((h) => h.toFixed(2)).join(', ') || '—'} sobre los pies`
      + ` y a ${reach.map((r) => r.toFixed(2)).join(', ') || '—'} del eje del cuerpo`,
    `  altura del contacto de Rapier: piernas ${legs} · tronco ${trunk} · cabeza ${head}`,
    `  el cilindro da antes de llegar al cuerpo: mediana ${quantile(ahead, 0.5).toFixed(2)} celdas (${ahead.length} flechas)`,
    `  la flecha que acierta sigue volando: se para a ${quantile(beyond, 0.5).toFixed(2)} celdas del impacto `
      + `(p90 ${quantile(beyond, 0.9).toFixed(2)}, ${beyond.length} flechas)`,
  ].join('\n');
}

const runs: Run[] = [];
const maps = new Map<number, GameState['map']>();
const feetOf = (seed: number, x: number, z: number): number => {
  const map = maps.get(seed);
  return relief && map !== undefined ? elevationAt(map, x, z) : 0;
};
/** K5 · Una jornada en las dos ramas: sin peto y con peto. */
interface JerkinTrial {
  readonly seed: number;
  readonly day: number;
  readonly bare: Run;
  readonly worn: Run;
}

/**
 * Lo que el motor entierra con este parte, con o sin el encargo: se le pasa
 * **al motor de verdad** (`advanceThreat` → `settle`, sobre una copia), por la
 * misma puerta que el juego (`app.ts`, `PlayerAct` `battle`). Si el cerco cae,
 * el motor no mira `lost`: saquea con su cuenta (`storm`).
 */
const preparedOf = new Map<number, GameState>();
const motorOf = (seed: number, run: Run, jerkins: boolean): { fallen: number; stormed: boolean; raised: number } => {
  const state = structuredClone(preparedOf.get(seed)!);
  if (jerkins) state.flags['smithy:jerkins'] = state.tick + 52;
  // El mismo parte que arma `app.ts`: con `spared`, la escena ya aplicó la armadura.
  const event = advanceThreat(state, {
    slain: run.defence.fallen, lost: run.defence.lost, breached: run.defence.gate?.entered === true,
    spared: run.defence.jerkins.spared,
  });
  return { fallen: event?.fallen ?? 0, stormed: event?.kind === 'stormed', raised: event?.jerkins ?? 0 };
};

function jerkinTable(trials: readonly JerkinTrial[]): string {
  const mean = (values: readonly number[]): string => values.length === 0 ? '—'
    : (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  const spread = (values: readonly number[]): string =>
    `media ${mean(values)} · mediana ${quantile(values, 0.5)} · p90 ${quantile(values, 0.9)} · máx ${values.length === 0 ? '—' : Math.max(...values)}`;
  const lines: string[] = [];
  const branch = (name: string, pick: (trial: JerkinTrial) => Run, motorJerkins: boolean): void => {
    const runs = trials.map(pick);
    const motor = trials.map((trial) => motorOf(trial.seed, pick(trial), motorJerkins));
    lines.push(`  ${name}`);
    lines.push(`    caídos en la escena (lost): ${spread(runs.map((run) => run.defence.lost))}`);
    lines.push(`    asaltantes caídos: ${spread(runs.map((run) => run.defence.fallen))} · `
      + `heridos en pie al final ${spread(runs.map((run) => run.defence.wounded))} · `
      + `entraron en ${runs.filter((run) => run.defence.gate?.entered === true).length} de ${runs.length}`);
    lines.push(`    flechas soltadas ${spread(runs.map((run) => run.defence.loosed))}; `
      + `aciertos ${spread(runs.map((run) => run.defence.arrowHits))}`);
    lines.push(`    el motor${motorJerkins ? ' con el encargo' : ''}: entierra ${spread(motor.map((m) => m.fallen))}; `
      + `tomado en ${motor.filter((m) => m.stormed).length} de ${motor.length}`
      + (motorJerkins ? `; la crónica cuenta ${motor.reduce((a, m) => a + m.raised, 0)} en pie gracias al peto` : ''));
  };
  branch('sin peto', (trial) => trial.bare, false);
  branch('con peto (decide la escena, v5.81)', (trial) => trial.worn, true);
  const tallies = trials.map((trial) => trial.worn.defence.jerkins);
  lines.push(`    el peto: golpes al cuero ${spread(tallies.map((t) => t.blows))}; rebotes `
    + `${tallies.reduce((a, t) => a + t.ricochets, 0)}; caídos con peto ${tallies.reduce((a, t) => a + t.fallen, 0)}; `
    + `en pie gracias a él ${tallies.reduce((a, t) => a + t.spared, 0)}`);
  return lines.join('\n');
}

const jerkinTrials: JerkinTrial[] = [];

for (const seed of seeds) {
  const prepared = stateAt({ seed, year, season: 'summer' });
  maps.set(seed, prepared.map);
  preparedOf.set(seed, prepared);
  giveNow(prepared, 'arms');
  giveNow(prepared, 'bows');
  raidNow(prepared, raiders, true);
  // La primera batalla del proceso paga la carga del WASM y el calentamiento
  // del JIT: medido el 29 sep, 0,64 ms por paso contra 0,29 de las siguientes.
  // Con varias pasadas se tira una primero para no cargárselo a la de sin sombra.
  if (radii.length > 0 && runs.length === 0) await battle(prepared, seed, null);
  if (jerkinMode) {
    for (let day = 0; day < days; day += 1) {
      const bare = await battle(prepared, seed, null, { jerkins: false, day });
      const worn = await battle(prepared, seed, null, { jerkins: true, day });
      jerkinTrials.push({ seed, day, bare, worn });
      process.stdout.write(`semilla ${seed} jornada ${day}: sin peto ${bare.defence.lost} caídos, `
        + `${bare.defence.fallen} asaltantes · con peto ${worn.defence.lost} caídos, ${worn.defence.fallen} asaltantes `
        + `(${worn.defence.jerkins.blows} golpes al cuero, ${worn.defence.jerkins.spared} en pie gracias a él)\n`);
    }
    continue;
  }
  const base = await battle(prepared, seed, null);
  runs.push(base);
  if (quiet) process.stdout.write(`semilla ${seed} sin sombra: ${base.summary}\n`);
  for (const radius of radii) {
    const run = await battle(prepared, seed, radius);
    runs.push(run);
    const same = run.summary === base.summary;
    process.stdout.write(`semilla ${seed} sombra ${radius}: ${same ? 'mismo resultado que sin sombra' : `DISTINTO: ${run.summary}`}\n`);
  }
}

if (radii.length > 0) {
  process.stdout.write(`\nF-0 · la flecha que toca, en sombra: ${seeds.length} batallas por radio, `
    + `${defenders} en el cerco (${arm}) contra ${raiders}, año ${year}, cápsula de ${probeHeight} de alto, `
    + `suelo ${relief ? 'con el relieve del juego' : 'plano'}\n`);
  const bases = runs.filter((run) => run.radius === null);
  const baseSteps = bases.reduce((sum, run) => sum + run.steps, 0);
  const baseMs = bases.reduce((sum, run) => sum + run.stepMsTotal, 0);
  process.stdout.write(`sin sombra: paso de Rapier ${(baseMs / Math.max(1, baseSteps)).toFixed(3)} ms de media en ${baseSteps} pasos\n`);
  for (const radius of radii) {
    const mine = runs.filter((run) => run.radius === radius);
    const totalSteps = mine.reduce((sum, run) => sum + run.steps, 0);
    const stepMs = mine.reduce((sum, run) => sum + run.stepMsTotal, 0) / Math.max(1, totalSteps);
    const probeMs = mine.reduce((sum, run) => sum + run.probeMsTotal, 0) / Math.max(1, totalSteps);
    process.stdout.write(`\ncápsula de radio ${radius}: paso de Rapier ${stepMs.toFixed(3)} ms y sondas ${probeMs.toFixed(3)} ms `
      + `de media por paso (hasta ${Math.max(...mine.map((run) => run.probesPeak))} sondas a la vez)\n`);
    process.stdout.write(`${shadowTable(mine, feetOf)}\n`);
  }
}

if (jerkinMode) {
  process.stdout.write(`\nK5 · el peto en la pelea: ${jerkinTrials.length} jornadas (${seeds.length} semillas × ${days}), `
    + `${defenders} en el cerco (${arm}) contra ${raiders}, año ${year}, suelo ${relief ? 'con el relieve del juego' : 'plano'}\n`);
  process.stdout.write(`${jerkinTable(jerkinTrials)}\n`);
}
