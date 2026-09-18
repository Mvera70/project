// M-25 · The end of one village and the door into the next. design.md §13.3.

import { renderUiText } from '@engine/chronicle/render';
import { ledgerFromChronicle } from '@engine/chronicle/ledger';
import type { ArchivedGame, Ledger } from '@engine/state';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { openChronicle } from './chronicle';

const STYLE_ID = 'valley-epitaph-style';
const STYLE = `
/* VZ-04b · **El fin de una aldea, vestido como el documento sellado.**

   Era la otra pantalla que seguía sin vestir: un velo de noche al 84 % con las
   tipografías de U-01 y botones de esquina redonda de 10 px, ni una clase de la
   piel. Lo dijo el dueño del diseño con la crónica en la mano: «los fondos que
   hay detrás de los textos, usa siempre el mismo».

   Toma el lenguaje de la encrucijada (UI-V5c), que es la otra superposición de
   §11.2 y la que ya estaba vestida: el valle atenuado y no tapado, la página
   subiendo con su franja de fusión hermana, el sello de lacre a la izquierda de
   un título en tinta roja, y el contenido en la columna de 390 px. Que el fin
   de una aldea y la decisión que la pudo salvar se lean como el mismo documento
   no es casualidad: son las dos cosas que ocupan la pantalla entera. */
.epitaph-scrim { position: fixed; inset: 0; z-index: 12; display: flex;
  flex-direction: column; justify-content: flex-end;
  background: rgba(27, 22, 19, .18);
  color: var(--skin-ink); font-family: var(--skin-font-read); font-size: 15px; }
/* VZ-2 · el hueco por el que se ve el valle. Era una franja de fusión con
   degradado; ahora la transición la hace el canto rasgado de la hoja
   (\`.skin-torn-top\`, \`skin.css\`), el mismo de las tres secciones, y esto
   sólo reserva el sitio. */
.epitaph-fade { flex: 0 0 64px; }
.epitaph { box-sizing: border-box; width: 100%; max-height: 100%; overflow: auto;
  padding: 0 20px max(28px, env(safe-area-inset-bottom));
  background-color: var(--skin-page);
  background-image: var(--skin-parchment-texture);
  background-repeat: repeat; background-size: 256px 256px;
  background-blend-mode: multiply; }
.epitaph > * { box-sizing: border-box; width: 100%; max-width: 390px; margin-inline: auto; }
.epitaph-head { display: flex; align-items: flex-start; gap: 14px; padding-top: 4px; }
.epitaph-head .skin-seal { margin-top: 2px; flex: 0 0 auto; }
.epitaph h1 { margin: 0; flex: 1 1 auto; text-wrap: balance;
  color: var(--skin-red-ink); font: 600 20px/1.2 var(--skin-font-voice);
  letter-spacing: var(--skin-track-inscription); text-transform: uppercase; }
.epitaph p { margin: 14px auto 0; color: var(--skin-ink); text-wrap: pretty;
  font: 17px/1.5 var(--skin-font-read); }
.epitaph-actions { display: grid; gap: 10px; margin-top: 24px; }
/* §11.7 · el área táctil no se rebaja: los botones de la piel ya miden 52. */
.epitaph-open .valley-speeds, .epitaph-open .hud-speed-cluster { visibility: hidden; }

/* F3c · **La lápida.** docs/plan-final.md §1.
 *
 * Lo pidió el dueño del diseño: «una animación de game over que se superponga
 * encima de la pantalla con una letra estilo medieval, siguiendo el estilo que
 * tenemos». El estilo que tenemos es la capitular de la crónica —cuadrado rojo,
 * filete de oro, letra de oro claro— y la inscripción en Cinzel, versales con
 * el espaciado de inscripción. No hace falta una tipografía nueva.
 *
 * Y **no dice «game over»** (decisión 1 del plan): dice la causa y el año. La
 * lápida es el game over.
 */
.epitaph-stone { position: fixed; inset: 0; z-index: 13;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; pointer-events: none;
  /* El valle se atenúa y **no se tapa**: se ve la aldea tal como quedó, que es
     parte de lo que se cuenta. Es el mismo velo de la decisión (§11.2), y
     **más oscuro de lo que estaba**: con .34 la primera captura salió con la
     inscripción en tinta roja sobre tejados claros y no se leía. */
  background: rgba(27, 22, 19, .52); }
/* Y el HUD se va mientras dura la lápida. Un final con la cinta de la fecha y
   la fila de cifras encima no es un final: es una pantalla más. Las clases son
   las que la piel ya posiciona (skin.css, la seccion del HUD). */
.epitaph-stoned .valley-vitals,
.epitaph-stoned .valley-time,
.epitaph-stoned .valley-date,
.epitaph-stoned .hud-plate-date,
.epitaph-stoned .valley-hud-right,
.epitaph-stoned .valley-orders-now { visibility: hidden; }
.epitaph-stone-capital { width: 112px; height: 112px; font-size: 68px;
  animation: epitaph-seal 620ms cubic-bezier(.2, .9, .25, 1) both; }
/* **La inscripción va sobre una banda de pergamino**, que es lo que este juego
   ya hace con el texto que va sobre el valle: la cinta de la fecha de arriba es
   exactamente eso y se lee perfectamente. Lo enseñó la primera captura de F3c
   —tinta roja sobre tejados claros, ilegible— y la arregla el material que ya
   está, no un color nuevo. */
.epitaph-stone-lines { text-align: center; max-width: min(88vw, 520px);
  padding: 14px 22px 16px; border-radius: 2px;
  box-shadow: 0 10px 28px rgba(27, 22, 19, .35); }
.epitaph-stone-inscription, .epitaph-stone-anno {
  margin: 0; color: var(--skin-red-ink); font-family: var(--skin-font-voice);
  letter-spacing: var(--skin-track-inscription); text-transform: uppercase;
  /* El grabado: se descubre de izquierda a derecha, como se talla. */
  clip-path: inset(0 100% 0 0); animation: epitaph-carve 900ms steps(22, end) both; }
.epitaph-stone-inscription { font: 600 clamp(19px, 5.4vw, 30px)/1.25 var(--skin-font-voice);
  text-wrap: balance; animation-delay: 380ms; }
.epitaph-stone-anno { margin-top: 8px; opacity: .82;
  font: 600 clamp(13px, 3.4vw, 16px)/1.3 var(--skin-font-voice);
  animation-delay: 900ms; }

@keyframes epitaph-seal {
  from { transform: scale(1.5); opacity: 0; }
  60%  { transform: scale(.97); opacity: 1; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes epitaph-carve { to { clip-path: inset(0 0 0 0); } }

/* §2.60 · y quien no quiere movimiento lo ve puesto, no puesto poco a poco. */
@media (prefers-reduced-motion: reduce) {
  .epitaph-stone-capital, .epitaph-stone-inscription, .epitaph-stone-anno {
    animation: none; clip-path: none; }
}

/* F3b · **La hoja de cuentas.** docs/plan-final.md §2.
 *
 * Tres cifras grandes que se comparan de un vistazo y debajo la relación larga,
 * como la de un mayordomo: cifras tabulares, filete de oro entre filas y las
 * etiquetas en versalitas. Lo que no se sabe no se enseña.
 */
.epitaph-ledger { margin-top: 22px; }
.epitaph-ledger-head { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; }
.epitaph-ledger-head::before, .epitaph-ledger-head::after {
  content: ''; flex: 1 1 auto; height: 1px; background: var(--skin-gold); opacity: .55; }
.epitaph-ledger-head h2 { margin: 0; flex: 0 0 auto;
  color: var(--skin-ink); font: 600 12px/1 var(--skin-font-voice);
  letter-spacing: var(--skin-track-label); text-transform: uppercase; }
.epitaph-ledger-big { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.epitaph-ledger-big div { text-align: center; }
.epitaph-ledger-big b { display: block;
  font: 600 clamp(26px, 8vw, 34px)/1 var(--skin-font-voice);
  font-variant-numeric: tabular-nums; color: var(--skin-red-ink); }
.epitaph-ledger-big span { display: block; margin-top: 4px;
  font: 400 10.5px/1.25 var(--skin-font-voice); letter-spacing: var(--skin-track-label);
  text-transform: uppercase; color: var(--skin-ink); opacity: .72; }
.epitaph-ledger-rows { margin: 16px 0 0; display: grid;
  grid-template-columns: 1fr 1fr; gap: 0 20px; }
.epitaph-ledger-rows div { display: flex; justify-content: space-between; gap: 8px;
  padding: 3px 0; border-bottom: 1px solid color-mix(in srgb, var(--skin-gold) 42%, transparent);
  font: 13.5px/1.45 var(--skin-font-read); }
.epitaph-ledger-rows dt { margin: 0; opacity: .85; }
.epitaph-ledger-rows dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 600; }
@media (max-width: 400px) {
  .epitaph-ledger-rows { grid-template-columns: 1fr; }
}
`;

