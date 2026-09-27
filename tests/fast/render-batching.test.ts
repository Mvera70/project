// Menos llamadas de dibujo (27 sep 2026). Vera: «el rendimiento es nefasto».
//
// Lo que se guarda: fundir no cambia lo que se ve —mismos triángulos, mismo
// sitio—, junta sólo lo que comparte material, y deja fuera lo que se mueve
// (la puerta ya está en su bisagra) o lleva esqueleto. Y la muralla en lote:
// muchos tramos, pocas mallas, y se rehace al quitar uno. Y los cuerpos con
// esqueleto (aldeanos, gallinas, vacas): una malla por cuerpo, cada pieza con
// su color en los vértices.

import { describe, expect, it } from 'vitest';
import {
  Bone, Box3, BoxGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Skeleton, SkinnedMesh,
  Uint16BufferAttribute, Vector3,
} from 'three';
import { fuseSkinnedParts } from '../../src/render3d/assets';
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

describe('fundir los cuerpos con esqueleto', () => {
  function body(): { root: Group; skeleton: Skeleton } {
    const root = new Group();
    const bone = new Bone();
    root.add(bone);
    const skeleton = new Skeleton([bone]);
    const colours = [0xa04020, 0x305090, 0xe0c0a0];
    for (const [n, colour] of colours.entries()) {
      const geometry = new BoxGeometry(0.3, 0.3, 0.3).translate(n * 0.4, 0, 0);
      const count = geometry.getAttribute('position').count;
      geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(count * 4), 4));
      geometry.setAttribute('skinWeight', new Float32BufferAttribute(new Float32Array(count * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
      const part = new SkinnedMesh(geometry, new MeshStandardMaterial({ color: colour }));
      root.add(part);
      part.bind(skeleton);
    }
    return { root, skeleton };
  }

  it('tres piezas de colores quedan en una malla, con el color de cada una en sus vértices', () => {
    const { root, skeleton } = body();
    fuseSkinnedParts(root);
    const meshes: SkinnedMesh[] = [];
    root.traverse((node) => { if (node instanceof SkinnedMesh) meshes.push(node); });
    expect(meshes.length).toBe(1);
    const fused = meshes[0]!;
    expect(fused.skeleton).toBe(skeleton);
    expect((fused.material as MeshStandardMaterial).vertexColors).toBe(true);
    const colour = fused.geometry.getAttribute('color');
    const seen = new Set<string>();
    for (let i = 0; i < colour.count; i += 1) seen.add([colour.getX(i), colour.getY(i), colour.getZ(i)].map((v) => v.toFixed(3)).join());
    expect(seen.size).toBe(3);
    expect(colour.count).toBe(3 * 24);
  });

  it('piezas con esqueletos distintos no se juntan', () => {
    const a = body();
    const b = body();
    const root = new Group();
    root.add(a.root, b.root);
    fuseSkinnedParts(root);
    let count = 0;
    root.traverse((node) => { if (node instanceof SkinnedMesh) count += 1; });
    expect(count).toBe(2);
  });
});
