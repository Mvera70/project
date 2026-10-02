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
//
// **Desde el 26 sep 2026 los pájaros son el modelo de Astra** (`bird.glb`, una
// golondrina de 110 triángulos). Vera: «los pájaros estos no me gustan, hay que
// hacer modelos 3D». Cuerpo y alas son tres mallas instanciadas, y cada ala
// gira sobre su hombro entre las dos poses que Astra dejó en el README (−55° y
// +35°). Sin el modelo —las pruebas, el respaldo en Canvas— siguen siendo la
// uve dibujada.

import {
  AdditiveBlending, CanvasTexture, Color, DynamicDrawUsage, Euler, Group, InstancedMesh, Matrix4,
  MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3, type BufferGeometry, type Camera, type Material, type Mesh,
  type Object3D, type Texture,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import type { Season } from '@engine/state';
import type { SkyKind } from '../../derive/weather';
import { hourAt } from './day-phases';

const MIST = 40;
const BIRDS = 18;
/**
 * A cuánto se escala la golondrina de Astra: mide 0,083 celdas de punta a
 * punta, que es lo que mide una golondrina, y a diez celdas de altura con la
 * cámara de reposo no se vería. TUNE visual: ×10, lo que ocupaba la uve.
 */
const BIRD_SCALE = 10;
/** El batir: las poses del README de Astra, en radianes, alrededor del eje Z del ala. */
const WING_UP = (-55 * Math.PI) / 180;
const WING_DOWN = (35 * Math.PI) / 180;

/** Las tres piezas del pájaro, y dónde está cada una respecto a la raíz del modelo. */
interface BirdPart { geometry: BufferGeometry; material: Material; local: Matrix4 }

function birdParts(model: Object3D): { body: BirdPart[]; left: BirdPart[]; right: BirdPart[] } | null {
  model.updateMatrixWorld(true);
  const root = new Matrix4().copy(model.matrixWorld).invert();
  // Una pieza con dos materiales llega como un grupo con una malla por
  // material: se toman todas, y el ala gira sobre el origen del grupo.
  const part = (name: string): BirdPart[] => {
    const node = model.getObjectByName(name);
    if (node === undefined) return [];
    const pieces: BirdPart[] = [];
    node.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh !== true) return;
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material;
      pieces.push({ geometry: mesh.geometry, material: material.clone(), local: new Matrix4().multiplyMatrices(root, mesh.matrixWorld) });
    });
    return pieces;
  };
  const body = part('bird_body'), left = part('bird_wing_l'), right = part('bird_wing_r');
  return body.length === 0 || left.length === 0 || right.length === 0 ? null : { body, left, right };
}
const FLIES = 90;
/**
 * v5.85 · La bandada que se va al sur en otoño: una uve de grullas, grandes y
 * lentas, muy por encima de las golondrinas. TUNE: quince aves en uve, a
 * catorce celdas de altura, del doble de envergadura que la golondrina en
 * pantalla, y una pasada cada minuto y medio de juego.
 */
const CRANES = 15;
const CRANE_SCALE = 22;
const CRANE_HEIGHT = 14;
const CRANE_PERIOD = 90;
const CRANE_TINT = '#8e9296';

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
  readonly visible: { readonly mist: number; readonly birds: number; readonly flies: number; readonly cranes: number;
    /** Dónde va la grulla que abre la uve, si pasa la bandada: para encuadrarla al mirar. */
    readonly craneLead: { readonly x: number; readonly y: number; readonly z: number } | null };
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

/**
 * Si vuelan pájaros a esta hora, con este cielo y en esta estación.
 *
 * v5.85 · **Son golondrinas, y la golondrina es de paso**: llega en primavera,
 * se queda el verano y se va. Hasta esta ronda cruzaban el cielo de enero
 * igual que el de junio. Sin estación (las pruebas viejas, el respaldo) vuelan
 * como antes.
 */
export function birdsAt(hour: number, sky: SkyKind, season?: Season): number {
  if (season !== undefined && season !== 'spring' && season !== 'summer') return 0;
  if (sky === 'storm' || sky === 'snow') return 0;
  if (hour < 6.5 || hour > 19.5) return 0;
  return sky === 'rain' ? 0.3 : 1;
}

