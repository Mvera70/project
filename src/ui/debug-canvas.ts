// La pintura de la página de diagnóstico (`?debug=1` sin `live`): el valle en
// el Canvas 2D, para las capturas de la reja, y la auditoría de sprites.
//
// **Vive aparte para que el 2D no viaje en el paquete del juego.** `debug.ts`
// lo importa `main.ts` de entrada, y con él venía `src/render/` entero aunque
// nadie lo pintara. Ahora se pide sólo cuando se abre esta página (Vera, 2 oct
// 2026: «si podemos evitar que se cargue, mejor»).

import type { GameState } from '@engine/state';
import { paintVillageBackground, sizeCanvas } from '@render/canvas';
import { paletteFor } from '@derive/palette';
import { auditSprites } from '@render/sprites/audit';
import { crowdPositions } from '@render/crowd';
import { paintFigures, paintFigureShadows } from '@render/layers/figures';
import type { DebugRequest } from './debug';

export function diagnosticCanvas(root: HTMLElement, state: GameState, request: DebugRequest): void {
  root.replaceChildren();
  const shell = document.createElement('main');
  shell.id = 'valley-shell';
  shell.style.cssText = 'width:390px;height:844px;display:grid;place-items:start center;background:#b9c9cf;color:#3c3a34';
  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  sizeCanvas(canvas, 10, 2);
  canvas.style.marginTop = '22px';
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is unavailable.');
  const palette = paletteFor(request.season, 6);
  shell.style.background = palette.void;
  ctx.scale(2, 2);
  ctx.drawImage(paintVillageBackground(state, palette, 10), 0, 0);
  const figures = crowdPositions(state, 0.45);
  paintFigureShadows(ctx, figures, 10);
  paintFigures(ctx, figures, palette, 10);
  shell.append(canvas);
  root.append(shell);
}

export { auditSprites };
