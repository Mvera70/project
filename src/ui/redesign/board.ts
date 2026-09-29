// §7.15 · La ventana del tablón de misiones (28 sep 2026).
//
// Vera: «al pulsar sobre el cartel se abrirá un pop up de una pantalla
// imitando una UI de un cartel de madera. Esta mecánica de tener objetos que al
// pulsar abren un menú de UI del objeto relacionado será como lo haremos con
// muchas cosas, así no invadimos la UI hasta que pulsamos».
//
// **La madera significa «aquí se decide algo»** (opción B1 de
// https://claude.ai/artifact/CJ4i9oGim8mQZnJ6s7RPxT): la ventana es un tablón
// con avisos de pergamino clavados, uno por misión, con cuántos van (− y +) y
// el botón verde de actuar de toda la piel. Lo que sólo se lee no se viste así.
//
// El jugador dice **cuántos**; quiénes, la aldea (`engine/world/expeditions.ts`).
// El panel no decide si se puede: repite lo que dice el motor (`missionsOpen`)
// para pintarse, con el motivo escrito cuando no.

import { renderUiText } from '@engine/chronicle/render';
import { TIME } from '@engine/balance';
import type { MissionId } from '@engine/state';
import { missionsOpen, outNow, type MissionOpen } from '@engine/world/expeditions';
import type { UiActions, UiPanel, UiSnapshot } from './contracts';
// **Las imágenes de la piel, importadas y no por token.** En el sitio publicado
// los tokens de `tokens.css` son URL relativas a `assets/`, y Chrome resuelve
// una `var()` con URL donde se usa: en una hoja inyectada en el documento
// apuntan a la raíz y dan 404 (auditoría de Codex, 29 sep 2026: seis texturas
// del tablón perdidas, «los papeles y las tablas desaparecen»). El bundle
// local las incrusta y por eso nunca se vio. Importadas desde el módulo, Vite
// escribe la dirección buena; los tokens se redeclaran aquí con ellas.
import woodBoard from './wood-board.png';
import btnClose from './btn-close.png';
import frameParchment from './frame-parchment.png';
import nail from './nail.png';
import nailBent from './nail-bent.png';
import chipCost from './chip-cost.png';
import resSilver from './res-silver.png';

const STYLE_ID = 'valley-board-style';

