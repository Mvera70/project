import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Actor, RagdollSeed } from '../../src/render3d/contracts';
import { Cast } from '../../src/render3d/world/cast';
import type { Terrain } from '../../src/render3d/life/body';
import { createPhysics } from '../../src/render3d/life/physics';

let model: Object3D, clips: AnimationClip[];
beforeAll(async () => {
  const bytes = readFileSync('public/assets/valley3d/villager.glb');
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
  );
  model = gltf.scene; clips = gltf.animations;
});

const land = (width = 9, height = 5): Terrain => ({
  width, height, blocked: new Uint8Array(width * height),
});
const actor = (id = 4, clip: Actor['clip'] = 'fall'): Actor => ({
  id, x: 3, z: 2, facing: 0.4, activity: 'resting', clip, clipSeconds: 0,
  travelled: 0, cell: 0, named: true, age: 30, talking: false, arguing: false,
  occupation: null, role: null, poseSeconds: 0,
});
const makeCast = (): Cast => new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
const finitePose = (seed: RagdollSeed): boolean => seed.parts.every((part) => [
  part.body.at.x, part.body.at.y, part.body.at.z, part.body.rotation.x, part.body.rotation.y,
  part.body.rotation.z, part.body.rotation.w, part.body.halfLength, part.body.radius,
].every(Number.isFinite));

