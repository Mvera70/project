// U-13 · La lluvia, la nieve y el rayo. design.md §10.8, D.9.
//
// Lo que se ve del cielo que `derive/weather.ts` decide. Tres mallas y ni una
// más, porque el presupuesto de D.9 se cuenta en llamadas de dibujo y no en
// partículas: **una** tira de segmentos para la lluvia, **un** puñado de puntos
// para la nieve y **una** línea para el rayo. Se construyen al empezar y se
// reutilizan: lo que cambia con el cielo es cuántas se dibujan
// (`setDrawRange`), no cuántas existen.
//
// Nada de azar aquí dentro: las gotas se colocan con `hash32` sobre su propio
// índice, así que dos partidas con la misma semilla llueven igual y una captura
// se puede repetir. El motor no se enteraría de todos modos —esta capa no lo
// toca—, pero una tormenta que no se puede fotografiar dos veces no se puede
// juzgar.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Camera,
  type Scene,
} from 'three';
import { SKY } from '@engine/balance';
import { hash32 } from '@engine/rng';
import type { SkyKind } from '../../derive/weather';

/** El cubo de cielo que se llena de gotas, en celdas alrededor de lo que se mira. */
const RAIN_BOX = { width: 70, height: 34, depth: 70 };
// La nieve usa una caja más corta y más baja que la de la lluvia: son 800
// copos (frente a 1200 gotas, `SKY.FLAKES`/`SKY.DROPS`) y repartidos en el
// mismo volumen de 70×34×70 casi todos caían fuera de encuadre o por encima
// de la cámara — de ahí que sólo se vieran tres o cuatro. Una caja más
// pequeña concentra los mismos copos donde la cámara mira.
const SNOW_BOX = { width: 30, height: 16, depth: 30 };

/** Cuánto cae una gota y un copo por segundo escénico, en celdas. */
const RAIN_FALL = 34;
const SNOW_FALL = 3.4;
/** El sesgo de la lluvia: llueve torcido, o parece una reja. */
const RAIN_SLANT = 0.22;
/** Lo que mide una gota de largo, en celdas. Es una raya, no un punto. */
const DROP_LENGTH = 1.1;

const RAIN_COLOUR = new Color('#AEC2D6');
// Azulado, no blanco puro: el cielo y el suelo de invierno son casi blancos, y
// un copo del mismo tono que el fondo no se ve aunque sea grande. El leve tinte
// frío es lo que separa el copo del crema del suelo sin dejar de leerse como
// nieve (comparado en captura contra `snow-01.png`..`snow-08.png`).
const SNOW_COLOUR = new Color('#CFE0EC');
const BOLT_CORE_COLOUR = new Color('#FFFFFF');
const BOLT_GLOW_COLOUR = new Color('#9DB8FF');

/** Un número de 0 a 1 para esta partícula y este eje. */
function dice(index: number, what: string): number {
  return hash32(index, `sky:${what}`) / 4_294_967_296;
}

export interface WeatherLayer {
  /** Qué cae y cuánto. `clear` no dibuja nada y no cuesta nada. */
  set(kind: SkyKind, intensity: number): void;
  /**
   * Mueve lo que cae. `deltaSeconds` es tiempo **escénico**, así que a ×64 la
   * lluvia arrecia con el mundo y en pausa se queda quieta, como todo lo demás
   * que se mueve (§11.4).
   */
  step(
    deltaSeconds: number,
    centre: { readonly x: number; readonly z: number },
    realDeltaSeconds: number,
  ): void;
  /**
   * Enciende un rayo que cae en este punto del mapa. Se apaga con `step`. La
   * cámara orienta las cintas del canal para que se vean de frente.
   */
  strike(x: number, z: number, index: number, camera?: Camera): void;
  /** Cuánto alumbra el rayo ahora, de 0 a 1: el renderer aclara el cielo con esto. */
  readonly flash: number;
  clear(): void;
  dispose(): void;
}

interface Field {
  readonly mesh: LineSegments | Points;
  readonly geometry: BufferGeometry;
  readonly position: BufferAttribute;
  /** Altura de cada partícula, que es lo único que cambia al caer. */
  readonly y: Float32Array;
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly count: number;
  /** La caja de este campo: cada uno tiene la suya (ver `SNOW_BOX`). */
  readonly box: { readonly width: number; readonly height: number; readonly depth: number };
}

