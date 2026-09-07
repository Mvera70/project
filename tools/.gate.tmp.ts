import { CROSSROADS, FOUNDING, TIME } from '../src/engine/balance.ts';
import { makeBundle } from '../src/engine/rng.ts';
import type { Building, GameState, TickContext } from '../src/engine/state.ts';
import type { AppliedEffects } from '../src/engine/crossroads/schema.ts';
import { foundPeople } from '../src/engine/people/villagers.ts';
import {
  population, resolveBirths, resolveDeaths, resolveMigration,
} from '../src/engine/people/demography.ts';
import { driftOpinions, deepestDislike } from '../src/engine/people/opinions.ts';
import { decayMemories } from '../src/engine/people/memories.ts';
import { allocateLabour, produce } from '../src/engine/subsistence/labour.ts';
import { consume, overwinter } from '../src/engine/subsistence/consumption.ts';
import { applySpoilage, harvest } from '../src/engine/subsistence/harvest.ts';
import { isUnexplained, updateMood } from '../src/engine/subsistence/mood.ts';
import { rollWeather } from '../src/engine/subsistence/seasons.ts';
import { rollPlague } from '../src/engine/subsistence/disasters.ts';
import { CATALOG } from '../src/engine/crossroads/catalog/index.ts';
import { all } from '../src/engine/crossroads/conditions.ts';
import { selectCrossroad } from '../src/engine/crossroads/select.ts';
import { applyOption } from '../src/engine/crossroads/resolve.ts';
import { fireSeeds } from '../src/engine/crossroads/seeds.ts';
import { fillVacancies } from '../src/engine/sim.ts';

const CELLS = 36 * 56;
const YEAR = TIME.WEEKS_PER_YEAR;
const GEN = TIME.GENERATION_YEARS * YEAR;
const SEEDS = 20;
const YEARS = 100;
const FOREST = new Set(['forest_cut', 'wolf_winter']);
let bid = 0;
const build = (kind: Building['kind']): Building => ({
  id: ++bid, kind, x: 0, y: 0, w: 2, h: 2, builtTick: 0, lostTick: null, tier: 0, lit: true,
});

function founded(seed: number): GameState {
  bid = 0;
  const rng = makeBundle(seed);
  return {
    version: 1, seed, tick: 0, rng,
    map: {
      width: 36, height: 56,
      terrain: new Uint8Array(CELLS).fill(1, 0, Math.floor(CELLS * 0.45)),
      traffic: new Uint16Array(CELLS), path: new Uint8Array(CELLS),
      ruins: new Uint8Array(CELLS), forestAge: new Uint8Array(CELLS),
    },
    village: { grain: FOUNDING.GRAIN, wood: 900, morale: FOUNDING.MORALE, faith: FOUNDING.FAITH },
    people: foundPeople(rng, 0),
    buildings: [
      ...Array.from({ length: 14 }, () => build('house')),
      ...Array.from({ length: 6 }, () => build('field')),
      build('granary'), build('smithy'),
    ],
    works: [], crossroad: null, seeds: [], flags: {}, chronicle: [], history: [],
    weather: { year: 0, index: 2, factor: 1 }, outbreak: null, ended: null,
  };
}

function carryOut(s: GameState, applied: AppliedEffects): void {
  for (const kind of applied.build) s.buildings.push(build(kind));
  for (const { kind, count: n } of applied.destroy) {
    for (const b of s.buildings.filter((x) => x.kind === kind && x.lostTick === null).slice(0, n)) {
      b.lostTick = s.tick;
    }
  }
}

const eligible = new Map<string, number>();
const fired = new Map<string, number>();
let totalTicks = 0;
let maxDislike = 0;

