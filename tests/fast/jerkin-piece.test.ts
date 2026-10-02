// K5 · El peto de cuero, puesto sobre el aldeano publicado (`render3d/world/jerkin.ts`).
//
// Lo que se guarda son las dos propiedades que hacen que el peto se lea a
// escala de móvil: **cubre el tronco que se pinta** —medido sobre los vértices
// del GLB que mueve el hueso `spine`, no sobre una caja escrita a mano— y
// **cambia la silueta**: los hombros salen más anchos que el tronco. Si llega
// un aldeano nuevo con otro tronco, esta prueba lo dice con la medida nueva.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box3, Vector3, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { jerkinBounds, jerkinPiece, TORSO_IN_SPINE } from '../../src/render3d/world/jerkin';

async function villager() {
  const bytes = readFileSync('public/assets/valley3d/villager.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}

describe('K5 · el peto puesto', () => {
  it('cubre el tronco que se pinta y ensancha los hombros', async () => {
    const scene = await villager();
    const spine = scene.getObjectByName('spine');
    expect(spine, 'el aldeano ya no trae el hueso «spine»: cuelga el peto de otro').toBeDefined();
    // El tronco pintado: los vértices que mueve sobre todo el hueso del tronco,
    // en el marco de ese hueso.
    const torso = new Box3();
    const point = new Vector3();
    scene.traverse((child) => {
      const mesh = child as SkinnedMesh;
      if (mesh.isSkinnedMesh !== true) return;
      const spineIndex = mesh.skeleton.bones.findIndex((bone) => bone.name === 'spine');
      const index = mesh.geometry.getAttribute('skinIndex');
      const weight = mesh.geometry.getAttribute('skinWeight');
      for (let i = 0; i < index.count; i += 1) {
        let onSpine = 0;
        for (let k = 0; k < 4; k += 1) if (index.getComponent(i, k) === spineIndex) onSpine += weight.getComponent(i, k);
        if (onSpine < 0.5) continue;
        // En la pose de enlace los vértices del GLB publicado ya están en el
        // marco del modelo (el hueso del tronco, a 0,353, cae dentro del
        // tronco de 0,298 a 0,482), así que se pasan tal cual al del hueso.
        // Del atributo y no de `getVertexPosition`, que en una malla con
        // esqueleto aplica la piel otra vez.
        point.fromBufferAttribute(mesh.geometry.getAttribute('position'), i);
        torso.expandByPoint(spine!.worldToLocal(point.clone()));
      }
    });
    expect(torso.isEmpty(), 'ningún vértice en el tronco').toBe(false);
    const seen = `el tronco va de ${torso.min.y.toFixed(3)} a ${torso.max.y.toFixed(3)} en alto, `
      + `±${torso.max.x.toFixed(3)} de ancho y de ${torso.min.z.toFixed(3)} a ${torso.max.z.toFixed(3)} de fondo`;
    expect(Math.abs(torso.min.y - TORSO_IN_SPINE.bottom), seen).toBeLessThan(0.03);
    expect(Math.abs(torso.max.y - TORSO_IN_SPINE.top), seen).toBeLessThan(0.03);
    expect(Math.abs(torso.max.x - TORSO_IN_SPINE.halfWidth), seen).toBeLessThan(0.03);
    expect(Math.abs(torso.min.z - TORSO_IN_SPINE.back), seen).toBeLessThan(0.03);
    expect(Math.abs(torso.max.z - TORSO_IN_SPINE.front), seen).toBeLessThan(0.03);

    const piece = jerkinBounds();
    // Por delante, por detrás y por los lados no se hunde en la ropa.
    expect(piece.min[0]).toBeLessThan(torso.min.x);
    expect(piece.max[0]).toBeGreaterThan(torso.max.x);
    expect(piece.min[2]).toBeLessThan(torso.min.z);
    expect(piece.max[2]).toBeGreaterThan(torso.max.z);
    // Y la silueta: las hombreras sacan al menos un cuarto del tronco a cada
    // lado, pero no tanto que parezca otra figura.
    const widening = piece.max[0] / torso.max.x;
    expect(widening, 'los hombros con peto, contra el tronco').toBeGreaterThan(1.25);
    expect(widening).toBeLessThan(2);
    // Del cuello a la cadera, sin taparle la cabeza.
    expect(piece.max[1]).toBeLessThan(torso.max.y + 0.05);
  });

  it('es una sola malla con su material, compartidos por todos los petos', () => {
    const a = jerkinPiece();
    const b = jerkinPiece();
    expect(a.geometry).toBe(b.geometry);
    expect(a.material).toBe(b.material);
    expect(a.children.length, 'una llamada de dibujo por peto').toBe(0);
  });
});
