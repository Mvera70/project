// «Graphics» · La resolución adaptativa, pura (30 sep 2026).
//
// Decide si el lienzo baja o sube de densidad según lo que tardan los
// fotogramas. La revisión del 30 sep (`docs/medidas/revision-rendimiento-2026-09-30.md`
// §4, fila RV-3) encontró dos defectos en la de v4.96, que vivía dentro de
// `renderer.ts`:
//
// - **Decidía en cada fotograma** pasados los dos primeros segundos: el
//   contador sólo volvía a cero cuando la escala cambiaba.
// - **Con una media exponencial (0,9/0,1), un solo fotograma de ~100 ms
//   cruzaba el umbral**: un relevo de jornada, una recolección de basura o
//   volver de otra pestaña bajaban la resolución un 15 % durante más de 6 s.
//   Lo contrario de lo que `6acc645` quería.
//
// Ahora se decide **una vez por ventana** de `everySeconds`, cambie o no la
// escala, con la **media** de los huecos de la ventana **sin los largos
// sueltos** (más de `outlier` veces la mediana). Si los largos no son sueltos
// —más de `outlierShare` de la ventana—, cuentan todos: un aparato lento de
// verdad sigue bajando. Y la media, no la mediana, porque con un tope de 60 en
// una pantalla de 90 Hz los huecos alternan 11 y 22 ms, y lo que dice si se
// llega es que promedien 16,7.
//
// Pura y sin reloj propio: recibe el hueco de cada fotograma y devuelve la
// escala. Se prueba sin pantalla (`tests/fast/adaptive-scale.test.ts`).
//
// **Y una bajada tiene que pagarse** (v5.65, 2 oct 2026). Vera, en su tablet
// —una iPlay 70 mini Ultra, Adreno 725, perfil Medium @60—: «se ve muy mal y
// con dientes de sierra todo», con el panel en «resolución 50 %». La de v5.28
// bajaba siempre que la ventana fuera lenta, sin mirar si bajar servía: en un
// aparato al que le pesa la CPU —la vida, el envío de cientos de llamadas— el
// fotograma tarda lo mismo a cualquier resolución, y cada 2 s bajaba otro 15 %
// hasta el suelo, en ocho segundos, sin ganar nada y dibujando a la mitad.
// Ahora la ventana que sigue a una bajada la juzga: si el fotograma no se
// acortó al menos `payoff` de lo que se acortaría con todo el coste en
// píxeles (que van con el cuadrado de la escala), la bajada se deshace y no se
// vuelve a probar mientras el fotograma no empeore un `relapse` sobre lo que
// tardaba entonces. Un aparato al que le pesan los píxeles sigue bajando como antes.

/**
 * TUNE: se decide cada 2 s (cambiar la densidad rehace el lienzo); se baja un
 * 15 % por decisión y se recupera un paso tras 6 s holgados. Un hueco es largo
 * si pasa de tres veces la mediana de su ventana, y los largos sólo se
 * descartan si no pasan de un cuarto de la ventana. Los umbrales «lento» y
 * «holgado» y el suelo los pone el perfil (`profile.ts`), del objetivo de
 * fotogramas que eligió el jugador.
 *
 * TUNE (v5.65): una bajada paga si acorta el fotograma al menos la mitad de
 * lo que lo acortaría si todo él fueran píxeles (de 1 a 0,85 los píxeles bajan
 * un 28 %: tiene que ganar un 14 %); y una bajada que no pagó no se reintenta
 * hasta que el fotograma empeore un 25 % —otra escena, más casas—. Medido en
 * el navegador con un aparato que no depende de los píxeles (SwiftShader a
 * 200×300, el coste en los vértices): la media de una ventana de 2 s con cinco
 * fotogramas baila un 6–10 % entre ventanas, y con un cuarto y un 15 % el
 * ruido daba por buenas dos bajadas inútiles y volvía a probar la tercera.
 *
 * TUNE (v5.65): y los primeros 8 s del valle no deciden. Recién abierto, el
 * fotograma va más lento (compilar, el primer relevo, el vuelo de entrada) y
 * se acelera solo: medido, la primera ventana un 20 % por encima de las de
 * después. Con esa cuesta abajo cualquier bajada parece pagar.
 */
