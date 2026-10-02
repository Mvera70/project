// K5 · Qué falta hoy para que la caza y la recolección dejen materia. 2 oct 2026.
//
// La pregunta de la ronda (docs/plan-meta.md, K5): Vera quiere cuero de la
// caza, lino y plantas que la aldea use. Antes de proponer ninguno se mide en
// `main`, con `run` y la política prudente (nunca `tick` en un bucle: CLAUDE.md,
// la trampa de v2.0), y en horas a ×1:
//
//   · cuántas piezas da la caza física si el jugador toca **todas** las señales
//     y acierta siempre (la cota de arriba), con honda sola y con arco y lanza
//     dados desde el principio: cuánto cuero podría salir;
//   · cuándo sale la aldea a cazar o pescar sola por hambre (`forage.*`);
//   · cuándo están abiertas en el tablón las setas y las hierbas;
//   · qué aprieta en cada tramo: plata, madera, grano en años, ánimo, y de qué
//     se muere la gente (frío, peste, hambre…), que es donde entrarían el
//     cuero, el lino o las plantas.
//
//   npx tsx tools/reports/k5-report.ts                 # 12 semillas × 60 años
//   npx tsx tools/reports/k5-report.ts --seeds 6 --years 40
//   npx tsx tools/reports/k5-report.ts --after         # el cuero ya hecho (v5.75)
//   npx tsx tools/reports/k5-report.ts --flax          # antes del lino (v5.76)
//   npx tsx tools/reports/k5-report.ts --linen         # el lino ya hecho (v5.76)
//
// Con `--linen` juega cada valle dos veces: sin pedir nada a la sastrería, y
// pidiendo el campo de lino y la ropa cada vez que el tablón lo deja. Da, en
// horas a ×1 y por tramo, el ánimo, la gente, el hambre y el lienzo.
//
// Con `--flax` mide lo que decide un campo de lino: cuántos campos tiene la
// aldea y si está en el tope, cuánto sobra de cada cosecha sobre lo que se
// come, cuántas veces sube el factor a comprar grano sobrante, cuánto sitio
// libre para un campo queda cerca de la plaza, y **qué pasa si un campo deja de
// dar grano** (el contrafactual: en cada siega se quita la parte de un campo,
// desde que hay cuatro): hambre, muertos de hambre y valles acabados.
//
// Con `--after` mide el cuero: un jugador que dio arco y lanza y toca una de
// cada `--tap` señales (1 = todas, la cota de arriba), y que **guarda** las
// pieles o **las vende** al buhonero. Da, en horas a ×1, cuándo junta las seis
// de los petos, cuántas tiene cuando el clan avisa por primera vez, y cuánta
// plata trae el cuero vendido.

import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';
import { run } from '../../src/engine/sim';
import type { DeathCause, GameState, PlayerAct } from '../../src/engine/state';
import { ringClosed } from '../../src/engine/world/placement';
import { nextProject } from '../../src/engine/world/works';
import { huntOpportunity, type HuntOpportunity, type HuntSpecies } from '../../src/engine/world/hunting';
import { missionsOpen } from '../../src/engine/world/expeditions';
import { BOARDS, FOOD } from '../../src/engine/balance';
import { canPlace } from '../../src/engine/world/placement';
import { tailorOrdersOpen } from '../../src/engine/world/tailor';
import { seasonOf } from '../../src/engine/time';
import { hash32 } from '../../src/engine/rng';
import { alive } from './ladder';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const SEED_COUNT = arg('seeds', 12);
const YEARS = arg('years', 60);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 3 + i * 7);
const WEEKS = YEARS * TIME.WEEKS_PER_YEAR;

const hours = (ticks: number): number => (ticks * TIME.REAL_MS_PER_TICK) / 3_600_000;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? Number.NaN : s[Math.floor(s.length / 2)]!;
};
const fmt = (h: number): string => (Number.isNaN(h) ? '—' : `${h.toFixed(h < 10 ? 1 : 0)} h`);
const pct = (a: number, b: number): string => (b === 0 ? '—' : `${Math.round((100 * a) / b)} %`);

