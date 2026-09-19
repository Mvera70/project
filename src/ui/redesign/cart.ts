// M-2 · El carro: lo que el jugador puede meter en el valle.
// `docs/historico/plan-medios.md` §3, brief en `docs/historico/rework.md` §4b.
//
// **Sustituye a la hoja de órdenes**, y no es un cambio de aspecto: es el verbo
// del juego cambiado de sitio. Las tres palancas mandaban —cuánto se siembra,
// dónde van las manos, qué se levanta antes— y medido eso era una trampa (sólo
// vivía la postura de fábrica; `docs/historico/plan-medios.md` §1). Aquí no se manda nada: se
// da una cosa y la aldea decide qué hacer con ella.
//
// Vive en la misma hoja de papel que la crónica, la gente y la ficha —mismo
// canto desgarrado, misma cruz, misma columna de 390— porque es una sección más
// (`piel-del-valle` §2, §6, §7). Y **no lleva ni una cifra suelta**: lo que
// cuesta cada cosa se enseña con los mismos iconos de la cabecera, que es lo
// que §11.1 pide.

import { renderUiText } from '@engine/chronicle/render';
import { MEANS_IDS, type MeansId, type VillageStats } from '@engine/state';
import { CROWN, TIME } from '@engine/balance';
import { crownRefusal } from '@engine/people/crown';
import { crownRow } from '@derive/crown';
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
/* K-5 · la corona. Una fila por candidato dentro de la fila de la corona: la
   misma tira de pergamino de la lista de la gente, con su medalla, sus
   inviernos, su oficio y hacia dónde tiraría el valle con él. */