function tick(s: GameState, trace: { tick: number; id: string }[]): void {
  s.tick += 1;
  if (s.tick % YEAR === 0) {
    s.weather = rollWeather(s);
    const o = rollPlague(s); if (o) s.outbreak = o;
    resolveMigration(s); decayMemories(s); fillVacancies(s);
  }
  if (s.outbreak && s.tick >= s.outbreak.endsTick) s.outbreak = null;
  if (s.crossroad !== null) {
    const id = s.crossroad.templateId;
    const applied = applyOption(s, s.crossroad.optionIds[0] as string, CATALOG);
    if (applied !== null) { carryOut(s, applied); trace.push({ tick: s.tick, id }); fired.set(id, (fired.get(id) ?? 0) + 1); }
  }
  fireSeeds(s, CATALOG);
  const a = allocateLabour(s); produce(s, a);
  const { severity, starved } = consume(s);
  const { cold } = overwinter(s);
  harvest(s, a); applySpoilage(s);
  const partial: TickContext = { severity, cold, outbreak: s.outbreak, deaths: 0, unexplainedDeaths: 0 };
  const dead = resolveDeaths(s, partial);
  const ctx: TickContext = { ...partial, deaths: starved.length + dead.length,
    unexplainedDeaths: dead.filter((d) => isUnexplained(d.cause, d.age)).length };
  updateMood(s, ctx); resolveBirths(s, ctx); driftOpinions(s);

  totalTicks += 1;
  maxDislike = Math.max(maxDislike, deepestDislike(s));
  for (const t of CATALOG) if (all(t.requires, s)) eligible.set(t.id, (eligible.get(t.id) ?? 0) + 1);

  if (s.crossroad === null) { const p = selectCrossroad(s, CATALOG); if (p) s.crossroad = p; }
}

const perGenAll: number[] = []; const perGenNoForest: number[] = [];
const gaps: number[] = []; let ceiling = 0, guarantee = 0, extinct = 0;

for (let seed = 0; seed < SEEDS; seed += 1) {
  const s = founded(seed);
  const trace: { tick: number; id: string }[] = [];
  let ticks = 0;
  for (let i = 0; i < YEARS * YEAR && population(s) > 0; i += 1) { tick(s, trace); ticks += 1; }
  if (population(s) === 0) extinct += 1;
  perGenAll.push((trace.length * GEN) / ticks);
  perGenNoForest.push((trace.filter((t) => !FOREST.has(t.id)).length * GEN) / ticks);
  for (let i = 1; i < trace.length; i += 1) {
    const gap = (trace[i] as { tick: number }).tick - (trace[i - 1] as { tick: number }).tick;
    gaps.push(gap);
    if (gap <= CROSSROADS.MIN_TICKS_BETWEEN + 2) ceiling += 1;
    if (gap >= CROSSROADS.GUARANTEE_TICKS - 2) guarantee += 1;
  }
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const med = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

console.log('\n=== DIAGNOSTICO DEL CATALOGO (§8.1) — dos columnas ===');
console.log('  plantilla                cat          %elegible   disparos   % del tope de reposo');
const rows = CATALOG.map((t) => {
  const n = fired.get(t.id) ?? 0;
  const capacity = t.cooldownYears > 0 ? (SEEDS * YEARS) / t.cooldownYears : Number.POSITIVE_INFINITY;
  return {
    id: t.id, cat: t.category,
    pct: (100 * (eligible.get(t.id) ?? 0)) / totalTicks,
    n, cool: Number.isFinite(capacity) ? (100 * n) / capacity : -1,
  };
}).sort((a, b) => b.n - a.n);
for (const r of rows) {
  const forest = FOREST.has(r.id) ? ' (M-15)' : '';
  const c1 = r.pct > 1 ? '!' : ' ';
  const c2 = r.cool > 70 ? '!' : ' ';
  const coolText = r.cool < 0 ? '     n/a' : `${r.cool.toFixed(0).padStart(6)}%`;
  console.log(`  ${r.id.padEnd(24)} ${r.cat.padEnd(11)} ${r.pct.toFixed(2).padStart(7)}%${c1} ${String(r.n).padStart(8)}   ${coolText}${c2}${forest}`);
}
console.log(`\n  opinion mas honda alcanzada: -${maxDislike.toFixed(0)}`);
console.log('\n=== CADENCIA ===');
console.log(`  POR GENERACION, sin las dos de bosque   media ${mean(perGenNoForest).toFixed(2)}   mediana ${med(perGenNoForest).toFixed(2)}   rango ${Math.min(...perGenNoForest).toFixed(2)}-${Math.max(...perGenNoForest).toFixed(2)}   [PUERTA: 1-4]`);
console.log(`  por generacion, con todas              media ${mean(perGenAll).toFixed(2)}`);
console.log(`  pegado al techo                        ${((100 * ceiling) / gaps.length).toFixed(1)}%`);
console.log(`  forzado por garantia                   ${((100 * guarantee) / gaps.length).toFixed(1)}%`);
console.log(`  extinciones                            ${extinct}/${SEEDS}`);
console.log('');
