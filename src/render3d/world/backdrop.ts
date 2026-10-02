// El paisaje de fuera del mapa: bosque, cauce y suelo lejano. Es decorado;
// ninguna de estas piezas entra en el motor ni altera una celda jugable.
import {
  Box3, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedMesh,
  Matrix4, Mesh, MeshStandardMaterial, PlaneGeometry, Quaternion, Vector3,
  type Material, type Object3D,
} from 'three';
import type { ValleyMap } from '@engine/state';
import type { Palette } from '@derive/palette';
import { hash32 } from '@engine/rng';
import { GROUND_BIAS } from '../visual-config';
import { piecesOf, tintFoliage } from './forest';
import { buildRidge, exteriorWaterAt, ridgeAt, seasonRidge, SKIRT } from './ridge';
import { liveWater, SHARED_WATER } from './water-surface';
import { buildCairns, buildCrags, buildGorgeRoads, clearsGorgeRoad, gorgeRoadPaths, buildMountainSkin, MOUNTAIN_PEAK, mountainSurfaceAt, placeCrags, type RockModels } from './mountains';
import { valleyAxis } from './valley-profile';
import { FLOOD_RISE, elevationAt, floodReach, floodWaterLevelAt, waterCourseAt, waterFlowAt } from './ground';
import { TERRAIN_CODE } from '@engine/state';
import { riverExtensionAt, riverSection } from './river-extension';
import { waterfallCorridorAt, waterfallSites } from './waterfalls';
import { veilMaterial } from '../effects/mountain-veil';
import { meshSurface, type Surface } from './mesh-surface';

export interface Backdrop {
  readonly group: Group;
  readonly ridge: Mesh;
  readonly treeCount: number;
  /**
   * La cota de lo que se dibuja en un punto, en coordenadas de mundo: el suelo
   * y la piel dentro del mapa, la malla de la sierra fuera. Es donde pisa quien
   * anda por la senda de la garganta (`life/visitors.ts`).
   */
  surfaceAt(x: number, z: number): number;
  /**
   * La cota de la senda de la garganta y de sus puentes en un punto, en
   * coordenadas de mundo, o −∞ fuera de ellos: quien anda por la senda la pisa
   * a ella y no al suelo que tiene debajo.
   */
  roadAt(x: number, z: number): number;
  /** La nieve de las cumbres baja con el invierno (`snowCover`, de 0 a 1). */
  season(palette: Palette, snow?: number): void;
  light(daylight: number): void;
  /** La riada, de 0 a 1: el río de fuera del mapa sube lo mismo que el de dentro. */
  flood(level: number): void;
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
  const paths = gorgeRoadPaths(map, seed);
  const bounds = new Box3().setFromObject(source);
  const crownRadius = Math.hypot(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
    Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)));
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
      const size = 0.76 + random(seed, x, z, 4) * 0.54;
      if (!clearsGorgeRoad(paths, atX, atZ, crownRadius * size)) continue;
      places.push({
        x: atX, z: atZ,
        y: ridgeAt(map, seed, atX, atZ),
        size,
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
  const shores: number[] = [];
  const flows: number[] = [];
  const courses: number[] = [];
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
        (section.left + section.right) * 0.5, GROUND_BIAS - 0.10, z,
        section.right, GROUND_BIAS - 0.10, z,
      );
      // El centro conserva profundidad; las orillas usan el mismo gradiente
      // que el río del mapa para que la salida no cambie de material.
      shores.push(1, 0, 1);
      const flow = waterFlowAt(map, z);
      flows.push(flow.x, flow.z, flow.x, flow.z, flow.x, flow.z);
      courses.push(waterCourseAt(map, section.left, z), z,
        waterCourseAt(map, (section.left + section.right) * 0.5, z), z,
        waterCourseAt(map, section.right, z), z);
      if (previous >= 0) {
        for (let lane = 0; lane < 2; lane += 1) {
          indices.push(previous + lane, at + lane, previous + lane + 1,
            previous + lane + 1, at + lane, at + lane + 1);
        }
      }
      previous = at;
    }
  }
  if (indices.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('waterShore', new BufferAttribute(new Float32Array(shores), 1));
  geometry.setAttribute('waterFlow', new BufferAttribute(new Float32Array(flows), 2));
  geometry.setAttribute('waterCourse', new BufferAttribute(new Float32Array(courses), 2));
  geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({
    color: palette.water, roughness: 0.42, metalness: 0,
    transparent: true, opacity: 0.92, side: DoubleSide, depthWrite: false,
  });
  liveWater(material, SHARED_WATER);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Backdrop_Water';
  mesh.receiveShadow = false;
  return mesh;
}

