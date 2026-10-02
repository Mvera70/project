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
//
// **Y blanca, con pie** (27 sep 2026, Vera: «las cascadas y caídas de agua
// todavía no me convencen»). Eran del color del río —una raya turquesa sobre
// la roca, en sombra casi negra— y acababan sin nada. El agua que cae va
// batida: aquí la cinta es blanca por vetas y masas que bajan a golpes, con el
// azul sólo en los huecos, y **luce por sí misma** lo justo para no apagarse en
// la garganta. Al pie, **una poza de espuma** —un disco sobre el agua con
// anillos que se abren— y **la neblina**: unos velos que suben del choque y
// se deshacen, a ritmo fijo, sin dados.

import {
  BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, DoubleSide, Group, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, Sprite, SpriteMaterial, Vector3, type Texture,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import { GROUND_BIAS } from '../visual-config';
import { FLOOD_RISE } from './ground';
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
  /** La riada, de 0 a 1: la poza y la neblina de las gargantas suben con el río. */
  flood(level: number): void;
  dispose(): void;
}

/** Lo que tiene que caer como poco para que sea cascada y no un reguero, en celdas. */
const LEAST_DROP = 1.5;
/** A qué distancia del extremo del mapa baja la de cada garganta, en celdas. TUNE visual. */
const GORGE_AT = 7;
/**
 * Dónde se busca la pared de cada garganta: a cuántas celdas del eje del río
 * puede estar el borde de arriba de la caída, y a cuántas filas de `GORGE_AT`,
 * hacia dentro y hacia fuera. TUNE visual.
 *
 * **Con el valle de forma natural (2 oct 2026, v5.73) la pared ya no está
 * siempre a cinco u ocho celdas del río.** El contorno del valle llega hasta
 * las gargantas (`valley-shape.ts`) y su falda de prado las ensancha: la roca
 * arranca más lejos del río, y de cinco a ocho celdas sólo queda suelo llano o
 * pinos al pie de la ladera. Medido en 60 valles (semillas 1 a 60) con la
 * búsqueda de antes —alcance de 5 a 8, desvíos de hasta 4,5 filas—: en `main`
 * las 120 gargantas tenían cascada; con el contorno, 109 (once valles sin la de
 * una de sus gargantas), y las que había caían menos: mediana de 5,9 celdas
 * frente a 8,6, y una de cada diez de menos de tres. Con esta búsqueda, más
 * lejos y más a lo largo, y una puntuación que premia la pendiente —una pared
 * lejana no puede ganar por tener un tramo largo de prado antes de caer—, son
 * 120 de 120 con una caída mediana de 9,7 (una de cada diez, de menos de 8,8), y
 * sobre los mapas de `main` da 120 de 120 y 9,6: no estropea el valle de antes.
 */
const FALL_REACH = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const FALL_ROWS = [0, -1.5, 1.5, -3, 3, -4.5, 4.5, -6, 6, -7.5, 7.5] as const;
/** Lo deprisa que bajan las vetas, en repeticiones de la textura por segundo.
 * TUNE visual: a 0,9 la cinta parecía quieta desde la cámara de reposo. */
const FLOW = 1.5;
/** La poza de espuma al pie: radio en celdas. TUNE visual. */
const POOL_RADIUS = { gorge: 1.3, lake: 1.0 } as const;
/** La neblina: velos por pie, lo que suben en celdas y lo que dura cada vuelta. TUNE visual. */
const MIST = { veils: 4, rise: 0.9, seconds: 2.8, size: 0.9, grow: 1.1, opacity: 0.6 } as const;
/**
 * La boca del manantial, en celdas (Vera, 27 sep 2026: «justo de donde sale el
 * agua tiene que verse como una especie de cuevita chiquitita, una salida; se
 * ve muy abrupta»). Un hueco oscuro en la roca, vertical y de cara a la caída,
 * con una visera de piedra encima: el agua sale de dentro en vez de nacer en
 * mitad de la ladera. TUNE visual.
 */
