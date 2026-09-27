// El agua viva. 26 sep 2026.
//
// Vera: «que el agua sea física y se vea cómo se tira», «que se vea viva».
// Lo que estas pruebas guardan son propiedades de lo que se ve: el cubo tira el
// agua hacia el fuego y no a los pies, cae y salpica, y se acaba; la lluvia
// salpica la tierra y no el río; y la riada sube la semana que el motor la
// apunta y baja después.

import { describe, expect, it } from 'vitest';
import { type Mesh, Vector3 } from 'three';
import { foundGame } from '@engine/found';
import { WaterThrows } from '../../src/render3d/effects/water-throws';
import { floodOf } from '../../src/derive/flood';
import { buildWaterfalls, waterfallSites } from '../../src/render3d/world/waterfalls';
import { elevationAt } from '../../src/render3d/world/ground';
import { valleyAxis } from '../../src/render3d/world/valley-profile';

const flat = (): number => 0;

describe('el agua que se tira', () => {
  it('el cubo lanza un chorro hacia delante que cae, salpica y se acaba', () => {
    for (const forward of [new Vector3(1, 0, 0), new Vector3(0, 0, -1), new Vector3(0.6, 0, 0.8)]) {
      const water = new WaterThrows();
      water.throw(new Vector3(0, 1, 0), forward, 7);
      let rings = 0;
      for (let frame = 0; frame < 200; frame += 1) {
        water.step(1 / 60, flat);
        rings = Math.max(rings, water.open);
      }
      expect(rings, 'salpica: se abren anillos donde cae').toBeGreaterThan(5);
      water.step(3, flat);
      water.step(1, flat);
      expect(water.airborne, 'y todo acaba en el suelo').toBe(0);
      water.dispose();
    }
  });

  it('el agua cae delante de quien la tira, no a sus pies ni detrás', () => {
    const water = new WaterThrows();
    const forward = new Vector3(0, 0, 1);
    water.throw(new Vector3(0, 1, 0), forward, 11);
    const landings: number[] = [];
    const seen = new Set<object>();
    for (let frame = 0; frame < 120; frame += 1) {
      water.step(1 / 60, flat);
      for (const ring of water['ringsLive']) {
        if (ring === null || seen.has(ring)) continue;
        seen.add(ring);
        landings.push(ring.z);
      }
    }
    expect(landings.length).toBeGreaterThan(10);
    const mean = landings.reduce((a, b) => a + b, 0) / landings.length;
    expect(mean, 'cae a más de media celda por delante').toBeGreaterThan(0.5);
    expect(Math.min(...landings), 'y nada cae detrás').toBeGreaterThan(0);
    water.dispose();
  });

  it('contra una pared, el agua choca y escurre al pie: no pasa al otro lado', () => {
    // Vera, 26 sep 2026: «que las gotas choquen con la pared y escurran».
    const water = new WaterThrows();
    // Una pared de una celda de alto que empieza a media celda del cubo.
    const wall = (_x: number, y: number, z: number): boolean => z > 0.5 && z < 1.5 && y < 1;
    water.throw(new Vector3(0, 0.6, 0), new Vector3(0, 0, 1), 3);
    const landings: number[] = [];
    const seen = new Set<object>();
    let slid = 0;
    for (let frame = 0; frame < 240; frame += 1) {
      water.step(1 / 60, flat, wall);
      slid = Math.max(slid, water['live'].filter((d) => d !== null && d.sliding).length);
      for (const ring of water['ringsLive']) {
        if (ring === null || seen.has(ring)) continue;
        seen.add(ring);
        landings.push(ring.z);
      }
    }
    expect(slid, 'hay agua escurriendo por la pared').toBeGreaterThan(5);
    expect(Math.max(...landings), 'y nada cae detrás de ella').toBeLessThanOrEqual(0.5);
    water.dispose();
  });

  it('quien cruza el vado salpica a cada paso, y quien está quieto no', () => {
    // Vera, 26 sep 2026: «que quien cruza el vado salpique».
    const water = new WaterThrows();
    for (let frame = 0; frame <= 60; frame += 1) {
      water.wade(1, 0, 0, frame * 0.03); // 1,8 celdas andadas
      water.wade(2, 5, 0, 5); // quieto en el agua
      water.endWading();
    }
    const rings = water['ringsLive'].filter((r) => r !== null);
    expect(rings.length, 'unas seis pisadas').toBeGreaterThanOrEqual(5);
    expect(rings.every((r) => r!.x < 1), 'y ninguna del que está quieto').toBe(true);
    water.dispose();
  });

  it('la lluvia salpica la tierra, nunca donde hay agua, y sin lluvia nada', () => {
    const water = new WaterThrows();
    const dry = (x: number): boolean => x < 0;
    water.rain(0, { x: 0, z: 0 }, 1, flat, dry);
    expect(water.open).toBe(0);
    water.rain(1, { x: 0, z: 0 }, 0.5, flat, dry);
    expect(water.open).toBeGreaterThan(3);
    for (const ring of water['ringsLive']) if (ring !== null) expect(ring.x).toBeLessThan(0);
    water.dispose();
  });
});

describe('la riada', () => {
  it('sube la semana que el motor la apunta, baja la siguiente y se va', () => {
    const state = foundGame(7);
    expect(floodOf(state)).toBe(0);
    state.happenings.push({ tick: state.tick, id: 'river_flood', visible: [], who: [] });
    expect(floodOf(state)).toBe(1);
    state.tick += 1;
    expect(floodOf(state)).toBe(0.5);
    state.tick += 1;
    expect(floodOf(state)).toBe(0);
  });
});

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
