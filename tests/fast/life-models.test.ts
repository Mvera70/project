// V-15 · Qué malla lleva cada persona. design.md D.6.2; `world/models.ts`.
//
// Lo que se vigila es la **regla**, no el catálogo de recursos: qué figura se
// pide para quién, y en qué orden mandan la edad, el oficio y lo que se está
// haciendo. Las mallas de la lista de encargo
// (`docs/graphics-rounds/aldeanos-por-hacer.md`) aún no existen, y eso es
// deliberado: quien consume esto cae al aldeano base si el recurso falta, así
// que la regla se puede escribir y probar antes que el arte.

import { describe, expect, it } from 'vitest';
import { LIFE } from '@engine/balance';
import type { Actor } from '../../src/render3d/contracts';
import {
  BASE_VILLAGER, VILLAGER_BY_ROLE, modelFor, occupationOf,
} from '../../src/render3d/world/models';

/** Un actor cualquiera, adulto, sin oficio y sin nada que hacer. */
function actor(over: Partial<Actor> = {}): Actor {
  return {
    id: 1, x: 0, z: 0, facing: 0, activity: 'working', clip: 'idle', clipSeconds: 0,
    travelled: 0, cell: 0, named: false, age: 30, talking: false, arguing: false,
    occupation: null, role: null, ...over,
  } as Actor;
}

describe('V-15 · la malla se elige por quién eres y por lo que haces', () => {
  it('sin nada que la distinga, todo el mundo es el aldeano de siempre', () => {
    expect(modelFor(actor())).toBe(BASE_VILLAGER);
  });

  it('la edad manda sobre el oficio: un niño es un niño aunque herede un cargo', () => {
    // Es la distinción que más se lee a la distancia de la cámara —silueta baja
    // y cabeza grande— y por eso va primero.
    expect(modelFor(actor({ age: 6, role: 'leader' }))).toBe('villager-child');
    expect(modelFor(actor({ age: 70, role: 'leader' }))).toBe('villager-elder');
  });

  it('y los umbrales son los del motor, no unos propios', () => {
    // Si la figura se partiera por una edad distinta de la que usa la capa de
    // vida, se vería un adulto pequeño comportándose como un niño.
    expect(modelFor(actor({ age: LIFE.ADULT[0] - 1 }))).toBe('villager-child');
    expect(modelFor(actor({ age: LIFE.ADULT[0] }))).not.toBe('villager-child');
    expect(modelFor(actor({ age: LIFE.ADULT[1] }))).not.toBe('villager-elder');
    expect(modelFor(actor({ age: LIFE.ADULT[1] + 1 }))).toBe('villager-elder');
  });

  it('el oficio manda sobre lo que se está haciendo', () => {
    // El herrero es herrero cruzando la plaza: el oficio es quién eres, no qué
    // haces ahora mismo.
    expect(modelFor(actor({ role: 'smith', occupation: 'field' })))
      .toBe(VILLAGER_BY_ROLE.smith);
  });

  it('los siete oficios tienen figura, y el forastero no: no es un oficio', () => {
    for (const role of Object.keys(VILLAGER_BY_ROLE) as (keyof typeof VILLAGER_BY_ROLE)[]) {
      expect(modelFor(actor({ role }))).toBe(VILLAGER_BY_ROLE[role]);
    }
    expect(modelFor(actor({ role: 'stranger' }))).toBe(BASE_VILLAGER);
  });

  it('y quien no tiene oficio recibe figura por lo que hace, que es la mayoría', () => {
    // La razón de ser de esta fase: los oficios del motor son siete y casi
    // nadie tiene uno.
    expect(modelFor(actor({ occupation: 'field' }))).toBe('villager-farmer');
    expect(modelFor(actor({ occupation: 'felling' }))).toBe('villager-woodcutter');
    expect(modelFor(actor({ occupation: 'building' }))).toBe('villager-mason');
    expect(modelFor(actor({ occupation: 'herding' }))).toBe('villager-shepherd');
    expect(modelFor(actor({ occupation: 'water' }))).toBe('villager-fisher');
  });

  it('ninguna combinación deja a nadie sin figura', () => {
    const ages = [1, 8, 15, 30, 59, 60, 80];
    const roles = [null, 'stranger', ...Object.keys(VILLAGER_BY_ROLE)] as Actor['role'][];
    const jobs = [null, 'field', 'felling', 'building', 'herding', 'water'] as Actor['occupation'][];
    for (const age of ages) {
      for (const role of roles) {
        for (const occupation of jobs) {
          const model = modelFor(actor({ age, role, occupation }));
          expect(model, `${age} años, ${role ?? 'sin oficio'}, ${occupation ?? 'sin tarea'}`)
            .toMatch(/^villager/);
        }
      }
    }
  });

  it('la ocupación sale del sitio y de la oferta, no de una etiqueta nueva', () => {
    // Los identificadores los pone `life/offers.ts`; esta prueba los congela
    // sólo en lo que la regla necesita.
    expect(occupationOf('felling', 'work')).toBe('felling');
    expect(occupationOf('works:3', 'work')).toBe('building');
    expect(occupationOf('field:12', 'work')).toBe('field');
    expect(occupationOf('ford:crossing', 'drink')).toBe('water');
    expect(occupationOf('beast:10001:gift', 'feed')).toBe('herding');
    expect(occupationOf('house:4', 'sit')).toBeNull();
    expect(occupationOf('square:common', 'gossip')).toBeNull();
  });

  it('y trabajar en un campo no es lo mismo que pasar por un campo', () => {
    // La oferta importa: `work` en un campo es labrar; cualquier otra cosa allí
    // no da figura de labrador.
    expect(occupationOf('field:12', 'work')).toBe('field');
    expect(occupationOf('field:12', 'loiter')).toBeNull();
  });
});
