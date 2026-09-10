// M-44 · design.md §11.6, §16.3 — que siga pasando algo.
//
// §11.6 nació de una cuenta: la primera sesión humana veía entre 0,0 y 0,6
// sucesos notables cada cinco minutos y dijo que no pasaba nada. Esta prueba
// existe para que no vuelva a caer ahí sin que nadie se entere.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run, tick } from '@engine/sim';

describe('la aldea tiene algo que contar · §11.6', () => {
  it('una sesión de cinco minutos a ×1 trae varios sucesos notables', () => {
    // Cinco minutos reales a velocidad normal son veinte semanas.
    const weeks = Math.round((5 * 60 * 1000) / TIME.REAL_MS_PER_TICK);
    let notable = 0;
    const seeds = [3, 7, 11];

    for (const seed of seeds) {
      const state = foundGame(seed);
      run(state, 20 * 48, 'prudent', CATALOG); // una aldea ya asentada
      const before = state.chronicle.length;
      for (let n = 0; n < weeks && state.ended === null; n += 1) tick(state, CATALOG);
      notable += state.chronicle.slice(before).filter((e) => e.weight >= 2).length;
    }

    // Medido: 2,8 de media. El umbral se pone en uno, que es el suelo por
    // debajo del cual §16.3 dijo que el juego no valía, y con tres semillas
    // porque una sola es ruido.
    expect(notable / seeds.length, 'sucesos notables en cinco minutos a ×1')
      .toBeGreaterThan(1);
  });
});
