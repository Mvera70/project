// K7 · De qué muere una aldea, y cuándo empezó a torcerse. 2 oct 2026.
//
// La pregunta de K7 no es cuántas caen —eso lo mide `lethality-report.ts`— sino
// **si se puede contar por qué**: para cada valle que acaba, el punto a partir
// del cual ya no tenía vuelta, cuántas horas de reloj a ×1 antes del final, qué
// lo empujó y qué decidió el jugador cerca de ese punto.
//
// El punto de no retorno se define por causa, con lo que el motor ya calcula:
//
//  · `stormed`  — el arranque del último tramo, sin cortes hasta el final, en
//    que **la partida que bajaría** (la fuerza del clan por su parte de la
//    tentación, `world/threat.ts`) ya cuadruplica lo que el valle pone contra
//    ella (`resistance` × `STORM_ODDS`). Desde ahí, cualquier año que bajen
//    entran.
//  · `abandoned`, `extinction` — el arranque del último tramo por debajo de
//    `VIABLE_POPULATION` habitantes.
//  · `dispersed` — la primera de las negativas seguidas al líder
//    (`succession:no_one`) que acabaron en la dispersión.
//
// Se juega con `run` y la política prudente (y otras, si se piden), nunca con
// `tick` en un bucle. Caer es raro: por eso la banda de semillas se elige
// (`--from`, `--step`) y por omisión es la de `pace-report`, la que más cae
// (`lethality-report.ts`, 19 sep 2026: 9 de 30 en cien años).
//
//   npx tsx tools/reports/fall-report.ts                       # 30 semillas × 100 años
//   npx tsx tools/reports/fall-report.ts --seeds 12 --years 80 --only prudent,herrajes

import { MIGRATION, THREAT, TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';
import { run } from '../../src/engine/sim';
import type { Policy } from '../../src/engine/sim';
import { hasTrait, type GameState, type PlayerAct } from '../../src/engine/state';
import { yearOf } from '../../src/engine/time';
import { smithyOrdersOpen } from '../../src/engine/world/boards';
import { resistance } from '../../src/engine/world/garrison';
import { worthOf } from '../../src/engine/world/threat';
import { archiveGame } from '../../src/engine/save';
import { fallOf, type FallStory } from '../../src/derive/fall';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : Number.NaN;
  return Number.isFinite(v) ? v : fallback;
};
const SEED_COUNT = arg('seeds', 30);
const YEARS = arg('years', 100);
const FROM = arg('from', 3);
const STEP = arg('step', 7);
// `--list 10,17,24` juega sólo esas (para volver a medir las que cayeron).
const LIST = (() => {
  const i = process.argv.indexOf('--list');
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1]!.split(',').map(Number) : null;
})();
const SEEDS = LIST ?? Array.from({ length: SEED_COUNT }, (_, i) => FROM + i * STEP);
/** Cuántas semanas antes del punto de no retorno se mira si el jugador decidió algo. */
const NEAR_WEEKS = arg('near', TIME.WEEKS_PER_YEAR * 2);

const hours = (ticks: number): number => (ticks * TIME.REAL_MS_PER_TICK) / 3_600_000;

interface Strategy {
  policy: Policy;
  acts: (s: GameState) => readonly PlayerAct[];
}
const STRATEGIES: Record<string, Strategy> = {
  prudent: { policy: 'prudent', acts: () => [] },
  // K9: la plata amontonada que atrae al clan (2 de 8 asaltadas en 40 años).
  herrajes: {
    policy: 'prudent',
    acts: (s) => (smithyOrdersOpen(s).find((o) => o.id === 'ironware')!.refusal === null ? [{ kind: 'smithy', order: 'ironware' }] : []),
  },
  // La adversa de §12.9: la opción de más coste inmediato.
  worst: { policy: 'worst', acts: () => [] },
};

/** Lo que bajaría si este año se decidieran, igual que `advanceThreat`. */
function potentialBand(state: GameState): number {
  const temptation = Math.max(0, Math.min(1,
    worthOf(state) * (hasTrait(state, 'bows') ? THREAT.BOWS_TEMPTATION : 1) / THREAT.WORTH_FULL));
  const share = THREAT.BAND_LEAST_SHARE + (1 - THREAT.BAND_LEAST_SHARE) * temptation;
  return Math.max(THREAT.BAND_MIN,
    Math.round(state.threat.strength * share * (hasTrait(state, 'bows') ? THREAT.BOWS_BAND : 1)));
}

