// RD-4 (Vera, 1 oct 2026) · **El niño perdido, como señal en el mapa.**
// `docs/plan-ritmo-descanso-y-progresion-2026-09-29.md`, RD-4.
//
// Hasta RD-4 el suceso `child_lost` de §7.10 se perdía y se encontraba en la
// misma línea («Found by the ford, cold and whole») y el jugador no podía hacer
// nada: lo leía. Ahora la semana del suceso el niño espera en la linde del
// bosque con una señal encima (`render3d/life/lost-child.ts`), y tocarla manda
// a buscarlo al adulto libre más cercano. Lo que pasó entra aquí la semana
// siguiente, como cualquier acto (§2.60, regla 2): con el acto `search`, quien
// fue a por él lo trae, el ánimo se recupera y el niño le debe algo; sin él,
// lo encuentra el valle al anochecer, como antes, y el ánimo perdido no vuelve.
//
// No consume ninguna tirada: un acto no puede desplazar la partida.

import { FATE, LIFE, OPINION } from '../balance';
import { isHere } from '../people/demography';
import { adjustOpinion } from '../people/opinions';
import { ageOf } from '../people/villagers';
import type { ChronicleEntry, GameState, PlayerAct, VillagerId } from '../state';

export type SearchAct = Extract<PlayerAct, { kind: 'search' }>;

/** El suceso de la semana pasada, si fue un niño perdido, y quién era. */
export function lostLastWeek(state: GameState): { tick: number; child: VillagerId | null } | null {
  const record = state.happenings.find((h) => h.id === 'child_lost' && h.tick === state.tick - 1);
  if (record === undefined) return null;
  return { tick: record.tick, child: record.who[0] ?? null };
}

/** Si el acto vale: el niño de esa semana, y quien fue a por él un adulto que sigue aquí. */
export function searchValid(state: GameState, act: SearchAct): boolean {
  const lost = lostLastWeek(state);
  if (lost === null || lost.tick !== act.sourceTick || lost.child !== act.child) return false;
  const searcher = state.people.villagers.find((v) => v.id === act.searcher);
  return searcher !== undefined && isHere(searcher) && ageOf(searcher, state.tick) >= LIFE.ADULT[0];
}

/**
 * Cierra el niño perdido de la semana pasada: la línea de quien lo trajo, o la
 * de que lo encontró el valle. `null` si la semana pasada no se perdió nadie.
 */
export function settleLostChild(
  state: GameState, act: SearchAct | null, season: string, year: number,
): ChronicleEntry | null {
  const lost = lostLastWeek(state);
  if (lost === null) return null;
  if (act !== null) {
    const searcher = state.people.villagers.find((v) => v.id === act.searcher)!;
    state.village.morale = Math.max(0, Math.min(100, state.village.morale + FATE.CHILD_FOUND_MORALE));
    adjustOpinion(state, act.child, act.searcher, OPINION.WAS_SAVED);
    return {
      tick: state.tick, kind: 'happening',
      templateKey: searcher.named ? 'lost.found_by.named' : 'lost.found_by',
      params: { season, year, ...(searcher.named ? { A: searcher.name } : {}) },
      weight: 2,
    };
  }
  return { tick: state.tick, kind: 'happening', templateKey: 'lost.found_at_dusk', params: { season, year }, weight: 1 };
}
