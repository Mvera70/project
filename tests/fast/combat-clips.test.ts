import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Box3, type AnimationClip, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Cast } from '../../src/render3d/world/cast';
import { clipTime, VILLAGER_CLIPS, type ClipName } from '../../src/render3d/clips';
import { actionClips } from '../../src/render3d/action-clips';
import type { Actor } from '../../src/render3d/contracts';
import { castOf } from '../../src/render3d/life/cast';
import type { Village } from '../../src/render3d/life/village';
import { stepRaider, type Gate, type Raider } from '../../src/render3d/life/raiders';
import { stepMelee } from '../../src/render3d/life/melee';
import { archersOf, stepArchery } from '../../src/render3d/life/archery';
import type { Manned } from '../../src/render3d/life/garrison';
import { createPhysics } from '../../src/render3d/life/physics';

let model: Object3D, clips: AnimationClip[];
beforeAll(async () => {
  const bytes = readFileSync('public/assets/valley3d/villager.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model = gltf.scene; clips = gltf.animations;
});

const actor = (clip: ClipName, seconds: number): Actor => ({
  id: 1, x: 0, z: 0, facing: 0, activity: 'resting', clip, clipSeconds: seconds,
  travelled: 0, cell: 0, named: false, age: 30, talking: false, arguing: false, occupation: null, role: null,
  poseSeconds: 100 + seconds,
});
const makeCast = (): Cast => new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
function pose(cast: Cast): number[] {
  const values: number[] = [];
  cast.group.updateMatrixWorld(true);
  cast.group.traverse(bone => {
    if (bone.type === 'Bone') values.push(...bone.position.toArray(), ...bone.quaternion.toArray(), ...bone.scale.toArray());
  });
  return values;
}
function raider(): Raider {
  return { body: { id: -9000, x: 12, z: 10, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.4 },
    road: { x: 0, z: 0 }, post: { x: 12, z: 10 }, inside: { x: 10, z: 10 },
    phase: 'breaking', route: [], deadline: 999, standingUntil: 0, forced: false, hits: 0, entered: false };
}

describe('E1 · el hecho decide la pose', () => {
  it('el reparto sirve contacto, impacto y caída por encima del gesto de puerta', () => {
    const enemy = raider();
    enemy.thrustAt = 30; enemy.hitAt = 30; enemy.blowAt = 30;
    enemy.meleeFacing = Math.PI / 2;
    const life = { land: { width: 32, height: 32 }, dwellers: [], raiders: [enemy], steps: 31 } as unknown as Village;
    expect(castOf(life, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'spear_thrust', clipSeconds: 0 });
    expect(castOf({ ...life, steps: 34 }, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'hit_take', facing: Math.PI / 2 });
    enemy.phase = 'down'; enemy.downAt = 33;
    expect(castOf({ ...life, steps: 34 }, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'fall', clipSeconds: 0 });
    expect(castOf({ ...life, steps: 100 }, 999, new Map(), new Set())[0]?.facing).toBe(Math.PI / 2);
  });

  it.each(['spear_thrust', 'hit_take'] as const)('%s mueve los huesos del GLB, sin desplazar el actor', clip => {
    const cast = makeCast();
    try {
      cast.show([actor('idle', 0)]); const idle = pose(cast);
      cast.show([actor(clip, 0)]); const contact = pose(cast);
      expect(contact).not.toEqual(idle);
      cast.show([actor(clip, VILLAGER_CLIPS[clip].seconds)]);
      expect(pose(cast)).not.toEqual(contact);
    } finally { cast.dispose(); }
  });
  it('sólo un golpe contado reinicia el gesto, con la misma fecha que el portón', () => {
    const enemy = raider(), gate: Gate = { at: { x: 12, z: 11 }, hits: 0, brokeAt: null };
    const land = { width: 32, height: 32, blocked: new Uint8Array(1024) };
    stepRaider(enemy, land, 7, 29, gate);
    expect(gate.hits).toBe(0); expect(enemy.blowAt).toBeUndefined();
    stepRaider(enemy, land, 7, 30, gate);
    expect(gate.hits).toBe(1); expect(enemy.blowAt).toBe(gate.hitAt);
    expect(enemy.blowAt).toBe(30);
    const life = { land, dwellers: [], raiders: [enemy], steps: 31 } as unknown as Village;
    expect(castOf(life, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'gate_strike', clipSeconds: 0 });
    stepRaider(enemy, land, 7, 31, gate);
    expect(enemy.blowAt).toBe(30); expect(gate.hits).toBe(1);
    stepRaider(enemy, land, 7, 60, gate);
    expect(enemy.blowAt).toBe(60); expect(gate.hits).toBe(2);
  });

  it.each(['bow_loose', 'gate_strike', 'spear_thrust', 'hit_take', 'fall'] as const)('%s no vuelve al principio ni hereda el desfase del vecino', clip => {
    expect(clipTime(clip, 99, 9, 0.9, 10)).toBe(0);
    expect(clipTime(clip, 99, 10, 0.9, 10)).toBe(0);
    expect(clipTime(clip, 99, 10.2, 0.9, 10)).toBeCloseTo(0.2);
    expect(clipTime(clip, 99, 200, 0.9, 10)).toBe(VILLAGER_CLIPS[clip].seconds);
  });

  it.each(['bow_draw', 'bow_loose', 'gate_strike', 'spear_thrust', 'hit_take', 'fall'] as const)('%s da la misma pose con salto, repetición, retroceso y otro clip previo', clip => {
    const direct = makeCast(), watched = makeCast();
    try {
      for (const at of [0, 0.2, VILLAGER_CLIPS[clip].seconds, 0.1, VILLAGER_CLIPS[clip].seconds]) {
        direct.clear();
        direct.show([actor(clip, at)]);
        watched.show([actor('walk', 0.4)]);
        watched.show([actor(clip, at)]);
        expect(pose(watched)).toEqual(pose(direct));
        watched.show([actor(clip, at)]);
        expect(pose(watched)).toEqual(pose(direct));
      }
    } finally { direct.dispose(); watched.dispose(); }
  });

  it('la caída tiene movimiento real y termina tendida sobre el suelo con el GLB publicado', () => {
    const cast = makeCast();
    try {
      cast.show([actor('fall', 0)]); const before = pose(cast);
      const tall = new Box3().setFromObject(cast.group, true).getSize(new Vector3()).y;
      cast.show([actor('fall', 0.6)]); expect(pose(cast)).not.toEqual(before);
      cast.show([actor('fall', 1.2)]);
      const end = pose(cast), bounds = new Box3().setFromObject(cast.group, true);
      expect(bounds.getSize(new Vector3()).y).toBeLessThan(tall * 0.5);
      expect(bounds.min.y).toBeGreaterThan(-0.05);
      cast.show([actor('fall', clipTime('fall', 0, 100, 0, 0))]);
      expect(pose(cast)).toEqual(end);
    } finally { cast.dispose(); }
  });

  it('el tensado es sostenible y la suelta se separa de él inmediatamente', () => {
    const generated = actionClips(clips.find(c => c.name === 'idle')!);
    const draw = generated.find(c => c.name === 'bow_draw')!;
    for (const track of draw.tracks) {
      const size = track.getValueSize();
      const first = Array.from(track.values.slice(0, size));
      const last = Array.from(track.values.slice(-size));
      first.forEach((value, i) => expect(last[i]).toBeCloseTo(value, 5));
    }
    const cast = makeCast();
    try {
      cast.show([actor('bow_draw', 0)]); const ready = pose(cast);
      cast.show([actor('bow_loose', 0)]); expect(pose(cast)).not.toEqual(ready);
      cast.show([actor('bow_loose', 1 / 30)]); expect(pose(cast)).not.toEqual(ready);
    } finally { cast.dispose(); }
  });

  it('flee es una carrera cíclica de 0,8 s gobernada por suelo recorrido', () => {
    const cast = makeCast();
    try {
      cast.show([actor('flee', 0)]); const start = pose(cast);
      cast.show([{ ...actor('flee', 0), travelled: 0.11 }]); expect(pose(cast)).not.toEqual(start);
      cast.show([{ ...actor('flee', 0), travelled: 0.44 }]); expect(pose(cast)).toEqual(start);
      expect(clipTime('flee', 0.22, 999, 0.7)).toBeCloseTo(0.4);
      expect(clipTime('flee', 0.44, 999, 0.7)).toBeCloseTo(0);
    } finally { cast.dispose(); }
  });

  it('cada flecha fecha la suelta, conserva los 63 pasos y no dispara un puesto vacío', async () => {
    const land = { width: 32, height: 32, blocked: new Uint8Array(1024) };
    const physics = await createPhysics(land);
    expect(physics).not.toBeNull(); if (physics === null) return;
    try {
      const post = { place: { id: 'bow', at: { x: 10, z: 10 } }, post: { arm: 'bow' } } as Manned;
      const archers = archersOf([post]), enemy = raider();
      const arrows: Parameters<typeof stepArchery>[2] = [];
      for (let step = 0; step <= 126; step++) stepArchery(archers, [enemy], arrows, physics, step, new Set(['bow']));
      expect(arrows.map(a => a.loosed)).toEqual([0, 63, 126]);
      expect(archers[0]?.lastShot).toBe(arrows.at(-1)?.loosed);
      stepArchery(archers, [enemy], arrows, physics, 200, new Set());
      expect(arrows).toHaveLength(3);
    } finally { physics.dispose(); }
  });

  it('el golpe fatal llega al reparto en el mismo fotograma y se queda al final', () => {
    const enemy = raider(); enemy.hits = 2;
    const defender = { at: { x: 12, z: 10.5 }, post: { post: { arm: 'spear' } } as Manned, hits: 2, down: false, downAt: -1 };
    stepMelee([enemy], [defender], 30);
    expect(defender.downAt).toBe(30); expect(enemy.downAt).toBe(30);
    const life = { land: { width: 32, height: 32 }, dwellers: [], raiders: [enemy], steps: 31 } as unknown as Village;
    expect(castOf(life, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'fall', clipSeconds: 0 });
    const later = { ...life, steps: 400 };
    expect(castOf(later, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'fall', clipSeconds: 1.2 });
  });
});
