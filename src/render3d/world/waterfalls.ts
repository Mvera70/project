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
import { groundSurfaceAt } from './ground';

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

/**
 * Dónde van. Puro: sólo el mapa, la semilla y la cota del suelo. Una por
 * garganta, en la pared más alta de las dos, y una al lago desde la roca que
 * tenga detrás, si la tiene.
 */
export function waterfallSites(map: ValleyMap, seed: number, heightAt: (x: number, z: number) => number): Site[] {
  const sites: Site[] = [];
  for (const end of [0, 1] as const) {
    const z = end === 0 ? GORGE_AT : map.height - GORGE_AT;
    if (gorgeAt(map, z) < 0.3) continue;
    const axis = valleyAxis(map, z);
    let best: Site | null = null;
    let bestScore = 0;
    // Las dos paredes, a varias alturas: gana la que más cae de cara a la cámara.
    for (const side of [1, -1]) {
      for (const reach of [5, 6, 7, 8]) {
        const top = { x: axis + side * reach, z: z + (unit(seed, `fall:z:${end}`) - 0.5) * 2 };
        // El pie, en la orilla medida a su propia altura del valle: el eje
        // serpentea, y medido arriba el pie quedaba a dos celdas del río.
        const footZ = top.z + (end === 0 ? 0.6 : -0.6);
        const bottom = waterLanding(map, { x: valleyAxis(map, footZ) + side * 1.4, z: footZ });
        if (!inside(map, top) || !inside(map, bottom)) continue;
        const drop = heightAt(top.x, top.z) - heightAt(bottom.x, bottom.z);
        const value = drop < LEAST_DROP ? 0 : score({ top, bottom }, drop);
        if (value > bestScore) { bestScore = value; best = { kind: 'gorge', top, bottom }; }
      }
    }
    if (best !== null) sites.push(best);
  }
  const lake = lakeSite(map, heightAt);
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

/** La orilla del lago con la roca más alta detrás, y la cascada que baja de ella. */
function lakeSite(map: ValleyMap, heightAt: (x: number, z: number) => number): Site | null {
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
      const top = { x: edge.x + dx * 3, z: edge.z + dz * 3 };
      const bottom = waterLanding(map, { x: edge.x - dx * 0.35, z: edge.z - dz * 0.35 });
      if (!inside(map, top)) continue;
      const drop = heightAt(top.x, top.z) - heightAt(bottom.x, bottom.z);
      const value = drop < LEAST_DROP ? 0 : score({ top, bottom }, drop);
      if (value > bestScore) { bestScore = value; best = { kind: 'lake', top, bottom }; }
    }
  }
  return best;
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
    const waterLevel = site.kind === 'lake' ? -0.23 : -0.10;
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
        section.push({ x: px, z: pz, y: Math.max(waterLevel, groundSurfaceAt(map, px, pz) + LIFT) });
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
    feet.push({ x: previous!.x, y: previous!.y - GROUND_BIAS, z: previous!.z });
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
