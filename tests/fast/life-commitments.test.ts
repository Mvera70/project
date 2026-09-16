// IA-2 · El registro de compromisos. Anexo E, docs/life-ai-proposal.md §8.
//
// Lo que se guarda aquí son propiedades del diseño (§8 del brief, y las que
// `docs/life-ai-implementation-prompt.md` pide para esta fase), no detalles
// de `commitments.ts`: una reserva es atómica, liberar dos veces es como
// liberar una, un actor no está en dos compromisos a la vez, dos actores no
// aceptan escenas distintas en el mismo paso, el orden de resolución no
// depende de cómo llegue la lista, y reconstruir la misma jornada con la
// misma semilla da la misma aldea.

import { describe, expect, it } from 'vitest';
import type { Trait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import type { Body, Point, Terrain } from '../../src/render3d/life/body';
import { freshNeeds, type Needs } from '../../src/render3d/life/needs';
import type { Dweller } from '../../src/render3d/life/village';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { terrainOf } from '../../src/render3d/life/terrain';
import { blockedAt } from '../../src/render3d/life/body';
import {
  proposeGreet, proposeYield, GREET_REACH,
} from '../../src/render3d/life/scenes';
import {
  actorKey, createCommitmentRegistry, resolveBatch,
  type ActorRef, type InteractionProposal,
} from '../../src/render3d/life/commitments';

const villager = (id: number): ActorRef => ({ kind: 'villager', id });

function proposal(
  id: string, initiator: ActorRef, recipient: ActorRef,
  spots: readonly [Point, Point], expiresAtStep = 100,
): InteractionProposal {
  return { id, kind: 'chat', initiator, recipient, spots, expiresAtStep };
}

describe('IA-2 · el registro de compromisos', () => {
  it('una reserva atómica concede los dos actores y los dos sitios, o ninguno', () => {
    const reg = createCommitmentRegistry();
    const spots: [Point, Point] = [{ x: 1, z: 1 }, { x: 2, z: 1 }];
    const lease = reg.tryReserve(proposal('a', villager(1), villager(2), spots), 0);
    expect(lease).not.toBeNull();
    expect(reg.busy(villager(1))).toBe(true);
    expect(reg.busy(villager(2))).toBe(true);
  });

  it('una reserva que falla no deja medio compromiso puesto', () => {
    const reg = createCommitmentRegistry();
    reg.tryReserve(proposal('a', villager(1), villager(2), [{ x: 0, z: 0 }, { x: 1, z: 0 }]), 0);
    // El 2 ya está ocupado: la propuesta con el 3 tiene que caerse entera, y
    // el 3 —que no tenía nada— tiene que seguir libre después del intento.
    const rejected = reg.tryReserve(
      proposal('b', villager(2), villager(3), [{ x: 5, z: 5 }, { x: 6, z: 5 }]), 1,
    );
    expect(rejected).toBeNull();
    expect(reg.busy(villager(3)), 'el 3 no tenía nada que ver y tiene que seguir libre').toBe(false);
    expect(reg.get('b'), 'nada a medias con el id rechazado').toBeUndefined();
  });

  it('un sitio ya reservado por otro compromiso bloquea la reserva entera', () => {
    const reg = createCommitmentRegistry();
    reg.tryReserve(proposal('a', villager(1), villager(2), [{ x: 10, z: 10 }, { x: 10.2, z: 10 }]), 0);
    // El 3 y el 4 son actores libres, pero uno de sus dos sitios cae encima
    // del que ya usa la pareja 1-2: la reserva entera tiene que caerse, no
    // sólo el sitio que choca.
    const clash = reg.tryReserve(
      proposal('b', villager(3), villager(4), [{ x: 10.05, z: 10 }, { x: 20, z: 20 }]), 0,
    );
    expect(clash).toBeNull();
    expect(reg.busy(villager(3))).toBe(false);
    expect(reg.busy(villager(4))).toBe(false);
  });

  it('liberar dos veces es exactamente igual que liberar una', () => {
    const reg = createCommitmentRegistry();
    reg.tryReserve(proposal('a', villager(1), villager(2), [{ x: 0, z: 0 }, { x: 1, z: 0 }]), 0);
    reg.release('a');
    expect(reg.busy(villager(1))).toBe(false);
    expect(reg.busy(villager(2))).toBe(false);
    // La segunda llamada no puede lanzar, ni dejar nada peor de lo que ya
    // había: sigue sin haber nadie ocupado, y sigue sin existir el id.
    expect(() => reg.release('a')).not.toThrow();
    expect(reg.busy(villager(1))).toBe(false);
    expect(reg.get('a')).toBeUndefined();
    // Y libera de verdad: el 1 puede volver a comprometerse con otro.
    const again = reg.tryReserve(proposal('c', villager(1), villager(3), [{ x: 0, z: 0 }, { x: 1, z: 0 }]), 1);
    expect(again).not.toBeNull();
  });

  it('un actor está en un compromiso como mucho', () => {
    const reg = createCommitmentRegistry();
    reg.tryReserve(proposal('a', villager(1), villager(2), [{ x: 0, z: 0 }, { x: 1, z: 0 }]), 0);
    const second = reg.tryReserve(
      proposal('b', villager(1), villager(3), [{ x: 5, z: 5 }, { x: 6, z: 5 }]), 0,
    );
    expect(second, 'el 1 ya estaba en algo').toBeNull();
    expect(reg.of(villager(1))?.id).toBe('a');
  });

  it('caduca solo, y `expire` lo suelta sin que nadie tenga que pedirlo por id', () => {
    const reg = createCommitmentRegistry();
    reg.tryReserve(proposal('a', villager(1), villager(2), [{ x: 0, z: 0 }, { x: 1, z: 0 }], 10), 0);
    reg.expire(9);
    expect(reg.busy(villager(1)), 'todavía no ha caducado').toBe(true);
    reg.expire(10);
    expect(reg.busy(villager(1)), 'ya ha caducado').toBe(false);
  });

  it('dos actores no aceptan escenas distintas en el mismo paso: gana el orden canónico', () => {
    const reg = createCommitmentRegistry();
    // El 5 aparece en dos propuestas del mismo paso, con id de propuesta que
    // a propósito no coincide con el orden de llegada: si el registro mirara
    // el orden de la lista en vez de los ids, el resultado cambiaría según
    // cómo se pase el array.
    const first = proposal('z-tarde', villager(5), villager(9), [{ x: 0, z: 0 }, { x: 1, z: 0 }]);
    const second = proposal('a-pronto', villager(5), villager(2), [{ x: 5, z: 5 }, { x: 6, z: 5 }]);
    const granted = resolveBatch(reg, [first, second], 0);
    expect(granted.size, JSON.stringify([...granted.keys()])).toBe(1);
    // Y el resultado no depende de en qué orden llegó la lista al lote.
    const reg2 = createCommitmentRegistry();
    const granted2 = resolveBatch(reg2, [second, first], 0);
    expect([...granted.keys()]).toEqual([...granted2.keys()]);
  });

  it('los compromisos válidos que ya existen se conservan primero', () => {
    const reg = createCommitmentRegistry();
    reg.tryReserve(proposal('existing', villager(1), villager(2), [{ x: 0, z: 0 }, { x: 1, z: 0 }], 50), 0);
    // Una propuesta nueva que quiere al 1 con otra pareja no puede desalojar
    // el compromiso que ya tenía: `resolveBatch` no borra nada por su cuenta.
    const granted = resolveBatch(
      reg, [proposal('new', villager(1), villager(3), [{ x: 9, z: 9 }, { x: 10, z: 9 }])], 5,
    );
    expect(granted.size).toBe(0);
    expect(reg.of(villager(1))?.id).toBe('existing');
  });

  it('reserveRaw comparte almacén y liberación con tryReserve: shove/brawl y chat no se pisan', () => {
    const reg = createCommitmentRegistry();
    reg.tryReserve(proposal('chat', villager(1), villager(2), [{ x: 0, z: 0 }, { x: 1, z: 0 }]), 0);
    const raw = reg.reserveRaw('shove', [villager(2), villager(3)], [{ x: 5, z: 5 }, { x: 6, z: 5 }], 20, 0, 'shove-1');
    expect(raw, 'el 2 ya estaba en el chat').toBeNull();
    reg.release('chat');
    const rawAfter = reg.reserveRaw(
      'shove', [villager(2), villager(3)], [{ x: 5, z: 5 }, { x: 6, z: 5 }], 20, 1, 'shove-1',
    );
    expect(rawAfter).not.toBeNull();
    reg.release('shove-1');
    expect(reg.busy(villager(2))).toBe(false);
    expect(reg.busy(villager(3))).toBe(false);
  });

  it('actorKey distingue persona de bestia con el mismo id numérico', () => {
    expect(actorKey({ kind: 'villager', id: 4 })).not.toBe(actorKey({ kind: 'beast', id: 4 }));
  });
});

// ---------------------------------------------------------------------------
// `proposeYield`/`proposeGreet`: puros, deterministas, y con las condiciones
// del brief (§7 de la propuesta).
// ---------------------------------------------------------------------------

function makeDweller(
  id: number, at: Point, vel: { vx: number; vz: number } = { vx: 0, vz: 0 },
  traits: readonly Trait[] = [], needs: Partial<Needs> = {},
): Dweller {
  const body: Body = { id, x: at.x, z: at.z, vx: vel.vx, vz: vel.vz, facing: 0, radius: 0.32, pace: 1.3 };
  return {
    body, villager: id, traits, needs: { ...freshNeeds(), ...needs }, doing: null, rethinkAt: 0,
    travelled: 0, faceAnchor: { x: at.x, z: at.z }, scene: null, sceneCooldownUntil: 0,
    holding: null, aimAt: null, playedUntil: 0,
  };
}

/** Un pasillo de una celda de ancho, diez celdas de largo, entre dos muros. */
function corridor(): Terrain {
  const width = 12;
  const height = 6;
  const blocked = new Uint8Array(width * height);
  for (let x = 0; x < width; x += 1) {
    for (let z = 0; z < height; z += 1) {
      if (z !== 3) blocked[z * width + x] = 1;
    }
  }
  return { width, height, blocked };
}

/** Un prado abierto, sin una sola pared. */
function meadow(): Terrain {
  return { width: 20, height: 20, blocked: new Uint8Array(20 * 20) };
}

describe('IA-2 · cesión de paso', () => {
  it('dos que van de frente por un pasillo estrecho generan una cesión', () => {
    const land = corridor();
    const a = makeDweller(1, { x: 4, z: 3.5 }, { vx: 1, vz: 0 });
    const b = makeDweller(2, { x: 4.8, z: 3.5 }, { vx: -1, vz: 0 });
    const yielding = proposeYield(land, a, b, 7, 100);
    expect(yielding).not.toBeNull();
  });

  it('en campo abierto, el mismo cruce no cede: hay sitio de sobra para pasar', () => {
    const land = meadow();
    const a = makeDweller(1, { x: 10, z: 10 }, { vx: 1, vz: 0 });
    const b = makeDweller(2, { x: 10.8, z: 10 }, { vx: -1, vz: 0 });
    expect(proposeYield(land, a, b, 7, 100)).toBeNull();
  });

  it('si no van el uno hacia el otro, no hay cesión aunque estén cerca y el hueco sea estrecho', () => {
    const land = corridor();
    const a = makeDweller(1, { x: 4, z: 3.5 }, { vx: 1, vz: 0 });
    const b = makeDweller(2, { x: 4.8, z: 3.5 }, { vx: 1, vz: 0 }); // el mismo sentido, no de frente
    expect(proposeYield(land, a, b, 7, 100)).toBeNull();
  });

  it('quien cede se aparta a suelo libre y en el mapa, nunca dentro de un muro', () => {
    const land = corridor();
    for (let step = 0; step < 200; step += 1) {
      const a = makeDweller(1, { x: 4, z: 3.5 }, { vx: 1, vz: 0 });
      const b = makeDweller(2, { x: 4.8, z: 3.5 }, { vx: -1, vz: 0 });
      const yielding = proposeYield(land, a, b, step, step);
      if (yielding === null || yielding.aside === null) continue;
      expect(blockedAt(land, yielding.aside.x, yielding.aside.z), `paso ${step}`).toBe(false);
    }
  });

  it('es determinista: misma semilla y mismo paso dan la misma cesión', () => {
    const land = corridor();
    const a1 = makeDweller(1, { x: 4, z: 3.5 }, { vx: 1, vz: 0 });
    const b1 = makeDweller(2, { x: 4.8, z: 3.5 }, { vx: -1, vz: 0 });
    const a2 = makeDweller(1, { x: 4, z: 3.5 }, { vx: 1, vz: 0 });
    const b2 = makeDweller(2, { x: 4.8, z: 3.5 }, { vx: -1, vz: 0 });
    expect(proposeYield(land, a1, b1, 42, 10)).toEqual(proposeYield(land, a2, b2, 42, 10));
  });
});

describe('IA-2 · saludo de paso', () => {
  it('nunca salta por encima de su propio alcance', () => {
    const a = makeDweller(1, { x: 0, z: 0 });
    for (let step = 0; step < 500; step += 1) {
      const b = makeDweller(2, { x: GREET_REACH + 0.5, z: 0 });
      expect(proposeGreet(a, b, step, step)).toBeNull();
    }
  });

  it('salta de vez en cuando, no siempre ni nunca', () => {
    // **Se cuenta una oportunidad por ventana, no una por paso.** La primera
    // versión recorría cuatrocientos pasos seguidos de la misma pareja y
    // contaba cada paso como una tirada: eso pasaba porque la llave llevaba el
    // paso y se tiraba treinta veces por segundo, que es el fallo que el
    // cuaderno de referencia visual destapó (`docs/visual-reference` §2) — con
    // p = 0,2 repetida, la probabilidad acumulada es 1 − (1 − p)^n y a los
    // treinta intentos es prácticamente uno. Arreglado eso, cuatrocientos pasos
    // son **dos** oportunidades y cero aciertos es un resultado legítimo, así
    // que la prueba medía el fallo y no la propiedad.
    //
    // Ahora se barren parejas y ventanas separadas, que es lo que de verdad son
    // oportunidades, y se exige que la frecuencia se parezca a `GREET_ODDS`
    // sin ser ni cero ni todo.
    let hits = 0;
    let chances = 0;
    for (let pair = 0; pair < 40; pair += 1) {
      for (let window = 0; window < 10; window += 1) {
        const a = makeDweller(1 + pair * 2, { x: 0, z: 0 });
        const b = makeDweller(2 + pair * 2, { x: 1, z: 0 });
        // Muy separados en el tiempo: una ventana de saludo dura ocho segundos
        // escénicos, o sea doscientas cuarenta muestras de la vida.
        chances += 1;
        if (proposeGreet(a, b, 7, window * 600) !== null) hits += 1;
      }
    }
    const rate = hits / chances;
    expect(rate, `${hits} de ${chances} oportunidades`).toBeGreaterThan(0.05);
    expect(rate, `${hits} de ${chances} oportunidades`).toBeLessThan(0.5);
  });
});

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
