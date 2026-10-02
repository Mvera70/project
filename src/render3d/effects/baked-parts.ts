// v5.100 · Las piezas de un modelo, horneadas para instanciar.
//
// La cigüeña, la grulla y la mariposa se dibujan con mallas instanciadas
// (`seasonal-fauna.ts`, `ambience.ts`): pocas, muchas copias y sin esqueleto.
// Sus GLB vienen del mismo camino que los demás animales (`build-models.py`):
// piezas con un material de color cada una, colgadas de nodos vacíos que hacen
// de articulación —y, si el modelo trae clips, el cargador ya las ha vuelto una
// malla con esqueleto (`skinRigidBody`, `assets.ts`)—. Aquí se parten de nuevo
// por articulación: cada parte es **una geometría con el color en el vértice**,
// con el origen en su articulación, para que gire sobre ella (el cuello que
// pica, la pata que da el paso, el ala en el hombro) con una sola llamada de
// dibujo por parte, como el cuerpo fundido de cualquier animal.

import { BufferAttribute, BufferGeometry, Color, Matrix3, Matrix4, Mesh, SkinnedMesh, Vector3, type MeshStandardMaterial, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface BakedPart {
  /** Posición, normal y color, con el origen en la articulación. */
  readonly geometry: BufferGeometry;
  /** Dónde está la articulación respecto a la raíz del modelo. */
  readonly pivot: Vector3;
}

/**
 * Parte `model` por las articulaciones `joints` (nombres de nodo). Cada vértice
 * va a la articulación listada más cercana entre sus antepasados; lo que no
 * cuelga de ninguna va a `rest`, con el origen en la raíz. Las articulaciones
 * no pueden estar giradas (las de `build-models.py` no lo están).
 */
export function bakeParts(model: Object3D, joints: readonly string[], rest = 'body'): Record<string, BakedPart> {
  model.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(model.matrixWorld).invert();
  const pivots = new Map<string, Vector3>();
  for (const name of joints) {
    const node = model.getObjectByName(name);
    if (node === undefined) continue;
    pivots.set(name, new Vector3().setFromMatrixPosition(new Matrix4().multiplyMatrices(toRoot, node.matrixWorld)));
  }
  const ownerOf = (node: Object3D | null): string => {
    for (let at = node; at !== null && at !== model; at = at.parent) if (pivots.has(at.name)) return at.name;
    return rest;
  };
  const pieces = new Map<string, BufferGeometry[]>();
  const add = (owner: string, geometry: BufferGeometry): void => {
    const list = pieces.get(owner);
    if (list === undefined) pieces.set(owner, [geometry]);
    else list.push(geometry);
  };
  model.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const material = (Array.isArray(node.material) ? node.material[0] : node.material) as MeshStandardMaterial;
    const source = node.geometry.index === null ? node.geometry : node.geometry.toNonIndexed();
    if (node instanceof SkinnedMesh) {
      // Ya fundido por el cargador: el color viene en el vértice y el hueso
      // de cada vértice dice de qué pieza era.
      const bones = node.skeleton.bones;
      const index = source.getAttribute('skinIndex');
      const byOwner = new Map<string, number[]>();
      for (let v = 0; v < index.count; v += 3) {
        const owner = ownerOf(bones[index.getX(v)] ?? null);
        const list = byOwner.get(owner) ?? [];
        list.push(v, v + 1, v + 2);
        byOwner.set(owner, list);
      }
      const bind = new Matrix4().multiplyMatrices(toRoot, node.matrixWorld);
      for (const [owner, vertices] of byOwner) add(owner, pick(source, vertices, bind, null));
      return;
    }
    const all = Array.from({ length: source.getAttribute('position').count }, (_, n) => n);
    add(ownerOf(node), pick(source, all, new Matrix4().multiplyMatrices(toRoot, node.matrixWorld), material.color ?? new Color(1, 1, 1)));
  });
  const out: Record<string, BakedPart> = {};
  for (const [owner, list] of pieces) {
    const geometry = mergeGeometries(list, false)!;
    for (const piece of list) piece.dispose();
    const pivot = pivots.get(owner) ?? new Vector3();
    geometry.translate(-pivot.x, -pivot.y, -pivot.z);
    out[owner] = { geometry, pivot };
  }
  return out;
}

/** Los vértices `vertices` de `source`, llevados a la raíz, con su color. */
function pick(source: BufferGeometry, vertices: readonly number[], matrix: Matrix4, colour: Color | null): BufferGeometry {
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const painted = source.getAttribute('color');
  const p = new Float32Array(vertices.length * 3);
  const n = new Float32Array(vertices.length * 3);
  const c = new Float32Array(vertices.length * 3);
  const at = new Vector3();
  const normals = new Matrix3().getNormalMatrix(matrix);
  vertices.forEach((v, k) => {
    at.fromBufferAttribute(position, v).applyMatrix4(matrix);
    p.set([at.x, at.y, at.z], k * 3);
    at.fromBufferAttribute(normal, v).applyNormalMatrix(normals);
    n.set([at.x, at.y, at.z], k * 3);
    if (colour !== null) c.set([colour.r, colour.g, colour.b], k * 3);
    else c.set([painted.getX(v), painted.getY(v), painted.getZ(v)], k * 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(p, 3));
  geometry.setAttribute('normal', new BufferAttribute(n, 3));
  geometry.setAttribute('color', new BufferAttribute(c, 3));
  return geometry;
}
