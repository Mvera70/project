// El valle más vivo · Niebla de madrugada, pájaros y luciérnagas.
//
// Pedido por Vera, 25 sep 2026. Tres capas de decorado que dependen de la hora
// y de la estación, y ninguna del estado:
//
//   · **La niebla del río al amanecer**: bancos bajos y blandos sobre el agua y
//     sus orillas, que se levantan y se van con el sol.
//   · **Los pájaros**: bandadas pequeñas que cruzan el cielo de día, batiendo
//     las alas; con tormenta o de noche no vuelan.
//   · **Las luciérnagas**: puntos de luz verde amarilla que parpadean sobre la
//     hierba junto al agua, en las noches de primavera y verano.
//
// Una malla por capa, instanciada, y sin azar: todo sale de un hash del índice.
// Lo que cambia con la hora es la opacidad y cuántas se dibujan.

import {
  AdditiveBlending, CanvasTexture, Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4,
  MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3, type Camera, type Texture,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import type { Season } from '@engine/state';
import type { SkyKind } from '../../derive/weather';
import { hourAt } from './day-phases';

const MIST = 40;
const BIRDS = 18;
const FLIES = 90;

function unit(index: number, what: string): number {
  return hash32(index, `ambience:${what}`) / 4_294_967_296;
}

function softTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(canvas);
}

/** Un pájaro en uve, dibujado: dos alas oscuras. */
function birdTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    ctx.strokeStyle = 'rgba(30,30,34,1)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, 5); ctx.quadraticCurveTo(10, 3, 16, 11); ctx.quadraticCurveTo(22, 3, 29, 5);
    ctx.stroke();
  }
  return new CanvasTexture(canvas);
}

export interface Ambience {
  readonly group: Group;
  /** Cuántas piezas de cada capa se ven ahora (para las pruebas y la traza). */
  readonly visible: { readonly mist: number; readonly birds: number; readonly flies: number };
  step(phase: number, season: Season, sky: SkyKind, seconds: number, camera: Camera): void;
  dispose(): void;
}

/** Las celdas de agua y de orilla, donde se asienta la niebla y vuelan las luciérnagas. */
function wetCells(map: ValleyMap): number[] {
  const cells: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    const t = map.terrain[cell];
    if (t === TERRAIN_CODE.water || t === TERRAIN_CODE.lake || t === TERRAIN_CODE.marsh) cells.push(cell);
  }
  return cells;
}

/** Cuánta niebla hay a esta hora: sube antes del alba, se va al media mañana. */
export function mistAt(hour: number): number {
  if (hour < 4 || hour > 10) return 0;
  if (hour < 6) return (hour - 4) / 2;
  return Math.max(0, 1 - (hour - 7) / 3);
}

/** Si vuelan pájaros a esta hora y con este cielo. */
export function birdsAt(hour: number, sky: SkyKind): number {
  if (sky === 'storm' || sky === 'snow') return 0;
  if (hour < 6.5 || hour > 19.5) return 0;
  return sky === 'rain' ? 0.3 : 1;
}

/** Luciérnagas: noches de primavera y verano, sin lluvia. */
export function fliesAt(hour: number, season: Season, sky: SkyKind): number {
  if (season !== 'spring' && season !== 'summer') return 0;
  if (sky === 'rain' || sky === 'storm') return 0;
  if (hour > 21 || hour < 3.5) return 1;
  if (hour > 20) return hour - 20;
  return 0;
}

