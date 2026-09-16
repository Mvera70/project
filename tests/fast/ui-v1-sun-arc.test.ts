/**
 * UI-V1 · el arco del sol de la placa de fecha. `docs/ui-redesign/piel/plan-piel.md`
 * §3.1 y §5 («prueba pura: `sunArcPoint(phase)` devuelve el punto del arco
 * para 0, 0,25, 0,5, 0,75»).
 *
 * `sunArcPoint` es la única fuente del dibujo: el trazo del arco en `hud.ts`
 * es una polilínea que muestrea esta misma función, así que probarla a ella
 * prueba también dónde queda el trazo, no sólo dónde queda el sol.
 *
 * 0 es medianoche y 1 el medianoche siguiente — la misma fase que devuelve
 * `valleyClock(tick, fraction).sunPhase` (`src/derive/clock.ts`), que es lo
 * que el plan llama «el dato real»: el sol del cielo 3D pinta con la misma
 * fase (`presentation-clock.ts` lo deja escrito y `tests/fast/clock.test.ts`
 * lo ata). El punto sube en seno desde el borde de abajo (medianoche, en los
 * dos extremos) hasta el techo del arco a mediodía (fase 0,5) — no hace
 * falta el amanecer/anochecer real de `day-phases.ts` para un adorno.
 */
import { describe, expect, it } from 'vitest';
import { SUN_ARC_HEIGHT, SUN_ARC_WIDTH, sunArcPoint } from '@ui/redesign/hud';

describe('UI-V1 · sunArcPoint', () => {
  it('en fase 0 (medianoche) el sol está en el extremo izquierdo y abajo del todo', () => {
    const point = sunArcPoint(0);
    expect(point.x).toBeCloseTo(0, 6);
    expect(point.y).toBeCloseTo(SUN_ARC_HEIGHT, 6);
  });

  it('en fase 0,25 el sol ha subido a medio camino del arco, a un cuarto del ancho', () => {
    const point = sunArcPoint(0.25);
    expect(point.x).toBeCloseTo(SUN_ARC_WIDTH * 0.25, 6);
    expect(point.y).toBeCloseTo(SUN_ARC_HEIGHT * (1 - Math.SQRT1_2), 6);
  });

  it('en fase 0,5 (mediodía de la fase) el sol está en el techo del arco, en el centro', () => {
    const point = sunArcPoint(0.5);
    expect(point.x).toBeCloseTo(SUN_ARC_WIDTH * 0.5, 6);
    expect(point.y).toBeCloseTo(0, 6);
  });

  it('en fase 0,75 el sol ha bajado tanto como en 0,25, y simétricamente', () => {
    const point = sunArcPoint(0.75);
    expect(point.x).toBeCloseTo(SUN_ARC_WIDTH * 0.75, 6);
    expect(point.y).toBeCloseTo(sunArcPoint(0.25).y, 6);
  });

  it('es la misma curva vista desde cualquier vuelta del día: la fase es circular', () => {
    expect(sunArcPoint(1.25)).toEqual(sunArcPoint(0.25));
    expect(sunArcPoint(-0.25)).toEqual(sunArcPoint(0.75));
  });

  it('nunca sale del ancho ni sube por encima del techo del arco', () => {
    for (let step = 0; step <= 20; step += 1) {
      const point = sunArcPoint(step / 20);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(SUN_ARC_WIDTH);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(SUN_ARC_HEIGHT);
    }
  });
});
