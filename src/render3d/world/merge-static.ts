// Juntar las piezas de un modelo estático. 27 sep 2026.
//
// Vera: «el rendimiento es nefasto», una tablet a un fotograma por segundo. La
// villa grande pedía **1.700 llamadas de dibujo por fotograma** y la mitad eran
// edificios: 524 mallas, 500 de ellas con sombra —que se dibujan otra vez en el
// mapa de sombras—. Un GLB de casa trae de seis a doce piezas (paredes, vigas,
// tejado, chimenea, ventanas…), y cada pieza era una llamada. Esto las funde
// por material: una casa pasa a ser tantas llamadas como materiales tiene.
//
// Sólo lo que no se mueve: lo que cuelga de otro sitio (la hoja de la puerta,
// que ya se sacó a su bisagra) no está debajo del modelo cuando se llama.
// Las mallas con esqueleto, instanciadas, o con varios materiales se dejan
// como están. La geometría fundida es nueva y la suelta quien la pide.

import { Group, Matrix4, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Funde las mallas estáticas de `root` que comparten material y sombras en una
 * por grupo, colgada de `root` en su espacio local. Devuelve las geometrías
 * nuevas, para soltarlas. `userData` de la primera pieza pasa a la fundida (el
 * `buildingId` con el que se pica un edificio, por ejemplo).
 */
export function mergeStatic(root: Object3D): BufferGeometry[] {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<string, { material: Material; meshes: Mesh[] }>();
  root.traverse((object) => {
    const mesh = object as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean };
    if (mesh.isMesh !== true || mesh.isSkinnedMesh === true || mesh.isInstancedMesh === true) return;
    if (Array.isArray(mesh.material) || !mesh.visible) return;
    const key = `${mesh.material.uuid}|${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}`;
    const group = groups.get(key) ?? { material: mesh.material, meshes: [] };
    group.meshes.push(mesh);
    groups.set(key, group);
  });
  const made: BufferGeometry[] = [];
  for (const { material, meshes } of groups.values()) {
    if (meshes.length < 2) continue;
    // Todas con los mismos atributos y todas indexadas o ninguna: si no, se
    // deja el grupo como está en vez de inventar datos.
    const names = Object.keys(meshes[0]!.geometry.attributes).sort().join(',');
    if (meshes.some((mesh) => Object.keys(mesh.geometry.attributes).sort().join(',') !== names)) continue;
    const indexed = meshes[0]!.geometry.index !== null;
    if (meshes.some((mesh) => (mesh.geometry.index !== null) !== indexed)) continue;
    if (Object.values(meshes[0]!.geometry.morphAttributes).some((list) => (list?.length ?? 0) > 0)) continue;
    const parts = meshes.map((mesh) => {
      const part = mesh.geometry.clone();
      part.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld));
      return part;
    });
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (merged === null) continue;
    if (merged.getAttribute('normal') === undefined) merged.computeVertexNormals();
    merged.computeBoundingSphere();
    const fused = new Mesh(merged, material);
    fused.name = `${meshes[0]!.name || 'merged'}_merged`;
    fused.castShadow = meshes[0]!.castShadow;
    fused.receiveShadow = meshes[0]!.receiveShadow;
    fused.userData = { ...meshes[0]!.userData };
    for (const mesh of meshes) mesh.removeFromParent();
    root.add(fused);
    made.push(merged);
  }
  return made;
}

/**
 * Un lote de muchos modelos estáticos: todas sus mallas visibles, fundidas por
 * material y sombras en el espacio de `into`. Los modelos no se tocan; quien
 * llama los esconde y suelta el lote cuando haya que rehacerlo.
 */
export function batchStatic(models: readonly Object3D[], into: Object3D): { group: Object3D; geometries: BufferGeometry[] } {
  into.updateMatrixWorld(true);
  const toInto = new Matrix4().copy(into.matrixWorld).invert();
  const groups = new Map<string, { material: Material; cast: boolean; receive: boolean; parts: BufferGeometry[] }>();
  for (const model of models) {
    model.updateMatrixWorld(true);
    model.traverseVisible((object) => {
      const mesh = object as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean };
      if (mesh.isMesh !== true || mesh.isSkinnedMesh === true || mesh.isInstancedMesh === true) return;
      if (Array.isArray(mesh.material)) return;
      const key = `${mesh.material.uuid}|${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}`;
      const names = Object.keys(mesh.geometry.attributes).sort().join(',') + (mesh.geometry.index === null ? '|n' : '|i');
      // Una forma de geometría distinta dentro del mismo material abre su propio grupo.
      const full = `${key}|${names}`;
      const group = groups.get(full) ?? { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, parts: [] };
      const part = mesh.geometry.clone();
      part.applyMatrix4(new Matrix4().multiplyMatrices(toInto, mesh.matrixWorld));
      group.parts.push(part);
      groups.set(full, group);
    });
  }
  const group = new Group();
  group.name = 'StaticBatch';
  const geometries: BufferGeometry[] = [];
  for (const { material, cast, receive, parts } of groups.values()) {
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (merged === null) continue;
    merged.computeBoundingSphere();
    const mesh = new Mesh(merged, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    group.add(mesh);
    geometries.push(merged);
  }
  into.add(group);
  return { group, geometries };
}

/** Para las pruebas: cuántas mallas dibujables quedan debajo de `root`. */
export function meshCount(root: Object3D): number {
  let count = 0;
  root.traverse((object) => { if ((object as Mesh).isMesh === true && object.visible) count += 1; });
  return count;
}

