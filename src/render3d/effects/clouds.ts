// El valle más vivo · Sombras de nubes que cruzan el valle.
//
// Pedido por Vera, 25 sep 2026. Van en el sombreador del suelo —como el viento
// en el de las copas (`wind.ts`)—: manchas blandas que se desplazan con el
// viento sobre el prado, más y más grandes cuanto más cubierto está el cielo.
// Sólo oscurecen el suelo, no las casas ni los árboles: a la distancia de juego
// eso basta para leer «pasa una nube», y cuesta un puñado de operaciones por
// píxel del suelo y nada más. Decorado: no toca el estado ni tira dados.

import type { Material } from 'three';
import type { SkyKind } from '../../derive/weather';

const uniforms = {
  uCloudTime: { value: 0 },
  uCloudCover: { value: 0 },
};

/**
 * TUNE: cuánto tapa el cielo, de 0 a 1. Con cielo claro pasa alguna nube
 * suelta; con tormenta casi todo está en sombra y las sombras se funden.
 */
const COVER: Readonly<Record<SkyKind, number>> = {
  clear: 0.28, overcast: 0.7, rain: 0.75, storm: 0.85, snow: 0.6,
};
let target = COVER.clear;

/** Pone sombras de nubes en este material de suelo. Idempotente. */
export function cloudShadows(material: Material): void {
  const marked = material as Material & { userData: { clouded?: boolean } };
  if (marked.userData.clouded === true) return;
  marked.userData.clouded = true;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uCloudTime = uniforms.uCloudTime;
    shader.uniforms.uCloudCover = uniforms.uCloudCover;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCloudXZ;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vCloudXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uCloudTime;
uniform float uCloudCover;
varying vec2 vCloudXZ;
float cloudHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cloudNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cloudHash(i), cloudHash(i + vec2(1.0, 0.0)), f.x),
             mix(cloudHash(i + vec2(0.0, 1.0)), cloudHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  // Dos octavas que viajan con el viento, a velocidades algo distintas.
  vec2 cloudAt = vCloudXZ * 0.045 + vec2(uCloudTime * 0.03, uCloudTime * 0.015);
  float cloud = cloudNoise(cloudAt) * 0.65 + cloudNoise(cloudAt * 2.3 + 7.1) * 0.35;
  float shade = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.18, cloud);
  gl_FragColor.rgb *= 1.0 - 0.4 * shade;`);
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${key.call(material)}|clouds`;
  material.needsUpdate = true;
}

/** El cielo que hace: la cobertura va hacia la suya, poco a poco. */
export function cloudsFor(kind: SkyKind): void {
  target = COVER[kind];
}

/** Avanza las nubes en segundos de presentación. En pausa, quietas (§11.4). */
export function stepClouds(seconds: number): void {
  uniforms.uCloudTime.value += seconds;
  const current = uniforms.uCloudCover.value;
  uniforms.uCloudCover.value = current + (target - current) * Math.min(1, seconds * 0.3);
}

export function cloudCover(): number {
  return uniforms.uCloudCover.value;
}
