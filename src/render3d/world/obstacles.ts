import { visibleBuildings } from '@derive/visible-buildings';
// IA-10 · La navegación recibe los mismos objetos y transformaciones que se pintan.
import { Box3, Matrix4, Mesh, Quaternion, Vector3, type Object3D } from 'three';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { terrainOf } from '../life/terrain';
import { indexSolids, type Solid, type Terrain } from '../life/body';
import { steadingOf } from './steading';
import { builtCells, scatterTransform } from './forest';
import { defenceGates } from '@derive/defence-gates';

/** Recorta triángulos a la banda del cuerpo: sin copas, tejados ni suelo.
 * Une cajas que se tocan, pero conserva separadas las distintas lápidas. */
export function groundFootprints(source: Object3D): Box3[] {
  const boxes: Box3[] = [];
  source.updateMatrixWorld(true);
  source.traverse(node => {
    if (!(node instanceof Mesh)) return;
    const position = node.geometry.getAttribute('position'), indices = node.geometry.index;
    for (let i = 0; i < (indices?.count ?? position.count); i += 3) {
      let polygon = [0, 1, 2].map(offset => new Vector3().fromBufferAttribute(position,
        indices?.getX(i + offset) ?? i + offset).applyMatrix4(node.matrixWorld));
      if (Math.max(...polygon.map(v => v.y)) <= 0.1 || Math.min(...polygon.map(v => v.y)) >= 0.6) continue;
      for (const [level, sign] of [[0.1, -1], [0.6, 1]] as const) {
        const next: Vector3[] = [];
        for (let j = 0; j < polygon.length; j++) {
          const a = polygon[j]!, b = polygon[(j + 1) % polygon.length]!;
          const da = (a.y - level) * sign, db = (b.y - level) * sign;
          if (da <= 0) next.push(a);
          if ((da <= 0) !== (db <= 0)) next.push(a.clone().lerp(b, da / (da - db)));
        }
        polygon = next;
      }
      if (polygon.length === 0) continue;
      const box = new Box3().setFromPoints(polygon); box.min.y = 0; box.max.y = 1;
      // Se repite al crecer la unión para no depender del orden de triángulos.
      for (let j = boxes.length - 1; j >= 0; j--) if (box.intersectsBox(boxes[j]!)) {
        box.union(boxes[j]!); boxes.splice(j, 1); j = boxes.length;
      }
      boxes.push(box);
    }
  });
  return boxes;
}

/** Rejilla conservadora: se reserva toda celda que toca un sólido grande.
 * No incluye tejados ni copas de árboles. Se calcula una vez por cambio de mapa. */
export function solidTerrain(state: GameState, source: (id: string) => Object3D | undefined): Terrain {
  const land = terrainOf(state);
  const solids: Solid[] = [];
  const add = (box: Box3): void => { solids.push({ minX: box.min.x, minZ: box.min.z, maxX: box.max.x, maxZ: box.max.z }); };
  const block = (box: Box3): void => {
    for (let z = Math.max(0, Math.floor(box.min.z)); z < Math.min(land.height, Math.ceil(box.max.z)); z += 1) {
      for (let x = Math.max(0, Math.floor(box.min.x)); x < Math.min(land.width, Math.ceil(box.max.x)); x += 1) {
        land.blocked[z * land.width + x] = 1;
      }
    }
  };
  for (const object of steadingOf(state, state.terrainSeed)) {
    const model = source(object.asset);
    if (model === undefined) continue;
    const matrix = new Matrix4().compose(
      new Vector3(object.cell % land.width + 0.5, 0, Math.floor(object.cell / land.width) + 0.5),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), object.facing), new Vector3(1, 1, 1));
    block(new Box3().setFromObject(model).applyMatrix4(matrix));
  }
  for (const building of visibleBuildings(state)) {
    if (building.kind === 'grave_yard' && building.lostTick === null) {
      const model = source('grave-yard');
      if (model !== undefined) for (const box of groundFootprints(model)) add(box.translate(new Vector3(building.x, 0, building.y + building.h)));
    }
    if (building.kind !== 'well' && building.lostTick === null) continue;
    if (building.kind === 'field') continue;
    block(new Box3(new Vector3(building.x, 0, building.y),
      new Vector3(building.x + building.w, 1, building.y + building.h)));
  }
  const tree = source('tree');
  const taken = builtCells(state);
  if (tree !== undefined) {
    const trunks = groundFootprints(tree);
    for (let cell = 0; cell < state.map.terrain.length; cell++) {
      if (state.map.terrain[cell] !== TERRAIN_CODE.forest || taken.has(cell)) continue;
      const { x, z, scale, facing } = scatterTransform(land.width, cell);
      const matrix = new Matrix4().compose(new Vector3(x, 0, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), facing), new Vector3(scale, scale, scale));
      for (const trunk of trunks) add(trunk.clone().applyMatrix4(matrix));
    }
  }
  const gates = defenceGates(state);
  for (const b of state.buildings) {
    const axis = gates.get(b.id);
    if (axis === undefined) continue;
    for (const side of [0, 0.92]) {
      if (axis === 'z') solids.push({ minX: b.x + side, maxX: b.x + side + 0.08, minZ: b.y + 0.3, maxZ: b.y + 0.9 });
      else solids.push({ minX: b.x + 0.3, maxX: b.x + 0.9, minZ: b.y + side, maxZ: b.y + side + 0.08 });
    }
  }
  return { ...land, solids: indexSolids(land.width, land.height, solids) };
}
