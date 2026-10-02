// Lo lento de `tests/fast/work-gestures.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 33 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// IA-anim · Talar y picar: gestos con carga, golpe y herramienta que se ve.
//
// Hasta esta ronda `chop` era el martillo con el otro brazo encima —un vaivén
// delante del pecho— y la cantera usaba el martillo pequeño de la fragua. Lo
// que se guarda aquí es la forma del gesto sobre el GLB publicado, no sus
// ángulos: si la carga no sube por encima de la cabeza o el golpe no baja,
// el aldeano vuelve a parecer que se frota las manos.

import { describe, expect, it } from 'vitest';

describe('IA-anim · el árbol acusa el hachazo y el leñador pega al tronco', () => {
  it('las plazas del tajo rodean el tronco de verdad, a un hachazo', async () => {
    const { foundGame } = await import('../../src/engine/found');
    const { run } = await import('../../src/engine/sim');
    const { CATALOG } = await import('../../src/engine/crossroads/catalog');
    const { placesOf } = await import('../../src/render3d/life/offers');
    const { terrainOf } = await import('../../src/render3d/life/terrain');
    const { scatterTransform } = await import('../../src/render3d/world/forest');
    // Medido el 24 sep 2026: la 11 deja las cuatro primeras a 0,50; la 23, a 0,70 y 0,80.
    let near = 0, total = 0;
    for (const [seed, years] of [[11, 21], [23, 30]] as const) {
      const state = foundGame(seed); run(state, years * 48, 'prudent', CATALOG);
      const felling = placesOf(state, terrainOf(state)).find(place => place.id.startsWith('felling:'));
      if (felling === undefined) continue;
      const trunk = scatterTransform(state.map.width, Number(felling.id.split(':')[1]));
      const first = felling.offers[0]!.spots![0]!;
      total += 1;
      if (Math.hypot(first.x - trunk.x, first.z - trunk.z) <= 0.81) near += 1;
    }
    expect(total).toBeGreaterThan(0);
    expect(near).toBe(total);
  });
});
