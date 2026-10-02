import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

async function model(path: string) {
  const bytes = readFileSync(path);
  return (await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
  )).scene;
}

describe('Astra leather jerkin', () => {
  it('fits the published villager on the spine bone at runtime scale', async () => {
    const villager = await model('public/assets/valley3d/villager.glb');
    const jerkin = await model('public/assets/valley3d/jerkin.glb');
    const spine = villager.getObjectByName('spine');
    expect(spine).toBeDefined();
    spine!.add(jerkin);
    villager.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(jerkin);
    const size = bounds.getSize(new Vector3());
    expect(size.x).toBeGreaterThan(0.27);
    expect(size.x).toBeLessThan(0.34);
    expect(size.y).toBeGreaterThan(0.17);
    expect(size.y).toBeLessThan(0.22);
    expect(bounds.min.y).toBeGreaterThan(0.27);
    expect(bounds.max.y).toBeLessThan(0.52);
    let meshes = 0;
    jerkin.traverse((node) => { if (node instanceof Mesh) meshes += 1; });
    expect(meshes).toBe(1);
  });
});