export function createAmbience(map: ValleyMap): Ambience {
  const group = new Group();
  group.name = 'Valley_Ambience';
  const soft = softTexture();
  const birdMap = birdTexture();
  const plane = new PlaneGeometry(1, 1);
  const wet = wetCells(map);
  const spot = (index: number, what: string): { x: number; z: number } => {
    if (wet.length === 0) return { x: map.width / 2, z: map.height / 2 };
    const cell = wet[Math.floor(unit(index, what) * wet.length)]!;
    return { x: cell % map.width + unit(index, `${what}x`), z: Math.floor(cell / map.width) + unit(index, `${what}z`) };
  };

  const mistMaterial = new MeshBasicMaterial({ color: new Color('#e8eef2'), transparent: true, depthWrite: false, opacity: 0, fog: false, ...(soft === null ? {} : { map: soft }) });
  const mist = new InstancedMesh(plane, mistMaterial, MIST);
  const birdMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, fog: false, ...(birdMap === null ? {} : { map: birdMap }) });
  const birds = new InstancedMesh(plane, birdMaterial, BIRDS);
  const flyMaterial = new MeshBasicMaterial({ color: new Color('#d9ff7a'), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0, fog: false, ...(soft === null ? {} : { map: soft }) });
  const flies = new InstancedMesh(plane, flyMaterial, FLIES);
  for (const mesh of [mist, birds, flies]) {
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    group.add(mesh);
  }
  const mistSpots = Array.from({ length: MIST }, (_, n) => spot(n, 'mist'));
  const flySpots = Array.from({ length: FLIES }, (_, n) => spot(n, 'fly'));

  const matrix = new Matrix4();
  const at = new Vector3();
  const size = new Vector3();
  const face = new Quaternion();
  let time = 0;
  const shown = { mist: 0, birds: 0, flies: 0 };

  return {
    group,
    get visible() { return shown; },
    step(phase: number, season: Season, sky: SkyKind, seconds: number, camera: Camera): void {
      time += Math.max(0, seconds);
      const hour = hourAt(phase);
      face.copy(camera.quaternion);

      // La niebla: bancos anchos y bajos, que miran a la cámara y derivan.
      const mistAmount = mistAt(hour) * (sky === 'clear' || sky === 'overcast' ? 1 : 0.5);
      mistMaterial.opacity = 0.62 * mistAmount;
      mist.count = mistAmount > 0.01 ? MIST : 0;
      for (let n = 0; n < mist.count; n += 1) {
        const s = mistSpots[n]!;
        at.set(s.x + Math.sin(time * 0.05 + n) * 0.8, 0.6 + unit(n, 'mh') * 0.6, s.z);
        size.set(6 + unit(n, 'mw') * 6, 2 + unit(n, 'mhh') * 1.5, 1);
        matrix.compose(at, face, size);
        mist.setMatrixAt(n, matrix);
      }
      mist.instanceMatrix.needsUpdate = true;

      // Los pájaros: tres bandadas que cruzan el mapa, cada una a su altura.
      const birdAmount = birdsAt(hour, sky);
      birdMaterial.opacity = 0.85 * birdAmount;
      birds.count = birdAmount > 0 ? BIRDS : 0;
      for (let n = 0; n < birds.count; n += 1) {
        const flock = n % 3;
        const period = 40 + flock * 12;
        const t = ((time + flock * 17) % period) / period;
        const across = -10 + t * (map.width + 20);
        const x = across + (unit(n, 'bx') - 0.5) * 4;
        const z = map.height * (0.25 + flock * 0.25) + (unit(n, 'bz') - 0.5) * 4 + Math.sin(time * 0.4 + flock) * 3;
        const flap = 0.55 + 0.45 * Math.abs(Math.sin(time * 9 + n));
        at.set(x, 9 + flock * 1.5 + unit(n, 'by') * 1.5, z);
        size.set(0.9, 0.45 * flap, 1);
        matrix.compose(at, face, size);
        birds.setMatrixAt(n, matrix);
      }
      birds.instanceMatrix.needsUpdate = true;

      // Las luciérnagas: cada una se enciende y se apaga a su ritmo.
      const flyAmount = fliesAt(hour, season, sky);
      flyMaterial.opacity = flyAmount;
      flies.count = flyAmount > 0.01 ? FLIES : 0;
      for (let n = 0; n < flies.count; n += 1) {
        const s = flySpots[n]!;
        const blink = Math.max(0, Math.sin(time * (1.5 + unit(n, 'fr')) + n * 2.1));
        at.set(s.x + Math.sin(time * 0.6 + n) * 0.6, 0.35 + Math.sin(time * 0.9 + n * 1.3) * 0.2 + unit(n, 'fy') * 0.4, s.z + Math.cos(time * 0.5 + n) * 0.6);
        size.setScalar(0.45 * blink);
        matrix.compose(at, face, size);
        flies.setMatrixAt(n, matrix);
      }
      flies.instanceMatrix.needsUpdate = true;

      shown.mist = mist.count;
      shown.birds = birds.count;
      shown.flies = flies.count;
    },
    dispose(): void {
      plane.dispose();
      mistMaterial.dispose();
      birdMaterial.dispose();
      flyMaterial.dispose();
      soft?.dispose();
      birdMap?.dispose();
    },
  };
}
