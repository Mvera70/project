// M-20 · The first running application shell.

// UI-R1 · los tokens y la piel de la carcasa nueva. Importados desde aquí y no
// enlazados a mano en `index.html`: Vite los recoge igual en `npm run dev` y en
// `tools/graphics/bundle-game.ts`, que ya sabe volver `<link>` en `<style>`
// inline para la demo sin red (`inline()` en ese fichero).
import './redesign/tokens.css';
// UI-V0 · el kit de la piel (`plan-piel.md` §2): papeles, placas, versalitas,
// capitular, sello, medallón, botones y navegación. Va **antes** de
// `shell.css` a propósito: el kit define las primitivas y la carcasa las
// compone, así que si las dos tocan lo mismo manda la de la carcasa.
import './redesign/skin.css';
import './redesign/shell.css';
import { SKY, TIME } from '@engine/balance';
import { welcomeDigest } from '@engine/chronicle/digest';
import { renderEntry, renderUiText } from '@engine/chronicle/render';
import { answerFor } from './answer';
import { vitalsOf } from './vitals';
import { CATALOG } from '@engine/crossroads/catalog';
import { offerLine } from './offer-line';
import { foundGame } from '@engine/found';
import { archiveGame, foundSuccessor, serialize, ticksOwed } from '@engine/save';
import { tick, type TickReport } from '@engine/sim';
import type { ArchivedGame, Decision, GameState, Intent, PlayerAct, SaveFile } from '@engine/state';
import { createHud } from './redesign/hud';
import { createInspectPanel } from './redesign/inspect-panel';
import { cartPanel } from './redesign/cart';
import { peoplePanel } from './redesign/people-panel';
import { createShell } from './redesign/shell';
import type { SheetRoute, UiActions, UiPanel, UiSnapshot } from './redesign/contracts';
import { seasonOf, yearOf } from '@engine/time';
import { attachBackend, backendFrom, type BackendHandle } from './backend';
import { persistSave } from './idb';
import { recogniseGesture, type Point } from './gestures';
import { checkpointSavedAtMs, runLethargy } from './lethargy';
import { startLoop, type Loop } from './loop';
import { milestonesAt } from './milestones';
import { doingNow } from './doing';
import { noticeText } from './notice';
import { chroniclePanel, closeChronicle } from './screens/chronicle';
import { closeCrossroad, isDeferred, openCrossroad, openDeferred } from './screens/crossroad';
import { openEpitaph } from './screens/epitaph';
import { isSpeed, type Speed } from './speed';
import { accentFor, ambientFor, createSoundEngine } from './sound';
import { openWelcome } from './welcome';
import {
  SILENT,
  clearOffer, dismissHint,
  expire,
  offerUnlessMuted,
  speaking,
  type Utterance,
  type VoiceRole,
} from './voice';

export interface App {
  setSpeed(speed: Speed): void;
  state(): Readonly<GameState>;
  archive(): readonly ArchivedGame[];
  decide(optionId: string): boolean;
  /**
   * VZ-6 · **Mirar a una celda del mapa**, que es lo que §11.2 promete cuando
   * se contesta una encrucijada: dos segundos sobre lo que esa decisión ha
   * cambiado.
   *
   * Existe porque la pantalla no puede llegar a la cámara de otra forma, y lo
   * que había en su lugar —escalar `#valley` con un `transform`— dejó de hacer
   * nada el día que el 3D relevó al lienzo 2D (UI-V10 lo esconde). El único
   * que sabe mover la cámara es el backend, y el único que lo tiene es `boot`.
   */
  look(x: number, y: number): void;
}

export interface DecisionAttempt {
  accepted: boolean;
  forceTick: boolean;
}

/**
 * The pure core of `App.decide` (v2.60, §2.60): whether the queue accepts the
 * option, and whether accepting it should force an immediate tick. Split from
 * `boot`'s DOM and render loop so the four rules of the decision contract can
 * be checked without booting either — the same way `loop.ts` keeps
 * `advanceAccumulator` pure and leaves `startLoop` as the DOM-bound wrapper.
 *
 * Rule 1: an option is accepted only if a crossroad is pending and nothing is
 * already queued — decided is decided, a second tap cannot replace it.
 * Rules 2–3: accepting forces a tick unless the game is paused; paused, §8.7
 * still lets the decision wait rather than making the player unable to pause.
 */
export function attemptDecision(
  hasPendingCrossroad: boolean,
  alreadyQueued: boolean,
  speed: Speed,
): DecisionAttempt {
  const accepted = hasPendingCrossroad && !alreadyQueued;
  return { accepted, forceTick: accepted && speed !== 0 };
}

export interface Resumption {
  /** Ticks the village owes for the time the tab spent hidden. */
  ticks: number;
  /** Whether coming back deserves the welcome report of §9.2. */
  welcome: boolean;
}

/**
 * What returning from a hidden tab owes (§13.2, v2.84).
 *
 * The lethargy used to run in one place only — `boot` — so it only ever
 * happened when the page was reloaded. A phone that merely locks its screen
 * keeps the page alive, and then §13.2's promise was false: the valley did not
 * keep going, it froze and said nothing about it. Measured on a real Android
 * session: fourteen minutes of wall clock produced seven years instead of the
 * eighteen the speed called for.
 *
 * Paused is still paused. The player who stops the clock and switches apps
 * gets it stopped when they come back, the same way §2.60 lets a decision wait.
 *
 * The welcome report needs an absence worth reporting: below a whole season
 * the digest would have almost nothing to say, and a modal over every glance
 * at another app is worse than the silence it replaces. The threshold is the
 * season itself, not a number chosen for the occasion.
 */
export function resumeAfterHidden(hiddenMs: number, speed: Speed): Resumption {
  if (speed === 0) return { ticks: 0, welcome: false };
  // **A la velocidad que el jugador dejó puesta** (v3.72). `ticksOwed` cuenta a
  // ×1, que es lo correcto para un arranque en frío —el guardado no lleva la
  // velocidad—, pero una pestaña que se oculta sí sabe a qué iba: dejarla en
  // ×16 y cambiar de aplicación catorce minutos devolvía una semana en vez de
  // dieciséis. Con la semana en catorce minutos eso deja de ser una pérdida
  // discutible y pasa a ser el reloj mintiendo, que es justo lo que v3.72
  // vino a arreglar. El tope de una generación sigue mordiendo dentro.
  const ticks = ticksOwed(hiddenMs, speed);
  return { ticks, welcome: ticks >= TIME.WEEKS_PER_SEASON };
}

export function roman(value: number): string {
  const numerals: readonly [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let left = Math.max(1, Math.floor(value));
  let result = '';
  for (const [amount, glyph] of numerals) {
    while (left >= amount) { result += glyph; left -= amount; }
  }
  return result;
}

// UI-R2 · `seasonLabel` se mudó a `redesign/hud.ts`, que es quien pinta la
// fecha ahora; se reexporta aquí para no mover el punto de entrada que ya usa
// `screens/chronicle.ts` (`roman`, que sí se queda en este fichero) y
// `tests/fast/ui.test.ts` (`seasonLabel`, importado de `@ui/app`).
export { seasonLabel } from './redesign/hud';

/** Keep archive identity unambiguous even if the random draw repeats. */
export function nextUnusedSeed(drawn: number, excluded: ReadonlySet<number>): number {
  let candidate = drawn >>> 0;
  while (excluded.has(candidate)) candidate = (candidate + 1) >>> 0;
  return candidate;
}

function freshSeed(excluding: ReadonlySet<number> = new Set()): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return nextUnusedSeed(value[0] as number, excluding);
}

/**
 * Cuanto se aleja el valle por cada muesca de rueda.
 *
 * TUNE: 1,18. Cinco muescas doblan lo que se ve, que es lo que se espera de una
 * rueda; con 1,5 una sola muesca saltaba del pueblo al valle entero.
 */
const WHEEL_STEP = 1.18;

