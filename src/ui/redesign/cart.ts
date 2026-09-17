// M-2 · El carro: lo que el jugador puede meter en el valle.
// `docs/plan-medios.md` §3, brief en `docs/rework.md` §4b.
//
// **Sustituye a la hoja de órdenes**, y no es un cambio de aspecto: es el verbo
// del juego cambiado de sitio. Las tres palancas mandaban —cuánto se siembra,
// dónde van las manos, qué se levanta antes— y medido eso era una trampa (sólo
// vivía la postura de fábrica; `plan-medios.md` §1). Aquí no se manda nada: se
// da una cosa y la aldea decide qué hacer con ella.
//
// Vive en la misma hoja de papel que la crónica, la gente y la ficha —mismo
// canto desgarrado, misma cruz, misma columna de 390— porque es una sección más
// (`piel-del-valle` §2, §6, §7). Y **no lleva ni una cifra suelta**: lo que
// cuesta cada cosa se enseña con los mismos iconos de la cabecera, que es lo
// que §11.1 pide.

import { renderUiText } from '@engine/chronicle/render';
import { MEANS_IDS, type MeansId, type VillageStats } from '@engine/state';
import { MEANS_SPEC, refusalFor } from '@engine/world/means';
import type { UiActions, UiPanel, UiSnapshot } from './contracts';

const STYLE_ID = 'valley-cart-style';

/** El icono de cada cosa que se puede pagar, el mismo de la cabecera. */
const COIN: Readonly<Record<string, string>> = {
  grain: 'wheat',
  wood: 'logs',
  stone: 'stone',
  silver: 'silver',
};

const CSS = `
.valley-cart { position: relative; display: flex; flex-direction: column; gap: 14px; }
/* **La cruz de cerrar, y por qué la pone el carro y no la carcasa.** La carcasa
   monta la suya en la caja de la bandeja, y app.ts vacía esa caja en cada
   navegación (replaceChildren), así que se la lleva por delante: la crónica ya
   tenía la suya por este mismo motivo (VZ-2). Es la misma pieza —19 px de glifo
   en un toque de 44, sobre el papel, arriba a la derecha— que el estándar fijó
   (piel-del-valle §7).

   Y sin acentos graves en este comentario a propósito: va dentro de una
   plantilla de texto de TypeScript, y uno solo rompe el build con un TS1005
   que no menciona la causa. Está escrito en la skill y ha vuelto a pasar. */
.cart-close { position: absolute; top: -4px; right: -4px; z-index: 2;
  width: var(--ui-tap-min); height: var(--ui-tap-min); display: grid; place-items: center;
  padding: 0; border: 0; background: transparent; color: var(--skin-ink-faded);
  font: 400 19px/1 var(--skin-font-voice); cursor: pointer;
  -webkit-tap-highlight-color: transparent; }
.cart-close:active { color: var(--skin-ink); }
.cart-row { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; }
.cart-row-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.cart-name { margin: 0; }
.cart-what { margin: 0; color: var(--skin-ink-faded); font: italic 15px/1.35 var(--skin-font-read); }
.cart-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
/* El precio, con los iconos de la cabecera: una ficha por cosa que se paga. */
.cart-cost { display: flex; align-items: center; gap: 10px; }
.cart-coin { display: inline-flex; align-items: center; gap: 4px;
  color: var(--skin-ink-soft); font-family: var(--skin-font-voice); font-weight: 600;
  font-size: var(--skin-text-figure); font-variant-numeric: tabular-nums; }
.cart-coin .skin-icon { width: 18px; height: 18px; }
.cart-give { min-height: var(--ui-tap-min); padding: 0 18px; }
/* Lo que no se puede dar se queda apagado **con su motivo escrito**, que es la
   diferencia entre un botón gris y una respuesta. */
.cart-give[disabled] { opacity: .45; }
.cart-why { margin: 0; color: var(--skin-ink-faded); font: italic 14px/1.3 var(--skin-font-read); }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

function coin(stat: string, amount: number): HTMLElement {
  const box = document.createElement('span');
  box.className = 'cart-coin';
  box.innerHTML = `<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#${COIN[stat] ?? 'silver'}"/></svg>`;
  const value = document.createElement('b');
  value.textContent = String(amount);
  box.append(value);
  box.title = renderUiText(`app.vitals.${stat === 'grain' ? 'food' : stat}`, { count: amount, weeks: amount });
  return box;
}

