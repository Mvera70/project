// V-02 · Los cuerpos. Anexo E.
//
// Las cuatro propiedades que el plan exige, más la de la rejilla. Lo que
// guardan no es un módulo: es que **un cuerpo ocupa sitio**, que es de donde
// sale todo lo que la capa de vida promete. Si esto se rompe, volvemos a
// necesitar `lane` y `detour`.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import type { GameState } from '@engine/state';
import { hash32 } from '@engine/rng';
import {
  blockedAt, gap, integrate, turnTo, type Body, type Terrain,
} from '../../src/render3d/life/body';
import { createNeighbourhood } from '../../src/render3d/life/grid';
import { terrainOf } from '../../src/render3d/life/terrain';
import { avoid, drive, resolve, seek, separate } from '../../src/render3d/life/steering';
import { LIFE_STEP } from '../../src/render3d/life/clock';

/** Un prado con una casa en medio, para las pruebas que no necesitan el valle. */
function meadow(width = 24, height = 24): Terrain {
  const blocked = new Uint8Array(width * height);
  for (let z = 10; z < 14; z += 1) {
    for (let x = 10; x < 14; x += 1) blocked[z * width + x] = 1;
  }
  return { width, height, blocked };
}

/** El valle de verdad: río, roqueda y lo construido. */
function valley(seed: number, years = 40): { land: Terrain; state: GameState } {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return { land: terrainOf(state), state };
}

/**
 * Gente repartida por el valle, **y sin nacer unos dentro de otros**.
 *
 * Lo segundo no es un detalle del andamiaje: sin ello la prueba del solape
 * medía la colocación inicial y no la separación, y daba 0,295 celdas sin que
 * el algoritmo tuviera culpa de nada.
 */
function crowd(land: Terrain, count: number, seed: number): Body[] {
  const bodies: Body[] = [];
  for (let id = 0; id < count; id += 1) {
    let x = 1.5;
    let z = 1.5;
    for (let tries = 0; tries < 400; tries += 1) {
      const px = 1 + (hash32(seed, `x:${id}:${tries}`) / 4_294_967_296) * (land.width - 2);
      const pz = 1 + (hash32(seed, `z:${id}:${tries}`) / 4_294_967_296) * (land.height - 2);
      if (blockedAt(land, px, pz)) continue;
      if (bodies.some((other) => Math.hypot(other.x - px, other.z - pz) < 0.8)) continue;
      x = px; z = pz; break;
    }
    bodies.push({ id, x, z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 });
  }
  return bodies;
}

/** Un paso completo: querer, empujar, mover, y separar a los que quedaron encima. */
function step(bodies: Body[], land: Terrain, around: ReturnType<typeof createNeighbourhood>,
  goals: Map<number, { x: number; z: number }>): void {
  around.rebuild(bodies);
  for (const body of bodies) {
    const to = goals.get(body.id) ?? { x: body.x, z: body.z };
    const want = seek(body, to);
    const push = separate(body, around);
    const wall = avoid(body, land);
    drive(body, { x: want.x + push.x + wall.x, z: want.z + push.z + wall.z });
    integrate(body, land, LIFE_STEP);
    const speed = Math.hypot(body.vx, body.vz);
    if (speed > 0.05) turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  }
  resolve(bodies, around, land);
}

