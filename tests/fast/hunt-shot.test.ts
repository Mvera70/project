// AN-5b · Lo que toca un tiro de caza lo decide el contacto: la parábola de
// siempre, barrida paso a paso contra el cuerpo que se pinta y contra lo que
// está de pie; y la estocada, de la mano a la punta tal como se pinta.

import { afterEach, describe, expect, it } from 'vitest';
import { createContactWorld, type ContactWorld } from '../../src/render3d/life/physics';
import { aimHuntShot, launchHuntShot, stepHuntShot, THRUST, thrustContact, thrustFor, tipYaw, worldOf } from '../../src/render3d/life/hunt-shot';
import type { Terrain } from '../../src/render3d/life/body';

const worlds: ContactWorld[] = [];
afterEach(() => { for (const world of worlds.splice(0)) world.dispose(); });
async function worldOf20(wall = false): Promise<ContactWorld> {
  const land: Terrain = { width: 20, height: 20, blocked: new Uint8Array(400) };
  if (wall) for (let z = 0; z < 20; z += 1) land.blocked[z * 20 + 5] = 1;
  const world = (await createContactWorld(land, { ground: () => 0, standing: () => 0.87 }))!;
  worlds.push(world);
  return world;
}
const deer = { id: 40_000, x: 7, y: 0.5, z: 2, facing: 0, halfLength: 0.12, radius: 0.13 };

describe('AN-5b · el tiro de caza', () => {
  it('la flecha bien apuntada toca el tronco del ciervo y se queda donde tocó', async () => {
    const world = await worldOf20();
    world.shapes([deer]);
    const from = { x: 2, y: 0.43, z: 2 };
    const shot = launchHuntShot(from, aimHuntShot(from, { x: 7, y: 0.5, z: 2 }, 'bow'), 'bow', 1, 100_001)!;
    let contact = null;
    for (let n = 0; n < 60 && contact === null && !shot.spent; n++) contact = stepHuntShot(shot, world);
    expect(contact?.surface).toBe('body');
    expect(contact?.id).toBe(40_000);
    expect(shot.spent).toBe(true);
    // La punta queda en la piel, no en el centro del ciervo.
    expect(shot.x).toBeCloseTo(7 - 0.13 - 0.025, 1);
  });

  it('un tiro que sale un palmo de lado pasa junto al ciervo y cae al suelo', async () => {
    const world = await worldOf20();
    world.shapes([deer]);
    const from = { x: 2, y: 0.43, z: 2 };
    const shot = launchHuntShot(from, aimHuntShot(from, { x: 7, y: 0.5, z: 2.4 }, 'bow'), 'bow', 1, 100_002)!;
    let contact = null;
    for (let n = 0; n < 90 && contact === null && !shot.spent; n++) contact = stepHuntShot(shot, world);
    expect(contact?.surface).toBe('ground');
  });

  it('la empalizada entre el cazador y la presa para la flecha: no la atraviesa', async () => {
    const world = await worldOf20(true);
    world.shapes([{ ...deer, x: 7 }]);
    const from = { x: 3, y: 0.43, z: 2 };
    const shot = launchHuntShot(from, aimHuntShot(from, { x: 7, y: 0.5, z: 2 }, 'bow'), 'bow', 1, 100_003)!;
    let contact = null;
    for (let n = 0; n < 60 && contact === null && !shot.spent; n++) contact = stepHuntShot(shot, world);
    expect(contact?.surface).toBe('standing');
    expect(shot.x).toBeLessThan(5.01);
  });

  it('la lanza tampoco: con la madera delante se clava en ella, a la distancia que alcanza la punta', async () => {
    const world = await worldOf20(true);
    // Un jabalí pegado al otro lado de la empalizada, al alcance de la lanza medida sin muro.
    world.shapes([{ id: 42_002, x: 5.35, y: 0.25, z: 10, facing: Math.PI / 2, halfLength: 0.16, radius: 0.12 }]);
    const at = { x: 4.75, z: 10 };
    const facing = Math.PI / 2 - tipYaw('low');
    const contact = thrustContact(world, at, 0, facing, 'low');
    expect(contact?.surface).toBe('standing');
    // Y sin la empalizada, la misma estocada toca al jabalí.
    const open = await worldOf20();
    open.shapes([{ id: 42_002, x: 5.35, y: 0.25, z: 10, facing: Math.PI / 2, halfLength: 0.16, radius: 0.12 }]);
    expect(thrustContact(open, at, 0, facing, 'low')?.id).toBe(42_002);
  });

  it('la estocada va de la mano a la punta que se pinta, y cada presa recibe la que le llega al tronco', () => {
    expect(worldOf({ x: 0, z: 0 }, 0, 0, THRUST.chest.tip).y).toBeCloseTo(0.346, 3);
    expect(worldOf({ x: 0, z: 0 }, 0, 0, THRUST.high.tip).y).toBeCloseTo(0.501, 3);
    expect(worldOf({ x: 0, z: 0 }, 0, 0, THRUST.low.tip).y).toBeCloseTo(0.202, 3);
    // Mirando a +x, la punta va por delante (+x) y cruza hacia la izquierda del cuerpo (+z).
    const turned = worldOf({ x: 0, z: 0 }, 0, Math.PI / 2, THRUST.chest.tip);
    expect(turned.x).toBeCloseTo(0.532, 3);
    expect(turned.z).toBeCloseTo(0.145, 3);
    // El jabalí (tronco a 0,25), el oso (0,42) y el ciervo (0,50).
    expect(thrustFor(0.25)).toBe('low');
    expect(thrustFor(0.42)).toBe('chest');
    expect(thrustFor(0.5)).toBe('high');
  });
});
