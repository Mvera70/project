// G-01 · Public boundary between the simulation, presentation owner and 3D renderer.

import type { GameState, Role, VillagerId } from '../engine/state';
import type { ClipName } from './clips';
import type { Occupation } from './world/models';

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
  /** Carga profesional visible durante `carry_walk`; no forma parte del guardado. */
  readonly load?: 'bundle' | 'stone' | 'grain' | null;
  /** En qué segundo de su propio clip hay que ponerlo. */
  readonly clipSeconds: number;
  readonly poseSeconds?: number;
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
   * IA-6: está en la riña de la plaza de §7.10, no en una charla. Va aparte de
   * `talking` porque **son cosas distintas en pantalla**: sin esto, dos que se
   * gritan se dibujaban exactamente igual que dos que cotillean, y la fase de
   * la historia visible era invisible.
   */
  readonly arguing: boolean;
  /**
   * V-15: qué está haciendo esta persona, en los términos que le importan a la
   * malla (`world/models.ts`, `Occupation`). Existe porque la figura **no puede
   * elegirse sólo por el oficio**: los oficios del motor son siete y la mayoría
   * de la gente no tiene ninguno, así que un niño, un leñador o un albañil no
   * tenían dónde entrar. `activity` no sirve para esto: distingue andar de
   * trabajar, no labrar de talar.
   */
  readonly occupation: Occupation;
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
   * U-11 · Lo que ha pasado de reloj **real** desde el fotograma anterior, con
   * el mismo tope que `deltaSeconds` pero sin la velocidad ni la pausa: es
   * para lo que no es escena —el vuelo de entrada de la cámara— y que no
   * puede ir dieciséis veces más deprisa a ×16 ni quedarse quieto en pausa.
   */
  readonly realDeltaSeconds: number;
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

  /**
   * VZ-6 · Qué está haciendo esa persona ahora mismo, o `null` si no tiene
   * cuerpo en la escena —no está, o la vida todavía no ha dado su primer paso.
   */
  doing(id: number): ActorDoing | null;

  /**
   * VZ-6 · **Mirar a un punto del mapa**, en celdas.
   *
   * Existe porque §11.5 promete que contestar una decisión enfoca lo que esa
   * decisión cambia, y eso **no estaba pasando en el juego que se publica**:
   * `screens/crossroad.ts` lo hacía escalando el lienzo 2D con un `transform`,
   * y ese lienzo va oculto desde UI-V10 en cuanto el 3D releva. O sea que el
   * enfoque no hacía nada desde entonces, y el recorrido que lo vigilaba no
   * tenía nada que leer: por eso llevaba declarado como fallo.
   *
   * Mueve el centro y no la altura, igual que `track`: acercarse o no es del
   * jugador (§11.2).
   */
  look(x: number, z: number): void;
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
   * U-11 · El vuelo de entrada: la vista se aparta hasta la sierra y baja
   * hasta el encuadre de reposo en `seconds`, con el centro quieto en la
   * aldea. Es cámara, no juego: no toca el estado ni gasta tiempo. Cualquier
   * gesto del jugador lo interrumpe donde esté, porque la vista es suya.
   */
  flyIn(seconds: number): void;

  /**
   * G-09 · Lo que la escena cuesta ahora mismo. design.md D.9.
   *
   * D.9 exige llamadas de dibujo, triángulos y texturas en el informe de
   * presupuesto, y nadie fuera del renderer puede saberlos: el contexto WebGL es
   * suyo. Leer, nunca escribir; llamarlo no dibuja nada.
   */
  stats(): GraphicsStats;
}

/**
 * VZ-6 · Lo que un cuerpo está haciendo **ahora mismo**, para quien lo mire.
 *
 * Es el dato que la línea «Today» de la ficha (prototipo 03) necesitaba y que
 * UI-V4 dejó fuera con razón: derivarla del motor —oficio, estación, órdenes—
 * daba una frase que **podía contradecir al cuerpo** que se ve en el valle. La
 * cura no es adivinar mejor: es preguntar a quien lo sabe. Esto sale de la capa
 * de vida, del mismo actor que se está pintando, así que la ficha no puede
 * decir que acarrea madera mientras el aldeano está parado en la plaza.
 *
 * Dos campos y no el `Actor` entero a propósito: la interfaz no tiene nada que
 * hacer con una posición, un clip ni un ángulo, y un contrato estrecho no se
 * rompe cuando la vida se reescriba.
 */
export interface ActorDoing {
  readonly activity: Activity;
  readonly load: 'bundle' | 'stone' | 'grain' | null;
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
  /** U-11 · a qué altura está la vista, en celdas: es lo que deja medir el vuelo de entrada desde fuera. */
  readonly viewHeight: number;
  /**
   * VZ-6 · **y dónde mira**, en celdas del mapa.
   *
   * Hermano de `viewHeight` y por el mismo motivo escrito allí: es lo que deja
   * medir la cámara desde fuera sin abrir el renderer. La altura sola no
   * bastaba: enfocar una decisión (§11.5) **mueve el centro y no la altura**,
   * así que el recorrido que lo comprobaba miraba el `transform` del lienzo 2D
   * —oculto desde UI-V10— y se quedó sin nada que leer.
   */
  readonly viewCentre: { readonly x: number; readonly z: number };
  /**
   * U-12 · qué fase de la jornada se acaba de pintar, de 0 a 1.
   *
   * Es lo que permite comprobar **desde fuera** que el reloj de la cabecera
   * dice la hora del sol que se ve: sin esto, la coherencia sólo se podía
   * afirmar mirando dos funciones puras y confiando en que el juego las
   * conectaba, que es exactamente cómo se cuelan las regresiones invisibles.
   */
  readonly sunPhase: number;
  /**
   * U-13 · qué cielo hace y cuántos rayos han caído desde que se abrió.
   *
   * El contador sólo sube. Es lo que deja que `app.ts` suene el trueno sin que
   * el renderer sepa que existe el sonido, y lo que permite comprobar una
   * tormenta desde fuera igual que `sunPhase` permite comprobar el reloj.
   */
  readonly sky: string;
  readonly bolts: number;
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
