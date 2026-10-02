// El perfil de render: lo que el jugador elige en «Graphics» y lo que eso
// significa para el renderer (29 sep 2026).
//
// Vera, con la tablet a 0 fps: «me gustaría lockear el juego a 60 FPS
// estables» y «en el menú principal añadir un botón para abrir un menú de
// opciones gráficas». Hasta hoy la calidad la decidía el renderer solo, por
// `(pointer: coarse)`: un aparato táctil dibujaba sin MSAA, a 1,5 de densidad
// y con el mapa de sombras a la mitad, y nadie podía bajar más en un aparato
// flojo ni subir en una tablet buena. Aquí se separa: **la elección** es del
// jugador (`ui/graphics-settings.ts` la guarda), **la traducción** a mandos
// del renderer es de este fichero, y es pura para poder probarse sin pantalla.
//
// Nada de esto toca el motor: la partida es la misma a cualquier calidad.

/** Lo que se elige. `auto` deja que decida el aparato, como hasta hoy. */
export type QualityChoice = 'auto' | 'high' | 'medium' | 'low';
/** A cuántos fotogramas por segundo se quiere ir. */
export type FrameRateChoice = 30 | 60;

export interface GraphicsSettings {
  readonly quality: QualityChoice;
  readonly frameRate: FrameRateChoice;
}

export const DEFAULT_GRAPHICS: GraphicsSettings = { quality: 'auto', frameRate: 60 };

/** Los mandos del renderer. TUNE: los tres niveles, medidos en el portátil el 27 sep y el 29 sep 2026. */
export interface RenderProfile {
  /** El nivel que se acabó aplicando, resuelto `auto`. */
  readonly level: 'high' | 'medium' | 'low';
  /** Tope de la densidad de píxeles (`devicePixelRatio`). */
  readonly pixelRatioCap: number;
  /** Suavizado de bordes por hardware (MSAA). Se decide al crear el contexto. */
  readonly antialias: boolean;
  /** Si el sol proyecta sombras. */
  readonly shadows: boolean;
  /** Lado del mapa de sombras, en texels. */
  readonly shadowMapSize: number;
  /** Cada cuántos fotogramas se rehace el mapa de sombras si la cámara no se mueve. */
  readonly shadowEvery: number;
  /** Menos matas de hierba por celda. */
  readonly lightGrass: boolean;
  /** Hasta dónde puede bajar la resolución adaptativa (fracción de la densidad). */
  readonly lowestScale: number;
  /** El objetivo: por encima de `slowSeconds` por fotograma se baja resolución; por debajo de `easySeconds` un rato, se recupera. */
  readonly targetFps: FrameRateChoice;
  readonly slowSeconds: number;
  readonly easySeconds: number;
}

// TUNE (v5.65, 2 oct 2026): el suelo de la adaptativa en High y Medium es
// **un píxel dibujado por píxel CSS** (`pixelRatioCap · lowestScale = 1`).
// Medium bajaba a 0,5 de 1,5: tres cuartos de píxel por píxel CSS, y en la
// tablet de Vera (densidad 2) cada píxel dibujado tapaba 2,7 de la pantalla:
// el ciervo pixelado y la hierba en escalera de su captura. Por debajo de eso
// la imagen se deshace antes de que el fotograma se note; quien necesite
// menos tiene Low, que es para eso.
const LEVELS = {
  high: { pixelRatioCap: 2, antialias: true, shadows: true, shadowMapSize: 2048, shadowEvery: 2, lightGrass: false, lowestScale: 0.5 },
  medium: { pixelRatioCap: 1.5, antialias: false, shadows: true, shadowMapSize: 1024, shadowEvery: 4, lightGrass: true, lowestScale: 1 / 1.5 },
  low: { pixelRatioCap: 1, antialias: false, shadows: false, shadowMapSize: 512, shadowEvery: 8, lightGrass: true, lowestScale: 0.35 },
} as const;

/**
 * De la elección al perfil. `auto` es lo que el renderer hacía solo hasta
 * hoy: medio en un aparato táctil, alto en un ordenador.
 *
 * Los umbrales de la adaptativa salen del objetivo: un fotograma que pase de
 * 1,3 veces el presupuesto es lento; uno que quede por debajo de 1,1 veces
 * durante un rato, holgado. A 60 el presupuesto son 16,7 ms, así que «lento»
 * empieza a los 22 y «holgado» acaba a los 18: en una pantalla de 60 Hz un
 * fotograma vale 16,7 y sí cabe por debajo.
 */
export function resolveProfile(settings: GraphicsSettings, handheld: boolean): RenderProfile {
  const level = settings.quality === 'auto' ? (handheld ? 'medium' : 'high') : settings.quality;
  const budget = 1 / settings.frameRate;
  return {
    level,
    ...LEVELS[level],
    targetFps: settings.frameRate,
    slowSeconds: budget * 1.3,
    easySeconds: budget * 1.1,
  };
}

/** Lo que vale como ajuste guardado; lo demás vuelve a lo de fábrica. */
export function sanitiseGraphics(raw: unknown): GraphicsSettings {
  const value = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const quality = value['quality'];
  const frameRate = value['frameRate'];
  return {
    quality: quality === 'high' || quality === 'medium' || quality === 'low' || quality === 'auto' ? quality : DEFAULT_GRAPHICS.quality,
    frameRate: frameRate === 30 || frameRate === 60 ? frameRate : DEFAULT_GRAPHICS.frameRate,
  };
}
