// v5.81 · La vida en porcentaje, el daño por arma y la tabla arma × pieza
// (`render3d/life/wounds.ts`).
//
// Lo que se guarda son las propiedades que Vera dijo con palabras, no los
// números (que son `TUNE` y los mueve el nivelado): una flecha quita poco y
// una espada mucho; el cuero protege poco, algo contra la flecha y nada contra
// la espada; cada pieza de la escalera protege al menos como la anterior; el
// rebote es una probabilidad que se cumple, y la misma batalla repetida rebota
// igual.

import { describe, expect, it } from 'vitest';
import { blowsToFell, DAMAGE, GUARD, strike, type Armour, type Weapon } from '../../src/render3d/life/wounds';

const WEAPONS: readonly Weapon[] = ['arrow', 'spear', 'sword'];
const LADDER: readonly Armour[] = ['jerkin', 'mail', 'plate', 'harness'];

describe('v5.81 · el daño por arma', () => {
  it('una flecha quita poco y una espada mucho; nadie cae de un golpe', () => {
    expect(DAMAGE.arrow).toBeLessThan(DAMAGE.spear);
    expect(DAMAGE.spear).toBeLessThan(DAMAGE.sword);
    for (const weapon of WEAPONS) expect(blowsToFell(weapon), weapon).toBeGreaterThanOrEqual(2);
    // La lanza conserva el ritmo del cuerpo a cuerpo de antes: tres golpes.
    expect(blowsToFell('spear')).toBe(3);
  });

  it('el cuero protege poco: algo contra la flecha, menos contra la lanza, nada contra la espada', () => {
    const leather = GUARD.jerkin;
    expect(leather.arrow.pass).toBeLessThan(leather.spear.pass);
    expect(leather.spear.pass).toBeLessThan(leather.sword.pass);
    expect(leather.sword).toEqual({ pass: 1, ricochet: 0 });
    // «No debe proteger mucho»: nunca para más de la mitad.
    for (const weapon of WEAPONS) expect(leather[weapon].pass, weapon).toBeGreaterThanOrEqual(0.5);
  });

  it('cada pieza de la escalera protege al menos como la anterior, contra todo', () => {
    for (const weapon of WEAPONS) {
      for (let n = 1; n < LADDER.length; n += 1) {
        const before = GUARD[LADDER[n - 1]!][weapon];
        const after = GUARD[LADDER[n]!][weapon];
        expect(after.pass, `${LADDER[n]} contra ${weapon}`).toBeLessThanOrEqual(before.pass);
        expect(after.ricochet, `${LADDER[n]} contra ${weapon}`).toBeGreaterThanOrEqual(before.ricochet);
      }
    }
    for (const armour of LADDER) {
      for (const weapon of WEAPONS) {
        const guard = GUARD[armour][weapon];
        expect(guard.pass).toBeGreaterThan(0);
        expect(guard.pass).toBeLessThanOrEqual(1);
        expect(guard.ricochet).toBeGreaterThanOrEqual(0);
        expect(guard.ricochet).toBeLessThan(1);
      }
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
      const blow = strike(body, 5, 'arrow', step);
      expect(blow.bare).toBe(DAMAGE.arrow);
      if (blow.ricocheted) expect(body.health ?? 1).toBe(before);
      else expect(before - (body.health ?? 1)).toBeCloseTo(Math.min(before, DAMAGE.arrow * GUARD.harness.arrow.pass));
      if (blow.felled) break;
    }
  });
});
