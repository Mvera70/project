// M-22 · The crossroad, a scrollable decision sheet over the valley.
//
// §11.2: the valley dimmed behind, title, three or four sentences of context,
// and the options as big blocks with the verb and the price — the price
// always visible, never behind a second tap. No close button: a decision is
// taken, or a swipe returns to the valley and the crossroad stays pending,
// marked with a discreet dot the player can tap to come back to it.

import { CATALOG } from '@engine/crossroads/catalog';
import { namesOf } from '@engine/crossroads/resolve';
import { renderEntry } from '@engine/chronicle/render';
import type { GameState, PendingCrossroad } from '@engine/state';
import type { TickReport } from '@engine/sim';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { recogniseGesture, type Point } from '../gestures';
import { retireOverlay } from '../motion';

const STYLE_ID = 'valley-crossroad-style';
const STYLE = `
/* UI-V5c · **La decisión, como documento sellado.** \`plan-piel.md\` §3.5: se
   viste con el mismo lenguaje que el documento sellado del prototipo 02, que
   es lo que ese prototipo enseña de una decisión — no tiene pantalla propia.

   **Y el velo oscuro se va.** Estaba ahí por una razón medida y buena: el suelo
   del valle es claro, las opciones caen encima y el precio perdía contraste
   contra el prado. Pero la solución era del juego de antes del rediseño; con
   una página de pergamino debajo, el problema desaparece de raíz y no hace
   falta apagar el valle para leer. El valle se sigue viendo arriba, que es lo
   que §11.2 pide («atenuado y no tapado»), y la página sube desde y 300 como
   la de la crónica. */
.crossroad-scrim { position: fixed; inset: 0; z-index: 10; display: flex;
  flex-direction: column; justify-content: flex-end;
  /* §11.2 pide el valle **atenuado y no tapado**, y sin esto quedaba a plena
     luz: un velo suave, que sólo se ve donde se ve el valle porque la franja
     de fusión y la página pintan encima de él. Un 18 % basta para que la
     atención caiga en el documento sin apagar la aldea, que es lo que el velo
     opaco de antes hacía. */
  background: rgba(27, 22, 19, .18);
  color: var(--skin-ink); font-family: var(--skin-font-read); font-size: 15px; }
/* La franja con la que la página se funde con el valle, **hermana de la página
   y no un fondo suyo**. Es el mismo reparto que en la crónica y por el mismo
   motivo aprendido allí: el degradado y el color opaco en el mismo elemento se
   pisan —el color rellena la caja entera y el degradado deja de tener nada que
   fundir—, y lo que salió en la primera captura fue una banda de pergamino
   vacía de 300 px encima del título. Y la altura la pone el contenido: la
   página mantiene una altura uniforme y desplaza su contenido cuando hace
   falta; la franja añade la fusión sin ocupar espacio dentro de ella. */
/* VZ-2 · el hueco por el que se ve el valle. Era una franja de fusión con
   degradado; ahora la transición la hace el canto rasgado de la hoja
   (\`.skin-torn-top\`, \`skin.css\`), el mismo de las tres secciones, y esto
   sólo reserva el sitio. */
.crossroad-fade { flex: 0 0 64px; width: min(100%, 760px); margin-inline: auto; }
/* La página. */
.crossroad { box-sizing: border-box; width: min(100%, 760px); height: 56dvh;
  flex: 0 0 56dvh; margin-inline: auto; overflow-y: auto;
  scrollbar-width: none; overscroll-behavior: contain;
  padding: 22px 24px max(24px, env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  background-color: var(--skin-page);
  background-image: var(--skin-map-pattern); background-repeat: no-repeat;
  animation: crossroad-sheet-arrive 280ms cubic-bezier(.2, .75, .25, 1) both; }
.crossroad::-webkit-scrollbar { display: none; }
/* La cabecera: el sello a la izquierda del título, como el documento sellado
   de la crónica (§3.2), y el título en la tinta roja de una decisión. */
.crossroad-head { display: flex; align-items: center; gap: 14px; touch-action: none; }
.crossroad-head .skin-seal { width: 44px; height: 44px; flex-basis: 44px;
  background: transparent; clip-path: none; margin: 0; }
.crossroad-head .skin-seal img { display: block; width: 44px; height: 44px; object-fit: contain; }
.crossroad h1 { margin: 0; padding-top: 0; border-top: 0; flex: 1 1 auto;
  color: var(--skin-red-ink); text-wrap: balance;
  font: 600 22px/1.2 var(--skin-font-heading);
  letter-spacing: .015em; text-transform: none; }
.crossroad p.crossroad-body { margin: 14px auto 20px; color: var(--skin-ink);
  font: 400 16px/1.5 var(--skin-font-voice); text-wrap: pretty; }
.crossroad-options { display: flex; flex-direction: column; gap: 10px; }
/* Las opciones son tarjetas de decisión: superficie marfil, borde definido y
   sombra corta para que el verbo y el precio parezcan controles tocables. */
.crossroad-options button { display: flex; flex-wrap: wrap; align-items: center;
  gap: 4px 10px; width: 100%; box-sizing: border-box; min-height: 68px; text-align: left;
  padding: 16px; border: 1px solid var(--skin-rule-on-paper);
  border-radius: 12px; cursor: pointer;
  color: var(--skin-ink); font: inherit;
  background-color: var(--skin-parchment);
  background-image: none;
  box-shadow: 0 3px 0 rgba(32, 55, 64, .2), 0 5px 10px rgba(32, 55, 64, .08);
  -webkit-tap-highlight-color: transparent;
  animation: crossroad-option-arrive 220ms ease-out backwards; }
.crossroad-options button:nth-child(2) { animation-delay: 45ms; }
.crossroad-options button:nth-child(3) { animation-delay: 90ms; }
.crossroad-options button:nth-child(4) { animation-delay: 135ms; }
.crossroad-options button:hover { border-color: var(--skin-gold); }
.crossroad-options button:active { background-color: var(--skin-parchment-aged);
  transform: translateY(1px); }
.crossroad-options button:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }
.crossroad-label { color: var(--skin-ink);
  font: 600 15px/1.25 var(--skin-font-voice); letter-spacing: .02em; }
/* El precio, **al lado del verbo y no debajo**, que es lo que §3.5 pide. Con
   una salvedad medida: hay precios de cuarenta caracteres («the wood does not
   come back in a lifetime») y a 390 px de ancho no caben en la misma línea que
   el verbo. Así que la fila envuelve: el precio corto se queda al lado, el
   largo baja solo. Lo que UI-R5 exige —mismo bloque, mismo toque, siempre
   visible— se cumple en los dos casos.

   Y no va en mayúsculas, que era como estaba y se vio en una captura: «A
   HUNDRED AND TWENTY OF GRAIN, AND SHE IS THIN» grita, y el precio de una
   decisión no grita, se dice. El banco lo escribe en minúscula con su
   mayúscula inicial (§9.3). */
.crossroad-cost { color: var(--skin-ink-faded);
  font: 400 13px/1.35 var(--skin-font-voice); letter-spacing: 0; }
@media (max-width: 600px) {
  .crossroad-options button { min-height: 76px; }
}
@keyframes crossroad-sheet-arrive {
  from { opacity: .7; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes crossroad-option-arrive {
  from { opacity: .45; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .crossroad, .crossroad-options button { animation: none; }
}
/* U-07 · la marca discreta de §11.2 pasaba por un punto rojo de 14 px que
   nadie lee como «lo más importante que el juego tiene que pedirte». Desde
   esta ronda es un chip de pergamino con su canto rasgado, como el resto de lo
   que este juego pone sobre el valle, y lleva el sello para que se lea como el
   documento que espera. */
/* **Debajo de la fila de chips, no arriba a la derecha.** Ahí es donde vivía, y
   con el sello la píldora pasó de 150 a 199 px de ancho: medido, choca con la
   placa de fecha, que ocupa de x 27 a x 361. La tira de cifras acaba en y 90,
   así que 92 la deja justo debajo, sobre el valle y sin tapar nada. */
/* **La pantalla entera es de la decisión** (§11.2), y eso incluye la cabecera.
   Se vio en una captura: la tira, las tres palancas y la línea de estado se
   leían a través de la encrucijada, y ahí arriba no hay nada que hacer mientras
   se contesta: las órdenes permanentes valen para la semana que viene, no para
   esto.

   **UI-V5c · y hay que ocultar las piezas, no sólo sus textos.** Esta lista
   nombraba los elementos de U-01 —\`.valley-date\`, \`.valley-time\`,
   \`.valley-vitals\`— y UI-V1 metió cada uno **dentro de una placa nueva**. El
   texto se ocultaba y la placa se quedaba: en la captura del año 37 salía la
   placa de fecha vacía, con su arco del sol, encima de la decisión. Y los dos
   círculos de velocidad igual: la lista tenía \`.valley-speed-badge\` —el de la
   derecha— pero no el grupo, así que el de pausa asomaba detrás de las
   tarjetas. Se ocultan los contenedores de la piel. */
.crossroad-open .hud-plate-date,
.crossroad-open .hud-speed-cluster,
.crossroad-open .valley-speeds,
.crossroad-open .valley-speed-badge,
.crossroad-open .valley-orders-now,
.crossroad-open .valley-orders,
.crossroad-open .valley-vitals,
.crossroad-open .valley-voice,
.crossroad-open .valley-time,
.crossroad-open .valley-date { visibility: hidden; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/** A `crossroad.<template>.<key>` line, filled with this crossroad's cast and year. */
function textOf(state: GameState, p: PendingCrossroad, key: string): string {
  // El aviso del clan lee el tamaño de la partida que ya guarda el motor.
  // Sin este dato, la plantilla mostraba literalmente `{count}` al jugador.
  const count = p.templateId === 'raiders_coming' ? { count: state.threat.comingBand } : {};
  return renderEntry(
    { tick: p.posedTick, kind: 'crossroad_posed', templateKey: key, params: { year: yearOf(p.posedTick), ...namesOf(state, p.cast), ...count }, weight: 3 },
    state.rng,
  );
}

/**
 * §11.2 · contestar enfoca lo que la decisión cambia: la cámara mira a la
 * celda del primer efecto visible del tick.
 *
 * **VZ-6 lo reescribió entero, y la causa merece quedar escrita**: esto
 * escalaba `#valley` con un `transform` y un `transform-origin` en tanto por
 * ciento, que funcionaba porque el lienzo 2D dibuja el mapa completo. Desde
 * UI-V10 ese lienzo está oculto en cuanto el 3D releva, así que enfocar no
 * hacía **nada** en el juego que se publica —y el recorrido que lo vigilaba no
 * tenía nada que leer, por lo que llevaba declarado como fallo—. Ahora se pide
 * por `app.look`, que baja a la cámara del renderer.
 *
 * Mueve el centro y no la altura: acercarse o no es del jugador (§11.2), y un
 * salto de zoom sobre un valle en marcha marea más de lo que señala. Sin
 * transición y sin volver: la cámara se queda donde la decisión la dejó, que
 * es lo mismo que pasa cuando el jugador la arrastra con el dedo.
 */
