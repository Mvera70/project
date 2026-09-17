#!/usr/bin/env tsx
/**
 * Cuánto importa lo que hace el jugador. `docs/plan-medios.md` §1, y la medida
 * que cierra cada fase de `docs/rework.md` §4b (M-0 a M-4).
 *
 *   npx tsx tools/agency-report.ts [--seeds 16] [--years 60] [--only nombre,nombre]
 *
 * Observacional: no afirma nada y no cambia nada. Juega la misma tanda de
 * semillas con varias maneras de jugar —las «variantes»— y enseña, para cada
 * una, la población, las aldeas muertas, cuándo cae la primera piedra y cómo se
 * mueve la plata. Las variantes son funciones que reciben el estado **antes**
 * de cada semana y devuelven lo que el jugador hace esa semana, igual que haría
 * la interfaz; no tocan el estado por su cuenta, así que lo que se mide es lo
 * que un jugador podría conseguir de verdad.
 *
 * **Y juega con `run`, no con `tick` en un bucle**: `CLAUDE.md` cuenta la media
 * página de conclusiones falsas que costó medir un valle en el que nadie
 * contestaba las encrucijadas.
 */
import { TIME } from '../src/engine/balance';
import { CATALOG } from '../src/engine/crossroads/catalog/index';
import { foundGame } from '../src/engine/found';
import { population } from '../src/engine/people/demography';
import { run, type Policy } from '../src/engine/sim';
import { allocateLabour } from '../src/engine/subsistence/labour';
import type { GameState, MeansId, PlayerAct } from '../src/engine/state';
import { herdCapacity } from '../src/engine/subsistence/herd';
import { fellForest } from '../src/engine/world/forest';
import { canGive } from '../src/engine/world/means';
import { canAccept } from '../src/engine/world/road';

export interface Variant {
  readonly name: string;
  readonly policy: Policy;
  /** Lo que el jugador hace esta semana, leído del estado antes del tick. */
  readonly acts: (state: GameState) => readonly PlayerAct[];
  /**
   * M-1 · Lo que se le pone al valle antes de la semana, para medir un estado
   * que el jugador todavía no puede producir. **No es una manera de jugar**: es
   * un banco de pruebas, y va marcado como tal en lo que se publique.
   */
  readonly prelude?: (state: GameState) => void;
}

/** Acepta toda oferta que el valle pueda pagar. Es lo que haría un jugador que mira. */
const acceptWhatYouCan = (state: GameState): PlayerAct[] =>
  state.offer !== null && canAccept(state, state.offer) ? [{ kind: 'offer', accept: true }] : [];

/**
 * M-1 · **Un valle cargado de lo que el mundo puede romper**, para medir la
 * otra mitad de la decisión 4 del dueño del diseño: una aldea intocada muere lo
 * que moría, y una que ha llenado el corral y talado el bosque, bastante más.
 *
 * No es lo que hará el jugador —los medios llegan en M-2— es la carga puesta a
 * mano: cada año se llena el corral hasta donde llegue y se tala un pedazo de
 * bosque. Va en `prelude` y no en `acts` porque no es un acto del jugador
 * todavía; es el estado que M-2 va a poder producir.
 */
const loadTheValley = (state: GameState): void => {
  if (state.tick % TIME.WEEKS_PER_YEAR !== 0) return;
  const room = herdCapacity(state);
  state.herd.pigs = Math.max(state.herd.pigs, room.pigs);
  state.herd.cows = Math.max(state.herd.cows, room.cows);
  fellForest(state, 3000);
};

/**
 * M-2 · **Dar un medio en cuanto el valle pueda pagarlo.** Es la manera de
 * jugar más simple que existe con los medios —ni esperar ni elegir el momento—
 * y por eso sirve de patrón: si con esto tres combinaciones no dan tres aldeas
 * distintas, los medios son decorado (criterio del brief M-2).
 */
const giveWhatYouCan = (...wanted: readonly MeansId[]) => (state: GameState): PlayerAct[] => {
  // Uno por semana como mucho: el carro no es una tienda.
  for (const means of wanted) {
    if (canGive(state, means)) return [{ kind: 'means', means }];
  }
  return [];
};

/**
 * M-2 · El jugador que **ahorra**: mientras no tenga arado no gasta plata en
 * nada más, y después compra lo que pueda. Es la otra manera de jugar, y la
 * distancia entre las dos es lo que mide si elegir importa.
 */
const saveForThePlough = (state: GameState): PlayerAct[] => {
  if (!(state.traits as readonly string[]).includes('plough')) {
    return canGive(state, 'plough') ? [{ kind: 'means', means: 'plough' }] : [];
  }
  return giveWhatYouCan('pigs', 'ale')(state);
};

