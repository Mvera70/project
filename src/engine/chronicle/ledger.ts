// F3a · El libro de cuentas de una partida. docs/plan-final.md §2.
//
// **Lo pidió el dueño del diseño** el 18 sep 2026: «estaría muy, muy, muy
// interesante poder ver una serie de estadísticas, rollo casas construidas,
// población máxima alcanzada, nacimiento, muerte… que cada partida al final
// tenga ese resumen, que sea muy llamativo y muy fácil de comparar».
//
// **Vive en el motor y no en `derive/`, y no es por gusto.** Quien lo necesita
// primero es `save.archiveGame`, que es del motor, y el motor no puede importar
// de `derive/` (CLAUDE.md, las cuatro capas). Tiene además su precedente al
// lado: `digest.ts` hace exactamente esto —leer la crónica como **datos** y no
// como texto— para el parte de bienvenida de §9.2, sobre una ventana de
// semanas. Esto es la misma lectura con la ventana abierta a la partida entera.
//
// **La forma del `Ledger` vive en `state.ts`** y no aquí, por lo mismo que la de
// todo lo que se guarda: es parte del archivo (`ArchivedGame.ledger`) y si la
// declarara este fichero, `state.ts` tendría que importarlo y los dos se
// importarían en círculo. Aquí vive **cómo se cuenta**, que es lo que cambia.
//
// **Y casi todo sale de la crónica, que es lo que hace este plan barato.** La
// crónica guarda cada nacimiento, muerte, llegada, marcha, obra, decisión,
// medio dado, corona y asalto con sus cifras, y sobrevive en el archivo
// (`ArchivedGame.chronicle`). Lo único que la crónica **no** puede decir es
// **qué quedó en pie** el último día: eso hay que mirarlo en el estado antes de
// cerrarlo, y por eso son los dos únicos campos que pueden venir vacíos.

import { BUILDINGS, TIME } from '../balance';
import { yearOf } from '../time';
import type { ChronicleEntry, GameState, Ledger } from '../state';

/** Cuántas cabezas cuenta una entrada. Las agregadas llevan su `count`. */
function headsIn(entry: ChronicleEntry): number {
  const count = entry.params['count'];
  return typeof count === 'number' && count > 0 ? count : 1;
}

/** Un parámetro numérico de una entrada, o cero. */
function numberIn(entry: ChronicleEntry, key: string): number {
  const value = entry.params[key];
  return typeof value === 'number' && value > 0 ? value : 0;
}

/** Las clases de obra que son de piedra, leídas de la tabla y no a mano. */
const STONE_KINDS: ReadonlySet<string> = new Set(
  Object.entries(BUILDINGS)
    .filter(([, spec]) => spec.tier > 0)
    .map(([kind]) => kind),
);

/**
 * Las cuentas que salen de la crónica, que son casi todas.
 *
 * `endedTick` es el último tick de la partida y `peak` su marca de población,
 * los dos únicos datos de fuera: el resto se cuenta aquí entrada a entrada.
 */
export function ledgerFromChronicle(
  chronicle: readonly ChronicleEntry[],
  endedTick: number,
  peak: number,
): Ledger {
  const ledger: Ledger = {
    years: yearOf(endedTick),
    peak,
    raidsHeld: 0,
    born: 0,
    died: 0,
    arrived: 0,
    left: 0,
    built: 0,
    lostWorks: 0,
    decisions: 0,
    given: 0,
    kings: 0,
    raids: 0,
    slain: 0,
    fallen: 0,
    stoneYear: null,
    houses: null,
    wall: null,
  };

  for (const entry of chronicle) {
    switch (entry.kind) {
      case 'birth':
        ledger.born += headsIn(entry);
        break;
      // Una extinción es la muerte del último: cuenta como muerte, igual que en
      // el parte de bienvenida (`digest.ts`).
      case 'death':
      case 'extinction':
        ledger.died += headsIn(entry);
        break;
      case 'arrival':
        ledger.arrived += headsIn(entry);
        break;
      case 'departure':
        ledger.left += headsIn(entry);
        break;
      case 'built':
        ledger.built += 1;
        // **El año de la primera piedra**, que es el peldaño de la fase 2 y una
        // de las cosas que un jugador compara. La clase sale del parámetro que
        // la línea ya lleva, y si algún día se levanta otra obra de piedra, la
        // tabla de §12 la trae sin tocar esto.
        if (ledger.stoneYear === null
          && STONE_KINDS.has(String(entry.params['building'] ?? ''))) {
          ledger.stoneYear = yearOf(entry.tick);
        }
        break;
      case 'lost':
        ledger.lostWorks += 1;
        break;
      // Una decisión **contestada**, no planteada: lo que cuenta es lo que el
      // jugador hizo, y §8.6 plantea muchas más de las que se cierran.
      case 'crossroad_taken':
        ledger.decisions += 1;
        break;
      case 'means':
        ledger.given += 1;
        break;
      // K-1 · la corona puesta. `crown.set_aside` es la misma clase de entrada
      // y no es una corona: se distingue por la clave, que es lo que la crónica
      // guarda para poder contar sin leer.
      case 'succession':
        if (entry.templateKey.startsWith('crown.given')) ledger.kings += 1;
        break;
      // B1–B4 · el asedio. Las claves distinguen las cuatro maneras en que un
      // asalto acaba, y las dos últimas llevan encima lo que costó.
      case 'raid':
        if (entry.templateKey === 'raid.held') {
          ledger.raidsHeld += 1;
          ledger.raids += 1;
          ledger.slain += numberIn(entry, 'slain');
          ledger.fallen += numberIn(entry, 'fallen');
        } else if (entry.templateKey === 'raid.stormed') {
          ledger.raids += 1;
          ledger.slain += numberIn(entry, 'slain');
          ledger.fallen += numberIn(entry, 'fallen');
        } else if (entry.templateKey === 'raid.open'
          || entry.templateKey === 'raid.walled'
          || entry.templateKey === 'raid.assault') {
          // Un saqueo y un asalto que llega son la misma visita contada al
          // llegar; `raid.assault` se resuelve después en `held` o `stormed`,
          // así que sólo cuenta una vez y se cuenta aquí.
          if (entry.templateKey !== 'raid.assault') ledger.raids += 1;
        }
        break;
      default:
        break;
    }
  }
  return ledger;
}

/**
 * Las cuentas de la partida que acaba de terminar, con lo que quedó en pie.
 *
 * Se llama **antes de cerrar** el estado (`save.archiveGame`), que es el único
 * momento en que se puede saber qué seguía levantado el último día.
 */
export function ledgerOf(state: GameState): Ledger {
  const ended = state.ended?.tick ?? state.tick;
  const ledger = ledgerFromChronicle(state.chronicle, ended, state.peakPeople);
  const standing = state.buildings.filter((b) => b.lostTick === null);
  return {
    ...ledger,
    houses: standing.filter((b) => b.kind === 'house' || b.kind === 'stone_house').length,
    // A3 · el bastión es una pieza de muralla, así que cuenta como ella.
    wall: standing.filter((b) => b.kind === 'palisade' || b.kind === 'wall' || b.kind === 'bastion').length,
  };
}

/**
 * Cuántas semanas de juego son esos años, para quien quiera decirlo en horas de
 * reloj: a catorce minutos por semana, una hora real es un mes de juego
 * (`CLAUDE.md`). No se guarda —se deriva— porque es la misma cifra dicha en
 * otra unidad.
 */
export function weeksOf(ledger: Ledger): number {
  return ledger.years * TIME.WEEKS_PER_YEAR;
}