let shown: HTMLElement | null = null;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/**
 * F3c · **La lápida**: la capitular y la inscripción, sobre el valle atenuado.
 *
 * Se monta antes que la hoja y se quita cuando la hoja sube: el momento y el
 * documento son dos cosas, y el orden es lo que hace que el final se lea como
 * un final y no como una pantalla más (`docs/plan-final.md` §1).
 */
function raiseStone(game: ArchivedGame): HTMLElement {
  const stone = document.createElement('div');
  stone.className = 'epitaph-stone';
  stone.setAttribute('role', 'status');
  const capital = document.createElement('div');
  capital.className = 'skin-capital epitaph-stone-capital';
  capital.setAttribute('aria-hidden', 'true');
  capital.textContent = renderUiText(`epitaph.initial.${game.cause}`);
  const lines = document.createElement('div');
  lines.className = 'epitaph-stone-lines skin-paper skin-paper--aged';
  const inscription = document.createElement('p');
  inscription.className = 'epitaph-stone-inscription';
  inscription.textContent = renderUiText(`epitaph.inscription.${game.cause}`);
  const anno = document.createElement('p');
  anno.className = 'epitaph-stone-anno';
  anno.textContent = renderUiText('epitaph.inscription.anno', { year: yearOf(game.endedTick) });
  lines.append(inscription, anno);
  stone.append(capital, lines);
  return stone;
}

