// Las cascadas. 26 sep 2026.
//
// Vera: «y una cascada; el mapa no tiene saltos de agua, así que iría como
// decorado en la garganta o junto al lago». Decorado, pues: el motor no sabe
// de ellas ni les hace falta. Una baja por la pared de cada garganta hasta el
// río, y otra al lago si el valle tiene lago con roca detrás.
//
// Es una cinta pegada a la roca —el agua que salta de piedra en piedra, no una
// cortina en el aire— con vetas procedurales que corren hacia abajo y bordes
// transparentes, más ancha abajo que arriba. Al
// pie, la espuma del material y gotas cortas de `effects/water-throws.ts` a
// ritmo fijo, sin dados.

import {
  BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import { GROUND_BIAS } from '../visual-config';
import { gorgeAt, valleyAxis } from './valley-profile';
import { mountainSurfaceAt } from './mountains';
import { pineCells, pineScaleAt, scatterTransform } from './forest';
import { ridgeAt } from './ridge';

export interface Site {
  readonly kind: 'gorge' | 'lake';
  readonly top: { x: number; z: number };
  readonly bottom: { x: number; z: number };
}

export interface Waterfalls {
  readonly group: Group;
  /** Donde cae cada una: el pie, para la espuma. */
  readonly feet: readonly { x: number; y: number; z: number }[];
  step(seconds: number): void;
  dispose(): void;
}

/** Lo que tiene que caer como poco para que sea cascada y no un reguero, en celdas. */
const LEAST_DROP = 1.5;
/** A qué distancia del extremo del mapa baja la de cada garganta, en celdas. TUNE visual. */
const GORGE_AT = 7;
/** Lo deprisa que bajan las vetas, en repeticiones de la textura por segundo. */
const FLOW = 0.9;
/** Ancho de la cinta arriba y abajo, en celdas. */
const WIDTH_TOP = 0.85;
const WIDTH_FOOT = 1.45;
/** Separación mínima; la envolvente comprueba también los bordes de la cinta. */
const LIFT = 0.055;
/** Muestras a lo largo de la cinta. */
const SAMPLES = 56;

const unit = (seed: number, what: string): number => hash32(seed, what) / 4_294_967_296;

/**
 * Desde dónde mira la cámara de reposo, en el suelo: la `VIEW` de `camera.ts`
 * (1, 0,9, 1,15) sin la altura. Una cascada en una pared que da la espalda a
 * la cámara no se ve —las primeras salieron así, sólo con su espuma—, así que
 * cada sitio puntúa su caída por lo de cara que está.
 */
const VIEW_FROM = { x: 1 / Math.hypot(1, 1.15), z: 1.15 / Math.hypot(1, 1.15) };

/** Lo que vale un sitio: la caída, por lo de cara a la cámara que baja el agua. */
function score(site: { top: { x: number; z: number }; bottom: { x: number; z: number } }, drop: number): number {
  const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
  const facing = (dx * VIEW_FROM.x + dz * VIEW_FROM.z) / Math.max(1e-6, Math.hypot(dx, dz));
  return facing <= 0.15 ? 0 : drop * facing;
}

/** Distancia a la huella de la caída, con su ancho y el margen del vaivén. */
export function waterfallCorridorAt(sites: readonly Site[], x: number, z: number, radius = 0): boolean {
  return sites.some(site => {
    const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
    const t = Math.max(0, Math.min(1, ((x - site.top.x) * dx + (z - site.top.z) * dz) / (dx * dx + dz * dz)));
    const half = (WIDTH_TOP + (WIDTH_FOOT - WIDTH_TOP) * t) * 0.5;
    return Math.hypot(x - site.top.x - dx * t, z - site.top.z - dz * t) < half + 0.22 + radius;
  });
}

interface TreeFootprint { x: number; z: number; radius: number }

function treeFootprints(map: ValleyMap): TreeFootprint[] {
  const pines = pineCells(map);
  const trees: TreeFootprint[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    const pine = pines.has(cell);
    if (!pine && map.terrain[cell] !== TERRAIN_CODE.forest) continue;
    const at = scatterTransform(map.width, cell);
    trees.push({ x: at.x, z: at.z, radius: at.scale * (pine ? 0.8 * pineScaleAt(cell) : 1.6) });
  }
  return trees;
}

function clearOfTrees(site: Site, trees: readonly TreeFootprint[]): boolean {
  return trees.every(tree => !waterfallCorridorAt([site], tree.x, tree.z,
    tree.radius));
}

/**
 * Dónde van. Puro: sólo el mapa, la semilla y la cota del suelo. Una por
 * garganta, en la pared más alta de las dos, y una al lago desde la roca que
 * tenga detrás, si la tiene.
 */
export function waterfallSites(map: ValleyMap, seed: number, heightAt: (x: number, z: number) => number): Site[] {
  const sites: Site[] = [];
  const trees = treeFootprints(map);
  for (const end of [0, 1] as const) {
    const z = end === 0 ? GORGE_AT : map.height - GORGE_AT;
    if (gorgeAt(map, z) < 0.3) continue;
    let best: Site | null = null;
    let bestScore = 0;
    // Las dos paredes, a varias alturas: gana la que más cae de cara a la cámara.
    for (const side of [1, -1]) {
      for (const offset of [0, -1.5, 1.5, -3, 3, -4.5, 4.5]) {
        for (const reach of [5, 6, 7, 8]) {
          const topZ = z + offset + (unit(seed, `fall:z:${end}`) - 0.5) * 2;
          const top = { x: valleyAxis(map, topZ) + side * reach, z: topZ };
          // El pie, en la orilla medida a su propia altura del valle: el eje
          // serpentea, y medido arriba el pie quedaba a dos celdas del río.
          const footZ = top.z + (end === 0 ? 0.6 : -0.6);
          const bottom = waterLanding(map, { x: valleyAxis(map, footZ) + side * 1.4, z: footZ });
          if (!inside(map, top) || !inside(map, bottom)) continue;
          const candidate: Site = { kind: 'gorge', top, bottom };
          if (!clearOfTrees(candidate, trees)) continue;
          const drop = heightAt(top.x, top.z) - heightAt(bottom.x, bottom.z);
          const value = drop < LEAST_DROP ? 0 : score(candidate, drop) / (1 + Math.abs(offset) * 0.04);
          if (value > bestScore) { bestScore = value; best = candidate; }
        }
      }
    }
    if (best !== null) sites.push(best);
  }
  const lake = lakeSite(map, seed, heightAt, trees);
  if (lake !== null) sites.push(lake);
  return sites;
}

function inside(map: ValleyMap, p: { x: number; z: number }): boolean {
  return p.x > 0.5 && p.z > 0.5 && p.x < map.width - 0.5 && p.z < map.height - 0.5;
}

/** El agua termina dentro del cauce real, no en un desplazamiento del eje. */
function waterLanding(map: ValleyMap, target: { x: number; z: number }): { x: number; z: number } {
  let best = target, nearest = Infinity;
  for (let z = Math.floor(target.z) - 3; z <= Math.floor(target.z) + 3; z += 1) {
    for (let x = Math.floor(target.x) - 3; x <= Math.floor(target.x) + 3; x += 1) {
      if (x < 0 || z < 0 || x >= map.width || z >= map.height) continue;
      const terrain = map.terrain[z * map.width + x];
      if (terrain !== TERRAIN_CODE.water && terrain !== TERRAIN_CODE.lake) continue;
      const distance = Math.hypot(x + 0.5 - target.x, z + 0.5 - target.z);
      if (distance < nearest) { nearest = distance; best = { x: x + 0.5, z: z + 0.5 }; }
    }
  }
  return best;
}

/** Busca una cara despejada desde la que el agua pueda caer libre al lago. */
function lakeSite(map: ValleyMap, seed: number, heightAt: (x: number, z: number) => number, trees: readonly TreeFootprint[]): Site | null {
  let best: Site | null = null;
  let bestScore = 0;
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] !== TERRAIN_CODE.lake) continue;
    const x = cell % map.width, z = Math.floor(cell / map.width);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= map.width || nz >= map.height) continue;
      if (map.terrain[nz * map.width + nx] !== TERRAIN_CODE.mountain) continue;
      const edge = { x: x + 0.5 + dx * 0.5, z: z + 0.5 + dz * 0.5 };
      for (const reach of [1.2, 1.8, 2.4, 3]) {
        const top = { x: edge.x + dx * reach, z: edge.z + dz * reach };
        // El pie entra una celda y media: terminar en la primera orilla hacía
        // que el extremo ancho subiera por la roca y pareciese un bulto.
        const bottom = waterLanding(map, { x: edge.x - dx * 1.5, z: edge.z - dz * 1.5 });
        const candidate: Site = { kind: 'lake', top, bottom };
        if (!inside(map, top) || !clearOfTrees(candidate, trees)) continue;
        const drop = heightAt(top.x, top.z) + 0.23;
        if (drop < 0.9 || !clearLakeFall(map, candidate) || !visibleLakeFall(map, seed, candidate)) continue;
        const value = score(candidate, drop) / Math.hypot(top.x - bottom.x, top.z - bottom.z);
        if (value > bestScore) { bestScore = value; best = candidate; }
      }
    }
  }
  return best;
}

