// M-08 · El caserío. G3, design.md §8.1, §8.5, plan-meta.md.
//
// Todas las demás categorías de esta carpeta están escritas contra una aldea
// que ya tiene fragua, o capilla, o veinte adultos entre los que repartir un
// rencor. G3 midió lo que eso deja fuera: **un valle de menos de diez personas
// no tiene ni una sola plantilla que pueda ver**, así que su primera pregunta
// no llega hasta que la población ya ha cruzado diez.
//
// Estas dos preguntan a la casa y no al pueblo: desde el tick de la fundación
// sólo existen `leader` y `midwife` (`found.ts`), así que aquí no se reparte
// ningún papel que un caserío pueda no tener todavía. Las dos se mueren solas
// al cruzar diez personas — eso es el contrato de §8.1 («o dice qué la
// mantiene viva en una aldea de ochenta, o admite que es contenido temprano»),
// y es lo que hace que no necesiten ninguna cláusula de «esto no es para
// pueblos grandes».
//
// **La estación no es decoración, es lo que las hace alcanzables.** §8.6 pone
// un suelo entre dos preguntas (`CROSSROADS.MIN_TICKS_BETWEEN`), así que la
// primera encrucijada de una partida no puede plantearse antes de que ese
// hueco pase, y la población cruza diez a las diez horas de reloj: la ventana
// del caserío se cierra casi cuando la puerta se abre. Lo que decide si este
// contenido existe o no es **caer justo en la primera ranura legal**, y por eso
// las dos estaciones están elegidas contra ella y no por gusto.
//
// Con el suelo en un año —como estuvo hasta el 19 sep 2026— esa ranura caía en
// el tick 47 y las dos plantillas tenían que ser de primavera; la primera
// pregunta del juego llegaba a las **11 h**. Con el suelo en un tercio de año
// la ranura cae en el tick 15, que es **verano del año 0**, y por eso el
// forastero es de verano: la primera pregunta baja a **3,5 h y sale en los
// doce valles**. Si el suelo vuelve a moverse, esto hay que remedirlo — es la
// clase de acoplamiento que conviene tener escrito y no descubrir.

import type { CrossroadTemplate } from '../schema';

/**
 * G3 · Cuánto de lo que tienen delante pueden trabajar de verdad.
 *
 * El dilema del que funda: la tierra no falta, faltan manos, y romper una
 * besana nueva se paga en la misma primavera en la que hay que sembrar la que
 * ya está rota. La semilla es la mitad que importa (§8.5) — lo que se rompió
 * este año es campo el que viene, y la crónica lo dice citando el año.
 */
const BREAKING_GROUND: CrossroadTemplate = {
  id: 'breaking_ground',
  category: 'hamlet',
  weight: 10,
  cooldownYears: 4,
  requires: [
    { k: 'stat', stat: 'people', op: '<', v: 10 },
    // Primavera: cuando se rompe tierra, y la única estación que cae dentro de
    // la primera ranura que §8.6 permite.
    { k: 'season', season: 'spring' },
  ],
  cast: [
    { as: 'A', role: 'leader' },
    { as: 'B', role: 'midwife' },
  ],
  title: 'crossroad.breaking_ground.title',
  body: 'crossroad.breaking_ground.body',
  options: [
    {
      id: 'break_more_ground',
      label: 'crossroad.breaking_ground.break_more_ground.label',
      cost: 'crossroad.breaking_ground.break_more_ground.cost',
      // El precio es el que dice la etiqueta, que es el contrato de §8.1: se
      // come el grano de las semanas que se van en el desmonte y cuesta ánimo.
      // La madera que sale de los árboles que se tiran va al montón, porque de
      // ahí sale: desmontar es talar.
      effects: [
        { k: 'fell', wood: 40, permanent: true },
        { k: 'stat', stat: 'grain', delta: -25 },
        { k: 'stat', stat: 'morale', delta: -6 },
      ],
      visible: [{ k: 'scar', what: 'felled_wood' }],
      seeds: [
        {
          id: 'the_cleared_strip',
          delayYears: [1, 1],
          effects: [{ k: 'build', kind: 'field', free: true }],
          visible: [{ k: 'raise', kind: 'field' }],
          chronicleKey: 'consequence.the_cleared_strip',
        },
      ],
      traitWeight: { hardy: 2, stubborn: 2, ambitious: 2 },
    },
    {
      id: 'let_it_wait',
      label: 'crossroad.breaking_ground.let_it_wait.label',
      cost: 'crossroad.breaking_ground.let_it_wait.cost',
      // **Ánimo y nada más, y es deliberado.** La primera versión de esta
      // opción daba `harvest ×1.2` sin pedir nada, y eso no es una decisión:
      // es un regalo de comida en el momento más frágil de la partida. Medido,
      // ponía `fate-chaos` en rojo —2 valles rotos de 12 donde pide 3— porque
      // apuntalaba exactamente a los que el dueño quiere que puedan romperse
      // («que haya partidas que se rompan es la idea»). El ánimo no salva a un
      // valle que se queda sin grano; el grano sí, y por eso no está aquí.
      effects: [{ k: 'stat', stat: 'morale', delta: 6 }],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [],
      traitWeight: { kind: 2, craven: 1, loyal: 2 },
    },
  ],
};

