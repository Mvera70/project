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
import { ford } from '@engine/sim';
import { standing } from './anchors';

export interface Gathering {
  x: number;
  y: number;
  /** Tick en que se convocó, para que el dibujo sepa cuánto lleva. */
  sinceTick: number;
  /** Cuántos ticks dura en total. */
  ticks: number;
}

// El vado ya no se aproxima: es el del motor.
//
// §11.8 lo llevaba declarado como deuda con estas palabras: «repetir el cálculo
// exacto del motor exigiría exportarlo». G-10 lo exportó, porque el render 3D
// necesitaba poner las piedras de paso en el sitio de verdad, así que la deuda
// se paga de camino. Las reuniones en el vado se dibujaban en el centro de la
// aldea, que es donde no está el vado.

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
  // P-1 · **«in the square» es la plaza, y desde el esquema 8 la plaza existe**:
  // un punto elegido el día de la fundación, fijo, con su círculo reservado
  // (`engine/world/plaza.ts`). Antes era `valleyCore` —la media de los centros
  // de los edificios— que se movía de 4,2 a 10,8 celdas entre la fundación y el
  // año 60, así que la aldea se reunía cada década en un sitio distinto sin que
  // nada hubiera cambiado. `valleyCore` se queda para el vado y para lo que
  // quiera decir «el centro de lo construido», que es otra cosa.
  if (where === 'ford') return ford(state);
  return { x: state.plaza.x, y: state.plaza.y };
}

/**
 * Las reuniones vivas ahora mismo.
 *
 * `days` del esquema se lee como ticks de simulación y no como séptimos de
 * semana. Es una decisión, y la razón es que a ×1 un tick es un día en
 * pantalla (§10.6): una reunión de cuatro días que durase medio tick no se
 * vería nunca. Queda anotada en §11.8 para la revisión artística.
 */
export function gatheringsAt(
  state: GameState, catalogue: Catalogue, sinceTick: number = state.tick,
): Gathering[] {
  const out: Gathering[] = [];
  for (const decision of state.history) {
    if (decision.tick > state.tick) continue;
    const template = catalogue.find((t) => t.id === decision.templateId);
    const option = template?.options.find((o) => o.id === decision.optionId);
    if (option === undefined) continue;
    for (const effect of option.visible) {
      if (effect.k !== 'gather') continue;
      // Viva ahora, o viva en algún momento desde `sinceTick`.
      //
      // El render 2D pregunta por ahora mismo y no pasa el tercer argumento, así
      // que para él no cambia nada. El 3D pregunta por «desde el amanecer
      // anterior», porque allí los destinos del día se deciden al amanecer y una
      // reunión de cuatro semanas cabe entera entre dos amaneceres: preguntando
      // sólo por ahora, la mitad de las reuniones no se verían nunca.
      if (decision.tick + effect.days <= sinceTick) continue;
      const point = placeOf(state, effect.where);
      out.push({ x: point.x, y: point.y, sinceTick: decision.tick, ticks: effect.days });
    }
  }
  // R-1 · y los sucesos del valle (§7.10) juntan a la gente igual que una
  // decisión: una boda, la fiesta de la cosecha, el corro de una riña. Mismo
  // efecto visible, misma ventana, misma reunión para `staging.ts`. **Pero la
  // reunión de una decisión manda**: es la del jugador, y §11.8 promete que la
  // aldea va donde él dijo. Si hay una viva, la del suceso espera.
  if (out.length > 0) return out;
  for (const happening of state.happenings) {
    if (happening.tick > state.tick) continue;
    for (const effect of happening.visible) {
      if (effect.k !== 'gather') continue;
      if (happening.tick + effect.days <= sinceTick) continue;
      const point = placeOf(state, effect.where);
      out.push({ x: point.x, y: point.y, sinceTick: happening.tick, ticks: effect.days });
    }
  }
  return out;
}