/** Punto de una cortina libre. Nace en la roca y gana pendiente al caer;
 * no hay alimentación horizontal, malla de soporte ni escalones del terreno.
 */
function lakeFallPoint(map: ValleyMap, site: Site, t: number): { x: number; y: number; z: number; half: number } {
  const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
  const length = Math.hypot(dx, dz), ax = -dz / length, az = dx / length;
  const source = Math.max(mountainSurfaceAt(map, site.top.x, site.top.z),
    mountainSurfaceAt(map, site.top.x - ax * 0.12, site.top.z - az * 0.12),
    mountainSurfaceAt(map, site.top.x + ax * 0.12, site.top.z + az * 0.12)) + 0.035;
  const advance = Math.sqrt(t);
  return {
    x: site.top.x + dx * advance,
    z: site.top.z + dz * advance,
    y: source + (-0.225 - source) * t,
    half: 0.12 + Math.sin(t * Math.PI * 0.5) * 0.26,
  };
}

/** La trayectoria debe estar libre en toda la cortina, no sólo en el eje. */
function clearLakeFall(map: ValleyMap, site: Site): boolean {
  const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
  const length = Math.hypot(dx, dz), ax = -dz / length, az = dx / length;
  for (let i = 1; i <= 32; i += 1) {
    const p = lakeFallPoint(map, site, i / 32);
    for (const side of [-1, 0, 1]) {
      const surface = mountainSurfaceAt(map, p.x + ax * p.half * side, p.z + az * p.half * side);
      if (surface > p.y - 0.018) return false;
    }
  }
  return true;
}

