// P-1 · La plaza, a sesenta años. `tests/fast/plaza.test.ts` guarda lo barato.
//
// **Vive aquí y no en la suite rápida por presupuesto**, que es la regla del
// dueño del diseño del 16 sep 2026: ocho partidas de sesenta años son 23
// segundos y la suite rápida entera tiene veinte. Las jornadas son donde los
// minutos están permitidos por diseño (`CLAUDE.md`).

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { inPlaza } from '@engine/world/plaza';

const SEEDS = [7, 11, 23, 41, 33, 51, 101, 2024];

describe('P-1 · y no se mueve', () => {
  it('la plaza del año 60 es la de la fundación', () => {
    // La propiedad entera del paso: si esto se rompe, el empedrado de P-2 y la
    // fuente de P-3 se quedan detrás de la aldea.
    for (const seed of [7, 11, 41]) {
      const state = foundGame(seed);
      const at = { ...state.plaza };
      run(state, TIME.WEEKS_PER_YEAR * 60, 'prudent', CATALOG);
      expect(state.plaza, `semilla ${seed}`).toEqual(at);
    }
  });
});

describe('P-1 · y la aldea le deja su espacio', () => {
  it('en sesenta años no se levanta nada dentro, ni un campo', () => {
    // Medido antes de escribirlo: cero edificios dentro del círculo en ocho
    // partidas de sesenta años. Y el campo cuenta: un trigal en medio de la
    // plaza es exactamente lo que se pidió evitar.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 60, 'prudent', CATALOG);
      const inside = state.buildings.filter(
        (b) => b.lostTick === null && inPlaza(state, b.x, b.y, b.w, b.h),
      );
      expect(inside.map((b) => `${b.kind}@${b.x},${b.y}`), `semilla ${seed}`).toEqual([]);
    }
  });

  it('y reservarla no le cuesta a la aldea ni gente ni obras', () => {
    // La otra mitad de «con separación»: el círculo son unas veintiocho celdas
    // de las dos mil del corazón, así que la aldea no tiene por qué notarlo.
    // Medido con la reserva apagada y encendida, ocho partidas de sesenta años:
    // **352 personas contra 354, y 446 edificios contra 454**. La prueba no
    // repite esa comparación —haría falta apagar una constante— sino que guarda
    // el resultado: un valle con plaza sigue llegando a donde llegaba.
    let people = 0;
    let built = 0;
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 60, 'prudent', CATALOG);
      people += state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null).length;
      built += state.buildings.filter((b) => b.lostTick === null).length;
    }
    // Con margen: lo medido son 354 y 454, y lo que la prueba vigila es que no
    // se desplome, no la cifra exacta de una trayectoria.
    expect(people, `gente en ocho valles: ${people}`).toBeGreaterThan(280);
    expect(built, `edificios en ocho valles: ${built}`).toBeGreaterThan(360);
  });
});
