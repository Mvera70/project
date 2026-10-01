// M-23 · design.md §13.2, §11.4.
//
// §11.4's rule was found by a test, not a screenshot: an animation on the
// browser's own clock can be caught mid-flight when the game's clock jumps
// far enough, and the lethargy of §13.2 is the biggest jump there is — 960
// ticks, four hours, in under two seconds. `runBatch` is checked here without
// a DOM or a real `requestAnimationFrame`, the same split `loop.ts` uses.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { ticksOwed } from '@engine/save';
import { checkpointSavedAtMs, finished, runBatch } from '@ui/lethargy';

describe('runBatch · §13.2, §11.4', () => {
  it('nunca corre más de un lote de 64 ticks de una vez', () => {
    const state = foundTwenty(7);
    const progress = runBatch(state, 0, 960);
    expect(progress.done).toBe(TIME.LETHARGY_BATCH);
    expect(state.tick).toBe(TIME.LETHARGY_BATCH);
  });

  it('durante el letargo completo, ninguna cifra de progreso queda en estado intermedio', () => {
    // El caso de prueba de §11.4: 960 ticks completos, en lotes, y en cada
    // punto en el que alguien pudiera mirar la pantalla, el progreso es un
    // número entero bien definido — nunca NaN, nunca hacia atrás, nunca un
    // salto mayor que el lote. Es justo lo que una transición CSS no podía
    // prometer y un recuento de ticks sí.
    const state = foundTwenty(7);
    const total = ticksOwed(TIME.LETHARGY_CAP_MS);
    expect(total).toBe(960);

    let done = 0;
    const seen: number[] = [0];
    let frames = 0;
    while (done < total && frames < 100) {
      const progress = runBatch(state, done, total);
      expect(Number.isInteger(progress.done)).toBe(true);
      expect(progress.done).toBeGreaterThan(done);
      expect(progress.done).toBeLessThanOrEqual(total);
      expect(progress.total).toBe(total);
      done = progress.done;
      seen.push(done);
      frames += 1;
      if (progress.ended || (progress.halted ?? null) !== null) break;
    }

    // RD-2: un aviso de asalto puede parar la ausencia antes; si no para,
    // corre exactamente las 960.
    const halted = seen.length > 0 && done < total;
    expect(done === total || halted).toBe(true);
    expect(state.tick).toBe(done);
    for (let i = 1; i < seen.length; i += 1) {
      const step = seen[i]! - seen[i - 1]!;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(TIME.LETHARGY_BATCH);
    }
    // Exactamente 960 / 64 = 15 lotes si no para antes, ni uno de más.
    expect(frames).toBe(Math.ceil(done / TIME.LETHARGY_BATCH));
  });

  it('una aldea que se acabaría a mitad de lote detiene el progreso ahí, y el final llega con el jugador delante', () => {
    // RD-2 (30 sep 2026): antes el letargo dejaba que la partida acabara en la
    // ausencia. Ahora la semana que la acabaría se deshace y el letargo para;
    // la primera semana que se juegue mirando es la que la acaba.
    const state = foundTwenty(7);
    for (const v of state.people.villagers) v.diedTick = state.tick; // extinción inmediata
    const tickBefore = state.tick;
    const progress = runBatch(state, 0, 960);
    expect(progress.halted).toBe('ending');
    expect(progress.ended).toBe(false);
    expect(state.ended).toBeNull();
    expect(state.tick).toBe(tickBefore);
    expect(progress.done).toBeLessThan(960);
    expect(Number.isInteger(progress.done)).toBe(true);
  });
});

describe('RD-2 · una ausencia que para también termina', () => {
  it('un letargo parado cuenta como terminado para quien lo espera', () => {
    // La app tenía su propia condición de fin (`done >= total || ended`) y un
    // letargo parado en un aviso de asalto no la cumplía: el juego se quedaba
    // recuperando para siempre, sin parte y sin bucle (CI de la PR #21).
    expect(finished({ done: 431, total: 960, ended: false, halted: 'raid' })).toBe(true);
    expect(finished({ done: 0, total: 960, ended: false, halted: 'ending' })).toBe(true);
    expect(finished({ done: 431, total: 960, ended: false, halted: null })).toBe(false);
    expect(finished({ done: 960, total: 960, ended: false })).toBe(true);
  });
});

describe('checkpoint de letargo · §13.1', () => {
  it('conserva exactamente los ticks aún debidos en un guardado parcial', () => {
    const now = 2_000_000;
    const progress = { done: 64, total: 960, ended: false };
    const savedAt = checkpointSavedAtMs(now, progress);

    expect(ticksOwed(now - savedAt)).toBe(960 - 64);
  });

  it('fecha como actual un letargo completo o terminado antes de tiempo', () => {
    const now = 2_000_000;
    expect(checkpointSavedAtMs(now, { done: 960, total: 960, ended: false })).toBe(now);
    expect(checkpointSavedAtMs(now, { done: 31, total: 960, ended: true })).toBe(now);
  });
});