/** Visibilidad desde la cámara de reposo, no sólo orientación de la pared.
 * La sierra del primer plano puede esconder un lago entero aunque la caída
 * mire a cámara; en ese caso no se dibuja una raya que parezca atravesar roca.
 */
function visibleLakeFall(map: ValleyMap, seed: number, site: Site): boolean {
  const rise = 0.9 / Math.hypot(1, 1.15);
  const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
  const length = Math.hypot(dx, dz), ax = -dz / length, az = dx / length;
  for (const t of [0.03, 0.2, 0.45, 0.7, 0.97]) {
    const point = lakeFallPoint(map, site, t);
    for (const side of [-0.7, 0, 0.7]) {
      const px = point.x + ax * point.half * side, pz = point.z + az * point.half * side;
      for (let distance = 0.12; distance < 70; distance += 0.3) {
        const x = px + VIEW_FROM.x * distance, z = pz + VIEW_FROM.z * distance;
        const terrain = x >= 0 && z >= 0 && x < map.width && z < map.height
          ? mountainSurfaceAt(map, x, z) : ridgeAt(map, seed, x, z);
        if (terrain > point.y + rise * distance - 0.015) return false;
      }
    }
  }
  return true;
}

function lakeFallGeometry(map: ValleyMap, site: Site): {
  water: BufferGeometry; foot: { x: number; y: number; z: number };
} {
  const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
  const length = Math.hypot(dx, dz), ax = -dz / length, az = dx / length;
  const positions: number[] = [], uvs: number[] = [], progress: number[] = [], indices: number[] = [];
  const lanes = 5, samples = 48;
  let travelled = 0;
  let previous: { x: number; y: number; z: number } | null = null;
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const p = lakeFallPoint(map, site, t);
    if (previous !== null) travelled += Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z);
    previous = p;
    const half = p.half * (0.94 + Math.sin(t * 19.0) * 0.06);
    for (let lane = 0; lane < lanes; lane += 1) {
      const offset = (lane / (lanes - 1) * 2 - 1) * half;
      positions.push(p.x + ax * offset, GROUND_BIAS + p.y, p.z + az * offset);
      uvs.push(lane / (lanes - 1), travelled / 1.2);
      progress.push(t);
      if (i > 0 && lane < lanes - 1) {
        const a = (i - 1) * lanes + lane;
        indices.push(a, a + lanes, a + 1, a + 1, a + lanes, a + lanes + 1);
      }
    }
  }
  const water = new BufferGeometry();
  water.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  water.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  water.setAttribute('fallProgress', new BufferAttribute(new Float32Array(progress), 1));
  water.setIndex(indices);
  water.computeVertexNormals();
  return { water, foot: { x: site.bottom.x, y: -0.225, z: site.bottom.z } };
}

