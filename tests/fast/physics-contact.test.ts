// AN-5b · El mundo de contacto de la caza (`createContactWorld`): lo que toca
// un tiro es lo que se pinta —el cuerpo tumbado de la presa, lo que está de pie
// con su altura, el suelo— y lo que la cierra sin estar de pie no para nada.

import { afterEach, describe, expect, it } from 'vitest';
import { createContactWorld, type ContactWorld } from '../../src/render3d/life/physics';
import type { Terrain } from '../../src/render3d/life/body';

const worlds: ContactWorld[] = [];
afterEach(() => { for (const world of worlds.splice(0)) world.dispose(); });

async function worldOf(land: Terrain, standing?: (x: number, z: number) => number | null): Promise<ContactWorld> {
  const world = await createContactWorld(land, { ground: () => 0, ...(standing === undefined ? {} : { standing }) });
  expect(world).not.toBeNull();
  worlds.push(world!);
  return world!;
}

const open = (): Terrain => ({ width: 20, height: 20, blocked: new Uint8Array(400) });

describe('AN-5b · el mundo de contacto', () => {
  it('una bola toca la cápsula tumbada a lo largo del cuerpo, no una esfera alrededor', async () => {
    const world = await worldOf(open());
    // Un jabalí en (10, 10) mirando a +x: tronco de 0,12 de radio a 0,25 del
    // suelo, con 0,16 de tramo recto a cada lado de su centro.
    world.shapes([{ id: 7, x: 10, y: 0.25, z: 10, facing: Math.PI / 2, halfLength: 0.16, radius: 0.12 }]);
    // De costado, a la altura del lomo y dentro del tramo recto: toca a 0,12 del eje.
    const side = world.cast({ x: 10.1, y: 0.25, z: 8 }, { x: 10.1, y: 0.25, z: 12 }, 0.02);
    expect(side?.surface).toBe('body');
    expect(side?.id).toBe(7);
    expect(side!.at.z).toBeCloseTo(10 - 0.12 - 0.02, 2);
    // Más allá del extremo del tronco (0,16 + 0,12 = 0,28 del centro) pasa de largo.
    expect(world.cast({ x: 10.35, y: 0.25, z: 8 }, { x: 10.35, y: 0.25, z: 12 }, 0.02)).toBeNull();
    // Y por encima del lomo (0,37), también: no es la bola de 0,44 de antes.
    expect(world.cast({ x: 10, y: 0.42, z: 8 }, { x: 10, y: 0.42, z: 12 }, 0.02)).toBeNull();
  });

  it('lo que está de pie tapa con la altura que se pinta, y la montaña no es una pared', async () => {
    const land = open();
    // Una empalizada en la columna x = 5, y una celda de montaña en x = 12.
    for (let z = 0; z < 20; z += 1) land.blocked[z * 20 + 5] = 1;
    land.blocked[10 * 20 + 12] = 1;
    const world = await worldOf(land, (x) => (x === 5 ? 0.87 : null));
    const low = world.cast({ x: 2, y: 0.4, z: 10.5 }, { x: 8, y: 0.4, z: 10.5 }, 0.02);
    expect(low?.surface).toBe('standing');
    expect(low!.at.x).toBeCloseTo(5 - 0.02, 2);
    // Por encima de su 0,87 la flecha pasa: no es una muralla de dos celdas.
    expect(world.cast({ x: 2, y: 1.1, z: 10.5 }, { x: 8, y: 1.1, z: 10.5 }, 0.02)).toBeNull();
    // La celda cerrada sin `standing` (la montaña: ya es suelo) no para nada.
    expect(world.cast({ x: 10, y: 0.4, z: 10.5 }, { x: 14, y: 0.4, z: 10.5 }, 0.02)).toBeNull();
  });

  it('el suelo se distingue de lo que está de pie, y un cuerpo detrás de un muro no se toca', async () => {
    const land = open();
    for (let z = 0; z < 20; z += 1) land.blocked[z * 20 + 5] = 1;
    const world = await worldOf(land, () => 0.87);
    world.shapes([{ id: 3, x: 6, y: 0.25, z: 10, facing: 0, halfLength: 0.16, radius: 0.12 }]);
    // Lo primero en el tramo es la empalizada, aunque la presa esté a un paso.
    const blocked = world.cast({ x: 4.2, y: 0.3, z: 10 }, { x: 6.5, y: 0.3, z: 10 }, 0.02);
    expect(blocked?.surface).toBe('standing');
    expect(blocked?.id).toBeNull();
    // Una flecha que baja da en el suelo.
    const down = world.cast({ x: 1, y: 0.3, z: 3 }, { x: 2, y: -0.2, z: 3 }, 0.02);
    expect(down?.surface).toBe('ground');
    // Mirar la línea libre ignora a la presa y ve sólo lo fijo.
    expect(world.cast({ x: 7, y: 0.25, z: 8 }, { x: 7, y: 0.25, z: 12 }, 0.02, false)).toBeNull();
  });

  it('la forma sigue al cuerpo cuando se mueve, gira o se alza', async () => {
    const world = await worldOf(open());
    world.shapes([{ id: 1, x: 10, y: 0.42, z: 10, facing: 0, halfLength: 0.2, radius: 0.25 }]);
    // Mirando a +z, el tronco va a lo largo de z: de costado por x se toca a 0,25.
    expect(world.cast({ x: 8, y: 0.42, z: 10.3 }, { x: 12, y: 0.42, z: 10.3 }, 0.02)?.id).toBe(1);
    world.shapes([{ id: 1, x: 10, y: 0.42, z: 10, facing: Math.PI / 2, halfLength: 0.2, radius: 0.25 }]);
    // Girado a +x, a 0,3 de lado por z ya no hay tronco (0,25 de radio).
    expect(world.cast({ x: 8, y: 0.42, z: 10.3 }, { x: 12, y: 0.42, z: 10.3 }, 0.02)).toBeNull();
    // Alzado, el eje es vertical y llega a la altura del pecho.
    world.shapes([{ id: 1, x: 10, y: 0.62, z: 10, facing: 0, halfLength: 0.24, radius: 0.24, upright: true }]);
    expect(world.cast({ x: 8, y: 1, z: 10 }, { x: 12, y: 1, z: 10 }, 0.02)?.id).toBe(1);
    // Y la que se va del mundo se quita.
    world.shapes([]);
    expect(world.cast({ x: 8, y: 0.62, z: 10 }, { x: 12, y: 0.62, z: 10 }, 0.02)).toBeNull();
  });
});