type Phase = 'caserío (< 12)' | 'aldea, sin herrería' | 'herrería, sin cerco' | 'villa cerrada';
const PHASES: readonly Phase[] = ['caserío (< 12)', 'aldea, sin herrería', 'herrería, sin cerco', 'villa cerrada'];
const phaseOf = (s: GameState): Phase => {
  if (ringClosed(s)) return 'villa cerrada';
  if (alive(s, 'smithy') > 0) return 'herrería, sin cerco';
  if (population(s) >= 12) return 'aldea, sin herrería';
  return 'caserío (< 12)';
};

interface Tally {
  weeks: number; hours: number; hungry: number; waitingWood: number; lowMorale: number; cold: number;
  foraging: number; mushrooms: number; herbs: number;
  silver: number[]; grainYears: number[]; fields: number[]; people: number[];
  kills: Record<HuntSpecies, number>;
  deaths: Partial<Record<DeathCause, number>>;
}
const blank = (): Tally => ({
  weeks: 0, hours: 0, hungry: 0, waitingWood: 0, lowMorale: 0, cold: 0, foraging: 0, mushrooms: 0, herbs: 0,
  silver: [], grainYears: [], fields: [], people: [],
  kills: { partridge: 0, rabbit: 0, deer: 0, boar: 0, bear: 0 }, deaths: {},
});

/**
 * Dos jugadores de caza, los dos cota de arriba: tocan todas las señales y
 * aciertan siempre. `sling` es la honda sola (lo que el valle tiene sin dar
 * nada); `armed` tiene arco y lanza desde la fundación, como si se hubieran
 * dado `bows` y `arms` el primer día.
 */
type Hunter = 'sling' | 'armed';

function play(seed: number, hunter: Hunter): { tallies: Map<Phase, Tally>; firstHide: number | null; ended: boolean } {
  const tallies = new Map(PHASES.map((p) => [p, blank()]));
  const state = foundGame(seed);
  if (hunter === 'armed') state.traits.push('bows', 'arms');
  let pending: HuntOpportunity | null = null;
  let firstHide: number | null = null;
  for (let t = 1; t <= WEEKS && state.ended === null; t += 1) {
    const offered = pending;
    const acts: PlayerAct[] = offered === null ? [] : [{
      kind: 'hunt', sourceTick: offered.tick, species: offered.species,
      weapon: offered.weapons[offered.weapons.length - 1]!, hits: 1, killed: true,
    }];
    const phase = phaseOf(state);
    const tally = tallies.get(phase)!;
    const open = missionsOpen(state);
    if (open.some((m) => m.id === 'mushrooms' && m.refusal === null)) tally.mushrooms += 1;
    if (open.some((m) => m.id === 'herbs' && m.refusal === null)) tally.herbs += 1;
    const [report] = run(state, 1, 'prudent', CATALOG, () => acts);
    if (report === undefined) break;
    if (offered !== null && state.flags[`hunt:${offered.species}`] === 0) {
      tally.kills[offered.species] += 1;
      if (firstHide === null && (offered.species === 'deer' || offered.species === 'boar' || offered.species === 'bear')) {
        firstHide = hours(state.tick);
      }
    }
    pending = huntOpportunity(state);
    tally.weeks += 1;
    const pop = population(state);
    if (state.village.grain < pop) tally.hungry += 1;
    if (nextProject(state) === null && nextProject({ ...state }, Number.POSITIVE_INFINITY) !== null) tally.waitingWood += 1;
    if (state.village.morale < 40) tally.lowMorale += 1;
    if (report.cold) tally.cold += 1;
    if (report.entries.some((e) => e.templateKey.startsWith('forage.hunt') || e.templateKey.startsWith('forage.both'))) tally.foraging += 1;
    for (const d of report.deaths) tally.deaths[d.cause] = (tally.deaths[d.cause] ?? 0) + 1;
    tally.silver.push(state.village.silver);
    tally.grainYears.push(pop === 0 ? 0 : state.village.grain / (pop * TIME.WEEKS_PER_YEAR));
    tally.fields.push(alive(state, 'field'));
    tally.people.push(pop);
  }
  for (const t of tallies.values()) t.hours = hours(t.weeks);
  return { tallies, firstHide, ended: state.ended !== null };
}

