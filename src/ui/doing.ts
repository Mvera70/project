// Qué está haciendo la aldea ahora mismo. design.md §11.1.1, §11.6.
//
// **La tira dice cómo está la aldea; esto dice qué está haciendo.** Y faltaba,
// hasta el punto de que el dueño del diseño lo dijo con estas palabras: «los
// recursos que mostramos ahora mismo no sirven para nada tampoco… no hay
// respuestas visuales, no hay nada».
//
// Cuatro cifras y tres palancas no cierran el bucle por sí solas: el jugador
// ordena «que se levante primero un granero» y en pantalla no hay nada que diga
// si eso está pasando, ni si la aldea ya tiene lo que pidió, ni si lo que la
// frena es otra cosa. Esta línea es esa frase que faltaba, y es **una**: un
// estado, no un aviso.
//
// La diferencia con `notice.ts` importa y es la de §11.6: un aviso cuenta que
// **ha pasado** algo y se retira; esto es una condición que se lee cuando uno
// mira, como la estación. Por eso vive en la tira y no sobre el valle, y por eso
// no compite con la voz de la crónica.
//
// Y la diferencia con `answer.ts`: aquél contesta a **una orden que no se puede
// cumplir** —«te he entendido y no puedo»—, esto dice lo que la aldea está
// haciendo cumpla o no. Los dos están aquí y no en `derive/` por la misma
// razón: son una clave del banco para la cabecera, no geometría para pintar.

import { FORAGE, GATE_GIVING, LABOUR, TIME } from '@engine/balance';
import { ratioOf } from '@engine/crossroads/conditions';
import { population } from '@engine/people/demography';
import type { GameState } from '@engine/state';
import { nextProject } from '@engine/world/works';
import { has } from '@engine/subsistence/building-counts';
import { weeksAway } from '@derive/garrison';

