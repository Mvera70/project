// **Qué suena de fondo, ahora mismo.** Puro: entra cómo está el mundo y sale
// cuánto suena cada capa. Ni un `AudioContext`, ni un `Math.random`, ni una
// lectura del reloj — así se puede probar entero sin navegador, que es lo que
// hace falta cuando quien lo escribe no puede oírlo.
//
// El reparto de trabajo, y es la frontera que importa:
//
//   · **aquí** se decide *cuánto* suena cada capa (0 a 1);
//   · en `sound.ts` se cruzan las ganancias y se reproducen los bucles;
//   · en `app.ts` se recoge del mundo lo que esta función necesita.
//
// Las tres compuertas que apagan el mundo entero, y su porqué:
//
//   · **en pausa**, porque el valle se queda quieto y un valle quieto que
//     sigue sonando es un valle roto;
//   · **en un letargo**, por lo mismo que la voz calla (§9.2): quien vuelve
//     tras cuatro horas no quiere oír novecientas semanas;
//   · **con la pestaña escondida**, porque nadie está mirando.
//
// Y la cuarta, que no apaga sino que adelgaza: **a ×16 y ×64 el mundo es un
// avance rápido**. Una jornada dura 120 s a ×1 y 1,9 s a ×64, así que el cielo
// puede cambiar tres veces en lo que tarda una capa en cruzarse. Ahí quedan
// sólo los lechos, apagados (`SOUND.AMBIENCE_FAST_GAIN`). Es lo mismo que el
// renderer hace con la luz (`daylight.ts`, `LIGHT_STEADY`) y por el mismo
// motivo: a esa velocidad, lo fiel parpadea.

import { SOUND } from '@engine/balance';
import type { Season } from '@engine/state';
import type { SkyKind } from '@derive/weather';

/** Cada lecho que puede estar sonando. Son los ficheros de `public/audio/`. */
export type AmbienceLayer =
  | 'amb_wind_calm'
  | 'amb_wind_gust'
  | 'amb_wind_winter'
  | 'amb_rain_light'
  | 'amb_rain_heavy'
  | 'amb_storm_bed'
  | 'amb_snow_hush'
  | 'amb_river'
  | 'amb_waterfall'
  | 'amb_fire_flame'
  | 'amb_fire_embers';

export const AMBIENCE_LAYERS: readonly AmbienceLayer[] = [
  'amb_wind_calm', 'amb_wind_gust', 'amb_wind_winter',
  'amb_rain_light', 'amb_rain_heavy', 'amb_storm_bed', 'amb_snow_hush',
  'amb_river', 'amb_waterfall', 'amb_fire_flame', 'amb_fire_embers',
];

/** Cuánto suena cada capa, de 0 a 1. Lo que no está, no suena. */
export type Mix = Partial<Record<AmbienceLayer, number>>;

/** Lo que el mundo tiene que contar para saber qué suena. */
export interface WorldSound {
  readonly sky: SkyKind;
  readonly season: Season;
  /** 0, 1, 4, 16 o 64. */
  readonly speed: number;
  readonly catchingUp: boolean;
  readonly hidden: boolean;
  /** 0 a 1: la riada de esta semana y la resaca de la siguiente. */
  readonly flood: number;
  /** Celdas del centro de la vista al río; el valle siempre tiene uno. */
  readonly riverCells: number;
  /** Celdas a la cascada más cercana, o `null` si el valle no tiene. */
  readonly waterfallCells: number | null;
  /** Celdas al fuego con llama más cercano, o `null` si no arde nada. */
  readonly flameCells: number | null;
  /** Celdas a las brasas más cercanas, o `null`. */
  readonly emberCells: number | null;
  /** Altura de vista en celdas: 8 es encima de una casa, 92 el valle entero. */
  readonly viewHeight: number;
}

/** El mundo calla del todo: en pausa, en un letargo o sin nadie mirando. */
export function ambienceAllowed(world: Pick<WorldSound, 'speed' | 'catchingUp' | 'hidden'>): boolean {
  return world.speed !== 0 && !world.catchingUp && !world.hidden;
}