const AFTER = process.argv.includes('--after');
const FLAX = process.argv.includes('--flax');
const LINEN = process.argv.includes('--linen');

interface LinenTally { weeks: number; hours: number; lowMorale: number; hungry: number; hungerDeaths: number; linen: number; waitingWood: number; winterMorale: number[]; morale: number[]; people: number[] }
const linenBlank = (): LinenTally => ({ weeks: 0, hours: 0, lowMorale: 0, hungry: 0, hungerDeaths: 0, linen: 0, waitingWood: 0, winterMorale: [], morale: [], people: [] });

/** Un valle que pide (`ask`) o no el lino y la ropa cada vez que el tablón lo deja. */
function linenRun(seed: number, ask: boolean): { tallies: Map<Phase, LinenTally>; ended: boolean; tailorAt: number | null; firstLinen: number | null } {
  const tallies = new Map(PHASES.map((p) => [p, linenBlank()]));
  const state = foundGame(seed);
  let tailorAt: number | null = null;
  let firstLinen: number | null = null;
  const acts = (s: GameState): PlayerAct[] => (ask
    ? tailorOrdersOpen(s).filter((o) => o.refusal === null).map((o) => ({ kind: 'tailor', order: o.id }) as PlayerAct)
    : []);
  for (let t = 1; t <= WEEKS && state.ended === null; t += 1) {
    const tally = tallies.get(phaseOf(state))!;
    const [report] = run(state, 1, 'prudent', CATALOG, acts);
    if (report === undefined) break;
    if (tailorAt === null && alive(state, 'tailor') > 0) tailorAt = hours(state.tick);
    const made = report.entries.find((e) => e.templateKey === 'tailor.flax.harvest');
    if (made !== undefined) {
      tally.linen += Number(made.params['linen']);
      if (firstLinen === null) firstLinen = hours(state.tick);
    }
    const pop = population(state);
    tally.weeks += 1;
    if (state.village.morale < 40) tally.lowMorale += 1;
    if (state.village.grain < pop) tally.hungry += 1;
    tally.hungerDeaths += report.deaths.filter((d) => d.cause === 'hunger').length;
    tally.morale.push(Math.round(state.village.morale));
    if (seasonOf(state.tick) === 'winter') tally.winterMorale.push(Math.round(state.village.morale));
    if (nextProject(state) === null && nextProject({ ...state }, Number.POSITIVE_INFINITY) !== null) tally.waitingWood += 1;
    tally.people.push(pop);
  }
  for (const t of tallies.values()) t.hours = hours(t.weeks);
  return { tallies, ended: state.ended !== null, tailorAt, firstLinen };
}

if (LINEN) {
  for (const ask of [false, true]) {
    const total = new Map(PHASES.map((p) => [p, linenBlank()]));
    let ended = 0;
    const tailors: number[] = [];
    const linens: number[] = [];
    for (const seed of SEEDS) {
      const r = linenRun(seed, ask);
      if (r.ended) ended += 1;
      if (r.tailorAt !== null) tailors.push(r.tailorAt);
      if (r.firstLinen !== null) linens.push(r.firstLinen);
      for (const p of PHASES) {
        const a = total.get(p)!; const b = r.tallies.get(p)!;
        for (const k of ['weeks', 'hours', 'lowMorale', 'hungry', 'hungerDeaths', 'linen', 'waitingWood'] as const) a[k] += b[k];
        a.morale.push(...b.morale); a.winterMorale.push(...b.winterMorale); a.people.push(...b.people);
      }
    }
    console.log(`\n# Lino · ${ask ? 'pidiendo lino y ropa siempre que se puede' : 'sin pedir nada a la sastrería'} · ${SEEDS.length} semillas × ${YEARS} años · prudent · horas a ×1\n`);
    console.log(`sastrería: mediana ${fmt(median(tailors))}, ${tailors.length}/${SEEDS.length} valles · primer lienzo: ${linens.length === 0 ? '—' : `mediana ${fmt(median(linens))}`} · partidas acabadas ${ended}/${SEEDS.length}\n`);
    console.log('| tramo | gente | ánimo (mediana) | ánimo en invierno | ánimo < 40 | obra esperando madera | hambre (sem.) | muertos de hambre por 100 h | lienzo por 10 h |');
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const p of PHASES) {
      const t = total.get(p)!;
      const per = (x: number, h: number): string => (t.hours === 0 ? '—' : (h * x / t.hours).toFixed(1));
      console.log(`| ${p} | ${median(t.people)} | ${median(t.morale)} | ${median(t.winterMorale)} | ${pct(t.lowMorale, t.weeks)} | ${pct(t.waitingWood, t.weeks)} | ${pct(t.hungry, t.weeks)} | ${per(t.hungerDeaths, 100)} | ${per(t.linen, 10)} |`);
    }
  }
}

