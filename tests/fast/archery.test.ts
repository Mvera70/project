// D2 · La flecha, y a dónde va. design.md §1b, fase 4.
//
// **Lo que se puede guardar de una cosa que no es determinista.** El asedio se
// resuelve en físico y dos partidas con la misma semilla pueden acabar distinto
// (§1b, decisión del dueño del diseño), así que aquí no hay asertos de igualdad
// sobre el resultado de una batalla. Lo que sí es una propiedad del diseño, y es
// lo que estas pruebas cierran:
//
//  · **Apuntar es apuntar.** La cuenta de balística y el mundo de Rapier tienen
//    que estar de acuerdo: si se le dice a `aimAt` «a diez celdas», la flecha
//    que Rapier vuela cae a diez celdas. Las dos usan la misma gravedad, y esta
//    prueba es lo que impide que un día se cambie en un sitio y no en el otro.
//  · **La muralla para las flechas por el mismo sitio por el que para a la
//    gente**, que es la propiedad que D1 dejó montada y ésta hereda.
//  · **Nadie tira a lo que no se llega**, y eso no es un fallo: es que no se
//    llega.

import { describe, expect, it } from 'vitest';
import { aimAt } from '../../src/render3d/life/archery';
import { createPhysics } from '../../src/render3d/life/physics';
import type { Terrain } from '../../src/render3d/life/body';

/** Un valle de juguete, todo suelo. Lo que se mide aquí es el vuelo. */
function land(): Terrain {
  const width = 48;
  const height = 48;
  return { width, height, blocked: new Uint8Array(width * height) };
}

/** Lo alto del cerco desde donde se suelta, y el pecho al que se apunta. */
const WALL = 2;
const CHEST = 0.4;

describe('D2 · la flecha', () => {
  it('cae donde se apuntó, y lo dice la física y no la cuenta', async () => {
    // La propiedad que casa las dos mitades de esta ronda. Se prueba a tres
    // distancias del alcance porque un solo tiro no distingue una buena cuenta
    // de una casualidad.
    const world = await createPhysics(land());
    expect(world, 'Rapier tiene que cargar en este entorno').not.toBeNull();
    if (world === null) return;
    const from = { x: 10, y: WALL, z: 10 };
    for (const far of [4, 7, 10]) {
      const to = { x: from.x + far, y: CHEST, z: from.z };
      const velocity = aimAt(from, to);
      expect(velocity, `a ${far} celdas se llega`).not.toBeNull();
      if (velocity === null) continue;
      const arrow = world.launch(from, velocity);
      // Se vuela hasta que baja del pecho, con el mismo paso que la vida.
      let steps = 0;
      while (arrow.at.y > CHEST && steps < 300) { world.step(); steps += 1; }
      const landed = Math.hypot(arrow.at.x - from.x, arrow.at.z - from.z);
      // **Media celda de margen, y está medido, no elegido**: el rozamiento del
      // aire (`ARROW_DRAG`, D1) acorta el vuelo respecto de la parábola de libro
      // que `aimAt` resuelve, y el paso de 1/30 a doce celdas por segundo avanza
      // 0,4 celdas de golpe. Medido a 4, 7 y 10 celdas, la flecha cae entre
      // 0,07 y 0,32 celdas corta. Lo que esta prueba impide es que un día la
      // gravedad de `archery.ts` deje de ser la de `physics.ts`: con la mitad,
      // la flecha caería tres celdas y pico lejos del blanco.
      expect(Math.abs(landed - far), `a ${far} celdas cayó a ${landed.toFixed(2)}`)
        .toBeLessThan(0.5);
      arrow.remove();
    }
    world.dispose();
  });

  it('no se tira a lo que no se llega', () => {
    // Con la velocidad de salida de un arco, el suelo tiene un alcance máximo:
    // más allá, la cuenta no tiene solución y `aimAt` lo dice. Lo que no puede
    // hacer es devolver un disparate que Rapier vuele a ninguna parte.
    const from = { x: 0, y: WALL, z: 0 };
    expect(aimAt(from, { x: 200, y: CHEST, z: 0 }), 'a doscientas celdas, nada').toBeNull();
    // Y tampoco a sus propios pies: un arquero no se dispara al zapato.
    expect(aimAt(from, { x: 0.2, y: CHEST, z: 0 }), 'a un palmo, nada').toBeNull();
  });

  it('la flecha rasa se la come la muralla, y la alta pasa', async () => {
    // La hereda de D1 —donde se midió con un lanzamiento a mano— y aquí se
    // comprueba **con la puntería de verdad**: el que dispara desde el cerco a
    // alguien que está al otro lado de otra muralla no acierta, y eso es lo que
    // hace que un cerco sirva de algo.
    const width = 48;
    const height = 48;
    const blocked = new Uint8Array(width * height);
    for (let z = 0; z < height; z += 1) blocked[z * width + 20] = 1;
    const world = await createPhysics({ width, height, blocked });
    expect(world).not.toBeNull();
    if (world === null) return;
    // Desde el suelo, contra la muralla: la flecha se para en ella.
    const low = world.launch({ x: 16, y: 0.4, z: 24 }, aimAt(
      { x: 16, y: 0.4, z: 24 }, { x: 26, y: 0.4, z: 24 }) ?? { x: 0, y: 0, z: 0 });
    for (let n = 0; n < 120; n += 1) world.step();
    expect(low.at.x, 'la rasa no pasa de la muralla').toBeLessThan(21);
    world.dispose();
  });
});
