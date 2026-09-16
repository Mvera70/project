// UI-R2 · La hoja de las tres órdenes permanentes, migrada de verdad a la
// bandeja de la carcasa (`ShellHandle.content`). docs/ui-redesign/
// implementation-prompt.md, sección UI-R2; design.md §11.2, §11.3.
//
// **El defecto que esto cierra.** UI-R1 dejó la hoja de órdenes como un
// `<section class="valley-panel valley-orders">` suelto, anclado a
// `bottom: 0` por debajo de la barra de navegación nueva, mientras
// `contentRouteFor` ya hacía visible `shell.content` —vacío— para la misma
// ruta: dos superficies a la vez, una vacía encima tapando el pie de la otra
// («Build first» cortado, fotografiado en `artifacts/graphics/UI/R1/
// 04-orders-open.png»). Migrar el contenido de verdad a `shell.content`
// —que ya reserva `var(--ui-nav-height)` en su `bottom`, `shell.css`— hace
// que sólo exista una superficie, del alto que le corresponde.
//
// **Qué usa, y qué no inventa.** `INTENT_STOPS`, `PRIORITY_STOPS` y `stopOf`
// vienen literales de `@engine/state` (`docs/design.md` §12): ninguna
// posición ni etiqueta se reconstruye a mano. El único punto de escritura es
// `actions.setIntent`, que es lo único que `contracts.ts` concede a un panel;
// la respuesta de `answerFor` y el guardado quedan en `app.ts`, que es quien
// implementa esa acción — este módulo sólo emite la intención nueva.
//
// **Por qué conserva `valley-orders`/`valley-panel-close` y no adopta clases
// nuevas.** `tools/graphics/shot.mjs` (líneas 190, 197, 243) y
// `tools/valley.shots.ts` (`.valley-panel:not(.valley-orders)`) son ficheros
// que este brief no puede tocar («no ejecutes/edites `tools/` más de lo que
// necesites»); conservar los mismos selectores es lo que deja esos
// recorridos funcionando sin que nadie los tenga que arreglar detrás.
import { renderUiText } from '@engine/chronicle/render';
import { INTENT_STOPS, PRIORITY_STOPS, stopOf } from '@engine/state';
import type { GameState, Intent, PriorityName } from '@engine/state';
import type { PanelFactory, UiSnapshot } from './contracts';

interface LeverRow {
  readonly current: (state: GameState) => string;
  readonly buttons: readonly (readonly [string, HTMLButtonElement])[];
}

/**
 * Qué `Intent` resulta de mover la palanca de siembra o de manos a una
 * posición de `INTENT_STOPS`. Pura y separada del botón que la dispara —el
 * mismo motivo por el que `app.ts` aisló `attemptDecision`/`resumeAfterHidden`
 * de `boot()` en M-20 (UI-R1 §4 lo repite con `navTabFor`/`contentRouteFor`/
 * `resolveMessageSlot`): este proyecto no trae `jsdom`
 * (`docs/ui-redesign/rounds/UI-R1.md` §4), así que lo único que una prueba
 * rápida puede examinar de un panel es la parte que no toca el DOM.
 *
 * Una clave que no está en `INTENT_STOPS[lever]` devuelve la intención sin
 * tocar: no puede ocurrir desde los botones de esta hoja (`stops` viene del
 * propio `INTENT_STOPS`), pero una función pública no debe asumir a su
 * llamante — más barato dejarlo dicho aquí que en un comentario en cada sitio
 * que la use.
 */
export function nextIntentForLever(intent: Intent, lever: 'fields' | 'timber', key: string): Intent {
  const stop = INTENT_STOPS[lever].find((one) => one.key === key);
  return stop === undefined ? intent : { ...intent, [lever]: stop.value };
}

/** Lo mismo que `nextIntentForLever`, para la tercera palanca (`PRIORITY_STOPS`). */
export function nextIntentForPriority(intent: Intent, key: string): Intent {
  return (PRIORITY_STOPS as readonly string[]).includes(key)
    ? { ...intent, priority: key as PriorityName }
    : intent;
}

/**
 * La hoja de las tres palancas. `PanelFactory` de verdad: `actions` es lo
 * único que recibe, `update` es lo único por lo que se entera del estado.
 */
export const ordersPanel: PanelFactory = (actions) => {
  const element = document.createElement('section');
  element.className = 'valley-orders';
  element.setAttribute('aria-label', renderUiText('app.orders'));

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'valley-panel-close';
  close.setAttribute('aria-label', renderUiText('app.close'));
  close.textContent = '×';
  close.addEventListener('click', () => { actions.navigate({ kind: 'valley' }); });

  const heading = document.createElement('h2');
  heading.textContent = renderUiText('app.orders');
  element.append(close, heading);

  let latest: GameState | null = null;
  const rows: LeverRow[] = [];

  const addRow = (
    name: string,
    stops: readonly { key: string; label: string }[],
    apply: (state: GameState, key: string) => Intent,
    current: (state: GameState) => string,
  ): void => {
    const row = document.createElement('div');
    row.className = 'valley-order';
    const label = document.createElement('span');
    label.className = 'valley-order-name';
    label.textContent = name;
    const bar = document.createElement('div');
    bar.className = 'valley-order-bar';
    const buttons = stops.map((stop) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = stop.label;
      button.setAttribute('aria-label', `${name}: ${stop.label}`);
      button.addEventListener('click', () => {
        if (latest === null) return;
        // La orden se da y la aldea la obedece desde el tick siguiente: no se
        // recalcula nada aquí, el motor lee `state.intent` cada semana.
        // `app.ts` es quien implementa `setIntent`: ahí viven la respuesta de
        // `answerFor` y el guardado (ver el comentario de cabecera).
        actions.setIntent(apply(latest, stop.key));
        paint();
      });
      bar.append(button);
      return [stop.key, button] as const;
    });
    row.append(label, bar);
    element.append(row);
    rows.push({ current, buttons });
  };

  for (const lever of ['fields', 'timber'] as const) {
    const prefix = lever === 'fields' ? 'sowing' : 'hands';
    addRow(
      renderUiText(`app.${prefix}`),
      INTENT_STOPS[lever].map((stop) => ({
        key: stop.key, label: renderUiText(`app.${prefix}.${stop.key}`),
      })),
      (state, key) => nextIntentForLever(state.intent, lever, key),
      (state) => stopOf(lever, state.intent[lever]),
    );
  }
  // E3 · Y la tercera: qué se levanta antes.
  addRow(
    renderUiText('app.build'),
    PRIORITY_STOPS.map((key) => ({ key, label: renderUiText(`app.build.${key}`) })),
    (state, key) => nextIntentForPriority(state.intent, key),
    (state) => state.intent.priority,
  );

  const paint = (): void => {
    if (latest === null) return;
    for (const { current, buttons } of rows) {
      const now = current(latest);
      for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === now));
    }
  };

  return {
    element,
    update(snapshot: UiSnapshot): void { latest = snapshot.state; paint(); },
    // Nada que soltar: los botones sólo llevan `addEventListener` sobre
    // elementos propios, igual que razona `shell.ts` sobre los suyos — quitar
    // `element` del árbol basta.
    dispose(): void { /* ver el comentario de arriba */ },
  };
};
