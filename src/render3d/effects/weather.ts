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
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  LineBasicMaterial,
  LineSegments,
  Points,
  PointsMaterial,
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
const BOLT_COLOUR = new Color('#FFF8D8');

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
  /** Enciende un rayo que cae en este punto del mapa. Se apaga con `step`. */
  strike(x: number, z: number, index: number): void;
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

/** Cuántos vértices tiene el zigzag de un rayo, y cuántas hebras se dibujan. */
const BOLT_STEPS = 9;
const BOLT_STRANDS = 3;

/**
 * El zigzag del rayo, de la nube al suelo, en segmentos sueltos.
 *
 * **Tres hebras juntas y no una raya**, y es por lo que se vio en captura: una
 * `Line` de un píxel de ancho a la distancia de reposo es un pelo que no se
 * distingue del borde de un árbol. Tres hebras separadas medio metro leen como
 * un rayo y siguen costando **una** llamada de dibujo, porque van en la misma
 * malla. Determinista por índice, como todo lo de este módulo.
 */
function boltPoints(x: number, z: number, index: number): Float32Array {
  const out = new Float32Array(BOLT_STRANDS * BOLT_STEPS * 2 * 3);
  // **Veinte celdas de alto, no cuarenta.** La cámara es isométrica: un rayo de
  // cuarenta celdas se proyecta como una raya que cruza la pantalla entera de
  // esquina a esquina y deja de leerse como un rayo —medido en captura—. Veinte
  // cae dentro del encuadre de reposo y se ve tocar el suelo.
  const top = 20;
  let at = 0;
  for (let strand = 0; strand < BOLT_STRANDS; strand += 1) {
    const lean = (strand - 1) * 0.45;
    for (let n = 0; n < BOLT_STEPS; n += 1) {
      for (const step of [n, n + 1]) {
        const t = step / BOLT_STEPS;
        const spread = (1 - t) * 3;
        out[at] = x + lean + (dice(index * 31 + step, 'bx') - 0.5) * spread;
        out[at + 1] = top * (1 - t);
        out[at + 2] = z + lean * 0.5 + (dice(index * 31 + step, 'bz') - 0.5) * spread;
        at += 3;
      }
    }
  }
  return out;
}

export function createWeather(scene: Scene): WeatherLayer {
  const rain = makeRain();
  const snow = makeSnow();
  seed(rain);
  seed(snow);
  scene.add(rain.mesh, snow.mesh);

  const boltGeometry = new BufferGeometry();
  boltGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(BOLT_STRANDS * BOLT_STEPS * 2 * 3), 3),
  );
  const boltMaterial = new LineBasicMaterial({ color: BOLT_COLOUR, transparent: true, opacity: 0.95 });
  const bolt = new LineSegments(boltGeometry, boltMaterial);
  bolt.frustumCulled = false;
  bolt.visible = false;
  scene.add(bolt);

  let falling: 'rain' | 'snow' | null = null;
  let strength = 0;
  let sway = 0;
  let boltLeft = 0;

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
      if (boltLeft > 0) {
        boltLeft -= realDeltaSeconds;
        if (boltLeft <= 0) bolt.visible = false;
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

    strike(x: number, z: number, index: number): void {
      const array = bolt.geometry.getAttribute('position') as BufferAttribute;
      (array.array as Float32Array).set(boltPoints(x, z, index));
      array.needsUpdate = true;
      bolt.geometry.computeBoundingSphere();
      bolt.visible = true;
      boltLeft = SKY.FLASH_SECONDS;
    },

    clear(): void {
      falling = null;
      strength = 0;
      boltLeft = 0;
      rain.mesh.visible = false;
      snow.mesh.visible = false;
      bolt.visible = false;
    },

    dispose(): void {
      for (const field of [rain, snow]) {
        scene.remove(field.mesh);
        field.geometry.dispose();
        (field.mesh.material as LineBasicMaterial | PointsMaterial).dispose();
      }
      scene.remove(bolt);
      boltGeometry.dispose();
      boltMaterial.dispose();
    },
  };
}
