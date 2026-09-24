import { describe, expect, it, vi } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { houseForm, houseFormAsset, houseVariant, varyHouse } from '../../src/render3d/world/house-variation';
import { buildFromAsset } from '../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../src/render3d/world/plan';

function house(): Group {
  const root = new Group();
  const roofMaterial = new MeshStandardMaterial({ color: '#bba070' }); roofMaterial.name = 'house_roof';
  const roof = new Mesh(new BoxGeometry(2, 1, 2), roofMaterial); roof.position.set(1, 1.5, -1);
  const door = new Mesh(new BoxGeometry(0.3, 0.6, 0.1), new MeshStandardMaterial());
  door.name = 'house_door'; door.position.set(1, 0.3, 0);
  root.add(roof, door);
  return root;
}

describe('viviendas distintas sin alterar la parcela', () => {
  it('repite por semilla y parcela y reparte más de un acabado', () => {
    const values = Array.from({ length: 20 }, (_, x) => houseVariant(7, x, 18));
    expect(values).toEqual(Array.from({ length: 20 }, (_, x) => houseVariant(7, x, 18)));
    expect(new Set(values).size).toBe(4);
  });
  it('asigna tres siluetas por parcela y conserva el índice al pasar de madera a piedra', () => {
    const forms = Array.from({ length: 40 }, (_, x) => houseForm(7, x, 18));
    expect(new Set(forms)).toEqual(new Set([0, 1, 2]));
    for (let x = 0; x < forms.length; x++) {
      expect(houseForm(7, x, 18)).toBe(forms[x]);
      expect(houseFormAsset('house', 7, x, 18)).toBe(
        ['house', 'house-twin-gable', 'house-hip-roof'][forms[x]!],
      );
      expect(houseFormAsset('stone_house', 7, x, 18)).toBe(
        ['stone-house', 'stone-house-cross-gable', 'stone-house-tower-loft'][forms[x]!],
      );
    }
  });
  it('conserva huella, alero y puerta sin contaminar otra instancia', () => {
    const original = house(); const copy = original.clone(true);
    const sourceRoof = original.children[0] as Mesh;
    const sourceMaterial = sourceRoof.material as MeshStandardMaterial;
    const colour = sourceMaterial.color.clone();
    const before = new Box3().setFromObject(copy.children[0]!);
    const doorBefore = new Box3().setFromObject(copy.children[1]!);
    const disposeShared = vi.spyOn(sourceRoof.geometry, 'dispose');
    const dispose = varyHouse(copy, 0);
    const after = new Box3().setFromObject(copy.children[0]!);
    expect(after.min.toArray()).toEqual(before.min.toArray());
    expect(after.max.x).toBe(before.max.x); expect(after.max.z).toBe(before.max.z);
    expect(after.max.y).toBeLessThan(before.max.y);
    expect(new Box3().setFromObject(copy.children[1]!)).toEqual(doorBefore);
    expect(sourceMaterial.color).toEqual(colour);
    expect((copy.children[0] as Mesh).geometry).not.toBe(sourceRoof.geometry);
    dispose(); expect(disposeShared).not.toHaveBeenCalled();
  });
  it('la nieve vuelve al acabado y no al color de otra casa', () => {
    const planned: PlannedBuilding = { id: 1, kind: 'house', x: 10, z: 10, w: 2, h: 2,
      ruin: false, walls: 1, roof: 1, wallColour: '#fff', roofColour: '#fff', roofed: true,
      asset: 'house', variant: 0 };
    const model = buildFromAsset(planned, house());
    let roof: MeshStandardMaterial | undefined;
    model.object.traverse(child => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial
        && child.material.name.includes('roof')) roof = child.material;
    });
    const base = roof!.color.clone();
    model.weather(1, '#ffffff'); expect(roof!.color).not.toEqual(base);
    model.weather(0, '#ffffff'); expect(roof!.color).toEqual(base);
    model.dispose();
  });
});
