// G-10 · La luz del día escénico. design.md D.6, D.3.
//
// El valle ya tenía día: la gente sale al amanecer, trabaja, y a las ocho
// décimas se mete en casa (§10.6). Lo que no tenía era luz que se enterara. Se
// acostaban con sol de mediodía, y un pueblo que se va a dormir a plena luz no
// se lee como un pueblo que se va a dormir, se lee como un fallo.
//
// **Nada de esto es estado.** El día escénico es del reloj de presentación
// (D.6), no de la simulación: la semana del juego dura lo que dura y esto sólo
// decide de qué color entra la luz por la ventana. Es una función pura de la
// hora, así que el mismo instante da siempre la misma luz, que es lo que §4.3
// exige de todo lo que se dibuja.
//
// **La legibilidad manda sobre el realismo.** §10.3 quiere el valle como HUD: se
// tiene que poder leer que hay peste o que el granero está vacío sin abrir una
// ficha, y eso a las tres de la madrugada también. Por eso la noche de este
// valle es una noche de luna llena y no una noche de verdad: baja el sol, entra
// el azul y **no se apaga nada**.

import { Color } from 'three';

// Los momentos de la jornada viven en `day-phases.ts` desde v3.72: el reloj de
// la cabecera necesita los mismos y no puede arrastrar Three consigo. Se siguen
// reexportando aquí abajo, así que quien los importaba no cambia.
import { DAWN, DUSK, MORNING, NIGHT, NOON } from './day-phases';

/**
 * Cuánta luz queda de noche, contra el mediodía.
 *
 * TUNE: 0,38. Por debajo de un tercio el granero deja de leerse y el valle
 * pierde su papel de HUD; por encima de la mitad la noche no se distingue de
 * una tarde nublada y la jornada deja de tener forma.
 *
 * **Es el suelo del cielo, no el del sol** (v3.62). Hasta aquí lo era de los
 * dos, y eso dejaba el sol al 38 % con la noche cerrada: una direccional de
 * intensidad casi uno que seguía proyectando sombras largas y marcadas de
 * árboles y tejados. El dueño del diseño lo dijo en una línea —«de noche los
 * árboles generan sombra, sería imposible sin sol»— y tiene toda la razón: de
 * noche no hay una luz que venga de un sitio, hay claridad. Lo que sostiene el
 * valle a oscuras es el hemisférico, y el sol se apaga del todo.
 */
const NIGHT_FLOOR = 0.38;

/**
 * Lo que sube el cielo nocturno para cubrir lo que el sol deja de poner.
 *
 * TUNE: 1,9. El sol nocturno aportaba 0,99 de intensidad direccional y ahora
 * aporta cero, así que el hemisférico tiene que recoger esa luz o la noche se
 * vuelve un pozo. No es la misma cantidad porque no es la misma clase de luz:
 * la direccional alumbraba una cara y dejaba la otra negra, y el hemisférico
 * llega a todas, así que con menos se ve más.
 */
const NIGHT_SKY_GAIN = 1.9;

/** Lo alto que llega el sol al mediodía, en grados sobre el horizonte. */
const NOON_ELEVATION = 62;

/** Lo bajo que se queda cuando se ha ido: no cero, para que la sombra no gire loca. */
const NIGHT_ELEVATION = 14;

export interface Daylight {
  /** Dirección de donde viene la luz, en unidades de escena y ya normalizada. */
  readonly sun: { x: number; y: number; z: number };
  readonly sunColour: string;
  readonly sunIntensity: number;
  readonly skyColour: string;
  readonly groundBounce: string;
  readonly ambientIntensity: number;
  /** El fondo, que es también el color al que se va la niebla. */
  readonly background: string;
  /**
   * Cuánto día hay, de 0 a 1.
   *
   * Lo usan las señales que sólo tienen sentido de noche: §10.3 pide **luz al
   * caer el día**, y una ventana encendida a mediodía no dice que haya alguien
   * en casa, dice que el render no sabe qué hora es.
   */
  readonly daylight: number;
}

