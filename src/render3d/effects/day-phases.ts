// G-08 · Los momentos de la jornada, y qué hora son. design.md D.6.1, §11.2.
//
// Vivían dentro de `daylight.ts`, que es quien los usa para pintar el cielo.
// Salieron de ahí en v3.72 por dos razones y ninguna es de estilo: el reloj de
// la cabecera (U-12) tiene que decir **la hora que se ve por la ventana**, así
// que necesita estos mismos números; y `daylight.ts` importa Three, que no
// tiene por qué entrar en la cabecera ni en el camino del render 2D. Aquí no
// hay ni una importación.

/**
 * Los momentos del día escénico, en fracción de día.
 *
 * **La noche está comprimida a propósito**: del alba (0,06) al anochecer (0,78)
 * van siete décimas de jornada, y de la noche cerrada (0,92) al alba siguiente
 * apenas una. Nadie quiere mirar un valle a oscuras, y por eso la jornada le da
 * el 86 % de sí misma a la luz. La fase 0 es medianoche.
 */
const DAWN = 0.06;
const MORNING = 0.18;
const NOON = 0.45;
const DUSK = 0.78;
const NIGHT = 0.92;

/**
 * Qué hora es en cada momento de la jornada, y por qué no es una regla de tres.
 *
 * Porque la jornada comprime la noche: multiplicar la fase por veinticuatro
 * pone el alba a las 01:26 y el mediodía a las 10:48, y **eso es exactamente la
 * mentira que U-12 vino a quitar** —lo primero que se vio en una captura fue el
 * reloj marcando la 01:00 sobre un valle a pleno sol—. Así que la hora se
 * interpola entre los momentos que el cielo ya tiene marcados: el alba es a las
 * cinco, el mediodía a las doce, el anochecer a las siete y la noche cerrada a
 * las diez. Entre dos de ellos, lineal.
 *
 * El precio, escrito: las horas no duran todas lo mismo de tiempo real. Las
 * cinco de la madrugada pasan en un segundo y medio a ×1 y las de la mañana
 * tardan casi siete. Es la consecuencia honesta de tener una noche corta, y la
 * alternativa era un reloj que no cuadra con lo que se ve.
 */
const ANCHORS: readonly [phase: number, hour: number][] = [
  [0, 0],
  [DAWN, 5],
  [NOON, 12],
  [DUSK, 19],
  [NIGHT, 22],
  [1, 24],
];

/** La hora del valle, de 0 a 23, para una fase de jornada cualquiera. */
export function hourAt(phase: number): number {
  // Restando el suelo y no con `% 1` dos veces: `((0.92 % 1) + 1) % 1` da
  // 0,9199999999999999 y con ese error la noche cerrada salía a las 21 en vez
  // de a las 22. Medido al escribir la prueba de los cuatro momentos.
  const day = Number.isFinite(phase) ? phase - Math.floor(phase) : 0;
  for (let n = 1; n < ANCHORS.length; n += 1) {
    const [fromPhase, fromHour] = ANCHORS[n - 1] as [number, number];
    const [toPhase, toHour] = ANCHORS[n] as [number, number];
    if (day > toPhase) continue;
    const span = toPhase - fromPhase;
    const hour = fromHour + ((day - fromPhase) / span) * (toHour - fromHour);
    return Math.min(23, Math.floor(hour));
  }
  return 0;
}

export { DAWN, DUSK, MORNING, NIGHT, NOON };
