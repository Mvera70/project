// U-13 · El cielo de cada jornada. design.md §5.1, §10.8, §12.3.
//
// Lo pidió el dueño del diseño el 15 sep 2026, y es el último de sus cinco
// pasos: «el siguiente paso es crear efectos meteorológicos, como tormentas con
// rayos».
//
// **El motor tira el clima una vez al año y eso no cambia** (§5.1: `rollWeather`
// en la semana 0, flujo `weather`, y de ahí sale el factor de cosecha). Meter
// clima semanal en el motor movería el balance de sesenta semillas y rompería
// los guardados para pintar nubes, que es exactamente al revés de como se
// decide aquí. Así que el cielo se **deriva**: la fila del año dice cuánto
// llueve en este valle, la estación dice si cae agua o nieve, y un `hash32` de
// la jornada dice qué toca hoy. Determinista y sin consumir azar —ni una tirada
// del motor—, así que la misma semilla da el mismo cielo y añadir esto no
// desplaza ni una cosecha.
//
// Y es lo que la esencia del juego pide: dos valles con el mismo año pueden
// tener veranos distintos, y se comparan.

import { SKY, TIME } from '../engine/balance';
import { hash32 } from '../engine/rng';
import type { GameState } from '../engine/state';
import { seasonOf } from '../engine/time';
import { HEART } from '../engine/world/tiles';

/** Qué se ve en el cielo. `clear` es el caso normal y no pinta nada. */
export type SkyKind = 'clear' | 'overcast' | 'rain' | 'storm' | 'snow';

export interface Sky {
  readonly kind: SkyKind;
  /** Cuánto arrecia, de 0 a 1. Manda cuántas gotas caen y cuánto tapa la luz. */
  readonly intensity: number;
}

const CLEAR: Sky = { kind: 'clear', intensity: 0 };

/** Un dado de 0 a 1 para esta jornada y este asunto, sin tocar el motor. */
function dice(seed: number, day: number, what: string): number {
  return hash32(seed, `sky:${what}:${day}`) / 4_294_967_296;
}

/**
 * El cielo de la jornada `day` —el día escénico absoluto, el que cuenta
 * `dayNumber`—, en el valle que `state` describe.
 *
 * Pura y sin estado: dos llamadas con lo mismo dan lo mismo, y por eso el
 * renderer puede preguntarla en cada fotograma sin guardar nada.
 */
export function skyAt(state: GameState, day: number): Sky {
  const row = Math.max(0, Math.min(SKY.WET_BY_YEAR.length - 1, state.weather.index));
  const wet = SKY.WET_BY_YEAR[row] as number;
  if (dice(state.seed, day, 'wet') >= wet) return CLEAR;

  // Cuánto arrecia lo decide su propio dado, y nunca es un chispeo invisible:
  // si el cielo se cierra, se tiene que ver.
  const strength = SKY.MIN_INTENSITY
    + dice(state.seed, day, 'how') * (1 - SKY.MIN_INTENSITY);
  // La estación **de esa jornada**, no la del tick que el estado lleve ahora.
  // Leerla de `state.tick` parecía igual —el juego pregunta siempre por hoy— y
  // no lo era: `tools/sky-report.ts` mide un año de golpe y daba cero nieve
  // porque preguntaba con el tick ya en la primavera siguiente. Una función
  // pura que depende de cuándo se la llama es una trampa esperando.
  const winter = seasonOf(Math.floor(day / TIME.DAYS_PER_WEEK)) === 'winter';
  const draw = dice(state.seed, day, 'kind');
  if (winter) {
    // En invierno cae nieve, y no hay tormenta con rayos: una tronada de nieve
    // existe pero es raro, y un valle que truena en enero se lee como un fallo.
    return { kind: draw < SKY.OVERCAST_SHARE ? 'overcast' : 'snow', intensity: strength };
  }
  if (draw < SKY.STORM_SHARE) return { kind: 'storm', intensity: strength };
  if (draw < SKY.STORM_SHARE + SKY.OVERCAST_SHARE) {
    return { kind: 'overcast', intensity: strength };
  }
  return { kind: 'rain', intensity: strength };
}

/** Cuánto tapa la luz este cielo, de 0 (nada) a 1 (todo). §10.8. */
export function overcastOf(sky: Sky): number {
  if (sky.kind === 'clear') return 0;
  const most = sky.kind === 'storm' ? SKY.DIM_STORM : SKY.DIM_WET;
  return most * sky.intensity;
}

/**
 * En qué momentos de la jornada cae un rayo, en fase de 0 a 1.
 *
 * Pura y determinista a propósito: el destello y el trueno no pueden salir de
 * `Math.random` —§2.4 lo prohíbe en el motor y aquí sería peor, porque dos
 * jugadores con la misma semilla verían tormentas distintas— y tampoco pueden
 * consumir azar del motor. Con esto, una tormenta se puede fotografiar dos
 * veces igual, que es lo que permite juzgarla.
 */
export function boltsInDay(state: GameState, day: number): readonly number[] {
  const sky = skyAt(state, day);
  if (sky.kind !== 'storm') return [];
  const span = SKY.BOLTS_MAX - SKY.BOLTS_MIN;
  const many = SKY.BOLTS_MIN + Math.round(dice(state.seed, day, 'bolts') * span * sky.intensity);
  const out: number[] = [];
  for (let n = 0; n < many; n += 1) {
    // Repartidos por la jornada y no agrupados: cada rayo tiene su tramo y cae
    // dentro de él, así que no salen dos seguidos ni se apiñan al amanecer.
    const slot = (n + dice(state.seed, day, `bolt:${n}`)) / many;
    out.push(Math.min(0.999, slot));
  }
  return out;
}

/**
 * Dónde cae un rayo, en celdas del mapa. El mismo rayo cae siempre en el mismo
 * sitio, por la misma razón que el momento: para poder mirarlo dos veces.
 *
 * **En el corazón del valle** (§7.1, `HEART`) y no en cualquier parte del mapa,
 * y la razón está medida en captura: el mapa son 72 × 112 celdas y la vista de
 * reposo enseña unas 26, así que un rayo repartido por todo el mapa caía fuera
 * de cámara nueve de cada diez veces. Lo que quedaba era el destello, que está
 * bien pero no es lo que el dueño del diseño pidió. Cayendo donde está la
 * aldea, se ve.
 */
export function boltPlace(
  state: GameState, day: number, index: number,
): { readonly x: number; readonly z: number } {
  return {
    x: HEART.x0 + dice(state.seed, day, `where:x:${index}`) * (HEART.x1 - HEART.x0),
    z: HEART.y0 + dice(state.seed, day, `where:z:${index}`) * (HEART.y1 - HEART.y0),
  };
}
