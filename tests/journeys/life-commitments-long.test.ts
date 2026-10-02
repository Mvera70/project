// Lo lento de `tests/fast/life-commitments.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 41 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// IA-2 · El registro de compromisos. Anexo E, docs/historico/life-ai-proposal.md §8.
//
// Lo que se guarda aquí son propiedades del diseño (§8 del brief, y las que
// `docs/life-ai-implementation-prompt.md` pide para esta fase), no detalles
// de `commitments.ts`: una reserva es atómica, liberar dos veces es como
// liberar una, un actor no está en dos compromisos a la vez, dos actores no
// aceptan escenas distintas en el mismo paso, el orden de resolución no
// depende de cómo llegue la lista, y reconstruir la misma jornada con la
// misma semilla da la misma aldea.

import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import type { Dweller } from '../../src/render3d/life/village';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { terrainOf } from '../../src/render3d/life/terrain';
import { blockedAt } from '../../src/render3d/life/body';
// ---------------------------------------------------------------------------
// La aldea entera: nada se queda colgado, y reconstruir da lo mismo.
// ---------------------------------------------------------------------------

describe('IA-2 · la aldea entera, con el registro puesto', () => {
  it('en una jornada completa, ninguna interacción se queda colgada', () => {
    for (const seed of [3, 7, 23]) {
      const state = foundTwenty(seed);
      const life = createVillage(state, 0);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step();
      expect(life.interactions.stuck, `semilla ${seed}`).toBe(0);
    }
  });

  it('reconstruir la misma jornada con la misma semilla da la misma aldea', () => {
    for (const seed of [3, 7, 23]) {
      const state = foundTwenty(seed);
      const stepsToCheck = 4000;
      const a = createVillage(state, 0);
      for (let n = 0; n < stepsToCheck; n += 1) a.step();
      const b = createVillage(state, 0);
      for (let n = 0; n < stepsToCheck; n += 1) b.step();

      expect(a.dwellers.length).toBe(b.dwellers.length);
      for (let i = 0; i < a.dwellers.length; i += 1) {
        const da = a.dwellers[i] as Dweller;
        const db = b.dwellers[i] as Dweller;
        expect(da.body.x, `semilla ${seed}, persona ${i}, x`).toBeCloseTo(db.body.x, 9);
        expect(da.body.z, `semilla ${seed}, persona ${i}, z`).toBeCloseTo(db.body.z, 9);
        expect(da.body.facing, `semilla ${seed}, persona ${i}, facing`).toBeCloseTo(db.body.facing, 9);
        expect(da.scene?.kind ?? null).toBe(db.scene?.kind ?? null);
      }
      expect(a.interactions).toEqual(b.interactions);
    }
  });

  it('ningún cuerpo, con el registro puesto, acaba dentro de un muro', () => {
    for (const seed of [3, 7, 23]) {
      const state = foundTwenty(seed);
      const land = terrainOf(state);
      const life = createVillage(state, 0);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        if (n % 90 !== 0) continue;
        for (const dweller of life.dwellers) {
          expect(blockedAt(land, dweller.body.x, dweller.body.z), `semilla ${seed}, paso ${n}`).toBe(false);
        }
      }
    }
  });
});