interface Week {
  tick: number; pop: number; grain: number; silver: number; morale: number; worth: number;
  strength: number; band: number; bar: number; dead: number;
}

interface Fall {
  strategy: string; seed: number; cause: string; endHours: number; peak: number;
  /** Horas a ×1 del punto de no retorno, y cuántas antes del final. */
  pnrHours: number; leadHours: number;
  /** Lo que se veía en el punto de no retorno, y un año antes. */
  at: Week; before: Week | null;
  /** Las decisiones de encrucijada en los `NEAR_WEEKS` antes del punto. */
  near: string[];
  /** Los titulares de la crónica entre el punto y el final (peso 3, y los de peso 2 contados). */
  headlines: string[]; weight2: number;
  /** Cuántos asaltos/saqueos hubo antes del final. */
  raids: number;
  /** Lo que contaría el epitafio (`derive/fall.ts`). */
  story: FallStory;
  /** La decisión que citaría, como `plantilla:opción`. */
  quoted: string;
}

function play(name: string, seed: number): { fall: Fall | null; peak: number } {
  const strategy = STRATEGIES[name]!;
  const state = foundGame(seed);
  const weeks: Week[] = [];
  let peak = 0;
  for (let t = 1; t <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; t += 1) {
    run(state, 1, strategy.policy, CATALOG, strategy.acts);
    const pop = population(state);
    peak = Math.max(peak, pop);
    weeks.push({
      tick: state.tick, pop, grain: state.village.grain, silver: state.village.silver,
      morale: state.village.morale, worth: worthOf(state), strength: state.threat.strength,
      band: potentialBand(state), bar: resistance(state) * THREAT.STORM_ODDS, dead: 0,
    });
  }
  if (state.ended === null) return { fall: null, peak };
  const cause = state.ended.cause;
  const end = state.ended.tick;

  // El punto de no retorno, por causa.
  let pnr = end;
  const bad = (w: Week): boolean => cause === 'stormed' ? w.band >= w.bar
    : w.pop < MIGRATION.VIABLE_POPULATION;
  if (cause === 'dispersed') {
    // La primera de las negativas al líder (`succession:no_one`, Anexo A.15) que acabaron en la dispersión.
    const refusals = state.history.filter((d) => d.templateId === 'succession' && d.optionId === 'no_one');
    pnr = refusals.at(-3)?.tick ?? end;
  } else {
    // La última semana (antes del final) que no estaba ya perdida.
    //
    // **En un asalto se mira hasta el aviso, no hasta el final.** La partida
    // que entra se decide el día del aviso (`raid.coming`, con su número), y
    // las semanas de después ya llevan el saqueo encima: sin plata ni grano el
    // valle «vale» cero y la partida que bajaría parece pequeña, así que el
    // punto salía pegado al final (medido: mediana de 0 a 6 h) por un artefacto.
    const comings = state.chronicle.filter((e) => e.templateKey === 'raid.coming' || e.templateKey === 'raid.assault');
    const cutoff = cause === 'stormed'
      ? Math.min(end, ([...comings].reverse().find((e) => e.templateKey === 'raid.coming')?.tick
        ?? (comings.at(-1)?.tick ?? end) - THREAT.WARNING_WEEKS))
      : end;
    let i = weeks.length - 1;
    // La semana del final ya ha borrado la aldea: se mira desde la anterior.
    while (i >= 0 && weeks[i]!.tick >= cutoff) i -= 1;
    while (i >= 0 && bad(weeks[i]!)) i -= 1;
    pnr = i + 1 < weeks.length ? weeks[i + 1]!.tick : end;
  }
  const at = weeks.find((w) => w.tick >= pnr) ?? weeks.at(-1)!;
  const before = weeks.find((w) => w.tick >= pnr - TIME.WEEKS_PER_YEAR) ?? null;
  const near = state.history
    .filter((d) => d.tick >= pnr - NEAR_WEEKS && d.tick <= pnr)
    .map((d) => `${d.templateId}:${d.optionId} (año ${yearOf(d.tick)})`);
  const window = state.chronicle.filter((e) => e.tick >= pnr && e.tick <= end);
  const story = fallOf(archiveGame(state));
  return {
    peak,
    fall: {
      strategy: name, seed, cause, endHours: hours(end), peak,
      pnrHours: hours(pnr), leadHours: hours(end - pnr), at, before, near,
      headlines: window.filter((e) => e.weight === 3).map((e) => `${e.templateKey} (año ${yearOf(e.tick)})`),
      weight2: window.filter((e) => e.weight === 2).length,
      raids: state.threat.raids,
      story,
      quoted: story.decision === null ? '—' : state.chronicle[story.decision]!.templateKey.replace('crossroad.', ''),
    },
  };
}

