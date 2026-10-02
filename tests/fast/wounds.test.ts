// v5.81 · La vida en porcentaje, el daño por arma y la tabla arma × pieza
// (`render3d/life/wounds.ts`).
//
// Lo que se guarda son las propiedades que Vera dijo con palabras, no los
// números (que son `TUNE` y los mueve el nivelado): a cuerpo descubierto una
// flecha tumba de un tiro; el cuero protege un 15 % de la flecha —aguanta un
// flechazo y cae con el segundo—, algo de la lanza y nada de la espada; cada
// pieza de la escalera protege al menos como la anterior; el rebote es una
// probabilidad que se cumple, y la misma batalla repetida rebota igual.

import { describe, expect, it } from 'vitest';
import { blowsToFell, DAMAGE, GUARD, strike, type Armour, type Weapon } from '../../src/render3d/life/wounds';

const WEAPONS: readonly Weapon[] = ['arrow', 'spear', 'sword'];
const LADDER: readonly Armour[] = ['jerkin', 'mail', 'plate', 'harness'];

describe('v5.81 · el daño por arma y lo que protege cada pieza', () => {
  it('a cuerpo descubierto una flecha tumba de un tiro, la lanza en tres y la espada en dos', () => {
    expect(blowsToFell('arrow')).toBe(1);
    expect(blowsToFell('spear')).toBe(3);
    expect(blowsToFell('sword')).toBe(2);
  });

  it('el cuero protege un 15 % de la flecha: aguanta una y cae con la segunda', () => {
    expect(GUARD.jerkin.arrow.protects).toBe(0.15);
    expect(blowsToFell('arrow', 'jerkin')).toBe(2);
    // «Quizá para una flecha, pero no para una espada.»
    expect(GUARD.jerkin.sword).toEqual({ protects: 0, ricochet: 0 });
    expect(GUARD.jerkin.spear.protects).toBeLessThanOrEqual(GUARD.jerkin.arrow.protects);
    expect(blowsToFell('spear', 'jerkin'), 'un lanzazo más que sin nada').toBe(4);
    // «No debe proteger mucho», y el cuero no es duro: no rebota.
    for (const weapon of WEAPONS) {
      expect(GUARD.jerkin[weapon].protects, weapon).toBeLessThanOrEqual(0.25);
      expect(GUARD.jerkin[weapon].ricochet, weapon).toBe(0);
    }
  });

  it('cada pieza de la escalera protege al menos como la anterior, contra todo', () => {
    for (const weapon of WEAPONS) {
      for (let n = 1; n < LADDER.length; n += 1) {
        const before = GUARD[LADDER[n - 1]!][weapon];
        const after = GUARD[LADDER[n]!][weapon];
        expect(after.protects, `${LADDER[n]} contra ${weapon}`).toBeGreaterThanOrEqual(before.protects);
        expect(after.ricochet, `${LADDER[n]} contra ${weapon}`).toBeGreaterThanOrEqual(before.ricochet);
      }
    }
    for (const armour of LADDER) {
      for (const weapon of WEAPONS) {
        const guard = GUARD[armour][weapon];
        expect(guard.protects).toBeGreaterThanOrEqual(0);
        expect(guard.protects).toBeLessThan(1);
        expect(guard.ricochet).toBeGreaterThanOrEqual(0);
        expect(guard.ricochet).toBeLessThan(1);
      }
    }
    // Y el metal hace rebotar la flecha más que el filo: es lo que rebota.
    for (const armour of ['mail', 'plate', 'harness'] as const) {
      expect(GUARD[armour].arrow.ricochet, armour).toBeGreaterThan(GUARD[armour].sword.ricochet);
    }
  });

  it('el rebote se cumple con la probabilidad de la tabla, y la misma batalla rebota igual', () => {
    for (const armour of LADDER) {
      for (const weapon of WEAPONS) {
        let bounced = 0;
        const tries = 4000;
        for (let step = 0; step < tries; step += 1) {
          if (strike({ armour }, 17, weapon, step).ricocheted) bounced += 1;
        }
        expect(Math.abs(bounced / tries - GUARD[armour][weapon].ricochet), `${armour} contra ${weapon}`)
          .toBeLessThan(0.03);
      }
    }
    const once = Array.from({ length: 50 }, (_, step) => strike({ armour: 'plate' }, 3, 'arrow', step).ricocheted);
    const again = Array.from({ length: 50 }, (_, step) => strike({ armour: 'plate' }, 3, 'arrow', step).ricocheted);
    expect(again).toEqual(once);
  });

  it('un golpe que rebota no quita vida, y la sombra dice lo que habría quitado', () => {
    const body: { health?: number; armour: Armour } = { armour: 'harness' };
    for (let step = 0; step < 200; step += 1) {
      const before = body.health ?? 1;
      const blow = strike(body, 5, 'spear', step);
      expect(blow.bare).toBe(DAMAGE.spear);
      if (blow.ricocheted) expect(body.health ?? 1).toBe(before);
      else expect(before - (body.health ?? 1)).toBeCloseTo(Math.min(before, DAMAGE.spear * (1 - GUARD.harness.spear.protects)));
      if (blow.felled) break;
    }
  });
});
