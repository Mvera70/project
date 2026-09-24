import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foundGame } from '../../src/engine/found';
import { run } from '../../src/engine/sim';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { planFor } from '../../src/render3d/world/plan';
import { Village } from '../../src/render3d/world/buildings';

const ROOT = resolve(import.meta.dirname, '..', '..');

// E3b.3 · La junta GLB de E3b.1 quedó superada por el adarve generado; esta
// jornada vigila el camino que el juego pinta, con los recursos publicados.
describe('villa real · adarve generado con los recursos publicados', () => {
  it('monta el adarve y la torre sin almenas propias en el bastión que construye el motor', async () => {
    const state = foundGame(23);
    run(state, 60 * 48 + 18, 'prudent', CATALOG);
    const plan = planFor(state);
    const planned = plan.buildings.find(building => building.kind === 'bastion' && building.rampartShift !== undefined);
    expect(planned).toBeDefined();
    expect(planned?.bastionWalkway).toBeUndefined();
    expect(plan.rampart).not.toBeNull();

    const loader = new GLTFLoader();
    const load = async (id: string) => {
      const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d', `${id}.glb`));
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      return (await loader.parseAsync(buffer, '')).scene;
    };
    const scenes = new Map([[planned!.asset!, await load(planned!.asset!)], ['wall', await load('wall')]]);
    const village = new Village(id => scenes.get(id)?.clone(true));
    try {
      village.add(planned!);
      village.rampart(plan.rampart);
      const tower = village.group.getObjectByName(`Building_${planned!.id}`)!;
      tower.updateMatrixWorld(true);
      expect(new Box3().setFromObject(tower).max.y).toBeLessThan(1.021);
      const deck = village.group.getObjectByName('Rampart_Deck');
      const fabric = village.group.getObjectByName('Rampart_Fabric');
      expect(deck).toBeDefined();
      expect(fabric).toBeDefined();
    } finally { village.dispose(); }
  });
});
