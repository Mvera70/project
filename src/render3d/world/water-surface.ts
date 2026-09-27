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
attribute vec2 waterCourse;
varying float vWaterShore;
varying vec2 vWaterFlow;
varying vec3 vWaterWorld;
varying vec2 vWaterCourse;
`;

const VERTEX_BODY = /* glsl */ `
vWaterShore = waterShore;
vWaterFlow = waterFlow;
vWaterCourse = waterCourse;
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
varying vec2 vWaterCourse;
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
  // La advección usa un eje estable. Multiplicar una dirección interpolada
  // por un reloj que lleva horas acumulaba miles de ondas DENTRO de cada
  // triángulo: los abanicos de puntos de la revisión anterior.
  vec2 q = p - vec2(0.12, 0.6) * t * speed;
  // Ondas largas legibles desde la cámara del juego, con ondulación pequeña
  // encima. El ruido fino solo producía brillo de plástico a pocos píxeles.
  return sin(q.y * 3.8 + sin(q.x * 1.4) * 1.5) * 0.12
       + sin(q.y * 7.1 - q.x * 2.2) * 0.045
       + wNoise(q * 1.2) * 0.30;
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
  vec3 tilt = vec3(-(wSurface(p + vec2(e, 0.0)) - h0) / e, 0.0, -(wSurface(p + vec2(0.0, e)) - h0) / e) * 0.055;
  normal = normalize(normal + (viewMatrix * vec4(tilt, 0.0)).xyz);
}
`;

const FRAGMENT_COLOUR = /* glsl */ `
{
  vec2 p = vWaterWorld.xz;
  float t = uWaterTime;
  float flowLength = length(vWaterFlow);
  float river = smoothstep(0.1, 0.5, flowLength);
  float speed = 1.0 + uWaterFlood * 1.6;
  // Las vetas: estiradas a lo largo de la corriente y corriendo con ella.
  // Coordenadas continuas también en las curvas: proyectar la posición del
  // mundo sobre una tangente que cambia por celda dibujaba abanicos allí.
  vec2 course = mix(p, vWaterCourse, river);
  float streak = wNoise(vec2(course.x * 5.0 + sin(course.y * 0.3) * 0.45,
    course.y * 0.6 - t * 0.7 * speed));
  float broken = wNoise(vec2(course.x * 11.0 + 7.0, course.y * 2.2 - t * 1.1 * speed));
  streak = smoothstep(0.64, 0.88, streak) * smoothstep(0.48, 0.78, broken) * river;
  // La espuma de la orilla: una línea fina contra la tierra, rota por un
  // ruido que también corre. \`waterShore\` va de 1 en la orilla a 0 una celda
  // dentro, así que sólo lo último de ese degradado es espuma; con el corte en
  // 0,25 el río de dos celdas salía blanco de orilla a orilla (captura del 26 sep).
  float edge = smoothstep(0.88, 1.0, vWaterShore);
  float foam = edge * smoothstep(0.35, 0.7, wNoise(p * 5.0 - vec2(0.0, 0.54) * t) + edge * 0.25);
  // La ribera es transparente y verdosa; el canal central absorbe más luz.
  // Variación amplia para que la lámina no vuelva a parecer pintura uniforme.
  float pools = wNoise(p * 0.38);
  float bank = smoothstep(0.26, 0.98, abs(vWaterCourse.x));
  float shallow = mix(smoothstep(0.7, 1.0, vWaterShore), bank, river);
  // Canal oscuro que serpentea dentro del cauce; las aguas someras dejan ver
  // el fondo. La distancia transversal se interpola entre secciones enteras,
  // de modo que el degradado no vuelve a comenzar en cada celda.
  float channel = 1.0 - smoothstep(0.1, 0.72,
    abs(vWaterCourse.x + sin(course.y * 0.37) * 0.12));
  diffuseColor.rgb *= 0.66 + pools * 0.28 - channel * river * 0.10;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.34, 0.27), shallow * 0.25);
  diffuseColor.rgb = mix(diffuseColor.rgb, uWaterMud, uWaterFlood * 0.88);
  // Reflejos cortos que cruzan la corriente, rotos en manchas: nunca líneas
  // blancas continuas que dibujen la cuadrícula o las dos orillas enteras.
  float wave = sin(p.y * 4.2 - t * 1.8 * speed
    + wNoise(p * 0.65) * 5.0);
  float glint = smoothstep(0.75, 1.0, wave) * smoothstep(0.48, 0.78, pools);
  diffuseColor.rgb = mix(diffuseColor.rgb, uWaterFoam,
    clamp(streak * (0.18 + uWaterFlood * 0.25) + glint * (0.09 + river * 0.03) + foam * 0.22, 0.0, 0.65));
  diffuseColor.a *= 1.0 - shallow * 0.24;
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
