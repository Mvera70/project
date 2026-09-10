/**
 * G-09 · Las escenas que el banco mide. design.md D.9.
 *
 * Aparte del banco a propósito. El banco toca el documento en cuanto se
 * importa —es una página— y la suite rápida necesita mirar esta lista sin
 * arrancar un navegador. Una lista de escenas que nadie puede comprobar es una
 * lista que se queda sin el caso que importa.
 */

export interface SceneSpec {
  readonly id: string;
  readonly note: string;
  readonly seed: number;
  readonly years: number;
  /** Semana del año, para elegir estación. */
  readonly week: number;
  /** Cuánto se acerca la cámara. 1 es el encuadre de partida. */
  readonly close: number;
  /** Si el valle está en crisis: peste declarada y granero vacío. */
  readonly crisis: boolean;
}

/**
 * Las escenas que D.9 nombra.
 *
 * La primera es la de comparación que la propia D.9 fija: los ochenta
 * habitantes y cuarenta y cinco edificios del objetivo de Canvas. Las demás son
 * los casos que aprietan por motivos distintos.
 */
export const SCENES: readonly SceneSpec[] = [
  { id: 'comparacion', note: 'La escena de D.9: aldea grande, verano, encuadre de partida', seed: 7, years: 40, week: 16, close: 1, crisis: false },
  { id: 'pequena', note: 'Recien fundada: lo minimo que hay que pintar', seed: 7, years: 1, week: 16, close: 1, crisis: false },
  { id: 'madura', note: 'Aldea asentada, la vista normal de una partida larga', seed: 7, years: 16, week: 16, close: 1, crisis: false },
  { id: 'invierno', note: 'La misma, en invierno', seed: 7, years: 16, week: 40, close: 1, crisis: false },
  { id: 'bosque', note: 'Semilla con mucho bosque en pantalla', seed: 23, years: 16, week: 16, close: 1, crisis: false },
  { id: 'crisis', note: 'Peste declarada y granero vacio: todas las senales a la vez', seed: 7, years: 16, week: 40, close: 1, crisis: true },
  { id: 'cerca', note: 'Camara al tope de cerca, que es donde mas pixeles cuesta cada aldeano', seed: 7, years: 16, week: 16, close: 0.25, crisis: false },
];
