// Lo lento de este fichero vive en `tests/journeys/work-gestures-long.test.ts` (v5.56).
//
// IA-anim · Talar y picar: gestos con carga, golpe y herramienta que se ve.
//
// Hasta esta ronda `chop` era el martillo con el otro brazo encima —un vaivén
// delante del pecho— y la cantera usaba el martillo pequeño de la fragua. Lo
// que se guarda aquí es la forma del gesto sobre el GLB publicado, no sus
// ángulos: si la carga no sube por encima de la cabeza o el golpe no baja,
// el aldeano vuelve a parecer que se frota las manos.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Mesh, Quaternion, Vector3, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Cast } from '../../src/render3d/world/cast';
import { STRIKE_AT, STRIKE_HEAD, VILLAGER_CLIPS, type ClipName } from '../../src/render3d/clips';
import { handTool } from '../../src/render3d/hand-tools';
import type { Actor } from '../../src/render3d/contracts';

let model: Object3D, clips: AnimationClip[];
beforeAll(async () => {
  const bytes = readFileSync('public/assets/valley3d/villager.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model = gltf.scene; clips = gltf.animations;
});

const actor = (clip: 'chop' | 'mine', seconds: number): Actor => ({
  id: 7, x: 0, z: 0, facing: 0, activity: 'working', clip, clipSeconds: seconds,
  travelled: 0, cell: 0, named: false, age: 30, talking: false, arguing: false, occupation: null, role: null,
});

function handAt(clip: 'chop' | 'mine', fraction: number): Vector3 {
  const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
  cast.show([actor(clip, fraction * VILLAGER_CLIPS[clip].seconds)]);
  cast.group.updateMatrixWorld(true);
  return cast.group.getObjectByName('hand_r')!.getWorldPosition(new Vector3());
}

/** La coronilla en reposo, para medir «por encima de la cabeza». */
function headTop(): number {
  const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
  cast.show([{ ...actor('chop', 0), clip: 'idle', activity: 'resting' }]);
  cast.group.updateMatrixWorld(true);
  return cast.group.getObjectByName('head')!.getWorldPosition(new Vector3()).y;
}

describe('IA-anim · gestos de talar y picar', () => {
  it.each(['chop', 'mine'] as const)('%s carga por encima de la cabeza y golpea abajo', (clip) => {
    const at = STRIKE_AT[clip];
    const up = handAt(clip, at - 0.12), hit = handAt(clip, at);
    const head = headTop();
    // La carga: la mano, a la altura de la cabeza o más.
    expect(up.y, 'carga').toBeGreaterThan(head * 0.95);
    // El golpe baja al menos media altura de cabeza respecto a la carga.
    expect(up.y - hit.y, 'recorrido del golpe').toBeGreaterThan(head * 0.45);
    // Y el pico baja más que el hacha: uno clava al suelo, el otro barre el tronco.
    if (clip === 'mine') expect(hit.y).toBeLessThan(handAt('chop', STRIKE_AT.chop).y);
  });

  it('el golpe es rápido y la carga lenta', () => {
    for (const clip of ['chop', 'mine'] as const) {
      const at = STRIKE_AT[clip];
      const fall = handAt(clip, at - 0.12).y - handAt(clip, at).y;
      const rise = handAt(clip, at - 0.12).y - handAt(clip, 0).y;
      // Baja en 0,12 del ciclo lo que sube en el resto hasta la carga.
      expect(fall, clip).toBeGreaterThan(0);
      expect(fall / 0.12, clip).toBeGreaterThan(rise / (at - 0.12));
    }
  });

  it('hacha y pico existen como herramienta y miden como una, no como un palillo', () => {
    for (const clip of ['chop', 'mine'] as const) {
      const tool = handTool(clip);
      expect(tool, clip).toBeDefined();
      let tallest = 0;
      tool!.traverse(node => { if (node instanceof Mesh) { node.geometry.computeBoundingBox(); tallest = Math.max(tallest, node.geometry.boundingBox!.max.y - node.geometry.boundingBox!.min.y); } });
      // En metros, como el resto de respaldos: un mango de un metro.
      expect(tallest, clip).toBeGreaterThanOrEqual(0.9);
    }
  });
});

describe('IA-anim · el árbol acusa el hachazo y el leñador pega al tronco', () => {
  it('sway inclina sólo el árbol golpeado y lo devuelve a su sitio', async () => {
    const { Group, Matrix4, Mesh, MeshStandardMaterial, BoxGeometry, InstancedMesh } = await import('three');
    const { buildForest } = await import('../../src/render3d/world/forest');
    const { foundTwenty } = await import('../helpers/founding');
    const { TERRAIN_CODE } = await import('@engine/state');
    const state = foundTwenty(7);
    const cells = Array.from(state.map.terrain).flatMap((kind, cell) => kind === TERRAIN_CODE.forest ? [cell] : []).slice(0, 5);
    expect(cells.length).toBeGreaterThan(1);
    const tree = new Group(); tree.add(new Mesh(new BoxGeometry(0.2, 2, 0.2), new MeshStandardMaterial({ name: 'bark' })));
    const forest = buildForest(state, tree);
    const meshes: InstanceType<typeof InstancedMesh>[] = [];
    forest.group.traverse(node => { if (node instanceof InstancedMesh) meshes.push(node); });
    const read = (): number[][] => meshes.flatMap(mesh => Array.from({ length: mesh.count }, (_, i) => {
      const m = new Matrix4(); mesh.getMatrixAt(i, m); return Array.from(m.elements);
    }));
    const before = read();
    expect(forest.sway(cells[1]!, 1, 0, 0.05)).toBe(true);
    const tilted = read();
    const moved = tilted.filter((m, i) => m.some((v, k) => Math.abs(v - before[i]![k]!) > 1e-6)).length;
    expect(moved, 'sólo el árbol de esa celda').toBe(1);
    forest.sway(cells[1]!, 1, 0, 0);
    expect(read().every((m, i) => m.every((v, k) => Math.abs(v - before[i]![k]!) < 1e-6))).toBe(true);
    forest.dispose();
  });
});

describe('IA-anim · el hacha corta con el filo', () => {
  it('en el golpe, el filo va por delante del movimiento de la cabeza', async () => {
    const { Quaternion } = await import('three');
    // El filo mira hacia −X de la cabeza (`hand-tools.ts`). Vera vio el primer
    // hacha pegando con el lomo: esta prueba lo habría cazado.
    const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
    const headAt = (fraction: number): { at: Vector3; edge: Vector3 } => {
      cast.show([actor('chop', fraction * VILLAGER_CLIPS.chop.seconds)]);
      cast.group.updateMatrixWorld(true);
      const hand = cast.group.getObjectByName('hand_r')!;
      let tool = hand.children.find(child => child.name === 'IA_test_axe');
      if (tool === undefined) { tool = handTool('chop')!; tool.name = 'IA_test_axe'; hand.add(tool); cast.group.updateMatrixWorld(true); }
      const inner = tool.children[0]!;
      return { at: inner.children[1]!.getWorldPosition(new Vector3()),
        edge: new Vector3(-1, 0, 0).applyQuaternion(inner.getWorldQuaternion(new Quaternion())) };
    };
    const before = headAt(STRIKE_AT.chop - 0.03), hit = headAt(STRIKE_AT.chop);
    const motion = hit.at.clone().sub(before.at).normalize();
    expect(hit.edge.dot(motion)).toBeGreaterThan(0.3);
  });
});

describe('IA-anim · STRIKE_HEAD es lo que el GLB hace', () => {
  it.each(['chop', 'mine'] as const)('la cabeza de %s cae donde dice la tabla', (clip) => {
    const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
    cast.show([actor(clip, STRIKE_AT[clip] * VILLAGER_CLIPS[clip].seconds)]);
    cast.group.updateMatrixWorld(true);
    const hand = cast.group.getObjectByName('hand_r')!;
    const tool = handTool(clip)!; hand.add(tool); cast.group.updateMatrixWorld(true);
    const far = tool.children[0]!.children.map(child => child.getWorldPosition(new Vector3()))
      .reduce((a, b) => (Math.hypot(b.x, b.z) > Math.hypot(a.x, a.z) ? b : a));
    // La vida coloca al trabajador con estos números: si el gesto cambia, se vuelven a medir.
    expect(Math.abs(far.x - STRIKE_HEAD[clip].x)).toBeLessThan(0.03);
    expect(Math.abs(far.z - STRIKE_HEAD[clip].z)).toBeLessThan(0.03);
  });
});

describe('G-40 · hacha y pico publicados se agarran como el respaldo', () => {
  it.each([['chop', 'axe'], ['mine', 'pickaxe']] as const)('%s con %s.glb: la cabeza de hierro cae donde el golpe medido', async (clip, asset) => {
    const { Box3, Mesh: ThreeMesh } = await import('three');
    const bytes = readFileSync(`public/assets/valley3d/${asset}.glb`);
    const tool = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
    const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model), id => id === asset ? tool.clone(true) : undefined);
    cast.show([actor(clip, STRIKE_AT[clip] * VILLAGER_CLIPS[clip].seconds)]);
    cast.group.updateMatrixWorld(true);
    const held = cast.group.getObjectByName(`Held_${clip}`)!;
    expect(held.userData.ownedTool, 'se usa el recurso publicado, no el respaldo').not.toBe(true);
    // La pieza de hierro: la que no es el mango (material de madera).
    let iron: InstanceType<typeof Box3> | null = null;
    held.traverse(node => { if (node instanceof ThreeMesh && !/wood/.test((node.material as { name: string }).name)) iron = new Box3().setFromObject(node); });
    expect(iron).not.toBeNull();
    const centre = iron!.getCenter(new Vector3());
    const head = STRIKE_HEAD[clip];
    expect(Math.hypot(centre.x - head.x, centre.z - head.z), 'cabeza del GLB frente al golpe medido').toBeLessThan(0.08);
  });
});

