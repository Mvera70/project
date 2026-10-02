import { readFileSync } from 'node:fs';
import { DAMAGE } from '../../src/render3d/life/wounds';
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
import { createPhysics, type Physics } from '../../src/render3d/life/physics';

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
  it('el reparto marca al raider como clan vecino, no como forastero civil', () => {
    const enemy = raider();
    const life = { land: { width: 32, height: 32 }, dwellers: [], raiders: [enemy], visitors: [], travellers: [], steps: 1 } as unknown as Village;

    expect(castOf(life, 0, new Map(), new Set())[0]).toMatchObject({
      role: 'stranger', visualIdentity: 'neighbor',
    });
  });

  it('el reparto sirve contacto, impacto y caída por encima del gesto de puerta', () => {
    const enemy = raider();
    enemy.thrustAt = 30; enemy.hitAt = 30; enemy.blowAt = 30;
    enemy.meleeFacing = Math.PI / 2;
    const life = { land: { width: 32, height: 32 }, dwellers: [], raiders: [enemy], visitors: [], travellers: [], steps: 31 } as unknown as Village;
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
    const life = { land, dwellers: [], raiders: [enemy], visitors: [], travellers: [], steps: 31 } as unknown as Village;
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
      // La zancada es la del catálogo de clips (AN-3 la subió de 0,44 a 0,7):
      // lo que se guarda es el ciclo por suelo recorrido, no el número.
      const stride = VILLAGER_CLIPS.flee.strideLength!;
      cast.show([actor('flee', 0)]); const start = pose(cast);
      cast.show([{ ...actor('flee', 0), travelled: stride / 4 }]); expect(pose(cast)).not.toEqual(start);
      cast.show([{ ...actor('flee', 0), travelled: stride }]); expect(pose(cast)).toEqual(start);
      expect(clipTime('flee', stride / 2, 999, 0.7)).toBeCloseTo(0.4);
      expect(clipTime('flee', stride, 999, 0.7)).toBeCloseTo(0);
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

  it('un bastión no dispara desde la escalera y, ocupado, suelta desde el grip medido', () => {
    const launched: Array<{ x: number; y: number; z: number }> = [];
    const physics = {
      launch(at: { x: number; y: number; z: number }) {
        launched.push(at);
        return { at, resting: false, remove() {} };
      },
    } as unknown as Physics;
    const elevated = {
      access: { x: 0, z: 1 },
      approach: { x: .5, y: 0, z: 2.4 }, foot: { x: .5, y: 0, z: 2 },
      supports: [], exit: { x: .5, y: 1.02, z: 1 }, post: { x: .5, y: 1.02, z: .58 },
      climb: [], descent: [],
    };
    const post = { place: { id: 'high-bow', at: { x: .5, z: 2.4 } }, post: { arm: 'bow' }, elevated,
      facing: { x: .5, z: 0 } } as unknown as Manned;
    const archer = archersOf([post])[0]!;
    archer.facing = Math.PI;
    const enemy = raider(); enemy.body.x = .5; enemy.body.z = -4;
    const arrows: Parameters<typeof stepArchery>[2] = [];

    stepArchery([archer], [enemy], arrows, physics, 0, new Set(['high-bow']));
    expect(launched, 'la aproximación no basta para disparar').toEqual([]);
    stepArchery([archer], [enemy], arrows, physics, 1, new Set(['high-bow']),
      new Map([['high-bow', { x: .5, y: 1.02, z: .58 }]]));

    expect(launched).toHaveLength(1);
    const firstFacing = archer.facing!;
    const first = launched[0]!;
    expect(first.x).toBeCloseTo(.5 + -.020588 * Math.cos(firstFacing)
      + .243754 * Math.sin(firstFacing), 6);
    expect(launched[0]?.y).toBeCloseTo(1.448627, 6);
    expect(first.z).toBeCloseTo(.58 - -.020588 * Math.sin(firstFacing)
      + .243754 * Math.cos(firstFacing), 6);

    // Cambiar de flanco no recicla el yaw de la suelta anterior: el siguiente
    // origen rota con la mano hacia el nuevo saqueador.
    enemy.body.x = 5; enemy.body.z = .58;
    stepArchery([archer], [enemy], arrows, physics, 64, new Set(['high-bow']),
      new Map([['high-bow', { x: .5, y: 1.02, z: .58 }]]));
    const second = launched[1]!;
    expect(second.x).toBeCloseTo(.5 + -.020588 * Math.cos(archer.facing!)
      + .243754 * Math.sin(archer.facing!), 6);
    expect(second.z).toBeCloseTo(.58 - -.020588 * Math.sin(archer.facing!)
      + .243754 * Math.cos(archer.facing!), 6);
  });

  it('el golpe fatal llega al reparto en el mismo fotograma y se queda al final', () => {
    // Dos lanzazos encima de cada uno: al tercero, los dos al suelo (`wounds.ts`).
    const left = 1 - 2 * DAMAGE.spear;
    const enemy = raider(); enemy.hits = 2; enemy.health = left;
    const defender = { at: { x: 12, z: 10.5 }, post: { post: { arm: 'spear' } } as Manned, hits: 2, health: left,
      down: false, downAt: -1 };
    stepMelee([enemy], [defender], 30);
    expect(defender.downAt).toBe(30); expect(enemy.downAt).toBe(30);
    const life = { land: { width: 32, height: 32 }, dwellers: [], raiders: [enemy], visitors: [], travellers: [], steps: 31 } as unknown as Village;
    expect(castOf(life, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'fall', clipSeconds: 0 });
    const later = { ...life, steps: 400 };
    expect(castOf(later, 999, new Map(), new Set())[0]).toMatchObject({ clip: 'fall', clipSeconds: 1.2 });
  });
});