/** Lo que dura la lápida antes de que suba la hoja, en milisegundos. */
const STONE_MS = 2200;

/**
 * F3b · **La hoja de cuentas**: tres cifras grandes y la relación larga.
 *
 * `null` en una fila es **un dato que falta y no un cero** —una partida
 * archivada antes de F3a no sabe qué quedó en pie— y una fila que falta no se
 * enseña: decir «0 casas» de un valle que tenía dieciséis sería mentir.
 */
function reckoning(ledger: Ledger): HTMLElement {
  const box = document.createElement('div');
  box.className = 'epitaph-ledger';

  const head = document.createElement('div');
  head.className = 'epitaph-ledger-head';
  const title = document.createElement('h2');
  title.textContent = renderUiText('epitaph.ledger.title');
  head.append(title);

  const big = document.createElement('div');
  big.className = 'epitaph-ledger-big';
  for (const key of ['years', 'peak', 'held'] as const) {
    const cell = document.createElement('div');
    const value = document.createElement('b');
    value.textContent = String(key === 'years' ? ledger.years
      : key === 'peak' ? ledger.peak : ledger.raidsHeld);
    const label = document.createElement('span');
    label.textContent = renderUiText(`epitaph.ledger.${key}`);
    cell.append(value, label);
    big.append(cell);
  }

  const rows = document.createElement('dl');
  rows.className = 'epitaph-ledger-rows';
  const ROWS: readonly (keyof Ledger)[] = [
    'born', 'died', 'arrived', 'left',
    'built', 'lostWorks', 'houses', 'wall',
    'decisions', 'given', 'kings', 'stoneYear',
    'raids', 'slain', 'fallen',
  ];
  for (const key of ROWS) {
    const value = ledger[key];
    // La fila que no se sabe no se enseña, y la que es cero **sí**: cero
    // asaltos sufridos es una cifra de la que se presume.
    if (value === null) continue;
    const row = document.createElement('div');
    const name = document.createElement('dt');
    name.textContent = renderUiText(`epitaph.ledger.${key}`);
    const count = document.createElement('dd');
    count.textContent = String(value);
    row.append(name, count);
    rows.append(row);
  }

  box.append(head, big, rows);
  return box;
}

