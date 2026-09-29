// La pantalla de opciones gráficas, desde la portada (29 sep 2026).
//
// Vera, con la tablet a 0 fps: «estaría bien en el menú principal añadir un
// botón para abrir un menú de opciones gráficas». Es un documento —papel =
// leer— con dos preguntas, y cada respuesta elegida va en la placa de madera:
// madera = decidir. Se abre encima de la portada y al cerrarse devuelve el
// foco, como el cronicón: no hay ruta. Lo elegido se guarda en el aparato
// (`graphics-settings.ts`) y **se aplica al abrir el valle**, porque el
// suavizado y el contexto WebGL se deciden al crear el renderer; la nota de
// abajo lo dice.

import { renderUiText } from '@engine/chronicle/render';
import { retireOverlay } from '../motion';
import { readGraphicsSettings, writeGraphicsSettings } from '../graphics-settings';
import type { FrameRateChoice, GraphicsSettings, QualityChoice } from '../../render3d/profile';

const STYLE_ID = 'valley-graphics-style';
const STYLE = `
.graphics-scrim { position: fixed; inset: 0; z-index: 14; display: flex;
  flex-direction: column; align-items: center; justify-content: flex-end;
  background: rgba(27, 22, 19, .18);
  color: var(--skin-ink); font-family: var(--skin-font-read); }
.graphics-fade { flex: 0 0 48px; width: min(100%, 760px); margin-inline: auto; }
.graphics { position: relative; box-sizing: border-box; width: min(100%, 760px); margin-inline: auto;
  min-height: min(58vh, 560px); max-height: 100%;
  overflow: auto; padding: 0 20px max(28px, env(safe-area-inset-bottom));
  /* v9 · el papel de documento, como la encrucijada y los anales. */
  background-color: #efe0c0; background-image: var(--paper-document);
  background-size: 512px 512px; background-repeat: repeat;
  animation: graphics-sheet-arrive 280ms cubic-bezier(.2, .75, .25, 1) both; }
.graphics > * { box-sizing: border-box; width: 100%; max-width: 390px; margin-inline: auto; }
.graphics h1 { margin: 18px auto 4px; text-align: center; text-wrap: balance;
  color: #2B1A0E; font: 700 22px/1.2 var(--skin-font-display);
  letter-spacing: .02em; }
.graphics-note { margin: 0 auto 16px; text-align: center; color: var(--skin-ink-faded);
  font: 400 14px/1.4 var(--skin-font-voice); text-wrap: pretty; }
.graphics-group { margin: 0 auto 14px; }
.graphics-group h2 { margin: 0 0 8px; color: var(--skin-ink);
  font: 600 15px/1.2 var(--skin-font-heading); letter-spacing: .02em; }
/* Dos por fila: cuatro calidades en dos filas iguales, y no tres y una. */
.graphics-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.graphics-options button { min-height: var(--ui-tap-min); padding: 8px 6px; cursor: pointer;
  font: 600 13px/1.2 var(--skin-font-voice); text-wrap: balance; }
.graphics-options button:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }
.graphics-done { margin-top: 10px; width: 100%; }
@keyframes graphics-sheet-arrive {
  from { opacity: .7; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) { .graphics { animation: none; } }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

const QUALITIES: readonly QualityChoice[] = ['auto', 'high', 'medium', 'low'];
const FRAME_RATES: readonly FrameRateChoice[] = [30, 60];

let open: HTMLElement | null = null;

/** Abre la pantalla encima de lo que haya; `onClose` recupera el foco. */
export function openGraphics(onClose: () => void): void {
  if (open !== null) return;
  ensureStyle();
  document.documentElement.classList.add('graphics-open');
  let settings: GraphicsSettings = readGraphicsSettings();

  const scrim = document.createElement('div');
  scrim.className = 'graphics-scrim';
  const fade = document.createElement('div');
  fade.className = 'graphics-fade';
  fade.setAttribute('aria-hidden', 'true');
  const page = document.createElement('section');
  page.className = 'graphics skin-paper skin-paper--page skin-torn-top';
  page.setAttribute('role', 'dialog');
  page.setAttribute('aria-modal', 'true');

  const close = (): void => {
    if (open === null) return;
    retireOverlay(scrim, page);
    open = null;
    document.documentElement.classList.remove('graphics-open');
    document.removeEventListener('keydown', onKey);
    onClose();
  };
  const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  const heading = document.createElement('h1');
  heading.textContent = renderUiText('graphics.title');
  page.setAttribute('aria-label', heading.textContent);
  const note = document.createElement('p');
  note.className = 'graphics-note';
  note.textContent = renderUiText('graphics.note');

  // Cada pregunta: un grupo de botones, y el elegido en la placa de madera.
  const group = <T extends string | number>(
    key: string, choices: readonly T[], current: () => T, label: (choice: T) => string, pick: (choice: T) => void,
  ): HTMLElement => {
    const wrap = document.createElement('div');
    wrap.className = 'graphics-group';
    const title = document.createElement('h2');
    title.id = `graphics-${key}`;
    title.textContent = renderUiText(`graphics.${key}`);
    const row = document.createElement('div');
    row.className = 'graphics-options';
    row.setAttribute('role', 'radiogroup');
    row.setAttribute('aria-labelledby', title.id);
    const buttons = choices.map((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset['choice'] = String(choice);
      button.setAttribute('role', 'radio');
      button.textContent = label(choice);
      button.addEventListener('click', () => { pick(choice); paint(); });
      row.append(button);
      return { choice, button };
    });
    const paint = (): void => {
      for (const { choice, button } of buttons) {
        const on = choice === current();
        button.className = on ? 'skin-button skin-button--wood' : 'skin-button skin-button--parchment';
        button.setAttribute('aria-checked', on ? 'true' : 'false');
      }
    };
    paint();
    wrap.append(title, row);
    return wrap;
  };

  const quality = group('quality', QUALITIES, () => settings.quality,
    (choice) => renderUiText(`graphics.quality.${choice}`),
    (choice) => { settings = { ...settings, quality: choice }; writeGraphicsSettings(settings); });
  const frameRate = group('frame_rate', FRAME_RATES, () => settings.frameRate,
    (choice) => renderUiText(`graphics.frame_rate.${choice}`),
    (choice) => { settings = { ...settings, frameRate: choice }; writeGraphicsSettings(settings); });

  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'graphics-done skin-button skin-button--wood';
  done.textContent = renderUiText('graphics.done');
  done.addEventListener('click', close);

  page.append(heading, note, quality, frameRate, done);
  scrim.append(fade, page);
  scrim.addEventListener('click', (event) => { if (event.target === scrim || event.target === fade) close(); });
  document.body.append(scrim);
  open = scrim;
  done.focus();
}
