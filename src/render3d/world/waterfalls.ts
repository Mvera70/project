// Las cascadas. 26 sep 2026.
//
// Vera: «y una cascada; el mapa no tiene saltos de agua, así que iría como
// decorado en la garganta o junto al lago». Decorado, pues: el motor no sabe
// de ellas ni les hace falta. Una baja por la pared de cada garganta hasta el
// río, y otra al lago si el valle tiene lago con roca detrás.
//
// Es una cinta pegada a la roca —el agua que salta de piedra en piedra, no una
// cortina en el aire— con vetas que corren hacia abajo (la textura se desliza,
// que es lo único que se anima y no cuesta nada), más ancha abajo que arriba. Al
// pie, la espuma: anillos y gotas que salen de `effects/water-throws.ts` a
// ritmo fijo, sin dados.

import {
  BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, RepeatWrapping,
  type Texture,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import { GROUND_BIAS } from '../visual-config';
import { gorgeAt, valleyAxis } from './valley-profile';

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
const WIDTH_TOP = 0.5;
const WIDTH_FOOT = 1.0;
/**
 * Lo que se separa de la roca, en celdas. TUNE: con 0,07 la tapaban las caras
 * de la montaña, que sobresalen de la cota interpolada (captura del 26 sep).
 */
const LIFT = 0.28;
/** Muestras a lo largo de la cinta. */
const SAMPLES = 28;

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
        const bottom = { x: valleyAxis(map, footZ) + side * 1.4, z: footZ };
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
      const bottom = { x: edge.x - dx * 0.35, z: edge.z - dz * 0.35 };
      if (!inside(map, top)) continue;
      const drop = heightAt(top.x, top.z) - heightAt(bottom.x, bottom.z);
      const value = drop < LEAST_DROP ? 0 : score({ top, bottom }, drop);
      if (value > bestScore) { bestScore = value; best = { kind: 'lake', top, bottom }; }
    }
  }
  return best;
}

/** Las vetas del agua que cae: rayas claras de largo y brillo distintos. Sin DOM, nada (pruebas). */
function streakTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context === null) return null;
  context.clearRect(0, 0, 32, 128);
  for (let n = 0; n < 26; n += 1) {
    const x = (hash32(n, 'streak:x') % 32);
    const y = (hash32(n, 'streak:y') % 128);
    const long = 18 + (hash32(n, 'streak:l') % 60);
    const alpha = 0.35 + (hash32(n, 'streak:a') % 60) / 100;
    context.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    context.fillRect(x, y, 2 + (hash32(n, 'streak:w') % 3), long);
    context.fillRect(x, y - 128, 2 + (hash32(n, 'streak:w') % 3), long);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

export function buildWaterfalls(map: ValleyMap, seed: number, heightAt: (x: number, z: number) => number): Waterfalls {
  const group = new Group();
  group.name = 'Valley_Waterfalls';
  const texture = streakTexture();
  const material = new MeshBasicMaterial({
    color: '#dcecf2', transparent: true, opacity: texture === null ? 0.7 : 0.95, depthWrite: false, side: DoubleSide,
    ...(texture === null ? {} : { map: texture, alphaMap: texture }),
  });
  const feet: { x: number; y: number; z: number }[] = [];
  const geometries: BufferGeometry[] = [];
  for (const site of waterfallSites(map, seed, heightAt)) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const dx = site.bottom.x - site.top.x, dz = site.bottom.z - site.top.z;
    const length = Math.hypot(dx, dz);
    const across = { x: -dz / length, z: dx / length };
    let lowest = Infinity;
    let travelled = 0;
    let previous: { x: number; y: number; z: number } | null = null;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES;
      // Un poco de vaivén: el agua busca la piedra, no la regla.
      const sway = Math.sin(t * Math.PI * 3 + unit(seed, 'fall:sway') * 6) * 0.12 * (1 - t);
      const x = site.top.x + dx * t + across.x * sway, z = site.top.z + dz * t + across.z * sway;
      // Pegada a la roca y nunca subiendo: el agua sólo baja.
      lowest = Math.min(lowest, heightAt(x, z) + LIFT * (1 - t * 0.7));
      const y = GROUND_BIAS + lowest;
      if (previous !== null) travelled += Math.hypot(x - previous.x, y - previous.y, z - previous.z);
      previous = { x, y, z };
      const half = (WIDTH_TOP + (WIDTH_FOOT - WIDTH_TOP) * t) / 2;
      positions.push(x - across.x * half, y, z - across.z * half, x + across.x * half, y, z + across.z * half);
      uvs.push(0, travelled / 1.2, 1, travelled / 1.2);
      if (i > 0) {
        const a = (i - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
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
      // Las vetas bajan: la textura corre hacia el pie.
      if (texture !== null) texture.offset.y -= seconds * FLOW;
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose();
      material.dispose();
      texture?.dispose();
    },
  };
}