describe('D6 · acabado físico', () => {
  it.each([
    ['x', (x: number, z: number) => 0.12 * x + 0 * z],
    ['z', (x: number, z: number) => 0 * x + 0.17 * z],
  ] as const)('apoya en la pendiente %s correcta de un mapa rectangular', async (_axis, ground) => {
    const physics = await createPhysics(land(), { ground });
    expect(physics).not.toBeNull();
    if (physics === null) return;
    const half = 0.09;
    const body = physics.debris({ id: 'slope', at: { x: 2.3, y: 3, z: 1.4 },
      halfExtents: { x: half, y: half, z: half }, ttlSteps: 2_000 });
    for (let step = 0; step < 360; step += 1) physics.step();
    expect(Number.isFinite(body.at.y)).toBe(true);
    expect(body.at.y - ground(body.at.x, body.at.z)).toBeCloseTo(half, 1);
    physics.dispose();
  });

  it('nace de fall(0), conserva articulaciones y termina apoyado', async () => {
    const ground = (x: number, z: number): number => 0.04 * x + 0.02 * z;
    const cast = makeCast(); cast.standOn(ground); cast.show([actor()]);
    const seed = cast.captureRagdoll(4, 20, { x: 3, z: 2, facing: 0.4 });
    expect(seed).not.toBeNull();
    if (seed === null) return;
    expect(seed.parts).toHaveLength(11);
    expect(finitePose(seed)).toBe(true);
    const physics = await createPhysics(land(), { ground });
    expect(physics).not.toBeNull();
    if (physics === null) return;
    const ragdoll = physics.articulate(seed);
    expect(ragdoll).not.toBeNull();
    if (ragdoll === null) return;
    const first = ragdoll.snapshot();
    for (const part of seed.parts) {
      const bone = first.bones.find((candidate) => candidate.name === part.bone);
      expect(bone).toBeDefined();
      expect(Math.hypot((bone?.at.x ?? 99) - part.boneAt.x,
        (bone?.at.y ?? 99) - part.boneAt.y, (bone?.at.z ?? 99) - part.boneAt.z)).toBeLessThan(1e-5);
    }
    for (let step = 0; step < 300; step += 1) physics.step();
    const settled = ragdoll.snapshot();
    expect(settled.sleeping).toBe(true);
    expect(settled.bones.flatMap((bone) => [bone.at.x, bone.at.y, bone.at.z,
      bone.rotation.x, bone.rotation.y, bone.rotation.z, bone.rotation.w]).every(Number.isFinite)).toBe(true);
    const starts = new Map(first.bones.map((bone) => [bone.name, bone.at]));
    const ends = new Map(settled.bones.map((bone) => [bone.name, bone.at]));
    for (const part of seed.parts) {
      if (part.parent === null) continue;
      const a0 = starts.get(part.parent), b0 = starts.get(part.bone);
      const a1 = ends.get(part.parent), b1 = ends.get(part.bone);
      expect(a0 && b0 && a1 && b1).toBeTruthy();
      if (a0 === undefined || b0 === undefined || a1 === undefined || b1 === undefined) continue;
      expect(Math.abs(Math.hypot(a1.x - b1.x, a1.y - b1.y, a1.z - b1.z)
        - Math.hypot(a0.x - b0.x, a0.y - b0.y, a0.z - b0.z))).toBeLessThan(0.04);
    }
    expect(Math.min(...settled.bones.map((bone) => bone.at.y - ground(bone.at.x, bone.at.z)))).toBeGreaterThan(-0.08);
    physics.dispose(); cast.dispose();
  });

  it('el mismo clon vuelve de pose física a idle sin heredar traslaciones', async () => {
    const used = makeCast(), fresh = makeCast();
    try {
      used.show([actor()]);
      const seed = used.captureRagdoll(4, 0);
      expect(seed).not.toBeNull();
      if (seed === null) return;
      const physics = await createPhysics(land());
      expect(physics).not.toBeNull();
      if (physics === null) return;
      const ragdoll = physics.articulate(seed);
      expect(ragdoll).not.toBeNull();
      if (ragdoll === null) return;
      for (let step = 0; step < 60; step += 1) physics.step();
      used.show([actor()], [ragdoll.snapshot()]);
      used.show([actor(4, 'idle')]);
      fresh.show([actor(4, 'idle')]);
      const bones = (cast: Cast): number[] => {
        const values: number[] = [];
        cast.group.traverse((node) => { if (node.type === 'Bone') values.push(...node.position.toArray(), ...node.quaternion.toArray()); });
        return values;
      };
      expect(bones(used)).toEqual(bones(fresh));
      physics.dispose();
    } finally { used.dispose(); fresh.dispose(); }
  });

  it('un caído se apoya sobre un obstáculo y no lo atraviesa', async () => {
    const cast = makeCast(); cast.show([actor()]);
    const seed = cast.captureRagdoll(4, 0);
    expect(seed).not.toBeNull();
    if (seed === null) return;
    const lift = 2;
    const raised: RagdollSeed = { ...seed, parts: seed.parts.map((part) => ({
      ...part,
      joint: { ...part.joint, y: part.joint.y + lift },
      boneAt: { ...part.boneAt, y: part.boneAt.y + lift },
      body: { ...part.body, at: { ...part.body.at, y: part.body.at.y + lift } },
    })) };
    const physics = await createPhysics(land(), { obstacles: [{
      at: { x: 3, y: 1, z: 2 }, halfExtents: { x: 1.5, y: 1, z: 1.5 },
    }] });
    expect(physics).not.toBeNull();
    if (physics === null) return;
    const ragdoll = physics.articulate(raised);
    expect(ragdoll).not.toBeNull();
    if (ragdoll === null) return;
    for (let step = 0; step < 300; step += 1) physics.step();
    expect(Math.min(...ragdoll.snapshot().bones.map((bone) => bone.at.y))).toBeGreaterThan(1.88);
    physics.dispose(); cast.dispose();
  });

  it('acota ragdolls y escombros, y dispose deja todos los getters seguros', async () => {
    const cast = makeCast(); cast.show([actor()]);
    const base = cast.captureRagdoll(4, 0);
    expect(base).not.toBeNull();
    if (base === null) return;
    const physics = await createPhysics(land());
    expect(physics).not.toBeNull();
    if (physics === null) return;
    let ragdoll = physics.articulate(base);
    for (let id = 1; id < 30; id += 1) {
      ragdoll = physics.articulate({ ...base, id: 100 + id, bornAt: id });
      physics.debris({ id: `piece-${id}`, at: { x: 2, y: 2, z: 2 },
        halfExtents: { x: 0.05, y: 0.05, z: 0.05 } });
    }
    const arrow = physics.launch({ x: 1, y: 2, z: 1 }, { x: 1, y: 0, z: 0 });
    const piece = physics.debris({ id: 'last', at: { x: 2, y: 2, z: 2 },
      halfExtents: { x: 0.05, y: 0.05, z: 0.05 } });
    expect(physics.snapshot().stats.ragdolls).toBeLessThanOrEqual(24);
    expect(physics.snapshot().stats.debris).toBeLessThanOrEqual(24);
    physics.dispose(); physics.dispose(); arrow.remove(); piece.remove(); ragdoll?.remove();
    expect([...Object.values(arrow.at), ...Object.values(arrow.velocity), ...Object.values(piece.rotation)]
      .every(Number.isFinite)).toBe(true);
    expect(physics.snapshot().stats).toMatchObject({ bodies: 0, ragdolls: 0, debris: 0 });
    expect(physics.articulate(base)).toBeNull();
    cast.dispose();
  });
});
