// El informe del valle. 26 sep 2026.
//
// Pedido por Vera: «una herramienta que genere un informe con todos los sucesos
// y crónicas que vayan sucediendo en un valle, y un HTML con gráficos para ver
// cómo va el juego y tener un sitio centralizado donde hacer pruebas y medir
// resultados; nos ayudará a balancear y a decidir el ritmo».
//
// Juega una o varias semillas con `run` y una política —como los demás
// informes, no con `tick`, por lo que cuenta `works-report.ts`— y guarda, semana
// a semana, lo que un balance necesita mirar: gente, existencias, ánimo,
// ganado, obras, bosque, la amenaza del clan; y todo lo que pasa: nacimientos,
// muertes con su causa, llegadas, marchas, obras, sucesos, decisiones, y cada
// línea de la crónica con su peso, en inglés como la lee el jugador. Todo
// medido también en **horas de reloj a ×1**, que es la unidad del ritmo.
//
//   npx tsx tools/reports/valley-report.ts [--seeds 7,23,41 | --count 6]
//     [--years 60] [--policy prudent|first|last|random|worst] [--label texto]
//
// Escribe `artifacts/reports/valley/<fecha>-<etiqueta>/` con `data.json` y
// `report.html` (autocontenido: se abre sin servidor ni red), y rehace
// `artifacts/reports/valley/index.html` con todas las ejecuciones guardadas,
// para compararlas. No cambia nada del motor.

import { mkdirSync, readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIFE, TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { ratioOf } from '../../src/engine/crossroads/conditions';
import { foundGame } from '../../src/engine/found';
import { ageOf } from '../../src/engine/people/villagers';
import { renderEntry } from '../../src/engine/chronicle/render';
import { run, type Policy } from '../../src/engine/sim';
import { eraOf } from '../../src/derive/era';
import { LADDER } from './ladder';
import { reportPage, indexPage, type RunSummary, type ValleyData, type ValleyReport } from './valley-report-page';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : fallback;
};
const YEARS = Number(opt('years', '60'));
const POLICY = opt('policy', 'prudent') as Policy & string;
const SEEDS = args.includes('--seeds')
  ? opt('seeds', '7').split(',').map(Number)
  : Array.from({ length: Number(opt('count', '6')) }, (_, i) => 3 + i * 7);
const LABEL = opt('label', `${POLICY}-${SEEDS.length}x${YEARS}`).replace(/[^a-zA-Z0-9_-]+/gu, '-');
const OUT_ROOT = 'artifacts/reports/valley';

const HOURS_PER_WEEK = TIME.REAL_MS_PER_TICK / 3_600_000;
const ERAS = ['hamlet', 'village', 'town'];
const round = (value: number, digits = 1): number => Number(value.toFixed(digits));

function playValley(seed: number): ValleyData {
  const state = foundGame(seed);
  const series: ValleyData['series'] = {
    tick: [], population: [], adults: [], children: [], grain: [], wood: [], stone: [], silver: [],
    morale: [], faith: [], hens: [], pigs: [], cows: [], houses: [], buildings: [], fields: [],
    forest: [], clan: [], era: [],
  };
  const events: ValleyData['events'] = [];
  const milestones: Record<string, number> = {};
  const left = new Map(LADDER.map(([name, gate]) => [name, gate] as const));
  for (let week = 1; week <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
    const [report] = run(state, 1, POLICY, CATALOG);
    const tick = state.tick;
    if (report !== undefined) {
      for (const death of report.deaths) events.push({ tick, type: 'death', what: death.cause, detail: death.named ? `${death.role ?? 'named'} · ${death.age}` : String(death.age) });
      if (report.births > 0) events.push({ tick, type: 'birth', what: 'birth', count: report.births });
      if (report.arrived > 0) events.push({ tick, type: 'arrived', what: 'arrived', count: report.arrived });
      if (report.left > 0) events.push({ tick, type: 'left', what: 'left', count: report.left });
      for (const built of report.built) events.push({ tick, type: 'built', what: built.kind, detail: built.upgradeOf === null ? '' : 'mejora' });
    }
    for (const [name, gate] of [...left]) {
      if (gate(state)) { milestones[name] = tick; left.delete(name); }
    }
    const living = state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null);
    const standing = state.buildings.filter((b) => b.lostTick === null);
    series.tick.push(tick);
    series.population.push(living.length);
    series.children.push(living.filter((v) => ageOf(v, tick) < LIFE.ADULT[0]).length);
    series.adults.push(living.filter((v) => ageOf(v, tick) >= LIFE.ADULT[0]).length);
    series.grain.push(Math.round(state.village.grain));
    series.wood.push(Math.round(state.village.wood));
    series.stone.push(Math.round(state.village.stone));
    series.silver.push(Math.round(state.village.silver));
    series.morale.push(Math.round(state.village.morale));
    series.faith.push(Math.round(state.village.faith));
    series.hens.push(state.herd.hens);
    series.pigs.push(state.herd.pigs);
    series.cows.push(state.herd.cows);
    series.houses.push(standing.filter((b) => b.kind === 'house' || b.kind === 'stone_house').length);
    series.fields.push(standing.filter((b) => b.kind === 'field').length);
    series.buildings.push(standing.filter((b) => b.kind !== 'field').length);
    series.forest.push(round(ratioOf(state, 'forestLeft') * 100, 0));
    series.clan.push(round(state.threat.strength, 1));
    series.era.push(ERAS.indexOf(eraOf(state)));
  }
  for (const happening of state.happenings) events.push({ tick: happening.tick, type: 'happening', what: happening.id });
  for (const decision of state.history) events.push({ tick: decision.tick, type: 'decision', what: decision.templateId, detail: decision.optionId });
  events.sort((a, b) => a.tick - b.tick);
  const chronicle = state.chronicle.map((entry, index) => ({
    tick: entry.tick, kind: entry.kind, weight: entry.weight, key: entry.templateKey,
    text: renderEntry(entry, state.rng, index),
  }));
  return {
    seed,
    ticks: state.tick,
    ended: state.ended === null ? null : { tick: state.ended.tick, cause: state.ended.cause },
    raids: state.threat.raids,
    milestones,
    series,
    events,
    chronicle,
  };
}