const CSS = `
.valley-board-veil { --wood-board: url(${woodBoard}); --btn-close: url(${btnClose}); --frame-parchment: url(${frameParchment});
  --nail: url(${nail}); --nail-bent: url(${nailBent}); --chip-cost: url(${chipCost}); --res-silver: url(${resSilver}); }
/* Entre la cabecera y la barra, como en la lámina v8: ni tapa las cifras ni la
   navegación. --ui-hud-height lo publica la cabecera (hud.ts). */
.valley-board-veil { position: fixed; inset: 0; z-index: 20; display: grid; place-items: start center;
  padding: calc(var(--ui-hud-height, 104px) + 10px) 12px calc(86px + env(safe-area-inset-bottom, 0px));
  background: rgba(20, 12, 6, .42); animation: valley-board-in .18s ease-out; }
@keyframes valley-board-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .valley-board-veil { animation: none; } }
.valley-board { position: relative; width: min(100%, 390px); max-height: 100%; box-sizing: border-box; overflow-y: auto;
  display: flex; flex-direction: column; gap: 16px; padding: 44px 14px 16px; border-radius: 6px;
  /* la madera de la tabla de arriba: la misma textura, no un degradado */
  background-color: #4a2f1c; background-image: var(--wood-board); background-size: 256px 256px;
  border: 3px solid var(--wood-plank-deep);
  box-shadow: 0 18px 40px rgba(0,0,0,.55), inset 0 0 0 2px rgba(201,162,74,.35); }
.valley-board-title { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); margin: 0;
  padding: 7px 16px; border-radius: 2px; background: var(--card); color: var(--skin-ink);
  box-shadow: 0 2px 0 var(--wood-plank-deep); white-space: nowrap;
  font: 700 13px/1 var(--skin-font-display); letter-spacing: .18em; text-transform: uppercase; }
/* v7 · el aro de madera con el aspa tallada: toque de 44, dibujo de 32 */
.valley-board-close { position: absolute; right: 6px; top: 4px; width: 44px; height: 44px; border: 0; cursor: pointer;
  font-size: 0; color: transparent; background: var(--btn-close) center / 32px 32px no-repeat; }
.valley-board-close:active { transform: translateY(1px); }
/* v6/v7 · el aviso es la tarjeta de pergamino rasgado (nueve partes), con su
   clavo y la ilustración de lo que se va a buscar asomando junto al título. */
.valley-note { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 6px 6px 8px;
  color: var(--skin-ink); border: var(--frame-parchment-edge) solid transparent;
  border-image: var(--frame-parchment) var(--frame-parchment-slice) fill stretch;
  filter: drop-shadow(0 3px 4px rgba(20,12,6,.45)); }
.valley-note:nth-of-type(odd) { transform: rotate(-.35deg); }
.valley-note:nth-of-type(even) { transform: rotate(.3deg); }
.valley-note-nail { position: absolute; left: calc(50% - 10px); top: -38px; width: 20px; height: 20px;
  background: var(--nail) center / contain no-repeat; }
.valley-note:nth-of-type(even) .valley-note-nail { background-image: var(--nail-bent); }
.valley-note-art { position: absolute; right: -3px; top: -20px; width: 56px; height: 48px; object-fit: contain;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,.25)); }
.valley-note-name { margin: 0; min-height: 30px; padding-right: 61px; font: 700 14px/1.2 var(--skin-font-display); letter-spacing: .04em; }
.valley-note-what { margin: 0; color: var(--skin-ink-faded); font: italic 400 15px/1.35 var(--skin-font-voice); }
.valley-note-facts { margin: 0; color: var(--skin-ink-soft); font: 600 14px/1.3 var(--skin-font-voice);
  font-variant-numeric: tabular-nums; }
.valley-note-risk { color: var(--want); }
.valley-note-facts { display: flex; align-items: center; flex-wrap: nowrap; white-space: nowrap; gap: 5px; }
.valley-cost-chip { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 4px; box-sizing: border-box;
  border: 8px solid transparent; border-image: var(--chip-cost) var(--chip-cost-slice) fill stretch; border-image-width: 14px;
  color: var(--skin-ink); font: 700 15px/1 var(--skin-font-display); }
.valley-cost-chip:not(.free)::before { content: ''; width: 18px; height: 18px; flex: 0 0 18px;
  background-image: var(--res-silver); background-position: center; background-size: contain; background-repeat: no-repeat; }
.valley-note-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.valley-step { display: flex; align-items: center; gap: 6px; }
.valley-step button { width: 40px; height: 40px; padding: 0; color: #3d3020; font: 700 22px/1 var(--skin-font-voice); cursor: pointer;
  border: 8px solid transparent; border-image: var(--chip-cost) var(--chip-cost-slice) fill stretch; border-image-width: 14px; background: none; }
.valley-step button[disabled] { opacity: .35; cursor: default; }
.valley-step output { min-width: 18px; text-align: center; font: 700 16px/1 var(--skin-font-display); }
.valley-note-send { min-height: var(--ui-tap-min); padding: 0 16px; }
.valley-note-why { margin: 0; color: var(--skin-ink-faded); font: 400 14px/1.35 var(--skin-font-voice); }
.valley-board-away, .valley-board-empty { margin: 0; color: var(--card); text-align: center;
  font: italic 400 15px/1.4 var(--skin-font-voice); }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

/** Cuántos quiere mandar el jugador a cada misión, mientras el tablón está abierto. */
const wanted = new Map<MissionId, number>();

function riskKey(open: MissionOpen): string {
  const death = open.spec.death;
  return death === 0 ? 'board.risk.none' : death < 0.05 ? 'board.risk.low' : 'board.risk.high';
}

export function boardPanel(actions: UiActions): UiPanel {
  ensureStyle();
  const element = document.createElement('div');
  element.className = 'valley-board-veil';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-label', renderUiText('board.title'));
  // Tocar fuera del tablón lo cierra: la ventana es del objeto, no de la
  // pantalla. Con `pointerdown` y no `click`: el toque que abre el tablón se
  // reconoce al levantar el dedo, y el `click` de ese mismo toque caía después
  // sobre el velo recién puesto y lo cerraba al instante (medido con
  // `shot.mjs --open board`: se abría y no se veía).
  element.addEventListener('pointerdown', (event) => {
    if (event.target === element) actions.navigate({ kind: 'valley' });
  });
  const board = document.createElement('section');
  board.className = 'valley-board';
  element.append(board);
  let last: UiSnapshot | null = null;

  const paint = (snapshot: UiSnapshot): void => {
    last = snapshot;
    const { state } = snapshot;
    const title = document.createElement('h2');
    title.className = 'valley-board-title';
    title.textContent = renderUiText('board.title');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'valley-board-close';
    close.textContent = renderUiText('board.close');
    close.addEventListener('click', () => actions.navigate({ kind: 'valley' }));
    const nodes: HTMLElement[] = [title, close];
    const open = missionsOpen(state);
    if (open.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'valley-board-empty';
      empty.textContent = renderUiText('board.empty');
      nodes.push(empty);
    }
    for (const mission of open) {
      const note = document.createElement('article');
      note.className = 'valley-note';
      note.dataset['mission'] = mission.id;
      // v6 · el clavo y la ilustración a color de lo que se va a buscar
      // (`public/ui/art/cards/mission-*.png`), asomando junto al título.
      const nail = document.createElement('span');
      nail.className = 'valley-note-nail';
      const art = document.createElement('img');
      art.className = 'valley-note-art';
      art.alt = '';
      art.src = `./ui/art/cards/mission-${mission.id.replace('_', '-')}.png`;
      note.append(nail, art);
      const name = document.createElement('h3');
      name.className = 'valley-note-name';
      name.textContent = renderUiText(`mission.${mission.id}.name`);
      const what = document.createElement('p');
      what.className = 'valley-note-what';
      what.textContent = renderUiText(`mission.${mission.id}.what`);
      const facts = document.createElement('p');
      facts.className = 'valley-note-facts';
      const weeks = renderUiText(mission.spec.weeks === 1 ? 'board.weeks.one' : 'board.weeks.many', { count: mission.spec.weeks });
      // v7 · el coste en su ficha (pastilla de imagen, moneda a color), como la
      // lámina: «Free» también va en la suya.
      const cost = document.createElement('span');
      cost.className = mission.spec.silver === 0 ? 'valley-cost-chip free' : 'valley-cost-chip';
      cost.textContent = mission.spec.silver === 0 ? renderUiText('board.free') : String(mission.spec.silver);
      cost.setAttribute('aria-label', mission.spec.silver === 0 ? renderUiText('board.free') : renderUiText('board.silver', { silver: mission.spec.silver }));
      const risk = document.createElement('span');
      risk.className = mission.spec.death >= 0.05 ? 'valley-note-risk' : '';
      risk.textContent = renderUiText(riskKey(mission));
      facts.append(`${weeks} · `, cost, ' · ', risk);
      note.append(name, what, facts);
      if (mission.refusal === null) {
        const low = mission.spec.people[0];
        const count = Math.max(low, Math.min(mission.most, wanted.get(mission.id) ?? low));
        const foot = document.createElement('div');
        foot.className = 'valley-note-foot';
        const step = document.createElement('div');
        step.className = 'valley-step';
        const less = document.createElement('button');
        less.type = 'button';
        less.textContent = '−';
        less.setAttribute('aria-label', renderUiText('board.fewer'));
        less.disabled = count <= low;
        const shown = document.createElement('output');
        shown.textContent = String(count);
        const more = document.createElement('button');
        more.type = 'button';
        more.textContent = '+';
        more.setAttribute('aria-label', renderUiText('board.more'));
        more.disabled = count >= mission.most;
        less.addEventListener('click', () => { wanted.set(mission.id, count - 1); if (last !== null) update(last); });
        more.addEventListener('click', () => { wanted.set(mission.id, count + 1); if (last !== null) update(last); });
        step.append(less, shown, more);
        const send = document.createElement('button');
        send.type = 'button';
        send.className = 'skin-button skin-button--wood valley-note-send';
        send.textContent = renderUiText('board.send');
        send.addEventListener('click', () => {
          wanted.delete(mission.id);
          actions.expedition(mission.id, count);
        });
        foot.append(step, send);
        note.append(foot);
      } else {
        const why = document.createElement('p');
        why.className = 'valley-note-why';
        why.textContent = renderUiText(`board.why.${mission.refusal}`);
        note.append(why);
      }
      nodes.push(note);
    }
    // Quién está fuera y cuándo vuelve.
    for (const trip of outNow(state)) {
      const away = document.createElement('p');
      away.className = 'valley-board-away';
      const names = trip.who.map((id) => state.people.villagers.find((v) => v.id === id)?.name ?? '').filter((n) => n !== '');
      const weeks = Math.max(0, trip.dueTick - state.tick);
      away.textContent = renderUiText('board.away', {
        place: renderUiText(`mission.${trip.mission}.name`),
        names: names.length <= 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`,
        days: Math.max(1, weeks * TIME.DAYS_PER_WEEK),
      });
      nodes.push(away);
    }
    board.replaceChildren(...nodes);
  };

  /** Sólo se repinta si algo de lo que se enseña ha cambiado. */
  let key = '';
  const update = (snapshot: UiSnapshot): void => {
    const { state } = snapshot;
    const next = `${state.tick}:${state.expeditions.length}:${Math.floor(state.village.silver)}:${[...wanted].join(',')}`;
    if (next === key && last !== null) { last = snapshot; return; }
    key = next;
    paint(snapshot);
  };

  return {
    element,
    update,
    dispose(): void { element.remove(); },
  };
}
