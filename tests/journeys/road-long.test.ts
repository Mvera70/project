// Lo lento de `tests/fast/road.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 133 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-0 · Las ofertas del camino y el diezmo. `docs/historico/rework.md` §4b, brief M-0.
//
// Propiedades del diseño, no cifras: qué es una oferta (algo que no cambia el
// estado hasta que el jugador contesta), qué no puede hacer el diezmo (matar de
// hambre), y que un acto del jugador no desplaza la partida —que es lo que
// mantiene el determinismo de §2.4—.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';

describe('la mesa entera', () => {
  it('la plata entra y sale sin que el jugador toque nada', () => {
    // La medida del brief M-0, en pequeño: un valle que nadie juega ve plata
    // —el forastero la deja— y la pierde —el señor la cobra—.
    let entered = 0;
    let left = 0;
    for (const seed of [7, 11, 23]) {
      const s = foundGame(seed);
      let last = 0;
      for (let week = 0; week < TIME.WEEKS_PER_YEAR * 40 && s.ended === null; week += 1) {
        run(s, 1, 'prudent', CATALOG);
        if (s.village.silver > last) entered += 1;
        if (s.village.silver < last) left += 1;
        last = s.village.silver;
      }
    }
    expect(entered).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(0);
  });

  it('la piedra se cantea sola cuando la obra no tiene nada que hacer', () => {
    const s = foundTwenty(7);
    run(s, TIME.WEEKS_PER_YEAR * 60, 'prudent', CATALOG);
    if (s.ended === null) {
      // Con fragua y roca en el valle, a los sesenta años hay piedra en el
      // montón o piedra puesta en algo. Lo que no puede haber es ninguna de las
      // dos cosas: eso era la última década vacía de `docs/historico/plan-juego.md` §3.1.
      const quarried = s.village.stone > 0
        || s.buildings.some((b) => b.tier === 1);
      expect(quarried || !s.buildings.some((b) => b.kind === 'smithy')).toBe(true);
    }
  });
});
