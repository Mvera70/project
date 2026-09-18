// B1 · El clan del valle vecino. design.md §1b.
//
// **Quien ataca es otro valle**, y lo decidió el dueño del diseño el 18 sep
// 2026: no bandidos, no el señor de Wealdmere —esos siguen donde están, el
// ladrón del granero y el diezmo— sino un clan que crece en la ladera de al
// lado y que un día baja.
//
// De esa elección salen las dos mitades de este módulo, y conviene no
// mezclarlas nunca:
//
//  · **Lo que el clan junta corre con los años.** Es un valle que se desarrolla
//    en paralelo al tuyo y que no sabe que existes, así que crece igual en un
//    caserío miserable que en una villa rica. Con su propia variación, para que
//    dos partidas no tengan el mismo vecino.
//  · **Lo que tú has juntado decide si bajan y con cuántos.** Eso es §1 —«la
//    fuente de letalidad es la acumulación de lo que el jugador metió»— visto
//    desde la otra ladera: lo que se ve desde fuera (plata, grano, ganado) es
//    el premio, y un premio grande trae a más gente.
//
// **Lo que este módulo NO hace, y es deliberado:** resolver la batalla. La
// mitad grande de «caer» —el ejército que entra, rompe y mata— se resuelve en
// físico y no es determinista (§1b), y no está hecha. Lo que hay aquí es la
// mitad pequeña que el dueño ya decidió: **entran, se llevan lo que pueden y se
// van**, y la aldea sigue con lo que queda.

import { THREAT, TIME } from '../balance';
import { next } from '../rng';
import type { GameState, HerdKind } from '../state';
import { yearOf } from '../time';

/** Lo que un asalto se lleva, para que la crónica pueda contarlo. */
export interface Sack {
  band: number;
  silver: number;
  grain: number;
  /** El animal que se llevaron, o `null` si no había ninguno suelto. */
  beast: HerdKind | null;
  /** Si la aldea lo recibió tras su muralla cerrada. */
  walled: boolean;
}

/**
 * Lo que este valle vale visto desde la ladera de enfrente.
 *
 * **Lo que se ve, no lo que se tiene**: la plata, el grano del granero y el
 * ganado suelto por el prado. Las casas no cuentan —nadie baja de la sierra por
 * unas vigas— y la gente tampoco: un valle con mucha gente no es más apetecible,
 * es más difícil.
 */
export function worthOf(state: GameState): number {
  return state.village.silver * THREAT.WORTH_PER_SILVER
    + state.village.grain * THREAT.WORTH_PER_GRAIN
    + state.herd.hens * THREAT.WORTH_PER_HEN
    + state.herd.pigs * THREAT.WORTH_PER_PIG
    + state.herd.cows * THREAT.WORTH_PER_COW;
}

/** Cuánto tienta, de cero a uno. */
function temptation(state: GameState): number {
  return Math.max(0, Math.min(1, worthOf(state) / THREAT.WORTH_FULL));
}

/**
 * A2 · **Si la aldea está cerrada**: tiene su anillo con el portón en pie.
 *
 * No pregunta si el anillo está completo (`ringClosed`) sino si hay muralla y
 * puerta, que es lo que cambia lo que un saqueador puede hacer: un pueblo con
 * un cerco y una puerta se defiende peor o mejor, pero se defiende; uno abierto
 * no tiene ni dónde plantarse.
 */
function walled(state: GameState): boolean {
  const standing = state.buildings.filter((b) => b.lostTick === null);
  return standing.some((b) => b.kind === 'gate')
    && standing.some((b) => b.kind === 'palisade' || b.kind === 'wall');
}

/**
 * El paso del clan, una vez al año. Devuelve el saqueo si esta semana llegaron.
 *
 * **Una tirada al año y en la semana 0**, como la migración y el clima: lo que
 * se decide es si el vecino se organiza esta temporada, no si esta semana le
 * apetece. Que la partida tarde en llegar (`WARNING_WEEKS`) es lo que deja
 * sitio para el aviso de B2.
 */
export function advanceThreat(state: GameState): Sack | null {
  const year = yearOf(state.tick);

  // 1 · El vecino crece, pase lo que pase aquí.
  if (state.tick % TIME.WEEKS_PER_YEAR === 0 && state.tick > 0) {
    const spread = (next(state.rng, 'raid') * 2 - 1) * THREAT.GROWTH_SPREAD;
    state.threat.strength = Math.min(THREAT.STRENGTH_CAP,
      state.threat.strength + THREAT.GROWTH_PER_YEAR * (1 + spread));
  }

  // 2 · ¿Baja este año? Sólo se pregunta si no hay ya una partida en camino.
  if (state.tick % TIME.WEEKS_PER_YEAR === 0
    && state.threat.comingTick === null
    && year >= THREAT.MIN_YEAR) {
    const chance = THREAT.YEARLY_CHANCE * temptation(state);
    if (next(state.rng, 'raid') < chance) {
      const share = THREAT.BAND_LEAST_SHARE
        + (1 - THREAT.BAND_LEAST_SHARE) * temptation(state);
      state.threat.comingTick = state.tick + THREAT.WARNING_WEEKS;
      state.threat.comingBand = Math.max(THREAT.BAND_MIN,
        Math.round(state.threat.strength * share));
    }
  }

  // 3 · ¿Llegan esta semana?
  if (state.threat.comingTick === null || state.tick < state.threat.comingTick) return null;
  return arrive(state);
}

/**
 * Llegan, se llevan lo que pueden y se van.
 *
 * **Esta es la mitad pequeña de «caer»** (§1b) y la única que se puede resolver
 * sin la batalla física. Lo que se llevan sale de lo que hay, no de una tabla:
 * una parte de la plata y del grano, y una cabeza del corral si la hay. La
 * muralla cerrada con su puerta les quita las tres cuartas partes del botín.
 */
function arrive(state: GameState): Sack {
  const band = state.threat.comingBand;
  const behindWall = walled(state);
  const share = THREAT.SACK_SHARE * (behindWall ? THREAT.WALLED_SACK : 1);

  const silver = Math.round(state.village.silver * share);
  const grain = Math.round(state.village.grain * share);
  state.village.silver -= silver;
  state.village.grain -= grain;

  // Una cabeza, la mayor que haya: un saqueador se lleva la vaca antes que la
  // gallina. A campo abierto; tras la muralla el ganado está dentro.
  let beast: HerdKind | null = null;
  if (!behindWall) {
    for (const kind of ['cows', 'pigs', 'hens'] as const) {
      if (state.herd[kind] > 0) { state.herd[kind] -= 1; beast = kind; break; }
    }
  }

  state.threat.comingTick = null;
  state.threat.comingBand = 0;
  state.threat.raids += 1;
  return { band, silver, grain, beast, walled: behindWall };
}
