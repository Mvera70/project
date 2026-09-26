// El agua viva. 26 sep 2026.
//
// Vera: «mejorar el agua … lo más importante es que se vea viva, que se sienta
// con físicas; visualmente ahora mismo es un poco floja». El río y el lago eran
// una lámina translúcida de un color, con cuatro vértices por celda subiendo y
// bajando seis centímetros: desde la cámara, un suelo azul.
//
// Esto no añade mallas ni luces: **parchea el material del agua** para que su
// superficie tenga una altura que corre y la luz la lea. Todo en el fragmento:
//
//   · **la corriente**: dos capas de ruido que corren río abajo (`waterFlow`,
//     por vértice) y se leen como la superficie inclinándose al sol;
//   · **las vetas**: rayas claras a lo largo de la corriente, como la espuma
//     que arrastra un río de montaña;
//   · **la espuma de la orilla**: donde el agua toca tierra (`waterShore`),
//     blanca y rota por un ruido que también corre;
//   · **la lluvia**: anillos que se abren y se apagan sobre el agua, con
//     `uWaterRain` de 0 a 1;
//   · **la riada**: el agua se enturbia, corre más deprisa y arrastra más
//     espuma, con `uWaterFlood` de 0 a 1.
//
// Coste: un material, sin texturas, dos llamadas a ruido por muestra y tres
// muestras por píxel para la normal. El agua son unos cientos de celdas.
// Decorado puro: no lee el motor; la hora es la de presentación (§4.3).

import { Color, type MeshStandardMaterial } from 'three';

export interface WaterUniforms {
  readonly uWaterTime: { value: number };
  readonly uWaterRain: { value: number };
  readonly uWaterFlood: { value: number };
  readonly uWaterFoam: { value: Color };
  readonly uWaterMud: { value: Color };
}

/** Los mandos del agua: uno para todas las láminas, así corren a la par. */
export function waterUniforms(): WaterUniforms {
  return {
    uWaterTime: { value: 0 },
    uWaterRain: { value: 0 },
    uWaterFlood: { value: 0 },
    uWaterFoam: { value: new Color('#e9f1ef') },
    // El barro de la riada: la tierra del cauce revuelta. TUNE visual.
    // TUNE: café con leche. Mezclar marrón con el azul del río da gris —son
    // casi complementarios y se anulan—, así que la riada no mezcla a medias:
    // toma este color casi entero (capturas del 26 sep, dos veces gris cemento).
    uWaterMud: { value: new Color('#a07c50') },
  };
}

const VERTEX_HEAD = /* glsl */ `
attribute float waterShore;
attribute vec2 waterFlow;
varying float vWaterShore;
varying vec2 vWaterFlow;
varying vec3 vWaterWorld;
`;

const VERTEX_BODY = /* glsl */ `
vWaterShore = waterShore;
vWaterFlow = waterFlow;
vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uWaterTime;
uniform float uWaterRain;
uniform float uWaterFlood;
uniform vec3 uWaterFoam;
uniform vec3 uWaterMud;
varying float vWaterShore;
varying vec2 vWaterFlow;
varying vec3 vWaterWorld;
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x),
             mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// La altura de la superficie: dos capas que corren río abajo; en la riada, más deprisa.
float wHeight(vec2 p, vec2 flow, float t) {
  float speed = 1.0 + uWaterFlood * 1.6;
  return wNoise(p * 1.7 - flow * t * 0.55 * speed) * 0.6
       + wNoise(p * 3.9 + vec2(0.37, -0.21) * t * 0.4 - flow * t * 0.9 * speed) * 0.4;
}
// Los anillos de la lluvia: cada casilla de una rejilla suelta uno que se abre y se apaga.
float wRain(vec2 p, float t) {
  if (uWaterRain <= 0.0) return 0.0;
  float h = 0.0;
  for (int layer = 0; layer < 2; layer++) {
    vec2 q = p * 2.2 + float(layer) * vec2(0.5, 0.31);
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float seed = wHash(id + float(layer) * 7.1);
    vec2 off = (vec2(wHash(id + 1.3), wHash(id + 2.7)) - 0.5) * 0.5;
    float life = fract(t * 0.9 + seed);
    float d = length(f - off);
    float r = life * 0.45;
    h += sin(clamp((d - r) * 28.0, -3.14159, 3.14159)) * (1.0 - life) * smoothstep(0.08, 0.0, abs(d - r));
  }
  return h * uWaterRain;
}
float wSurface(vec2 p) { return wHeight(p, vWaterFlow, uWaterTime) + wRain(p, uWaterTime) * 0.35; }
`;