interface FlaxTally {
  weeks: number; hours: number; hungry: number; hungerDeaths: number; atCap: number; factor: number;
  fields: number[]; margin: number[]; sites: number[]; people: number[];
}
const flaxBlank = (): FlaxTally => ({ weeks: 0, hours: 0, hungry: 0, hungerDeaths: 0, atCap: 0, factor: 0, fields: [], margin: [], sites: [], people: [] });

/** Sitios libres para un campo a menos de `SITE_RADIUS` celdas de la plaza. */
const SITE_RADIUS = 18;
function fieldSites(state: GameState): number {
  let n = 0;
  const { x: px, y: py } = state.plaza;
  for (let y = Math.floor(py - SITE_RADIUS); y <= py + SITE_RADIUS; y += 1) {
    for (let x = Math.floor(px - SITE_RADIUS); x <= px + SITE_RADIUS; x += 1) {
      if (Math.hypot(x - px, y - py) > SITE_RADIUS) continue;
      if (canPlace(state, 'field', x, y)) n += 1;
    }
  }
  return n;
}

/** Un valle, con o sin un campo que no da grano (`lose`). */
function flaxRun(seed: number, lose: boolean): { tallies: Map<Phase, FlaxTally>; ended: boolean } {
  const tallies = new Map(PHASES.map((p) => [p, flaxBlank()]));
  const state = foundGame(seed);
  for (let t = 1; t <= WEEKS && state.ended === null; t += 1) {
    const tally = tallies.get(phaseOf(state))!;
    const [report] = run(state, 1, 'prudent', CATALOG);
    if (report === undefined) break;
    const pop = population(state);
    const fields = alive(state, 'field');
    if (report.harvested > 0) {
      if (lose && fields >= 4) state.village.grain = Math.max(0, state.village.grain - report.harvested / fields);
      if (pop > 0) tally.margin.push(report.harvested / (pop * TIME.WEEKS_PER_YEAR));
    }
    tally.weeks += 1;
    if (state.village.grain < pop) tally.hungry += 1;
    tally.hungerDeaths += report.deaths.filter((d) => d.cause === 'hunger').length;
    if (fields >= FOOD.MAX_FIELDS) tally.atCap += 1;
    if (report.entries.some((e) => e.templateKey.startsWith('fate.factor_visit'))) tally.factor += 1;
    tally.fields.push(fields);
    tally.people.push(pop);
    if (!lose && state.tick % TIME.WEEKS_PER_YEAR === 0) tally.sites.push(fieldSites(state));
  }
  for (const t of tallies.values()) t.hours = hours(t.weeks);
  return { tallies, ended: state.ended !== null };
}

