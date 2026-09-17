// UI-R1 · Los contratos congelados del rediseño de interfaz.
//
// `docs/ui-redesign/implementation-plan.md` §4 y el prompt de la ronda los dan
// **literales**: este fichero los copia, no los rediseña. `SheetRoute` fija las
// cinco rutas de `docs/design.md` §11.2 (el valle, la crónica, la gente, la
// ficha y las órdenes) — las dos superposiciones, encrucijada y epitafio, no
// están aquí a propósito: no se navega a ellas ni se sale por la barra.
//
// Nadie más define estos tipos: un consumidor que necesite otra ruta reabre
// §11.2 con el coordinador en vez de añadirla en silencio (UI-R0 §8).

import type { ArchivedGame, GameState, MeansId } from '@engine/state';
import type { InspectTarget } from '../inspect';
import type { Speed } from '../speed';
import type { ActorDoing } from '../../render3d/contracts';

/**
 * A dónde puede navegar el jugador. Cinco rutas, ninguna superposición.
 *
 * `inspect` lleva `from` porque la ficha se abre desde dos sitios distintos
 * —el valle (tocar un cuerpo o un edificio) y la lista de gente— y quien la
 * cierra necesita saber a cuál de los dos volver (§2.5 del plan).
 */
export type SheetRoute =
  | { kind: 'valley' }
  | { kind: 'chronicle' }
  | { kind: 'people' }
  | { kind: 'inspect'; target: InspectTarget; from: 'valley' | 'people' }
  // M-2 · **el carro sustituye a la hoja de órdenes.** Las tres palancas se
  // retiran de la interfaz (decisión del dueño del diseño, 17 sep 2026: «no me
  // gustan para nada»), y lo que ocupa su sitio es lo que el jugador puede
  // **dar** al valle. Sigue siendo una ruta y no una superposición: se abre
  // desde el valle y se sale por la barra, como las órdenes.
  | { kind: 'cart' };

/**
 * Lo único que un panel puede pedirle a la aplicación.
 *
 * Un panel **no** abre pantallas por su cuenta ni toca el estado directamente:
 * emite una de estas cuatro acciones y `app.ts` decide qué hacer, que es lo
 * que hace de él el único propietario del estado de navegación (plan §2.2).
 * `track` marca al cuerpo, no centra la cámara — UI-R0 §2 lo comprobó contra
 * `backend.live.track` y el texto de cualquier botón tiene que decir eso.
 */
export interface UiActions {
  navigate(route: SheetRoute): void;
  setSpeed(speed: Speed): void;
  // M-4 · `setIntent` se retira con las órdenes permanentes: un panel ya no
  // escribe sobre las palancas porque no hay palancas. Lo que un panel puede
  // pedir es **dar** (`give`).
  track(id: number | null): void;
  /**
   * VZ-6 · **Qué está haciendo esa persona ahora mismo**, para la línea «Today»
   * de la ficha. `null` cuando no hay a quién preguntar: el lienzo 2D no simula
   * cuerpos, y en 3D alguien puede no tener actor todavía.
   *
   * Es una **lectura**, no una acción, y va aquí porque es el único conducto
   * que un panel tiene hacia el mundo: `UiSnapshot` sólo lleva estado del
   * motor, y esto no está en el estado a propósito —lo que se ve andando es
   * efímero y no se guarda (Anexo E)—.
   */
  doing(id: number): ActorDoing | null;
  /**
   * M-2 · **Dar un medio al valle.** No dice qué hacer con él: lo que la aldea
   * haga lo deciden sus sistemas (`engine/world/means.ts`). El panel no
   * comprueba si se puede —eso lo decide el motor y lo repite para pintarse—,
   * sólo lo pide.
   */
  give(means: MeansId): void;
}

/**
 * Lo que un panel lee para pintarse. De sólo lectura: `update` no escribe en
 * el estado ni consume azar (plan §4). `archive` es lo que hace falta para el
 * selector de valles anteriores de la crónica (§2.4).
 */
export interface UiSnapshot {
  state: Readonly<GameState>;
  archive: readonly ArchivedGame[];
  speed: Speed;
}

/**
 * Un panel montable en la bandeja del `ShellHandle`.
 *
 * `dispose` tiene que ser seguro llamado dos veces (plan §4): al cambiar de
 * ruta, quien compone la bandeja no sabe si el panel ya se había desmontado
 * antes por otra vía.
 */
export interface UiPanel {
  element: HTMLElement;
  update(snapshot: UiSnapshot): void;
  dispose(): void;
}

/** Cómo se construye un `UiPanel`: recibe las acciones, no el estado. */
export type PanelFactory = (actions: UiActions) => UiPanel;

/**
 * La carcasa: un canvas, una bandeja, una navegación. `content` es donde
 * `app.ts` inserta como mucho un `UiPanel` a la vez (plan §4); `setRoute` es
 * la única función que cambia qué ruta está activa — el «único propietario
 * del estado de navegación» que el plan exige.
 */
export interface ShellHandle {
  element: HTMLElement;
  content: HTMLElement;
  /**
   * VZ-02 · **el único sitio desde el que habla el valle.** Un párrafo bajo el
   * ornamento de la bandeja, de altura fija: lo que acaba de pasar, lo que la
   * aldea está haciendo, la pista del inicio y el hito se leen aquí, una frase
   * cada vez y por prioridad (`voice.ts`). Antes había cuatro emisores con tres
   * geometrías, y tres de ellos flotaban sobre el valle.
   */
  voice: HTMLElement;
  /**
   * Donde se escribe la frase. `voice` es la caja que centra y lleva el
   * `data-role`; ésta es el texto, y el `›` de la pista sale de ella para que
   * quede tras la última palabra y no flotando al lado.
   */
  voiceLine: HTMLElement;
  /**
   * VZ-03 · qué hay en el ornamento: la hoja de roble de siempre, o el sello de
   * lacre cuando hay una decisión aplazada. `onTap` sólo se usa con el sello, y
   * es lo que abre el documento; con la hoja el ornamento no se toca.
   */
  setOrnament(kind: 'leaf' | 'seal', onTap?: () => void): void;
  /**
   * M-0 · **Los dos toques de una oferta del camino**, dentro de la voz: se
   * enseñan cuando hay alguien esperando respuesta y `onAnswer` recibe `true`
   * por aceptar y `false` por dejarle ir. Sin pantalla propia, que es lo que el
   * dueño del diseño eligió el 17 sep 2026.
   */
  setOffer(open: boolean, onAnswer?: (accept: boolean) => void): void;
  setRoute(route: SheetRoute): void;
  dispose(): void;
}