export function buildWaterfalls(map: ValleyMap, seed: number, heightAt: (x: number, z: number) => number): Waterfalls {
  const group = new Group();
  group.name = 'Valley_Waterfalls';
  const time = { value: 0 };
  const material = new MeshStandardMaterial({
    color: '#438d9b', roughness: 0.42, metalness: 0,
    transparent: true, opacity: 1, depthWrite: false, side: DoubleSide,
  });
  // Un único material iluminado: la cascada se oscurece al anochecer. La
  // máscara afina los bordes y corta las vetas; no son rectángulos de textura.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFallTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float fallProgress;\nvarying float vFallProgress;\nvarying vec2 vFallUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFallUv = uv;\nvFallProgress = fallProgress;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vFallUv;
        varying float vFallProgress;
        uniform float uFallTime;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float run = vFallUv.y - uFallTime;
        float thread = sin(vFallUv.x * 13.0 + sin(run * 2.0) * 1.3);
        float pulse = sin(run * 7.0 + vFallUv.x * 8.0) * 0.5 + 0.5;
        float rim = min(vFallUv.x, 1.0 - vFallUv.x);
        float edge = smoothstep(0.0, 0.07, rim);
        float white = smoothstep(0.2, 0.95, thread) * (0.25 + pulse * 0.65);
        diffuseColor.rgb *= 0.88 + pulse * 0.12;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38, 0.65, 0.68), white * 0.18);
        float foam = smoothstep(0.8, 0.98, vFallProgress) * (0.2 + pulse * 0.22);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.9, 0.86), foam);
        diffuseColor.a *= edge * smoothstep(0.0, 0.18, vFallUv.y);`);
  };
  material.customProgramCacheKey = () => 'valley-falling-water';
  const feet: { x: number; y: number; z: number }[] = [];
  const geometries: BufferGeometry[] = [];
  for (const site of waterfallSites(map, seed, heightAt)) {
    if (site.kind === 'lake') {
      const built = lakeFallGeometry(map, site);
      geometries.push(built.water);
      const water = new Mesh(built.water, material);
      water.name = 'Valley_Waterfall';
      water.renderOrder = 2;
      group.add(water);
      feet.push(built.foot);
      continue;
    }
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
    const length = Math.hypot(dx, dz);
    const across = { x: -dz / length, z: dx / length };
    // Envolvente desde el pie hacia arriba: no sube al avanzar y nunca se
    // mete debajo de una piedra. El mínimo acumulado anterior enterraba todos
    // los tramos posteriores al primer hueco del terreno.
    const lanes = 7;
    const path: { x: number; y: number; z: number }[][] = [];
    const waterLevel = -0.10;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES;
      const sway = Math.sin(t * Math.PI * 3 + unit(seed, 'fall:sway') * 6) * 0.16 * Math.sin(t * Math.PI);
      const x = site.top.x + dx * t + across.x * sway;
      const z = site.top.z + dz * t + across.z * sway;
      const half = (WIDTH_TOP + (WIDTH_FOOT - WIDTH_TOP) * t) * 0.5
        * (0.85 + 0.15 * Math.sin(t * Math.PI * 5));
      const section: { x: number; y: number; z: number }[] = [];
      for (let lane = 0; lane < lanes; lane += 1) {
        const offset = (lane / (lanes - 1) * 2 - 1) * half;
        const px = x + across.x * offset, pz = z + across.z * offset;
        section.push({ x: px, z: pz, y: Math.max(waterLevel, mountainSurfaceAt(map, px, pz) + LIFT) });
      }
      path.push(section);
    }
    // Redondear los pequeños huecos entre facetas sin bajar ningún vértice
    // bajo la roca. Más muestras evitan los recortes triangulares del salto.
    const heights = path.map(section => section.map(point => point.y));
    for (let i = 1; i < SAMPLES; i += 1) {
      for (let lane = 0; lane < lanes; lane += 1) {
        path[i]![lane]!.y = Math.max(path[i]![lane]!.y,
          (heights[i - 1]![lane]! + 2 * heights[i]![lane]! + heights[i + 1]![lane]!) * 0.25);
      }
    }
    for (let i = SAMPLES - 1; i >= 0; i -= 1) {
      for (let lane = 0; lane < lanes; lane += 1) {
        path[i]![lane]!.y = Math.max(path[i]![lane]!.y, path[i + 1]![lane]!.y);
      }
    }
    let travelled = 0;
    let previous: { x: number; y: number; z: number } | null = null;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const centre = path[i]![Math.floor(lanes / 2)]!;
      const y = GROUND_BIAS + centre.y;
      if (previous !== null) travelled += Math.hypot(centre.x - previous.x, y - previous.y, centre.z - previous.z);
      previous = { x: centre.x, y, z: centre.z };
      for (let lane = 0; lane < lanes; lane += 1) {
        const p = path[i]![lane]!;
        positions.push(p.x, GROUND_BIAS + p.y, p.z);
        uvs.push(lane / (lanes - 1), travelled / 1.2);
        if (i > 0 && lane < lanes - 1) {
          const a = (i - 1) * lanes + lane;
          indices.push(a, a + lanes, a + 1, a + 1, a + lanes, a + lanes + 1);
        }
      }
    }
    // La envolvente también se comprueba DENTRO de cada triángulo de agua:
    // sus extremos pueden estar libres y la faceta de roca cruzarlo en medio.
    // Levantar vértices compartidos mantiene la lámina cosida y sólo corrige
    // la separación que falta; no desactiva profundidad ni tapa la montaña.
    for (let face = 0; face < indices.length; face += 3) {
      const a = indices[face]! * 3, b = indices[face + 1]! * 3, c = indices[face + 2]! * 3;
      let lift = 0;
      for (const [u, v, w] of [[0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], [1 / 3, 1 / 3, 1 / 3]]) {
        const x = positions[a]! * u! + positions[b]! * v! + positions[c]! * w!;
        const z = positions[a + 2]! * u! + positions[b + 2]! * v! + positions[c + 2]! * w!;
        const y = positions[a + 1]! * u! + positions[b + 1]! * v! + positions[c + 1]! * w!;
        lift = Math.max(lift, GROUND_BIAS + mountainSurfaceAt(map, x, z) + LIFT - y);
      }
      if (lift <= 0) continue;
      positions[a + 1] = positions[a + 1]! + lift;
      positions[b + 1] = positions[b + 1]! + lift;
      positions[c + 1] = positions[c + 1]! + lift;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setAttribute('fallProgress', new BufferAttribute(
      Float32Array.from({ length: positions.length / 3 }, (_, index) => Math.floor(index / lanes) / SAMPLES), 1));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'Valley_Waterfall';
    mesh.renderOrder = 2;
    group.add(mesh);
    const foot = (SAMPLES * lanes + Math.floor(lanes / 2)) * 3;
    feet.push({ x: positions[foot]!, y: positions[foot + 1]! - GROUND_BIAS, z: positions[foot + 2]! });
  }
  return {
    group,
    feet,
    step(seconds): void {
      // Las vetas bajan sin mover ni recalcular la geometría.
      time.value += seconds * FLOW;
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose();
      material.dispose();
    },
  };
}