if (FLAX) {
  for (const lose of [false, true]) {
    const total = new Map(PHASES.map((p) => [p, flaxBlank()]));
    let ended = 0;
    for (const seed of SEEDS) {
      const r = flaxRun(seed, lose);
      if (r.ended) ended += 1;
      for (const p of PHASES) {
        const a = total.get(p)!; const b = r.tallies.get(p)!;
        for (const k of ['weeks', 'hours', 'hungry', 'hungerDeaths', 'atCap', 'factor'] as const) a[k] += b[k];
        a.fields.push(...b.fields); a.margin.push(...b.margin); a.sites.push(...b.sites); a.people.push(...b.people);
      }
    }
    console.log(`\n# Lino · ${lose ? 'un campo sin grano (contrafactual)' : 'el valle de hoy'} · ${SEEDS.length} semillas × ${YEARS} años · prudent · horas a ×1\n`);
    console.log(`partidas acabadas: ${ended}/${SEEDS.length}\n`);
    console.log(`| tramo | gente | campos | en el tope (${FOOD.MAX_FIELDS}) | cosecha / lo que se come | hambre (sem.) | muertos de hambre por 100 h | factor por 10 h | sitios libres para un campo a ${SITE_RADIUS} de la plaza |`);
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const p of PHASES) {
      const t = total.get(p)!;
      const per = (x: number, h: number): string => (t.hours === 0 ? '—' : (h * x / t.hours).toFixed(1));
      console.log(`| ${p} | ${median(t.people)} | ${median(t.fields)} | ${pct(t.atCap, t.weeks)} | ${Number.isNaN(median(t.margin)) ? '—' : median(t.margin).toFixed(2)} | ${pct(t.hungry, t.weeks)} | ${per(t.hungerDeaths, 100)} | ${per(t.factor, 10)} | ${lose ? '—' : median(t.sites)} |`);
    }
  }
}

/** K5 · el cuero, ya hecho: ¿hay petos a tiempo, y cuánto da venderlo? */
function leather(seed: number, tap: number, sell: boolean): {
  sixHides: number | null; atWarning: number | null; silverFromHides: number; pedlarHides: number; hours: number;
} {
  const state = foundGame(seed);
  state.traits.push('bows', 'arms');
  let pending: HuntOpportunity | null = null;
  let sixHides: number | null = null;
  let atWarning: number | null = null;
  let silverFromHides = 0;
  let pedlarHides = 0;
  for (let t = 1; t <= WEEKS && state.ended === null; t += 1) {
    const offered = pending !== null && hash32(seed, `k5:tap:${pending.tick}`) % tap === 0 ? pending : null;
    const acts: PlayerAct[] = offered === null ? [] : [{
      kind: 'hunt', sourceTick: offered.tick, species: offered.species,
      weapon: offered.weapons[offered.weapons.length - 1]!, hits: 1, killed: true,
    }];
    const asksHides = state.offer?.id === 'pedlar' && state.offer.takes.some((g) => g.k === 'stat' && g.stat === 'hides');
    if (sell && asksHides) acts.push({ kind: 'offer', accept: true });
    const before = state.village.silver;
    const [report] = run(state, 1, 'prudent', CATALOG, () => acts);
    if (report === undefined) break;
    if (report.entries.some((e) => e.templateKey === 'fate.pedlar.hides')) pedlarHides += 1;
    if (report.offer?.accepted === true && asksHides) silverFromHides += state.village.silver - before;
    if (sixHides === null && state.village.hides >= BOARDS.ORDERS.jerkins.hides) sixHides = hours(state.tick);
    if (atWarning === null && report.entries.some((e) => e.templateKey === 'raid.coming')) atWarning = state.village.hides;
    pending = huntOpportunity(state);
  }
  return { sixHides, atWarning, silverFromHides, pedlarHides, hours: hours(state.tick) };
}

if (AFTER) {
  const tap = arg('tap', 3);
  console.log(`\n# K5 · el cuero · ${SEEDS.length} semillas × ${YEARS} años · arco y lanza dados · una de cada ${tap} señales · horas a ×1\n`);
  console.log('| jugador | seis pieles (petos) | valles | pieles al primer aviso del clan (mediana) | con petos pagables al aviso | buhonero pidiendo pieles, por 10 h | plata del cuero, por 10 h |');
  console.log('|---|---:|---:|---:|---:|---:|---:|');
  for (const sell of [false, true]) {
    const rows = SEEDS.map((seed) => leather(seed, tap, sell));
    const six = rows.flatMap((r) => (r.sixHides === null ? [] : [r.sixHides]));
    const warned = rows.flatMap((r) => (r.atWarning === null ? [] : [r.atWarning]));
    const totalHours = rows.reduce((n, r) => n + r.hours, 0);
    const per10 = (x: number): string => (10 * x / totalHours).toFixed(2);
    console.log(`| ${sell ? 'vende al buhonero' : 'guarda'} | ${fmt(median(six))} | ${six.length}/${rows.length} | ${median(warned)} | ${warned.filter((h) => h >= BOARDS.ORDERS.jerkins.hides).length}/${warned.length} | ${per10(rows.reduce((n, r) => n + r.pedlarHides, 0))} | ${per10(rows.reduce((n, r) => n + r.silverFromHides, 0))} |`);
  }
}

