// El valle más vivo · El viento: las copas y los cultivos se mecen.
//
// Pedido por Vera, 25 sep 2026 («que el valle se sienta más vivo»): con todo
// quieto, el bosque parecía de piedra. El viento va en el sombreador de
// vértices de los materiales de hoja —se inyecta con `onBeforeCompile`—, así
// que no cuesta nada por árbol: cada vértice se desplaza según su altura sobre
// la base (el tronco no se mueve, la punta de la copa sí) y con una fase que
// sale de dónde está el árbol, para que el bosque ondule en vez de moverse
// entero a la vez.
//
// Dos uniformes compartidos por todos los materiales: el tiempo y la fuerza.
// El renderer los avanza (`stepWind`) y la fuerza sigue al cielo: brisa con
// cielo claro, más con lluvia, racheado con tormenta. Es decorado: no toca el
// estado ni tira dados. Las sombras no se mecen (el material de sombra es el de
// siempre), y a esta distancia no se nota.

import type { Material } from 'three';
import type { SkyKind } from '../../derive/weather';

const uniforms = {
  uWindTime: { value: 0 },
  uWindStrength: { value: 0 },
};

/**
 * TUNE: cuánto se mece según el cielo, de 0 a 1. Con 0 el bosque se ve de
 * piedra; con 1 a cielo claro parece tormenta siempre.
 */
const STRENGTH: Readonly<Record<SkyKind, number>> = {
  clear: 0.3, overcast: 0.45, rain: 0.6, storm: 1, snow: 0.25,
};
/** TUNE: celdas de desplazamiento por celda² de altura, a fuerza 1. */
const BEND = 0.05;

let target = STRENGTH.clear;

/**
 * Mece este material de hoja. Idempotente: marcarlo dos veces no suma.
 * `bend` escala la curva: los cultivos son bajos y con la de los árboles no se
 * moverían.
 */
export function sway(material: Material, bend = BEND): void {
  const marked = material as Material & { userData: { windy?: boolean } };
  if (marked.userData.windy === true) return;
  marked.userData.windy = true;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uWindTime = uniforms.uWindTime;
    shader.uniforms.uWindStrength = uniforms.uWindStrength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uWindTime;
uniform float uWindStrength;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 windOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#else
  vec3 windOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#endif
  float windHeight = max(0.0, position.y);
  float windPhase = uWindTime * 1.6 + windOrigin.x * 0.35 + windOrigin.z * 0.27;
  float windGust = 0.65 + 0.35 * sin(uWindTime * 0.37 + windOrigin.x * 0.05);
  float windBend = (sin(windPhase) * 0.7 + sin(windPhase * 2.3 + 1.7) * 0.3)
    * uWindStrength * windGust * windHeight * windHeight * ${bend.toFixed(3)};
  transformed.x += windBend;
  transformed.z += windBend * 0.45;`);
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${key.call(material)}|wind${bend}`;
  material.needsUpdate = true;
}

/** Mece un material si es de hoja o de junco (por nombre, como `tintFoliage`). */
export function swayFoliage(material: Material): void {
  const name = material.name;
  if (name.includes('leaf') || name.includes('reed')) sway(material);
}

/** TUNE: los cultivos, que miden un palmo: la curva de los árboles no los movería. */
export const CROP_BEND = 0.6;

/** El cielo que hace: la fuerza del viento va hacia la suya, poco a poco. */
export function windFor(kind: SkyKind): void {
  target = STRENGTH[kind];
}

/** Avanza el viento en segundos de presentación. En pausa no sopla (§11.4). */
export function stepWind(seconds: number): void {
  uniforms.uWindTime.value += seconds;
  const current = uniforms.uWindStrength.value;
  uniforms.uWindStrength.value = current + (target - current) * Math.min(1, seconds * 0.5);
}

/** Para las pruebas y la traza: cuánto sopla ahora. */
export function windStrength(): number {
  return uniforms.uWindStrength.value;
}