/** Lo que la aldea está haciendo, en una clave del banco. Nunca una frase. */
export interface Doing {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/**
 * La frase de esta semana, guardada.
 *
 * **Y no es una optimización prematura: es la diferencia entre 60 fps y no.**
 * `app.ts` pinta cada fotograma y esto lo llamaría cada vez; el paso 4 pregunta
 * `nextProject`, que por dentro llama a `placeBuilding`, que **recorre el mapa
 * entero** buscando solar — ocho mil celdas desde el mapa grande. Medido al
 * escribir la prueba de este módulo: la suite rápida pasó de 18 a 29 segundos
 * sólo por preguntarlo una vez por semana simulada.
 *
 * La clave del guardado es el tick, que es lo único que puede cambiar la
 * respuesta salvo una obra que se termina — y una obra que se termina cambia el
 * tick también, porque las obras avanzan en el paso 6 del tick. `WeakMap` para
 * que una partida descartada no quede retenida.
 */
const SAID = new WeakMap<GameState, { tick: number; said: Doing | null }>();

/**
 * Cuántas semanas de leña hay en la pila, al ritmo de un invierno.
 *
 * §5.5: en invierno la aldea quema `WINTER_WOOD` por persona y semana, y con
 * las casas frías multiplica. Es la cuenta que decide si un valle pasa el
 * invierno, y hasta ahora el jugador tenía que hacerla de cabeza mirando dos
 * cifras que no se tocan en la pantalla.
 */
function winterWeeks(state: GameState): number {
  const people = population(state);
  if (people === 0) return Number.POSITIVE_INFINITY;
  const cold = state.flags['cold_houses'] !== undefined
    ? LABOUR.COLD_HOUSES_WOOD_MULTIPLIER : 1;
  return state.village.wood / (people * LABOUR.WINTER_WOOD * cold);
}

/**
 * La frase de la aldea, en orden de lo que más le importa.
 *
 * El orden **es** el diseño: lo que amenaza la vida va antes que lo que la
 * mejora, y lo que el jugador puede arreglar va antes que lo que sólo puede
 * mirar. Nunca devuelve nada si la aldea se ha acabado: ahí habla el epitafio.
 */
export function doingNow(state: GameState): Doing | null {
  const known = SAID.get(state);
  if (known !== undefined && known.tick === state.tick) return known.said;
  const said = sayWhat(state);
  SAID.set(state, { tick: state.tick, said });
  return said;
}

/**
 * F2 · Cómo va la puerta, en una clave del banco.
 *
 * Es la hermana de `doingNow` para lo que el motor **no puede saber**: que hoy
 * hay asalto lo dice el estado, pero cómo va lo dice la escena golpe a golpe y
 * no es determinista por decisión del dueño (§1b, «la pelea decide»). De ahí
 * que reciba la lectura de la vida (`backend.live.siege()`) y no la partida.
 *
 * Tres estados y no un marcador, porque §11.1 manda: el valle es el HUD y las
 * cifras viven en la tira y en las fichas. `null` antes del primer golpe es
 * deliberado — mientras la partida camina hacia la puerta lo que hay que contar
 * es que están ahí (`doing.besieged`), no que la puerta esté intacta.
 *
 * Vive aquí, fuera de `app.ts`, por lo que `CLAUDE.md` pide de las pruebas: el
 * bucle de pintado no se puede llamar desde la suite rápida y este reparto sí.
 */
export function gateNow(siege: { readonly gate: number; readonly broken: boolean } | null): string | null {
  if (siege === null) return null;
  if (siege.broken) return 'doing.gate_broken';
  if (siege.gate >= GATE_GIVING) return 'doing.gate_giving';
  return siege.gate > 0 ? 'doing.gate_holding' : null;
}

function sayWhat(state: GameState): Doing | null {
  if (state.ended !== null || population(state) === 0) return null;

  // 0 · **El clan, encima.** F2, y va antes que el hambre porque es lo único de
  // esta lista que se resuelve **hoy**: el hambre mata a final de semana y esto
  // está pasando mientras se mira. Es además el momento de la fase 4 (§1b), y
  // hasta ahora **nada en pantalla decía que esa semana era la semana**
  // (`docs/encargos-3d.md` §1): la crónica lo contaba y el valle no.
  //
  // **Y se dice «en la puerta» sólo si hay puerta**, que lo cazó la captura de
  // esta ronda: la semilla 7 al año 20 no tiene cerco todavía y la frase le
  // hablaba de un portón que no existe. Es el mismo contrato que §8.1 le exige
  // al precio de una opción — no prometer lo que no hay — aplicado a la línea
  // de estado.
  if (state.threat.arrivedTick === state.tick) {
    const key = has(state, 'gate') ? 'doing.besieged' : 'doing.besieged_open';
    return { key, params: { count: state.threat.lastBand } };
  }

  // 0b · **La víspera**, que es lo que B2 compró con sus ocho semanas de aviso.
  // Va aquí y no más abajo porque una aldea que sabe que bajan **está haciendo
  // eso**, aunque además tenga un granero a medias; y va después del asalto
  // porque cuando ya están en la puerta no queda víspera que contar. Las
  // semanas las cuenta `weeksAway` y no una resta aquí: dos sitios que restan
  // ticks son dos ideas de cuánto aviso da el clan.
  const away = weeksAway(state);
  if (away !== null) {
    return { key: 'doing.raid_coming', params: { weeks: away } };
  }

  // 1 · El hambre. Es la única que no se puede posponer: §5.3 mata. El umbral
  // es el mismo con el que la aldea se va al monte (§7.7), y la cuenta sale de
  // `ratioOf` y no de una división aquí: dos sitios que dividen grano entre
  // gente son dos definiciones de «un año de comida».
  if (ratioOf(state, 'grainYears') < FORAGE.THRESHOLD_YEARS) {
    return { key: 'doing.hungry', params: {} };
  }

  // 2 · El invierno. Va antes de la obra porque una aldea sin leña no llega a
  // ver el granero terminado, y porque es **la consecuencia directa** de la
  // palanca de las manos: es la frase que cierra ese bucle.
  const weeks = winterWeeks(state);
  if (weeks < TIME.WEEKS_PER_SEASON) {
    return { key: 'doing.cold', params: {} };
  }

  // 3 · La obra en marcha, que es la respuesta a la tercera palanca. La más
  // antigua de las abiertas, que es la que se está terminando (§7.3: una cada
  // vez, y los puntos que sobran pasan a la siguiente).
  const work = [...state.works].sort((a, b) => a.startedTick - b.startedTick || a.id - b.id)[0];
  if (work !== undefined) {
    return { key: `doing.raising.${work.kind}`, params: {} };
  }

  // 4 · **Y que no haya nada que levantar se dice.** No es un hueco que tapar:
  // es un estado en el que la aldea pasa buena parte de su vida —medido con
  // `tools/reports/works-report.ts` sobre las semillas 7, 11 y 41: entre el 54 % y el
  // 100 % de las semanas según la década, y el 100 % en la última—, y el
  // jugador tiene derecho a saber que su tercera palanca no tiene ahora nada
  // que ordenar. Esconderlo sería la mitad de «las decisiones se sienten
  // vacías»; decirlo es la mitad de «hay una respuesta clara».
  //
  // Que eso **no** significa una aldea que no construye: las mismas semillas
  // levantan de 67 a 99 obras en sesenta años. Una obra cada vez (§7.3) y
  // semanas enteras sin nada pendiente son la misma cosa vista de dos maneras.
  if (nextProject(state) === null) {
    return { key: 'doing.nothing', params: {} };
  }

  // 5 · Y si hay algo que empezar y no ha empezado, es que falta madera: la
  // otra cara de la palanca de las manos.
  return { key: 'doing.waiting_wood', params: {} };
}
