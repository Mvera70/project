// M-21 · Las señales del valle, pintadas en Canvas 2D.
//
// Qué señales hay y dónde lo decide `src/derive/tells.ts`, que no dibuja y que
// el render 3D lee igual. Aquí sólo queda la tinta.

import type { DrawingContext } from '../sprites';
import type { Palette } from '@derive/palette';
import type { Tell } from '@derive/tells';

/** Los colores que el catálogo nombra, y un respaldo para cualquier otro. */
const BANNER_COLOURS: Record<string, string> = {
  red: '#8c3b34',
  grey: '#7d8489',
  white: '#e8e4da',
  black: '#2f2c29',
  green: '#4d6b45',
  blue: '#3f5a78',
};

export function paintTells(ctx: DrawingContext, tells: readonly Tell[], palette: Palette, cell: number, fraction: number): void {
  for (const tell of tells) {
    if (tell.kind === 'smoke') {
      ctx.fillStyle = `rgba(70,70,65,${(0.15 + tell.intensity * 0.55).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(tell.x * cell, (tell.y - 0.25) * cell, 0.2 * cell, 0, Math.PI * 2); ctx.fill();
    } else if (tell.kind === 'light' && fraction >= 0.8) {
      ctx.fillStyle = '#e6b85c'; ctx.fillRect((tell.x - 0.13) * cell, (tell.y - 0.1) * cell, 0.26 * cell, 0.2 * cell);
    } else if (tell.kind === 'granary') {
      ctx.fillStyle = palette.field; ctx.fillRect((tell.x + 0.48) * cell, (tell.y + 1.35 - tell.fraction * 0.7) * cell, 1.04 * cell, tell.fraction * 0.7 * cell);
    } else if (tell.kind === 'candles') {
      ctx.fillStyle = '#e6b85c'; for (let i = 0; i < tell.count; i += 1) ctx.fillRect((tell.x - 0.3 + i * 0.15) * cell, tell.y * cell, 0.08 * cell, 0.18 * cell);
    } else if (tell.kind === 'banner') {
      // Arte de prueba a propósito (§11.8): un paño sobre un asta. El aspecto
      // definitivo lo gobierna el Anexo D; lo que aquí importa es que un
      // estandarte izado se distinga de uno que no lo está.
      ctx.fillStyle = '#4a4038';
      ctx.fillRect((tell.x - 0.04) * cell, (tell.y - 1.1) * cell, 0.08 * cell, 1.1 * cell);
      ctx.fillStyle = BANNER_COLOURS[tell.colour] ?? BANNER_COLOURS['grey'] as string;
      ctx.fillRect((tell.x + 0.04) * cell, (tell.y - 1.05) * cell, 0.5 * cell, 0.34 * cell);
    } else if (tell.kind === 'plague') {
      ctx.strokeStyle = '#f2f4f6'; ctx.lineWidth = Math.max(1, cell * 0.12); ctx.beginPath(); ctx.moveTo((tell.x - 0.2) * cell, tell.y * cell); ctx.lineTo((tell.x + 0.2) * cell, tell.y * cell); ctx.moveTo(tell.x * cell, (tell.y - 0.2) * cell); ctx.lineTo(tell.x * cell, (tell.y + 0.2) * cell); ctx.stroke();
    }
  }
}
