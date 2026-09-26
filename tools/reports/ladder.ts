// La escalera del juego: lo que un jugador vería llegar, en el orden en que
// llega. La comparten el informe de ritmo (`pace-report.ts`) y el informe del
// valle (`valley-report.ts`), para que no haya dos listas que se separen.

import { population } from '../../src/engine/people/demography';
import { crownRefusal } from '../../src/engine/people/crown';
import { eraOf } from '../../src/derive/era';
import { ringClosed } from '../../src/engine/world/placement';
import type { GameState } from '../../src/engine/state';

export const alive = (s: GameState, kind: string): number =>
  s.buildings.filter((b) => b.kind === kind && b.lostTick === null).length;

/** La escalera: lo que un jugador vería llegar, en el orden en que llega. */
export const LADDER: readonly (readonly [string, (s: GameState) => boolean])[] = [
  ['primer suceso del valle', (s) => s.happenings.length >= 1],
  ['5 personas', (s) => population(s) >= 5],
  ['segunda casa', (s) => alive(s, 'house') + alive(s, 'stone_house') >= 2],
  ['primera decisión', (s) => s.crossroad !== null || s.history.length >= 1],
  ['10 personas', (s) => population(s) >= 10],
  ['pozo', (s) => alive(s, 'well') >= 1],
  ['15 personas', (s) => population(s) >= 15],
  ['granero', (s) => alive(s, 'granary') >= 1],
  ['capilla', (s) => alive(s, 'chapel') >= 1],
  ['20 personas', (s) => population(s) >= 20],
  ['herrería', (s) => alive(s, 'smithy') >= 1],
  ['primera piedra', (s) => s.village.stone > 0],
  ['muralla', (s) => alive(s, 'palisade') >= 1],
  ['EDAD DE PIEDRA (1ª obra)', (s) => s.buildings.some((b) => b.tier > 0 && b.lostTick === null)],
  ['molino', (s) => alive(s, 'mill') >= 1],
  ['corona posible', (s) => crownRefusal(s) !== 'small'],
  ['30 personas', (s) => population(s) >= 30],
  // A1 · el peldaño de la fase 3 (§1b): la villa cerrada, que es lo que un
  // asedio necesita para tener contra qué llegar.
  ['portón', (s) => s.buildings.some((b) => b.kind === 'gate' && b.lostTick === null)],
  // B1 · el primer asalto del clan vecino (§1b): la primera vez que el valle
  // paga por lo que ha juntado.
  ['primer asalto', (s) => s.threat.raids > 0],
  // C3 · la atalaya que la aldea se levanta sola después del primer saqueo. El
  // peldaño dice **cuánto tarda en aprender la lección**, que es lo que la
  // puerta de `WATCHTOWER_AFTER_RAIDS` decide.
  ['atalaya', (s) => alive(s, 'watchtower') >= 1],
  ['VILLA CERRADA', (s) => ringClosed(s)],
  // A4 · las dos eras que el valle **es** (§1b, `derive/era.ts`). La tercera es
  // la villa cerrada de arriba, que es la misma marca.
  ['ERA: aldea', (s) => eraOf(s) !== 'hamlet'],
  ['ERA: villa', (s) => eraOf(s) === 'town'],
  // A4 · y la piedra del cerco, que hasta hoy no llegaba nunca: la encrucijada
  // de la primera piedra obliga a elegir y la política elige las casas.
  ['muralla de piedra', (s) => alive(s, 'wall') >= 1],
  // A3 · el bastión, que es el último peldaño de la fase 3: sólo se pide con
  // el cerco ya cerrado y sobre un tramo que ya es de piedra, así que su hora
  // dice cuánto tarda un valle en tener **algo más que muro** que ofrecerle a
  // la fase 4.
  ['bastión', (s) => alive(s, 'bastion') >= 1],
];

