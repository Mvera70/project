import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { Cast } from '../../src/render3d/world/cast';
import type { AccessoryId, Actor } from '../../src/render3d/contracts';

const sites: readonly [AccessoryId, string, string][] = [
  ['fiddle', 'hand_r', 'grip'], ['pilgrim-hat', 'head', 'mount'],
  ['pilgrim-staff', 'hand_r', 'grip'], ['grindstone-pack', 'spine', 'mount'],
  ['herb-basket', 'hand_r', 'grip'], ['bundle-pack', 'spine', 'mount'],
  ['forage-basket', 'hand_r', 'grip'], ['rope-pick', 'spine', 'mount'],
  ['trade-pack', 'spine', 'mount'], ['hide-bundle', 'spine', 'mount'],
];

async function scene(id: string) {
  const bytes = readFileSync(`public/assets/valley3d/${id}.glb`);
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

function actor(accessory: AccessoryId, clip: Actor['clip'], travelled: number): Actor {
  return {
    id: 1, x: 0, z: 0, facing: 0, activity: 'walking', clip,
    clipSeconds: 0, travelled, cell: 0, named: false, talking: false,
    arguing: false, occupation: null, age: 30, role: 'stranger', accessories: [accessory],
  };
}

describe('B5 visitor accessories on the live villager rig', () => {
  it.each(sites)('%s keeps its connector on %s during a walk', async (id, boneName, connectorName) => {
    const villager = await scene('villager');
    const piece = await scene(id);
    const cast = new Cast(
      { id: 'villager', original: villager.scene, clips: villager.animations, motion: [] },
      () => villager.scene.clone(true),
      requested => requested === id ? piece.scene.clone(true) : undefined,
    );
    try {
      for (const [clip, travelled] of [['idle', 0], ['walk', 0.18], ['walk', 0.37]] as const) {
        cast.show([actor(id, clip, travelled)]);
        cast.group.updateMatrixWorld(true);
        const body = cast.group.getObjectByName('Villager_1')!;
        const accessory = body.getObjectByName(`Held_accessory_${id}`)!;
        const connector = accessory.getObjectByName(connectorName)!;
        const bone = body.getObjectByName(boneName)!;
        expect(accessory.visible).toBe(true);
        expect(connector.getWorldPosition(new Vector3()).distanceTo(bone.getWorldPosition(new Vector3()))).toBeLessThan(0.002);
      }
    } finally { cast.dispose(); }
  });
});