const FRAGMENT_NORMAL = /* glsl */ `
{
  // La superficie inclinada: la normal sale de la pendiente de la altura.
  vec2 p = vWaterWorld.xz;
  float e = 0.06;
  float h0 = wSurface(p);
  vec3 tilt = vec3(-(wSurface(p + vec2(e, 0.0)) - h0) / e, 0.0, -(wSurface(p + vec2(0.0, e)) - h0) / e) * 0.15;
  normal = normalize(normal + (viewMatrix * vec4(tilt, 0.0)).xyz);
}
`;

const FRAGMENT_COLOUR = /* glsl */ `
{
  vec2 p = vWaterWorld.xz;
  float t = uWaterTime;
  float flowLength = length(vWaterFlow);
  vec2 along = flowLength > 0.001 ? vWaterFlow / flowLength : vec2(0.0, 1.0);
  vec2 across = vec2(-along.y, along.x);
  float speed = 1.0 + uWaterFlood * 1.6;
  // Las vetas: estiradas a lo largo de la corriente y corriendo con ella.
  float streak = wNoise(vec2(dot(p, across) * 2.6, dot(p, along) * 0.45 - t * 0.8 * speed));
  streak = smoothstep(0.68, 0.95, streak) * min(1.0, flowLength);
  // La espuma de la orilla: una línea fina contra la tierra, rota por un
  // ruido que también corre. \`waterShore\` va de 1 en la orilla a 0 una celda
  // dentro, así que sólo lo último de ese degradado es espuma; con el corte en
  // 0,25 el río de dos celdas salía blanco de orilla a orilla (captura del 26 sep).
  float edge = smoothstep(0.8, 1.0, vWaterShore);
  float foam = edge * smoothstep(0.35, 0.7, wNoise(p * 5.0 - vWaterFlow * t * 0.9) + edge * 0.25);
  diffuseColor.rgb = mix(diffuseColor.rgb, uWaterMud, uWaterFlood * 0.88);
  diffuseColor.rgb = mix(diffuseColor.rgb, uWaterFoam, clamp(streak * (0.3 + uWaterFlood * 0.25) + foam * 0.6, 0.0, 1.0));
  // El agua turbia no deja ver el fondo.
  diffuseColor.a = mix(diffuseColor.a, 1.0, max(foam * 0.5, uWaterFlood * 0.8));
}
`;

/**
 * Hace viva una lámina de agua. La geometría tiene que traer `waterShore`
 * (0 en mitad del agua, 1 tocando tierra) y `waterFlow` (hacia dónde corre, en
 * celdas por segundo; cero en el lago). Si le faltan, el agua queda quieta y
 * sin espuma, pero se dibuja igual.
 */
export function liveWater(material: MeshStandardMaterial, uniforms: WaterUniforms): void {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_COLOUR}`);
  };
  material.customProgramCacheKey = () => 'valley-live-water';
  material.needsUpdate = true;
}

/**
 * Los mandos que comparten todas las láminas del valle —el río, el lago, la
 * riada y el agua de fuera del mapa—, para que corran y se mojen a la par. El
 * renderer es uno; los mandos, también.
 */
export const SHARED_WATER: WaterUniforms = waterUniforms();
