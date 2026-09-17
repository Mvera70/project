// UI-V3 · Qué ilustración lleva cada entrada de la crónica.
// `docs/ui-redesign/piel/plan-piel.md` §3.6.
//
// Pura, sin DOM: no toca el índice de arte (`public/ui/art/index.json`) ni
// decide si el dibujo existe de verdad — eso es cosa de `screens/chronicle.ts`,
// que sabe pintar y sabe leer ese índice (una entrada nunca se queda sin su
// hueco: si el fichero no está listado, el respaldo es la hoja de roble). Esta
// función sólo dice **qué fichero le tocaría** a una entrada si el arte
// existiera, según la tabla del plan.
//
// `null` significa dos cosas distintas y las dos caen al mismo sitio en el
// llamador: «esta entrada no lleva ilustración porque es la decisión sellada»
// (`crossroad_posed`/`crossroad_taken`/`consequence`, que llevan su propio
// documento, §3.2) o «no se encontró el suceso que debería acompañarla» (un
// caso que no debería darse nunca: R-1 empuja el registro y la línea de
// crónica en el mismo tick, `sim.ts` paso 2b). El llamador decide con
// `entry.kind`, no con este valor, si la entrada lleva hueco de ilustración.

import type { ChronicleEntry, HappeningId, HappeningRecord } from '@engine/state';
import { seasonOf } from '@engine/time';

/** Los doce sucesos de R-1 (`state.HAPPENINGS`), cada uno con su dibujo. */
const HAPPENING_ART: Readonly<Record<HappeningId, string>> = {
  lightning_fire: 'fire.svg',
  river_flood: 'flood.svg',
  wolves_at_the_coop: 'wolf.svg',
  wedding: 'wedding.svg',
  pedlar: 'pedlar.svg',
  good_catch: 'fish.svg',
  roof_under_snow: 'season-winter.svg',
  harvest_feast: 'harvest.svg',
  quarrel_in_the_square: 'grudge.svg',
  bear_in_the_wood: 'bear.svg',
  child_lost: 'child.svg',
  stranger_passes: 'road.svg',
};

/**
 * Qué dibujo le corresponde a una entrada de la crónica, según la tabla del
 * plan. `happenings` es `state.happenings` (R-1): sólo hace falta para
 * desambiguar una entrada `kind: 'happening'`, que por sí sola no dice cuál de
 * los doce sucesos fue — el registro del mismo tick sí lo dice.
 */
export function illustrationFor(
  entry: ChronicleEntry,
  happenings: readonly HappeningRecord[],
): string | null {
  switch (entry.kind) {
    case 'founding': return 'founding.svg';
    case 'season': return `season-${seasonOf(entry.tick)}.svg`;
    case 'birth': return 'birth.svg';
    case 'death':
    case 'extinction': return 'death.svg';
    case 'harvest':
    case 'forage': return 'harvest.svg';
    case 'famine': return 'famine.svg';
    case 'plague': return 'plague.svg';
    case 'fire': return 'fire.svg';
    case 'built': return 'built.svg';
    case 'lost':
    case 'abandonment': return 'lost.svg';
    case 'arrival':
    case 'departure': return 'road.svg';
    case 'grudge': return 'grudge.svg';
    case 'succession': return 'succession.svg';
    // §3.6: la decisión —planteada, tomada o su consecuencia— no lleva
    // ilustración: lleva el documento sellado o la tarjeta plana de §3.2.
    case 'crossroad_posed':
    case 'crossroad_taken':
    case 'consequence':
      return null;
    case 'happening': {
      const record = happenings.find((h) => h.tick === entry.tick);
      return record === undefined ? null : HAPPENING_ART[record.id];
    }
    default:
      return null;
  }
}
