// V-15 · Qué malla lleva cada persona. design.md D.6.2; `world/models.ts`.
//
// Lo que se vigila es la **regla**, no el catálogo de recursos: qué figura se
// pide para quién, y en qué orden mandan la edad, el oficio y lo que se está
// haciendo. Las mallas de la lista de encargo
// (`docs/historico/graphics-rounds/aldeanos-por-hacer.md`) aún no existen, y eso es
// deliberado: quien consume esto cae al aldeano base si el recurso falta, así
// que la regla se puede escribir y probar antes que el arte.

import { describe, expect, it } from 'vitest';
import { LIFE } from '@engine/balance';
import type { Actor } from '../../src/render3d/contracts';
import {
  BASE_VILLAGER, STRANGER_VILLAGER, VILLAGER_BY_ROLE, VILLAGER_MODELS, displayScaleFor,
  modelChainFor, modelFor, occupationOf, statureAt,
} from '../../src/render3d/world/models';
import { WANTED } from '../../src/render3d/renderer';

/** Un actor cualquiera, adulto, sin oficio y sin nada que hacer. */
function actor(over: Partial<Actor> = {}): Actor {
  return {
    id: 1, x: 0, z: 0, facing: 0, activity: 'working', clip: 'idle', clipSeconds: 0,
    travelled: 0, cell: 0, named: false, age: 30, talking: false, arguing: false,
    occupation: null, role: null, ...over,
  } as Actor;
}

describe('V-15 · la malla se elige por quién eres y por lo que haces', () => {
  it('los niños conservan una silueta claramente menor hasta la edad adulta', () => {
    expect(statureAt(4)).toBeCloseTo(0.546, 3);
    expect(statureAt(8)).toBeCloseTo(0.671, 3);
    expect(statureAt(12)).toBeCloseTo(0.797, 3);
    expect(statureAt(14)).toBeCloseTo(0.86, 3);
    expect(statureAt(4)).toBeLessThan(statureAt(8));
    expect(statureAt(8)).toBeLessThan(statureAt(12));
    expect(statureAt(12)).toBeLessThan(statureAt(14));
  });

  it('tener nombre no convierte a un niño en alguien tan alto como un adulto', () => {
    expect(displayScaleFor(actor({ age: 12, named: true })))
      .toBe(displayScaleFor(actor({ age: 12, named: false })));
    expect(displayScaleFor(actor({ age: 12, named: true })))
      .toBeLessThan(displayScaleFor(actor({ age: 30, named: false })));
    expect(displayScaleFor(actor({ age: 15, named: true }))).toBeCloseTo(0.9);
    expect(displayScaleFor(actor({ age: 17, named: true }))).toBeLessThan(1);
    expect(displayScaleFor(actor({ age: 30, named: true })))
      .toBeGreaterThan(displayScaleFor(actor({ age: 30, named: false })));
  });

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

  it('los siete oficios tienen figura, y el forastero la suya, que no es de oficio', () => {
    for (const role of Object.keys(VILLAGER_BY_ROLE) as (keyof typeof VILLAGER_BY_ROLE)[]) {
      expect(modelFor(actor({ role }))).toBe(VILLAGER_BY_ROLE[role]);
    }
    // El forastero no está en `VILLAGER_BY_ROLE` a propósito: no es un oficio.
    // Pide su figura y, mientras no exista, cae al base como todos.
    expect(modelFor(actor({ role: 'stranger' }))).toBe(STRANGER_VILLAGER);
    expect(modelChainFor(actor({ role: 'stranger' }))).toEqual([STRANGER_VILLAGER, BASE_VILLAGER]);
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

describe('V-15b · la cadena de respaldo, que es lo que hace segura la mudanza', () => {
  it('un jefe anciano no pierde su malla de jefe mientras no exista la de anciano', () => {
    // **El fallo que esta cadena evita, y que estuve a punto de meter.** Con un
    // solo respaldo al aldeano base, un jefe de sesenta y cinco años pedía
    // `villager-elder` —que el taller todavía no ha entregado—, no la
    // encontraba, y se caía directo al aldeano de siempre: o sea que enganchar
    // la regla nueva habría **empeorado** lo que se ve hoy. Con la cadena pide
    // anciano, no lo hay, pide jefe, y lo hay.
    const chain = modelChainFor(actor({ age: 65, role: 'leader' }));
    expect(chain[0]).toBe('villager-elder');
    expect(chain).toContain(VILLAGER_BY_ROLE.leader);
    expect(chain[chain.length - 1]).toBe(BASE_VILLAGER);
    expect(chain.indexOf('villager-elder')).toBeLessThan(chain.indexOf(VILLAGER_BY_ROLE.leader));
  });

  it('y con las mallas de hoy, nadie cambia de figura: la mudanza no se ve', () => {
    // La condición que me puse para enganchar esto: **hoy no puede cambiar
    // nada**, porque ninguna malla nueva existe todavía. Se comprueba con el
    // catálogo de verdad: la primera malla de la cadena que exista tiene que ser
    // la misma que la regla vieja habría dado, que era el oficio o el base.
    const HAY = new Set([BASE_VILLAGER, ...Object.values(VILLAGER_BY_ROLE)]);
    const antes = (who: Actor): string =>
      who.role !== null && who.role !== 'stranger' ? VILLAGER_BY_ROLE[who.role] : BASE_VILLAGER;

    const ages = [3, 10, 15, 30, 59, 60, 72];
    const roles = [null, 'stranger', ...Object.keys(VILLAGER_BY_ROLE)] as Actor['role'][];
    const jobs = [null, 'field', 'felling', 'building', 'herding', 'water'] as Actor['occupation'][];
    for (const age of ages) {
      for (const role of roles) {
        for (const occupation of jobs) {
          const who = actor({ age, role, occupation });
          const primera = modelChainFor(who).find((name) => HAY.has(name));
          expect(primera, `${age} años, ${role ?? 'sin oficio'}, ${occupation ?? 'sin tarea'}`)
            .toBe(antes(who));
        }
      }
    }
  });

  it('y ninguna cadena se queda sin el aldeano base al final', () => {
    for (const age of [1, 20, 80]) {
      for (const occupation of [null, 'field', 'water'] as Actor['occupation'][]) {
        const chain = modelChainFor(actor({ age, occupation }));
        expect(chain[chain.length - 1]).toBe(BASE_VILLAGER);
      }
    }
  });
});

describe('V-15b · el cargador pide todo lo que la cadena puede nombrar', () => {
  it('cada nombre que la cadena puede devolver está en la lista que se carga', () => {
    // Un id que no está en `WANTED` no se carga aunque esté en el catálogo:
    // sin esto, un modelo recién entregado se ignoraría en silencio y la cadena
    // caería al base para siempre. Se barre lo que la cadena puede pedir de
    // verdad, no una lista escrita a mano.
    const ages = [3, 30, 72];
    const roles = [null, 'stranger', ...Object.keys(VILLAGER_BY_ROLE)] as Actor['role'][];
    const jobs = [null, 'field', 'felling', 'building', 'herding', 'water'] as Actor['occupation'][];
    const asked = new Set<string>();
    for (const age of ages) for (const role of roles) for (const occupation of jobs) {
      for (const name of modelChainFor(actor({ age, role, occupation }))) asked.add(name);
    }
    for (const name of asked) expect(WANTED, name).toContain(name);
    for (const name of VILLAGER_MODELS) expect(WANTED, name).toContain(name);
  });
});