/**
 * v5.85 · Las grullas que se van: sólo en otoño, de día y sin tormenta. Es la
 * contracara de las golondrinas: el cielo de otoño se vacía con una bandada.
 */
export function cranesAt(hour: number, sky: SkyKind, season: Season): number {
  if (season !== 'autumn' || sky === 'storm') return 0;
  if (hour < 7.5 || hour > 18.5) return 0;
  return 1;
}

/** Luciérnagas: noches de primavera y verano, sin lluvia. */
export function fliesAt(hour: number, season: Season, sky: SkyKind): number {
  if (season !== 'spring' && season !== 'summer') return 0;
  if (sky === 'rain' || sky === 'storm') return 0;
  if (hour > 21 || hour < 3.5) return 1;
  if (hour > 20) return hour - 20;
  return 0;
}

export function createAmbience(map: ValleyMap, bird?: Object3D): Ambience {
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
  // La golondrina de Astra, si ha llegado: cuerpo, ala izquierda y derecha.
  const parts = bird === undefined ? null : birdParts(bird);
  const pieces = parts === null ? [] : [
    ...parts.body.map((part) => ({ part, wing: 0 })),
    ...parts.left.map((part) => ({ part, wing: 1 })),
    ...parts.right.map((part) => ({ part, wing: -1 })),
  ];
  const flock = pieces.map(({ part }) => {
    part.material.transparent = true;
    return new InstancedMesh(part.geometry, part.material, BIRDS);
  });
  // Las grullas son el mismo pájaro de Astra, más grande y gris: una malla más
  // por pieza (tres llamadas), y sólo se dibuja en otoño.
  const cranes = pieces.map(({ part }) => {
    const material = part.material.clone();
    const tinted = material as Material & { color?: Color };
    tinted.color?.set(CRANE_TINT);
    return new InstancedMesh(part.geometry, material, CRANES);
  });
  // Las grullas, en su propio grupo: son otra bandada, no más piezas de la golondrina.
  const migrating = new Group();
  migrating.name = 'Valley_Cranes';
  group.add(migrating);
  for (const mesh of [mist, birds, flies, ...flock, ...cranes]) {
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    (cranes.includes(mesh) ? migrating : group).add(mesh);
  }
  const heading = new Quaternion();
  const flight = new Matrix4();
  const wing = new Matrix4();
  const hinge = new Matrix4();
  const tilt = new Euler();
  const mistSpots = Array.from({ length: MIST }, (_, n) => spot(n, 'mist'));
  const flySpots = Array.from({ length: FLIES }, (_, n) => spot(n, 'fly'));

  const matrix = new Matrix4();
  const at = new Vector3();
  const size = new Vector3();
  const face = new Quaternion();
  let time = 0;
  const shown: { mist: number; birds: number; flies: number; cranes: number;
    craneLead: { x: number; y: number; z: number } | null } = { mist: 0, birds: 0, flies: 0, cranes: 0, craneLead: null };

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
      const birdAmount = birdsAt(hour, sky, season);
      birdMaterial.opacity = 0.85 * birdAmount;
      birds.count = birdAmount > 0 && parts === null ? BIRDS : 0;
      if (parts !== null) {
        const count = birdAmount > 0 ? BIRDS : 0;
        for (const mesh of flock) {
          mesh.count = count;
          (mesh.material as Material).opacity = birdAmount;
        }
        for (let n = 0; n < count; n += 1) {
          const band = n % 3;
          const period = 40 + band * 12;
          const t = ((time + band * 17) % period) / period;
          const x = -10 + t * (map.width + 20) + (unit(n, 'bx') - 0.5) * 4;
          const sway = Math.cos(time * 0.4 + band) * 3 * 0.4;
          const z = map.height * (0.25 + band * 0.25) + (unit(n, 'bz') - 0.5) * 4 + Math.sin(time * 0.4 + band) * 3;
          at.set(x, 9 + band * 1.5 + unit(n, 'by') * 1.5, z);
          // Vuela hacia +x (el modelo mira a +z), ladeándose con el vaivén.
          tilt.set(0, Math.atan2(map.width + 20, period * sway), -sway * 0.25);
          heading.setFromEuler(tilt);
          flight.compose(at, heading, size.setScalar(BIRD_SCALE));
          // Bate a ratos y planea a ratos: las golondrinas no aletean sin parar.
          const gliding = Math.sin(time * 0.7 + n * 1.7) < -0.35;
          const beat = gliding ? 0.35 : 0.5 + 0.5 * Math.sin(time * 11 + n);
          const angle = WING_UP + (WING_DOWN - WING_UP) * beat;
          pieces.forEach(({ part, wing: side }, k) => {
            wing.multiplyMatrices(flight, part.local);
            // El ala gira sobre su hombro, que es el origen de su pieza.
            if (side !== 0) wing.multiply(hinge.makeRotationZ(side * angle));
            flock[k]!.setMatrixAt(n, wing);
          });
        }
        for (const mesh of flock) mesh.instanceMatrix.needsUpdate = true;
      }
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

      // Las grullas de otoño: una uve que cruza el valle hacia el sur, a ratos.
      // Se ve la mitad de cada pasada; la otra mitad la bandada está fuera del mapa.
      const craneAmount = parts === null ? 0 : cranesAt(hour, sky, season);
      const craneCount = craneAmount > 0 ? CRANES : 0;
      for (const mesh of cranes) mesh.count = craneCount;
      if (craneCount > 0) {
        const t = (time % CRANE_PERIOD) / (CRANE_PERIOD * 0.5);
        // De la esquina del noreste a la del suroeste: hacia +z y -x.
        const leadX = map.width + 12 - t * (map.width + 24);
        const leadZ = -12 + t * (map.height + 24);
        const dirX = -(map.width + 24), dirZ = map.height + 24;
        const length = Math.hypot(dirX, dirZ);
        const fx = dirX / length, fz = dirZ / length;
        tilt.set(0, Math.atan2(fx, fz), 0);
        heading.setFromEuler(tilt);
        shown.craneLead = { x: leadX, y: CRANE_HEIGHT, z: leadZ };
        for (let n = 0; n < CRANES; n += 1) {
          // La uve: la primera en punta y las demás en dos brazos que se abren atrás.
          const rank = Math.ceil(n / 2);
          const arm = n === 0 ? 0 : n % 2 === 0 ? 1 : -1;
          const back = rank * 1.3;
          const across = arm * rank * 1.1;
          at.set(leadX - fx * back + fz * across, CRANE_HEIGHT + Math.sin(time * 0.3 + n) * 0.2, leadZ - fz * back - fx * across);
          flight.compose(at, heading, size.setScalar(CRANE_SCALE));
          // La grulla planea mucho y bate despacio.
          const beat = 0.5 + 0.5 * Math.sin(time * 3.2 + rank * 0.6);
          const angle = WING_UP * 0.6 + (WING_DOWN - WING_UP * 0.6) * beat;
          pieces.forEach(({ part, wing: side }, k) => {
            wing.multiplyMatrices(flight, part.local);
            if (side !== 0) wing.multiply(hinge.makeRotationZ(side * angle));
            cranes[k]!.setMatrixAt(n, wing);
          });
        }
        for (const mesh of cranes) mesh.instanceMatrix.needsUpdate = true;
      }

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
      shown.birds = parts === null ? birds.count : flock[0]!.count;
      shown.flies = flies.count;
      shown.cranes = craneCount;
      if (craneCount === 0) shown.craneLead = null;
    },
    dispose(): void {
      plane.dispose();
      mistMaterial.dispose();
      birdMaterial.dispose();
      // Las geometrías son del modelo compartido; los materiales, copias nuestras.
      for (const mesh of [...flock, ...cranes]) (mesh.material as Material).dispose();
      flyMaterial.dispose();
      soft?.dispose();
      birdMap?.dispose();
    },
  };
}
