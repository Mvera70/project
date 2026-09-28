// La madera de la semana, de una en una (esquema 12, 28 sep 2026).
//
// Hasta aquí el paso 5 del tick sumaba de golpe lo que cortaban los leñadores,
// y la leñera saltaba una vez por semana: a ×1, un número que cambia cada
// catorce minutos sin que nadie lo haya traído. El prototipo que pidió Vera
// —«de +1 madera a una obra visible»— necesita que cada unidad **llegue**: que
// tenga su hora, que la capa de vida pueda poner a alguien a descargarla en
// ese momento y que la leñera suba de uno en uno delante de quien mira.
//
// Tres funciones y una regla. `planWoodRun` reparte la producción de la semana
// en entregas enteras con su hora; `creditWoodRun` mete en la leñera las que ya
// han llegado según la fracción de semana que el bucle lleva; `closeWoodRun`
// liquida lo que quede al cerrar la semana. **La regla: el plan y lo acreditado
// viven en el estado**, así que guardar a media semana, cargar, recuperar el
// letargo o pintar a treinta o a sesenta fotogramas termina siempre en la misma
// leñera al cerrar la semana, y ninguna unidad entra dos veces.
//
// Las horas no consumen ningún flujo de azar: salen de `hash32` con la semilla
// y el tick, como los actos del jugador, y así no desplazan ni una tirada.

import { TIME, WOOD_RUN } from '../balance';
import { hash32 } from '../rng';
import type { GameState, WoodRun } from '../state';

/**
 * Los tramos de luz de trabajo de una semana, en fracción de semana.
 *
 * La semana del motor empieza a `DAY_START_PHASE` de la primera jornada de sol
 * (media mañana, `derive/clock.ts`) y dura `DAYS_PER_WEEK` jornadas, así que
 * los tramos se recortan a esa ventana: la primera mañana empieza tarde y la
 * última jornada sólo tiene su primer rato.
 */
function workingSpans(): readonly (readonly [number, number])[] {
  const days = TIME.DAYS_PER_WEEK;
  const start = TIME.DAY_START_PHASE;
  const spans: [number, number][] = [];
  for (let day = 0; day <= days; day += 1) {
    const from = Math.max(day + WOOD_RUN.FIRST_PHASE, start);
    const to = Math.min(day + WOOD_RUN.LAST_PHASE, start + days);
    if (to > from) spans.push([(from - start) / days, (to - start) / days]);
  }
  return spans;
}

const SPANS = workingSpans();
const WORKING = SPANS.reduce((sum, [from, to]) => sum + (to - from), 0);

/** La fracción de semana a la que se llega tras `share` (0..1) del tiempo de trabajo. */
function atWorkingShare(share: number): number {
  let left = Math.max(0, Math.min(1, share)) * WORKING;
  for (const [from, to] of SPANS) {
    if (left <= to - from) return from + left;
    left -= to - from;
  }
  return SPANS[SPANS.length - 1]![1];
}

/**
 * Reparte la madera de la semana que empieza en `state.tick` en entregas de
 * una unidad. Cada una cae en su hueco del tiempo de trabajo, apartada de su
 * sitio regular por un hash: repartidas, sin dos pegadas y siempre de día.
 */
export function planWoodRun(state: GameState, wood: number): WoodRun {
  const amount = Math.max(0, Number.isFinite(wood) ? wood : 0);
  const units = Math.floor(amount);
  const at: number[] = [];
  for (let unit = 0; unit < units; unit += 1) {
    const jitter = hash32(state.seed, `wood:${state.tick}:${unit}`) / 0x1_0000_0000;
    const share = (unit + (1 - WOOD_RUN.JITTER) / 2 + WOOD_RUN.JITTER * jitter) / units;
    at.push(atWorkingShare(share));
  }
  return { tick: state.tick, at, credited: 0, rest: amount - units, base: null };
}

/**
 * Mete en la leñera las entregas cuya hora ya ha pasado. `fraction` es la parte
 * consumida de la semana en curso, la misma que el bucle pasa al render.
 *
 * Devuelve cuántas unidades han entrado **ahora**, que es lo único que la
 * pantalla necesita para enseñar el «+1» cuando el motor lo confirma y no
 * antes. Sólo avanza: una fracción menor que la última no deshace nada, y un
 * plan de otra semana no se toca.
 */
export function creditWoodRun(state: GameState, fraction: number): number {
  const run = state.woodRun;
  if (run === null || run.tick !== state.tick || state.ended !== null) return 0;
  let entered = 0;
  while (run.credited < run.at.length && run.at[run.credited]! <= fraction) {
    run.credited += 1;
    entered += 1;
  }
  if (entered === 0) return 0;
  // Entre dos ticks nada más toca la leñera (los actos del jugador se aplican
  // dentro del tick), así que la de partida se apunta una vez y basta.
  run.base ??= state.village.wood;
  state.village.wood = run.base + run.credited;
  return entered;
}

/**
 * Cierra la semana: lo que no se haya acreditado todavía y la fracción que no
 * llegaba a entrega entran ahora, y el plan se retira. Es el paso 1a del tick,
 * así que la recuperación del letargo, que sólo da ticks enteros, acaba en la
 * misma leñera que quien miró la semana entera.
 */
export function closeWoodRun(state: GameState): number {
  const run = state.woodRun;
  if (run === null) return 0;
  const owed = run.at.length - run.credited + run.rest;
  state.village.wood = (run.base ?? state.village.wood) + (run.at.length + run.rest);
  state.woodRun = null;
  return owed;
}