describe('IA-fields · sembrar a voleo y echar estiércol', () => {
  const handIn = (clip: 'sow' | 'spread', fraction: number): Vector3 => {
    const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
    cast.show([{ ...actor('chop', 0), clip, clipSeconds: fraction * VILLAGER_CLIPS[clip].seconds }]);
    cast.group.updateMatrixWorld(true);
    return cast.group.getObjectByName('hand_r')!.getWorldPosition(new Vector3());
  };

  it('el voleo barre de un costado al otro y suelta por delante', () => {
    const grab = handIn('sow', STRIKE_AT.sow - 0.2), release = handIn('sow', STRIKE_AT.sow);
    // Más de un metro de arco (una celda son tres metros) y la suelta delante del pecho.
    expect(Math.abs(grab.x - release.x)).toBeGreaterThan(0.3);
    expect(release.z).toBeGreaterThan(0.05);
    expect(release.y).toBeGreaterThan(grab.y);
  });

  it('la horca carga a ras de suelo y lanza por encima del pecho', () => {
    const scoop = handIn('spread', STRIKE_AT.spread - 0.2), toss = handIn('spread', STRIKE_AT.spread);
    expect(toss.y - scoop.y).toBeGreaterThan(0.15);
    expect(handTool('spread')).toBeDefined();
  });
});

