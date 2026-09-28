// Las pisadas (28 sep 2026): la hierba que se aparta y las huellas en la nieve.
//
// Vera: «que se aparte al pisarla, si no es muy costoso; también las pisadas
// en la nieve; y cuando haya nevadas gordas, que se deje un rastro directamente
// en la nieve, que haya zonas que se acumule bastante». Las tres cosas cuelgan
// de una pieza barata: **un mapa de pisadas**, una textura de dos canales a
// cuatro texeles por celda (288 × 448 en el mapa grande, 258 KB) donde cada
// cuerpo que anda va dejando marca. El canal rojo es la pisada reciente —la
// hierba lo lee para quedarse aplastada y volver a erguirse en unos segundos—
// y el verde la huella en la nieve, que dura hasta que otra nevada la tapa o
// el deshielo se la lleva.
//
// Y aparte, lo que se ve en el momento: **las briznas se abren al paso** de los
// cuerpos más cercanos a la vista (`setTramplers`, doce como mucho), que es lo
// que hace la hierba de Breath of the Wild. Va como uniformes al sombreador de
// vértices de la hierba: doce distancias por vértice, nada en un aparato con
// GPU; y sólo de cerca, que de lejos no se ve.
//
// Coste: las marcas se escriben en la CPU en un array (cientos de cuerpos son
// microsegundos) y la textura se sube como mucho cuatro veces por segundo. El
// suelo nevado lee el mapa una vez por píxel, como las sombras de las nubes.
// Es presentación: no toca el estado, no consume azar, y se pierde al cerrar.

import { DataTexture, LinearFilter, RGFormat, UnsignedByteType, Vector2, Vector4, type Material } from 'three';

/** Texeles por celda del mapa de pisadas. */
export const TRAMPLE_TEXELS = 4;
/** Cuántos cuerpos apartan la hierba en vivo. Es el tope del bucle del sombreador. */
export const MAX_TRAMPLERS = 12;

/**
 * TUNE visual. Cuánto dura cada marca, en segundos escénicos: la hierba se
 * yergue en veinte; la huella en la nieve la tapa la nevada en minuto y medio
 * y sin nevar se queda (hasta el deshielo). La nieve deja huella sólo a partir
 * de `SNOW_FROM` de cobertura (`snowCover` va de 0 a 0,72).
 */
const GRASS_RECOVER_SECONDS = 20;
const SNOW_FILL_SECONDS = 90;
export const SNOW_FROM = 0.3;
/** La textura se sube como mucho cada tanto, en segundos reales. */
const UPLOAD_EVERY = 0.25;

const uniforms = {
  uTrample: { value: null as DataTexture | null },
  uTrampleSize: { value: new Vector2(1, 1) },
  uTramplers: { value: Array.from({ length: MAX_TRAMPLERS }, () => new Vector4()) },
  uTramplerCount: { value: 0 },
  uSnowCover: { value: 0 },
};

/** Los uniformes que comparten la hierba y el suelo. */
export function trampleUniforms(): typeof uniforms {
  return uniforms;
}

export interface Trampler { readonly x: number; readonly z: number; readonly radius: number }

/** Los cuerpos que apartan la hierba ahora mismo; se toman los primeros `MAX_TRAMPLERS`. */
export function setTramplers(bodies: readonly Trampler[]): void {
  const count = Math.min(MAX_TRAMPLERS, bodies.length);
  for (let i = 0; i < count; i += 1) {
    const body = bodies[i]!;
    uniforms.uTramplers.value[i]!.set(body.x, body.z, body.radius, 0);
  }
  uniforms.uTramplerCount.value = count;
}

export interface TrampleMap {
  readonly texture: DataTexture;
  /** Deja marca en un punto: `radius` en celdas, `strength` de 0 a 1 por llamada. */
  stamp(x: number, z: number, radius: number, strength: number, snow: boolean): void;
  /** Avanza las marcas: `dt` en segundos escénicos; si nieva, las huellas se tapan. */
  step(dt: number, realDt: number, snowing: boolean, snowCover: number): void;
  /** Cuánta pisada reciente (rojo) y cuánta huella en la nieve (verde) hay en un punto, de 0 a 1. */
  at(x: number, z: number): { readonly grass: number; readonly snow: number };
  dispose(): void;
}