/** Las gotas: dos vértices por gota, una raya vertical algo torcida. */
function makeRain(): Field {
  const count = SKY.DROPS;
  const position = new BufferAttribute(new Float32Array(count * 6), 3);
  position.setUsage(DynamicDrawUsage);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', position);
  const material = new LineBasicMaterial({ color: RAIN_COLOUR, transparent: true, opacity: 0.55 });
  const mesh = new LineSegments(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return {
    mesh, geometry, position, count, box: RAIN_BOX,
    x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count),
  };
}

/** Los copos: un punto por copo, que es lo que un copo es. */
function makeSnow(): Field {
  const count = SKY.FLAKES;
  const position = new BufferAttribute(new Float32Array(count * 3), 3);
  position.setUsage(DynamicDrawUsage);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', position);
  const material = new PointsMaterial({
    color: SNOW_COLOUR, size: 0.62, sizeAttenuation: true, transparent: true, opacity: 1,
  });
  const mesh = new Points(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return {
    mesh, geometry, position, count, box: SNOW_BOX,
    x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count),
  };
}

function seed(field: Field): void {
  const { box } = field;
  for (let n = 0; n < field.count; n += 1) {
    field.x[n] = (dice(n, 'x') - 0.5) * box.width;
    field.y[n] = dice(n, 'y') * box.height;
    field.z[n] = (dice(n, 'z') - 0.5) * box.depth;
  }
}

/** Cuántos quiebros tiene el canal principal, y cuántas ramas salen de él. */
const BOLT_STEPS = 14;
const BOLT_BRANCHES = 3;
/** Altura de la nube, en celdas. Veinte cae dentro del encuadre de reposo. */
const BOLT_TOP = 20;

/**
 * El camino del rayo: un canal principal de la nube al suelo, con quiebros
 * cada vez más cortos al bajar, y unas ramas que salen de su tramo alto y se
 * apagan a medio camino. Devuelve polilíneas y el grosor relativo de cada una.
 * Determinista por índice, como todo lo de este módulo.
 */
function boltPaths(x: number, z: number, index: number): { points: Vector3[]; weight: number }[] {
  const main: Vector3[] = [];
  let px = x + (dice(index, 'b0x') - 0.5) * 6;
  let pz = z + (dice(index, 'b0z') - 0.5) * 6;
  for (let n = 0; n <= BOLT_STEPS; n += 1) {
    const t = n / BOLT_STEPS;
    // Hacia el punto de impacto, con un tirón lateral que se acorta al bajar.
    const jitter = (1 - t * 0.7) * 1.6;
    px += (x - px) / (BOLT_STEPS - n + 1) + (dice(index * 97 + n, 'bx') - 0.5) * jitter;
    pz += (z - pz) / (BOLT_STEPS - n + 1) + (dice(index * 97 + n, 'bz') - 0.5) * jitter;
    if (n === BOLT_STEPS) { px = x; pz = z; }
    main.push(new Vector3(px, BOLT_TOP * (1 - t), pz));
  }
  const paths = [{ points: main, weight: 1 }];
  for (let b = 0; b < BOLT_BRANCHES; b += 1) {
    const from = 2 + Math.floor(dice(index * 13 + b, 'branch-at') * (BOLT_STEPS * 0.5));
    const start = main[from]!;
    const side = dice(index * 13 + b, 'branch-side') < 0.5 ? -1 : 1;
    const branch = [start.clone()];
    let bx = start.x;
    let by = start.y;
    let bz = start.z;
    const steps = 3 + Math.floor(dice(index * 13 + b, 'branch-len') * 4);
    for (let n = 1; n <= steps; n += 1) {
      bx += side * (0.6 + dice(index * 131 + b * 7 + n, 'brx') * 1.2);
      bz += (dice(index * 131 + b * 7 + n, 'brz') - 0.5) * 1.4;
      by -= 0.9 + dice(index * 131 + b * 7 + n, 'bry') * 1.1;
      branch.push(new Vector3(bx, Math.max(0.5, by), bz));
    }
    paths.push({ points: branch, weight: 0.45 });
  }
  return paths;
}

/**
 * Las cintas de un camino: un quad por tramo, de ancho `width × weight`,
 * girado hacia la cámara (`across` va a lo ancho de la pantalla). Las ramas se
 * estrechan hacia su punta, que es como se apaga un rayo.
 */
function ribbons(paths: { points: Vector3[]; weight: number }[], width: number, across: Vector3): Float32Array {
  const quads: number[] = [];
  for (const path of paths) {
    const half = (k: number): number => width * path.weight * (path.weight < 1 ? 1 - k / path.points.length : 1) / 2;
    for (let n = 0; n < path.points.length - 1; n += 1) {
      const a = path.points[n]!;
      const b = path.points[n + 1]!;
      const wa = across.clone().multiplyScalar(half(n));
      const wb = across.clone().multiplyScalar(half(n + 1));
      const v = [a.clone().sub(wa), a.clone().add(wa), b.clone().add(wb), b.clone().sub(wb)];
      for (const k of [0, 1, 2, 0, 2, 3]) quads.push(v[k]!.x, v[k]!.y, v[k]!.z);
    }
  }
  return new Float32Array(quads);
}

