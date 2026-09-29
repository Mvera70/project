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
import { PHASES } from '../render3d/effects/day-phases';

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
  | 'amb_fire_embers'
  // Fase 2: el día, la noche y la aldea que crece.
  | 'amb_birds_day'
  | 'amb_night_summer'
  | 'amb_night_cold';

export const AMBIENCE_LAYERS: readonly AmbienceLayer[] = [
  'amb_wind_calm', 'amb_wind_gust', 'amb_wind_winter',
  'amb_rain_light', 'amb_rain_heavy', 'amb_storm_bed', 'amb_snow_hush',
  'amb_river', 'amb_waterfall', 'amb_fire_flame', 'amb_fire_embers',
  'amb_birds_day', 'amb_night_summer', 'amb_night_cold',
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
  /** Fase de la jornada, 0 a 1: 0 es medianoche y el juego abre en 0,28. */
  readonly phase: number;
  /** Cuánta gente viva hay. Dos al fundar, hasta ochenta en un valle hecho. */
  readonly people: number;
  /** Celdas del centro de la vista al corazón de la aldea. */
  readonly villageCells: number;
  /** Hay fiesta esta semana: boda, cosecha o barril. */
  readonly festivity: boolean;
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

/** De 0 a 1 entre dos valores, para cruzar una capa según cuánto hay de algo. */
export function ramp(value: number, from: number, full: number): number {
  return clamp01((value - from) / (full - from));
}

/**
 * Cuánta luz hay, de 0 a 1, **para el sonido**.
 *
 * No es la luz del renderer (`daylight.ts` importa Three y además la aplana a
 * ×16 y ×64): es la misma forma con los mismos momentos, cruzada en el alba y
 * en el anochecer para que los pájaros y los grillos se releven en vez de
 * cortarse. La noche está comprimida a propósito y aquí se respeta.
 */
export function daylightish(phase: number): number {
  const day = Number.isFinite(phase) ? phase - Math.floor(phase) : 0;
  const { DAWN, MORNING, DUSK, NIGHT } = PHASES;
  if (day < DAWN || day >= NIGHT) return 0;
  if (day < MORNING) return (day - DAWN) / (MORNING - DAWN);
  if (day <= DUSK) return 1;
  return 1 - (day - DUSK) / (NIGHT - DUSK);
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

  // **El viento, siempre, pero a la fuerza que haga.** La da el cielo (la
  // misma tabla que mece las hojas) y hace dos cosas: cuánto se oye la brisa
  // **y** cuánta racha hay encima. En invierno el aire frío sustituye a la
  // brisa: no hay hojas que mover, y ése es justo el sonido que falta.
  //
  // Que la brisa siga a la fuerza y no suene siempre al máximo es la
  // corrección de Vera del 29 sep 2026: «un día claro suena muy fuerte, el
  // viento y el río; imagínate que estamos por las montañas, no tiene mucho
  // sentido». Tenía razón y el fallo era mío: `windStrengthOf` sólo decidía
  // la racha, así que un día en calma se oía con la brisa entera. Ahora un
  // cielo claro suena a 0,3 —diez decibelios por debajo— y sólo la tormenta
  // llena.
  const wind = windStrengthOf(world.sky);
  const gust = clamp01((wind - 0.45) / 0.55);
  // Con racha, la brisa se retira: lo que se oye entonces es la racha.
  const calm = wind * (1 - gust * 0.6);
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

  // **El día y la noche.** La jornada comprime la noche a propósito (§D.6.1):
  // del alba al anochecer va el 86 % de ella, así que los pájaros tienen sitio
  // de sobra y los grillos son un rato corto — que es justo como debe sentirse.
  const day = daylightish(world.phase);
  const night = 1 - day;
  // Los pájaros callan con tormenta y con nieve, y se retiran con lluvia: la
  // misma regla que sigue la bandada que cruza el valle (`ambience.ts` del
  // render), para que lo que se oye y lo que se ve digan lo mismo.
  const birdWeather = world.sky === 'storm' || world.sky === 'snow' ? 0
    : world.sky === 'rain' ? 0.3 : 1;
  add(mix, 'amb_birds_day', day * birdWeather, dim);
  // Los grillos son de primavera y verano y no salen bajo la lluvia; el resto
  // del año la noche es el aire quieto, que también es un sonido.
  const summerNight = world.season === 'spring' || world.season === 'summer';
  const dry = world.sky === 'clear' || world.sky === 'overcast';
  add(mix, summerNight && dry ? 'amb_night_summer' : 'amb_night_cold', night, dim);

  // **La aldea no suena, todavía.** Se probó un bullicio hecho de actividad
  // —golpes lejanos, una puerta, un rumor de banda estrecha— y con él la
  // hoguera y la fiesta, y Vera los tachó los cuatro: «horrible, no tiene
  // ningún sentido» (30 sep 2026). Una aldea que se oye necesita gente de
  // verdad, y eso son grabaciones o voces generadas (decisión 1 de
  // `plan-audio-mundo.md` §6). Los datos siguen llegando (`people`,
  // `villageCells`, `festivity`, `hearthAt`) para cuando existan los ficheros.
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
