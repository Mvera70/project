// El agua viva. 26 sep 2026.
//
// Vera: «que el agua sea física y se vea cómo se tira», «que se vea viva».
// Lo que estas pruebas guardan son propiedades de lo que se ve: el cubo tira el
// agua hacia el fuego y no a los pies, cae y salpica, y se acaba; la lluvia
// salpica la tierra y no el río; y la riada sube la semana que el motor la
// apunta y baja después.

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { foundGame } from '@engine/found';
import { WaterThrows } from '../../src/render3d/effects/water-throws';
import { floodOf } from '../../src/derive/flood';

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