/** Un degradado de lado a lado: brillante en el centro, nada en los bordes. */
function glowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 4);
  }
  return new CanvasTexture(canvas);
}

/** UVs a lo ancho de cada quad, para el degradado del halo. */
function ribbonUvs(count: number): Float32Array {
  const uv: number[] = [];
  const corner = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (let q = 0; q < count; q += 1) for (const k of [0, 1, 2, 0, 2, 3]) uv.push(corner[k]![0]!, corner[k]![1]!);
  return new Float32Array(uv);
}

/** Cuánto brilla el rayo `t` segundos después de caer, según `SKY.BOLT_FLICKER`. */
export function boltEnvelope(t: number): number {
  let at = 0;
  const steps = SKY.BOLT_FLICKER;
  for (let n = 0; n < steps.length; n += 1) {
    const span = steps[n]!;
    if (t < at + span) {
      if (n % 2 === 1) return 0.08;
      // El último destello se apaga poco a poco; los demás, de golpe.
      return n === steps.length - 1 ? 1 - (t - at) / span : 1;
    }
    at += span;
  }
  return 0;
}

export function createWeather(scene: Scene): WeatherLayer {
  const rain = makeRain();
  const snow = makeSnow();
  seed(rain);
  seed(snow);
  scene.add(rain.mesh, snow.mesh);

  // El rayo: un núcleo blanco y un halo azulado aditivo, dos mallas de cintas;
  // una luz fría en el suelo donde cae y un resplandor en la nube.
  const glowMap = glowTexture();
  const coreGeometry = new BufferGeometry();
  const glowGeometry = new BufferGeometry();
  // Sin prueba de profundidad: un rayo es luz y se ve por delante de las copas.
  // Con ella, el bosque tapaba el canal y sólo asomaba un trazo junto al suelo
  // (primera captura del rayo nuevo).
  // Por las dos caras: las cintas miran a la cámara según el orden de sus
  // vértices, y con la cara de atrás descartada no se pintaba ninguna (la luz
  // del impacto se veía y el canal no; medido en el navegador).
  const coreMaterial = new MeshBasicMaterial({ color: BOLT_CORE_COLOUR, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, side: DoubleSide, fog: false });
  const glowMaterial = new MeshBasicMaterial({
    color: BOLT_GLOW_COLOUR, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, side: DoubleSide, fog: false,
    ...(glowMap === null ? {} : { map: glowMap }),
  });
  const core = new Mesh(coreGeometry, coreMaterial);
  const glow = new Mesh(glowGeometry, glowMaterial);
  core.name = 'Valley_BoltCore';
  glow.name = 'Valley_BoltGlow';
  for (const mesh of [core, glow]) { mesh.frustumCulled = false; mesh.renderOrder = 10; }
  const impact = new PointLight('#cfdcff', 0, 14, 1.4);
  const cloud = new Sprite(new SpriteMaterial({
    color: '#dfe6ff', transparent: true, depthWrite: false, blending: AdditiveBlending,
    ...(glowMap === null ? {} : { map: glowMap }),
  }));
  // Las cuatro piezas en un grupo que se enciende y se apaga entero: el
  // presupuesto de D.9 sigue siendo tres piezas de clima, y sin rayo la luz del
  // impacto no está en la escena (una luz cuesta en todos los materiales
  // aunque tenga intensidad cero).
  const bolt = new Group();
  bolt.name = 'Valley_Bolt';
  bolt.visible = false;
  bolt.add(glow, core, impact, cloud);
  for (const part of [glow, core, cloud]) part.visible = true;
  scene.add(bolt);
  let boltAge = -1;
  let flash = 0;

  let falling: 'rain' | 'snow' | null = null;
  let strength = 0;
  let sway = 0;

  const paint = (field: Field, centre: { x: number; z: number }, drops: number): void => {
    const array = field.position.array as Float32Array;
    const stretch = field === rain;
    for (let n = 0; n < drops; n += 1) {
      const x = centre.x + (field.x[n] as number) + (stretch ? 0 : Math.sin(sway + n) * 0.6);
      const y = field.y[n] as number;
      const z = centre.z + (field.z[n] as number);
      if (stretch) {
        array[n * 6] = x;
        array[n * 6 + 1] = y;
        array[n * 6 + 2] = z;
        array[n * 6 + 3] = x - DROP_LENGTH * RAIN_SLANT;
        array[n * 6 + 4] = y - DROP_LENGTH;
        array[n * 6 + 5] = z;
      } else {
        array[n * 3] = x;
        array[n * 3 + 1] = y;
        array[n * 3 + 2] = z;
      }
    }
    field.geometry.setDrawRange(0, stretch ? drops * 2 : drops);
    field.position.needsUpdate = true;
    field.geometry.computeBoundingSphere();
  };

  return {
    set(kind: SkyKind, intensity: number): void {
      falling = kind === 'snow' ? 'snow' : (kind === 'rain' || kind === 'storm') ? 'rain' : null;
      strength = falling === null ? 0 : Math.max(0, Math.min(1, intensity));
      rain.mesh.visible = falling === 'rain';
      snow.mesh.visible = falling === 'snow';
    },

    step(deltaSeconds: number, centre: { x: number; z: number }, realDeltaSeconds: number): void {
      // El rayo dura lo que dura **de reloj real**: un destello es un destello
      // a cualquier velocidad, y con el escénico a ×64 se habría apagado antes
      // de pintarse una sola vez.
      if (boltAge >= 0) {
        boltAge += realDeltaSeconds;
        const total = SKY.BOLT_FLICKER.reduce((sum, one) => sum + one, 0);
        flash = boltEnvelope(boltAge);
        coreMaterial.opacity = flash;
        glowMaterial.opacity = 0.75 * flash;
        impact.intensity = 9 * flash;
        (cloud.material as SpriteMaterial).opacity = 0.6 * flash;
        if (boltAge > total) {
          boltAge = -1;
          flash = 0;
          bolt.visible = false;
          impact.intensity = 0;
        }
      }
      if (falling === null) return;
      const field = falling === 'rain' ? rain : snow;
      const fall = (falling === 'rain' ? RAIN_FALL : SNOW_FALL) * deltaSeconds;
      sway += deltaSeconds * 1.4;
      const drops = Math.max(1, Math.round(field.count * strength));
      for (let n = 0; n < drops; n += 1) {
        let y = (field.y[n] as number) - fall;
        if (y < 0) y += field.box.height;
        field.y[n] = y;
      }
      paint(field, centre, drops);
    },

    strike(x: number, z: number, index: number, camera?: Camera): void {
      // A lo ancho de la pantalla: la primera columna de la matriz de la cámara.
      const across = new Vector3(1, 0, 0);
      if (camera !== undefined) {
        camera.updateMatrixWorld();
        across.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      }
      const paths = boltPaths(x, z, index);
      const corePositions = ribbons(paths, SKY.BOLT_CORE, across);
      const glowPositions = ribbons(paths, SKY.BOLT_GLOW, across);
      coreGeometry.setAttribute('position', new BufferAttribute(corePositions, 3));
      glowGeometry.setAttribute('position', new BufferAttribute(glowPositions, 3));
      glowGeometry.setAttribute('uv', new BufferAttribute(ribbonUvs(glowPositions.length / 18), 2));
      coreGeometry.computeBoundingSphere();
      glowGeometry.computeBoundingSphere();
      bolt.visible = true;
      // A pleno desde el primer fotograma: el rayo anterior dejó los
      // materiales apagados al terminar, y hasta el siguiente paso no se
      // reponían.
      coreMaterial.opacity = 1;
      glowMaterial.opacity = 0.75;
      (cloud.material as SpriteMaterial).opacity = 0.6;
      impact.intensity = 9;
      impact.position.set(x, 1.2, z);
      const top = paths[0]!.points[0]!;
      cloud.position.set(top.x, top.y + 0.5, top.z);
      cloud.scale.set(14, 5, 1);
      boltAge = 0;
      flash = 1;
    },

    get flash(): number { return flash; },

    clear(): void {
      falling = null;
      strength = 0;
      boltAge = -1;
      flash = 0;
      rain.mesh.visible = false;
      snow.mesh.visible = false;
      bolt.visible = false;
      impact.intensity = 0;
    },

    dispose(): void {
      for (const field of [rain, snow]) {
        scene.remove(field.mesh);
        field.geometry.dispose();
        (field.mesh.material as LineBasicMaterial | PointsMaterial).dispose();
      }
      scene.remove(bolt);
      coreGeometry.dispose();
      glowGeometry.dispose();
      coreMaterial.dispose();
      glowMaterial.dispose();
      (cloud.material as SpriteMaterial).dispose();
      glowMap?.dispose();
    },
  };
}
