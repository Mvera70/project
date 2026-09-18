// A4 · En qué fase está el valle. design.md §1b.
//
// §1b parte la vida de una partida en cuatro fases —caserío, aldea, villa
// cerrada, asedio— y hasta A4 esas cuatro sólo existían en la tabla del
// documento: el juego las cumplía sin saber en cuál estaba, y por tanto sin
// poder decirlo (A5) ni condicionar nada a ellas.
//
// **Se deriva y no se guarda**, y es deliberado: las tres eras son una lectura
// de cosas que el estado ya tiene —una fragua, una marca de cerco cerrado— así
// que guardarlas sería un campo más que migrar y, peor, una segunda verdad que
// se puede desincronizar de la primera. Es la misma decisión que §7.4c tomó con
// el anillo: leerlo de la muralla en vez de guardarlo.
//
// **Y el asedio no es una era.** Las tres de aquí son lo que el valle **es**;
// que además esté siendo atacado es lo que le **pasa**, dura una semana y lo
// dice `derive/garrison.ts` (`alertOf`). Un valle asediado sigue siendo una
// villa cerrada, y cuando el asalto pasa no «vuelve» a ninguna fase.

import { count } from '@engine/subsistence/building-counts';
import type { GameState } from '@engine/state';

/**
 * Las tres eras de un valle, en orden.
 *
 * Los nombres son los de `plan-meta.md` (fila A4) y se corresponden uno a uno
 * con las tres primeras fases de §1b: `hamlet` el caserío, `village` la aldea
 * con sus oficios, `town` la villa cerrada.
 */
export type Era = 'hamlet' | 'village' | 'town';

/**
 * Cuántos oficios hacen falta para dejar de ser un caserío.
 *
 * **La fragua, y sólo la fragua.** §1b llama a la fase 2 «oficios, capilla, la
 * piedra» y de esas tres la fragua es la que manda: es la que abre la piedra
 * (`canQuarry` la exige), la que la muralla espera (§7.3 punto 8) y la que la
 * escalera del ritmo ya mide como peldaño —**40 h de reloj**, medido en
 * veinticuatro semillas—. Pedir además capilla movería la era a las 50 h por una
 * razón de fe y no de oficio, y pedir las tres la ataría a la más tardía de
 * ellas sin decir nada nuevo.
 */
function hasTrades(state: GameState): boolean {
  return count(state, 'smithy') > 0;
}

/**
 * En qué era está el valle ahora mismo.
 *
 * Pura y monótona: una era no vuelve atrás. Esto último importa y es una
 * decisión, no un descuido — un valle al que le tiran la fragua en un asalto
 * **sigue siendo** una aldea, porque la marca de que lo fue es que llegó a
 * tenerla. Se consigue leyendo marcas permanentes (`wall_closed`) y, para la
 * fragua, el hecho de que exista o haya existido.
 */
export function eraOf(state: GameState): Era {
  // La villa cerrada es la marca de A1: permanente, puesta la semana en que el
  // anillo se cierra, y la misma que la crónica anuncia con peso 3.
  if (state.flags['wall_closed'] !== undefined) return 'town';
  if (hasTrades(state) || everHadTrades(state)) return 'village';
  return 'hamlet';
}

/**
 * Si el valle **llegó a tener** fragua, aunque hoy no la tenga.
 *
 * Una fragua quemada por un rayo (§7.10) o perdida en un asalto no devuelve el
 * valle al caserío: lo que la era cuenta es lo que la aldea alcanzó. Se lee de
 * los edificios perdidos, que es donde el motor guarda lo que hubo (`lostTick`).
 */
function everHadTrades(state: GameState): boolean {
  return state.buildings.some((b) => b.kind === 'smithy');
}

/**
 * Lo que falta para la era siguiente, o nada si ya es una villa cerrada.
 *
 * Para la interfaz (A5): una cabecera que dice en qué fase está el valle sin
 * decir hacia dónde va cuenta la mitad. No devuelve texto —eso es del banco de
 * plantillas— sino **qué** falta, que es lo único que esta capa sabe.
 */
export function nextEra(state: GameState): Era | null {
  const era = eraOf(state);
  return era === 'hamlet' ? 'village' : era === 'village' ? 'town' : null;
}