/** A ×16 y ×64 el mundo va en avance rápido: sólo lechos, y apagados. */
export function fastForward(speed: number): boolean {
  return speed >= SOUND.AMBIENCE_FAST_SPEED;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Cuánto se oye algo que está a `cells` celdas, visto desde `viewHeight`.
 *
 * Dos cosas la bajan y hacen falta las dos. **La distancia**: a más de
 * `AMBIENCE_REACH_CELLS` la fuente ya no manda sobre lo que se está mirando. Y
 * **el zoom**, que es lo que de verdad dice si estás dentro del valle o
 * mirándolo desde arriba: con la cámara alta se ve todo y no se está *en*
 * ningún sitio, así que las fuentes se vuelven paisaje.
 */
export function nearness(cells: number | null, viewHeight: number): number {
  if (cells === null) return 0;
  const reach = clamp01(1 - cells / SOUND.AMBIENCE_REACH_CELLS);
  const span = SOUND.AMBIENCE_FAR_HEIGHT - SOUND.AMBIENCE_NEAR_HEIGHT;
  const height = clamp01(1 - (viewHeight - SOUND.AMBIENCE_NEAR_HEIGHT) / span);
  // Al cuadrado la caída se parece a la de verdad: la mitad de lejos no es la
  // mitad de fuerte. Y deja un suelo, porque un río a la vista siempre se oye.
  return reach * reach * (0.35 + 0.65 * height);
}

/** La fuerza del viento que hace hoy, la misma que mece las hojas. */
export function windStrengthOf(sky: SkyKind): number {
  return SOUND.WIND_BY_SKY[sky];
}

function add(mix: Mix, layer: AmbienceLayer, gain: number, dim: number): void {
  const value = clamp01(gain) * dim;
  if (value > 0.01) mix[layer] = value;
}

/**
 * La mezcla de este instante.
 *
 * El orden importa poco porque las capas se suman, pero la intención sí: hay
 * **un lecho de viento siempre** —el valle nunca está mudo—, encima el cielo si
 * lo hay, y aparte el agua y el fuego, que son cosas que están en un sitio y
 * se oyen según dónde mires.
 */
export function mixFor(world: WorldSound): Mix {
  if (!ambienceAllowed(world)) return {};
  const fast = fastForward(world.speed);
  const dim = fast ? SOUND.AMBIENCE_FAST_GAIN : 1;
  const mix: Mix = {};

  // **El viento, siempre.** La fuerza la da el cielo (la misma tabla que mece
  // las hojas), y decide qué lecho se oye: en calma la brisa, arreciando la
  // racha, y en invierno el aire frío en lugar de la brisa —no hay hojas que
  // mover, y ése es justo el sonido que falta—.
  const wind = windStrengthOf(world.sky);
  const gust = clamp01((wind - 0.3) / 0.7);
  const calm = 1 - gust * 0.75;
  add(mix, world.season === 'winter' ? 'amb_wind_winter' : 'amb_wind_calm', calm, dim);
  add(mix, 'amb_wind_gust', gust, dim);

  // **El cielo**, si hay algo cayendo. La tormenta trae su propio lecho, con
  // el viento grave dentro, así que la lluvia fuerte se retira a media voz
  // para no sumar dos siseos.
  if (world.sky === 'rain') {
    add(mix, 'amb_rain_light', 1, dim);
  } else if (world.sky === 'storm') {
    add(mix, 'amb_storm_bed', 1, dim);
    add(mix, 'amb_rain_heavy', 0.5, dim);
  } else if (world.sky === 'snow') {
    add(mix, 'amb_snow_hush', 1, dim);
  }

  // **El agua.** El pueblo se funda siempre a tres o seis celdas del río
  // (`mapgen.ts`), así que casi siempre se oye; la cascada, sólo si la hay y
  // se está cerca. La riada lo sube todo: es el mismo río, más fuerte.
  const surge = 1 + world.flood * 0.6;
  add(mix, 'amb_river', nearness(world.riverCells, world.viewHeight) * surge, dim);
  add(mix, 'amb_waterfall', nearness(world.waterfallCells, world.viewHeight) * surge, dim);

  // **El fuego no suena en avance rápido.** Arde tres jornadas, que a ×64 son
  // seis segundos: encenderlo y apagarlo en ese tiempo es un parpadeo, no un
  // incendio.
  if (!fast) {
    add(mix, 'amb_fire_flame', nearness(world.flameCells, world.viewHeight), 1);
    add(mix, 'amb_fire_embers', nearness(world.emberCells, world.viewHeight), 1);
  }
  return mix;
}

/** Los tres truenos, por lo que tarda el sonido en llegar desde el rayo. */
export type ThunderCue = 'weather_thunder_near' | 'weather_thunder_mid' | 'weather_thunder_far';

export interface Thunder {
  readonly cue: ThunderCue;
  /** Segundos de reloj de pared entre el destello y el trueno. */
  readonly delaySeconds: number;
}

/**
 * Qué trueno y cuándo, para un rayo a `cells` celdas de donde se mira.
 *
 * **Por la distancia y no por una tirada**, que es lo que había hasta hoy
 * (`Math.random` entre 0,4 y 2,2 s). Un rayo encima chasquea casi a la vez;
 * uno al otro lado del valle tarda dos segundos y llega convertido en un
 * retumbar. Es la diferencia entre una tormenta que está en algún sitio y una
 * que es un efecto de sonido.
 *
 * El reloj **no se escala con la velocidad del juego** a propósito: el retardo
 * es del aire, no de la simulación, igual que el destello dura lo que dura a
 * cualquier velocidad (§10.7).
 */
export function thunderFor(cells: number): Thunder {
  const cue: ThunderCue = cells <= SOUND.THUNDER_NEAR_CELLS ? 'weather_thunder_near'
    : cells <= SOUND.THUNDER_MID_CELLS ? 'weather_thunder_mid'
      : 'weather_thunder_far';
  return { cue, delaySeconds: cells / SOUND.THUNDER_CELLS_PER_SECOND };
}

/** La distancia en celdas entre dos puntos del mapa. */
export function cellsBetween(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Lo lejos que está el río de un punto, en celdas.
 *
 * El río baja de norte a sur serpenteando (`mapgen.ts`), así que su distancia
 * es la del eje **en esa fila**, no la de un punto fijo. `axisAt` es
 * `valleyAxis` del motor, que es puro; se pasa como argumento para que este
 * módulo no dependa del mapa.
 */
const RIVER_PROBE_ROWS = 4;

export function riverCellsFrom(
  at: { x: number; z: number },
  axisAt: (z: number) => number | null,
  height: number,
): number {
  // Tres filas: la propia y una a cada lado. El cauce serpentea ±3 celdas
  // sobre su entrada, así que la perpendicular de verdad cae dentro de este
  // paso y no hace falta recorrer el río entero cada fotograma.
  let best = Number.POSITIVE_INFINITY;
  for (const dz of [-RIVER_PROBE_ROWS, 0, RIVER_PROBE_ROWS]) {
    const z = Math.max(0, Math.min(height - 1, Math.round(at.z + dz)));
    const x = axisAt(z);
    if (x === null) continue;
    best = Math.min(best, Math.hypot(at.x - x, at.z - z));
  }
  return Number.isFinite(best) ? best : SOUND.AMBIENCE_REACH_CELLS;
}
