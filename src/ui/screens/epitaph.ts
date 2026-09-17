// M-25 · The end of one village and the door into the next. design.md §13.3.

import { renderUiText } from '@engine/chronicle/render';
import type { ArchivedGame } from '@engine/state';
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
.epitaph-fade { flex: 0 0 64px;
  background: linear-gradient(to bottom, transparent 0, var(--skin-page) 100%); }
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
`;

let shown: HTMLElement | null = null;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

export function openEpitaph(app: App, game: ArchivedGame, beginAgain: () => void): void {
  if (shown !== null) return;
  ensureStyle();
  document.documentElement.classList.add('epitaph-open');
  const scrim = document.createElement('div');
  scrim.className = 'epitaph-scrim';
  const fade = document.createElement('div');
  fade.className = 'epitaph-fade';
  fade.setAttribute('aria-hidden', 'true');
  const card = document.createElement('section');
  card.className = 'epitaph skin-paper skin-paper--page';
  // El sello a la izquierda del título, como en la decisión: es el otro
  // documento que ocupa la pantalla entera.
  const head = document.createElement('div');
  head.className = 'epitaph-head';
  const seal = document.createElement('div');
  seal.className = 'skin-seal';
  seal.setAttribute('aria-hidden', 'true');
  seal.innerHTML = '<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#seal-tree"/></svg>';
  const heading = document.createElement('h1');
  heading.textContent = renderUiText('epitaph.title');
  head.append(seal, heading);
  const cause = document.createElement('p');
  cause.textContent = renderUiText(`epitaph.${game.cause}`, { year: yearOf(game.endedTick) });
  const summary = document.createElement('p');
  summary.textContent = renderUiText('epitaph.summary', {
    years: yearOf(game.endedTick),
    peak: game.peakPeople,
  });
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
  card.append(head, cause, summary, actions);
  scrim.append(fade, card);
  document.body.append(scrim);
  shown = scrim;
}