for (const hunter of AFTER || FLAX || LINEN ? [] : (['sling', 'armed'] as const)) {
  const total = new Map(PHASES.map((p) => [p, blank()]));
  const hides: number[] = [];
  let ended = 0;
  for (const seed of SEEDS) {
    const { tallies, firstHide, ended: e } = play(seed, hunter);
    if (e) ended += 1;
    if (firstHide !== null) hides.push(firstHide);
    for (const p of PHASES) {
      const a = total.get(p)!; const b = tallies.get(p)!;
      for (const k of ['weeks', 'hours', 'hungry', 'waitingWood', 'lowMorale', 'cold', 'foraging', 'mushrooms', 'herbs'] as const) a[k] += b[k];
      a.silver.push(...b.silver); a.grainYears.push(...b.grainYears); a.fields.push(...b.fields); a.people.push(...b.people);
      for (const s of Object.keys(a.kills) as HuntSpecies[]) a.kills[s] += b.kills[s];
      for (const [c, n] of Object.entries(b.deaths)) a.deaths[c as DeathCause] = (a.deaths[c as DeathCause] ?? 0) + n;
    }
  }
  const n = SEEDS.length;
  console.log(`\n# Caza «${hunter === 'sling' ? 'honda sola' : 'arco y lanza desde el principio'}» · ${n} semillas × ${YEARS} años · prudent · horas a ×1`);
  console.log(`\nprimera pieza grande (ciervo, jabalí, oso): mediana ${fmt(median(hides))}, ${hides.length}/${n} valles · partidas acabadas ${ended}/${n}\n`);
  console.log('| tramo | horas (suma) | piezas por 10 h: perdiz · conejo · ciervo · jabalí · oso | grandes por 10 h |');
  console.log('|---|---:|---|---:|');
  for (const p of PHASES) {
    const t = total.get(p)!;
    const per10 = (x: number): string => (t.hours === 0 ? '—' : (10 * x / t.hours).toFixed(1));
    const big = t.kills.deer + t.kills.boar + t.kills.bear;
    console.log(`| ${p} | ${Math.round(t.hours)} | ${per10(t.kills.partridge)} · ${per10(t.kills.rabbit)} · ${per10(t.kills.deer)} · ${per10(t.kills.boar)} · ${per10(t.kills.bear)} | ${per10(big)} |`);
  }
  if (hunter === 'armed') continue;
  console.log('\n## Qué aprieta en cada tramo (fracción de semanas; existencias en mediana)\n');
  console.log('| tramo | gente | campos | hambre | grano (años) | obra esperando madera | ánimo < 40 | invierno sin leña | temporadas de caza por hambre, por 10 h | plata | setas abiertas | hierbas abiertas |');
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const p of PHASES) {
    const t = total.get(p)!;
    console.log(`| ${p} | ${median(t.people)} | ${median(t.fields)} | ${pct(t.hungry, t.weeks)} | ${median(t.grainYears).toFixed(1)} | ${pct(t.waitingWood, t.weeks)} | ${pct(t.lowMorale, t.weeks)} | ${pct(t.cold, t.weeks)} | ${t.hours === 0 ? '—' : (10 * t.foraging / t.hours).toFixed(1)} | ${median(t.silver)} | ${pct(t.mushrooms, t.weeks)} | ${pct(t.herbs, t.weeks)} |`);
  }
  console.log('\n## De qué se muere, por cada 100 horas a ×1 del tramo\n');
  const causes: DeathCause[] = ['old_age', 'natural', 'hunger', 'cold', 'plague', 'fire', 'violence', 'mishap'];
  console.log(`| tramo | ${causes.join(' | ')} |`);
  console.log(`|---|${causes.map(() => '---:').join('|')}|`);
  for (const p of PHASES) {
    const t = total.get(p)!;
    console.log(`| ${p} | ${causes.map((c) => (t.hours === 0 ? '—' : (100 * (t.deaths[c] ?? 0) / t.hours).toFixed(1))).join(' | ')} |`);
  }
}
