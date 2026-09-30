// P-1b.1 · La pausa de la interfaz no puede alterar ni una decisión del motor.
import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import type { GameState } from '@engine/state';
import { openAtYear, openAtYearCooperative } from '../../src/ui/debug';

/**
 * Un valle que acaba antes del año pedido, **provocado y no esperado**.
 *
 * La prueba confiaba en que la semilla 31 se rompiera sola antes del año 41, y
 * dejó de hacerlo (ya en `ee9340e`, la raíz de la historia del repositorio): es
 * el caos perdido que declara `fate-chaos.test.ts`, donde ninguna de doce
 * semillas acaba en cuarenta años. Lo que esta prueba guarda no es que haya
 * finales, sino que el avance a tramos se pare en el final igual que el avance
 * de golpe. Así que el final se pone con la propia mecánica del juego —una
 * partida de mil hombres en camino, que B3 convierte en asalto y la cuenta sin
 * parte en valle tomado (`world/threat.ts`)— y no depende del nivelado. Medido
 * el 30 sep 2026: la semilla 31 queda tomada en el tick 31, tras tres pausas.
 */
function valley(seed: number, doomed: boolean): GameState {
  const state = foundGame(seed);
  if (doomed) {
    state.threat.comingTick = 30;
    state.threat.comingBand = 1000;
  }
  return state;
}

describe('avance cooperativo del menú', () => {
  it('produce el mismo estado completo en el preset y en un final anterior al año pedido', async () => {
    for (const [seed, year, doomed] of [[11, 21, false], [31, 41, true]] as const) {
      const reference = valley(seed, doomed);
      const cooperative = valley(seed, doomed);
      openAtYear(reference, year);
      let yields = 0;
      await openAtYearCooperative(cooperative, year, async () => { yields += 1; });
      expect(yields, `semilla ${seed}: hubo pausas`).toBeGreaterThan(0);
      expect(JSON.stringify(cooperative), `semilla ${seed}: mismo estado byte a byte`)
        .toBe(JSON.stringify(reference));
      if (doomed) expect(cooperative.ended, 'el final anterior sigue igual').not.toBeNull();
    }
  });
});
