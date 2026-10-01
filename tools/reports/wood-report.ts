// K1–K3 (1 oct 2026) · **La madera: si aprieta, cuándo y dónde se tala.**
//
// Lo pidió Vera el 1 oct 2026 (`docs/plan-meta.md` §K): el bosque se gasta
// dentro del cerco, se reproduce en focos, y la madera pesa de verdad. La
// trampa que el goal dejó escrita: despejar el interior y hacer crecer focos
// fuera puede cambiar el mapa **sin que la madera apriete nunca**, porque hoy
// el motor saca la madera sin coste por distancia. Así que primero se define
// qué es una escasez que el jugador nota y se mide aquí, antes y después.
//
// **La definición** (`docs/medidas/k1-k3-madera-2026-10-01.md`):
//
//   gasto      = lo que la aldea quema en un invierno (12 semanas de 48) más lo que pagó en
//                obras el último año, por semana (media móvil de un año)
//   cobertura  = leñera / gasto, en semanas
//   escasez    = cobertura < `SHORT_WEEKS` y, en esa racha, **una consecuencia**:
//                una semana de frío (la leñera vacía en invierno, §5.4) o una
//                obra que se abriría con leña y no se abre por falta de ella
//
// Una partida «escasea alguna vez» si tiene al menos una racha así. Se juega con
// `run` y la política prudente (CLAUDE.md: `tick` en un bucle no mide este
// juego), y todo lo que dice *cuándo* va en horas de reloj a ×1.
//
//   npx tsx tools/reports/wood-report.ts                  # 12 semillas × 60 años
//   npx tsx tools/reports/wood-report.ts --seeds 6 --years 40 [--from 1]

