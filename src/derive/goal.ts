// RD-5 (Vera, 1 oct 2026: «metas a la vista») · **Lo que el valle persigue
// ahora**, en una clave del banco.
//
// El plan de ritmo (§4) pide un «objetivo de aldea»: un proyecto que nace del
// estado, que el jugador sabe que persigue y que ve acercarse. No es una lista
// de tareas ni una moneda: es una sola línea bajo la era de la bandeja, y cada
// peldaño lo cumple el valle solo —la cosecha llega, la gente sube por el
// camino, la leña se junta—. Lo que hace el jugador lo acerca o lo aleja.
//
// Puro: lee el estado y no lo toca. La frase sale del banco (`goal.*`).

import { FATE, TIME } from '@engine/balance';
import { population } from '@engine/people/demography';
import type { GameState } from '@engine/state';
import { weekOf } from '@engine/time';
import { nextProject, woodCostOf } from '@engine/world/works';
import { eraOf } from './era';

export interface Goal {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/**
 * Guardada por tick, como `doingNow`: `nextProject` recorre el mapa buscando
 * solar y esto se pregunta en cada fotograma.
 */
const SAID = new WeakMap<GameState, { tick: number; wood: number; goal: Goal | null }>();

/** La meta de esta semana, o `null` si el valle se ha acabado. */
export function goalOf(state: GameState): Goal | null {
  const wood = Math.floor(state.village.wood);
  const known = SAID.get(state);
  if (known !== undefined && known.tick === state.tick && known.wood === wood) return known.goal;
  const goal = choose(state, wood);
  SAID.set(state, { tick: state.tick, wood, goal });
  return goal;
}

function choose(state: GameState, wood: number): Goal | null {
  if (state.ended !== null || population(state) === 0) return null;
  // 1 · **La primera cosecha.** Es lo primero que una pareja espera y lo que
  // decide si pasa el primer invierno; la cuenta atrás es exacta porque la
  // siega del motor cae siempre en `TIME.HARVEST_WEEK`.
  // Las fases del campo (`fields.*`) también son `kind: 'harvest'`: la siega es `harvest.*`.
  if (!state.chronicle.some((entry) => entry.templateKey.startsWith('harvest.'))) {
    const weeks = (TIME.HARVEST_WEEK - weekOf(state.tick) + TIME.WEEKS_PER_YEAR) % TIME.WEEKS_PER_YEAR;
    if (weeks === 0) return { key: 'goal.first_harvest.now', params: {} };
    return { key: weeks === 1 ? 'goal.first_harvest.one' : 'goal.first_harvest', params: { weeks } };
  }
  // 2 · **Dejar de ser un caserío de pocos.** La misma raya que la tirada de
  // los sucesos pequeños (`FATE.HAMLET_PEOPLE`): pasada, el valle tiene el
  // noticiario de una aldea.
  const people = population(state);
  if (people < FATE.HAMLET_PEOPLE) return { key: 'goal.souls', params: { people, of: FATE.HAMLET_PEOPLE } };
  // 3 · **La obra que espera madera**: lo que se levanta a continuación y
  // cuánto le falta. Si ya hay una en marcha, la meta es la de la era.
  const next = state.works.length === 0 ? nextProject(state) : null;
  // Las mejoras de piedra (`Upgrade`) no esperan madera: se quedan fuera.
  if (typeof next === 'string') {
    const cost = Math.ceil(woodCostOf(state, next));
    if (wood < cost) return { key: 'goal.next', params: { what: `building.${next}`, wood, cost } };
  }
  // 4 · Y la era siguiente: la fragua hace aldea, la muralla cerrada hace villa (§1b).
  const era = eraOf(state);
  if (era === 'hamlet') return { key: 'goal.forge', params: {} };
  if (era === 'village') return { key: 'goal.wall', params: {} };
  return null;
}
