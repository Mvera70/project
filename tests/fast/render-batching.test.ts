// Menos llamadas de dibujo (27 sep 2026). Vera: «el rendimiento es nefasto».
//
// Lo que se guarda: fundir no cambia lo que se ve —mismos triángulos, mismo
// sitio—, junta sólo lo que comparte material, y deja fuera lo que se mueve
// (la puerta ya está en su bisagra) o lleva esqueleto. Y la muralla en lote:
// muchos tramos, pocas mallas, y se rehace al quitar uno.

import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { batchStatic, mergeStatic, meshCount } from '../../src/render3d/world/merge-static';

const stone = new MeshStandardMaterial({ name: 'stone' });
const wood = new MeshStandardMaterial({ name: 'wood' });

function house(): Group {
  const root = new Group();
  for (let n = 0; n < 4; n += 1) {
    const piece = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), n % 2 === 0 ? stone : wood);
    piece.position.set(n * 0.6, 0.25, 0);
    piece.castShadow = true;
    root.add(piece);
  }
  return root;
}

describe('fundir por material', () => {
  it('una casa de cuatro piezas y dos materiales queda en dos mallas, en el mismo sitio', () => {
    const root = house();
    root.position.set(10, 0, 5);
    const before = new Box3().setFromObject(root);
    const made = mergeStatic(root);
    expect(made.length).toBe(2);
    expect(meshCount(root)).toBe(2);
    const after = new Box3().setFromObject(root);
    expect(after.min.distanceTo(before.min)).toBeLessThan(1e-6);
    expect(after.max.distanceTo(before.max)).toBeLessThan(1e-6);
    const triangles = made.reduce((sum, g) => sum + (g.index?.count ?? 0) / 3, 0);
    expect(triangles).toBe(4 * 12);
    expect(root.children.every((child) => (child as Mesh).castShadow)).toBe(true);
  });

  it('lo que tiene un material propio se queda como está', () => {
    const root = house();
    const odd = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshStandardMaterial({ name: 'door' }));
    root.add(odd);
    mergeStatic(root);
    expect(odd.parent).toBe(root);
    expect(meshCount(root)).toBe(3);
  });

  it('la muralla en lote: veinte tramos, una malla por material, en el sitio de siempre', () => {
    const into = new Group();
    const walls = Array.from({ length: 20 }, (_, n) => { const w = house(); w.position.set(n * 3, 0, 0); into.add(w); return w; });
    const before = new Box3().setFromObject(into);
    const batch = batchStatic(walls, into);
    for (const wall of walls) wall.visible = false;
    expect(batch.group.children.length).toBe(2);
    const after = new Box3().setFromObject(batch.group);
    expect(after.min.distanceTo(before.min)).toBeLessThan(1e-6);
    expect(after.max.distanceTo(before.max)).toBeLessThan(1e-6);
    expect(new Box3().setFromObject(batch.group).getSize(new Vector3()).x).toBeGreaterThan(50);
  });
});
