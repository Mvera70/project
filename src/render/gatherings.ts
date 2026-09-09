// M-32 · Las reuniones que una decisión provoca. design.md §11.5, §11.8.
//
// El catálogo declara 56 opciones y 42 de ellas tienen un efecto visible que
// no cambiaba nada en el valle: enfocaban una celda donde no aparecía nada
// nuevo. `gather` es 25 de esas 42, y es el más fácil de creer — la aldea se
// junta en la plaza, en la capilla o en el vado, y se ve.
//
// **Derivado, no estado.** No se guarda nada: el historial de decisiones ya
// dice qué se eligió y en qué semana, y el catálogo dice qué efecto visible
// tenía esa opción. Con eso basta para saber si hoy hay gente reunida y dónde.
// Es el mismo trato que §10.6 da a la multitud y §7.7 al ganado, y cumple
// §11.4 por construcción: no hay animación en marcha que un salto de reloj
// pueda dejar a medias, porque la respuesta se recalcula desde el tick.

import type { Catalogue } from '@engine/crossroads/schema';
import type { GameState } from '@engine/state';
import { standing, valleyCore } from './anchors';

export interface Gathering {
  x: number;
  y: number;
  /** Tick en que se convocó, para que el dibujo sepa cuánto lleva. */
  sinceTick: number;
  /** Cuántos ticks dura en total. */
  ticks: number;
}

/**
 * El vado: la orilla transitable más cercana al núcleo (§11.5, v2.66). Aquí se
 * aproxima por el núcleo, y está declarado como deuda en §11.8 — repetir el
 * cálculo exacto del motor exigiría exportarlo, y de momento la diferencia es
 * de unas pocas celdas sobre un mapa que se ve entero.
 */
function ford(state: GameState): { x: number; y: number } {
  return valleyCore(state);
}

/**
 * Dónde se junta la gente para un `gather`. Se recalcula desde el estado de
 * hoy, no desde el de la semana en que se decidió: si la capilla se quemó
 * entretanto, la reunión ocurre donde la aldea puede reunirse ahora.
 */
function placeOf(state: GameState, where: 'square' | 'chapel' | 'ford'): { x: number; y: number } {
  if (where === 'chapel') {
    const chapel = standing(state, 'chapel')[0] ?? standing(state, 'church')[0];
    if (chapel !== undefined) {
      return { x: chapel.x + chapel.w * 0.5, y: chapel.y + chapel.h * 0.5 };
    }
  }
  return where === 'ford' ? ford(state) : valleyCore(state);
}

/**
 * Las reuniones vivas ahora mismo.
 *
 * `days` del esquema se lee como ticks de simulación y no como séptimos de
 * semana. Es una decisión, y la razón es que a ×1 un tick es un día en
 * pantalla (§10.6): una reunión de cuatro días que durase medio tick no se
 * vería nunca. Queda anotada en §11.8 para la revisión artística.
 */
export function gatheringsAt(state: GameState, catalogue: Catalogue): Gathering[] {
  const out: Gathering[] = [];
  for (const decision of state.history) {
    if (decision.tick > state.tick) continue;
    const template = catalogue.find((t) => t.id === decision.templateId);
    const option = template?.options.find((o) => o.id === decision.optionId);
    if (option === undefined) continue;
    for (const effect of option.visible) {
      if (effect.k !== 'gather') continue;
      if (state.tick - decision.tick >= effect.days) continue;
      const point = placeOf(state, effect.where);
      out.push({ x: point.x, y: point.y, sinceTick: decision.tick, ticks: effect.days });
    }
  }
  return out;
}
