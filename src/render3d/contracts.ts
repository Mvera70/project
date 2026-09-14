// G-01 · Public boundary between the simulation, presentation owner and 3D renderer.

import type { GameState, Role, VillagerId } from '../engine/state';
import type { ClipName } from './clips';

/**
 * Qué está haciendo una figura, de las seis cosas que el render distingue.
 *
 * Nace en G-05 como la salida de los actores derivados y **sobrevive a V-12**
 * porque el nombre sigue describiendo lo que el render necesita saber: no cómo
 * se ha llegado a esa postura, sino cuál es. Hoy lo produce la capa de vida
 * (`life/cast.ts`), que lo deduce de un cuerpo que anda de verdad.
 */
export type Activity = 'home' | 'leaving' | 'walking' | 'working' | 'returning' | 'resting';

/**
 * Una figura en la escena, lista para pintarse. design.md D.5, Anexo E.
 *
 * **Es el contrato entre la capa 2 y la capa 3** (E.2): la vida lo produce en
 * `life/cast.ts` y `world/cast.ts` lo consume para posar un modelo. Nada de
 * aquí entra en el guardado ni vuelve al motor.
 *
 * Vivía en `actors/index.ts` junto a la función que lo derivaba del reloj. V-12
 * borró esa función —el valle ya no evalúa una curva, simula cuerpos— y el tipo
 * se quedó, que es lo que el brief de la fase pedía conservar.
 */
export interface Actor {
  readonly id: VillagerId;
  /** Posición en la escena. El `(x, y)` del mapa es `(x, 0, z)` con `z = y` (D.4). */
  readonly x: number;
  readonly z: number;
  /** Hacia dónde mira, en radianes sobre la vertical. Cero mira a `+z`. */
  readonly facing: number;
  readonly activity: Activity;
  readonly clip: ClipName;
  /** En qué segundo de su propio clip hay que ponerlo. */
  readonly clipSeconds: number;
  /**
   * Suelo recorrido desde que empezó este tramo, en celdas.
   *
   * Es lo que mueve el clip de andar, y por eso los pies no patinan: cuenta
   * distancia recorrida, no desplazamiento neto.
   */
  readonly travelled: number;
  /** La celda a la que pertenece ahora mismo. De ella cuelgan una puerta o un ancla. */
  readonly cell: number;
  readonly named: boolean;
  /**
   * Si ahora mismo está parado con alguien (§11.9).
   *
   * Lo sabe quien coloca a la gente, y lo necesita quien dibuja la burbuja de
   * §11.1.1: deducirlo del clip —«trabajando pero con el clip de estarse»— era
   * adivinar desde fuera algo que aquí se sabe.
   */
  readonly talking: boolean;
  /**
   * Los años que tiene. Sirven para la talla y para nada más.
   *
   * Un valle de adultos idénticos no es un valle: los niños tienen que verse
   * niños desde arriba, que es donde no hay fichas que leer. La talla sale de
   * aquí y el resto de la variación sale del `id`, porque el estado no guarda
   * de qué color viste nadie ni tiene por qué.
   */
  readonly age: number;
  /**
   * El oficio con nombre que lleva, o `null` si es un campesino anónimo.
   *
   * `null` es la mayoría: sólo los aldeanos con nombre llevan `Role` (§3.4).
   * Quien pinta decide con esto qué modelo usa (D.6.2, `world/cast.ts`).
   */
  readonly role: Role | null;
}

export type GraphicsTarget =
  | { kind: 'building'; id: number }
  | { kind: 'villager'; id: number }
  | { kind: 'terrain'; x: number; y: number };

export interface GraphicsFrame {
  readonly tickFraction: number;
  readonly presentationSeconds: number;
  readonly deltaSeconds: number;
  /**
   * G-07 · El juego tiene ×64 y este contrato llegaba a ×16.
   *
   * Lo añadió §11 cuando el jugador dijo que ×16 se le quedaba corto para
   * probar, y el Anexo D se escribió antes. No es un caso raro: es el que más
   * exige al reloj de presentación, porque es donde más se separan el ritmo del
   * mundo y el de la gente.
   */
  readonly speed: 0 | 1 | 4 | 16 | 64;
  readonly reducedMotion: boolean;
  readonly discontinuity: boolean;
}

export interface GraphicsViewport {
  readonly widthCss: number;
  readonly heightCss: number;
  readonly pixelRatio: number;
}

export interface GraphicsRenderer {
  resize(viewport: GraphicsViewport): void;
  paint(state: Readonly<GameState>, frame: GraphicsFrame): void;
  pick(localXCss: number, localYCss: number): GraphicsTarget | null;
  track(id: number | null): void;
  dispose(): void;

  /**
   * G-07 · La cámara. design.md D.7.
   *
   * Acercarse y moverse no son decisiones del juego: no gastan tiempo, no tocan
   * el estado y no entran en el guardado. Por eso viven en el renderer y no en
   * la API de juego.
   *
   * `zoom` multiplica lo que se ve por `factor` —por debajo de uno acerca—
   * manteniendo bajo el dedo el punto que estaba en `(atX, atY)`, en píxeles CSS
   * locales al lienzo. `pan` arrastra el valle. `resetView` vuelve al encuadre
   * de partida, que es la aldea con su entorno (D.6.3).
   */
  zoom(factor: number, atXCss: number, atYCss: number): void;
  pan(dxCss: number, dyCss: number): void;
  /**
   * Gira la vista alrededor de lo que se está mirando, en radianes.
   *
   * Lo pidió el dueño del diseño al probar la demo: *«solamente tenemos una
   * visión de un plano»*. `dYaw` da la vuelta al valle y `dPitch` levanta o baja
   * la vista, dentro de una banda. No entra en el guardado, no gasta tiempo de
   * juego y no toca el estado, igual que `zoom` y `pan`.
   */
  orbit(dYaw: number, dPitch: number): void;
  resetView(): void;

  /**
   * G-09 · Lo que la escena cuesta ahora mismo. design.md D.9.
   *
   * D.9 exige llamadas de dibujo, triángulos y texturas en el informe de
   * presupuesto, y nadie fuera del renderer puede saberlos: el contexto WebGL es
   * suyo. Leer, nunca escribir; llamarlo no dibuja nada.
   */
  stats(): GraphicsStats;
}

export interface GraphicsStats {
  readonly drawCalls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  readonly programs: number;
  /** Cuántos aldeanos y edificios hay en escena, para poner el resto en contexto. */
  readonly actors: number;
  readonly buildings: number;
}

export interface GraphicsRendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly assetBaseUrl: string;
  readonly quality: 'low' | 'standard';
  /**
   * G-06 · Una biblioteca de recursos ya cargada, si el llamante la trae.
   *
   * Por defecto el renderer carga la suya desde `assetBaseUrl` y la suelta al
   * disponerse. Con esto, el llamante la trae y **el llamante la posee**: el
   * renderer no la suelta, porque no es suya. D.5 pide que los recursos
   * compartidos tengan dueño explícito y éste es el caso en que el dueño está
   * fuera.
   *
   * Existe por dos sitios que no tienen servidor del que pedir: una página
   * publicada de una sola pieza, y una prueba.
   */
  readonly library?: AssetLibrary;
}

/** Lo que el renderer necesita de una biblioteca de recursos. Ver `assets.ts`. */
export interface AssetLibrary {
  get(id: string): { readonly id: string; readonly clips: readonly unknown[] } | undefined;
  instance(id: string): unknown;
  dispose(): void;
}

export declare function createGraphicsRenderer(
  options: GraphicsRendererOptions,
): Promise<GraphicsRenderer>;
