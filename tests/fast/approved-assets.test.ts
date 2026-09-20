// G-24 · La admisión de los siete recursos aprobados conserva sus bytes y su uso.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
import { parseCatalog } from '../../tools/art/schema';
import { BUILDING_ASSETS } from '../../src/render3d/world/buildings';
import { WANTED } from '../../src/render3d/renderer';
import { Cast } from '../../src/render3d/world/cast';
import { Village } from '../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../src/render3d/world/plan';
import type { Actor } from '../../src/render3d/contracts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const IDS = ['bow', 'spear', 'arrow', 'shield', 'gate', 'plough', 'fountain'] as const;
const hash = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const bytes = (id: string): Buffer => readFileSync(resolve(ROOT, 'public/assets/valley3d', `${id}.glb`));
const arrayBuffer = (value: Buffer): ArrayBuffer => value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
const actor = (over: Partial<Actor> = {}): Actor => ({
  id: 1, x: 0, z: 0, facing: 0, activity: 'resting', clip: 'idle', clipSeconds: 0,
  travelled: 0, cell: 0, named: false, talking: false, arguing: false,
  occupation: null, age: 30, role: null, ...over,
});

describe('G-24 · recursos aprobados integrados', () => {
  it('publica exactamente los siete GLB aprobados sin perder las entradas ya distribuidas', () => {
    const catalog = parseCatalog(JSON.parse(readFileSync(resolve(ROOT, 'art/catalog.json'), 'utf8')) as unknown);
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public/assets/valley3d/manifest.json'), 'utf8')) as {
      assets: Array<{ id: string; sha256: string; provenance?: { license: string } }>;
    };
    expect(manifest.assets.some(asset => asset.id === 'house')).toBe(true);
    for (const id of IDS) {
      const source = catalog.assets.find(asset => asset.id === id);
      const published = manifest.assets.find(asset => asset.id === id);
      expect(source?.approved, id).not.toBeNull();
      expect(source?.hashes?.[`${id}.glb`], id).toBeDefined();
      expect(hash(bytes(id)), id).toBe(source?.hashes?.[`${id}.glb`]);
      expect(published?.sha256, id).toBe(source?.hashes?.[`${id}.glb`]);
      expect(published?.provenance?.license, id).toBe('Project original');
      expect(WANTED, id).toContain(id);
    }
    expect(BUILDING_ASSETS.gate).toBe('gate');
  });

  it('alinea el conector grip de lanza y escudo con las manos del rig real', async () => {
    const loader = new GLTFLoader();
    const villagerBytes = bytes('villager');
    const villager = await loader.parseAsync(arrayBuffer(villagerBytes), '');
    const library = new Map<string, ReturnType<typeof loader.parseAsync> extends Promise<infer T> ? T : never>();
    for (const id of ['bow', 'spear', 'shield', 'hoe'] as const) {
      const modelBytes = bytes(id);
      library.set(id, await loader.parseAsync(arrayBuffer(modelBytes), ''));
    }
    const cast = new Cast(
      { id: 'villager', original: villager.scene, clips: villager.animations, motion: [] },
      () => villager.scene.clone(true),
      id => library.get(id)?.scene.clone(true),
    );
    cast.show([actor({ weapon: 'bow' })]);
    try {
      cast.group.updateMatrixWorld(true);
      const body = cast.group.getObjectByName('Villager_1')!;
      for (const [held, hand] of [['Held_weapon_bow', 'hand_l']] as const) {
        const tool = body.getObjectByName(held)!;
        const grip = tool.getObjectByName('grip')!;
        const connector = body.getObjectByName(hand)!;
        expect(grip.getWorldPosition(new Vector3()).distanceTo(connector.getWorldPosition(new Vector3())), held).toBeLessThan(1e-6);
      }
      cast.show([actor({ weapon: 'spear', shield: true })]);
      cast.group.updateMatrixWorld(true);
      for (const [held, hand] of [['Held_weapon_spear', 'hand_r'], ['Held_shield', 'hand_l']] as const) {
        const tool = body.getObjectByName(held)!;
        const grip = tool.getObjectByName('grip')!;
        const connector = body.getObjectByName(hand)!;
        expect(grip.getWorldPosition(new Vector3()).distanceTo(connector.getWorldPosition(new Vector3())), held).toBeLessThan(1e-6);
      }
      // La mano hereda la escala del personaje. El arma debe conservarla, no
      // recibirla una segunda vez al compensar el grip (lo que la haría enana).
      const sourceLength = new Box3().setFromObject(library.get('spear')!.scene).getSize(new Vector3()).length();
      const heldLength = new Box3().setFromObject(body.getObjectByName('Held_weapon_spear')!).getSize(new Vector3()).length();
      expect(heldLength / sourceLength).toBeCloseTo(body.getWorldScale(new Vector3()).y, 6);
      // La azada anterior no declara `grip`: sigue heredando la escala del
      // hueso, sin recibir la compensación reservada a las armas G-24.
      cast.show([actor({ clip: 'work_hoe' })]);
      cast.group.updateMatrixWorld(true);
      const hoeLength = new Box3().setFromObject(body.getObjectByName('Held_work_hoe')!).getSize(new Vector3()).length();
      const legacyScale = body.getObjectByName('hand_r')!.getWorldScale(new Vector3()).y;
      const sourceHoeLength = new Box3().setFromObject(library.get('hoe')!.scene).getSize(new Vector3()).length();
      expect(hoeLength / sourceHoeLength).toBeCloseTo(legacyScale, 6);
    } finally { cast.dispose(); }
  });

  it.each(['x', 'z'] as const)('en eje %s usa el empty gate_door como pivote real, no la caja de sus tablas', async axis => {
    const loader = new GLTFLoader();
    const gateBytes = bytes('gate');
    const gate = await loader.parseAsync(arrayBuffer(gateBytes), '');
    const plan: PlannedBuilding = {
      id: 1, kind: 'gate', x: 4, z: 5, w: 1, h: 1, ruin: false,
      walls: 1, roof: 0, roofed: false, wallColour: '#765432', roofColour: '#765432', asset: 'gate', gate: axis,
    };
    const village = new Village(() => gate.scene.clone(true));
    village.add(plan);
    try {
      village.group.updateMatrixWorld(true);
      const door = village.group.getObjectByName('gate_door')!;
      const hinge = village.group.getObjectByName('DoorHinge')!;
      expect(hinge.getWorldPosition(new Vector3()).distanceTo(door.getWorldPosition(new Vector3()))).toBeLessThan(1e-6);
      const plank = door.children[0]!;
      const closed = plank.getWorldPosition(new Vector3());
      village.doors(new Set([1]), 1);
      village.group.updateMatrixWorld(true);
      expect(plank.getWorldPosition(new Vector3()).distanceTo(closed)).toBeGreaterThan(0.1);
    } finally { village.dispose(); }
  });
});
