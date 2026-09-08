// M-20 · The first running application shell.

import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { tick } from '@engine/sim';
import type { GameState, SaveFile } from '@engine/state';
import { yearOf } from '@engine/time';
import { createRenderer } from '@render/renderer';
import { startLoop } from './loop';
import { isSpeed, speedLabel, type Speed } from './speed';

export interface App {
  setSpeed(speed: Speed): void;
  state(): Readonly<GameState>;
}

export function roman(value: number): string {
  const numerals: readonly [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let left = Math.max(1, Math.floor(value));
  let result = '';
  for (const [amount, glyph] of numerals) {
    while (left >= amount) { result += glyph; left -= amount; }
  }
  return result;
}

function freshSeed(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] as number;
}

export function boot(root: HTMLElement, save?: SaveFile): App {
  const state = save?.state ?? foundGame(freshSeed());
  let speed: Speed = 1;
  root.replaceChildren();
  root.className = 'valley-app';

  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  canvas.setAttribute('aria-label', 'The valley');
  const year = document.createElement('div');
  year.className = 'valley-year';
  const controls = document.createElement('div');
  controls.className = 'valley-speeds';
  controls.setAttribute('aria-label', 'Simulation speed');
  const buttons = ([0, 1, 4, 16] as const).map((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = speedLabel(value);
    button.setAttribute('aria-label', speedLabel(value));
    button.addEventListener('click', () => app.setSpeed(value));
    controls.append(button);
    return [value, button] as const;
  });
  root.append(canvas, year, controls);

  const renderer = createRenderer(canvas, root);
  const paint = (fraction: number): void => {
    year.textContent = `ANNO ${roman(yearOf(state.tick) + 1)}`;
    renderer.paint(state, fraction);
  };
  const loop = startLoop(
    () => speed,
    () => { if (state.ended === null) tick(state, CATALOG); },
    paint,
  );
  window.addEventListener('pagehide', () => loop.stop(), { once: true });

  const app: App = {
    setSpeed(value: Speed): void {
      if (!isSpeed(value)) throw new Error(`Unsupported speed: ${value as number}`);
      speed = value;
      for (const [candidate, button] of buttons) button.setAttribute('aria-pressed', String(candidate === speed));
    },
    state(): Readonly<GameState> { return state; },
  };
  app.setSpeed(speed);
  paint(0);
  document.documentElement.dataset.appReady = 'true';
  return app;
}

