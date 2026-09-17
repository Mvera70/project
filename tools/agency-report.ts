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
import type { GameState, PlayerAct } from '../src/engine/state';
import { canAccept } from '../src/engine/world/road';

export interface Variant {
  readonly name: string;
  readonly policy: Policy;
  /** Lo que el jugador hace esta semana, leído del estado antes del tick. */
  readonly acts: (state: GameState) => readonly PlayerAct[];
}

/** Acepta toda oferta que el valle pueda pagar. Es lo que haría un jugador que mira. */
const acceptWhatYouCan = (state: GameState): PlayerAct[] =>
  state.offer !== null && canAccept(state, state.offer) ? [{ kind: 'offer', accept: true }] : [];

export const VARIANTS: readonly Variant[] = [
  { name: 'nada', policy: 'prudent', acts: () => [] },
  { name: 'acepta ofertas', policy: 'prudent', acts: acceptWhatYouCan },
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
  for (let week = 0; week < years * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
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
  console.log('variante           | pop med | min..max | muertas | 1ª piedra med (min..max) | piedra fin | plata fin | entra / sale | décadas con trato | ofertas / aceptadas');
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
      String(rows.filter((r) => r.dead).length).padStart(7),
      `${fmt(median(stones))} (${stones.length === 0 ? '-' : `${Math.min(...stones)}..${Math.max(...stones)}`}, ${stones.length}/${rows.length})`.padStart(24),
      fmt(median(rows.map((r) => r.stone))).padStart(10),
      fmt(median(rows.map((r) => r.silver))).padStart(9),
      `${fmt(median(rows.map((r) => r.silverIn)))} / ${fmt(median(rows.map((r) => r.silverOut)))}`.padStart(12),
      `${trading}/${live}`.padStart(17),
      `${rows.reduce((n, r) => n + r.offers, 0)} / ${rows.reduce((n, r) => n + r.accepted, 0)}`.padStart(19),
    ].join(' | '));
  }
}

main();