const MOUTH = { hole: 0.5, hood: 0.78, hoodBack: 0.28, lift: 0.3 } as const;
/** El ruido de la cinta y de la poza: el de `water-surface.ts`, en su propio programa. */
const NOISE_GLSL = `
float fHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(fHash(i), fHash(i + vec2(1.0, 0.0)), u.x),
             mix(fHash(i + vec2(0.0, 1.0)), fHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;
/** Ancho de la cinta arriba y abajo, en celdas. */
const WIDTH_TOP = 1.0;
const WIDTH_FOOT = 1.75;
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
    // Las dos paredes, a varias alturas: gana la que más cae de cara a la
    // cámara, y entre dos lejanas la que cae deprisa y no la que anda por prado.
    for (const side of [1, -1]) {
      for (const offset of FALL_ROWS) {
        for (const reach of FALL_REACH) {
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
          const slope = drop / Math.hypot(bottom.x - top.x, bottom.z - top.z);
          const value = drop < LEAST_DROP ? 0 : score(candidate, drop) * slope / (1 + Math.abs(offset) * 0.04);
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
        // El mismo mínimo que la garganta: un salto de una celda al lago era
        // un reguero, y la prueba de «cae de verdad» lo decía (27 sep).
        if (drop < LEAST_DROP || !clearLakeFall(map, candidate) || !visibleLakeFall(map, seed, candidate)) continue;
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

/** Un velo de neblina: un disco blando, como las bocanadas de `fires.ts`. Sin lienzo (pruebas), nada. */
function veilTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  for (let blob = 0; blob < 4; blob += 1) {
    const x = 32 + (unit(blob, 'veil:x') - 0.5) * 16, y = 32 + (unit(blob, 'veil:y') - 0.5) * 16;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15 + unit(blob, 'veil:r') * 9);
    gradient.addColorStop(0, 'rgba(255, 255, 255, .5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(canvas);
}

export function buildWaterfalls(map: ValleyMap, seed: number, heightAt: (x: number, z: number) => number): Waterfalls {
  const group = new Group();
  group.name = 'Valley_Waterfalls';
  const time = { value: 0 };
  const material = new MeshStandardMaterial({
    color: '#ffffff', roughness: 0.6, metalness: 0,
    // Luz propia: la garganta está en sombra y una cascada apagada es una
    // raya gris. Poca, para que siga oscureciendo al anochecer.
    emissive: '#8fc4cc', emissiveIntensity: 0.28,
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
        uniform float uFallTime;
        ${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float x = vFallUv.x;
        float run = vFallUv.y - uFallTime;
        // Las vetas: dos frecuencias con vaivén, y las masas que bajan a golpes.
        float thread = smoothstep(0.35, 0.95, sin(x * 11.0 + sin(run * 2.3) * 1.1 + 0.4)) * 0.7
          + smoothstep(0.5, 1.0, sin(x * 23.0 - sin(run * 3.1 + 1.7) * 0.8)) * 0.5;
        float body = 0.5 + 0.5 * fNoise(vec2(x * 6.0, run * 2.5));
        float surge = smoothstep(0.35, 0.9, sin(run * 5.0 + x * 3.0) * 0.5 + 0.5);
        float white = clamp(thread * body + surge * 0.35, 0.0, 1.0);
        vec3 deep = vec3(0.30, 0.58, 0.64);
        vec3 pale = vec3(0.80, 0.90, 0.92);
        vec3 froth = vec3(0.96, 0.98, 0.98);
        diffuseColor.rgb = mix(deep, pale, body * 0.6);
        diffuseColor.rgb = mix(diffuseColor.rgb, froth, white * 0.85);
        // El pie, todo espuma revuelta; el labio de arriba, más claro y más fino.
        float foot = smoothstep(0.72, 0.98, vFallProgress);
        float churn = fNoise(vec2(x * 9.0 + uFallTime * 2.0, vFallProgress * 30.0 - uFallTime * 6.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, froth, foot * (0.5 + churn * 0.5));
        float lip = 1.0 - smoothstep(0.0, 0.12, vFallUv.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, pale, lip * 0.5);
        // Bordes deshechos: el filo de una cascada no es una recta.
        float rim = min(x, 1.0 - x);
        float edge = smoothstep(0.0, 0.2, rim) * (0.8 + 0.2 * fNoise(vec2(x * 4.0, run * 3.0)));
        diffuseColor.a *= (0.85 + white * 0.15) * edge * smoothstep(0.0, 0.1, vFallUv.y);`);
  };
  material.customProgramCacheKey = () => 'valley-falling-water';
  // La poza: un disco blanco sobre el agua con anillos que se abren desde el
  // choque, rotos por ruido, y que se deshacen hacia el borde.
  const poolMaterial = new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false });
  poolMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uFallTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPoolUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPoolUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vPoolUv;
        uniform float uFallTime;
        ${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 c = vPoolUv * 2.0 - 1.0;
        float r = length(c);
        float rings = sin(r * 14.0 - uFallTime * 5.0) * 0.5 + 0.5;
        float grain = fNoise(c * 5.0 + vec2(uFallTime * 0.7, -uFallTime * 0.5));
        float foam = smoothstep(0.3, 0.9, rings * 0.6 + grain * 0.6);
        float core = 1.0 - smoothstep(0.0, 0.35, r);
        float fade = 1.0 - smoothstep(0.3, 1.0, r);
        diffuseColor.rgb = mix(vec3(0.82, 0.92, 0.93), vec3(0.97, 0.99, 0.99), foam);
        diffuseColor.a *= (core * 0.9 + foam * 0.75) * fade;`);
  };
  poolMaterial.customProgramCacheKey = () => 'valley-fall-foam';
  const feetGroup = new Group();
  feetGroup.name = 'Valley_WaterfallFeet';
  group.add(feetGroup);
  // La boca: piedra como la de la sierra, y dentro, casi negro.
  const hoodMaterial = new MeshStandardMaterial({ color: '#7a7569', flatShading: true, roughness: 1, metalness: 0 });
  const holeMaterial = new MeshStandardMaterial({ color: '#1c1917', roughness: 1, metalness: 0 });
  const springMouth = (at: { x: number; y: number; z: number }, dx: number, dz: number): void => {
    const length = Math.hypot(dx, dz);
    const d = new Vector3(dx / length, 0, dz / length);
    const hole = new Mesh(new CircleGeometry(MOUTH.hole, 16), holeMaterial);
    hole.name = 'Valley_WaterfallMouth';
    hole.position.set(at.x - d.x * 0.06, GROUND_BIAS + at.y + MOUTH.lift, at.z - d.z * 0.06);
    hole.lookAt(hole.position.clone().add(d));
    // La visera: media bóveda hundida en la ladera, con el frente sobre el hueco.
    const hood = new Mesh(new SphereGeometry(MOUTH.hood, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hoodMaterial);
    hood.name = 'Valley_WaterfallHood';
    hood.position.set(at.x - d.x * MOUTH.hoodBack, GROUND_BIAS + at.y + MOUTH.lift - 0.04, at.z - d.z * MOUTH.hoodBack);
    hood.scale.set(1, 0.72, 1);
    hood.castShadow = true;
    feetGroup.add(hole, hood);
    geometries.push(hole.geometry, hood.geometry);
  };
  const mistTexture = veilTexture();
  const mistMaterial = mistTexture === null ? null
    : new SpriteMaterial({ map: mistTexture, color: '#eef6f7', transparent: true, depthWrite: false, opacity: 0 });
  const veils: { sprite: Sprite; foot: { x: number; y: number; z: number }; phase: number; ox: number; oz: number }[] = [];
  const pools: { mesh: Mesh; base: number }[] = [];
  const risingRibbons: { geometry: BufferGeometry; base: Float32Array }[] = [];
  const risingFeet: { foot: { x: number; y: number; z: number }; base: number }[] = [];
  let floodLift = 0;
  const veilsAt = (at: { x: number; y: number; z: number }, count: number, tag: string): void => {
    if (mistMaterial === null) return;
    for (let n = 0; n < count; n += 1) {
      const sprite = new Sprite(mistMaterial.clone());
      sprite.name = 'Valley_WaterfallMist';
      sprite.renderOrder = 4;
      feetGroup.add(sprite);
      const k = `${tag}:${feet.length}:${n}`;
      veils.push({ sprite, foot: at, phase: n / count, ox: (unit(seed, `mist:x:${k}`) - 0.5) * 0.5, oz: (unit(seed, `mist:z:${k}`) - 0.5) * 0.5 });
    }
  };
  const settleFoot = (foot: { x: number; y: number; z: number }, kind: Site['kind']): void => {
    // La espuma ocupa agua, nunca el disco ideal que invade la ribera.
    // Cada radio termina antes del primer contacto con la superficie real.
    const geometry = new CircleGeometry(POOL_RADIUS[kind], 48);
    const rim = geometry.getAttribute('position');
    const water = kind === 'gorge' ? -0.10 : -0.23;
    for (let vertex = 1; vertex < rim.count; vertex += 1) {
      const dx = rim.getX(vertex), dz = -rim.getY(vertex);
      let fraction = 0;
      for (let step = 1; step <= 32; step += 1) {
        const t = step / 32;
        if (mountainSurfaceAt(map, foot.x + dx * t, foot.z + dz * t) >= water - 0.015) break;
        fraction = t;
      }
      rim.setXYZ(vertex, dx * fraction, -dz * fraction, 0);
    }
    geometry.computeBoundingSphere();
    const pool = new Mesh(geometry, poolMaterial);
    pool.name = 'Valley_WaterfallPool';
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(foot.x, GROUND_BIAS + foot.y + 0.015, foot.z);
    pool.renderOrder = 3;
    feetGroup.add(pool);
    geometries.push(pool.geometry);
    // El lago no crece con la riada; el río sí, y la poza con él.
    if (kind === 'gorge') {
      pools.push({ mesh: pool, base: pool.position.y });
      risingFeet.push({ foot, base: foot.y });
    }
    veilsAt(foot, MIST.veils, 'foot');
  };
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
      settleFoot(built.foot, 'lake');
      const source = built.water.getAttribute('position');
      const centre = Math.floor(5 / 2);
      springMouth({ x: source.getX(centre), y: source.getY(centre) - GROUND_BIAS, z: source.getZ(centre) },
        site.bottom.x - site.top.x, site.bottom.z - site.top.z);
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
    // Levantar por triángulo puede dejar un vértice por encima del que tiene
    // arriba; se vuelve a pasar la envolvente desde el pie, que sólo sube.
    for (let i = SAMPLES - 1; i >= 0; i -= 1) {
      for (let lane = 0; lane < lanes; lane += 1) {
        const here = (i * lanes + lane) * 3 + 1, below = ((i + 1) * lanes + lane) * 3 + 1;
        positions[here] = Math.max(positions[here]!, positions[below]!);
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
    risingRibbons.push({ geometry, base: new Float32Array(positions) });
    const mesh = new Mesh(geometry, material);
    mesh.name = 'Valley_Waterfall';
    mesh.renderOrder = 2;
    group.add(mesh);
    const foot = (SAMPLES * lanes + Math.floor(lanes / 2)) * 3;
    feet.push({ x: positions[foot]!, y: positions[foot + 1]! - GROUND_BIAS, z: positions[foot + 2]! });
    settleFoot(feet[feet.length - 1]!, 'gorge');
    const head = Math.floor(lanes / 2) * 3;
    springMouth({ x: positions[head]!, y: positions[head + 1]! - GROUND_BIAS, z: positions[head + 2]! }, dx, dz);
    // Y a media caída, donde el agua pega en la roca y salta: dos velos más.
    const mid = (Math.floor(SAMPLES / 2) * lanes + Math.floor(lanes / 2)) * 3;
    veilsAt({ x: positions[mid]!, y: positions[mid + 1]! - GROUND_BIAS, z: positions[mid + 2]! }, 2, 'mid');
  }
  return {
    group,
    feet,
    step(seconds): void {
      // Las vetas bajan sin mover ni recalcular la geometría.
      time.value += seconds * FLOW;
      // La neblina: cada velo sube, se hincha y se deshace, y vuelve a nacer
      // del choque; los cuatro de un pie van desfasados un cuarto de vuelta.
      for (const veil of veils) {
        const life = ((time.value / FLOW) / MIST.seconds + veil.phase) % 1;
        veil.sprite.position.set(veil.foot.x + veil.ox, veil.foot.y + 0.12 + life * MIST.rise, veil.foot.z + veil.oz);
        const size = MIST.size + life * MIST.grow;
        veil.sprite.scale.set(size, size * 0.8, 1);
        (veil.sprite.material as SpriteMaterial).opacity = MIST.opacity * (1 - life) * Math.min(1, life * 6);
      }
    },
    flood(level): void {
      if (floodLift === level * FLOOD_RISE) return;
      floodLift = level * FLOOD_RISE;
      for (const pool of pools) pool.mesh.position.y = pool.base + floodLift;
      for (const entry of risingFeet) entry.foot.y = entry.base + floodLift;
      // El último tramo acompaña al agua receptora: la poza y la cinta
      // comparten el mismo pie incluso durante la transición de la riada.
      for (const ribbon of risingRibbons) {
        const position = ribbon.geometry.getAttribute('position') as BufferAttribute;
        const progress = ribbon.geometry.getAttribute('fallProgress');
        for (let vertex = 0; vertex < position.count; vertex += 1) {
          const t = Math.max(0, (progress.getX(vertex) - 0.65) / 0.35);
          position.setY(vertex, ribbon.base[vertex * 3 + 1]! + floodLift * t * t * (3 - 2 * t));
        }
        position.needsUpdate = true;
        ribbon.geometry.computeVertexNormals();
        ribbon.geometry.computeBoundingSphere();
      }
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose();
      for (const veil of veils) (veil.sprite.material as SpriteMaterial).dispose();
      mistMaterial?.dispose();
      mistTexture?.dispose();
      poolMaterial.dispose();
      hoodMaterial.dispose();
      holeMaterial.dispose();
      material.dispose();
    },
  };
}