export const ADAPT = {
  everySeconds: 2, recoverSeconds: 6, step: 0.15, outlier: 3, outlierShare: 0.25,
  payoff: 0.5, relapse: 0.25, warmSeconds: 8,
} as const;

export interface AdaptLimits {
  readonly slowSeconds: number;
  readonly easySeconds: number;
  readonly lowestScale: number;
}

/** Lo que la adaptativa lleva entre fotogramas. Mutable a propósito: se toca en cada `paint`. */
export interface AdaptWindow {
  gaps: number[];
  seconds: number;
  /** Segundos seguidos de ventanas holgadas. */
  easySeconds: number;
  /** La bajada que la ventana en curso tiene que juzgar: de qué escala venía y cuánto tardaba el fotograma. */
  trial: { readonly fromScale: number; readonly frameSeconds: number } | null;
  /**
   * Lo que tardaba el fotograma cuando una bajada no pagó: mientras no empeore
   * un `relapse` sobre esto, no se vuelve a bajar. `null` si bajar sirve.
   */
  unpaidAt: number | null;
  /** Segundos de fotogramas vistos desde que se abrió el valle, hasta `warmSeconds`. */
  warmed: number;
}

export function adaptWindow(): AdaptWindow {
  return { gaps: [], seconds: 0, easySeconds: 0, trial: null, unpaidAt: null, warmed: 0 };
}

/** Lo que tarda de verdad un fotograma en esta ventana: la media, sin los largos sueltos. */
export function windowFrameSeconds(gaps: readonly number[]): number {
  if (gaps.length === 0) return 0;
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const kept = gaps.filter((gap) => gap <= median * ADAPT.outlier);
  const mean = (list: readonly number[]): number => list.reduce((sum, gap) => sum + gap, 0) / list.length;
  return gaps.length - kept.length > gaps.length * ADAPT.outlierShare ? mean(gaps) : mean(kept);
}

/** Si una bajada de `fromScale` a `toScale` acortó el fotograma lo bastante para merecerla. */
export function dropPaid(fromScale: number, toScale: number, before: number, after: number): boolean {
  const pixelShare = 1 - (toScale / fromScale) ** 2;
  return before - after >= before * pixelShare * ADAPT.payoff;
}

/**
 * Suma el hueco de un fotograma y, al cerrar una ventana, decide. Devuelve la
 * escala que toca: la misma si no cambia, y siempre la misma entre ventanas.
 */
export function adaptScale(window: AdaptWindow, gapSeconds: number, scale: number, limits: AdaptLimits): number {
  if (!(gapSeconds > 0)) return scale;
  if (window.warmed < ADAPT.warmSeconds) {
    window.warmed += gapSeconds;
    return scale;
  }
  window.gaps.push(gapSeconds);
  window.seconds += gapSeconds;
  if (window.seconds < ADAPT.everySeconds) return scale;
  const frame = windowFrameSeconds(window.gaps);
  const length = window.seconds;
  window.gaps.length = 0;
  window.seconds = 0;
  const trial = window.trial;
  window.trial = null;
  if (frame > limits.slowSeconds) {
    window.easySeconds = 0;
    // La bajada de la ventana anterior no acortó el fotograma: lo que pesa no
    // son los píxeles. Se deshace y se apunta cuánto tardaba.
    if (trial !== null && !dropPaid(trial.fromScale, scale, trial.frameSeconds, frame)) {
      window.unpaidAt = trial.frameSeconds;
      return trial.fromScale;
    }
    if (window.unpaidAt !== null && frame <= window.unpaidAt * (1 + ADAPT.relapse)) return scale;
    window.unpaidAt = null;
    if (scale <= limits.lowestScale) return scale;
    window.trial = { fromScale: scale, frameSeconds: frame };
    return Math.max(limits.lowestScale, scale - ADAPT.step);
  }
  if (frame < limits.easySeconds) {
    window.unpaidAt = null;
    window.easySeconds += length;
    if (window.easySeconds >= ADAPT.recoverSeconds && scale < 1) {
      window.easySeconds = 0;
      return Math.min(1, scale + ADAPT.step);
    }
    return scale;
  }
  window.easySeconds = 0;
  return scale;
}
