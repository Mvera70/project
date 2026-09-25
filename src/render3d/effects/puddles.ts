// El valle más vivo (25 sep 2026) · Charcos después de la lluvia.
//
// Pedido por Vera con la niebla del alba («niebla y charcos»). Cuando llueve,
// los caminos gastados y la plaza se llenan de charcos que reflejan el cielo; el
// día siguiente se van secando, y a la tarde ya no queda ninguno. Salen de los
// caminos que la aldea ha pisado (`map.path`), que es donde se encharca el
// barro: un prado sin pisar no hace charco. Decorado: no toca el estado ni tira
// dados; los sitios salen de un hash de la celda.

import {
  CircleGeometry, Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshStandardMaterial,
  Quaternion, Vector3,
} from 'three';
import { hash32 } from '@engine/rng';
import type { ValleyMap } from '@engine/state';
import type { SkyKind } from '../../derive/weather';

/** TUNE: cuántos charcos como mucho. Bastan para que el camino se lea mojado. */
const PUDDLES = 70;
/**
 * De cada mil celdas, cuántas hacen charco: en el camino gastado, más; en el
 * suelo sólo pisado (`map.traffic`) y en la tierra de la plaza, menos. TUNE:
 * medido en las semillas 7, 23 y 41, al año 10 hay de 23 a 40 celdas de camino
 * y de 88 a 133 pisadas; sólo con el camino salían tres charcos en un valle.
 */
const SHARE_PATH = 600;
const SHARE_TRAFFIC = 220;
const SHARE_PLAZA = 450;
const PLAZA_RADIUS = 3.5;

/**
 * Lo mojado que está el suelo, de 0 a 1: lloviendo, del todo; el día después
 * de llover, se seca a lo largo de la mañana y a media tarde ya no queda nada.
 */
export function wetnessAt(today: SkyKind, yesterday: SkyKind, phase: number): number {
  if (today === 'rain' || today === 'storm') return 1;
  if (yesterday === 'rain' || yesterday === 'storm') return Math.max(0, 1 - phase / 0.6);
  return 0;
}

export interface Puddles {
  readonly group: Group;
  /** Cuántos se ven ahora (para la traza y las pruebas). */
  readonly shown: number;
  step(wetness: number, ground: (x: number, z: number) => number): void;
  dispose(): void;
}

export function createPuddles(map: ValleyMap, plaza: { x: number; y: number }): Puddles {
  const group = new Group();
  group.name = 'Valley_Puddles';
  const spots: { x: number; z: number; size: number; turn: number }[] = [];
  for (let cell = 0; cell < map.terrain.length && spots.length < PUDDLES; cell += 1) {
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    const share = (map.path[cell] ?? 0) > 0 ? SHARE_PATH
      : Math.hypot(x - plaza.x, z - plaza.y) <= PLAZA_RADIUS ? SHARE_PLAZA
        : (map.traffic[cell] ?? 0) > 0 ? SHARE_TRAFFIC : 0;
    if (hash32(cell, 'puddle') % 1000 >= share) continue;
    spots.push({
      x: cell % map.width + 0.2 + (hash32(cell, 'puddle:x') % 600) / 1000,
      z: Math.floor(cell / map.width) + 0.2 + (hash32(cell, 'puddle:z') % 600) / 1000,
      size: 0.14 + (hash32(cell, 'puddle:size') % 240) / 1000,
      turn: (hash32(cell, 'puddle:turn') % 628) / 100,
    });
  }
  const geometry = new CircleGeometry(1, 12);
  geometry.rotateX(-Math.PI / 2);
  // Agua quieta sobre barro: gris del cielo y lisa, para que coja el brillo.
  // **Sin metal**: la primera toma lo llevaba a 0,6 y, sin mapa de entorno que
  // reflejar, cada charco salía negro como una mancha de tinta.
  const material = new MeshStandardMaterial({
    color: new Color('#8d9ba4'), roughness: 0.18, metalness: 0,
    transparent: true, opacity: 0, depthWrite: false,
  });
  const mesh = new InstancedMesh(geometry, material, Math.max(1, spots.length));
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  group.add(mesh);
  const matrix = new Matrix4();
  const at = new Vector3();
  const size = new Vector3();
  const turn = new Quaternion();
  const up = new Vector3(0, 1, 0);
  let placed = false;
  let shown = 0;

  return {
    group,
    get shown() { return shown; },
    step(wetness, ground): void {
      if (!placed) {
        placed = true;
        spots.forEach((spot, n) => {
          at.set(spot.x, ground(spot.x, spot.z) + 0.012, spot.z);
          size.set(spot.size, 1, spot.size * 0.7);
          turn.setFromAxisAngle(up, spot.turn);
          matrix.compose(at, turn, size);
          mesh.setMatrixAt(n, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
      // Al secarse se aclaran hasta desaparecer.
      mesh.count = wetness <= 0.02 ? 0 : spots.length;
      shown = mesh.count;
      material.opacity = 0.55 * Math.min(1, wetness * 1.2);
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
