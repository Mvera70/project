// U-08 · The people screen, full screen. design.md §11.2, §17 U-08.
//
// The list of the named living: name, age, trade if they have one, and their
// traits as words — never the raw identifier (CLAUDE.md: `hot_tempered` is
// not shown to anyone). Tapping a row opens the same ficha §11.2 already
// composes for a villager, `panelFor` (`src/ui/inspect.ts`): this screen
// reuses it instead of writing a second one.
//
// Same skin as the chronicle (`screens/chronicle.ts` is the model), same way
// of mounting and closing: a full-screen scrim over `document.body`, swipe
// down to close. Its body swaps between the list and a ficha, the way the
// chronicle's body swaps between valleys, so closing always means the same
// gesture regardless of which of the two is on screen.

import { renderUiText } from '@engine/chronicle/render';
import { isHere } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import type { Villager } from '@engine/state';
import type { App } from '../app';
import { panelFor } from '../inspect';
import { recogniseGesture, type Point } from '../gestures';

const STYLE_ID = 'valley-people-style';
const STYLE = `
.people-scrim { position: fixed; inset: 0; z-index: 13; overflow: auto; box-sizing: border-box;
  /* El hueco de abajo es para la barra de destinos, que se queda encima: sin
     él, la última ficha de la lista quedaba debajo de ella. */
  padding: max(20px, env(safe-area-inset-top)) 20px calc(74px + env(safe-area-inset-bottom));
  background: var(--night, #1a1511); color: var(--parchment, #f2e9d8); font: 14px/1.4 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif); }
.people-scrim h2 { margin: 0 0 14px; font: 600 15px/1.2 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); color: var(--gild-lit, #c9ab6b); }
.people-row { display: block; box-sizing: border-box; width: 100%; min-height: 44px; margin: 0 0 8px; padding: 9px 12px;
  border: 1px solid #3a3226; border-radius: 8px; background: var(--night-soft, #262019); color: var(--parchment, #f2e9d8);
  font: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.people-row:active { background: #322a20; }
.people-row b { display: block; font: 600 15px/1.2 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); }
.people-row span { display: block; margin-top: 2px; color: var(--paper-dim, #d9cfbc); font-size: 12px; line-height: 1.4; }
.people-empty { margin: 0; color: var(--paper-dim, #d9cfbc); }
/* U-14 · **La salida, visible.** Las dos pantallas se cerraban sólo deslizando
   hacia abajo, y el velo tapaba la barra de destinos: quien entraba a ver a los
   aldeanos o la crónica se quedaba dentro. Lo dijo el dueño del diseño el 15
   sep 2026: «no hay forma de volver atrás». Ahora hay un botón y la barra de
   abajo sigue a la vista, que es lo que un dedo espera de una barra de
   pestañas. El deslizamiento se queda: era correcto, sólo estaba solo. */
.people-close { position: sticky; top: 0; float: right; min-height: 40px; margin: -4px -6px 0 8px;
  padding: 6px 12px; border: 1px solid #756c55; border-radius: 8px; background: var(--night-soft, #262019);
  color: var(--gild-lit, #c9ab6b); font: 600 13px/1 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif);
  cursor: pointer; -webkit-tap-highlight-color: transparent; }
.people-close:active { background: #322a20; }
.people-back { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 44px; margin: 0 0 16px;
  padding: 0 14px; border: 1px solid #756c55; border-radius: 8px; background: var(--night-soft, #262019);
  color: var(--gild-lit, #c9ab6b); font: 600 13px/1 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif);
  cursor: pointer; -webkit-tap-highlight-color: transparent; }
.people-detail h3 { margin: 0 0 8px; text-transform: capitalize; color: var(--parchment, #f2e9d8);
  font: 600 21px/1.2 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); text-wrap: balance; }
.people-detail p { margin: 4px 0; color: var(--paper-dim, #d9cfbc); }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/** The named living, in the order the engine keeps them — no ranking invented here. */
function namedLiving(app: App): Villager[] {
  return app.state().people.villagers.filter((v) => v.named && isHere(v));
}

/** A trade word if the villager has one, in the same voice as a trait: lowercase, no sentence. */
function tradeLine(v: Villager): string | null {
  return v.role === null ? null : renderUiText(`role.${v.role}`);
}

function traitsLine(v: Villager): string {
  return v.traits.length > 0
    ? v.traits.map((trait) => renderUiText(`trait.${trait}`)).join(', ')
    : renderUiText('inspect.traits.none');
}

let open: HTMLElement | null = null;
/** A quién avisar cuando esta pantalla se cierre, se cierre como se cierre. */
let closed: (() => void) | null = null;

/** Cierra la pantalla si está abierta. La barra de destinos la usa (U-14). */
export function closePeople(): void {
  open?.remove();
  open = null;
  const tell = closed;
  closed = null;
  tell?.();
}

export function openPeople(app: App, onClose?: () => void): void {
  if (open !== null) return;
  ensureStyle();
  closed = onClose ?? null;
  const scrim = document.createElement('div');
  scrim.className = 'people-scrim';

  const body = document.createElement('div');
  body.className = 'people-body';

  const renderList = (): void => {
    const villagers = namedLiving(app);
    const heading = document.createElement('h2');
    heading.textContent = renderUiText('nav.people');
    body.replaceChildren(heading);
    if (villagers.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'people-empty';
      empty.textContent = renderUiText('people.empty');
      body.append(empty);
      return;
    }
    const state = app.state();
    for (const v of villagers) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'people-row';
      const name = document.createElement('b');
      name.textContent = v.name;
      const trade = tradeLine(v);
      const stats = document.createElement('span');
      stats.textContent = trade === null
        ? renderUiText('inspect.age', { age: ageOf(v, state.tick) })
        : `${renderUiText('inspect.age', { age: ageOf(v, state.tick) })} — ${trade}`;
      const traits = document.createElement('span');
      traits.textContent = traitsLine(v);
      row.append(name, stats, traits);
      row.addEventListener('click', () => renderDetail(v.id));
      body.append(row);
    }
  };

  const renderDetail = (id: number): void => {
    const model = panelFor({ kind: 'villager', id }, app.state());
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'people-back';
    back.textContent = renderUiText('people.back');
    back.addEventListener('click', renderList);
    const detail = document.createElement('div');
    detail.className = 'people-detail';
    const heading = document.createElement('h3');
    heading.textContent = model.title;
    detail.append(heading, ...model.lines.map((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      return p;
    }));
    body.replaceChildren(back, detail);
  };

  renderList();
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'people-close';
  close.textContent = renderUiText('app.close');
  close.addEventListener('click', closePeople);
  scrim.append(close, body);

  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') closePeople();
  });

  document.body.append(scrim);
  open = scrim;
}
