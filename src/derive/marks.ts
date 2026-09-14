// M-33 · Las otras marcas que una decisión deja. design.md §11.8.
//
// Hermano de `gatherings.ts` y con la misma regla: **derivado, nada de estado
// nuevo**. El historial dice qué se decidió y cuándo, el catálogo dice qué
// efecto visible tenía esa opción, y de ahí sale si hoy hay un estandarte
// izado o un edificio a oscuras.
//
// Cubre `banner` y `douse`. `scar` sigue fuera y está declarado como deuda en
// §11.8: de sus tres variantes sólo `grave_row` es reconstruible, y las otras
// dos dependen de qué ardió o se taló aquella semana en concreto.

import { MARKS, TIME } from '@engine/balance';
import type { Catalogue } from '@engine/crossroads/schema';
import type { BuildingId, GameState } from '@engine/state';
import { standing, valleyCore } from './anchors';

export interface Banner {
  x: number;
  y: number;
  colour: string;
}

/** Los efectos visibles de una decisión, si la plantilla y la opción existen. */
function visibleOf(
  catalogue: Catalogue,
  templateId: string,
  optionId: string,
): Catalogue[number]['options'][number]['visible'] {
  const template = catalogue.find((t) => t.id === templateId);
  return template?.options.find((o) => o.id === optionId)?.visible ?? [];
}

/**
 * Los estandartes izados ahora mismo sobre el núcleo.
 *
 * `years` del esquema se lee tal cual: un estandarte de seis años ondea seis
 * años. A diferencia de `days` en las reuniones, aquí la unidad del esquema y
 * la del juego ya coinciden y no hay nada que interpretar.
 *
 * Con una excepción que sí hubo que aprender: **`years: 0` es para siempre**,
 * la misma convención que las banderas de §3.1.
 */
export function bannersAt(state: GameState, catalogue: Catalogue): Banner[] {
  const out: Banner[] = [];
  const core = valleyCore(state);
  for (const decision of state.history) {
    if (decision.tick > state.tick) continue;
    for (const effect of visibleOf(catalogue, decision.templateId, decision.optionId)) {
      if (effect.k !== 'banner') continue;
      // `years: 0` es **para siempre**, igual que en las banderas de §3.1. Es
      // la convención que ya usaba el catálogo y que este módulo leía como
      // «dura cero»: el estandarte gris de `winter_grain_debt.kneel` —el de
      // haberse arrodillado ante el señor— no se izaba jamás por eso.
      if (effect.years > 0
        && state.tick - decision.tick >= effect.years * TIME.WEEKS_PER_YEAR) continue;
      out.push({ x: core.x, y: core.y, colour: effect.colour });
    }
  }
  return out;
}

/**
 * Los edificios a oscuras: sin humo, sin luz y sin velas.
 *
 * El esquema de `douse` no trae duración —dice qué se apaga, no cuánto—, así
 * que la pone `MARKS.DOUSE_TICKS`. Un apagón que durase para siempre sería un
 * edificio roto, y uno que durase un solo tick no se vería a ninguna velocidad
 * por encima de ×4.
 *
 * Cuando el efecto nombra a alguien del reparto (`who`), se apaga la casa de
 * esa persona: es lo que A.7 prometía y §11.5 arregló en el motor. El reparto
 * está guardado en la decisión, así que aquí se puede resolver igual.
 */
export function dousedAt(state: GameState, catalogue: Catalogue): Set<BuildingId> {
  const out = new Set<BuildingId>();
  for (const decision of state.history) {
    if (decision.tick > state.tick) continue;
    if (state.tick - decision.tick >= MARKS.DOUSE_TICKS) continue;
    for (const effect of visibleOf(catalogue, decision.templateId, decision.optionId)) {
      if (effect.k !== 'douse') continue;

      if (effect.who !== undefined) {
        const who = decision.cast[effect.who];
        const person = who === undefined
          ? undefined
          : state.people.villagers.find((v) => v.id === who);
        if (person?.homeId !== null && person?.homeId !== undefined) {
          out.add(person.homeId);
          continue;
        }
      }

      // Sin `who`, o con un reparto que ya no se puede resolver: el primero de
      // ese tipo en pie, que es el mismo respaldo que usa el motor (§11.5).
      const building = standing(state, effect.kind)[0];
      if (building !== undefined) out.add(building.id);
    }
  }
  return out;
}