function focus(app: App, report: TickReport): void {
  const point = report.visualEffects[0];
  if (point === undefined) return;
  app.look(point.x, point.y);
}

interface Shown { key: string; overlay: HTMLElement | null; marker: HTMLElement | null }
let shown: Shown | null = null;
/**
 * VZ-03 · qué decisión ha aplazado el jugador deslizando hacia abajo.
 *
 * Existe porque la marca de una decisión aplazada dejó de ser una píldora de
 * este módulo y pasó a ser el sello del ornamento de la bandeja, que es de la
 * carcasa. `app.ts` pregunta en cada pintado y pone el sello o la hoja; aquí
 * sólo se recuerda, que es lo único que este módulo sabe.
 */
let deferred: string | null = null;

/** Si la decisión que hay planteada está aplazada (§8.6: no caduca, espera). */
export function isDeferred(p: PendingCrossroad): boolean {
  return deferred === key(p);
}

/** Abrir la decisión aplazada: es lo que hace el sello del ornamento. */
export function openDeferred(app: App, p: PendingCrossroad): void {
  deferred = null;
  removeShown();
  mountOverlay(app, p);
}

function key(p: PendingCrossroad): string {
  return `${p.templateId}:${p.posedTick}`;
}

function removeShown(): void {
  shown?.overlay?.remove();
  shown?.marker?.remove();
  document.documentElement.classList.remove('crossroad-open');
}

