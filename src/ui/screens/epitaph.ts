// M-25 · The end of one village and the door into the next. design.md §13.3.

import { renderUiText } from '@engine/chronicle/render';
import type { ArchivedGame } from '@engine/state';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { openChronicle } from './chronicle';

const STYLE_ID = 'valley-epitaph-style';
const STYLE = `
.epitaph-scrim { position: fixed; inset: 0; z-index: 12; display: flex; align-items: flex-end;
  background: rgba(18,17,14,.78); color: #f2f4f6; font: 14px/1.4 system-ui, sans-serif; }
.epitaph { box-sizing: border-box; width: 100%; padding: max(24px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom)); }
.epitaph h1 { margin: 0 0 12px; font: 600 23px/1.2 Georgia, serif; }
.epitaph p { margin: 6px 0; color: #d7dadd; }
.epitaph-actions { display: grid; gap: 10px; margin-top: 22px; }
.epitaph-actions button { min-height: 48px; padding: 12px 14px; border: 1px solid rgba(242,244,246,.4);
  border-radius: 10px; background: rgba(242,244,246,.1); color: inherit; font: 600 15px/1.2 Georgia, serif; }
.epitaph-actions button:last-child { background: #d8c574; color: #242016; border-color: #d8c574; }
.epitaph-open .valley-speeds { visibility: hidden; }
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
  const card = document.createElement('section');
  card.className = 'epitaph';
  const heading = document.createElement('h1');
  heading.textContent = renderUiText('epitaph.title');
  const cause = document.createElement('p');
  cause.textContent = renderUiText(`epitaph.${game.cause}`, { year: yearOf(game.endedTick) + 1 });
  const summary = document.createElement('p');
  summary.textContent = renderUiText('epitaph.summary', {
    years: yearOf(game.endedTick),
    peak: game.peakPeople,
  });
  const actions = document.createElement('div');
  actions.className = 'epitaph-actions';
  const chronicle = document.createElement('button');
  chronicle.type = 'button';
  chronicle.textContent = renderUiText('epitaph.chronicle');
  chronicle.addEventListener('click', () => openChronicle(app));
  const begin = document.createElement('button');
  begin.type = 'button';
  begin.textContent = renderUiText('epitaph.begin');
  begin.addEventListener('click', () => {
    scrim.remove();
    shown = null;
    document.documentElement.classList.remove('epitaph-open');
    beginAgain();
  });
  actions.append(chronicle, begin);
  card.append(heading, cause, summary, actions);
  scrim.append(card);
  document.body.append(scrim);
  shown = scrim;
}