export const VARIANTS: readonly Variant[] = [
  { name: 'nada', policy: 'prudent', acts: () => [] },
  { name: 'acepta ofertas', policy: 'prudent', acts: acceptWhatYouCan },
  { name: 'cargado', policy: 'prudent', acts: () => [], prelude: loadTheValley },
  // M-2 · las tres combinaciones que deciden si el patrón vale.
  { name: 'arado', policy: 'prudent', acts: giveWhatYouCan('plough') },
  { name: 'cerdos', policy: 'prudent', acts: giveWhatYouCan('pigs') },
  { name: 'barril', policy: 'prudent', acts: giveWhatYouCan('ale') },
  // **Y el jugador que ahorra.** `todo` compraba lo primero que podía pagar, y
  // medido eso significa que **el arado nunca llega**: el barril cuesta diez y
  // el arado veinte, así que quien compra cerveza en cuanto puede no junta
  // nunca para el arado. Es un hallazgo del diseño y no un defecto de la
  // medida —elegir importa— así que se miden las dos maneras.
  { name: 'barril primero', policy: 'prudent', acts: giveWhatYouCan('ale', 'pigs', 'plough') },
  { name: 'arado primero', policy: 'prudent', acts: saveForThePlough },
  // M-4 · los tres que cierran el carro, cada uno solo, y el carro entero.
  { name: 'hacha', policy: 'prudent', acts: giveWhatYouCan('axe') },
  { name: 'reliquia', policy: 'prudent', acts: giveWhatYouCan('relic') },
  { name: 'manos', policy: 'prudent', acts: giveWhatYouCan('hand') },
  { name: 'el carro entero', policy: 'prudent', acts: giveWhatYouCan('plough', 'axe', 'pigs', 'relic', 'hand', 'ale') },
  { name: 'peor encrucijada', policy: 'worst', acts: () => [] },
];

interface Row {
  pop: number;
  dead: boolean;
  endYear: number | null;
  firstStone: number | null;
  stone: number;
  silver: number;
  silverIn: number;
  silverOut: number;
  /** Décadas vividas en las que la plata entró y salió al menos una vez. */
  liveDecades: number;
  tradingDecades: number;
  offers: number;
  accepted: number;
  /** El balanceo del 17 sep: las dos existencias básicas al final. */
  wood: number;
  grain: number;
  /** Y la semana más apretada de leña y de comida que el valle pasó. */
  leanWood: number;
  leanWeeks: number;
  /** Semanas con la leñera vacía en invierno (el frío de §5.4). */
  coldWeeks: number;
  /**
   * **Dónde están las manos**, en promedio y en tanto por ciento de la gente
   * que trabaja: al campo, al bosque y a la obra. Es la medida que dice si una
   * decisión libera manos, que es lo que el dueño del diseño pidió que las
   * decisiones hicieran —y lo que una mediana de población no distingue del
   * ruido con veinticuatro semillas.
   */
  atFields: number;
  atWood: number;
  atWorks: number;
  /** Edificios en pie al final: la medida directa de un bono de obra. */
  builds: number;
  /** M-2 · medios dados, y si el arado llegó. */
  means: number;
  plough: boolean;
  pigs: number;
}

function play(seed: number, years: number, variant: Variant): Row {
  const state = foundGame(seed);
  let firstStone: number | null = null;
  let silverIn = 0;
  let silverOut = 0;
  const decadeIn = new Set<number>();
  const decadeOut = new Set<number>();
  let offers = 0;
  let accepted = 0;
  let leanWood = Number.POSITIVE_INFINITY;
  let leanWeeks = Number.POSITIVE_INFINITY;
  let coldWeeks = 0;
  let hands = 0;
  let farmers = 0;
  let cutters = 0;
  let builders = 0;
  for (let week = 0; week < years * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
    variant.prelude?.(state);
    const before = state.village.silver;
    const [report] = run(state, 1, variant.policy, CATALOG, variant.acts);
    const delta = state.village.silver - before;
    const decade = Math.floor(state.tick / TIME.WEEKS_PER_YEAR / 10);
    if (delta > 0) { silverIn += delta; decadeIn.add(decade); }
    if (delta < 0) { silverOut -= delta; decadeOut.add(decade); }
    if (report?.happening !== null && report?.happening !== undefined && state.offer?.postedTick === state.tick) offers += 1;
    if (report?.offer?.accepted === true) accepted += 1;
    if (firstStone === null && state.buildings.some((b) => b.tier === 1 && b.lostTick === null)) {
      firstStone = Math.floor(state.tick / TIME.WEEKS_PER_YEAR);
    }
    // Lo apretado se mide **después del año 10**: los primeros años de una
    // pareja son estrechos por definición y no dicen nada del balance de una
    // aldea.
    if (state.tick > TIME.WEEKS_PER_YEAR * 10) {
      const share = allocateLabour(state);
      hands += share.workforce;
      farmers += share.farmers;
      cutters += share.cutters;
      builders += share.builders;
      const people = Math.max(1, population(state));
      leanWood = Math.min(leanWood, state.village.wood);
      leanWeeks = Math.min(leanWeeks, Math.floor(state.village.grain / people));
      if (report?.cold === true) coldWeeks += 1;
    }
  }
  const lived = Math.max(1, Math.ceil((state.ended?.tick ?? state.tick) / TIME.WEEKS_PER_YEAR / 10));
  let trading = 0;
  for (let d = 0; d < lived; d += 1) if (decadeIn.has(d) && decadeOut.has(d)) trading += 1;
  return {
    pop: population(state),
    dead: state.ended !== null,
    endYear: state.ended === null ? null : Math.floor(state.ended.tick / TIME.WEEKS_PER_YEAR),
    firstStone,
    stone: Math.round(state.village.stone),
    silver: Math.round(state.village.silver),
    silverIn: Math.round(silverIn),
    silverOut: Math.round(silverOut),
    liveDecades: lived,
    tradingDecades: trading,
    offers,
    accepted,
    wood: Math.round(state.village.wood),
    grain: Math.round(state.village.grain),
    leanWood: Number.isFinite(leanWood) ? Math.round(leanWood) : 0,
    leanWeeks: Number.isFinite(leanWeeks) ? leanWeeks : 0,
    coldWeeks,
    builds: state.buildings.filter((b) => b.lostTick === null).length,
    atFields: hands > 0 ? Math.round((farmers / hands) * 100) : 0,
    atWood: hands > 0 ? Math.round((cutters / hands) * 100) : 0,
    atWorks: hands > 0 ? Math.round((builders / hands) * 100) : 0,
    means: state.acts.filter((a) => a.act.kind === 'means' && a.done).length,
    plough: (state.traits as readonly string[]).includes('plough'),
    pigs: state.herd.pigs,
  };
}

