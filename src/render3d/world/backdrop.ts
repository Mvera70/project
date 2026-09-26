// El paisaje de fuera del mapa: bosque, cauce y suelo lejano. Es decorado;
// ninguna de estas piezas entra en el motor ni altera una celda jugable.
import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedMesh,
  Matrix4, Mesh, MeshStandardMaterial, PlaneGeometry, Quaternion, Vector3,
  type Material, type Object3D,
} from 'three';
import type { ValleyMap } from '@engine/state';
import type { Palette } from '@derive/palette';
import { hash32 } from '@engine/rng';
import { GROUND_BIAS } from '../visual-config';
import { piecesOf, tintFoliage } from './forest';
import { buildRidge, exteriorWaterAt, ridgeAt, seasonRidge, SKIRT } from './ridge';
import { buildCairns, buildCrags, buildMountainSkin, MOUNTAIN_PEAK, placeCrags } from './mountains';
import { valleyAxis } from './valley-profile';
import { elevationAt } from './ground';
import { TERRAIN_CODE } from '@engine/state';
import { riverExtensionAt, riverSection } from './river-extension';

export interface Backdrop {
  readonly group: Group;
  readonly ridge: Mesh;
  readonly treeCount: number;
  /** La nieve de las cumbres baja con el invierno (`snowCover`, de 0 a 1). */
  season(palette: Palette, snow?: number): void;
  light(daylight: number): void;
  dispose(): void;
}

/**
 * Hasta dónde suben los pinos de fuera, y cuántos como mucho. TUNE visual: 30
 * celdas y 560 pinos (antes 13 y 256), mirando la sierra en panorámica: con
 * menos, la ladera seguía viéndose vacía. Son instancias: el coste es el de los
 * vértices del pino por el número, no una llamada de dibujo cada uno.
 */
const PINE_BAND = 30;
const PINES = 560;

function random(seed: number, x: number, z: number, salt: number): number {
  return hash32(seed, `backdrop:${x}:${z}:${salt}`) / 4_294_967_296;
}