.cart-who { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.cart-who-row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; border-top: 1px solid var(--skin-rule); }
.cart-who-of { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cart-who-name { font-family: var(--skin-font-voice); font-weight: 600; }
.cart-who-lean { color: var(--skin-ink-faded); font: italic 14px/1.3 var(--skin-font-read); }
.cart-who-traits { color: var(--skin-ink-soft); font: 400 13px/1.3 var(--skin-font-read); }
.cart-reigns { margin: 0; font-family: var(--skin-font-voice); }
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
/**
 * C4 · El motivo de una negativa, con la frase de esa cosa si la tiene.
 *
 * `renderUiText` devuelve la clave entre corchetes cuando falta, y eso es
 * exactamente lo que hay que detectar para caer a la frase general: es la misma
 * señal que `ui-milestones` y `ui-epitaph` usan para vigilar el banco.
 */
function reasonFor(id: MeansId, refusal: string): string {
  const mine = renderUiText(`cart.no.${refusal}.${id}`);
  return mine.startsWith('[') ? renderUiText(`cart.no.${refusal}`) : mine;
}

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

  // K-5 · **la fila de la corona**, detrás de las seis cosas. Va última porque
  // es la decisión más grande del carro: se paga una vez por generación y no se
  // deshace.
  const crownBox = document.createElement('div');
  // C4 · **y con su propia clase**, que hacía falta: la corona llevaba
  // `cart-row` a secas, así que contar las filas del carro contaba once cuando
  // los medios son diez, y el recorrido que vigila esta pantalla se quedó rojo
  // el día que A2b añadió la segunda puerta. Una fila que no es una cosa que se
  // da tiene que poder distinguirse de las que sí.
  crownBox.className = 'skin-plate skin-plate--card cart-row cart-row--crown';
  const crownHead = document.createElement('div');
  crownHead.className = 'cart-row-head';
  const crownName = document.createElement('h3');
  crownName.className = 'skin-inscription cart-name';
  crownName.textContent = renderUiText('cart.crown');
  crownHead.append(crownName);
  const crownWhat = document.createElement('p');
  crownWhat.className = 'cart-what';
  crownWhat.textContent = renderUiText('cart.crown.what');
  const crownCost = document.createElement('div');
  crownCost.className = 'cart-cost';
  crownCost.append(coin('silver', CROWN.SILVER));
  const crownWho = document.createElement('ul');
  crownWho.className = 'cart-who';
  const crownReigns = document.createElement('p');
  crownReigns.className = 'cart-reigns';
  crownReigns.hidden = true;
  const crownWhy = document.createElement('p');
  crownWhy.className = 'cart-why';
  crownWhy.hidden = true;
  crownBox.append(crownHead, crownWhat, crownCost, crownReigns, crownWho, crownWhy);
  element.append(crownBox);

  return {
    element,
    update(snapshot: UiSnapshot): void {
      // K-5 · la corona: o dice quién reina, o pone a los candidatos con lo que
      // hace falta para elegir, o dice por qué todavía no.
      const row = crownRow(snapshot.state, TIME.WEEKS_PER_YEAR);
      const refusal = crownRefusal(snapshot.state);
      crownReigns.hidden = row.style === null;
      if (row.style !== null) {
        crownReigns.textContent = row.kingName === null
          ? renderUiText('cart.crown.empty')
          : renderUiText('cart.crown.reigns', { name: row.kingName, year: row.sinceYear ?? 0 });
      }
      crownCost.hidden = row.style !== null;
      const wanted = row.candidates.map((who) => who.id).join(',');
      if (crownWho.dataset.who !== wanted) {
        crownWho.dataset.who = wanted;
        crownWho.replaceChildren();
        for (const who of row.candidates) {
          const item = document.createElement('li');
          item.className = 'cart-who-row';
          const of = document.createElement('div');
          of.className = 'cart-who-of';
          const name = document.createElement('span');
          name.className = 'cart-who-name';
          name.textContent = renderUiText('cart.crown.winters', { name: who.name, age: who.age });
          const lean = document.createElement('span');
          lean.className = 'cart-who-lean';
          lean.textContent = renderUiText(who.styleKey);
          of.append(name, lean);
          if (who.roleKey !== null || who.traitKeys.length > 0) {
            const traits = document.createElement('span');
            traits.className = 'cart-who-traits';
            traits.textContent = [
              ...(who.roleKey === null ? [] : [renderUiText(who.roleKey)]),
              ...who.traitKeys.map((key) => renderUiText(key)),
            ].join(' · ');
            of.append(traits);
          }
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'skin-button--wood cart-give';
          button.textContent = renderUiText('cart.crown.give');
          button.addEventListener('click', () => { actions.crown(who.id); });
          item.append(of, button);
          crownWho.append(item);
        }
      }
      for (const button of crownWho.querySelectorAll('button')) {
        button.disabled = refusal !== null;
      }
      const crownNo = refusal === null || refusal === 'already' || refusal === 'who'
        ? '' : renderUiText(`cart.no.${refusal}`);
      if (crownWhy.textContent !== crownNo) crownWhy.textContent = crownNo;
      crownWhy.hidden = crownNo === '';

      for (const id of MEANS_IDS) {
        const row = rows.get(id);
        if (row === undefined) continue;
        const refusal = refusalFor(snapshot.state as { village: VillageStats } & typeof snapshot.state, id);
        row.give.disabled = refusal !== null;
        // **El motivo, escrito.** Un botón apagado sin razón es un juego que no
        // contesta; es la misma regla que E4 puso en las órdenes («te he
        // entendido y no puedo») y lo único que se conserva de ellas.
        // C4 · **y dicho para la cosa que se pide.** Primero la frase de esa
        // cosa y, si no la tiene, la general: los medios de defensa de C1
        // reutilizan los motivos de los cerdos, así que a quien pedía una
        // segunda puerta se le contestaba «no room in the pen».
        const why = refusal === null ? '' : reasonFor(id, refusal);
        if (row.why.textContent !== why) row.why.textContent = why;
        row.why.hidden = refusal === null;
      }
    },
    dispose(): void { /* nada que soltar: sólo escucha sus propios botones */ },
  };
}