/** Remove a question that belongs to a game which has just ended. */
export function closeCrossroad(): void {
  removeShown();
  shown = null;
  deferred = null;
}

function mountOverlay(app: App, p: PendingCrossroad): void {
  ensureStyle();
  const state = app.state();
  const template = CATALOG.find((t) => t.id === p.templateId);
  if (template === undefined) return;
  document.documentElement.classList.add('crossroad-open');

  const scrim = document.createElement('div');
  scrim.className = 'crossroad-scrim';
  // La franja de fusión, hermana de la página: ver su comentario en `STYLE`.
  const fade = document.createElement('div');
  fade.className = 'crossroad-fade';
  const card = document.createElement('section');
  card.className = 'crossroad';
  // UI-V5c · el sello de lacre a la izquierda del título, como el documento
  // sellado del prototipo 02 (§3.5). El árbol sale del sprite incrustado en
  // `index.html`: un `<use>` a un fichero externo no carga bajo `file://`.
  const head = document.createElement('div');
  head.className = 'crossroad-head';
  const seal = document.createElement('div');
  seal.className = 'skin-seal';
  seal.setAttribute('aria-hidden', 'true');
  seal.innerHTML = '<img src="./ui/art/ornament-tree-seal.png" alt="" />';
  const h1 = document.createElement('h1');
  h1.textContent = textOf(state, p, template.title);
  head.append(seal, h1);
  const body = document.createElement('p');
  body.className = 'crossroad-body';
  body.textContent = textOf(state, p, template.body);
  const options = document.createElement('div');
  options.className = 'crossroad-options';

  for (const optionId of p.optionIds) {
    const option = template.options.find((o) => o.id === optionId);
    if (option === undefined) continue;
    const button = document.createElement('button');
    button.type = 'button';
    const labelText = textOf(state, p, option.label);
    const costText = textOf(state, p, option.cost);
    // Screen readers hear the price too — "siempre visible" (§11.2) is not
    // only a pixel promise.
    button.setAttribute('aria-label', `${labelText}. ${costText}`);
    const label = document.createElement('span');
    label.className = 'crossroad-label';
    label.textContent = labelText;
    // The price, in the same block and the same tap as the verb: §11.2's
    // "siempre visible" is not a promise a second screen can keep.
    const cost = document.createElement('span');
    cost.className = 'crossroad-cost';
    cost.textContent = costText;
    button.append(label, cost);
    button.addEventListener('click', () => {
      // Registered *before* calling `decide`: rule 2 (§2.60) forces the tick
      // — and dispatches the event — synchronously inside that call, so a
      // listener added after it returns would already have missed it.
      const onDecided = ((event: CustomEvent<TickReport>) => {
        focus(app, event.detail);
      }) as EventListener;
      document.addEventListener('valley:decided', onDecided, { once: true });
      const accepted = app.decide(optionId);
      // Rule 1 (§2.60): a decision already in flight refuses a second one.
      // The screen simply stays open, and this listener never fires — remove
      // it rather than leave it to catch some later, unrelated decision.
      if (!accepted) { document.removeEventListener('valley:decided', onDecided); return; }
      if (shown?.overlay === scrim) {
        shown = null;
        document.documentElement.classList.remove('crossroad-open');
        retireOverlay(scrim, card);
      }
    });
    options.append(button);
  }

  card.append(head, body, options);
  scrim.append(fade, card);

  // §11.2: no close button. A swipe down returns to the valley; the crossroad
  // stays pending and a discreet mark takes its place.
  const trace: Point[] = [];
  head.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    scrim.setPointerCapture(event.pointerId);
  });
  scrim.addEventListener('pointerup', (event) => {
    if (trace.length === 0) return;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    const gesture = recogniseGesture({ points: trace });
    trace.length = 0;
    if (gesture === 'swipe_down') {
      retireOverlay(scrim, card);
      document.documentElement.classList.remove('crossroad-open');
      // VZ-03 · la decisión queda pendiente y **la marca es el sello de lacre
      // en el ornamento de la bandeja**, no una píldora flotante a 92 px del
      // techo. Quien sabe del ornamento es `app.ts` (tiene la carcasa), así que
      // aquí sólo se anota que esta decisión está aplazada y `paint` lo lee.
      deferred = key(p);
      shown = { key: key(p), overlay: null, marker: null };
    }
  });
  scrim.addEventListener('pointercancel', () => { trace.length = 0; });

  document.body.append(scrim);
  shown = { key: key(p), overlay: scrim, marker: null };
}

/**
 * Opens the crossroad, or does nothing if this one is already on screen (as
 * a full card or as its discreet mark) — `boot` calls this every tick while a
 * crossroad is pending, and re-mounting it each time would steal the swipe
 * gesture's own dismissal and reset any card the player is mid-read of.
 */
export function openCrossroad(app: App, p: PendingCrossroad): void {
  if (shown !== null && shown.key === key(p)) return;
  // Aplazada es aplazada: §8.6 dice que espera, y reabrirla cada tick sería
  // quitarle al jugador el gesto que acaba de hacer.
  if (deferred === key(p)) return;
  removeShown();
  mountOverlay(app, p);
}
