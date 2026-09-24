// F3d · El cronicón: los valles que ya se acabaron, uno debajo de otro.
//
// **Lo pidió el dueño del diseño** con la premisa del juego en la mano —«un
// idle bonito de mirar de fondo cuya esencia es que cada valle salga
// distinto»—: si cada valle sale distinto, lo que cierra ese bucle es poder
// **verlos juntos**. La fila de `plan-meta.md` lo llamaba «comparar partidas»
// y él eligió, el 19 sep 2026, de qué forma: **las lápidas, una al lado de
// otra**, y el cronicón **empieza vacío y se llena** —sólo entran las partidas
// que acaben, no se inventa nada, y la primera vez se ve una página vacía con
// una línea que lo explica—.
//
// **No guarda nada nuevo y no sube el esquema**, que es lo que lo hace barato:
// el archivo existe desde M-25 (`SaveFile.archive`) con la semilla, el tick
// final, la causa y —desde F3a— el libro de cuentas. Esto es la primera
// pantalla que lo lee entero; hasta hoy sólo se miraba el último para fundar
// el sucesor.
//
// **Y no dibuja ni una pieza nueva.** La lápida es la de F3c (la capitular de
// la causa y la inscripción en versales), el papel es el de la crónica
// (`skin-paper--page`) y el canto y la cruz son los de §7 de la piel. La regla
// de oro de esa skill, literal: antes de crear una pieza, busca la que ya hace
// ese trabajo y **úsala, no la copies**.

import { renderUiText } from '@engine/chronicle/render';
import { ledgerFromChronicle } from '@engine/chronicle/ledger';
import type { ArchivedGame, SaveFile } from '@engine/state';
import { yearOf } from '@engine/time';
import { recogniseGesture } from '../gestures';
import { retireOverlay } from '../motion';
import type { Point } from '../gestures';

