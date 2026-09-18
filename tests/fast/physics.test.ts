// D1 · El mundo físico, y su matrimonio con el paso de la vida. §1b, fase 4.
//
// Lo que se guarda aquí es **el contrato de la capa**, no la batalla: que se
// pueda cargar, que caiga lo que tiene que caer, que la muralla pare lo que
// tiene que parar, y que un paso de física sea exactamente un paso de vida. La
// batalla —quién muere, qué arde— es D3 y D4, y no es determinista por decisión
// del dueño del diseño (§1b), así que no se mide con asertos de igualdad.

import { describe, expect, it } from 'vitest';
import { LIFE_STEP } from '../../src/render3d/life/clock';
import { createPhysics, loadPhysics } from '../../src/render3d/life/physics';
import type { Terrain } from '../../src/render3d/life/body';

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
