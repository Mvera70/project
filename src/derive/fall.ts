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
  /** Desde cuándo se cuenta lo que se lo llevó: la última vez que tuvo la mitad (`FALL.HALF`). */
  readonly from: number;
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
 * TUNE: cuántas cosas cuenta el epitafio, desde qué parte de su mejor momento
 * se cuenta la caída, y cuántos años antes de eso se busca una decisión.
 *
 *  · `LINKS` 3: lo que cabe en la columna de 390 px sin que el «por qué» tape
 *    la lápida.
 *  · `HALF` 0,5: medido el 2 oct 2026 en los 29 valles caídos de
 *    `fall-report` (herrajes y adversa, 30 semillas × 100 años). Contando desde
 *    el mejor momento, el relato abarcaba de 0 a 674 h a ×1 —hasta sesenta años
 *    de meseta— y sumaba décadas («158 murieron de hambre desde el año 34»).
 *    Con una ventana fija de cinco años se cortaba el arranque de los caseríos
 *    que se abandonan (108: «uno se marchó», sin las tres muertes de hambre
 *    del primer otoño). La última vez que tuvo la mitad es la caída misma, en
 *    los dos casos.
 *  · `DECISION_YEARS` 2: la pregunta que torció la partida suele llegar antes
 *    del descenso; en 28 de los 29 la que se cita es `raiders_coming`,
 *    `succession` o el forastero del vado.
 */
export const FALL = { LINKS: 3, HALF: 0.5, DECISION_YEARS: 2 } as const;

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
  // **Desde cuándo se cuenta: la última vez que tuvo la mitad de su mejor
  // momento** (`FALL.HALF`), o el mejor momento si nunca bajó de ahí. Una
  // meseta de décadas no es la caída, y una ventana de años fijos tampoco
  // sirve: corta el primer otoño de hambre de un caserío que se abandona cinco
  // años después (§5.7 espera `ABANDON_YEARS`) y abarca medio siglo de una
  // villa que cae en dos. Lo que se mide es la caída misma.
  let from = peakTick;
  for (const entry of chronicle) {
    const people = entry.params['people'];
    if (typeof people === 'number' && entry.tick >= peakTick && people >= peak * FALL.HALF) from = entry.tick;
  }
  const all = linksSince(chronicle, from, game.cause === 'stormed' && last !== undefined ? last.tick - 1 : end);
  const weight = (l: FallLink): number => (l.kind === 'old_age' || l.kind === 'natural' ? l.count / 4 : l.count);
  const links = all
    .filter((l) => l.count > 0)
    .sort((a, b) => weight(b) - weight(a) || a.tick - b.tick)
    .slice(0, FALL.LINKS)
    .sort((a, b) => a.tick - b.tick);

  // La decisión más cercana al final, mirando desde un poco antes del mejor
  // momento: la pregunta que torció la partida suele llegar antes del descenso.
  const since = from - FALL.DECISION_YEARS * TIME.WEEKS_PER_YEAR;
  let decision: number | null = null;
  chronicle.forEach((e, i) => {
    if (e.kind === 'crossroad_taken' && e.tick >= since && e.tick <= end) decision = i;
  });

  return { cause: game.cause, peakTick, peak, from, left, links, decision, band };
}

/**
 * Lo que más pesó de todo, para decirlo en una línea al fundar el valle
 * siguiente: la gente que costó, y el clan por las veces que bajó. `null` si la
 * crónica no sabe nada (una partida podada).
 */
export function heaviestOf(story: FallStory): FallLink | null {
  let best: FallLink | null = null;
  for (const link of story.links) if (best === null || link.count > best.count) best = link;
  return best;
}
