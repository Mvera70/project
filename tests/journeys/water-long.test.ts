// Lo lento de `tests/fast/water.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 11 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// El agua viva. 26 sep 2026.
//
// Vera: «que el agua sea física y se vea cómo se tira», «que se vea viva».
// Lo que estas pruebas guardan son propiedades de lo que se ve: el cubo tira el
// agua hacia el fuego y no a los pies, cae y salpica, y se acaba; la lluvia
// salpica la tierra y no el río; y la riada sube la semana que el motor la
// apunta y baja después.

import { describe, expect, it } from 'vitest';
import { type Mesh } from 'three';
import { foundGame } from '@engine/found';
import { buildWaterfalls, waterfallSites } from '../../src/render3d/world/waterfalls';
import { elevationAt } from '../../src/render3d/world/ground';
import { valleyAxis } from '../../src/render3d/world/valley-profile';
describe('las cascadas', () => {
  it('una baja por la pared de cada garganta hasta el río, cae de verdad y sólo baja', () => {
    // Vera, 26 sep 2026: «una cascada … como decorado en la garganta o junto al lago».
    for (const seed of [7, 11, 23]) {
      const { map, terrainSeed } = foundGame(seed);
      const height = (x: number, z: number): number => elevationAt(map, x, z);
      const sites = waterfallSites(map, terrainSeed, height);
      const gorges = sites.filter((site) => site.kind === 'gorge');
      expect(gorges.length, `semilla ${seed}: una por garganta`).toBe(2);
      for (const site of sites) {
        expect(height(site.top.x, site.top.z) - height(site.bottom.x, site.bottom.z)).toBeGreaterThan(1.5);
      }
      for (const site of gorges) {
        // El pie, en la orilla del río: a menos de dos celdas del eje.
        expect(Math.abs(site.bottom.x - valleyAxis(map, site.bottom.z))).toBeLessThan(2);
      }
      const falls = buildWaterfalls(map, terrainSeed, height);
      expect(falls.feet.length).toBe(sites.length);
      // Sólo las láminas de agua: la poza y la neblina del pie tienen su grupo.
      const sheets = falls.group.children.filter((child) => child.name === 'Valley_Waterfall');
      expect(sheets.length).toBe(sites.length);
      for (const mesh of sheets) {
        // Sección a sección (mismo `fallProgress`), la cota media nunca sube
        // al avanzar. Comparar vértices sueltos mezclaba carriles distintos de
        // la misma sección, que sobre roca inclinada van a cotas distintas.
        const position = (mesh as Mesh).geometry.getAttribute('position');
        const progress = (mesh as Mesh).geometry.getAttribute('fallProgress');
        const sections = new Map<number, { sum: number; n: number }>();
        for (let i = 0; i < position.count; i += 1) {
          const at = sections.get(progress.getX(i)) ?? { sum: 0, n: 0 };
          at.sum += position.getY(i); at.n += 1;
          sections.set(progress.getX(i), at);
        }
        const means = [...sections.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s.sum / s.n);
        for (let i = 1; i < means.length; i += 1) {
          expect(means[i]!, 'el agua nunca sube').toBeLessThanOrEqual(means[i - 1]! + 1e-6);
        }
      }
      falls.dispose();
    }
  });
});