/** Árboles fuera del rectángulo: una sola instancia por pieza del modelo. */
function outerTrees(map: ValleyMap, seed: number, source: Object3D, palette: Palette): {
  group: Group; count: number; season(palette: Palette): void; light(daylight: number): void; dispose(): void;
} {
  const group = new Group();
  group.name = 'Valley_Backdrop_Forest';
  const places: { x: number; y: number; z: number; size: number; turn: number }[] = [];
  const band = PINE_BAND;
  for (let z = -band; z < map.height + band; z += 1) {
    for (let x = -band; x < map.width + band; x += 1) {
      const px = x + 0.5;
      const pz = z + 0.5;
      const out = Math.hypot(Math.max(0, -px, px - map.width), Math.max(0, -pz, pz - map.height));
      // Árboles al pie y a media ladera, en grupos, y nunca en lo alto ni en
      // la pared: la roca y la nieve tienen que verse. Desde el 26 sep 2026
      // suben hasta `PINE_BAND` celdas (antes 13), porque la sierra de fuera
      // era una masa lisa sin nada que diera escala.
      if (out < 1.5 || out > PINE_BAND) continue;
      if (riverExtensionAt(map, seed, px, pz, 1.6)) continue;
      const here = ridgeAt(map, seed, px, pz);
      if (here > MOUNTAIN_PEAK * 0.5) continue;
      const steep = Math.hypot(ridgeAt(map, seed, px + 0.5, pz) - ridgeAt(map, seed, px - 0.5, pz),
        ridgeAt(map, seed, px, pz + 0.5) - ridgeAt(map, seed, px, pz - 0.5));
      if (steep > 1.2) continue;
      const grove = random(seed, Math.floor(x / 8), Math.floor(z / 8), 6);
      const density = (grove > 0.55 ? 0.18 : 0.018) * (out > 13 ? 0.6 : 1);
      if (random(seed, x, z, 1) >= density) continue;
      const atX = px + (random(seed, x, z, 2) - 0.5) * 0.58;
      const atZ = pz + (random(seed, x, z, 3) - 0.5) * 0.58;
      places.push({
        x: atX, z: atZ,
        y: ridgeAt(map, seed, atX, atZ),
        size: 0.76 + random(seed, x, z, 4) * 0.54,
        turn: random(seed, x, z, 5) * Math.PI * 2,
      });
    }
  }
  // Límite absoluto de decorado, independiente del tamaño del mapa. Orden
  // estable para repartir los grupos por ambos lados en vez de cortar una fila.
  places.sort((a, b) => random(seed, Math.floor(a.x), Math.floor(a.z), 9) - random(seed, Math.floor(b.x), Math.floor(b.z), 9));
  places.splice(PINES);
  const meshes: InstancedMesh[] = [];
  const materials: Material[] = [];
  const matrix = new Matrix4();
  const position = new Vector3();
  const turn = new Quaternion();
  const scale = new Vector3();
  const up = new Vector3(0, 1, 0);
  for (const piece of piecesOf(source)) {
    const material = piece.material.clone();
    tintFoliage(material, palette);
    if (piece.material.name.includes('leaf') && 'emissive' in material) {
      const leaf = material as MeshStandardMaterial;
      leaf.emissive.set(palette.forestDark);
      leaf.emissiveIntensity = 0;
    }
    materials.push(material);
    const mesh = new InstancedMesh(piece.geometry, material, places.length);
    mesh.name = `Backdrop_${piece.material.name}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    for (let index = 0; index < places.length; index += 1) {
      const at = places[index]!;
      position.set(at.x, at.y, at.z);
      turn.setFromAxisAngle(up, at.turn);
      scale.setScalar(at.size);
      matrix.compose(position, turn, scale);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    meshes.push(mesh);
    group.add(mesh);
  }
  return {
    group, count: places.length,
    season(next): void {
      for (const material of materials) {
        tintFoliage(material, next);
        if (material.name.includes('leaf') && 'emissive' in material) {
          (material as MeshStandardMaterial).emissive.set(next.forestDark);
        }
      }
    },
    light(): void {
      for (const material of materials) {
        if (material.name.includes('leaf') && 'emissive' in material) {
          (material as MeshStandardMaterial).emissiveIntensity = 0;
        }
      }
    },
    dispose(): void {
      for (const mesh of meshes) { mesh.dispose(); mesh.geometry.dispose(); }
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}

/** Dos cintas continuas desde las salidas del río, sin celdas cuadradas. */
function outerWater(map: ValleyMap, seed: number, palette: Palette): Mesh | null {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const north of [true, false]) {
    let previous = -1;
    for (let distance = 0; distance <= SKIRT - 4; distance += 1) {
      const z = north ? -distance : map.height + distance;
      const section = riverSection(map, seed, z);
      if (section === null) continue;
      const at = positions.length / 3;
      positions.push(
        section.left, GROUND_BIAS - 0.10, z,
        section.right, GROUND_BIAS - 0.10, z,
      );
      if (previous >= 0) indices.push(previous, at, previous + 1, previous + 1, at, at + 1);
      previous = at;
    }
  }
  if (indices.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({
    color: palette.water, roughness: 0.18, metalness: 0.1,
    transparent: true, opacity: 0.86, side: DoubleSide, depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Backdrop_Water';
  mesh.receiveShadow = false;
  return mesh;
}

/** Cuántos peñascos, dentro del cinturón del mapa y en la sierra de fuera. TUNE visual. */
const CRAGS_INSIDE = 260;
const CRAGS_OUTSIDE = 700;

export function buildBackdrop(map: ValleyMap, seed: number, palette: Palette, tree?: Object3D, snow = 0): Backdrop {
  const group = new Group();
  group.name = 'Valley_Backdrop';
  const distantColour = (next: Palette): Color => new Color(next.stone).lerp(new Color(next.meadowAlt), 0.18);
  const ground = new Mesh(new PlaneGeometry(800, 800), new MeshStandardMaterial({
    color: distantColour(palette), roughness: 1, metalness: 0, side: DoubleSide,
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(map.width / 2, -0.28, map.height / 2);
  ground.name = 'Valley_Backdrop_Ground';
  ground.receiveShadow = false;
  group.add(ground);
  const ridge = buildRidge(map, seed, palette, snow);
  group.add(ridge);
  // La piel facetada del cinturón de montaña del propio mapa, y los peñascos
  // de dentro y de fuera (`mountains.ts`).
  const skin = buildMountainSkin(map, palette, snow);
  if (skin !== null) group.add(skin.mesh);
  const inside = placeCrags(seed, { x0: 0.5, x1: map.width, z0: 0.5, z1: map.height }, 1,
    (x, z) => elevationAt(map, x, z),
    (x, z) => map.terrain[Math.floor(z) * map.width + Math.floor(x)] !== TERRAIN_CODE.mountain, CRAGS_INSIDE);
  const outside = placeCrags(seed + 1, { x0: -40, x1: map.width + 40, z0: -40, z1: map.height + 40 }, 1.6,
    (x, z) => ridgeAt(map, seed, x, z),
    (x, z) => (x > 0 && x < map.width && z > 0 && z < map.height) || exteriorWaterAt(map, seed, x, z, 2.2), CRAGS_OUTSIDE);
  const crags = buildCrags([...inside, ...outside], palette);
  group.add(crags.group);
  const cairns = buildCairns(map, palette, (x, z) => ridgeAt(map, seed, x, z),
    (x, z) => exteriorWaterAt(map, seed, x, z, 1.8), (z) => valleyAxis(map, Math.max(0, Math.min(map.height - 1, z))));
  group.add(cairns);
  const water = outerWater(map, seed, palette);
  if (water !== null) group.add(water);
  const forest = tree === undefined ? null : outerTrees(map, seed, tree, palette);
  if (forest !== null) group.add(forest.group);
  return {
    group, ridge, treeCount: forest?.count ?? 0,
    season(next, cover = 0): void {
      (ground.material as MeshStandardMaterial).color.copy(distantColour(next));
      seasonRidge(ridge, map, next, cover);
      skin?.season(next, cover);
      crags.season(next);
      if (water !== null) (water.material as MeshStandardMaterial).color.set(next.water);
      forest?.season(next);
    },
    light(daylight): void {
      forest?.light(daylight);
    },
    dispose(): void {
      forest?.dispose();
      skin?.dispose();
      crags.dispose();
      (cairns.userData.dispose as () => void)();
      ridge.geometry.dispose();
      const ridgeMaterial = ridge.material as MeshStandardMaterial;
      ridgeMaterial.map?.dispose();
      ridgeMaterial.dispose();
      if (water !== null) { water.geometry.dispose(); (water.material as Material).dispose(); }
      ground.geometry.dispose();
      (ground.material as Material).dispose();
      group.clear();
    },
  };
}
