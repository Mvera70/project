// D1 · El mundo físico, y su matrimonio con el paso de la vida. §1b, fase 4.
//
// Lo que se guarda aquí es **el contrato de la capa**, no la batalla: que se
// pueda cargar, que caiga lo que tiene que caer, que la muralla pare lo que
// tiene que parar, y que un paso de física sea exactamente un paso de vida. La
// batalla —quién muere, qué arde— es D3 y D4, y no es determinista por decisión
// del dueño del diseño (§1b), así que no se mide con asertos de igualdad.

import { describe, expect, it } from 'vitest';
import { LIFE_STEP } from '../../src/render3d/life/clock';
import { aimAt } from '../../src/render3d/life/archery';
import { bastionParapetObstacles, createPhysics, loadPhysics } from '../../src/render3d/life/physics';
import { indexSolids, type Terrain } from '../../src/render3d/life/body';
import type { BastionAccess } from '../../src/derive/bastion-access';

/** Un valle de juguete con una muralla recta de dos celdas de alto. */
function land(): Terrain {
  const width = 40;
  const height = 40;
  const blocked = new Uint8Array(width * height);
  for (let x = 10; x < 30; x += 1) blocked[20 * width + x] = 1;
  return { width, height, blocked };
}

describe('D1 · la capa física', () => {
  it('se carga, y cargarla dos veces no trae dos mundos', async () => {
    const first = await loadPhysics();
    const second = await loadPhysics();
    expect(first, 'Rapier tiene que cargar en este entorno').not.toBeNull();
    // Memoizado a propósito: el WASM son 2,8 MB y pedirlo dos veces sería
    // pedirlo dos veces de verdad.
    expect(second).toBe(first);
  });

  it('un paso de física es un paso de vida, y no medio ni dos', async () => {
    // **El matrimonio, y es lo único delicado de esta ronda.** Si el mundo
    // corriera a su propio ritmo, dos móviles con distinta tasa de refresco
    // verían dos batallas distintas — que es exactamente lo que `life/clock.ts`
    // existe para impedir.
    const world = await createPhysics(land());
    expect(world).not.toBeNull();
    if (world === null) return;

    // Se deja caer algo desde una altura conocida y se mide el tiempo que tarda
    // en llegar al suelo contra lo que dice la física de libro: t = √(2h/g),
    // con la gravedad del valle (9,81 m/s² en celdas de tres metros).
    const arrow = world.launch({ x: 5, y: 10, z: 5 }, { x: 0, y: 0, z: 0 });
    let steps = 0;
    while (arrow.at.y > 0.2 && steps < 600) { world.step(); steps += 1; }
    const fell = steps * LIFE_STEP;
    const expected = Math.sqrt((2 * 10) / (9.81 / 3));
    expect(Math.abs(fell - expected), `cayó en ${fell.toFixed(2)} s, se esperaba ${expected.toFixed(2)}`)
      .toBeLessThan(0.3);
    world.dispose();
  });

  it('la muralla para una flecha rasa, y una alta pasa por encima', async () => {
    // Las celdas cerradas del terreno son las mismas que paran a la gente
    // (`terrainOf`), así que no hay una segunda idea de dónde está la muralla.
    const world = await createPhysics(land());
    expect(world).not.toBeNull();
    if (world === null) return;

    // Rasa: sale a media altura del muro y de frente.
    const low = world.launch({ x: 20, y: 1, z: 17 }, { x: 0, y: 0, z: 14 });
    for (let n = 0; n < 120; n += 1) world.step();
    expect(low.at.z, 'la flecha rasa no pasa la muralla').toBeLessThan(21);

    // Alta: el mismo tiro, en parábola por encima de las dos celdas de muro.
    const high = world.launch({ x: 24, y: 2.5, z: 17 }, { x: 0, y: 7, z: 14 });
    for (let n = 0; n < 120; n += 1) world.step();
    expect(high.at.z, 'la flecha alta sí pasa').toBeGreaterThan(21);
    world.dispose();
  });

  it('la plataforma del bastión deja salir su flecha sin rebajar su sólido ni otra muralla', async () => {
    const width = 12, height = 12;
    const blocked = new Uint8Array(width * height);
    // El bastión tiene ambos obstáculos: la máscara de navegación y su sólido.
    blocked[5 * width + 5] = 1;
    blocked[5 * width + 8] = 1;
    const bastion = { minX: 5, minZ: 5, maxX: 6, maxZ: 6 };
    const land: Terrain = { width, height, blocked, solids: indexSolids(width, height, [bastion]) };
    // El GLB se coloca a y=0: aun cuando el terreno baja, la plataforma acaba
    // en la cota absoluta 1,02, no en suelo + 1,02.
    const world = await createPhysics(land, { ground: () => -0.04, platformCells: [{ x: 5, z: 5 }] });
    expect(world).not.toBeNull();
    if (world === null) return;

    // La mano queda sobre el suelo de plataforma (1,02), por debajo de una
    // almena de 2. Si cualquiera de los dos colliders siguiera alto, nace clavada.
    const own = world.launch({ x: 5.5, y: 1.3, z: 5.5 }, { x: 0, y: 0, z: 8 });
    for (let n = 0; n < 20; n += 1) world.step();
    expect(own.at.z, 'la flecha del guardia sale de su bastión').toBeGreaterThan(7);

    const belowPlatform = world.launch({ x: 5.5, y: 0.7, z: 2 }, { x: 0, y: 0, z: 12 });
    for (let n = 0; n < 40; n += 1) world.step();
    expect(belowPlatform.at.z, 'la piedra bajo la plataforma sigue interceptando').toBeLessThan(6);

    // La otra celda bloqueada sigue teniendo la altura completa de muralla.
    const other = world.launch({ x: 8.5, y: 1.3, z: 2 }, { x: 0, y: 0, z: 12 });
    for (let n = 0; n < 40; n += 1) world.step();
    expect(other.at.z, 'ninguna muralla ajena se vuelve atravesable').toBeLessThan(6);
    world.dispose();
  });

  it.each([
    [{ x: 0, z: 1 }, { x: 5.5, z: 5.08 }, { x: 5.5, z: 5.92 }],
    [{ x: 1, z: 0 }, { x: 5.08, z: 5.5 }, { x: 5.92, z: 5.5 }],
    [{ x: 0, z: -1 }, { x: 5.5, z: 5.92 }, { x: 5.5, z: 5.08 }],
    [{ x: -1, z: 0 }, { x: 5.92, z: 5.5 }, { x: 5.08, z: 5.5 }],
  ] as const)('rota el parapeto exterior con el mismo eje cardinal para %o', (access, expected, interior) => {
    const obstacles = bastionParapetObstacles({ x: 5, z: 5 }, access as BastionAccess);
    expect(obstacles).toHaveLength(10);
    expect(obstacles[0]?.at.x).toBeCloseTo(expected.x);
    expect(obstacles[0]?.at.z).toBeCloseTo(expected.z);
    // La cara de acceso (+Z local) no tiene su tira central: no se inventa un muro interior.
    expect(obstacles.some(obstacle => Math.abs(obstacle.at.x - interior.x) < 0.01
      && Math.abs(obstacle.at.z - interior.z) < 0.01)).toBe(false);
  });

  it('los parapetos del GLB paran al atacante pero conservan el tiro lejano y la zona ciega cercana', async () => {
    const width = 16, height = 16;
    const land: Terrain = { width, height, blocked: new Uint8Array(width * height) };
    const origin = { x: 5, z: 5 }, access: BastionAccess = { x: 0, z: 1 };
    const world = await createPhysics(land, { obstacles: bastionParapetObstacles(origin, access) });
    expect(world).not.toBeNull();
    if (world === null) return;

    // El merlón exterior ocupa x=5,4..5,6 y z=5..5,15: un atacante bajo no lo cruza.
    const attacker = world.launch({ x: 5.5, y: 1.25, z: 4.5 }, { x: 0, y: 0, z: 12 });
    for (let n = 0; n < 30; n += 1) world.step();
    expect(attacker.at.z, 'el parapeto exterior intercepta una flecha ajena').toBeLessThan(5.3);

    // Posición medida del grip en bow_loose(0), rotada hacia la cara exterior.
    const from = { x: 5.520588, y: 1.448627, z: 5.336246 };
    const farVelocity = aimAt(from, { x: from.x, y: 0.4, z: from.z - 10 });
    expect(farVelocity).not.toBeNull();
    if (farVelocity === null) return;
    const far = world.launch(from, farVelocity);
    for (let n = 0; n < 20; n += 1) world.step();
    expect(far.at.z, 'el tiro lejano despeja el merlón con el origen medido').toBeLessThan(4.8);

    const nearVelocity = aimAt(from, { x: from.x, y: 0.4, z: from.z - 1 });
    expect(nearVelocity).not.toBeNull();
    if (nearVelocity === null) return;
    const near = world.launch(from, nearVelocity);
    for (let n = 0; n < 20; n += 1) world.step();
    expect(near.at.z, 'el tiro cercano conserva la zona ciega del parapeto').toBeGreaterThan(4.9);
    world.dispose();
  });

  it('lo que se lanza se puede quitar, y quitarlo dos veces no rompe nada', async () => {
    // Una batalla lanza cientos de flechas: las que se clavan tienen que salir
    // del mundo o el coste crece toda la tarde.
    const world = await createPhysics(land());
    expect(world).not.toBeNull();
    if (world === null) return;

    const arrow = world.launch({ x: 5, y: 5, z: 5 }, { x: 1, y: 0, z: 0 });
    expect(world.count).toBe(1);
    arrow.remove();
    expect(world.count).toBe(0);
    arrow.remove();
    expect(world.count).toBe(0);
    world.dispose();
  });
});
