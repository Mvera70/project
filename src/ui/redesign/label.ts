// A1 · La etiqueta de pergamino junto a la cosa tocada (29 sep 2026).
//
// Vera, 28 sep 2026: la información que sale al tocar un edificio o a alguien
// «debe sustituirse por una ventana con popup y algún estilo para todo lo
// genérico», sin mezclarlo con lo que se usa (el tablón). Es la opción A1 de
// las maquetas: **papel = leer**. Un pergamino pequeño, con su punta hacia la
// cosa, que sigue a la cosa cuando la cámara se mueve (`place`) y se cierra
// tocando fuera —que en el valle es tocar otra cosa o el suelo, y eso ya lo
// hace `app.ts` con cada toque—. Sustituye a la hoja que tapaba medio valle.
//
// Lo que dice lo decide `panelFor` (`../inspect.ts`), como antes: aquí sólo
// cambia el papel. La ficha larga de una persona sigue existiendo desde la
// lista de la gente (`inspect-panel.ts`).

import { panelFor, type InspectTarget } from '../inspect';
import type { UiActions, UiPanel, UiSnapshot } from './contracts';

const STYLE_ID = 'valley-label-style';

/** TUNE: el ancho del papel y lo que sube sobre el punto de la cosa, en px CSS. */
const WIDTH = 300;
const LIFT = 14;

const CSS = `
.valley-label { position: absolute; z-index: 18; width: min(${WIDTH}px, calc(100% - 32px)); left: 16px; top: 120px;
  box-sizing: border-box; padding: 4px 6px 6px; color: var(--skin-ink);
  border: var(--frame-parchment-edge) solid transparent;
  border-image: var(--frame-parchment) var(--frame-parchment-slice) fill stretch;
  filter: drop-shadow(0 5px 10px rgba(20, 12, 6, .45)); pointer-events: none;
  transition: left .12s ease-out, top .12s ease-out; }
@media (prefers-reduced-motion: reduce) { .valley-label { transition: none; } }
.valley-label[hidden] { display: none; }
/* La punta: un rombo del mismo papel, debajo o encima según dónde quepa. */
.valley-label::after { content: ''; position: absolute; left: var(--label-tip, 50%); bottom: -20px; width: 14px; height: 14px;
  margin-left: -7px; background: #efe4cb; transform: rotate(45deg); box-shadow: 2px 2px 3px rgba(0,0,0,.18); }
.valley-label.below::after { bottom: auto; top: -20px; box-shadow: -2px -2px 3px rgba(0,0,0,.12); }
.valley-label h3 { margin: 0 0 4px; font: 700 15px/1.2 var(--skin-font-display); letter-spacing: .03em; }
.valley-label p { margin: 0; font: 400 16px/1.3 var(--skin-font-story); color: #4a3a2a; }
.valley-label p + p { margin-top: 3px; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

export interface LabelPanel extends UiPanel {
  /**
   * Coloca el papel junto al punto de pantalla de la cosa (px CSS del lienzo),
   * dentro de `bounds` (ancho y alto del lienzo). Sin punto —la cosa no está
   * en la escena— se queda donde estaba.
   */
  place(point: { x: number; y: number } | null, bounds: { width: number; height: number }): void;
}

export function labelPanel(_actions: UiActions, target: InspectTarget): LabelPanel {
  ensureStyle();
  const element = document.createElement('section');
  element.className = 'valley-label';
  element.setAttribute('role', 'note');
  const title = document.createElement('h3');
  const lines = document.createElement('div');
  element.append(title, lines);
  let key = '';

  return {
    element,
    update(snapshot: UiSnapshot): void {
      const model = panelFor(target, snapshot.state);
      const next = `${model.title}|${model.lines.join('|')}`;
      if (next === key) return;
      key = next;
      title.textContent = model.title;
      lines.replaceChildren(...model.lines.map((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        return p;
      }));
    },
    place(point, bounds): void {
      if (point === null) return;
      const width = Math.min(WIDTH, bounds.width - 32);
      const height = element.offsetHeight || 120;
      // Centrado sobre la cosa, sin salirse de los lados.
      const left = Math.max(16, Math.min(bounds.width - width - 16, point.x - width / 2));
      // Encima si cabe (dejando la cabecera), si no, debajo.
      const above = point.y - LIFT - height;
      const below = above < 120;
      const top = below ? point.y + LIFT + 8 : above;
      element.classList.toggle('below', below);
      element.style.left = `${Math.round(left)}px`;
      element.style.top = `${Math.round(top)}px`;
      // La punta apunta a la cosa aunque el papel se haya pegado a un lado.
      const tip = Math.max(18, Math.min(width - 18, point.x - left));
      element.style.setProperty('--label-tip', `${Math.round(tip)}px`);
    },
    dispose(): void { element.remove(); },
  };
}