const only = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 && process.argv[i + 1] !== undefined ? new Set(process.argv[i + 1]!.split(',')) : null;
})();

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? Number.NaN : s[Math.floor(s.length / 2)]!;
};

const falls: Fall[] = [];
const summary: string[] = [];
for (const name of Object.keys(STRATEGIES).filter((n) => only === null || only.has(n))) {
  const mine: Fall[] = [];
  for (const seed of SEEDS) {
    const { fall } = play(name, seed);
    if (fall !== null) { mine.push(fall); falls.push(fall); }
    process.stderr.write(`${name} ${seed}${fall ? ` → ${fall.cause} a las ${fall.endHours.toFixed(0)} h` : ''}\n`);
  }
  const causes = new Map<string, number>();
  for (const f of mine) causes.set(f.cause, (causes.get(f.cause) ?? 0) + 1);
  summary.push(`| ${name} | ${mine.length}/${SEEDS.length} | ${[...causes].map(([c, n]) => `${c} ${n}`).join(', ') || '—'} | ${mine.length ? median(mine.map((f) => f.endHours)).toFixed(0) : '—'} h | ${mine.length ? median(mine.map((f) => f.leadHours)).toFixed(0) : '—'} h |`);
}

console.log(`\n## K7 · De qué muere una aldea · semillas ${FROM}+${STEP}·i (${SEEDS.length}) × ${YEARS} años\n`);
console.log('| estrategia | acaban | de qué | final (mediana, h a ×1) | punto de no retorno antes del final (mediana) |');
console.log('|---|---:|---|---:|---:|');
for (const line of summary) console.log(line);

console.log('\n### Cada final\n');
console.log('| estrategia | semilla | causa | final | no retorno | antes | pico | gente | grano | plata | ánimo | valor | clan | bajarían | listón | un año antes: gente · plata · bajarían/listón | asaltos | decisiones cerca |');
console.log('|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|');
for (const f of falls) {
  const a = f.at;
  const b = f.before;
  console.log(`| ${f.strategy} | ${f.seed} | ${f.cause} | ${f.endHours.toFixed(0)} h | ${f.pnrHours.toFixed(0)} h | ${f.leadHours.toFixed(0)} h | ${f.peak} | ${a.pop} | ${Math.round(a.grain)} | ${Math.round(a.silver)} | ${Math.round(a.morale)} | ${Math.round(a.worth)} | ${a.strength.toFixed(0)} | ${a.band} | ${a.bar.toFixed(0)} | ${b ? `${b.pop} · ${Math.round(b.silver)} · ${b.band}/${b.bar.toFixed(0)}` : '—'} | ${f.raids} | ${f.near.join('; ') || '—'} |`);
}

console.log('\n### Lo que la crónica dijo entre el punto y el final (titulares)\n');
for (const f of falls) {
  console.log(`- **${f.strategy} ${f.seed}** (${f.cause}, ${f.leadHours.toFixed(0)} h): ${f.headlines.join('; ') || 'ningún titular'} · y ${f.weight2} líneas de peso 2`);
}

console.log('\n### Lo que contaría el epitafio (`derive/fall.ts`)\n');
console.log('| estrategia | semilla | causa | mejor momento | quedaban | lo que se lo llevó | bajaron | decisión citada | del mejor momento al final | de la caída (mitad) al final |');
console.log('|---|---:|---|---|---:|---|---:|---|---:|---:|');
for (const f of falls) {
  const s = f.story;
  const links = s.links.map((l) => `${l.kind} ${l.count}${l.kind === 'raids' ? ` (${l.silver} plata, ${l.grain} grano)` : ''} desde el año ${yearOf(l.tick)}`).join('; ');
  console.log(`| ${f.strategy} | ${f.seed} | ${f.cause} | ${s.peak} en el año ${yearOf(s.peakTick)} | ${s.left} | ${links || '—'} | ${s.band ?? '—'} | ${f.quoted} | ${(f.endHours - hours(s.peakTick)).toFixed(0)} h | ${(f.endHours - hours(s.from)).toFixed(0)} h |`);
}
