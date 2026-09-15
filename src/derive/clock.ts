// U-12 · El reloj que lee el jugador. design.md §11.2, §12.1, D.6.1.
//
// Lo pidió el dueño del diseño el 15 sep 2026: «el tiempo me gustaría que se
// visualizase en lugar del título de los años; me gustaría un contador con
// horas incluso, por eso quería arreglar el reloj: debe ser real el paso del
// tiempo, como si fuese la vida real».
//
// **El motor no sabe qué hora es, y sigue sin saberlo.** Un tick es una semana
// (§3.2) y eso no cambia: las horas son presentación, se derivan aquí y no
// entran en el estado ni en el guardado. Lo que sí cambió en v3.72 es que la
// semana dura siete jornadas de sol (`TIME.DAYS_PER_WEEK`), así que por primera
// vez hay una hora que decir sin mentir — antes pasaban ocho semanas por
// amanecer y el sol y el calendario contaban dos historias.
//
// Puro y sin dependencias del render: toma el tick y la fracción de tick que el
// bucle ya calcula, y devuelve lo que la cabecera pinta. La jornada de sol que
// se ve por la ventana sale de la misma cuenta (`presentation-clock.ts` se pone
// en hora con esto en cada discontinuidad), así que las dos no pueden
// discrepar.

import { TIME } from '../engine/balance';
import type { Season } from '../engine/state';
import { clockOf } from '../engine/time';

/** Cuántos días tiene una estación: doce semanas de siete. */
export const DAYS_PER_SEASON = TIME.WEEKS_PER_SEASON * TIME.DAYS_PER_WEEK;

export interface ValleyClock {
  /**
   * Año desde la fundación, **contando desde cero**, igual que `yearOf`.
   *
   * No es el año que se lee en pantalla: el uno se lo suma el banco al
   * presentar (`ABSOLUTE_YEARS` en `chronicle/render.ts`), porque nadie funda
   * una aldea en el año cero y porque la crónica guarda los del motor. Quien
   * pinte esto pasa el número tal cual y deja que el banco lo convierta, o el
   * año saldrá con uno de más —medido en una captura: «Year 2» en una partida
   * recién fundada—.
   */
  readonly year: number;
  readonly season: Season;
  /** Día de la estación, de 1 a `DAYS_PER_SEASON`. */
  readonly dayOfSeason: number;
  /** Día de la semana, de 0 a `TIME.DAYS_PER_WEEK - 1`. */
  readonly dayOfWeek: number;
  /**
   * Dónde está la jornada de sol: 0 es medianoche, y el alba, el mediodía y el
   * anochecer están donde el cielo los tiene puestos (`effects/day-phases.ts`).
   *
   * **La hora no se calcula aquí**, y es deliberado: la jornada comprime la
   * noche, así que la hora sale de interpolar entre esos momentos y quien los
   * conoce es el módulo que pinta el cielo. Esta capa dice dónde está el día;
   * `hourAt` dice qué hora parece.
   */
  readonly sunPhase: number;
}

function clamp(value: number, low: number, high: number): number {
  return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : low;
}

/**
 * La hora del valle en este instante. `tickFraction` es lo que el bucle de
 * §13.2 ya lleva: cuánto queda consumido de la semana en curso.
 *
 * El año y la estación los manda el motor (`clockOf`), que es quien firma la
 * crónica; el día y la hora salen de la fracción. **El contador de días cambia
 * a media mañana y no a medianoche**, porque la semana del motor empieza donde
 * empieza y la jornada de sol al alba: son seis horas de desfase entre las dos
 * fronteras y no se ven. Preferir medianoche costaría abrir la partida a
 * oscuras, que es lo que v3.34 arregló.
 */
export function valleyClock(tick: number, tickFraction: number): ValleyClock {
  const week = Math.floor(tick);
  // Un tick recién cumplido llega con fracción 1 antes de que el motor avance,
  // y una fracción de 1 daría un octavo día de la semana.
  const fraction = Math.min(clamp(tickFraction, 0, 1), 1 - 1e-9);
  const intoWeek = fraction * TIME.DAYS_PER_WEEK;
  const dayOfWeek = Math.min(TIME.DAYS_PER_WEEK - 1, Math.floor(intoWeek));
  const intoDay = intoWeek - Math.floor(intoWeek);
  const sunPhase = (intoDay + TIME.DAY_START_PHASE) % 1;
  const calendar = clockOf(week);
  return {
    year: calendar.year,
    season: calendar.season,
    dayOfSeason: calendar.seasonWeek * TIME.DAYS_PER_WEEK + dayOfWeek + 1,
    dayOfWeek,
    sunPhase,
  };
}

/**
 * Los segundos escénicos que le tocan a este instante del motor.
 *
 * Es la otra mitad de la coherencia: `presentation-clock.ts` acumula sus
 * segundos con los fotogramas —tiene que ser suave— pero se pone en hora con
 * esto cada vez que el mundo salta (partida nueva, carga, letargo), que es
 * cuando su cuenta y la del motor podrían separarse. Las dos corren al mismo
 * ritmo por construcción (`REAL_MS_PER_TICK = DAYS_PER_WEEK · día de sol`), así
 * que entre salto y salto no se separan.
 */
export function scenicSecondsAt(tick: number, tickFraction: number, daySeconds: number): number {
  const fraction = clamp(tickFraction, 0, 1);
  return (Math.floor(tick) + fraction) * TIME.DAYS_PER_WEEK * daySeconds;
}
