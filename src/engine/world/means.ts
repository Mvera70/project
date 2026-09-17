// M-2 · Los medios: lo que el jugador mete en el valle.
// `docs/plan-medios.md` §3, brief en `docs/rework.md` §4b.
//
// **El principio, con las palabras del dueño del diseño** (17 sep 2026): «es
// como si cogieras a un grupo de personas y le dieses una pala, o un martillo.
// Depende de lo que le des van a hacer diferentes cosas. Tú realmente no le
// estás diciendo qué tienen que hacer, sino que ciertas cosas dan lugar a
// otras». Así que aquí **no se ordena nada**: se da una cosa, y lo que la aldea
// haga con ella lo deciden sus propios sistemas —el reparto de manos, la tabla
// de sucesos, las opiniones—.
//
// Es lo que sustituye a las tres palancas de órdenes de la versión 2.0, y el
// motivo está medido en `plan-medios.md` §1: una orden global que la aldea
// obedece a ciegas mata cuando el jugador se equivoca —a dos muescas del reposo
// moría media aldea, y tarde, sin que nada avisara—, y aprender eso enseña a no
// tocar. Un medio no puede hacer eso porque no manda sobre nadie.
//
// Cada medio **cuesta lo del valle** (decisión suya: «no quiero que sea
// gratis») y abre algo bueno **y** algo malo; los pesos de lo segundo viven en
// `FATE` y los aplica `world/fate.ts`. Aquí sólo está qué cuesta, qué deja y qué
// se cuenta.

import { MEANS } from '../balance';
import type { ChronicleEntry, GameState, MeansId, VillageStats } from '../state';
import { herdCapacity } from '../subsistence/herd';

/** Lo que un medio cuesta y lo que deja al darlo. */
export interface MeansSpec {
  /** Lo que se paga, de lo que el valle tiene. */
  readonly cost: Partial<Record<keyof VillageStats, number>>;
  /**
   * Si es un rasgo del valle, cuál. Un rasgo **no se da dos veces**: cambia un
   * número de la economía para siempre, que es lo que E5 escribió de los rasgos
   * de fundación (§7.11) — un medio es uno de esos, puesto a mitad de partida y
   * pagado.
   */
  readonly trait?: 'plough';
  /** Si mete animales en el corral, cuántos y de qué. */
  readonly herd?: { readonly kind: 'pigs' | 'cows'; readonly count: number };
  /** Si lo que deja es una fiesta esta semana. */
  readonly feast?: boolean;
}

export const MEANS_SPEC: Readonly<Record<MeansId, MeansSpec>> = {
  // **El arado.** Un campo rinde con menos manos (`subsistence/labour.ts`), así
  // que sobran brazos y la aldea los reparte donde ella quiera. Lo malo llega
  // solo: el granero se llena, y un granero lleno atrae al ladrón y al señor
  // (M-1) y a las ratas.
  plough: { cost: { wood: 40, silver: 20 }, trait: 'plough' },
  // **Dos cerdos.** Comida en invierno y la matanza de la fiesta; y lobos, que
  // van a donde hay ganado (M-1), y la peste del corral apretado (§7.7).
  pigs: { cost: { grain: 30, silver: 14 }, herd: { kind: 'pigs', count: 2 } },
  // **Un barril.** Una fiesta esta semana: ánimo de golpe, bodas después… y
  // riñas, que es lo que una fiesta también trae. Es el medio que le da al ánimo
  // el reloj del jugador (`plan-medios.md` §6.2).
  ale: { cost: { grain: 25, silver: 10 }, feast: true },
};

/**
 * **Los precios, medidos y no elegidos a ojo.** Con la plata a 12, 8 y 4, un
 * valle compraba **cincuenta y un barriles en sesenta años** —fiesta permanente,
 * catorce compras de cerdos— porque la plata que entra por el camino (unas dos
 * docenas por década) daba para eso y más. Con 20, 14 y 10, y sin poder
 * encadenar barriles, salen unos pocos medios por partida: un medio pasa a ser
 * una decisión de década y no una compra de semana. Ver `docs/task-log.md`.
 */

/** Por qué no se puede dar algo, o `null` si se puede. */
export type MeansRefusal = 'cost' | 'already' | 'room' | 'feasting';

export function refusalFor(state: GameState, id: MeansId): MeansRefusal | null {
  const spec = MEANS_SPEC[id];
  if (spec.trait !== undefined && (state.traits as readonly string[]).includes(spec.trait)) {
    return 'already';
  }
  if (spec.herd !== undefined
    && state.herd[spec.herd.kind] + spec.herd.count > herdCapacity(state)[spec.herd.kind]) {
    return 'room';
  }
  // **Un barril cada vez.** Nadie compra el siguiente mientras se está bebiendo
  // el primero, y sin esto la fiesta se podía encadenar semana a semana: medido,
  // cincuenta y un barriles en una partida de sesenta años.
  if (spec.feast === true && aleWindow(state)) return 'feasting';
  for (const [stat, amount] of Object.entries(spec.cost)) {
    if (state.village[stat as keyof VillageStats] < (amount ?? 0)) return 'cost';
  }
  return null;
}

export function canGive(state: GameState, id: MeansId): boolean {
  return refusalFor(state, id) === null;
}

export interface MeansOutcome {
  readonly id: MeansId;
  readonly given: boolean;
  readonly refusal: MeansRefusal | null;
  readonly entry: Omit<ChronicleEntry, 'tick'> | null;
}

/**
 * Da un medio al valle. No consume ninguna tirada: lo que el jugador hace no
 * puede desplazar la partida (§4.3), igual que una oferta del camino.
 *
 * Lo que **no** hace: colocar nada. «En este juego no se coloca nada; todo se
 * decide y el mapa interactúa solo» (dueño del diseño, 17 sep 2026). El arado
 * va al campo que la aldea trabaje, los cerdos al corral que tenga y el barril
 * a la plaza, y de eso se encarga quien ya sabe dónde está cada cosa.
 */
export function giveMeans(state: GameState, id: MeansId, season: string, year: number): MeansOutcome {
  const refusal = refusalFor(state, id);
  if (refusal !== null) return { id, given: false, refusal, entry: null };
  const spec = MEANS_SPEC[id];
  for (const [stat, amount] of Object.entries(spec.cost)) {
    const key = stat as keyof VillageStats;
    state.village[key] = Math.max(0, state.village[key] - (amount ?? 0));
  }
  if (spec.trait !== undefined) state.traits.push(spec.trait);
  if (spec.herd !== undefined) state.herd[spec.herd.kind] += spec.herd.count;
  // La fiesta del barril no se sortea: se paga y se celebra. La sirve
  // `world/fate.ts` la semana que la bandera está puesta, que es donde viven
  // los sucesos y sus efectos visibles.
  if (spec.feast === true) state.flags['ale'] = state.tick + MEANS.ALE_WEEKS;
  return {
    id,
    given: true,
    refusal: null,
    entry: {
      kind: 'means',
      templateKey: `means.${id}.given`,
      params: { season, year },
      weight: 2,
    },
  };
}

/** Las semanas que la fiesta del barril sigue tiñendo lo que pasa. */
export function aleWindow(state: GameState): boolean {
  const until = state.flags['ale'];
  return until !== undefined && (until === 0 || until > state.tick);
}

/** Cuánto cuesta un medio, para que la pantalla lo pueda enseñar sin inventarlo. */
export function costOf(id: MeansId): Partial<Record<keyof VillageStats, number>> {
  return MEANS_SPEC[id].cost;
}