const STYLE_ID = 'valley-annals-style';
const STYLE = `
/* F3d · **El cronicón**, vestido como las otras hojas y sin una regla propia
   de color: el papel, el canto y la cruz salen de \`skin.css\`, y lo único que
   esta hoja aporta es **cómo se apilan las lápidas**.

   La lápida de una partida es la de F3c reducida: allí ocupa la pantalla
   entera porque es el final de la tuya; aquí es una entrada de un índice, así
   que la capitular baja de 112 a 56 px y la inscripción se lee en una línea.
   Mismo vocabulario, otro tamaño. */
.annals-scrim { position: fixed; inset: 0; z-index: 14; display: flex;
  flex-direction: column; align-items: center; justify-content: flex-end;
  background: rgba(27, 22, 19, .18);
  color: var(--skin-ink); font-family: var(--skin-font-read); }
.annals-fade { flex: 0 0 48px; width: min(100%, 760px); margin-inline: auto; }
/* **Un mínimo, no un tope** (§4 de la piel). Sin él, el cronicón vacío subía
   como una tira de cuatro dedos con el menú entero asomando encima, y eso se
   lee como un fallo y no como una página: lo enseñó la captura a 390 y a 750,
   y las dos veces igual. Con el mínimo, una página con un valle y una página
   con veinte son la misma hoja. */
.annals { position: relative; box-sizing: border-box; width: min(100%, 760px); margin-inline: auto;
  min-height: min(58vh, 560px); max-height: 100%;
  overflow: auto; padding: 0 20px max(28px, env(safe-area-inset-bottom));
  background-color: var(--skin-page); background-image: var(--skin-map-pattern);
  background-repeat: no-repeat;
  animation: annals-sheet-arrive 280ms cubic-bezier(.2, .75, .25, 1) both; }
.annals > * { box-sizing: border-box; width: 100%; max-width: 390px; margin-inline: auto; }
.annals h1 { margin: 18px auto 4px; text-align: center; text-wrap: balance;
  color: var(--skin-red-ink); font: 600 22px/1.2 var(--skin-font-heading);
  letter-spacing: .02em; text-transform: uppercase; }
.annals-count { margin: 0 auto 18px; text-align: center; color: var(--skin-ink-faded);
  font: 13px/1.4 var(--skin-font-read); }
/* La página vacía: una línea y nada más. No es un hueco que tapar — es lo que
   el dueño del diseño eligió que se viera la primera vez. */
.annals-empty { margin: 32px auto 40px; text-align: center; text-wrap: pretty;
  color: var(--skin-ink-faded); font: 400 16px/1.5 var(--skin-font-voice); }

.annals-stone { display: grid; grid-template-columns: 56px 1fr; gap: 14px;
  align-items: center; margin-bottom: 8px; padding: 12px;
  border: 1px solid var(--skin-rule-on-paper); border-radius: 11px;
  background: var(--skin-parchment);
  box-shadow: 0 2px 0 rgba(32, 55, 64, .12); }
.annals-capital { width: 56px; height: 56px; font-size: 34px; }
.annals-lines { min-width: 0; }
.annals-inscription { margin: 0; color: var(--skin-ink);
  font: 600 14px/1.25 var(--skin-font-heading);
  letter-spacing: .02em; text-transform: uppercase;
  text-wrap: balance; }
.annals-anno { margin: 4px 0 0; color: var(--skin-ink-faded);
  font: 12px/1.3 var(--skin-font-voice); letter-spacing: var(--skin-track-inscription);
  text-transform: uppercase; }
/* Las tres cifras de F3b, en línea. Tabulares porque se comparan en columna:
   es el caso exacto para el que la piel pide \`tabular-nums\` (§4). */
.annals-figures { margin: 6px 0 0; color: var(--skin-ink);
  font: 15px/1.4 var(--skin-font-read); font-variant-numeric: tabular-nums; }

.annals-close { position: absolute; top: 8px; right: 12px; z-index: 2;
  width: auto; max-width: none; margin: 0;
  min-width: var(--ui-tap-min); min-height: var(--ui-tap-min); display: grid; place-items: center;
  padding: 0 14px; border: 1px solid var(--skin-parchment-aged); border-radius: 9px;
  background: var(--skin-parchment); color: var(--skin-ink-soft);
  box-shadow: 0 2px 0 rgba(32, 55, 64, .14);
  font: 700 12px/1 var(--skin-font-voice); letter-spacing: .04em; text-transform: uppercase; cursor: pointer;
  -webkit-tap-highlight-color: transparent; }
.annals-close:hover { border-color: var(--skin-gold); color: var(--skin-ink); }
.annals-close:active { color: var(--skin-ink); transform: translateY(1px); box-shadow: none; }
.annals-close:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }
@keyframes annals-sheet-arrive {
  from { opacity: .7; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .annals, .annals-close:active { animation: none; transform: none; }
}
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

let open: HTMLElement | null = null;

/**
 * Una lápida del índice: la capitular de la causa, su inscripción, el año y el
 * valle, y las tres cifras grandes de la hoja de cuentas (F3b).
 *
 * El libro viaja en el archivo desde F3a; una partida archivada **antes** de
 * F3a no lo lleva y se recuenta de su crónica, igual que hace el epitafio. Es
 * el mismo respaldo y a propósito: dos maneras de leer un archivo viejo serían
 * dos respuestas a la misma pregunta.
 */
function stoneOf(game: ArchivedGame): HTMLElement {
  const row = document.createElement('li');
  row.className = 'annals-stone';

  const capital = document.createElement('div');
  capital.className = 'skin-capital annals-capital';
  capital.setAttribute('aria-hidden', 'true');
  capital.textContent = renderUiText(`epitaph.initial.${game.cause}`);

  const lines = document.createElement('div');
  lines.className = 'annals-lines';
  const inscription = document.createElement('p');
  inscription.className = 'annals-inscription';
  inscription.textContent = renderUiText(`epitaph.inscription.${game.cause}`);
  const anno = document.createElement('p');
  anno.className = 'annals-anno';
  anno.textContent = renderUiText('annals.anno', {
    year: yearOf(game.endedTick),
    seed: game.seed,
  });
  const ledger = game.ledger
    ?? ledgerFromChronicle(game.chronicle, game.endedTick, game.peakPeople);
  // **Sin los años**, aunque sean la cifra más comparable: la línea de arriba
  // ya los dice. `ANNO` va en base 1 —`ABSOLUTE_YEARS` de `render.ts`, que es
  // como la crónica numera los años— y `ledger.years` cuenta los vividos, así
  // que el mismo valle salía con «ANNO 39» y «38 years» dos líneas más abajo.
  // Lo cazó la captura, no una prueba, y es el mismo defecto que F3b le quitó
  // al epitafio.
  const figures = document.createElement('p');
  figures.className = 'annals-figures';
  figures.textContent = renderUiText('annals.figures', {
    peak: ledger.peak,
    built: ledger.built,
  });
  lines.append(inscription, anno, figures);

  row.append(capital, lines);
  return row;
}

/**
 * Abre el cronicón sobre lo que haya, y llama a `onClose` al cerrarse.
 *
 * Recibe el `SaveFile` y no el archivo suelto porque quien lo abre es el menú
 * de inicio, que es una pantalla **anterior** a que el juego exista: no hay
 * `App` a la que pedirle nada. `null` es una partida que nunca se guardó, y se
 * lee igual que un archivo vacío — que es la página vacía.
 */
export function openAnnals(save: SaveFile | null, onClose: () => void): void {
  if (open !== null) return;
  ensureStyle();
  document.documentElement.classList.add('annals-open');

  const scrim = document.createElement('div');
  scrim.className = 'annals-scrim';
  const fade = document.createElement('div');
  fade.className = 'annals-fade';
  fade.setAttribute('aria-hidden', 'true');
  const page = document.createElement('section');
  page.className = 'annals skin-paper skin-paper--page skin-torn-top';

  const close = (): void => {
    if (open === null) return;
    retireOverlay(scrim, page);
    open = null;
    document.documentElement.classList.remove('annals-open');
    onClose();
  };

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'annals-close';
  closeButton.setAttribute('aria-label', renderUiText('app.close'));
  closeButton.textContent = renderUiText('app.close');
  closeButton.addEventListener('click', close);

  const heading = document.createElement('h1');
  heading.textContent = renderUiText('annals.title');
  page.append(closeButton, heading);

  // **Del último al primero**: el archivo se llena por el final, así que lo
  // último que se jugó es lo último de la lista y es lo primero que se quiere
  // ver. Es el mismo orden que la crónica, que empieza por el año de hoy.
  const games = [...(save?.archive ?? [])].reverse();
  if (games.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'annals-empty';
    empty.textContent = renderUiText('annals.empty');
    page.append(empty);
  } else {
    const count = document.createElement('p');
    count.className = 'annals-count';
    count.textContent = renderUiText('annals.count', { count: games.length });
    const list = document.createElement('ul');
    list.className = 'annals-list';
    for (const game of games) list.append(stoneOf(game));
    page.append(count, list);
  }

  // §7 de la piel: se cierra con la cruz **o** deslizando hacia abajo. Las dos
  // cosas, como en las otras secciones.
  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') close();
  });

  scrim.append(fade, page);
  document.body.append(scrim);
  open = scrim;
}