export function boot(root: HTMLElement, save?: SaveFile): App {
  let state = save?.state ?? foundGame(freshSeed());
  const archive: ArchivedGame[] = save !== undefined ? [...save.archive] : [];
  let speed: Speed = 1;
  let lastFraction = 0;
  root.replaceChildren();
  root.className = 'valley-app';

  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  canvas.setAttribute('aria-label', renderUiText('app.valley'));

  // VZ-02 · la pista del inicio guiado (U-11) ya no tiene elemento propio: es
  // una voz más, con papel `hint`, y se lee en el hueco de la bandeja como las
  // otras tres. `advanceHint` lo rellena el bloque del inicio guiado, más
  // abajo, y es lo que el toque sobre el hueco llama cuando la pista es lo que
  // se está leyendo.
  let advanceHint: (() => void) | null = null;

  /**
   * **UI-R1 · la carcasa, y el único propietario del estado de navegación.**
   *
   * Antes de UI-R1 la pestaña encendida se decidía en tres sitios que no se
   * conocían entre sí —`showing()`, cada manejador de clic de la barra, y
   * `showPanel` llamando a `showing('valley')` para arreglar S-05— y una
   * cuarta ruta (las órdenes) no pasaba por ninguno: `orders.hidden` se
   * alternaba a mano sin tocar la barra. `docs/ui-redesign/redesign/
   * contracts.ts` da la forma; `createShell` la construye una vez.
   *
   * `actions.navigate` es el único camino: cierra lo que hubiera y abre lo
   * que toque. Se declara con `let`/`function` —y no con los `const` de
   * `hud`/`orders`/`shell`, que lo necesitan— porque la elevación de
   * `function` es lo que rompe el huevo y la gallina: `actions` necesita
   * `shell.setRoute`, y `createShell`/`createHud`/`ordersPanel` necesitan
   * `actions`. Ídem para `notices`/`persist` dentro de `setIntent`: se
   * declaran más abajo, pero para cuando alguien pulsa una orden ya existen
   * — el cuerpo de una función no se ejecuta hasta que se llama.
   */
  let currentRoute: SheetRoute = { kind: 'valley' };
  // UI-R4 · la ficha es el único panel que se crea de nuevo en cada
  // navegación (lleva un `target` distinto cada vez, a diferencia de
  // `orders`/`people`, que son la misma instancia siempre) — `mountedInspect`
  // es la referencia a la que hay que avisar antes de sustituirla, para que
  // `dispose()` cancele el seguimiento que ella misma pudiera haber empezado
  // (§2.5: «cerrar la ficha termina el seguimiento iniciado desde ella»).
  let mountedInspect: UiPanel | null = null;
  function navigate(route: SheetRoute): void {
    currentRoute = route;
    // S-05, U-14 · crónica, gente, ficha y órdenes no coexisten: la ruta que
    // llega cierra a las demás antes de abrirse, y siempre a través de este
    // único punto — nunca dentro de un manejador suelto.
    closeChronicle();
    mountedInspect?.dispose();
    mountedInspect = null;
    // UI-R2/UI-R4 · la hoja de órdenes, la lista de gente y la ficha viven de
    // verdad en `shell.content` desde estas rondas (antes de UI-R2 la hoja de
    // órdenes era un `<section>` suelto anclado a `bottom: 0`, por debajo de
    // la barra — el defecto §3.5 del informe de UI-R1, con «Build first»
    // cortado tras la navegación nueva; antes de UI-R4 la gente y la ficha
    // vivían cada una en su propio velo o panel suelto). Vaciar la bandeja en
    // cada navegación es lo que impide que se quede pegada al abrir otra cosa
    // justo después.
    shell.content.replaceChildren();
    shell.setRoute(route);
    if (route.kind === 'chronicle') {
      // UI-R3/UI-R5 · migrada de verdad a `shell.content`. Hasta UI-R5,
      // `contentRouteFor` (`redesign/shell.ts`) sólo conocía `orders`/
      // `inspect` y esta rama tenía que destapar `.ui-shell-content` a mano
      // (leyendo el DOM por su clase estable, igual que la ranura del
      // mensaje) porque `shell.ts` estaba fuera de su alcance. UI-R5 extendió
      // `contentRouteFor` para que también sepa de `chronicle`/`people`, así
      // que `shell.setRoute` de arriba ya ha dejado la bandeja visible: no
      // hace falta ningún rodeo. Visualmente no cambia nada: la crónica sigue
      // siendo `position: fixed; inset: 0` con su mismo z-index de siempre
      // (13), así que cubre la pantalla entera y la barra de navegación
      // (z-index 14) se sigue viendo encima, como pide U-14. Ver el
      // comentario de cabecera de `chroniclePanel` en `screens/chronicle.ts`.
      shell.content.append(chronicle.element);
      chronicle.update(snapshot());
    } else if (route.kind === 'people') {
      // U-08/UI-R4/UI-R5 · la lista de los nombrados presentes; tocar uno
      // abre su ficha por la misma ruta `inspect` que el valle (`redesign/
      // people-panel.ts`). Igual que la crónica de arriba: desde UI-R5
      // `contentRouteFor` ya conoce esta ruta y `shell.setRoute` deja la
      // bandeja visible por su cuenta — el rodeo de UI-R4 (`sheetContent.
      // hidden = false`) ya no hace falta.
      shell.content.append(people.element);
      people.update(snapshot());
    } else if (route.kind === 'inspect') {
      const inspect = createInspectPanel(actions, route.target, route.from);
      mountedInspect = inspect;
      shell.content.append(inspect.element);
      inspect.update(snapshot());
    } else if (route.kind === 'cart') {
      // M-2 · `shell.content` ya ha quedado vacía arriba: es seguro montar aquí.
      shell.content.append(cart.element);
      cart.update(snapshot());
    }
  }
  /** Lo que cualquier `UiPanel` necesita para pintarse (`contracts.ts`). */
  const snapshot = (): UiSnapshot => ({ state, archive, speed });
  /**
   * A quién sigue la cámara, o `null`. Se declara **antes** de `actions`, que
   * es quien la escribe: una `let` leída desde una función definida más arriba
   * y llamada en el arranque cae en la zona muerta temporal, y eso ya costó una
   * ronda («Cannot access before initialization», VZ-02).
   */
  let trackedId: number | null = null;

  const actions: UiActions = {
    navigate,
    // VZ-6 · la lectura que la línea «Today» de la ficha necesitaba: lo que
    // hace ese cuerpo **en el fotograma que se está viendo**, preguntado a la
    // capa de vida y no adivinado del motor.
    doing(id: number) { return backend.live.doing(id); },
    /**
     * M-2 · **dar un medio.** Va por el mismo canal que contestar una oferta y
     * por el mismo motivo: lo que el jugador hace entra por `tick` y queda en
     * el registro del estado, así que la partida se puede reproducir. Y se
     * aplica ahora, no en catorce minutos: dar algo y no ver nada es lo que
     * hacía que las palancas no se entendieran.
     */
    give(means): void {
      pendingActs.push({ kind: 'means', means });
      if (speed !== 0) { runTick(); paint(lastFraction); }
    },
    setSpeed(value): void { app.setSpeed(value); },
    // UI-R2 · la única escritura que un panel puede hacer sobre las órdenes
    // (`contracts.ts`), y desde esta ronda el único sitio donde se aplica la
    // respuesta de §11.6: antes vivía repetida en el manejador de clic de
    // cada palanca (`orderRow`, que vivía en este fichero); ahora está una vez,
    // en el punto que de verdad decide qué pasa cuando cambia una orden —
    // `orders.ts` sólo emite la intención nueva.
    setIntent(intent: Intent): void {
      state.intent = intent;
      // E4 · **y la aldea contesta.** Si la orden no se puede cumplir, se dice
      // ahora y una sola vez: un roce repetido cada semana deja de ser una
      // respuesta y se convierte en una regañina.
      const said = answerFor(state);
      if (said !== null) say('event', renderUiText(said.key, said.params));
      // Y se guarda, porque es una decisión del jugador: al volver dos días
      // después la aldea tiene que seguir haciendo lo que se le dijo.
      persist();
    },
    /**
     * VZ-4 · **seguir es seguir, no centrar una vez.**
     *
     * `renderer.track` mira a quien se le dice y vuelve; llamándolo una sola
     * vez al pulsar «Follow», la cámara centraba a la persona y ésta se iba
     * andando del encuadre. El dueño del diseño lo pidió claro: «lo de la
     * silueta del aldeano que se resalte y que lo siga, lo quiero». Lo que
     * falta —el resalte de la silueta— vive en `renderer.ts`, que la otra
     * sesión tiene abierto ahora mismo; queda anotado en el cuaderno.
     *
     * Aquí se guarda a quién sigue y `paint` lo repite en cada fotograma, que
     * es lo que hace que la cámara vaya detrás. Se guarda en esta capa y no en
     * la ficha a propósito: la ficha se desmonta al cambiar de ruta y el
     * seguimiento no tiene por qué morir con ella.
     */
    track(id): void {
      trackedId = id;
      renderer.track(id);
    },
  };
  // UI-R2/UI-R4 · `hud.ts` cría la hora, la fecha, la tira, la frase de estado
  // y el resumen/acceso a las órdenes; `orders.ts` la hoja de las tres
  // palancas y `people-panel.ts` la lista de la gente, las dos migradas a
  // `shell.content` (ver el comentario de `navigate`, arriba). Ninguno de los
  // tres conoce `state` por sí mismo: `hud.paint`/`orders.update`/`people.
  // update` lo reciben en cada llamada, nunca lo capturan por su cuenta. La
  // ficha (`inspect-panel.ts`) es la excepción: se crea de nuevo por cada
  // navegación porque lleva un `target` distinto cada vez (ver `navigate`).
  const hud = createHud(actions, () => currentRoute);
  const cart = cartPanel(actions);
  // UI-R3/UI-R4 · la crónica y la lista de la gente, migradas a
  // `shell.content` (ver el comentario de `navigate`, arriba). Igual que
  // `orders`: se crean una vez y su `element` se monta/desmonta de la
  // bandeja en cada navegación.
  const chronicle = chroniclePanel(actions);
  const people = peoplePanel(actions);
  const shell = createShell(actions);

  // U-09 · el sonido: sintetizado con Web Audio, nunca un fichero (§ ficha del
  // encargo, CLAUDE.md). No suena nada hasta el primer toque (más abajo,
  // junto a los demás gestos) ni si quien juega lo apaga, aquí, junto a la
  // regleta de velocidad — el mismo sitio y la misma piel que ella.
  const sound = createSoundEngine();
  const soundToggle = document.createElement('button');
  soundToggle.type = 'button';
  soundToggle.className = 'valley-sound';
  // Dibujado y no escrito: dos trazos de más para la fuente que le toque al
  // teléfono no son una opción a este tamaño. Las dos versiones —sonando y en
  // silencio— están las dos en el DOM; el CSS enseña una u otra según
  // `aria-pressed`, nunca cambia el texto.
  soundToggle.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false"'
    + ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M3 6.3v3.4h2.3L8.6 12.2V3.8L5.3 6.3z"/>'
    + '<path class="valley-sound-on" d="M10.7 5.3c1 .9 1 4.5 0 5.4"/>'
    + '<path class="valley-sound-on" d="M12.5 3.6c2 1.8 2 6.9 0 8.7"/>'
    + '<path class="valley-sound-off" d="M10.8 5.6 14.2 10.4M14.2 5.6 10.8 10.4"/>'
    + '</svg>';
  const updateSoundToggle = (): void => {
    soundToggle.setAttribute('aria-pressed', String(sound.enabled));
    soundToggle.setAttribute('aria-label', renderUiText(sound.enabled ? 'app.sound.on' : 'app.sound.off'));
  };
  soundToggle.addEventListener('click', () => { sound.setEnabled(!sound.enabled); updateSoundToggle(); });
  updateSoundToggle();

  const hudRight = document.createElement('div');
  // UI-V2b · la segunda clase es la que sube el rincón por encima de la
  // bandeja (`skin.css`): la regla de `index.html` lo dejaba a 60 px del
  // borde, que era la altura de la barra estrecha de antes del rediseño, y
  // con la bandeja nueva los dos círculos caían dentro de ella.
  hudRight.className = 'valley-hud-right hud-speed-corner';
  hudRight.append(soundToggle, hud.speedControls, hud.speedBadge);

  root.append(canvas, hud.header, hudRight, shell.element);

  /**
   * **UI-R1 · la pila del mensaje, y el fallo concreto que esta ronda tiene
   * que dejar imposible.**
   *
   * El aviso de §11.6 (`notice.ts`) y la pista del inicio guiado (más abajo)
   * vivían sueltos, cada uno con su propio `bottom` fijo en `index.html`
   * (82px la pista, 118px el aviso): en cuanto la pista crecía a dos líneas
   * se pisaban, fotografiado en `docs/life-rounds/evidencia-capturas.md` §3.
   * Ninguno sabía del otro.
   *
   * Ahora los dos se montan dentro de la misma ranura de la carcasa
   * (`.ui-shell-message`, `shell.css`) y `resolveMessageSlot` —pura, sin DOM—
   * decide cuál se ve: el aviso cuenta algo que **acaba de pasar** y gana
   * siempre; la pista cede **sin marcarse como vista** y vuelve sola en
   * cuanto el aviso se retira (visual-reference §5, tabla de coincidencias).
   * No hace falta tocar `notice.ts`: `mountNotices` acepta cualquier
   * contenedor, y el `MutationObserver` de abajo mira el único atributo que
   * ese módulo cambia (`hidden`) para saber cuándo el aviso se apaga solo.
   */
  const messageSlot = shell.element.querySelector<HTMLElement>('.ui-shell-message');
  if (messageSlot === null) throw new Error('UI-R1 · la carcasa no trae ranura de mensaje');
  // UI-R5 · el rodeo que UI-R4 necesitaba aquí (leer `.ui-shell-content` a
  // mano para destapar la bandeja de 'people') se retiró: `contentRouteFor`
  // ya sabe de esa ruta (ver `navigate`, arriba, y `redesign/shell.ts`).
  //
  // UI-V2b · la línea de órdenes va en la bandeja, bajo la voz: `hud.ts`
  // escribe su propio DOM y no conoce la carcasa, y esta capa sabe de las dos.
  messageSlot.append(hud.say);

  /**
   * VZ-02 · **el valle habla por un solo sitio, y la cola decide qué dice.**
   *
   * Lo que había aquí hasta esta ronda: el aviso de `notice.ts` con su banda y
   * su temporizador, la pista del inicio guiado con el suyo,
   * `resolveMessageSlot` arbitrando entre esos dos, un `MutationObserver`
   * espiando el atributo `hidden` del aviso para saber cuándo la pista podía
   * volver, y la cartela de hito flotando aparte con un tercer temporizador.
   * Cuatro emisores, tres relojes y dos arbitrajes que no se conocían entre sí.
   *
   * Ahora hay un estado (`voice.ts`, puro) y dos funciones: `say` ofrece,
   * `paint` lee. La prioridad —hito, suceso, pista, estado— y las caducidades
   * están en un módulo que una prueba recorre sin DOM, y el observador de
   * mutaciones sobra: nadie tiene que espiar a nadie porque ya no hay dos
   * dueños del mismo hueco.
   */
  let voice = SILENT;
  /**
   * Si estamos recuperando una ausencia (§13.2). Vive aquí arriba y no junto al
   * letargo porque `say` la lee, y `say` se llama ya en el arranque —la frase de
   * la fundación es un hito— así que declararla más abajo la dejaba en la zona
   * muerta temporal: el juego arrancaba con «Cannot access before
   * initialization» y el hueco de la voz se quedaba vacío. Lo cazó la primera
   * captura de esta ronda, que es para lo que están.
   */
  let catchingUp = false;
  const say = (role: VoiceRole, text: string | null): void => {
    if (text === null || text === '') return;
    const utterance: Utterance = { role, text, saidAtMs: Date.now() };
    // Durante un letargo el valle no cuenta lo que pasa (§11.6): esa ausencia
    // la cuenta el parte de bienvenida de §9.2.
    voice = offerUnlessMuted(voice, utterance, catchingUp);
  };

  /**
   * La pista del inicio guiado se toca en el propio hueco de la voz.
   *
   * Era un `<button>` propio; ahora el hueco es un párrafo y el toque sólo
   * cuenta cuando lo que se está leyendo **es** la pista, que es lo que
   * `data-role` dice. Así el mismo elemento sirve para las cuatro voces sin
   * que ninguna herede la afordancia de otra.
   */
  shell.voice.addEventListener('click', () => {
    if (shell.voice.dataset.role !== 'hint') return;
    voice = dismissHint(voice);
    advanceHint?.();
  });

  // Desde qué tick se buscan hitos. Arranca donde arranca la partida, así que
  // una partida cargada no vuelve a celebrar lo que ya celebró.
  let lastMilestoneTick = state.tick;

  // U-04 · Lo primero que ve quien empieza, y lo único que el juego dice sin
  // que se lo pidan. **No es un tutorial**: es la misma cartela de los hitos
  // con la frase de la fundación, y debajo, en la pantalla, están ya las cuatro
  // cifras de §11.1.1 y el valle andando. Quien lea la línea sabe dónde está,
  // en qué año, y cuántos son; lo demás lo enseña la primera encrucijada, que
  // es el juego enseñándose a sí mismo en vez de explicándose.
  //
  // Sólo en una partida nueva de verdad: no al recargar una partida andada, ni
  // al heredar, que arranca con el tick corrido. Desde U-10 el menú de inicio
  // entrega la partida nueva **como un guardado** (tick 0, sin decisiones), así
  // que lo que la distingue es eso y no que falte `save`. El vuelo de entrada
  // (U-11) lo lee más abajo.
  const fresh = state.tick === 0 && state.history.length === 0;
  if (fresh) {
    // VZ-02 · la frase de apertura es un **hito**: se dice una vez por partida
    // y la hoja de roble se pone en oro mientras se lee. Antes era una cartela
    // de pergamino flotando sobre el valle con sus motas de latón, que es la
    // pieza que el dueño del diseño juzgó «una chapuza» al verla en la tablet.
    // La etiqueta `founding.label` se retira: el papel de la voz ya dice que
    // esto es un hito, y un rótulo encima era decir dos veces lo mismo.
    say('milestone', renderEntry(
      {
        tick: 0,
        kind: 'season',
        templateKey: 'founding.settled',
        params: { people: vitalsOf(state).people, year: yearOf(state.tick), season: seasonOf(state.tick) },
        weight: 3,
      },
      state.rng,
    ));
    // E5 · y qué valle es éste, que es lo que hace que un rasgo sea una historia
    // y no un modificador oculto: el jugador tiene que saber dónde está para que
    // su postura sea una decisión y no una apuesta. Va en el aviso y no en la
    // cartela porque es una frase de paso, no el titular de la partida.
    // El aviso tiene **una sola voz**, así que se dice el primero y el otro se
    // lee en la crónica, donde los dos están desde la fundación. Mostrar los dos
    // seguidos sólo enseñaría el segundo: el aviso no tiene cola.
    const [first] = state.traits;
    if (first !== undefined) {
      say('event', renderEntry(
        { tick: 0, kind: 'founding', templateKey: `valley.${first}`, params: {}, weight: 2 },
        state.rng,
      ));
    }
  }

  /**
   * Qué render está pintando, dicho en voz alta.
   *
   * `attachBackend` ofrecía `onSwap` desde G-07 y nadie lo enganchaba, así que
   * **no había forma de saber qué render estaba vivo**: ni desde una prueba, ni
   * mirando la página en un teléfono. Y el relevo falla en silencio a
   * propósito —si WebGL no va, el valle sigue en 2D en vez de quedarse en un
   * error—, que es la combinación que hace falta para que un fallo dure
   * semanas. Lo destapó la auditoría: los recorridos de navegador comprobaban
   * el lienzo 2D y pasaban en 730 ms porque el navegador no tenía WebGL, así
   * que la reja llevaba desde G-12 midiendo un juego que ya no se publica.
   *
   * Mismo patrón de observación que `data-app-ready` y `data-tick`: un atributo
   * en la raíz, que no cambia nada de lo que se pinta.
   */
  const stampRender = (handle: BackendHandle): void => {
    document.documentElement.dataset.render = handle.live.kind;
    if (handle.failure !== null) document.documentElement.dataset.renderFailure = handle.failure;
  };

  // G-07 · Canvas pinta desde el primer fotograma, siempre. El 3D —que desde
  // G-12 es el juego— se carga por detrás y releva cuando esté; si falla, el
  // valle sigue en 2D en vez de quedarse en un error.
  /**
   * U-11 · El inicio guiado. Al fundar un valle la vista baja desde la sierra
   * hasta la aldea (`flyIn`), que es lo que el dueño pidió: «la aldea al
   * principio debe verse desde lo alto, así impresiona más ver lo grande que
   * es el mapa». El 3D llega asincrónico, así que el vuelo se pide en cuanto
   * hay un render que sepa volar, y una sola vez. Quien pide menos movimiento
   * no vuela: aterriza directamente.
   */
  let flightWanted = fresh && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Y la pista se programa dos veces si hace falta: al arrancar, por si nunca
  // llega un render que vuele (el 2D, o WebGL caído), y otra vez cuando el
  // vuelo arranca de verdad, que es asincrónico y puede llegar segundos
  // después. La segunda sustituye a la primera.
  let hintTimer: number | null = null;
  let scheduleHint: ((afterMs: number) => void) | null = null;
  const flyIfWanted = (handle: BackendHandle): void => {
    if (!flightWanted || !handle.live.movesCamera) return;
    flightWanted = false;
    handle.live.flyIn(TIME.INTRO_FLIGHT_MS / 1000);
    document.documentElement.dataset.intro = 'flight';
    scheduleHint?.(TIME.INTRO_FLIGHT_MS + TIME.INTRO_HINT_AFTER_MS);
  };
  const backend = attachBackend(canvas, root, {
    kind: backendFrom(location.search, localStorage.getItem('valley.render')),
    onSwap: (handle) => { stampRender(handle); flyIfWanted(handle); },
  });
  stampRender(backend);
  flyIfWanted(backend);
  // Y las dos pistas —dónde están las órdenes, dónde el tiempo—, la primera
  // vez que se funda un valle en este navegador y después del vuelo. Se tocan
  // para pasar; no hay más que eso, porque el juego se enseña solo (U-04).
  const GUIDED_KEY = 'valley.guided';
  let guided = true;
  try { guided = localStorage.getItem(GUIDED_KEY) === 'done'; } catch { /* sin almacenamiento: se enseña igual */ }
  if (fresh && !guided) {
    const steps = ['intro.orders', 'intro.time'];
    let at = 0;
    const showStep = (): void => {
      if (at >= steps.length) {
        document.documentElement.dataset.intro = 'done';
        try { localStorage.setItem(GUIDED_KEY, 'done'); } catch { /* idem */ }
        return;
      }
      // VZ-02 · la pista es una voz con papel `hint`: pegajosa hasta que se
      // toca, y si un suceso o un hito coinciden con ella, la cola los lee
      // primero y la pista **vuelve sola sin marcarse vista** (esa era la regla
      // de UI-R1 y sigue siendo la misma, ahora dentro de `voice.ts`).
      say('hint', renderUiText(steps[at] as string));
      document.documentElement.dataset.intro = 'hints';
    };
    // Tocar el hueco mientras se lee la pista avanza al paso siguiente: el
    // manejador del hueco llama a esto (ver `shell.voice` arriba).
    advanceHint = (): void => { at += 1; showStep(); };
    scheduleHint = (afterMs: number): void => {
      if (hintTimer !== null) window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(showStep, afterMs);
    };
    scheduleHint((flightWanted ? TIME.INTRO_FLIGHT_MS : 0) + TIME.INTRO_HINT_AFTER_MS);
  }
  const renderer = { paint: (s2: GameState, f: number): void => backend.live.paint(s2, f, speed),
    track: (id: number | null): void => { backend.live.track(id); } };
  let lastBolts = 0;
  // Lo último que se ofreció como fondo, para no ofrecer lo mismo cada fotograma.
  let spokenState: string | null = null;
  /** M-0 · el `postedTick` de la oferta que ya está dicha, para no repetirla. */
  let spokenOffer: number | null = null;
  const paint = (fraction: number): void => {
    lastFraction = fraction;
    // U-11 · la altura de la vista, en la raíz, como `data-tick`: es lo único
    // que permite mirar el vuelo de entrada desde una secuencia de capturas o
    // desde un recorrido, sin abrir el renderer.
    const stats = backend.live.stats();
    if (stats !== null) {
      document.documentElement.dataset.viewHeight = stats.viewHeight.toFixed(1);
      // VZ-6 · y dónde mira, que es lo que cambia al enfocar una decisión: la
      // altura no se mueve, el centro sí.
      document.documentElement.dataset.viewCentre =
        `${stats.viewCentre.x.toFixed(1)},${stats.viewCentre.z.toFixed(1)}`;
      // U-12 · y en qué punto de la jornada va el sol, para poder comprobar
      // desde fuera que la hora de abajo es la que se ve por la ventana.
      document.documentElement.dataset.sunPhase = stats.sunPhase.toFixed(4);
      // U-13 · qué cielo hace y cuántos rayos han caído, por lo mismo.
      document.documentElement.dataset.sky = stats.sky;
      document.documentElement.dataset.bolts = String(stats.bolts);
      // **Y el trueno.** El renderer no sabe que existe el sonido —ni tiene por
      // qué—, así que lo que hace es contar los rayos; aquí se mira cuánto ha
      // subido la cuenta y se truena. Con retardo, porque el sonido va más
      // despacio que la luz y ese retardo es lo que hace que una tormenta se
      // sienta lejos o encima. Cuánto exactamente lo decide `Math.random`, y
      // es legítimo por lo mismo que en `sound.ts`: es decorado del navegador,
      // no una tirada de la partida (§4.3).
      if (stats.bolts > lastBolts) {
        lastBolts = stats.bolts;
        const [near, far] = SKY.THUNDER_DELAY;
        const delay = (near + Math.random() * (far - near)) * 1000;
        window.setTimeout(() => sound.accent('thunder', Date.now()), delay);
      }
    }
    // UI-R2 · hora, fecha, tira, tendencias, actividad y resumen de órdenes:
    // todo lo que antes eran quince líneas sueltas por fotograma es ahora una
    // sola llamada, pura respecto al DOM que no le pertenece (`hud.ts`).
    hud.paint(state, fraction);
    // Y si la hoja de órdenes está abierta, que sus botones sigan lo que diga
    // el estado: el único escritor es `actions.setIntent`, así que en la
    // práctica de hoy esto nunca discrepa de lo que ya pintó `navigate` al
    // entrar — pero un panel no debe fiarse de que nadie más vaya a tocar el
    // estado mientras está montado.
    if (currentRoute.kind === 'cart') cart.update(snapshot());
    // UI-R3 · la crónica lee entradas nuevas mientras está abierta —a
    // diferencia de la vieja `openChronicle`, que pintaba una vez y no volvía
    // a mirar el estado—; `chroniclePanel.update` decide sola cuándo de
    // verdad hace falta tocar el DOM (ver su comentario en `screens/
    // chronicle.ts`), así que llamarla en cada fotograma no reconstruye nada
    // de más.
    else if (currentRoute.kind === 'chronicle') chronicle.update(snapshot());
    else if (currentRoute.kind === 'people') people.update(snapshot());
    // UI-R4, AC-11 · una ficha abierta tiene que enterarse de que quien mira
    // acaba de morir o marcharse **sin que nadie navegue**: el motor tira
    // cada semana con el reloj corriendo, no sólo cuando se abre la ruta. Sin
    // este refresco por fotograma la ficha se habría quedado congelada en el
    // último `panelFor` calculado al entrar, y un seguimiento activo nunca se
    // habría cancelado solo.
    else if (currentRoute.kind === 'inspect') mountedInspect?.update(snapshot());
    // The same kind of observability hook as `data-app-ready` (M-19): the year
    // on screen is rounded to twelve weeks, and a test about the clock needs
    // the week.
    document.documentElement.dataset.tick = String(state.tick);
    // U-09 · el ambiente sigue el estado, no los sucesos: se recalcula cada
    // pintado y `SoundEngine.update` es quien decide si de verdad cambia algo
    // (no suena hasta el primer toque, §11's silencio por defecto).
    sound.update(ambientFor(state));
    // UI-R1 · qué destino está abierto ahora mismo ya lo sabe `shell` en un
    // único sitio (`actions.navigate`): antes de esta ronda había que releer
    // el DOM de la crónica en cada fotograma porque ese adaptador no avisaba
    // a la barra por su cuenta (`screens/chronicle.ts` no se toca).
    /**
     * VZ-02 · **la voz se lee aquí, y esto sustituye a tres temporizadores.**
     *
     * `expire` retira lo transitorio comparando contra `saidAtMs`, así que un
     * salto del reloj del juego —o una pestaña que vuelve de estar oculta— no
     * deja nada a medias: la frase está o no está, que es lo que §11.4 pide.
     * Un `setTimeout` sí se queda a medias, y había tres.
     *
     * El fondo (`doing.ts`) se ofrece sólo cuando cambia de texto, y el DOM se
     * escribe sólo cuando cambia lo que se lee: esto corre a 60 fps.
     */
    const doing = doingNow(state);
    const doingText = doing === null ? null : renderUiText(doing.key, doing.params);
    if (doingText !== null && doingText !== spokenState) say('state', doingText);
    spokenState = doingText;
    // M-0 · **quien espera en el camino habla por la misma boca.** La oferta no
    // caduca con el reloj de pared —vive las dos semanas del valle que el motor
    // le da—, así que se ofrece mientras esté en el estado y se retira cuando el
    // motor la quita: aceptada, dejada pasar o ida. Un suceso la tapa sus cinco
    // segundos y vuelve sola (`voice.ts`).
    const waiting = state.offer;
    if (waiting === null) {
      if (spokenOffer !== null) { voice = clearOffer(voice); spokenOffer = null; }
    } else if (spokenOffer !== waiting.postedTick) {
      say('offer', offerLine(waiting));
      spokenOffer = waiting.postedTick;
    }
    const nowMs = Date.now();
    voice = expire(voice, nowMs);
    const now = speaking(voice, nowMs);
    const text = now?.text ?? '';
    if (text !== shell.voiceLine.textContent) shell.voiceLine.textContent = text;
    // `data-role` es lo que la hoja de estilo lee para el acento del hito (la
    // hoja de roble en oro) y lo que el manejador del toque mira para saber si
    // lo que se está leyendo es la pista. Nadie toca una clase desde aquí.
    shell.voice.dataset.role = now?.role ?? '';
    // Los dos toques sólo cuando lo que se lee **es** la oferta: si un suceso la
    // está tapando, contestar a ciegas sería contestar a otra cosa.
    shell.setOffer(now?.role === 'offer', (accept) => {
      pendingActs.push({ kind: 'offer', accept });
      // Como una decisión (§2.60, regla 2): se contesta ahora, no en catorce
      // minutos. En pausa se queda en la cola, que es lo que §8.7 hace con una
      // decisión tomada con el reloj parado.
      if (speed !== 0) { runTick(); paint(lastFraction); }
    });
    // VZ-4 · la cámara va detrás de quien se sigue, fotograma a fotograma.
    if (trackedId !== null) renderer.track(trackedId);
    renderer.paint(state, fraction);
    // §11.2's third screen opens itself the moment there is something to
    // answer — including the very first paint, for a save or a debug
    // fast-forward that already lands on a posed crossroad. `openCrossroad`
    // is its own no-op once this one is already on screen.
    //
    // UI-R5 · **y la encrucijada tiene que ganar a una bandeja que ya
    // estuviera abierta**, no sólo a la que se abra después. `.crossroad-
    // scrim` (`screens/crossroad.ts`, z-index 10) y `.ui-shell-content`
    // (`redesign/shell.css`, z-index 13) compiten en el mismo contexto de
    // apilamiento (el de `document.body`, a propósito: ver el comentario de
    // `shell.css` sobre `.ui-shell` sin `z-index` propio) — así que una
    // bandeja abierta **antes** de que la decisión madure se queda encima,
    // tapándola casi entera, y `.crossroad-open .valley-orders {visibility:
    // hidden}` (crossroad.ts) sólo vacía el contenido de las órdenes, nunca
    // la caja de `.ui-shell-content` en sí ni las otras tres rutas. Medido
    // con un recorrido real (`docs/ui-redesign/rounds/UI-R5.md`): People
    // abierta desde antes de la primera encrucijada dejaba sólo un borde del
    // texto asomando por debajo del panel, opciones y precio incluidos.
    // Volver al valle es lo mismo que ya hace deslizar hacia abajo para
    // aplazarla (S-05, U-14): la decisión se queda pendiente, no se pierde.
    if (state.crossroad !== null && state.ended === null) {
      const pending = state.crossroad;
      // VZ-03 · si el jugador la aplazó, **la marca es el sello del ornamento**
      // y no se le vuelve a plantear hasta que lo toque (§8.6: espera, no
      // caduca). Antes esto era una píldora `position: fixed`, la tercera pieza
      // que flotaba sobre el valle.
      if (isDeferred(pending)) {
        shell.setOrnament('seal', () => { openDeferred(app, pending); });
      } else {
        shell.setOrnament('leaf');
        if (currentRoute.kind !== 'valley') navigate({ kind: 'valley' });
        openCrossroad(app, pending);
      }
    } else {
      shell.setOrnament('leaf');
    }
  };

  /**
   * Cerrar la ficha, que era imposible — el fallo que dio origen a S-05.
   *
   * Lo dijo el dueño del diseño al probar la demo: *«si seleccionas algo del
   * mapa, nunca se puede deseleccionar lo que aparece seleccionado.»* Tenía tres
   * causas a la vez, y hacían falta las tres para que no hubiera salida: el
   * `pointerdown` que la escondía exigía `event.target === root` y el lienzo
   * está **dentro** de la raíz, así que tocar el valle nunca era tocar la raíz;
   * tocar suelo vacío devolvía un objetivo `terrain` y abría otra ficha en vez
   * de cerrar la anterior; y el único gesto que la cerraba, el deslizamiento
   * hacia abajo, es el mismo movimiento con el que se arrastra el mapa. Las
   * tres correcciones siguen vivas más abajo (tocar suelo vacío vuelve a
   * 'valley', el deslizamiento sólo actúa sin cámara); lo que UI-R4 retira es
   * `showPanel`/`closePanel`: la ficha ya no es un `<section>` propio que este
   * fichero pinte a mano, es `redesign/inspect-panel.ts` montada en
   * `shell.content` por `navigate` (arriba), y cerrarla siempre pasa por
   * `actions.navigate`, nunca por tocar su visibilidad a secas — el mismo
   * motivo por el que existía esta nota.
   */
  const trace = new Map<number, Point[]>();
  let pinchStart: number | null = null;
  /** El ángulo entre los dos dedos al empezar, para girar. */
  let twistStart: number | null = null;
  /** Dónde estaba el punto medio de los dos dedos, para levantar la vista. */
  let midStart: number | null = null;
  let lastTapMs = -Infinity;
  let zoom = 1;

  /**
   * Cuánto se tarda como mucho entre dos toques para que cuenten como uno doble.
   *
   * TUNE: 320 ms. Es el umbral corriente en un móvil; por encima, un segundo
   * toque deliberado en otro sitio se confundía con un doble.
   */
  const DOUBLE_TAP_MS = 320;

  /**
   * Cuánto gira el valle por píxel de giro de los dedos, y por píxel de
   * arrastre con mayúsculas.
   *
   * TUNE: el giro con dos dedos va **uno a uno** con el ángulo de la mano, que
   * es lo único que no se siente raro; el de mayúsculas, 0,4° por píxel, para
   * que media pantalla sea media vuelta.
   */
  const ORBIT_PER_PX = (0.4 * Math.PI) / 180;
  /** Y cuánto se levanta la vista por píxel vertical del punto medio. */
  const PITCH_PER_PX = (0.25 * Math.PI) / 180;

  // **Los gestos van en la raiz, no en un lienzo.**
  //
  // Estaban enganchados al lienzo de Canvas, y cuando el piloto 3D releva, ese
  // lienzo se oculta y aparece otro encima: los gestos se quedaban colgados de
  // un elemento con `display: none`, que no recibe nada. En 3D no funcionaba ni
  // arrastrar, ni pellizcar, ni tocar para abrir la ficha.
  //
  // Enganchados a la raiz da igual cual sea el lienzo vivo, porque los eventos
  // suben. Lo que hay que mirar es que vengan de un lienzo y no de un boton de
  // velocidad, que tambien esta ahi dentro.
  const onValley = (event: Event): boolean => event.target instanceof HTMLCanvasElement;
  /** El lienzo que hay delante ahora mismo, para medir contra su caja. */
  const surface = (): HTMLCanvasElement => backend.live.surface;

  root.addEventListener('pointerdown', (event) => {
    // U-09 · el único sitio que crea o reanuda el `AudioContext`: nunca antes
    // del primer toque, porque el navegador no lo deja arrancar solo. Vale
    // cualquier toque de la raíz, no sólo el del botón de sonido — incluido
    // el del propio botón, cuyo `click` lo enciende un instante después.
    sound.arm();
    if (!onValley(event)) return;
    root.setPointerCapture(event.pointerId);
    trace.set(event.pointerId, [{ x: event.clientX, y: event.clientY, atMs: event.timeStamp }]);
    if (trace.size === 2) {
      const starts = [...trace.values()].map((points) => points[0]!);
      const a = starts[0]!;
      const b = starts[1]!;
      pinchStart = Math.hypot(b.x - a.x, b.y - a.y);
      // **Los tres números de una mano de dos dedos.** Cuánto se separan
      // (acercar), cuánto giran (rumbo) y a dónde va su punto medio (levantar
      // la vista). Son medidas independientes del mismo movimiento, así que se
      // pueden aplicar las tres a la vez sin que se peleen — es la
      // descomposición de una semejanza, no tres gestos compitiendo.
      twistStart = Math.atan2(b.y - a.y, b.x - a.x);
      midStart = (a.y + b.y) / 2;
    }
  });
  root.addEventListener('pointermove', (event) => {
    const points = trace.get(event.pointerId); if (points === undefined) return;
    const previous = points.at(-1);
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    // Un dedo solo arrastra el valle, cuando hay valle que arrastrar. Y con
    // mayúsculas pulsadas **gira**, que es la única forma de girar con un ratón
    // de un botón: en un escritorio no hay dos dedos que retorcer.
    if (trace.size === 1 && previous !== undefined && backend.live.movesCamera) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (event.shiftKey) backend.live.orbit(-dx * ORBIT_PER_PX, dy * PITCH_PER_PX);
      else backend.live.pan(dx, dy);
    }
    if (pinchStart !== null && trace.size === 2) {
      const ends = [...trace.values()].map((items) => items.at(-1)!);
      const distance = Math.hypot(ends[1]!.x - ends[0]!.x, ends[1]!.y - ends[0]!.y);
      if (backend.live.movesCamera) {
        // D.7 · zoom de verdad, no CSS: se cambia el volumen ortográfico y el
        // punto bajo los dedos se queda donde estaba. Escalar el elemento
        // agranda píxeles ya pintados; esto pinta más cerca.
        const mid = [...trace.values()].map((items) => items.at(-1)!);
        const first = mid[0]!;
        const second = mid[1]!;
        const box = surface().getBoundingClientRect();
        backend.live.zoom(
          pinchStart / distance,
          (first.x + second.x) / 2 - box.left,
          (first.y + second.y) / 2 - box.top,
        );
      } else {
        zoom = Math.max(1, Math.min(2.5, zoom * distance / pinchStart));
        canvas.style.transform = `scale(${zoom})`;
      }
      // El rumbo, uno a uno con el ángulo de la mano. Va en negativo porque
      // girar la mano a la derecha tiene que llevar el valle a la izquierda:
      // se gira la vista alrededor del valle, no el valle delante de la vista.
      if (twistStart !== null && backend.live.movesCamera) {
        const angle = Math.atan2(ends[1]!.y - ends[0]!.y, ends[1]!.x - ends[0]!.x);
        let turn = angle - twistStart;
        // Al cruzar ±π el ángulo salta una vuelta entera y el valle daba un
        // latigazo. Se trae la diferencia al tramo corto.
        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;
        backend.live.orbit(-turn, 0);
        twistStart = angle;
      }
      // Y el punto medio subiendo o bajando levanta la vista. Queda libre para
      // esto porque arrastrar ya es cosa de un dedo solo.
      if (midStart !== null && backend.live.movesCamera) {
        const mid = (ends[0]!.y + ends[1]!.y) / 2;
        backend.live.orbit(0, (mid - midStart) * PITCH_PER_PX);
        midStart = mid;
      }
      pinchStart = distance;
    }
  });
  root.addEventListener('pointerup', (event) => {
    const points = trace.get(event.pointerId);
    trace.delete(event.pointerId);
    if (trace.size < 2) { pinchStart = null; twistStart = null; midStart = null; }
    // UI-R2 · sin un `pointerdown` de este mismo dedo capturado antes —es
    // decir, sin que `onValley` diera cierto entonces—, no hay gesto del
    // valle que reconocer. Antes de este cambio se seguía adelante con
    // `trace.get(...) ?? []` y un único punto empujado a mano: con un solo
    // punto, `first === last` siempre, así que `recogniseGesture` daba
    // siempre 'tap' (distancia y duración cero) — **cualquier clic en
    // cualquier botón de la interfaz**, no sólo el lienzo, acababa lanzando
    // `backend.live.pick` sobre el punto de la pantalla y navegando a lo que
    // hubiera debajo. Para un botón que también llama a `actions.navigate`
    // (las pestañas, por ejemplo) el `click` real llegaba después y
    // corregía el resultado sin que se notara; para uno que no lo hace —los
    // botones de `orders.ts`, montados dentro de `shell.content`— el pick
    // espurio disparaba `navigate({kind:'inspect',…})`, que vacía
    // `shell.content` y **retira el propio botón del árbol antes de que
    // llegue su `click`**, así que la orden nunca se aplicaba. Medido con un
    // clic de Playwright de verdad sobre «Sowing: Heavy»: la hoja entera
    // desaparecía y el juego navegaba a la ficha de un edificio cualquiera
    // bajo el dedo, sin que ninguna orden cambiase.
    if (points === undefined) return;
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    const gesture = recogniseGesture({ points });
    if (gesture === 'tap' || gesture === 'hold') {
      // **Dos toques seguidos vuelven a la vista de partida.** Es la salida de
      // emergencia de poder girar: quien se pierde dando vueltas al valle
      // necesita una tecla de vuelta, y en un móvil no hay teclas.
      const doubleTap = event.timeStamp - lastTapMs < DOUBLE_TAP_MS;
      lastTapMs = event.timeStamp;
      if (doubleTap && backend.live.movesCamera) {
        backend.live.resetView();
        actions.navigate({ kind: 'valley' });
        return;
      }
      // Cada backend sabe qué hay bajo un punto de su propia pantalla: el 2D
      // por proporción de la rejilla, el 3D lanzando un rayo. `mapPoint` se
      // queda para el 2D y no vale para el otro.
      const box = surface().getBoundingClientRect();
      const target = backend.live.pick(
        state, event.clientX - box.left, event.clientY - box.top, lastFraction,
      );
      // **Tocar el suelo deselecciona.** Un objetivo `terrain` es «aquí no hay
      // nada»: abrir una ficha del prado con la anterior detrás era lo que
      // hacía que la selección no tuviera salida.
      if (target === null || target.kind === 'terrain') actions.navigate({ kind: 'valley' });
      else {
        actions.navigate({ kind: 'inspect', target, from: 'valley' });
        if (gesture === 'hold' && target.kind === 'villager') actions.track(target.id);
      }
    } else if (!backend.live.movesCamera) {
      // **Los deslizamientos verticales sólo valen donde no hay cámara.**
      //
      // Eran el modo de abrir la crónica y cerrar la ficha antes de que U-05
      // pusiera la barra de destinos abajo. Con cámara son el mismo movimiento
      // que arrastrar el mapa: el valle se movía **y** al soltar se abría la
      // crónica encima. «No se puede bien mover el mapa», y era esto.
      if (gesture === 'swipe_down') actions.navigate({ kind: 'valley' });
      else if (gesture === 'swipe_up') actions.navigate({ kind: 'chronicle' });
    }
  });

  // La rueda del raton, que en un movil no existe y en un navegador de
  // escritorio es **la unica manera de acercarse**: alli no hay dos dedos que
  // pellizcar. Se vio jugando la demo en el ordenador.
  root.addEventListener('wheel', (event) => {
    if (!onValley(event) || !backend.live.movesCamera) return;
    // Sin esto la pagina entera se mueve debajo del valle.
    event.preventDefault();
    // Las ruedas dan pixeles, lineas o paginas segun el navegador y el raton.
    // Se normaliza a muescas para que una vuelta valga lo mismo en todas.
    const lines = event.deltaMode === 1 ? event.deltaY : event.deltaY / 53;
    const notches = Math.max(-3, Math.min(3, event.deltaMode === 2 ? event.deltaY * 10 : lines));
    const box = surface().getBoundingClientRect();
    backend.live.zoom(
      WHEEL_STEP ** notches,
      event.clientX - box.left,
      event.clientY - box.top,
    );
  }, { passive: false });

  // §13.1: a snapshot and the decision log, every 20 ticks and whenever the
  // tab is hidden. M-25 also writes immediately on ending and beginning again.
  let loop: Loop | undefined;
  let saveQueue = Promise.resolve();
  // During catch-up, a partial state is only as current as the ticks it has
  // actually processed. The checkpoint clock preserves the remaining debt if
  // visibilitychange/pagehide saves between two batches.
  let savedAtOverride: number | null = null;
  const persist = (): void => {
    // Freeze the value now, before either the live loop or "Begin again" can
    // mutate it, and serialize writes in request order. Two independent IDB
    // opens could otherwise let the final dead-village write land after the
    // successor write and resurrect the epitaph on reload.
    const snapshot = structuredClone(serialize(
      state, state.history, archive, savedAtOverride ?? Date.now(),
    ));
    saveQueue = saveQueue.then(() => persistSave(snapshot));
  };
  // §13.2, v2.84. The lethargy used to live only in `boot`, so it only ran on
  // a cold start. A phone that locks its screen keeps the page alive, and the
  // valley simply froze — the promise "sigue sin ti" was false for the most
  // ordinary thing a player does. Hiding notes the hour; coming back owes it.
  let hiddenAtMs: number | null = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAtMs = Date.now(); persist(); return; }
    const since = hiddenAtMs;
    hiddenAtMs = null;
    if (since === null || catchingUp || state.ended !== null) return;
    const resumption = resumeAfterHidden(Date.now() - since, speed);
    // Y la velocidad viaja con la ausencia hasta el final. Sin esto,
    // `resumeAfterHidden` decidía que había que recuperar dieciséis semanas y
    // el letargo recuperaba una: lo destapó el recorrido de §13.2 de
    // `valley.shots.ts`, que cuenta los ticks de verdad.
    if (resumption.ticks > 0) catchUpFor(Date.now() - since, resumption.welcome, speed);
  });
  window.addEventListener('pagehide', () => { persist(); loop?.stop(); }, { once: true });

  // The queue behind `decide` (v2.60). `runTick` is the one and only place a
  // queued decision is ever spent: it hands it to `tick`, which applies it at
  // step 3 (§4.2) and nowhere earlier. Consuming it here — not inside
  // `decide` — is what makes "in pause the decision waits" true for free: a
  // paused game just never calls `runTick`, so a decision queued while paused
  // sits untouched until the player unpauses and a real tick runs.
  let pendingDecision: Decision | undefined;
  /**
   * M-0 · **Lo que el jugador ha contestado a quien espera en el camino**, en
   * cola hasta el tick siguiente.
   *
   * Es el mismo patrón que `pendingDecision` y por el mismo motivo: lo que el
   * jugador hace entra por `tick` y queda en el registro del estado, así que la
   * partida se puede reproducir. Y es una lista porque una semana admite más de
   * un acto, aunque hoy sólo haya una clase de acto.
   */
  let pendingActs: PlayerAct[] = [];
  const finish = (): void => {
    if (state.ended === null) return;
    loop?.stop();
    // VZ-02 · el valle calla: aquí habla el epitafio (§13.3).
    voice = SILENT;
    closeCrossroad();
    let game = archive.find((item) =>
      item.seed === state.seed && item.endedTick === state.ended?.tick);
    if (game === undefined) {
      game = archiveGame(state);
      archive.push(game);
    }
    persist();
    openEpitaph(app, game, () => {
      state = foundSuccessor(game, freshSeed(new Set(archive.map((item) => item.seed))));
      pendingDecision = undefined;
      lastFraction = 0;
      // La aldea nueva no "cambia" respecto a la que se acaba de cerrar: sin
      // esto, sus cuatro cifras nacían con un bump que no correspondía a nada.
      hud.reset();
      app.setSpeed(1);
      paint(0);
      persist();
      beginLoop();
    });
  };
  const runTick = (): void => {
    if (state.ended !== null) return;
    const decision = pendingDecision;
    pendingDecision = undefined;
    const acts = pendingActs;
    pendingActs = [];
    const report = tick(state, CATALOG, decision, acts);
    // M-0 · si la oferta no se pudo pagar, se dice y se deja en pie: es la
    // única respuesta de la aldea que el jugador no puede deducir mirando.
    if (report.offer?.refused === true) say('event', renderUiText('offer.cannot'));
    // Rule 4 (§2.60): the engine hands back what changed and where; `document`
    // and not `root` because the crossroad screen mounts on `document.body`
    // (§11.2's "ocupa la pantalla entera"), outside the app's own root.
    if (report.decided !== null) {
      document.dispatchEvent(new CustomEvent<TickReport>('valley:decided', { detail: report }));
    }
    if (state.ended !== null) { finish(); return; }
    // §11.6: what the chronicle would print in bold, where the player is
    // already looking. Not during a catch-up — nine hundred ticks of notices
    // is a backlog, and the welcome report of §9.2 is what tells that story.
    say('event', noticeText(state, report.entries));
    // U-02 · Y lo que pasa una vez. **Después del aviso a propósito**: si en el
    // mismo tick la aldea levanta su primera capilla y además se quema un
    // cobertizo, lo que se queda en pantalla es la capilla, que es lo raro.
    //
    // Tampoco durante un letargo, y por la misma razón que el aviso: quien
    // vuelve tras cuatro horas no quiere ver desfilar treinta hitos, y el parte
    // de bienvenida de §9.2 es lo que cuenta esa ausencia.
    if (!catchingUp) {
      const passed = milestonesAt(state, lastMilestoneTick);
      lastMilestoneTick = state.tick;
      // Ya vienen ordenados por peso: si coinciden dos, manda el mayor.
      const best = passed[0];
      // U-09 · el acento: un hito gana a una encrucijada planteada si
      // coinciden, la misma prioridad que la cartela ya tiene sobre el
      // aviso dos líneas más abajo. `accentFor` no dispara durante un
      // letargo (`catchingUp` es `false` aquí siempre, por construcción de
      // este bloque) y `sound.accent` aplica el fusible de reloj de pared de
      // §11.4 antes de sonar de verdad.
      const kind = accentFor(report.posed, best !== undefined, catchingUp);
      if (kind !== null) sound.accent(kind, Date.now());
      if (best !== undefined) {
        // **Una voz, y es la del aviso.**
        //
        // U-02 le dio al hito una cartela propia —pergamino, filetes, motas—
        // y el dueño del diseño la juzgó al probar la demo: *«esto no aporta
        // nada, mejorar o quitar»*. Tenía razón, y la razón se lee en el
        // comentario que este bloque tenía escrito: la cartela y el aviso
        // competían por el mismo sitio, así que había que apagar uno para
        // encender el otro. Dos lenguajes visuales para «ha pasado algo», y el
        // segundo además interrumpía para contar en pasado y con fecha lo que
        // el jugador estaba viendo ocurrir.
        //
        // Ahora el hito **es** el aviso de ese tick, con el mismo aspecto que
        // cualquier otra cosa que pase, y lo que lo distingue es que queda
        // **marcado en la crónica** (`screens/chronicle.ts`): ahí sí aporta,
        // porque la crónica es donde vive el pasado de la aldea y donde un
        // lector ajeno busca en qué se diferencia una partida de otra.
        //
        // Y un hito de peso 1 ya no interrumpe: `noticeworthy` filtra por
        // debajo de 2, así que lo tranquilo se queda sólo en la crónica. Eso es
        // ganancia, no pérdida.
        say('milestone', renderEntry(
          {
            tick: best.tick, kind: 'season', templateKey: best.key,
            params: best.params, weight: best.weight,
          },
          state.rng,
        ));
      }
    }
    if (state.tick % TIME.SAVE_EVERY_TICKS === 0) persist();
  };
  const beginLoop = (): void => {
    loop = startLoop(() => speed, runTick, paint);
  };

  /**
   * §13.2's catch-up, used by both doors into it: a cold start with a save
   * older than a tick, and a return from a hidden tab. The ordinary loop is
   * stopped first — it and the catch-up must never tick the same state at
   * once — and `paint` after every batch is the progress screen: the valley
   * is what fills in.
   */
  const catchUpFor = (elapsedMs: number, showWelcome: boolean, atSpeed = 1): void => {
    loop?.stop();
    loop = undefined;
    catchingUp = true;
    const sinceTick = state.tick;
    // Covers an exit before the first requestAnimationFrame batch has run.
    savedAtOverride = Date.now() - elapsedMs;
    runLethargy(state, elapsedMs, (progress) => {
      savedAtOverride = checkpointSavedAtMs(Date.now(), progress);
      paint(0);
      if (progress.done >= progress.total || progress.ended) {
        catchingUp = false;
        if (state.ended !== null) finish();
        else {
          // Commit the completed catch-up before the ordinary loop can mutate
          // the state. This also supersedes any partial visibility checkpoint.
          persist();
          if (showWelcome) openWelcome(app, welcomeDigest(state, sinceTick));
          beginLoop();
        }
        savedAtOverride = null;
      }
    }, atSpeed);
  };

  const app: App = {
    setSpeed(value: Speed): void {
      if (!isSpeed(value)) throw new Error(`Unsupported speed: ${value as number}`);
      speed = value;
      hud.setSpeed(speed);
    },
    state(): Readonly<GameState> { return state; },
    archive(): readonly ArchivedGame[] { return archive; },
    decide(optionId: string): boolean {
      const attempt = attemptDecision(state.crossroad !== null, pendingDecision !== undefined, speed);
      if (!attempt.accepted || state.crossroad === null) return false;
      pendingDecision = { templateId: state.crossroad.templateId, optionId };
      if (attempt.forceTick) { runTick(); paint(lastFraction); }
      return true;
    },
    look(x: number, y: number): void {
      // El eje `y` del mapa es el `z` del mundo: una celda es una unidad, y el
      // propio `pick` del renderer lee las celdas de `point.x`/`point.z`.
      // En 2D es un no-op del backend: ese lienzo dibuja el mapa entero.
      backend.live.look(x, y);
    },
  };
  app.setSpeed(speed);
  paint(0);
  document.documentElement.dataset.appReady = 'true';

  const owed = save !== undefined ? ticksOwed(Date.now() - save.savedAtMs) : 0;
  if (state.ended !== null) {
    finish();
  } else if (save !== undefined && owed > 0) {
    // §13.2: the absence is made up in batches *before* the interactive loop
    // starts — the normal loop and the catch-up must never tick the same
    // state at once. `paint` after every batch is the "progress screen":
    // the valley is what fills in, not a bar standing in for it.
    //
    // Gated on `owed > 0`, not just on there being a save: a save reloaded
    // moments after it was written (or the debug route's own synthetic one,
    // stamped `Date.now()` at boot) owes zero ticks, and a "welcome back,
    // nothing happened" screen over every debug route would be worse than
    // the screen it is supposed to replace.
    catchUpFor(Date.now() - save.savedAtMs, true);
  } else {
    beginLoop();
  }

  /**
   * VZ-4 · **un valle recién fundado se guarda ya, y no al primer tick.**
   *
   * El guardado corriente va cada `TIME.SAVE_EVERY_TICKS` ticks, y desde v3.72
   * un tick a ×1 son **catorce minutos de reloj de pared**. Así que entre
   * fundar un valle y el primer autoguardado había un cuarto de hora en el que
   * la partida no existía en el disco: quien fundaba y cerraba la pestaña la
   * perdía, y al volver el menú ofrecía «fundar» en vez de «continuar».
   *
   * Y es la causa de las **cinco pruebas de PWA** que llevaban rotas: las cinco
   * abren, pasan el menú y recargan, y en la recarga el juego volvía al menú
   * porque no había nada que continuar. El guardado del `pagehide` no las
   * salvaba: `persist` encola una escritura en IndexedDB y la página se
   * desmonta antes de que termine —el recorrido del menú lo tapaba esperando
   * 600 ms después de un `pagehide` sintético—.
   *
   * Va aquí abajo y no junto a la fundación porque `persist` se declara después:
   * leerla antes la pilla en la zona muerta temporal.
   */
  if (fresh) persist();

  return app;
}
