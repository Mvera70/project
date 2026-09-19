// G-11 · El estado de la jornada. design.md D.6, §4.3.
//
// **El problema que resuelve, dicho una vez y para siempre.**
//
// Un tick es una semana y una jornada escénica dura ciento veinte segundos, o
// sea que dentro de un solo amanecer-anochecer la aldea vive ocho semanas a ×1
// y sesenta y cuatro a ×64 (D.6.1: la jornada corre a la raíz de la velocidad y
// el mundo a la velocidad entera, así que la razón entre las dos crece con el
// botón). Todo lo que el render saca del tick cambia, por tanto, **a media
// vista**: la querencia de una vaca, el puesto de una gallina en la fila, la
// ruta de un aldeano, la casa que estrena corral. Y cambiar a media vista, en
// un valle que se mira, no se lee como «ha pasado una semana». Se lee como un
// teletransporte.
//
// Hasta aquí cada sistema se defendía solo: `fauna` guardaba su semana, su
// cabaña y su pueblo; los actores guardaban sus rutas; la reunión se preguntaba
// desde el amanecer anterior. Tres rituales parecidos, escritos tres veces, y
// **un sistema nuevo que no lo supiera nacía con el fallo dentro sin que nada
// se quejara**: no hay error de tipos ni prueba que salte, sólo un salto que
// hay que ver para saber que está.
//
// Aquí se hace una vez. `paint` pide el estado de la jornada y reparte ése; lo
// que llega a los sistemas ya viene quieto, y el sistema que se escriba mañana
// lo hereda sin enterarse. **El defecto se invierte**: antes había que acordarse
// de congelar, ahora hay que pedir explícitamente lo vivo, que es lo raro.
//
// § 4.3 intacto: aquí se lee el estado y se copia, nunca se escribe en él y
// nunca se consume azar.

import { NIGHT } from '@derive/animals';
import type { Building, GameState, ValleyMap, Villager } from '@engine/state';

/**
 * A qué hora de la jornada se releva el estado.
 *
 * **Al anochecer, que es cuando no lo ve nadie.** Es una decisión, no un gusto:
 *
 * - **Al amanecer** —lo primero que se probó, y lo que hacían los actores— el
 *   ganado está en pantalla cuando le cambia la querencia, y la querencia se
 *   mueve hasta dos celdas. Se veía el salto: uno por jornada en vez de ciento
 *   veintiocho, pero se veía.
 * - **Al anochecer** no se ve ninguno. El ganado, los cuervos y los peces dejan
 *   de dibujarse en esa misma línea (§10.6), la gente está dentro de casa, y el
 *   lobo empieza justo ahí, o sea que aparece ya en su sitio nuevo. **Quien no
 *   está no salta.**
 *
 * Y como entre el anochecer y el amanecer siguiente no se releva nada, las
 * rutas que los actores tomaban «al amanecer» son exactamente éstas: los dos
 * momentos son el mismo si en medio no cambia nada, y por eso un solo relevo
 * sirve a los dos sistemas que antes lo hacían cada uno por su lado.
 *
 * Es la misma línea en la que los animales se recogen, así que se toma de allí
 * en vez de escribir otra vez el número: si un día la noche cae antes, cae
 * antes para todo el valle a la vez.
 */
const NIGHTFALL = NIGHT;

/**
 * **Y lo que NO se releva más a menudo, aunque se quedara corto.**
 *
 * «Una vez por jornada escénica» suena a intervalo y no lo es: una jornada dura
 * ciento veinte segundos de pantalla, pero el motor corre a la velocidad
 * **entera** mientras la jornada corre a la raíz (D.6.1), así que cuántas
 * semanas caben en un amanecer depende del botón — ocho a ×1, dieciséis a ×4,
 * treinta y dos a ×16 y **sesenta y cuatro a ×64**. A la velocidad alta, lo que
 * se pinta lleva año y pico de retraso sobre la cabecera.
 *
 * Se probó a acotarlo: relevar además cada ocho semanas y al cambiar de
 * estación. **Medido y revertido.** El rebaño saltó hasta **5,096 celdas**
 * —quince metros— contra un techo de 0,4, y por la razón que este fichero ya
 * tenía escrita tres párrafos arriba: un relevo sólo es invisible **cuando el
 * bicho no está en pantalla**, y eso sólo pasa de noche. Relevar de día es
 * exactamente el teletransporte que esto existe para quitar.
 *
 * Así que el desfase se ataca por donde no teletransporta a nadie: **el color
 * de la estación lo toma el render del reloj vivo** y no del congelado
 * (`renderer.ts`, la paleta). Un cambio de color no mueve a nadie de sitio, y
 * era la mitad que el jugador veía — «aparece que es invierno y no se ve que
 * sea invierno».
 *
 * Lo que queda abierto, y es una decisión de diseño con su fork escrito en
 * `docs/historico/next-plan.md`: a ×64 la gente y las casas que se pintan siguen siendo
 * de hasta sesenta y cuatro semanas atrás. Arreglarlo de verdad pide o que la
 * jornada escénica siga a la velocidad entera (y entonces la gente corre), o
 * que a velocidad alta no se dibujen los individuos (y entonces no hay salto
 * que ver, que es el principio del anochecer generalizado), o enganchar el
 * rebaño a la capa de vida, donde un cuerpo no puede teletransportarse porque
 * no evalúa una fórmula.
 */

