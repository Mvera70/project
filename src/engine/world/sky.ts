// R-1 · El cielo de cada jornada, decidido en el motor. design.md §7.10, §10.8.
//
// Nació en `src/derive/weather.ts` (U-13, v3.73) como presentación pura: la fila
// del clima del año, la estación y un `hash32` de la jornada decidían qué se
// veía por la ventana, sin consumir azar. Sigue siendo exactamente eso —el mismo
// hash, el mismo reparto, ni una tirada— pero **vive aquí** desde el rework,
// por una razón: el motor tiene que poder preguntar «¿ha tronado esta semana?»
// para que un rayo queme una casa (`world/fate.ts`). Un suceso que depende de un
// cielo que sólo conoce el render sería un render moviendo la simulación, que
// es lo que §4.3 prohíbe; un cielo que decide el motor y el render lee es lo
// contrario, y es lo correcto.
//
// `derive/weather.ts` sigue existiendo y lee de aquí: la capa de presentación
// no cambia de contrato.

import { SKY, TIME } from '../balance';
import { hash32 } from '../rng';
import { seasonOf } from '../time';

/** Qué se ve en el cielo. `clear` es el caso normal y no pinta nada. */
export type SkyKind = 'clear' | 'overcast' | 'rain' | 'storm' | 'snow';

export interface Sky {
  readonly kind: SkyKind;
  /** Cuánto arrecia, de 0 a 1. Manda cuántas gotas caen y cuánto tapa la luz. */
  readonly intensity: number;
}

const CLEAR: Sky = { kind: 'clear', intensity: 0 };

/** Un dado de 0 a 1 para esta jornada y este asunto, sin tocar ningún flujo. */
export function skyDice(seed: number, day: number, what: string): number {
  return hash32(seed, `sky:${what}:${day}`) / 4_294_967_296;
}

/**
 * El cielo de la jornada `day` —el día escénico absoluto, `tick · DAYS_PER_WEEK`
 * más el día de la semana— en un valle con esta semilla y esta fila de clima.
 *
 * Pura: dos llamadas con lo mismo dan lo mismo, y por eso tanto el renderer
 * como el motor pueden preguntarla cuantas veces quieran.
 */
export function skyOfDay(seed: number, weatherIndex: number, day: number): Sky {
  const row = Math.max(0, Math.min(SKY.WET_BY_YEAR.length - 1, weatherIndex));
  const wet = SKY.WET_BY_YEAR[row] as number;
  if (skyDice(seed, day, 'wet') >= wet) return CLEAR;

  // Cuánto arrecia lo decide su propio dado, y nunca es un chispeo invisible:
  // si el cielo se cierra, se tiene que ver.
  const strength = SKY.MIN_INTENSITY + skyDice(seed, day, 'how') * (1 - SKY.MIN_INTENSITY);
  // La estación **de esa jornada**, no la de ningún tick que ande por ahí: una
  // función pura que dependiera de cuándo se la llama sería una trampa.
  const winter = seasonOf(Math.floor(day / TIME.DAYS_PER_WEEK)) === 'winter';
  const draw = skyDice(seed, day, 'kind');
  if (winter) {
    // En invierno cae nieve y no hay tormenta con rayos: una tronada de nieve
    // existe pero es rara, y un valle que truena en enero se lee como un fallo.
    return { kind: draw < SKY.OVERCAST_SHARE ? 'overcast' : 'snow', intensity: strength };
  }
  if (draw < SKY.STORM_SHARE) return { kind: 'storm', intensity: strength };
  if (draw < SKY.STORM_SHARE + SKY.OVERCAST_SHARE) {
    return { kind: 'overcast', intensity: strength };
  }
  return { kind: 'rain', intensity: strength };
}

/** Las siete jornadas de la semana `tick`, en orden. */
export function skiesOfWeek(seed: number, weatherIndex: number, tick: number): readonly Sky[] {
  const first = tick * TIME.DAYS_PER_WEEK;
  const out: Sky[] = [];
  for (let day = first; day < first + TIME.DAYS_PER_WEEK; day += 1) {
    out.push(skyOfDay(seed, weatherIndex, day));
  }
  return out;
}

/** Cuántas jornadas de esta semana tienen el cielo cerrado, y cuántas truenan o nievan. */
export function weekWeather(
  seed: number, weatherIndex: number, tick: number,
): { readonly wet: number; readonly storms: number; readonly snow: number } {
  let wet = 0;
  let storms = 0;
  let snow = 0;
  for (const sky of skiesOfWeek(seed, weatherIndex, tick)) {
    if (sky.kind !== 'clear') wet += 1;
    if (sky.kind === 'storm') storms += 1;
    if (sky.kind === 'snow') snow += 1;
  }
  return { wet, storms, snow };
}
