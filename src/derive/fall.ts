// K7 · Por qué cayó un valle, contado con lo que la crónica ya dijo (2 oct 2026).
//
// Vera: K7 no es un roguelike; vas fundando aldeas, algunas mueren, **aprendes**
// y poco a poco llegas a «la aldea buena». Lo que se aprende es del jugador, así
// que lo único que hace falta es que el final se entienda: el epitafio decía
// **cómo** acabó (`EndState.cause`) y no **por qué** ni **desde cuándo**.
//
// Lo que se midió antes de escribir esto (`tools/reports/fall-report.ts`,
// `docs/medidas/k7-caidas-2026-10-02.md`): con la política prudente caen 2 de
// 30 valles en cien años, los dos en el arranque y de hambre; pidiendo herrajes
// sin parar, 19 de 30, 17 asaltados; con la adversa, 10 de 30. Y la cadena se
// repite: el valle llega a su mejor momento, algo se lo lleva —el hambre, la
// peste, el clan que baja una y otra vez a por la plata, los que se marchan— y
// el final es la última pieza, no la causa.
//
// **Todo sale de la crónica** (`ArchivedGame.chronicle`), que es lo que el
// archivo conserva y lo que el epitafio recibe: ni un campo nuevo en el
// guardado ni una tirada. Lee las entradas como datos —claves y parámetros—,
// igual que `chronicle/ledger.ts`, y deja el texto al banco.

import type { ArchivedGame, ChronicleEntry } from '@engine/state';
import { TIME } from '@engine/balance';

/** Qué se llevó al valle desde su mejor momento. */
export type FallLinkKind =
  | 'hunger' | 'plague' | 'cold' | 'fire' | 'violence' | 'natural' | 'old_age'
  | 'left' | 'raids';

export interface FallLink {
  readonly kind: FallLinkKind;
  /** La primera vez que pasó, desde el mejor momento. */
  readonly tick: number;
  /** Cuántos se llevó (gente), o cuántas veces bajó el clan. */
  readonly count: number;
  /** Para `raids`: lo que se llevaron entre todas. */
  readonly silver: number;
  readonly grain: number;
}

export interface FallStory {
  readonly cause: ArchivedGame['cause'];
  /** El mejor momento: cuándo y con cuánta gente. Desde ahí se cuenta la caída. */
  readonly peakTick: number;
  readonly peak: number;
  /** La gente que quedaba al final, antes del último golpe. */
  readonly left: number;
  /** Lo que se la llevó, de mayor a menor peso, como mucho `FALL.LINKS`. */
  readonly links: readonly FallLink[];
  /**
   * La decisión más cercana al final, para citarla tal como la crónica la
   * dijo: su posición en `chronicle`, o `null` si no hubo ninguna en la ventana.
   */
  readonly decision: number | null;
  /** Con cuántos bajaron la última vez, si lo tomaron. */
  readonly band: number | null;
}

/**
 * TUNE: cuántas cosas cuenta el epitafio, y cuántos años antes del mejor
 * momento se mira si hubo una decisión. Tres porque es lo que cabe en la
 * columna de 390 px sin que el «por qué» tape la lápida; dos años porque la
 * pregunta que torció la partida suele venir antes del descenso, y lo que se
 * midió está en `docs/medidas/k7-caidas-2026-10-02.md`.
 */
export const FALL = { LINKS: 3, DECISION_YEARS: 2 } as const;

const DEATH = /^death\.(hunger|plague|cold|fire|violence|natural|old_age)\.(named|anon\.one|anon\.many)$/;
const RAIDS = new Set(['raid.open', 'raid.walled', 'raid.assault']);

/** Cuántas cabezas cuenta una entrada, como `ledger.ts`. */
function headsIn(entry: ChronicleEntry): number {
  const count = entry.params['count'];
  return typeof count === 'number' && count > 0 ? count : 1;
}

function numberIn(entry: ChronicleEntry, key: string): number {
  const value = entry.params[key];
  return typeof value === 'number' && value > 0 ? value : 0;
}

/** Lo que se llevó cada cosa, en el orden en que la crónica la contó. */
function linksSince(chronicle: readonly ChronicleEntry[], from: number, end: number): FallLink[] {
  const found = new Map<FallLinkKind, { tick: number; count: number; silver: number; grain: number }>();
  const add = (kind: FallLinkKind, entry: ChronicleEntry, count: number): void => {
    const link = found.get(kind) ?? { tick: entry.tick, count: 0, silver: 0, grain: 0 };
    link.count += count;
    if (kind === 'raids') {
      link.silver += numberIn(entry, 'silver');
      link.grain += numberIn(entry, 'grain');
    }
    found.set(kind, link);
  };
  for (const entry of chronicle) {
    if (entry.tick < from || entry.tick > end) continue;
    const death = DEATH.exec(entry.templateKey);
    if (death !== null) add(death[1] as FallLinkKind, entry, headsIn(entry));
    else if (entry.templateKey.startsWith('departure.')) add('left', entry, headsIn(entry));
    else if (RAIDS.has(entry.templateKey)) add('raids', entry, 1);
  }
  return [...found].map(([kind, l]) => ({ kind, ...l }));
}

/**
 * Por qué cayó este valle.
 *
 * **El mejor momento** es la última vez que la crónica apuntó su mayor número
 * de gente (`people`, que llevan los nacimientos, las llegadas, las muertes y
 * las marchas). Desde ahí se suma lo que se lo llevó, y se cuenta lo que más
 * pesó: la gente que costó cada cosa, y el clan **por las veces que bajó**,
 * porque cada bajada es un golpe aunque no mate a nadie. Lo que mueren de
 * viejos no explica una caída, así que sólo entra si no hay otra cosa.
 */
export function fallOf(game: Pick<ArchivedGame, 'cause' | 'chronicle' | 'endedTick'>): FallStory {
  const { chronicle, endedTick: end } = game;
  let peak = 0;
  let peakTick = 0;
  let left = 0;
  for (const entry of chronicle) {
    const people = entry.params['people'];
    if (typeof people !== 'number') continue;
    left = people;
    if (people >= peak) { peak = people; peakTick = entry.tick; }
  }

  // El último golpe no es una causa: es el final, y el epitafio ya lo dice.
  const last = [...chronicle].reverse().find((e) => e.templateKey === 'raid.stormed');
  const band = game.cause === 'stormed' && last !== undefined ? headsIn(last) : null;
  const all = linksSince(chronicle, peakTick, game.cause === 'stormed' && last !== undefined ? last.tick - 1 : end);
  const weight = (l: FallLink): number => (l.kind === 'old_age' || l.kind === 'natural' ? l.count / 4 : l.count);
  const links = all
    .filter((l) => l.count > 0)
    .sort((a, b) => weight(b) - weight(a) || a.tick - b.tick)
    .slice(0, FALL.LINKS)
    .sort((a, b) => a.tick - b.tick);

  // La decisión más cercana al final, mirando desde un poco antes del mejor
  // momento: la pregunta que torció la partida suele llegar antes del descenso.
  const since = peakTick - FALL.DECISION_YEARS * TIME.WEEKS_PER_YEAR;
  let decision: number | null = null;
  chronicle.forEach((e, i) => {
    if (e.kind === 'crossroad_taken' && e.tick >= since && e.tick <= end) decision = i;
  });

  return { cause: game.cause, peakTick, peak, left, links, decision, band };
}