/**
 * G3 · Uno solo en el vado, que es la versión de caserío de A.13.
 *
 * A.13 son nueve desconocidos con un carro ante una aldea de doce o más; esto
 * es **uno** ante una casa donde viven dos o tres, y por eso no es la misma
 * pregunta: un tercer par de manos en un caserío no es caridad, es la
 * diferencia entre levantar un campo más o no levantarlo. Y el precio también
 * es de otro tamaño: una boca más sobre una despensa que cuenta en decenas.
 */
const ONE_AT_THE_FORD: CrossroadTemplate = {
  id: 'one_at_the_ford',
  category: 'hamlet',
  weight: 9,
  cooldownYears: 6,
  requires: [
    { k: 'stat', stat: 'people', op: '<', v: 10 },
    // **Verano, y la estación aquí decide si el contenido existe.** Con el
    // suelo de §8.6 en 16 ticks la primera ranura legal de una partida cae en
    // el tick 15, o sea en verano del año 0: con las dos plantillas en
    // primavera, la primera pregunta del juego se iba a las 11 h; con ésta en
    // verano baja a **3,5 h y en los doce valles**. Y es la estación de A.13
    // por el mismo motivo escrito allí: §5.7 mueve a la gente por los caminos
    // cuando hace bueno.
    { k: 'season', season: 'summer' },
  ],
  cast: [{ as: 'A', role: 'leader' }],
  title: 'crossroad.one_at_the_ford.title',
  body: 'crossroad.one_at_the_ford.body',
  options: [
    {
      id: 'take_him_in',
      label: 'crossroad.one_at_the_ford.take_him_in.label',
      cost: 'crossroad.one_at_the_ford.take_him_in.cost',
      effects: [
        { k: 'arrive', count: 1 },
        { k: 'stat', stat: 'grain', delta: -20 },
        { k: 'stat', stat: 'morale', delta: 5 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 2 }],
      // **La semilla es la mitad que hace que esto sea una decisión** (§8.5), y
      // la primera versión la tenía al revés: mandaba venir a los suyos, o sea
      // dos pares de manos más, y entonces la opción no tenía **ningún** lado
      // malo en ninguna parte. Es la forma de A.13 a escala de caserío: se gana
      // un par de manos ahora y se hereda lo que ese hombre traía detrás.
      seeds: [
        {
          id: 'what_he_was_running_from',
          delayYears: [3, 8],
          effects: [{ k: 'flag', flag: 'threatened', years: 3 }],
          visible: [{ k: 'banner', colour: 'red', years: 3 }],
          chronicleKey: 'consequence.what_he_was_running_from',
        },
      ],
      traitWeight: { kind: 3, generous: 2, craven: 0.5 },
    },
    {
      id: 'feed_him_and_send_him_on',
      label: 'crossroad.one_at_the_ford.feed_him_and_send_him_on.label',
      cost: 'crossroad.one_at_the_ford.feed_him_and_send_him_on.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: -12 },
        { k: 'stat', stat: 'faith', delta: 4 },
        { k: 'stat', stat: 'morale', delta: 2 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 1 }],
      seeds: [],
      traitWeight: { devout: 2, cunning: 1 },
    },
    {
      id: 'turn_him_away',
      label: 'crossroad.one_at_the_ford.turn_him_away.label',
      cost: 'crossroad.one_at_the_ford.turn_him_away.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: -5 },
        { k: 'stat', stat: 'faith', delta: -4 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 1 }],
      seeds: [],
      traitWeight: { craven: 2, secretive: 2, generous: 0.4 },
    },
  ],
};

export const HAMLET_TEMPLATES: readonly CrossroadTemplate[] = [BREAKING_GROUND, ONE_AT_THE_FORD];
