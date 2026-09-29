// GV-1 · El pie de los edificios (29 sep 2026): propiedades de la máscara que
// lee el suelo. Lo que se ve lo guardan las tomas del encargo; aquí, lo que
// una captura no puede proteger: qué edificios la hacen, dónde empieza, hasta
// dónde llega y que la misma aldea da siempre los mismos bytes.

import { describe, expect, it } from 'vitest';
import { contactBases, contactMask, type ContactBase } from '../../src/render3d/world/contact-shade';
import { planFor, type PlannedBuilding } from '../../src/render3d/world/plan';
import { CONTACT_SHADE } from '../../src/render3d/visual-config';
import type { BuildingKind } from '../../src/engine/state';
import { foundTwenty } from '../helpers/founding';

const T = CONTACT_SHADE.texels;

function planned(kind: BuildingKind, x: number, z: number, w = 2, h = 2, extra: Partial<PlannedBuilding> = {}): PlannedBuilding {
  const roofed = !['field', 'grave_yard', 'palisade', 'wall', 'gate'].includes(kind);
  return {
    id: x * 1000 + z, kind, x, z, w, h, ruin: false, walls: 0.6, roof: 0.4,
    wallColour: '#000000', roofColour: '#000000', roofed, asset: null, ...extra,
  };
}

/** El valor de la máscara en un punto del mapa, de 0 a 1. */
function at(mask: Uint8Array, cellsWide: number, x: number, z: number): number {
  return mask[Math.floor(z * T) * cellsWide * T + Math.floor(x * T)]! / 255;
}

describe('el pie de los edificios', () => {
  it('sólo lo hacen los edificios con tejado y en pie', () => {
    const bases = contactBases([
      planned('house', 2, 2), planned('field', 6, 2, 3, 2), planned('grave_yard', 10, 2),
      planned('wall', 14, 2, 1, 1), planned('palisade', 16, 2, 1, 1), planned('gate', 18, 2, 1, 1),
      planned('house', 20, 2, 2, 2, { ruin: true }), planned('granary', 24, 2),
    ]);
    expect(bases).toHaveLength(2);
  });

  it('la base sale de la malla medida: la atalaya es su celda central, una casa llena su huella', () => {
    const [house, tower] = contactBases([planned('house', 4, 4), planned('watchtower', 10, 4)]);
    expect(house).toMatchObject({ minX: 4, maxX: 6, minZ: 4, maxZ: 6 });
    expect(tower!.minX).toBeCloseTo(10.51);
    expect(tower!.maxX).toBeCloseTo(11.49);
    const mask = contactMask(20, 12, [tower!]);
    // El centro de la torre, entero; la esquina de su parcela, no.
    expect(at(mask, 20, 11, 5)).toBe(1);
    expect(at(mask, 20, 10.05, 4.05)).toBeLessThan(0.3);
  });

  it('entera dentro de la base, cae hacia fuera y es cero pasado el alcance', () => {
    const base: ContactBase = { minX: 5, maxX: 7, minZ: 5, maxZ: 7, round: 0.06 };
    const mask = contactMask(16, 16, [base]);
    expect(at(mask, 16, 6, 6)).toBe(1);
    const ray = [7.02, 7.1, 7.2, 7.3, 7.4].map((x) => at(mask, 16, x, 6));
    for (let i = 1; i < ray.length; i += 1) expect(ray[i]!).toBeLessThanOrEqual(ray[i - 1]!);
    expect(ray[0]!).toBeGreaterThan(0.7);
    expect(at(mask, 16, 7 + CONTACT_SHADE.reach + 0.1, 6)).toBe(0);
    expect(at(mask, 16, 1, 1)).toBe(0);
  });

  it('el callejón entre dos casas queda más oscuro que la fachada suelta', () => {
    const left: ContactBase = { minX: 2, maxX: 4, minZ: 2, maxZ: 4, round: 0.06 };
    const right: ContactBase = { minX: 4.5, maxX: 6.5, minZ: 2, maxZ: 4, round: 0.06 };
    const alone = contactMask(10, 8, [left]);
    const pair = contactMask(10, 8, [left, right]);
    expect(at(pair, 10, 4.25, 3)).toBeGreaterThan(at(alone, 10, 4.25, 3));
  });

  it('una aldea de verdad: una base por edificio con tejado, dentro de su huella, y los mismos bytes siempre', () => {
    const state = foundTwenty(7);
    const buildings = planFor(state).buildings;
    const bases = contactBases(buildings);
    const roofed = buildings.filter((building) => building.roofed && !building.ruin);
    expect(bases).toHaveLength(roofed.length);
    bases.forEach((base, i) => {
      const building = roofed[i]!;
      expect(base.minX).toBeGreaterThanOrEqual(building.x);
      expect(base.maxX).toBeLessThanOrEqual(building.x + building.w);
      expect(base.minZ).toBeGreaterThanOrEqual(building.z);
      expect(base.maxZ).toBeLessThanOrEqual(building.z + building.h);
    });
    const { width, height } = state.map;
    const first = contactMask(width, height, bases);
    expect(contactMask(width, height, contactBases(planFor(state).buildings))).toEqual(first);
    // Y es el pie de la aldea, no el valle: casi todo el mapa queda intacto.
    const touched = first.reduce((count, value) => count + (value > 0 ? 1 : 0), 0);
    expect(touched / first.length).toBeLessThan(0.05);
  });
});
