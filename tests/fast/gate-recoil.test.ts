import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { Village } from '../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../src/render3d/world/plan';

const plan = (id: number, x: number, axis: 'x' | 'z' = 'z'): PlannedBuilding => ({
  id, kind: 'gate', x, z: 5, w: 1, h: 1, ruin: false, walls: 1, roof: 0,
  roofed: false, wallColour: '#765432', roofColour: '#765432', asset: null, gate: axis,
});
const transforms = (village: Village): number[] => {
  const values: number[] = [];
  village.group.updateMatrixWorld(true);
  village.group.traverse(object => values.push(...object.matrixWorld.elements));
  return values;
};

describe('E1 · el portón acusa el contacto real', () => {
  it.each(['x', 'z'] as const)('en eje %s es pose absoluta, no una sacudida acumulada', axis => {
    const direct = new Village(), watched = new Village();
    direct.add(plan(1, 4, axis)); watched.add(plan(1, 4, axis));
    try {
      const rest = transforms(direct);
      for (const time of [0, 0.1, 0.45, 9, 0.05, 0]) {
        direct.gateImpact({ x: 4.5, z: 5.5 }, time);
        watched.gateImpact({ x: 4.5, z: 5.5 }, time);
        expect(transforms(watched)).toEqual(transforms(direct));
        watched.gateImpact({ x: 4.5, z: 5.5 }, time);
        expect(transforms(watched)).toEqual(transforms(direct));
      }
      expect(transforms(direct)).not.toEqual(rest);
      direct.gateImpact({ x: 4.5, z: 5.5 }, 0.45);
      expect(transforms(direct)).toEqual(rest);
      direct.gateImpact({ x: 4.5, z: 5.5 }, 0);
      direct.gateImpact(null, null);
      expect(transforms(direct)).toEqual(rest);
    } finally { direct.dispose(); watched.dispose(); }
  });

  it('no sacude otra puerta, una ruina ni un portón lógico sin edificio', () => {
    const village = new Village();
    village.add(plan(1, 4)); village.add(plan(2, 8));
    village.add({ ...plan(3, 12), ruin: true });
    try {
      const other = village.group.children[1]!.clone();
      const otherAt = other.position.toArray();
      const rest = transforms(village);
      for (const x of [12.5, 99]) {
        village.gateImpact({ x, z: 5.5 }, 0);
        expect(transforms(village)).toEqual(rest);
      }
      village.gateImpact({ x: 4.5, z: 5.5 }, 0);
      expect(village.group.children[1]!.position.toArray()).toEqual(otherAt);
      expect(village.group.children[1]!.getObjectByName('GateRecoil')!.position.length()).toBe(0);
      village.remove(1); village.add(plan(1, 4));
      expect(village.group.getObjectByName('Building_1')!.getObjectByName('GateRecoil')!.position.length()).toBe(0);
    } finally { village.dispose(); }
  });

  it('si el recurso tiene hoja, mueve la hoja sin mover el marco ni perder el gozne', () => {
    const geometry = new BoxGeometry(1, 1, 0.1), material = new MeshStandardMaterial();
    const source = new Group(), frame = new Mesh(geometry, material), leaf = new Mesh(geometry, material);
    frame.name = 'frame'; leaf.name = 'gate_door'; source.add(frame, leaf);
    const village = new Village(() => source.clone(true));
    village.add({ ...plan(1, 4), asset: 'gate' });
    try {
      village.group.updateMatrixWorld(true);
      const base = village.group.getObjectByName('frame')!.matrixWorld.clone();
      const door = village.group.getObjectByName('gate_door')!;
      const closed = door.matrixWorld.clone();
      village.gateImpact({ x: 4.5, z: 5.5 }, 0);
      village.group.updateMatrixWorld(true);
      expect(door.matrixWorld.equals(closed)).toBe(false);
      expect(village.group.getObjectByName('frame')!.matrixWorld.equals(base)).toBe(true);
      village.gateImpact(null, null);
      village.doors(new Set([1]), 1);
      village.group.updateMatrixWorld(true);
      expect(door.matrixWorld.equals(closed)).toBe(false);
      expect(village.group.getObjectByName('frame')!.matrixWorld.equals(base)).toBe(true);
    } finally { village.dispose(); geometry.dispose(); material.dispose(); }
  });
});
