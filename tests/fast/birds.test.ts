// Los pájaros del cielo son el modelo de Astra. 26 sep 2026.
//
// Vera: «los pájaros estos no me gustan, hay que hacer modelos 3D». Lo que se
// guarda: con el modelo, las bandadas son pájaros de verdad —cuerpo y dos
// alas— y no la uve dibujada; las alas baten sobre el hombro; y sin modelo
// sigue habiendo pájaros, dibujados, como antes.

import { describe, expect, it } from 'vitest';
import { BoxGeometry, Camera, Group, type InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { foundGame } from '@engine/found';
import { createAmbience } from '../../src/render3d/effects/ambience';

/** Un pájaro como el de Astra: el cuerpo con dos materiales llega como grupo. */
function fakeBird(): Group {
  const root = new Group();
  const body = new Group();
  body.name = 'bird_body';
  body.add(new Mesh(new BoxGeometry(0.01, 0.01, 0.1), new MeshStandardMaterial()));
  body.add(new Mesh(new BoxGeometry(0.008, 0.004, 0.06), new MeshStandardMaterial()));
  const left = new Mesh(new BoxGeometry(0.1, 0.002, 0.02), new MeshStandardMaterial());
  left.name = 'bird_wing_l';
  left.position.set(-0.003, 0.001, 0.003);
  const right = new Mesh(new BoxGeometry(0.1, 0.002, 0.02), new MeshStandardMaterial());
  right.name = 'bird_wing_r';
  right.position.set(0.003, 0.001, 0.003);
  root.add(body, left, right);
  return root;
}

/** Las piezas instanciadas del pájaro, en el orden en que se añaden. */
function flock(group: Group): InstancedMesh[] {
  return group.children.filter((child): child is InstancedMesh => (child as InstancedMesh).isInstancedMesh === true)
    .filter((mesh) => mesh.geometry.type === 'BoxGeometry');
}

describe('los pájaros del cielo', () => {
  it('con el modelo de Astra vuelan pájaros de verdad, y las alas baten sobre el hombro', () => {
    const { map } = foundGame(11);
    const ambience = createAmbience(map, fakeBird());
    const camera = new Camera();
    const noon = 0.45;
    ambience.step(noon, 'summer', 'clear', 0.1, camera);
    expect(ambience.visible.birds).toBeGreaterThan(0);
    const pieces = flock(ambience.group);
    expect(pieces.length, 'dos del cuerpo y una por ala').toBe(4);
    const wing = pieces[2]!;
    const shoulder = new Vector3(), later = new Vector3();
    const before = new Matrix4(), after = new Matrix4();
    wing.getMatrixAt(0, before);
    ambience.step(noon, 'summer', 'clear', 0.07, camera);
    wing.getMatrixAt(0, after);
    // El ala se mueve (bate) …
    expect(before.equals(after)).toBe(false);
    // … y su hombro va con el pájaro: entre dos fotogramas, lo que avanza el vuelo.
    shoulder.setFromMatrixPosition(before);
    later.setFromMatrixPosition(after);
    expect(shoulder.distanceTo(later)).toBeLessThan(1);
    ambience.dispose();
  });

  it('sin modelo sigue habiendo pájaros, dibujados', () => {
    const { map } = foundGame(11);
    const ambience = createAmbience(map);
    ambience.step(0.45, 'summer', 'clear', 0.1, new Camera());
    expect(ambience.visible.birds).toBeGreaterThan(0);
    ambience.dispose();
  });
});