export function openEpitaph(app: App, game: ArchivedGame, beginAgain: () => void): void {
  if (shown !== null) return;
  ensureStyle();
  document.documentElement.classList.add('epitaph-open');
  // F3c · y el HUD se esconde mientras la lápida está puesta.
  document.documentElement.classList.add('epitaph-stoned');
  const scrim = document.createElement('div');
  scrim.className = 'epitaph-scrim';
  const fade = document.createElement('div');
  fade.className = 'epitaph-fade';
  fade.setAttribute('aria-hidden', 'true');
  const card = document.createElement('section');
  card.className = 'epitaph skin-paper skin-paper--page skin-torn-top';
  // El sello a la izquierda del título, como en la decisión: es el otro
  // documento que ocupa la pantalla entera.
  const head = document.createElement('div');
  head.className = 'epitaph-head';
  const seal = document.createElement('div');
  seal.className = 'skin-seal';
  seal.setAttribute('aria-hidden', 'true');
  seal.innerHTML = '<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#seal-tree"/></svg>';
  const heading = document.createElement('h1');
  // B3 · **un valle tomado no está vacío**, y el título no puede decir que lo
  // está: quedan los que no subieron a la muralla. Los otros tres finales sí son
  // un valle que se queda sin nadie (§1b).
  heading.textContent = renderUiText(game.cause === 'stormed'
    ? 'epitaph.title_stormed' : 'epitaph.title');
  head.append(seal, heading);
  const cause = document.createElement('p');
  cause.textContent = renderUiText(`epitaph.${game.cause}`, { year: yearOf(game.endedTick) });
  // F3b · **la línea de resumen se va, y es lo que la primera captura enseñó.**
  // Decía «39 years. 71 people at its height» justo encima de una hoja cuyas
  // dos primeras cifras grandes son 39 y 71: la misma cosa dicha dos veces a
  // dos centímetros de distancia. La clave se queda en el banco —`epitaph.
  // summary`, que es lo que la interfaz de antes de F3b enseñaba— por si algún
  // día hace falta un final sin hoja.
  const actions = document.createElement('div');
  actions.className = 'epitaph-actions';
  const chronicle = document.createElement('button');
  chronicle.type = 'button';
  chronicle.className = 'skin-button skin-button--parchment';
  chronicle.textContent = renderUiText('epitaph.chronicle');
  chronicle.addEventListener('click', () => openChronicle(app));
  const begin = document.createElement('button');
  begin.type = 'button';
  begin.className = 'skin-button skin-button--wood';
  begin.textContent = renderUiText('epitaph.begin');
  begin.addEventListener('click', () => {
    scrim.remove();
    shown = null;
    document.documentElement.classList.remove('epitaph-open');
    beginAgain();
  });
  actions.append(chronicle, begin);
  // F3b · la hoja de cuentas entre la causa y los botones. El libro viaja en el
  // archivo desde F3a; una partida archivada antes de eso se recuenta de su
  // crónica, y lo que no se puede saber sale vacío y no se enseña.
  const ledger = game.ledger
    ?? ledgerFromChronicle(game.chronicle, game.endedTick, game.peakPeople);
  card.append(head, cause, reckoning(ledger), actions);
  scrim.append(fade, card);

  // F3c · **la lápida primero, y la hoja después.** El valle se queda a la
  // vista mientras se graba la inscripción; cuando sube el documento, la lápida
  // se va. Es el orden que pidió el dueño del diseño y el que hace que el final
  // se lea como un final.
  const stone = raiseStone(game);
  document.body.append(stone);
  shown = stone;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raise = (): void => {
    if (shown !== stone) return;      // ya se cerró por otro camino
    stone.remove();
    document.documentElement.classList.remove('epitaph-stoned');
    document.body.append(scrim);
    shown = scrim;
  };
  if (reduce) raise();
  else window.setTimeout(raise, STONE_MS);
}