import { LABOUR, TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';
import { run } from '../../src/engine/sim';
import { TERRAIN_CODE, type GameState } from '../../src/engine/state';
import { fellingTarget, woodHaul } from '../../src/engine/world/forest';
import { nextProject, woodCostOf } from '../../src/engine/world/works';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const SEEDS = arg('seeds', 12);
const FROM = arg('from', 1);
const YEARS = arg('years', 60);
/** Semanas de cobertura por debajo de las cuales la leñera está corta: un mes, una hora a ×1. */
const SHORT_WEEKS = arg('short', 4);
/** Una racha que se nota: un mes entero (una hora a ×1) o más. */
const SERIOUS_WEEKS = arg('serious', 4);
/** Una racha es «por el bosque» si en ella el leñador traía menos de esto por lo lejos que talaba (K3). */
const FOREST_HAUL = 0.9;

const hours = (ticks: number): number => (ticks * TIME.REAL_MS_PER_TICK) / 3_600_000;
const plazaOf = (s: GameState): { x: number; y: number } => ({ x: s.plaza.x + 0.5, y: s.plaza.y + 0.5 });

/** Celdas de bosque dentro de un radio desde la plaza, y fuera. */
function forestSplit(s: GameState, radius: number, terrain: ArrayLike<number> = s.map.terrain): { inside: number; outside: number } {
  const c = plazaOf(s);
  let inside = 0, outside = 0;
  for (let i = 0; i < terrain.length; i += 1) {
    if (terrain[i] !== TERRAIN_CODE.forest) continue;
    const d = Math.hypot((i % s.map.width) + 0.5 - c.x, Math.floor(i / s.map.width) + 0.5 - c.y);
    if (d < radius) inside += 1; else outside += 1;
  }
  return { inside, outside };
}

/**
 * Si, con leña de sobra, la aldea abriría ahora una obra que hoy no abre. Sobre
 * copias superficiales, como `doingNow`: elegir sitio puede fijar el anillo.
 */
function waitingForWood(s: GameState): boolean {
  if (s.works.length > 0) return false;
  if (nextProject({ ...s }) !== null) return false;
  return nextProject({ ...s }, Number.POSITIVE_INFINITY) !== null;
}

interface Row {
  seed: number;
  ended: string | null;
  ringAt: number | null;
  closedAt: number | null;
  radius: number | null;
  /** Bosque dentro del radio final del cerco: al fundar, al trazarse, al cerrarse y al final. */
  inside: { start: number; ring: number | null; closed: number | null; end: number };
  forestEnd: number;
  forestStart: number;
  /** Distancia media de tala desde la plaza, por tramo de horas. */
  fellDist: Map<number, number[]>;
  shortWeeks: number;
  coldWeeks: number;
  waitWeeks: number;
  episodes: { at: number; weeks: number; cold: number; wait: number; byWork: boolean; haul: number }[];
}

const SPANS = [0, 10, 60, 120, 240, 480];
const spanOf = (h: number): number => [...SPANS].reverse().find((s) => h >= s)!;

function play(seed: number): Row {
  const s = foundGame(seed);
  const total = s.map.terrain.reduce((n: number, t: number) => n + (t === TERRAIN_CODE.forest ? 1 : 0), 0);
  const start = Array.from(s.map.terrain);
  const spent: number[] = [];
  const row: Row = {
    seed, ended: null, ringAt: null, closedAt: null, radius: null,
    inside: { start: 0, ring: null, closed: null, end: 0 }, forestEnd: 0, forestStart: total,
    fellDist: new Map(), shortWeeks: 0, coldWeeks: 0, waitWeeks: 0, episodes: [],
  };
  let ringSnap: Uint8Array | null = null, closedSnap: Uint8Array | null = null;
  let episode: Row['episodes'][number] | null = null;
  for (let week = 0; week < YEARS * TIME.WEEKS_PER_YEAR && s.ended === null; week += 1) {
    const works = new Set(s.works.map((w) => w.id));
    const [report] = run(s, 1, 'prudent', CATALOG);
    if (report === undefined) break;
    const h = hours(s.tick);
    // Lo que se pagó en obra esta semana: las obras nuevas, a su precio.
    const paid = s.works.filter((w) => !works.has(w.id)).reduce((n, w) => n + woodCostOf(s, w.kind), 0);
    spent.push(paid);
    if (spent.length > TIME.WEEKS_PER_YEAR) spent.shift();
    const winter = population(s) * LABOUR.WINTER_WOOD * TIME.WEEKS_PER_SEASON / TIME.WEEKS_PER_YEAR;
    const rate = winter + spent.reduce((a, b) => a + b, 0) / spent.length;
    const cover = rate > 0 ? s.village.wood / rate : Number.POSITIVE_INFINITY;
    const cold = report.cold;
    const wait = waitingForWood(s);
    const short = cover < SHORT_WEEKS;
    if (short) row.shortWeeks += 1;
    if (cold) row.coldWeeks += 1;
    if (wait) row.waitWeeks += 1;
    if (short || cold) {
      episode ??= { at: h, weeks: 0, cold: 0, wait: 0, byWork: paid > 0, haul: 1 };
      episode.haul = Math.min(episode.haul, woodHaul(s));
      episode.weeks += 1;
      if (cold) episode.cold += 1;
      if (wait) episode.wait += 1;
    } else if (episode !== null) {
      if (episode.cold + episode.wait > 0) row.episodes.push(episode);
      episode = null;
    }
    if (report.felled > 0) {
      const cell = fellingTarget(s);
      if (cell !== null) {
        const c = plazaOf(s);
        const d = Math.hypot((cell % s.map.width) + 0.5 - c.x, Math.floor(cell / s.map.width) + 0.5 - c.y);
        const span = spanOf(h);
        row.fellDist.set(span, [...(row.fellDist.get(span) ?? []), d]);
      }
    }
    if (row.ringAt === null && s.ring !== null) { row.ringAt = h; ringSnap = Uint8Array.from(s.map.terrain); }
    if (row.closedAt === null && s.flags['wall_closed'] !== undefined) { row.closedAt = h; closedSnap = Uint8Array.from(s.map.terrain); }
  }
  if (episode !== null && episode.cold + episode.wait > 0) row.episodes.push(episode);
  row.ended = s.ended?.cause ?? null;
  row.radius = s.ring;
  const radius = s.ring ?? 12;
  const count = (terrain: ArrayLike<number>): number => forestSplit(s, radius, terrain).inside;
  row.inside = {
    start: count(start), ring: ringSnap === null ? null : count(ringSnap),
    closed: closedSnap === null ? null : count(closedSnap), end: forestSplit(s, radius).inside,
  };
  row.forestEnd = forestSplit(s, 0).outside;
  return row;
}

const pct = (a: number, b: number): string => (b > 0 ? `${Math.round((100 * a) / b)} %` : '—');
const fx = (v: number | null, d = 0): string => (v === null ? '—' : v.toFixed(d));
const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

console.log(`K1–K3 · la madera, ${SEEDS} semillas desde la ${FROM} × ${YEARS} años, política prudente, a ×1`);
console.log(`escasez: cobertura < ${SHORT_WEEKS} semanas de gasto con frío u obra esperando por leña\n`);
const rows: Row[] = [];
for (let seed = FROM; seed < FROM + SEEDS; seed += 1) {
  const r = play(seed);
  rows.push(r);
  const dist = SPANS.map((span) => fx(median(r.fellDist.get(span) ?? []), 1)).join(' / ');
  console.log(`semilla ${String(seed).padStart(3)}  cerco ${fx(r.ringAt).padStart(4)} h · cerrado ${fx(r.closedAt).padStart(4)} h · r ${fx(r.radius)}`
    + `  bosque dentro: ${r.inside.start} → ${fx(r.inside.ring)} → ${fx(r.inside.closed)} → ${r.inside.end}`
    + `  en pie ${pct(r.forestEnd, r.forestStart)}`
    + `  tala (h ${SPANS.join('/')}): ${dist}`
    + `  corta ${r.shortWeeks} · frío ${r.coldWeeks} · obra espera ${r.waitWeeks} · rachas ${r.episodes.length}`
    + (r.episodes.length > 0 ? ` (primera a las ${r.episodes[0]!.at.toFixed(0)} h)` : '')
    + (r.ended !== null ? `  [${r.ended}]` : ''));
}
// Las rachas, una a una: cuándo, cuánto duran y qué trajeron.
for (const r of rows) {
  if (r.episodes.length === 0) continue;
  console.log(`  ${String(r.seed).padStart(3)}: ${r.episodes.map((e) => `${e.at.toFixed(0)} h ${e.weeks} sem (frío ${e.cold}, obra ${e.wait}${e.byWork ? ', la abrió una obra' : ''}, acarreo ${e.haul.toFixed(2)})`).join(' · ')}`);
}
const serious = (e: Row['episodes'][number]): boolean => e.weeks >= SERIOUS_WEEKS && (e.cold >= 2 || e.wait >= SERIOUS_WEEKS);
const grave = rows.filter((r) => r.episodes.some(serious)).length;
const all = rows.flatMap((r) => r.episodes);
// Por el bosque: en la racha, el leñador traía menos por lo lejos que talaba.
const byForest = rows.filter((r) => r.episodes.some((e) => serious(e) && e.haul < FOREST_HAUL)).length;
const opened = all.filter((e) => e.byWork).length;
const scarce = rows.filter((r) => r.episodes.length > 0).length;
const closed = rows.filter((r) => r.closedAt !== null);
console.log(`\nescasea alguna vez: ${scarce} de ${rows.length} (${pct(scarce, rows.length)})`);
console.log(`rachas abiertas por el pago de una obra esa misma semana: ${opened} de ${all.length}`);
console.log(`y seria con el bosque lejos (acarreo < ${FOREST_HAUL}): ${byForest} de ${rows.length} (${pct(byForest, rows.length)})`);
console.log(`y de verdad (una racha de ${SERIOUS_WEEKS}+ semanas con dos de frío o ${SERIOUS_WEEKS}+ de obra parada): ${grave} de ${rows.length} (${pct(grave, rows.length)})`);
console.log(`cerco cerrado en ${closed.length} de ${rows.length}; bosque dentro al cerrarse, mediana ${pct(
  median(closed.map((r) => r.inside.closed! / Math.max(1, r.inside.start))) ?? 0, 1)} del de la fundación`);
console.log(`bosque en pie al final, mediana ${pct(median(rows.map((r) => r.forestEnd / r.forestStart)) ?? 0, 1)}`);
for (const span of SPANS) {
  console.log(`tala desde la hora ${span}: mediana ${fx(median(rows.flatMap((r) => r.fellDist.get(span) ?? [])), 1)} celdas de la plaza`);
}