const started = Date.now();
const valleys: ValleyData[] = [];
for (const seed of SEEDS) {
  process.stdout.write(`semilla ${seed}… `);
  const valley = playValley(seed);
  valleys.push(valley);
  process.stdout.write(`${(valley.ticks / TIME.WEEKS_PER_YEAR).toFixed(0)} años, ${valley.series.population.at(-1)} personas`
    + `${valley.ended === null ? '' : `, acabó (${valley.ended.cause})`}\n`);
}

const stamp = new Date().toISOString().replace(/[:T]/gu, '-').slice(0, 16);
const report: ValleyReport = {
  label: LABEL,
  createdAt: new Date().toISOString(),
  policy: POLICY,
  years: YEARS,
  seeds: SEEDS,
  weeksPerYear: TIME.WEEKS_PER_YEAR,
  hoursPerWeek: HOURS_PER_WEEK,
  ladder: LADDER.map(([name]) => name),
  valleys,
  seconds: Math.round((Date.now() - started) / 1000),
  // Lo que cuesta: la memoria máxima del proceso, en MB (un solo hilo).
  peakMb: Math.round(process.resourceUsage().maxRSS / 1024),
};
const dir = join(OUT_ROOT, `${stamp}-${LABEL}`);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'data.json'), JSON.stringify(report));
writeFileSync(join(dir, 'report.html'), reportPage(report));
// La misma página, como fragmento para publicarla (el visor pone el resto).
writeFileSync(join(dir, 'report-publish.html'), reportPage(report, { publish: true }));

// El índice: una fila por ejecución guardada, para compararlas de un vistazo.
const runs: RunSummary[] = [];
for (const name of readdirSync(OUT_ROOT).sort().reverse()) {
  const data = join(OUT_ROOT, name, 'data.json');
  if (!existsSync(data)) continue;
  const saved = JSON.parse(readFileSync(data, 'utf8')) as ValleyReport;
  const finals = saved.valleys.map((v) => v.series.population.at(-1) ?? 0).sort((a, b) => a - b);
  runs.push({
    folder: name, label: saved.label, createdAt: saved.createdAt, policy: saved.policy, years: saved.years,
    seeds: saved.seeds.length, medianPopulation: finals[Math.floor(finals.length / 2)] ?? 0,
    ended: saved.valleys.filter((v) => v.ended !== null).length,
    happeningsPerYear: round(saved.valleys.reduce((sum, v) => sum + v.events.filter((e) => e.type === 'happening').length, 0)
      / Math.max(1, saved.valleys.reduce((sum, v) => sum + v.ticks, 0) / saved.weeksPerYear)),
  });
}
writeFileSync(join(OUT_ROOT, 'index.html'), indexPage(runs));
process.stdout.write(`\n${report.seconds} s · memoria máxima ${report.peakMb} MB\n${join(dir, 'report.html')}\n${join(OUT_ROOT, 'index.html')}\n`);
