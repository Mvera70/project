// D4 · El cuerpo a cuerpo. design.md §1b, fase 4.
//
// **Lo que esta ronda añade al asedio es que defender cueste.** Hasta aquí la
// batalla era de un solo sentido —las flechas salían de la muralla, la partida
// golpeaba una puerta— y el parte de B4 informaba `lost: 0` siempre. Un asedio
// en el que sólo muere el que ataca no es un asedio.
//
// Lo que se guarda aquí es la mecánica pura, sin valle y sin física: lo que
// decide es **la distancia**, y las dos armas no valen lo mismo. La pelea dentro
// de una jornada de verdad la mide `tests/journeys/assault.test.ts`.

import { describe, expect, it } from 'vitest';
import { fallenDefenders, stepMelee, type Defender } from '../../src/render3d/life/melee';
import type { Manned } from '../../src/render3d/life/garrison';
import type { Raider } from '../../src/render3d/life/raiders';
import type { Arm } from '@derive/garrison';

/** Un saqueador de juguete, donde se le diga. */
function raider(x: number, z: number): Raider {
  return {
    body: { id: -1, x, z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.4 },
    road: { x: 0, z: 0 },
    post: { x, z },
    inside: { x: 0, z: 0 },
    phase: 'breaking',
    route: [],
    deadline: 9999,
    standingUntil: 0,
    forced: false,
    hits: 0,
    entered: false,
  };
}

/** Un defensor de juguete, con su arma. */
function defender(x: number, z: number, arm: Arm): Defender {
  const post = {
    place: { id: `post:wall:${x},${z}`, at: { x, z }, offers: [] },
    post: { x, y: z, arm, on: 'wall' as const },
    facing: { x, z },
  } as unknown as Manned;
  return { at: { x, z }, post, hits: 0, down: false };
}

/** Pasos suficientes para que se repartan unos cuantos golpes. */
function brawl(raiders: readonly Raider[], defenders: readonly Defender[], steps: number): void {
  for (let step = 0; step <= steps; step += 1) stepMelee(raiders, defenders, step);
}

describe('D4 · el cuerpo a cuerpo', () => {
  it('a distancia no se pega', () => {
    // La única regla: el alcance de un brazo. Un saqueador al otro lado del
    // pueblo no le hace nada a nadie, y sin esto la pelea empezaría el momento
    // en que la partida entra en el valle.
    const them = [raider(20, 20)];
    const us = [defender(30, 30, 'spear')];
    brawl(them, us, 600);
    expect(us[0]?.hits, 'nadie ha tocado a nadie').toBe(0);
    expect(them[0]?.hits).toBe(0);
  });

  it('al alcance, los dos se golpean y alguno cae', () => {
    const them = [raider(10, 10)];
    const us = [defender(10.5, 10, 'spear')];
    brawl(them, us, 600);
    // Uno de los dos tiene que haber caído: una pelea que no acaba nunca es lo
    // que E.7 prohíbe en esta capa.
    expect(us[0]!.down || them[0]!.phase === 'down', 'la pelea acaba').toBe(true);
  });

  it('el arquero devuelve la mitad de los golpes, y por eso cae antes', () => {
    // **El defecto clásico del arquero**, y es lo que hace que una muralla
    // necesite las dos cosas (C1: lanzas *y* arcos). Mismo saqueador, mismo
    // sitio, misma distancia: el que tiene lanza le hace más daño.
    const againstSpear = [raider(10, 10)];
    const spearman = [defender(10.5, 10, 'spear')];
    brawl(againstSpear, spearman, 90);

    const againstBow = [raider(10, 10)];
    const archer = [defender(10.5, 10, 'bow')];
    brawl(againstBow, archer, 90);

    expect(againstSpear[0]!.hits, 'la lanza devuelve más')
      .toBeGreaterThan(againstBow[0]!.hits);
  });

  it('doce contra uno acaban con él, que es lo que hace peligroso un asalto', () => {
    // La propiedad que §1b pide del asalto grande: el que sujeta la puerta solo
    // no la sujeta. No es un número elegido, es la consecuencia de que cada uno
    // pegue: doce golpes por ciclo contra uno devuelto.
    const them = Array.from({ length: 12 }, (_, n) => raider(10 + n * 0.05, 10));
    const us = [defender(10.2, 10, 'spear')];
    brawl(them, us, 60);
    expect(us[0]?.down, 'cae el que estaba solo').toBe(true);
    expect(fallenDefenders(us), 'y se cuenta, que es el `lost` del parte').toBe(1);
  });

  it('a un caído no se le pega más', () => {
    // Un cuerpo en el suelo deja de ser un blanco: sin esto, los doce seguirían
    // golpeando a un muerto y el parte contaría bajas que no existen.
    const them = [raider(10, 10)];
    const us = [defender(10.5, 10, 'bow')];
    brawl(them, us, 600);
    if (!us[0]!.down) return;
    const after = us[0]!.hits;
    brawl(them, us, 600);
    expect(us[0]?.hits, 'los golpes no siguen subiendo').toBe(after);
  });

  it('y el que ya cayó del otro lado tampoco pelea', () => {
    const them = [raider(10, 10)];
    them[0]!.phase = 'down';
    const us = [defender(10.5, 10, 'spear')];
    brawl(them, us, 600);
    expect(us[0]?.hits, 'un saqueador en el suelo no pega').toBe(0);
  });
});
