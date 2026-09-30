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

/**
 * TUNE: se decide cada 2 s (cambiar la densidad rehace el lienzo); se baja un
 * 15 % por decisión y se recupera un paso tras 6 s holgados. Un hueco es largo
 * si pasa de tres veces la mediana de su ventana, y los largos sólo se
 * descartan si no pasan de un cuarto de la ventana. Los umbrales «lento» y
 * «holgado» y el suelo los pone el perfil (`profile.ts`), del objetivo de
 * fotogramas que eligió el jugador.
 */
export const ADAPT = { everySeconds: 2, recoverSeconds: 6, step: 0.15, outlier: 3, outlierShare: 0.25 } as const;

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
}

export function adaptWindow(): AdaptWindow {
  return { gaps: [], seconds: 0, easySeconds: 0 };
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

/**
 * Suma el hueco de un fotograma y, al cerrar una ventana, decide. Devuelve la
 * escala que toca: la misma si no cambia, y siempre la misma entre ventanas.
 */
export function adaptScale(window: AdaptWindow, gapSeconds: number, scale: number, limits: AdaptLimits): number {
  if (!(gapSeconds > 0)) return scale;
  window.gaps.push(gapSeconds);
  window.seconds += gapSeconds;
  if (window.seconds < ADAPT.everySeconds) return scale;
  const frame = windowFrameSeconds(window.gaps);
  const length = window.seconds;
  window.gaps.length = 0;
  window.seconds = 0;
  if (frame > limits.slowSeconds) {
    window.easySeconds = 0;
    return scale > limits.lowestScale ? Math.max(limits.lowestScale, scale - ADAPT.step) : scale;
  }
  if (frame < limits.easySeconds) {
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