export function createTrampleMap(cellsWide: number, cellsHigh: number): TrampleMap {
  const width = cellsWide * TRAMPLE_TEXELS;
  const height = cellsHigh * TRAMPLE_TEXELS;
  const data = new Uint8Array(width * height * 2);
  const texture = new DataTexture(data, width, height, RGFormat, UnsignedByteType);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;
  uniforms.uTrample.value = texture;
  uniforms.uTrampleSize.value.set(cellsWide, cellsHigh);
  let dirty = false;
  let sinceUpload = 0;
  let snowWas = false;
  // Lo que toca restar se acumula en fracción: por fotograma es menos de una
  // unidad de 255 y redondeado a entero no se restaba nunca (medido: la marca
  // se quedaba en 1 para siempre).
  let grassOwed = 0;
  let snowOwed = 0;

  const add = (index: number, amount: number): void => {
    const next = data[index]! + amount;
    data[index] = next > 255 ? 255 : next;
  };

  return {
    texture,
    stamp(x, z, radius, strength, snow): void {
      const cx = x * TRAMPLE_TEXELS, cz = z * TRAMPLE_TEXELS;
      const r = Math.max(0.5, radius * TRAMPLE_TEXELS);
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(width - 1, Math.ceil(cx + r));
      const z0 = Math.max(0, Math.floor(cz - r)), z1 = Math.min(height - 1, Math.ceil(cz + r));
      for (let tz = z0; tz <= z1; tz += 1) {
        for (let tx = x0; tx <= x1; tx += 1) {
          const d = Math.hypot(tx + 0.5 - cx, tz + 0.5 - cz) / r;
          if (d >= 1) continue;
          const amount = Math.round(255 * strength * (1 - d * d));
          if (amount <= 0) continue;
          const at = (tz * width + tx) * 2;
          add(at, amount);
          if (snow) add(at + 1, amount);
        }
      }
      dirty = true;
    },
    step(dt, realDt, snowing, snowCover): void {
      const snow = snowCover >= SNOW_FROM;
      // Al deshelarse, las huellas se van con la nieve.
      const melt = snowWas && !snow;
      snowWas = snow;
      grassOwed += 255 * dt / GRASS_RECOVER_SECONDS;
      if (snowing) snowOwed += 255 * dt / SNOW_FILL_SECONDS;
      const grassDrop = Math.floor(grassOwed);
      const snowDrop = Math.floor(snowOwed);
      grassOwed -= grassDrop;
      snowOwed -= snowDrop;
      if (grassDrop > 0 || snowDrop > 0 || melt) {
        for (let i = 0; i < data.length; i += 2) {
          const g = data[i]!;
          if (g > 0) data[i] = g > grassDrop ? g - grassDrop : 0;
          const s = data[i + 1]!;
          if (melt) data[i + 1] = 0;
          else if (s > 0 && snowDrop > 0) data[i + 1] = s > snowDrop ? s - snowDrop : 0;
        }
        dirty = true;
      }
      uniforms.uSnowCover.value = snowCover;
      sinceUpload += realDt;
      if (dirty && sinceUpload >= UPLOAD_EVERY) {
        texture.needsUpdate = true;
        dirty = false;
        sinceUpload = 0;
      }
    },
    at(x, z): { grass: number; snow: number } {
      const tx = Math.max(0, Math.min(width - 1, Math.floor(x * TRAMPLE_TEXELS)));
      const tz = Math.max(0, Math.min(height - 1, Math.floor(z * TRAMPLE_TEXELS)));
      const at = (tz * width + tx) * 2;
      return { grass: data[at]! / 255, snow: data[at + 1]! / 255 };
    },
    dispose(): void {
      texture.dispose();
      if (uniforms.uTrample.value === texture) uniforms.uTrample.value = null;
    },
  };
}

/**
 * Las huellas y los ventisqueros en el suelo nevado. Idempotente, como las
 * sombras de las nubes. Con la nieve por debajo de `SNOW_FROM` no hace nada.
 *
 * «Zonas que se acumule bastante»: un ruido de dos octavas hace ventisqueros
 * —más blancos y más azules— que crecen con la cobertura; y la huella se ve
 * más honda donde la nieve es más honda.
 */
export function snowTracks(material: Material): void {
  const marked = material as Material & { userData: { tracked?: boolean } };
  if (marked.userData.tracked === true) return;
  marked.userData.tracked = true;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms['uTrample'] = uniforms.uTrample;
    shader.uniforms['uTrampleSize'] = uniforms.uTrampleSize;
    shader.uniforms['uSnowCover'] = uniforms.uSnowCover;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vTrampleXZ;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vTrampleXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uTrample;
uniform vec2 uTrampleSize;
uniform float uSnowCover;
varying vec2 vTrampleXZ;
float driftHash(vec2 p) { return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453); }
float driftNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(driftHash(i), driftHash(i + vec2(1.0, 0.0)), f.x),
             mix(driftHash(i + vec2(0.0, 1.0)), driftHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  float snowOn = smoothstep(${SNOW_FROM.toFixed(2)}, ${(SNOW_FROM + 0.15).toFixed(2)}, uSnowCover);
  if (snowOn > 0.0) {
    // Los ventisqueros: donde el ruido es alto la nieve es honda, más blanca y más fría.
    float drift = driftNoise(vTrampleXZ * 0.18) * 0.6 + driftNoise(vTrampleXZ * 0.55 + 3.7) * 0.4;
    float deep = smoothstep(0.42, 0.75, drift) * snowOn * uSnowCover;
    // El ventisquero, más blanco y con el borde a la sombra; entre ellos, la
    // nieve fina deja ver un poco el suelo (más gris y más fría).
    float rim = smoothstep(0.3, 0.42, drift) * (1.0 - smoothstep(0.42, 0.55, drift));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.98, 0.99, 1.0), deep * 0.75);
    gl_FragColor.rgb *= 1.0 - rim * snowOn * uSnowCover * 0.09 * vec3(1.0, 0.97, 0.9);
    gl_FragColor.rgb *= 1.0 - (1.0 - smoothstep(0.3, 0.42, drift)) * snowOn * uSnowCover * 0.06;
    // Las huellas: la nieve pisada, gris azulada, y más honda en los ventisqueros.
    float track = texture2D(uTrample, vTrampleXZ / uTrampleSize).g;
    gl_FragColor.rgb *= 1.0 - track * snowOn * (0.24 + 0.2 * deep) * vec3(1.0, 0.95, 0.84);
  }`);
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${key.call(material)}|snow-tracks`;
  material.needsUpdate = true;
}
