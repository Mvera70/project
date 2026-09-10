// G-06 · Buildings, added and removed one at a time. design.md D.6, D.8.
//
// Placeholder geometry on purpose. The catalogue only holds a villager and two
// study corners; the house, the field and the tree are G-10's work. Until then
// a building is a box with a roof, sized and coloured from `visual-config`, so
// that a real game produces a real village and the scale can be judged against
// the villager who now stands 0.65 cells high.
//
// D.8 says as much in order: a minimum coherent set first, variants last. What
// this must not do is wait for the catalogue, because the thing that has to be
// judged — whether a valley of these proportions reads from above — does not
// need the final art to be judged wrong.

import {
  BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, type Object3D,
} from 'three';
import type { BuildingId } from '@engine/state';
import type { PlannedBuilding } from './plan';

/**
 * A four-sided pyramid over a `w × h` footprint, `rise` tall.
 *
 * Written out rather than taken from `ConeGeometry` because a cone with four
 * segments is square in plan but not rectangular: a two-by-three barn would get
 * a roof that did not sit on its walls.
 */
function roofGeometry(w: number, h: number, rise: number): BufferGeometry {
  const positions = new Float32Array([
    // Four eaves and one ridge point, as four triangles.
    0, 0, 0, w, 0, 0, w / 2, rise, h / 2,
    w, 0, 0, w, 0, h, w / 2, rise, h / 2,
    w, 0, h, 0, 0, h, w / 2, rise, h / 2,
    0, 0, h, 0, 0, 0, w / 2, rise, h / 2,
  ]);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export interface BuildingModel {
  readonly object: Object3D;
  dispose(): void;
}

export function buildBuilding(planned: PlannedBuilding): BuildingModel {
  const group = new Group();
  group.name = `Building_${planned.id}`;
  // The engine's corner is the building's corner (D.4), so the group sits there
  // and the geometry is laid out over the footprint from it.
  group.position.set(planned.x, 0, planned.z);
  group.userData.buildingId = planned.id;

  const owned: Array<{ dispose(): void }> = [];

  const wallGeometry = new BoxGeometry(planned.w, planned.walls, planned.h);
  const wallMaterial = new MeshStandardMaterial({ color: planned.wallColour, roughness: 0.95 });
  const walls = new Mesh(wallGeometry, wallMaterial);
  walls.position.set(planned.w / 2, planned.walls / 2, planned.h / 2);
  walls.castShadow = true;
  walls.receiveShadow = true;
  walls.userData.buildingId = planned.id;
  group.add(walls);
  owned.push(wallGeometry, wallMaterial);

  if (planned.roofed && planned.roof > 0) {
    const geometry = roofGeometry(planned.w, planned.h, planned.roof);
    const material = new MeshStandardMaterial({ color: planned.roofColour, roughness: 0.9 });
    const roof = new Mesh(geometry, material);
    roof.position.set(0, planned.walls, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.buildingId = planned.id;
    group.add(roof);
    owned.push(geometry, material);
  }

  return {
    object: group,
    dispose(): void {
      for (const thing of owned) thing.dispose();
    },
  };
}

/**
 * The village, kept in step with the plan one building at a time.
 *
 * Nothing here rebuilds the whole village. A house that burns down becomes a
 * ruin by having its own model replaced, and its neighbours are not touched.
 */
export class Village {
  readonly group = new Group();
  private readonly models = new Map<BuildingId, BuildingModel>();

  constructor() {
    this.group.name = 'Valley_Buildings';
  }

  add(planned: PlannedBuilding): void {
    this.remove(planned.id);
    const model = buildBuilding(planned);
    this.models.set(planned.id, model);
    this.group.add(model.object);
  }

  remove(id: BuildingId): void {
    const model = this.models.get(id);
    if (model === undefined) return;
    this.group.remove(model.object);
    model.dispose();
    this.models.delete(id);
  }

  clear(): void {
    for (const id of [...this.models.keys()]) this.remove(id);
  }

  get count(): number {
    return this.models.size;
  }

  dispose(): void {
    this.clear();
  }
}
