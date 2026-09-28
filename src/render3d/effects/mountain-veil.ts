// El velo de la montaña (28 sep 2026).
//
// Vera, a ras de suelo: «nos intentamos poner a ras de suelo y nos alejamos la
// cámara; casi siempre nos chocamos con las montañas». Probó a pensar un túnel
// y lo descartó: «atenuarlo; no quiero que sea invisible del todo, ni que
// desaparezca así, ni que haya un túnel».
//
// Así que la montaña que queda **por delante de lo que se mira** se vuelve un
// velo entero —se ve que está ahí y se ve lo de detrás—, y sólo cuando la
// cámara baja: con la vista de siempre (30,6°) no cambia nada, entra por debajo
// de `FROM` y está entero en `FULL`. La sierra del fondo, que enmarca el valle,
// sigue sólida porque está detrás del punto que se mira.
//
// El velo es un tramado de puntos (`discard` con una matriz de Bayer) y no
// transparencia de verdad: la sierra escribe profundidad y el agua se dibuja
// después sobre su cauce (`ridge.ts`); con mezcla alfa habría que ordenar capas
// y las sombras saldrían raras. El tramado mantiene todo opaco, no añade
// ninguna llamada de dibujo y, como los uniformes son compartidos, no recompila
// nada al moverse.

import { Vector3, type Camera, type Material } from 'three';

/** TUNE: el ángulo de cámara, en grados, al que el velo empieza y al que está entero. */
const FROM = 26;
const FULL = 18;
/** TUNE: cuánto de la montaña se queda con el velo entero: un 45 %, para que se note. */
const KEEP = 0.45;
/** TUNE: en qué franja de profundidad (celdas por delante del punto mirado) entra el velo, para que no haya una raya. */
const NEAR = 1.5;
const RAMP = 4;
/** Lo que tarda el fundido en llegar a su sitio, en segundos. */
const FADE_SECONDS = 0.35;

const uniforms = {
  uVeilFocus: { value: new Vector3() },
  uVeilStrength: { value: 0 },
};

const FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uVeilFocus;
uniform float uVeilStrength;
float veilBayer(vec2 p) {
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.x + q.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
`;

const FRAGMENT_CUT = /* glsl */ `
if (uVeilStrength > 0.0) {
  // En el espacio de la cámara (ortográfica): mira hacia -z, así que lo que
  // tiene la z mayor que el punto mirado está entre la cámara y él.
  float ahead = -vViewPosition.z - uVeilFocus.z;
  float veil = uVeilStrength * clamp((ahead - ${NEAR.toFixed(1)}) / ${RAMP.toFixed(1)}, 0.0, 1.0) * ${(1 - KEEP).toFixed(2)};
  if (veil > veilBayer(gl_FragCoord.xy)) discard;
}
`;

/** Da el velo a un material de montaña. Encadena lo que ya tuviera. */
export function veilMaterial(material: Material): void {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms['uVeilFocus'] = uniforms.uVeilFocus;
    shader.uniforms['uVeilStrength'] = uniforms.uVeilStrength;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${FRAGMENT_HEAD}\nvoid main() {`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAGMENT_CUT}`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}|mountain-veil`;
  material.needsUpdate = true;
}

/**
 * Pone el velo en hora: el punto que se mira, en el espacio de la cámara, y
 * cuánto velo toca por el ángulo. `pitch` en radianes; `dt` en segundos reales.
 */
export function updateMountainVeil(camera: Camera, focus: Vector3, pitch: number, dt: number): void {
  camera.updateMatrixWorld();
  uniforms.uVeilFocus.value.copy(focus).applyMatrix4(camera.matrixWorldInverse);
  const degrees = (pitch * 180) / Math.PI;
  const wanted = Math.max(0, Math.min(1, (FROM - degrees) / (FROM - FULL)));
  const step = Math.min(1, Math.max(0, dt) / FADE_SECONDS);
  const now = uniforms.uVeilStrength.value;
  uniforms.uVeilStrength.value = Math.abs(wanted - now) < 1e-3 ? wanted : now + (wanted - now) * step;
}

/** Cuánto velo hay ahora mismo, de 0 a 1 (para las pruebas y el taller). */
export function mountainVeilStrength(): number {
  return uniforms.uVeilStrength.value;
}