export interface ScenicState {
  /**
   * El estado que hay que pintar en este instante.
   *
   * Devuelve siempre el de la jornada en curso: el mismo objeto mientras dure,
   * así que quien quiera saber si cambió puede compararlo por identidad.
   */
  of(state: GameState, dayPhase: number): GameState;
  /**
   * Olvidar la jornada. Partida nueva, carga, o un fotograma discontinuo: lo
   * que se congeló pertenece a otra cosa y honrarlo sería peor que no tenerlo.
   */
  reset(): void;
}

/**
 * Una copia que el motor no pueda mover por debajo.
 *
 * Superficial donde basta y profunda donde el motor **escribe dentro**, que es
 * lo que hace fallar a una copia ingenua: construir empuja sobre el mismo array
 * de edificios y derribar escribe en el mismo edificio, así que guardar el
 * array no guarda nada. Lo mismo con la gente: morir es escribir `diedTick` en
 * el aldeano que ya estaba.
 *
 * **Y el mapa con ellos**, que fue lo que se me pasó en la primera versión: el
 * motor tala, construye y desgasta caminos escribiendo dentro de los mismos
 * arrays, así que el terreno cambiaba bajo los pies de una jornada ya
 * congelada. Se notaba donde menos se esperaba —un animal al que `ashore`
 * apartaba del agua aparecía 1,08 celdas más allá en pleno mediodía, sin que
 * ninguna posición hubiese saltado— y costó encontrarlo justamente porque
 * `animalPositions` era continua: lo que se movía era el suelo.
 *
 * Lo que no se copia es lo que el motor no muta en sitio o el valle no dibuja
 * —la crónica, el historial, los flujos de azar—: van por referencia porque
 * copiarlos sería pagar por nada.
 */
function freeze(state: GameState): GameState {
  return {
    ...state,
    herd: { ...state.herd },
    village: { ...state.village },
    map: {
      ...state.map,
      terrain: state.map.terrain.slice(),
      traffic: state.map.traffic.slice(),
      path: state.map.path.slice(),
      ruins: state.map.ruins.slice(),
      forestAge: state.map.forestAge.slice(),
      forestStock: state.map.forestStock.slice(),
    } as ValleyMap,
    buildings: state.buildings.map((building): Building => ({ ...building })),
    people: {
      ...state.people,
      villagers: state.people.villagers.map((villager): Villager => ({ ...villager })),
    },
  };
}

export function createScenicState(): ScenicState {
  let dark = false;
  let held: GameState | null = null;

  return {
    reset(): void {
      dark = false;
      held = null;
    },

    of(state: GameState, dayPhase: number): GameState {
      const night = dayPhase >= NIGHTFALL;
      // **Una sola vez por jornada, y al caer la noche.**
      //
      // La primera versión relevaba también al cambiar el número de día, «por
      // cubrir el primer fotograma». Pero el número de día cambia cuando la
      // fase pasa por cero, o sea **al amanecer**, con el valle entero a la
      // vista: eran dos relevos por jornada y el segundo se veía. Medido, el
      // ganado daba un salto de 1,08 celdas justo al clarear — exactamente el
      // fallo que este fichero existe para quitar, reintroducido por la línea
      // que pretendía ser cuidadosa.
      //
      // El arranque no lo cubre el día: lo cubre `held === null`, que es lo que
      // hay tras un `reset` y en el primer fotograma de la partida.
      if (held === null || (night && !dark)) {
        held = freeze(state);
      }
      dark = night;
      return held;
    },
  };
}
