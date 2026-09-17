import { Box3, BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, Vector3, type Material, type Object3D } from 'three';
import type { Building } from '@engine/state';
import type { BuildingModel } from './buildings';
import type { PlannedBuilding } from './plan';

// Norte, este, sur y oeste en las coordenadas de la partida.
export const DEFENCE_DIRECTIONS = [
  { bit: 1, x: 0, z: -1 }, { bit: 2, x: 1, z: 0 },
  { bit: 4, x: 0, z: 1 }, { bit: 8, x: -1, z: 0 },
] as const;

export function isDefence(building: Pick<Building, 'kind' | 'lostTick'>): boolean {
  return building.lostTick === null && (building.kind === 'wall' || building.kind === 'palisade');
}

/** Las ruinas y los vecinos diagonales no cierran una unión. Madera y piedra sí. */
export function defenceConnections(buildings: readonly Building[]): ReadonlyMap<number, number> {
  const standing = buildings.filter(isDefence);
  const occupied = new Set(standing.map((b) => `${b.x},${b.y}`));
  return new Map(standing.map((b) => [b.id, DEFENCE_DIRECTIONS.reduce((mask, d) =>
    occupied.has(`${b.x + d.x},${b.y + d.z}`) ? mask | d.bit : mask, 0)]));
}

/** Compone el tramo de catálogo alrededor del centro de su celda, nunca de una esquina. */
export function buildDefence(planned: PlannedBuilding, source: Object3D): BuildingModel {
  const group = new Group();
  group.name = `Building_${planned.id}`;
  group.position.set(planned.x, 0, planned.z);
  const bounds = new Box3().setFromObject(source);
  const size = bounds.getSize(new Vector3());
  const centre = bounds.getCenter(new Vector3());
  const thickness = planned.kind === 'wall' ? 0.34 : 0.18;
  const owned: BufferGeometry[] = [];
  const mask = planned.connections ?? 0;

  function segment(length: number, x: number, z: number, angle: number): void {
    if (length < 1) {
      // Recortar, no aplastar: las almenas y las estacas mantienen su anchura.
      const turn = new Group();
      source.updateMatrixWorld(true);
      source.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        const matrix = new Matrix4().makeScale(1 / size.x, 1, thickness / size.z)
          .multiply(new Matrix4().makeTranslation(-centre.x, -bounds.min.y, -centre.z))
          .multiply(node.matrixWorld);
        const geometry = clippedStrip(node.geometry, matrix, length);
        owned.push(geometry);
        turn.add(new Mesh(geometry, node.material));
      });
      turn.rotation.y = angle;
      turn.position.set(x, 0, z);
      group.add(turn);
      return;
    }
    const piece = source.clone(true);
    const offset = new Group();
    offset.add(piece);
    offset.position.set(-centre.x, -bounds.min.y, -centre.z);
    const scaled = new Group();
    scaled.add(offset);
    scaled.scale.set(length / size.x, 1, thickness / size.z);
    const turn = new Group();
    turn.add(scaled);
    turn.rotation.y = angle;
    turn.position.set(x, 0, z);
    group.add(turn);
  }

  if (planned.gate !== undefined) {
    // Paso libre de 0.84 celdas: permite el disco de la vaca (radio 0.4).
    // Los postes y hojas abiertas se dibujan fuera de ese gálibo.
    const portal = new Group(); portal.name = 'OpenGate';
    portal.position.set(0.5, 0, 0.5);
    portal.rotation.y = planned.gate === 'x' ? Math.PI / 2 : 0;
    let material: Material | Material[] | undefined;
    source.traverse(node => { if (node instanceof Mesh && material === undefined) material = node.material; });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number): void => {
      const geometry = new BoxGeometry(w, h, d); owned.push(geometry);
      const mesh = new Mesh(geometry, material); mesh.position.set(x, y, z); portal.add(mesh);
    };
    for (const side of [-1, 1]) {
      box(0.08, size.y * 1.18, thickness, side * 0.46, size.y * 0.59, 0);
      box(0.06, size.y * 0.7, 0.38, side * 0.46, size.y * 0.35, 0.19);
    }
    box(1, 0.12, thickness, 0, size.y * 1.18, 0);
    group.add(portal);
  } else if (mask === 0 || mask === 10 || mask === 5) {
    segment(1, 0.5, 0.5, mask === 5 ? Math.PI / 2 : 0);
  } else {
    // Un núcleo cuadrado común evita huecos y superficies superpuestas en L/T/+.
    let material: Material | Material[] | undefined;
    source.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      if (material === undefined) material = node.material;
      const candidates = Array.isArray(node.material) ? node.material : [node.material];
      const face = candidates.find((m) => m.name.includes(planned.kind === 'wall' ? 'stone' : 'wood'));
      if (face !== undefined) material = face;
    });
    const height = size.y;
    const geometry = new BoxGeometry(thickness, height, thickness);
    owned.push(geometry);
    const hub = new Mesh(geometry, material);
    hub.position.set(0.5, height / 2, 0.5);
    group.add(hub);
    const length = (1 - thickness) / 2;
    const distance = (1 + thickness) / 4;
    for (const d of DEFENCE_DIRECTIONS) {
      if ((mask & d.bit) === 0) continue;
      segment(length, 0.5 + d.x * distance, 0.5 + d.z * distance,
        d.x === 0 ? Math.PI / 2 : 0);
    }
  }
  group.traverse((node) => {
    node.userData.buildingId = planned.id;
    if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; }
  });
  return {
    object: group,
    weather(): void { /* Estas defensas no tienen tejado. */ },
    dispose(): void { owned.forEach((geometry) => geometry.dispose()); group.clear(); },
  };
}

/** Recorte de triángulos en dos planos, para los brazos cortos de L/T/+. */
function clippedStrip(source: BufferGeometry, matrix: Matrix4, length: number): BufferGeometry {
  const flat = source.index === null ? source.clone() : source.toNonIndexed();
  flat.applyMatrix4(matrix);
  const position = flat.getAttribute('position');
  const vertices: number[] = [];
  for (let i = 0; i < position.count; i += 3) {
    let polygon = [0, 1, 2].map((offset) => new Vector3().fromBufferAttribute(position, i + offset));
    for (const sign of [-1, 1]) {
      const result: Vector3[] = [];
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j]!;
        const b = polygon[(j + 1) % polygon.length]!;
        const da = sign * a.x - length / 2;
        const db = sign * b.x - length / 2;
        if (da <= 0) result.push(a);
        if ((da <= 0) !== (db <= 0)) result.push(a.clone().lerp(b, da / (da - db)));
      }
      polygon = result;
    }
    for (let j = 1; j + 1 < polygon.length; j++) {
      const a = polygon[0]!, b = polygon[j]!, c = polygon[j + 1]!;
      if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() < 1e-16) continue;
      vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    }
  }
  flat.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
