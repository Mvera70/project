// Esquema 12 · el «+1» de la leñera (28 sep 2026).
//
// Lo pidió Vera para probar si mirar la cadena entera —tala, carga, leñera,
// obra— hace el valle más interesante: cuando una unidad de madera entra de
// verdad en la leñera, sale un «+1» encima de ella, y cuando una obra se abre y
// paga lo suyo, un «−40» en el mismo sitio. **Sólo lo que el motor ya apuntó**:
// la lista la da el renderer (`woodGains()`), que la saca de `woodRun.credited`.
//
// Es un elemento de la capa de interfaz posicionado cada fotograma, como la
// señal de caza (`hunt-sign.css`): pequeño, sin plato, con el icono de la leña
// de la cabecera, y sube y se apaga solo. A velocidades altas el renderer ya
// junta las entradas seguidas en un solo aviso («+6»).

import './wood-gains.css';

export interface WoodGainView {
  readonly id: number;
  readonly count: number;
  readonly x: number;
  readonly y: number;
  /** De 0 (acaba de entrar) a 1 (se apaga). */
  readonly age: number;
  /** RD-1 · el dibujo: la leña (lo de siempre) o el grano de una pieza cobrada. */
  readonly icon?: 'logs' | 'wheat';
}

export interface WoodGains {
  readonly element: HTMLElement;
  paint(gains: readonly WoodGainView[], box: DOMRect | null): void;
}

/** Cuánto sube el aviso en toda su vida, en píxeles CSS. */
const RISE = 26;

export function mountWoodGains(): WoodGains {
  const element = document.createElement('div');
  element.className = 'wood-gains';
  element.setAttribute('aria-hidden', 'true');
  const shown = new Map<number, HTMLElement>();
  return {
    element,
    paint(gains, box): void {
      const alive = new Set<number>();
      if (box !== null) {
        for (const gain of gains) {
          alive.add(gain.id);
          let chip = shown.get(gain.id);
          if (chip === undefined) {
            chip = document.createElement('span');
            chip.className = 'wood-gain';
            element.append(chip);
            shown.set(gain.id, chip);
          }
          const text = `${gain.count > 0 ? '+' : '−'}${Math.abs(gain.count)}`;
          const icon = gain.icon ?? 'logs';
          if (chip.dataset.text !== text || chip.dataset.icon !== icon) {
            chip.dataset.text = text;
            chip.dataset.icon = icon;
            chip.classList.toggle('wood-gain--out', gain.count < 0);
            chip.innerHTML = `<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#${icon}"/></svg><b>${text}</b>`;
          }
          // Aparece enseguida, se queda y se apaga en el último tercio.
          const fade = gain.age < 0.1 ? gain.age / 0.1 : gain.age > 0.65 ? (1 - gain.age) / 0.35 : 1;
          chip.style.opacity = fade.toFixed(3);
          chip.style.transform = `translate(${Math.round(box.left + gain.x)}px, ${Math.round(box.top + gain.y - gain.age * RISE)}px) translate(-50%, -100%)`;
        }
      }
      for (const [id, chip] of shown) {
        if (alive.has(id)) continue;
        chip.remove();
        shown.delete(id);
      }
    },
  };
}
