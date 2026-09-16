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

import type { ArchivedGame, GameState, Intent } from '@engine/state';
import type { InspectTarget } from '../inspect';
import type { Speed } from '../speed';

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
  | { kind: 'orders' };

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
  setIntent(intent: Intent): void;
  track(id: number | null): void;
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
  setRoute(route: SheetRoute): void;
  dispose(): void;
}