/** Une las alas de la riada con el cauce estrecho de fuera del mapa. */
function outerFloodMouth(map: ValleyMap, seed: number, material: MeshStandardMaterial): Mesh | null {
  const reach = floodReach(map);
  const positions: number[] = [], shores: number[] = [], flows: number[] = [], courses: number[] = [];
  const indices: number[] = [];
  for (const north of [true, false]) {
    const edgeZ = north ? 0 : map.height;
    const row = north ? 0 : map.height - 1;
    const edge = riverSection(map, seed, edgeZ);
    if (edge === null) continue;
    for (const side of [-1, 1]) {
      const bank = side < 0 ? edge.left : edge.right;
      let width = 0;
      while (width < map.width) {
        const cellX = side < 0 ? bank - width - 1 : bank + width;
        if (cellX < 0 || cellX >= map.width || reach[row * map.width + cellX]! < 1) break;
        width += 1;
      }
      if (width === 0) continue;
      let previous = -1;
      for (let distance = 0; distance <= SKIRT - 4; distance += 1) {
        const z = north ? -distance : map.height + distance;
        const section = riverSection(map, seed, z)!;
        const offset = (side < 0 ? section.left : section.right) - bank;
        const start = positions.length / 3;
        for (let lane = 0; lane <= width; lane += 1) {
          const x = bank + side * lane + offset;
          const edgeY = floodWaterLevelAt(map, bank + side * lane, edgeZ, reach);
          const outerY = lane === width ? Math.min(GROUND_BIAS - 0.10,
            GROUND_BIAS + ridgeAt(map, seed, x, z) - FLOOD_RISE - 0.015) : GROUND_BIAS - 0.10;
          const t = Math.min(1, distance / 4);
          positions.push(x, edgeY + (outerY - edgeY) * t * t * (3 - 2 * t), z);
          shores.push(lane >= width - 1 ? 0.9 : 0);
          const flow = waterFlowAt(map, Math.max(0, Math.min(map.height, z)));
          flows.push(flow.x, flow.z);
          courses.push(waterCourseAt(map, x - offset, edgeZ), z);
          if (previous >= 0 && lane < width) {
            const a = previous + lane, b = start + lane;
            indices.push(a, b, a + 1, a + 1, b, b + 1);
          }
        }
        previous = start;
      }
    }
  }
  if (indices.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('waterShore', new BufferAttribute(new Float32Array(shores), 1));
  geometry.setAttribute('waterFlow', new BufferAttribute(new Float32Array(flows), 2));
  geometry.setAttribute('waterCourse', new BufferAttribute(new Float32Array(courses), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Backdrop_Flood_Mouth';
  mesh.visible = false;
  return mesh;
}

/**
 * Lo que se dibuja en cada punto, en coordenadas de mundo: dentro del mapa el
 * suelo y la piel de la montaña (`mountainSurfaceAt`, los triángulos que se
 * pintan); fuera, la malla de la sierra (`meshSurface`).
 */
function drawnSurface(map: ValleyMap, ridge: Mesh): Surface {
  const outside = meshSurface(ridge.geometry);
  return (x, z) => (x >= 0 && z >= 0 && x <= map.width && z <= map.height
    ? GROUND_BIAS + mountainSurfaceAt(map, x, z)
    : outside(x, z));
}

/** Cuántos peñascos, dentro del cinturón del mapa y en la sierra de fuera. TUNE visual. */
const CRAGS_INSIDE = 260;
const CRAGS_OUTSIDE = 700;

export function buildBackdrop(map: ValleyMap, seed: number, palette: Palette, tree?: Object3D, snow = 0, rocks?: RockModels): Backdrop {
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
  const falls = waterfallSites(map, seed, (x, z) => elevationAt(map, x, z));
  const inside = placeCrags(seed, { x0: 0.5, x1: map.width, z0: 0.5, z1: map.height }, 1,
    (x, z) => elevationAt(map, x, z),
    (x, z) => map.terrain[Math.floor(z) * map.width + Math.floor(x)] !== TERRAIN_CODE.mountain, CRAGS_INSIDE);
  const outside = placeCrags(seed + 1, { x0: -40, x1: map.width + 40, z0: -40, z1: map.height + 40 }, 1.6,
    (x, z) => ridgeAt(map, seed, x, z),
    (x, z) => (x > 0 && x < map.width && z > 0 && z < map.height) || exteriorWaterAt(map, seed, x, z, 2.2), CRAGS_OUTSIDE);
  // El cauce precede al decorado: ningún peñasco se planta atravesándolo.
  const clearInside = inside.filter(rock => !waterfallCorridorAt(falls, rock.x, rock.z, rock.size * 1.5));
  const crags = buildCrags([...clearInside, ...outside], palette, rocks?.crags);
  group.add(crags.group);
  // La montaña que tapa lo que se mira se vuelve un velo con la cámara baja
  // (`effects/mountain-veil.ts`): la sierra, la piel de dentro y los peñascos.
  veilMaterial(ridge.material as Material);
  if (skin !== null) veilMaterial(skin.mesh.material as Material);
  const cragMaterial = (crags.group.children[0] as Mesh | undefined)?.material;
  if (cragMaterial !== undefined) veilMaterial(cragMaterial as Material);
  const cairns = buildCairns(map, palette, (x, z) => ridgeAt(map, seed, x, z),
    (x, z) => exteriorWaterAt(map, seed, x, z, 1.8), (z) => valleyAxis(map, Math.max(0, Math.min(map.height - 1, z))), rocks?.cairn);
  group.add(cairns);
  // La senda se apoya en lo que se dibuja (2 oct 2026): dentro del mapa, el
  // suelo y la piel de la montaña; fuera, la malla de la sierra, que no es su
  // fórmula entre vértices. Y por la orilla de la garganta, como el camino
  // pintado del valle: con riada se moja igual que él. Fuera de la riada iba
  // por la pared, y eso era la cinta flotando de las capturas de Vera.
  const surfaceAt = drawnSurface(map, ridge);
  const roads = buildGorgeRoads(map, seed, palette, surfaceAt, (x, z) => waterfallCorridorAt(falls, x, z));
  group.add(roads.mesh, roads.bridges);
  // Lo que se pisa de la senda: la cinta y el tablero de cada puente.
  const walkways = [roads.mesh, ...roads.bridges.children.flatMap((bridge) => bridge.children
    .filter((piece): piece is Mesh => piece instanceof Mesh && piece.name === 'Valley_Gorge_Bridge_Deck'))]
    .map((mesh) => meshSurface(mesh.geometry));
  const roadAt = (x: number, z: number): number => {
    let top = Number.NEGATIVE_INFINITY;
    for (const at of walkways) top = Math.max(top, at(x, z));
    return top;
  };
  const water = outerWater(map, seed, palette);
  const floodMouth = water === null ? null : outerFloodMouth(map, seed, water.material as MeshStandardMaterial);
  if (water !== null) {
    if (floodMouth !== null) water.add(floodMouth);
    group.add(water);
  }
  const forest = tree === undefined ? null : outerTrees(map, seed, tree, palette);
  if (forest !== null) group.add(forest.group);
  return {
    group, ridge, treeCount: forest?.count ?? 0, surfaceAt, roadAt,
    season(next, cover = 0): void {
      (ground.material as MeshStandardMaterial).color.copy(distantColour(next));
      seasonRidge(ridge, map, next, cover);
      skin?.season(next, cover);
      crags.season(next);
      roads.season(next);
      if (water !== null) (water.material as MeshStandardMaterial).color.set(next.water);
      forest?.season(next);
    },
    light(daylight): void {
      forest?.light(daylight);
    },
    flood(level): void {
      // El río de fuera sube con el de dentro: si no, en la boca de la
      // garganta la lámina daba un escalón justo en el borde del mapa.
      if (water !== null) water.position.y = level * FLOOD_RISE;
      if (floodMouth !== null) floodMouth.visible = level > 0.02;
    },
    dispose(): void {
      forest?.dispose();
      skin?.dispose();
      crags.dispose();
      roads.dispose();
      (cairns.userData.dispose as () => void)();
      ridge.geometry.dispose();
      const ridgeMaterial = ridge.material as MeshStandardMaterial;
      ridgeMaterial.map?.dispose();
      ridgeMaterial.dispose();
      if (water !== null) {
        floodMouth?.geometry.dispose();
        water.geometry.dispose(); (water.material as Material).dispose();
      }
      ground.geometry.dispose();
      (ground.material as Material).dispose();
      group.clear();
    },
  };
}