const SUN_HIGH = new Color('#FFF4D8');
const SUN_LOW = new Color('#FFB870');
const SUN_NIGHT = new Color('#9FB4D8');
const SKY_DAY = new Color('#DDE3C4');
const SKY_EVENING = new Color('#E8C39A');
const SKY_NIGHT = new Color('#5A6780');
const BOUNCE_DAY = new Color('#776F62');
const BOUNCE_NIGHT = new Color('#2E3644');

function ease(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

/** Cuánto hay de una etapa a otra, 0 antes de `from` y 1 pasado `to`. */
function between(phase: number, from: number, to: number): number {
  return ease((phase - from) / (to - from));
}

const mixed = new Color();
function blend(from: Color, to: Color, amount: number): string {
  return `#${mixed.copy(from).lerp(to, Math.max(0, Math.min(1, amount))).getHexString()}`;
}

/**
 * La luz que hace a esta hora del día escénico.
 *
 * `phase` es la fracción del día, la misma que decide quién está en la calle.
 * El sol sale por el este, cruza y se pone por el oeste; de noche no se apaga,
 * se queda bajo y azul, que es la luna de §10.3 puesta en práctica.
 */
function lightAt(phase: number): Daylight {
  const day = ((phase % 1) + 1) % 1;

  // Cuánto día hay: sube de madrugada, se mantiene y cae al anochecer.
  const risen = between(day, DAWN, MORNING);
  const fallen = between(day, DUSK, NIGHT);
  const light = risen * (1 - fallen);

  // Lo alto que está el sol. Un arco, no una recta: el mediodía dura, y el
  // amanecer y el atardecer son cortos, que es lo que los hace bonitos.
  const arc = Math.sin(Math.PI * Math.max(0, Math.min(1, (day - DAWN) / (NIGHT - DAWN))));
  const elevation = (NIGHT_ELEVATION + (NOON_ELEVATION - NIGHT_ELEVATION) * arc * light) * Math.PI / 180;
  // Y por dónde. **La vuelta es entera, no media.**
  //
  // Antes iba de este a oeste durante el día y volvía de un salto al amanecer:
  // ciento veintiséis grados de golpe, y las sombras del valle giraban con él.
  // Se veía jugando y era lo único de la luz que cantaba.
  //
  // Ahora el sol hace media vuelta de día —sale por el este y se pone por el
  // oeste, igual que antes— y la otra media de noche, por debajo del mundo,
  // que es por donde vuelve. En el amanecer siguiente llega al mismo sitio del
  // que salió sin pasar por ninguna parte: la vuelta cierra.
  const round = day < DAWN ? day + 1 : day;
  const turn = round <= DUSK
    ? ((round - DAWN) / (DUSK - DAWN)) * 0.5
    : 0.5 + ((round - DUSK) / (1 + DAWN - DUSK)) * 0.5;
  const compass = Math.PI * 0.15 + turn * Math.PI * 2;

  const height = Math.sin(elevation);
  const reach = Math.cos(elevation);
  const sun = { x: Math.cos(compass) * reach, y: height, z: Math.sin(compass) * reach };

  // El color: cálido cuando el sol está bajo —que es amanecer y atardecer—,
  // limpio en lo alto, y azul de luna cuando ya no está. Los dos mezclados se
  // encadenan sobre el mismo color de trabajo, así que el primero se guarda
  // antes de hacer el segundo.
  const low = 1 - ease(arc);
  const dark = 1 - light;
  const warm = new Color(blend(SUN_HIGH, SUN_LOW, low));
  const sunColour = blend(warm, SUN_NIGHT, dark);

  // El cielo se enciende de naranja justo antes de que el sol se vaya, y sólo
  // entonces: un valle naranja a media tarde sería un valle en llamas.
  const evening = between(day, DUSK - 0.10, DUSK + 0.04) * (1 - between(day, NIGHT - 0.04, NIGHT));
  const dusk = new Color(blend(SKY_DAY, SKY_EVENING, evening));
  const background = blend(dusk, SKY_NIGHT, dark);

  return {
    sun,
    sunColour,
    // Sin suelo: el sol se pone del todo, y una direccional de intensidad cero
    // no ilumina y por tanto no proyecta sombra de nada.
    sunIntensity: 2.6 * light,
    skyColour: background,
    groundBounce: blend(BOUNCE_DAY, BOUNCE_NIGHT, dark),
    // Y el cielo recoge lo que el sol suelta, que es lo que deja ver el valle
    // de noche sin que nada proyecte sombra.
    ambientIntensity: 1.5 * (
      NIGHT_FLOOR * NIGHT_SKY_GAIN + (1 - NIGHT_FLOOR * NIGHT_SKY_GAIN) * light
    ),
    background,
    daylight: light,
  };
}

/**
 * Cuánto se aplana la jornada de luz a cada velocidad. D.6.1.
 *
 * TUNE. Desde que la jornada sigue la velocidad entera, a ×64 el día escénico
 * dura **1,9 segundos reales**: el sol sale y se pone dos veces cada cuatro
 * segundos y las sombras dan la vuelta al valle en ese tiempo. No es una noche,
 * es un parpadeo, y un parpadeo de media pantalla tapa justo lo que uno va a
 * mirar a ×64 —que el valle crece, que aparecen tejados, que llega el invierno—.
 *
 * Así que a velocidades altas la luz **se queda quieta** en la de media mañana y
 * deja de contar la hora. No es una concesión al realismo: §10.3 pide que el
 * valle se lea como un instrumento, y a ×64 la hora del día ya no es
 * información que nadie pueda seguir. A ×1 y a ×4, donde una jornada dura dos
 * minutos y medio minuto, la luz cuenta la hora entera como siempre.
 */
const LIGHT_STEADY: Readonly<Record<0 | 1 | 4 | 16 | 64, number>> = {
  0: 0, 1: 0, 4: 0, 16: 0.55, 64: 0.95,
};

/** La hora en la que se queda la luz cuando deja de contar la hora. */
const STEADY_PHASE = 0.3;

function mixNumber(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

const fromColour = new Color();
const toColour = new Color();
function mixColour(from: string, to: string, amount: number): string {
  return `#${fromColour.set(from).lerp(toColour.set(to), amount).getHexString()}`;
}

/**
 * La luz que hace a esta hora del día escénico, a esta velocidad.
 *
 * `phase` es la fracción del día, la misma que decide quién está en la calle.
 * El sol sale por el este, cruza y se pone por el oeste; de noche no se apaga,
 * se queda bajo y azul, que es la luna de §10.3 puesta en práctica. Y a ×16 y
 * ×64 la jornada de luz se aplana hacia la de media mañana: ver `LIGHT_STEADY`.
 *
 * Sigue siendo pura: la misma hora y la misma velocidad dan la misma luz, que es
 * lo que §4.3 exige de todo lo que se dibuja.
 */
export function daylightAt(phase: number, speed: 0 | 1 | 4 | 16 | 64 = 1): Daylight {
  const live = lightAt(phase);
  const steady = LIGHT_STEADY[speed];
  if (steady <= 0) return live;

  const calm = lightAt(STEADY_PHASE);
  const sun = {
    x: mixNumber(live.sun.x, calm.sun.x, steady),
    y: mixNumber(live.sun.y, calm.sun.y, steady),
    z: mixNumber(live.sun.z, calm.sun.z, steady),
  };
  // Normalizado a mano: una direccional con un vector corto alumbra igual, pero
  // `sun` es un contrato de dirección (`contracts.ts`) y devolverlo sin norma
  // es dejar que cada consumidor decida si lo normaliza.
  const length = Math.hypot(sun.x, sun.y, sun.z) || 1;
  const background = mixColour(live.background, calm.background, steady);
  return {
    sun: { x: sun.x / length, y: sun.y / length, z: sun.z / length },
    sunColour: mixColour(live.sunColour, calm.sunColour, steady),
    sunIntensity: mixNumber(live.sunIntensity, calm.sunIntensity, steady),
    skyColour: background,
    groundBounce: mixColour(live.groundBounce, calm.groundBounce, steady),
    ambientIntensity: mixNumber(live.ambientIntensity, calm.ambientIntensity, steady),
    background,
    daylight: mixNumber(live.daylight, calm.daylight, steady),
  };
}

export { DAWN, DUSK, LIGHT_STEADY, NIGHT_FLOOR, NOON, STEADY_PHASE };
export { hourAt } from './day-phases';