// AN-2 · Vida y oficios: cada gesto cotidiano tiene tres tiempos que se leen
// a la distancia del juego, y lo que sale de la mano sale de donde está la
// mano. Se guarda la silueta (la articulación que define el gesto y cuánto
// se mueve), no los ángulos.
describe('AN-2 · los gestos cotidianos se leen a veinte píxeles', () => {
  const show = (clip: ClipName, fraction: number, role: Actor['role'] = null): Cast => {
    const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
    cast.show([{ ...actor('chop', 0), clip, activity: 'resting', role, clipSeconds: fraction * VILLAGER_CLIPS[clip].seconds }]);
    cast.group.updateMatrixWorld(true);
    return cast;
  };
  const at = (cast: Cast, name: string): Vector3 => cast.group.getObjectByName(name)!.getWorldPosition(new Vector3());
  /** Cuánto mira hacia abajo la cabeza: cero es la vertical, positivo es hacia el suelo. */
  const headPitch = (cast: Cast): number => {
    const up = new Vector3(0, 1, 0).applyQuaternion(cast.group.getObjectByName('head')!.getWorldQuaternion(new Quaternion()));
    return Math.atan2(up.z, up.y);
  };

  it('el martillo carga por encima del hombro, golpea por debajo de la cintura y baja más deprisa de lo que sube', () => {
    const strike = STRIKE_AT.hammer;
    const up = at(show('hammer', strike - 0.15), 'hand_r'), hit = at(show('hammer', strike), 'hand_r'), ready = at(show('hammer', 0), 'hand_r');
    const shoulder = at(show('hammer', 0), 'upperarmR'), hips = at(show('hammer', 0), 'hips');
    expect(up.y, 'carga').toBeGreaterThan(shoulder.y);
    expect(hit.y, 'golpe').toBeLessThan(hips.y);
    expect((up.y - hit.y) / 0.15, 'baja deprisa').toBeGreaterThan((up.y - ready.y) / (strike - 0.15));
  });

  it('la pelota sale de la mano: en la suelta la mano va por delante y por encima de la carga, junto al punto de salida', () => {
    const wound = at(show('throw', 0.6), 'hand_r'), released = at(show('throw', 0.97), 'hand_r');
    expect(released.z - wound.z, 'adelanta').toBeGreaterThan(0.2);
    // Donde `fling` pone la pelota (`life/props.ts`): 0,4 por delante y 0,53 de alto.
    expect(released.distanceTo(new Vector3(0, 0.53, 0.4)), 'punto de salida').toBeLessThan(0.25);
    // Y antes de la ventana, la pelota sujeta con las dos manos delante.
    const left = at(show('throw', 0), 'hand_l'), right = at(show('throw', 0), 'hand_r');
    expect(left.distanceTo(right)).toBeLessThan(0.15);
    expect(right.z).toBeGreaterThan(0.1);
  });

  it('jugar sin pelota es brincar: la cadera sube y una rodilla se alza, dos veces por ciclo', () => {
    const still = show('play', 0), high = show('play', 0.125);
    expect(at(high, 'hips').y - at(still, 'hips').y, 'salta').toBeGreaterThan(0.025);
    const knees = [at(high, 'shinL').y, at(high, 'shinR').y];
    expect(Math.max(...knees) - Math.min(...knees), 'una rodilla arriba').toBeGreaterThan(0.04);
  });

  it('sentarse es en el suelo: la cadera a un palmo y los pies a ras, no en un banco que no existe', () => {
    const cast = show('sit', 0.5);
    expect(at(cast, 'hips').y).toBeLessThan(0.1);
    for (const foot of ['footL', 'footR']) {
      const toe = cast.group.getObjectByName(foot)!.localToWorld(new Vector3(0, 0.2, 0));
      expect(toe.y, `${foot} no se hunde`).toBeGreaterThan(-0.015);
      expect(toe.y, `${foot} no flota`).toBeLessThan(0.05);
    }
  });

  it('beber lleva la taza a la boca y echa la cabeza atrás', () => {
    const sip = show('drink', 0.45), rest = show('drink', 0);
    const hand = at(sip, 'hand_r'), head = at(sip, 'head');
    expect(hand.y, 'a la altura de la cara').toBeGreaterThan(head.y - 0.02);
    expect(Math.hypot(hand.x, hand.z - head.z), 'delante de la boca').toBeLessThan(0.16);
    expect(headPitch(sip) - headPitch(rest), 'la cabeza atrás').toBeLessThan(-0.3);
    expect(at(rest, 'hand_r').y, 'la taza baja entre trago y trago').toBeLessThan(head.y - 0.15);
  });

  it('hablar mueve una mano al pecho y la cabeza asiente', () => {
    const ys = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map(f => at(show('talk', f), 'hand_r').y);
    expect(Math.max(...ys) - Math.min(...ys), 'la mano sube y baja').toBeGreaterThan(0.08);
    const pitches = [0, 0.083, 0.167].map(f => headPitch(show('talk', f)));
    expect(Math.max(...pitches) - Math.min(...pitches), 'asiente').toBeGreaterThan(0.1);
  });

  it('ordenar se dobla a por la cosa y la deja a un lado', () => {
    const erect = show('sort', 0.5), bent = show('sort', 0.3), placing = show('sort', 0.75);
    expect(headPitch(bent), 'mira abajo').toBeGreaterThan(1);
    expect(at(erect, 'head').y - at(bent, 'head').y, 'el tronco baja').toBeGreaterThan(0.03);
    expect(at(bent, 'hand_r').y, 'las manos a la cintura').toBeLessThan(at(erect, 'hips').y);
    expect(Math.abs(at(placing, 'hand_r').x - at(erect, 'hand_r').x), 'deja a un lado').toBeGreaterThan(0.1);
  });

  it('rezar se inclina una vez por ciclo', () => {
    expect(headPitch(show('pray', 0.5)) - headPitch(show('pray', 0))).toBeGreaterThan(0.4);
    expect(at(show('pray', 0), 'head').y - at(show('pray', 0.5), 'head').y).toBeGreaterThan(0.01);
  });
});