interface Row {
  readonly element: HTMLElement;
  readonly give: HTMLButtonElement;
  readonly why: HTMLElement;
}

/**
 * El carro. `actions.give` es lo único que escribe: el panel no toca el estado
 * ni sabe qué pasa después (`contracts.ts`).
 */
export function cartPanel(actions: UiActions): UiPanel {
  ensureStyle();
  const element = document.createElement('section');
  // **Sin `.valley-panel`**, y es lo mismo que hace la hoja de órdenes: esa
  // clase viene de la interfaz de U-06 (`index.html`) y es `position: absolute;
  // bottom: 0`, o sea que dentro de la bandeja se sale del flujo y la deja con
  // altura cero — visto en captura: sólo asomaba «A PLOUGH» por debajo de la
  // barra. Y de paso, los recorridos que buscan una ficha abierta por
  // `.valley-panel` no confunden el carro con una.
  element.className = 'valley-cart skin-cart';
  element.setAttribute('aria-label', renderUiText('cart.open'));

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'cart-close';
  close.setAttribute('aria-label', renderUiText('app.close'));
  close.textContent = '×';
  close.addEventListener('click', () => { actions.navigate({ kind: 'valley' }); });
  element.append(close);

  const rows = new Map<MeansId, Row>();
  for (const id of MEANS_IDS) {
    const row = document.createElement('div');
    row.className = 'skin-plate skin-plate--card cart-row';

    const head = document.createElement('div');
    head.className = 'cart-row-head';
    const name = document.createElement('h3');
    name.className = 'skin-inscription cart-name';
    name.textContent = renderUiText(`cart.${id}`);
    head.append(name);

    const what = document.createElement('p');
    what.className = 'cart-what';
    what.textContent = renderUiText(`cart.${id}.what`);

    const cost = document.createElement('div');
    cost.className = 'cart-cost';
    for (const [stat, amount] of Object.entries(MEANS_SPEC[id].cost)) {
      cost.append(coin(stat, amount ?? 0));
    }

    const give = document.createElement('button');
    give.type = 'button';
    give.className = 'skin-button--wood cart-give';
    give.textContent = renderUiText('cart.give');
    give.addEventListener('click', () => { actions.give(id); });

    const foot = document.createElement('div');
    foot.className = 'cart-foot';
    foot.append(cost, give);

    const why = document.createElement('p');
    why.className = 'cart-why';
    why.hidden = true;

    row.append(head, what, foot, why);
    element.append(row);
    rows.set(id, { element: row, give, why });
  }

  return {
    element,
    update(snapshot: UiSnapshot): void {
      for (const id of MEANS_IDS) {
        const row = rows.get(id);
        if (row === undefined) continue;
        const refusal = refusalFor(snapshot.state as { village: VillageStats } & typeof snapshot.state, id);
        row.give.disabled = refusal !== null;
        // **El motivo, escrito.** Un botón apagado sin razón es un juego que no
        // contesta; es la misma regla que E4 puso en las órdenes («te he
        // entendido y no puedo») y lo único que se conserva de ellas.
        const why = refusal === null ? '' : renderUiText(`cart.no.${refusal}`);
        if (row.why.textContent !== why) row.why.textContent = why;
        row.why.hidden = refusal === null;
      }
    },
    dispose(): void { /* nada que soltar: sólo escucha sus propios botones */ },
  };
}