describe('V-02 · los cuerpos', () => {
  it('dos que van al mismo punto no acaban en el mismo punto', () => {
    // La propiedad que hace innecesario `lane`: no hay que repartir carriles
    // porque dos cosas con radio no caben en el mismo sitio.
    const land = meadow();
    const bodies = crowd(land, 12, 7);
    const around = createNeighbourhood(land.width, land.height);
    const spot = { x: 6, z: 6 };
    const goals = new Map(bodies.map((b) => [b.id, spot]));

    let closest = Infinity;
    for (let n = 0; n < 900; n += 1) {
      step(bodies, land, around, goals);
      for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          closest = Math.min(closest, gap(bodies[i] as Body, bodies[j] as Body));
        }
      }
    }
    // Doce personas convocadas al mismo palmo de prado, y ninguna dentro de
    // otra: se tocan y ahí se quedan.
    expect(closest, `lo más cerca que llegan dos es ${closest.toFixed(3)}`)
      .toBeGreaterThan(0.63);
  });

  it('nadie atraviesa nada en diez mil pasos, en seis valles', () => {
    // Lo que `detour` y `aroundWalls` hacían a mano sobre una ruta que no podía
    // cambiar. Aquí lo hace el cuerpo al no caber, y se comprueba sobre el valle
    // de verdad: río con su cauce, roqueda y lo construido.
    for (const seed of [7, 11, 23, 41, 97, 3]) {
      const { land } = valley(seed);
      const bodies = crowd(land, 30, seed);
      const around = createNeighbourhood(land.width, land.height);
      const goals = new Map<number, { x: number; z: number }>();
      let trapped = 0;

      for (let n = 0; n < 340; n += 1) {
        // Se les manda a la otra punta cada tanto, para que crucen de verdad.
        if (n % 85 === 0) {
          bodies.forEach((body, i) => {
            goals.set(body.id, (i + n) % 2 === 0
              ? { x: land.width - 2, z: land.height - 2 }
              : { x: 1.5, z: 1.5 });
          });
        }
        step(bodies, land, around, goals);
        for (const body of bodies) if (blockedAt(land, body.x, body.z)) trapped += 1;
      }
      expect(trapped, `semilla ${seed}: alguien dentro de un muro`).toBe(0);
    }
  });

  it('nadie se sale del valle', () => {
    const { land } = valley(7);
    const bodies = crowd(land, 20, 11);
    const around = createNeighbourhood(land.width, land.height);
    // Todos empujando hacia fuera del mapa, a la vez, que es el caso peor.
    const goals = new Map(bodies.map((b) => [b.id, { x: -50, z: -50 }]));
    for (let n = 0; n < 600; n += 1) {
      step(bodies, land, around, goals);
      for (const body of bodies) {
        expect(body.x).toBeGreaterThanOrEqual(0);
        expect(body.z).toBeGreaterThanOrEqual(0);
        expect(body.x).toBeLessThanOrEqual(land.width);
        expect(body.z).toBeLessThanOrEqual(land.height);
      }
    }
  });

  it('la cara sigue al paso, y no da tirones', () => {
    const body: Body = { id: 0, x: 4, z: 4, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 };
    let biggest = 0;
    for (let n = 0; n < 300; n += 1) {
      // Rumbo que cambia de golpe: lo peor que se le puede pedir.
      const heading = n < 150 ? 0 : Math.PI;
      const was = body.facing;
      turnTo(body, heading, LIFE_STEP);
      biggest = Math.max(biggest, Math.abs(body.facing - was));
    }
    expect(Math.abs(body.facing - Math.PI), 'acaba mirando a donde se le dijo')
      .toBeLessThan(0.01);
    expect(biggest, `el mayor giro de un paso es ${biggest.toFixed(3)} rad`)
      .toBeLessThanOrEqual(6 * LIFE_STEP + 1e-9);
  });

  it('nadie se mueve a saltos, ni siquiera en una plaza llena', () => {
    // El defecto que persiguió a las últimas rondas, medido de raíz. Y el caso
    // que sólo aparece con multitud: sin tope, la corrección de solapes mueve
    // más que andar y eso es un teletransporte por la puerta de atrás.
    const land = meadow(16, 16);
    const bodies = crowd(land, 40, 23);
    const around = createNeighbourhood(land.width, land.height);
    const goals = new Map(bodies.map((b) => [b.id, { x: 8, z: 8 }]));

    let biggest = 0;
    let was = bodies.map((b) => ({ x: b.x, z: b.z }));
    for (let n = 0; n < 600; n += 1) {
      step(bodies, land, around, goals);
      bodies.forEach((body, i) => {
        const old = was[i];
        if (old !== undefined) biggest = Math.max(biggest, gap(body, old));
      });
      was = bodies.map((b) => ({ x: b.x, z: b.z }));
    }
    // Andar son 0,06 por paso; el tope de la corrección otro tanto. Cualquier
    // cosa por encima de eso no es moverse, es aparecer en otro sitio.
    expect(biggest, `el paso más largo es ${biggest.toFixed(3)} celdas`).toBeLessThan(0.15);
  });

  it('la rejilla ve lo que hay cerca, y no se inventa vecinos', () => {
    const land = meadow(40, 40);
    const around = createNeighbourhood(land.width, land.height);
    const bodies: Body[] = [
      { id: 0, x: 5, z: 5, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1 },
      { id: 1, x: 5.4, z: 5, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1 },
      { id: 2, x: 30, z: 30, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1 },
    ];
    around.rebuild(bodies);

    const seen: number[] = [];
    around.near(bodies[0] as Body, (other) => seen.push(other.id));
    expect(seen, 've al de al lado').toContain(1);
    expect(seen, 'y no al de la otra punta').not.toContain(2);
    expect(seen, 'ni a sí mismo').not.toContain(0);
  });

  it('la rejilla hace que la escala deje de importar', () => {
    // La razón de ser de V-02 frente al descarte. Todos contra todos es n²:
    // medido allí, triplicar la gente multiplicaba el coste por seis. Con la
    // rejilla, el coste por cuerpo tiene que quedarse plano.
    const { land } = valley(7);
    const around = createNeighbourhood(land.width, land.height);
    const cost = (count: number): number => {
      const bodies = crowd(land, count, 41);
      const goals = new Map(bodies.map((b) => [b.id, { x: land.width / 2, z: land.height / 2 }]));
      // Una vuelta en vacío, que la primera siempre paga la compilación.
      for (let n = 0; n < 60; n += 1) step(bodies, land, around, goals);
      const started = performance.now();
      for (let n = 0; n < 300; n += 1) step(bodies, land, around, goals);
      return (performance.now() - started) / 300 / count;
    };

    const few = cost(20);
    const many = cost(160);
    // Ocho veces la gente no puede costar más del triple por cabeza. Con n²
    // costaría ocho veces más por cabeza, que es justo lo que se viene a evitar.
    expect(many, `por cuerpo: ${(few * 1000).toFixed(1)} µs con 20, `
      + `${(many * 1000).toFixed(1)} µs con 160`).toBeLessThan(few * 3);
  });
});
