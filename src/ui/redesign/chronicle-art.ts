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

/** Los sucesos de R-1 y las visitas de M-0 (`state.HAPPENINGS`), cada uno con su dibujo. */
const HAPPENING_ART: Readonly<Record<HappeningId, string>> = {
  lightning_fire: 'fire.png',
  river_flood: 'flood.png',
  wolves_at_the_coop: 'wolf.png',
  wedding: 'wedding.png',
  pedlar: 'pedlar.png',
  good_catch: 'fish.png',
  roof_under_snow: 'season-winter.png',
  harvest_feast: 'harvest.png',
  quarrel_in_the_square: 'grudge.png',
  bear_in_the_wood: 'bear.png',
  child_lost: 'child.png',
  stranger_passes: 'road.png',
  // M-0 · las visitas del camino: quien sube a vender es un carro en el camino,
  // el mismo dibujo del buhonero, que es lo que siempre fueron.
  factor_visit: 'pedlar.png',
  drover_visit: 'pedlar.png',
  salt_visit: 'pedlar.png',
  // M-2 · lo que los medios abren. La fiesta del barril es una fiesta y la
  // matanza también se celebra; las ratas son una pérdida del granero.
  ale_feast: 'harvest.png',
  pig_slaughter: 'harvest.png',
  rats_in_the_granary: 'lost.png',
};

/** Los medios estables de M-2: una ilustración por cosa entregada al valle. */
const MEANS_ART: Readonly<Record<string, string>> = {
  'means.plough.given': 'means-plough.png',
  'means.pigs.given': 'means-pigs.png',
  'means.axe.given': 'means-axe.png',
  'means.relic.given': 'means-relic.png',
  'means.arms.given': 'means-arms.png',
  'means.bows.given': 'means-bows.png',
  'means.tower.given': 'means-tower.png',
  'means.gate.given': 'means-gate.png',
  'means.hand.given': 'means-hand.png',
  'means.ale.given': 'means-ale.png',
};

/**
 * B1–B4 · **Las líneas del asedio, cada una con su dibujo.**
 *
 * Van por clave y no por `kind` —como las de M-0— porque las seis son cuadros
 * distintos: un jinete bajando del pasto alto no se parece a una avalancha
 * golpeando un portón, y ninguna de las dos se parece a un valle tomado. Con la
 * tabla por `kind` las seis caían al respaldo de la hoja de roble, que es lo que
 * pasaba desde B1: **las entradas de más peso de la crónica —peso 3, las que la
 * partida cuenta— eran las únicas sin imagen.**
 *
 * Los ficheros están normalizados e indexados en `public/ui/art/index.json`.
 * El encargo visual y la correspondencia completa están en
 * `docs/plan-arte-pendiente.md`.
 */
const RAID_ART: Readonly<Record<string, string>> = {
  // El aviso: humo en la loma de enfrente, o el jinete que baja a decirlo.
  'raid.coming': 'raid-coming.png',
  // La plata subiendo la ladera y la partida dándose la vuelta.
  'raid.turned_back': 'raid-paid.png',
  // El saqueo, con la aldea abierta y con la aldea cerrada.
  'raid.open': 'raid-sack.png',
  'raid.walled': 'raid-walled.png',
  // El asalto: la avalancha contra el portón.
  'raid.assault': 'raid-assault.png',
  // Y las dos maneras de acabar.
  'raid.held': 'raid-held.png',
  'raid.stormed': 'raid-stormed.png',
  // La cabeza de ganado que se llevan de paso comparte el dibujo del saqueo.
  'raid.beast': 'raid-sack.png',
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
    case 'founding': return 'founding.png';
    case 'season': return `season-${seasonOf(entry.tick)}.png`;
    case 'birth': return 'birth.png';
    case 'death':
    case 'extinction': return 'death.png';
    case 'harvest':
    case 'forage': return 'harvest.png';
    case 'famine': return 'famine.png';
    case 'plague': return 'plague.png';
    case 'fire': return 'fire.png';
    case 'built': return 'built.png';
    case 'lost':
    case 'abandonment': return 'lost.png';
    case 'arrival':
    case 'departure': return 'road.png';
    case 'grudge': return 'grudge.png';
    case 'succession': return 'succession.png';
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
    // M-0 · lo del camino lleva el carro del buhonero, que es lo que se ve
    // cuando alguien sube a vender o el hombre del señor viene a cobrar.
    case 'road':
      return 'pedlar.png';
    case 'means':
      return MEANS_ART[entry.templateKey] ?? null;
    // B1–B4 · el asedio, por clave: ver `RAID_ART`.
    case 'raid':
      return RAID_ART[entry.templateKey] ?? null;
    default:
      return null;
  }
}