const median = (xs: readonly number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? null;
};
const fmt = (x: number | null): string => (x === null ? '-' : String(x));

function main(): void {
  const arg = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const seeds = Number(arg('--seeds') ?? 16);
  const years = Number(arg('--years') ?? 60);
  const only = arg('--only')?.split(',');
  const variants = only === undefined ? VARIANTS : VARIANTS.filter((v) => only.includes(v.name));

  console.log(`${seeds} semillas, ${years} años\n`);
  console.log('variante           | pop med | min..max | muertas (año más temprano) | 1ª piedra med (min..max) | piedra fin | plata fin | entra / sale | décadas con trato | ofertas / aceptadas | medios | leña fin | leña min | grano fin | comida min | frío | campo/bosque/obra % | obras');
  for (const variant of variants) {
    const rows: Row[] = [];
    for (let seed = 1; seed <= seeds; seed += 1) rows.push(play(seed, years, variant));
    const pops = rows.map((r) => r.pop);
    const stones = rows.map((r) => r.firstStone).filter((x): x is number => x !== null);
    const live = rows.reduce((n, r) => n + r.liveDecades, 0);
    const trading = rows.reduce((n, r) => n + r.tradingDecades, 0);
    console.log([
      variant.name.padEnd(18),
      fmt(median(pops)).padStart(7),
      `${Math.min(...pops)}..${Math.max(...pops)}`.padStart(8),
      (() => {
        const ends = rows.map((r) => r.endYear).filter((x): x is number => x !== null);
        // El año más temprano importa por sí solo: la decisión 4 del dueño del
        // diseño dice que de primeras la aldea no se muere.
        return `${ends.length} (${ends.length === 0 ? '-' : Math.min(...ends)})`.padStart(26);
      })(),
      `${fmt(median(stones))} (${stones.length === 0 ? '-' : `${Math.min(...stones)}..${Math.max(...stones)}`}, ${stones.length}/${rows.length})`.padStart(24),
      fmt(median(rows.map((r) => r.stone))).padStart(10),
      fmt(median(rows.map((r) => r.silver))).padStart(9),
      `${fmt(median(rows.map((r) => r.silverIn)))} / ${fmt(median(rows.map((r) => r.silverOut)))}`.padStart(12),
      `${trading}/${live}`.padStart(17),
      `${rows.reduce((n, r) => n + r.offers, 0)} / ${rows.reduce((n, r) => n + r.accepted, 0)}`.padStart(19),
      `${rows.reduce((n, r) => n + r.means, 0)}`.padStart(6),
      fmt(median(rows.map((r) => r.wood))).padStart(9),
      fmt(median(rows.map((r) => r.leanWood))).padStart(10),
      fmt(median(rows.map((r) => r.grain))).padStart(9),
      fmt(median(rows.map((r) => r.leanWeeks))).padStart(10),
      `${rows.reduce((n, r) => n + r.coldWeeks, 0)}`.padStart(5),
      `${fmt(median(rows.map((r) => r.atFields)))}/${fmt(median(rows.map((r) => r.atWood)))}/${fmt(median(rows.map((r) => r.atWorks)))}`.padStart(14),
      fmt(median(rows.map((r) => r.builds))).padStart(6),
    ].join(' | '));
  }
}

main();