// AN-3 · El golpe al portón trae el golpe siguiente.
//
// Los golpes van a paso fijo (`raiders.ts`, `BLOW_STEPS`), así que el clip
// dura el segundo entero: contacto en t=0 —donde está el daño— y después la
// retirada y la carga con los brazos por encima de la cabeza, que se sostiene
// hasta que el hecho siguiente lo devuelve al contacto. Un asaltante que
// golpea sin levantar el arma era lo que había.
describe('AN-3 · el golpe al portón carga el siguiente', () => {
  const hand = (cast: Cast, name: string): Vector3 => {
    cast.group.updateMatrixWorld(true);
    return cast.group.getObjectByName(name)!.getWorldPosition(new Vector3());
  };
  it('contacto delante en t=0, brazos por encima de la cabeza antes del golpe siguiente', () => {
    const cast = makeCast();
    try {
      cast.show([actor('gate_strike', 0)]);
      const contact = hand(cast, 'hand_r'), head = hand(cast, 'head');
      expect(contact.z, 'delante').toBeGreaterThan(0.18);
      expect(contact.y, 'a la altura del pecho').toBeLessThan(head.y);
      cast.show([actor('gate_strike', VILLAGER_CLIPS.gate_strike.seconds * 0.85)]);
      const loaded = hand(cast, 'hand_r');
      expect(loaded.y, 'cargado arriba').toBeGreaterThan(head.y + 0.1);
      cast.show([actor('gate_strike', VILLAGER_CLIPS.gate_strike.seconds)]);
      expect(hand(cast, 'hand_r').y, 'y se sostiene').toBeGreaterThan(head.y + 0.1);
      // Un golpe por segundo: el clip dura lo que tarda el siguiente.
      expect(VILLAGER_CLIPS.gate_strike.seconds).toBe(1);
    } finally { cast.dispose(); }
  });

  // AN-3 · La huida es un esprint que pisa: con las piernas abiertas la de
  // delante toca el suelo, la de atrás va en el aire y la cadera baja; en el
  // cruce, los dos pies cerca del suelo. La versión de E1 flotaba diez
  // centímetros en cada apoyo porque la cadera no seguía a la pierna.
  it('la huida pisa con la pierna de delante, levanta la de atrás y baja la cadera al abrirse', () => {
    const cast = makeCast();
    try {
      const stride = VILLAGER_CLIPS.flee.strideLength!;
      const at = (travelled: number, name: string): Vector3 => {
        cast.show([{ ...actor('flee', 0), travelled, activity: 'walking' }]);
        cast.group.updateMatrixWorld(true);
        return cast.group.getObjectByName(name)!.getWorldPosition(new Vector3());
      };
      const restHips = at(0, 'hips').y;
      const open = { hips: at(stride * 0.25, 'hips'), L: at(stride * 0.25, 'footL'), R: at(stride * 0.25, 'footR') };
      expect(open.hips.y, 'la cadera baja').toBeLessThan(restHips - 0.02);
      const low = Math.min(open.L.y, open.R.y), high = Math.max(open.L.y, open.R.y);
      expect(low, 'la pierna de delante pisa').toBeLessThan(0.075);
      expect(high - low, 'la de atrás va en el aire').toBeGreaterThan(0.04);
      expect(VILLAGER_CLIPS.flee.strideLength, 'zancada de esprint').toBeGreaterThanOrEqual(0.7);
    } finally { cast.dispose(); }
  });
});
