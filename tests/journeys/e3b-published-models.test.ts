import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Object3D } from 'three';
import { foundGame } from '../../src/engine/found';
import { run } from '../../src/engine/sim';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { planFor } from '../../src/render3d/world/plan';
import { Village } from '../../src/render3d/world/buildings';

const ROOT = resolve(import.meta.dirname, '..', '..');
const IDS = [
  'e3b-bastion-joint-candidate',
  'e3b-walkway-entry-candidate',
  'e3b-walkway-candidate',
] as const;

describe('villa real · modelos E3b publicados', () => {
  it('instancia la junta y ambos tramos en el bastión que construye el motor', async () => {
    const state = foundGame(23);
    run(state, 60 * 48 + 18, 'prudent', CATALOG);
    const planned = planFor(state).buildings.find(building =>
      building.kind === 'bastion' && building.bastionWalkway !== undefined);
    expect(planned).toBeDefined();
    expect(planned?.asset).toBe(IDS[0]);

    const loader = new GLTFLoader();
    const scenes = new Map<string, Awaited<ReturnType<typeof loader.parseAsync>>['scene']>();
    for (const id of IDS) {
      const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d', `${id}.glb`));
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      scenes.set(id, (await loader.parseAsync(buffer, '')).scene);
    }
    const requested: string[] = [];
    const instances = new Map<string, Object3D>();
    const village = new Village(id => {
      requested.push(id);
      const instance = scenes.get(id)?.clone(true);
      if (instance !== undefined) instances.set(id, instance);
      return instance;
    });
    try {
      village.add(planned!);
      expect(requested).toEqual([...IDS, 'bastion-access-candidate', 'bastion']);
      for (const id of IDS) {
        expect(instances.get(id), id).toBeDefined();
        expect(instances.get(id)?.parent, id).not.toBeNull();
      }
      let meshes = 0;
      village.group.traverse(object => { if ('isMesh' in object && object.isMesh) meshes += 1; });
      expect(meshes).toBeGreaterThan(2);
    } finally { village.dispose(); }
  });
});
