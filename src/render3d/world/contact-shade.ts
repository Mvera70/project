// GV-1 · El pie de los edificios (29 sep 2026).
//
// La aldea se leía poco anclada al suelo: a mediodía despejado la cara soleada
// de cada casa apoyaba en prado claro sin ninguna transición, y con el cielo
// cubierto —o en el nivel Low, que no dibuja sombras— no quedaba ni la sombra
// del lado de atrás. Lo que ancla un volumen en un valle como éste es la
// oclusión del pie de la pared: el suelo pegado a un muro ve menos cielo.
//
// Es **una textura para todo el valle**, de una componente y
// `CONTACT_SHADE.texels` por celda, hecha en lote desde el plan y leída por el
// sombreador del suelo, igual que el mapa de pisadas (`effects/trample.ts`).
// Ninguna malla, ninguna luz y ninguna llamada de dibujo por edificio; sin
// z-fighting ni halos que floten, porque la que se oscurece es la propia
// superficie del suelo y sigue su cota por construcción. Se rehace sólo cuando
// cambia algún edificio. Presentación pura: no toca el estado ni tira dados.
//
// Se descartaron dos caminos (ver el encargo): oscurecer el color por vértice
// del suelo —un vértice cada tres metros daba una mancha de seis alrededor de
// una casa de dos— y calcomanías instanciadas, que junto a las sendas hundidas
// (`RUT`, hasta 0,05 celdas) quedaban flotando justo donde no debían.

import { DataTexture, LinearFilter, RedFormat, UnsignedByteType, Vector2, type Material } from 'three';
import type { PlannedBuilding } from './plan';
import { CONTACT_SHADE } from '../visual-config';

/** La base de una malla sobre el suelo, en celdas del mapa. */
export interface ContactBase {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
  /** Radio de las esquinas, en celdas. */
  readonly round: number;
}

/**
 * Las bases que oscurecen el suelo: los edificios con tejado y en pie. Un
 * campo o un cementerio son suelo trabajado, y una ruina ya no tiene pared que
 * haga sombra de cielo. La base sale de la huella menos lo que la malla se
 * mete dentro de ella (`CONTACT_SHADE.bases`).
 */
export function contactBases(buildings: readonly PlannedBuilding[]): ContactBase[] {
  const bases: ContactBase[] = [];
  for (const building of buildings) {
    if (!building.roofed || building.ruin) continue;
    const fit = CONTACT_SHADE.bases[building.kind] ?? CONTACT_SHADE.base;
    const insetX = Math.min(fit.x, building.w / 2 - 0.05);
    const insetZ = Math.min(fit.z, building.h / 2 - 0.05);
    bases.push({
      minX: building.x + insetX, maxX: building.x + building.w - insetX,
      minZ: building.z + insetZ, maxZ: building.z + building.h - insetZ,
      round: fit.round,
    });
  }
  return bases;
}

/** Distancia con signo de un punto al rectángulo redondeado: negativa dentro. */
function distanceTo(base: ContactBase, x: number, z: number): number {
  const cx = (base.minX + base.maxX) / 2, cz = (base.minZ + base.maxZ) / 2;
  const hx = (base.maxX - base.minX) / 2, hz = (base.maxZ - base.minZ) / 2;
  const round = Math.min(base.round, hx, hz);
  const qx = Math.abs(x - cx) - (hx - round);
  const qz = Math.abs(z - cz) - (hz - round);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qz), 0) - round;
}

/**
 * La máscara: de 0 (cielo entero) a 255 (pie de la pared), `texels` por celda.
 *
 * Dentro de la base, entera; fuera cae con el cuadrado de la distancia hasta
 * `reach`, que concentra la sombra junto al muro como la de un rincón de
 * verdad. Dos casas juntas **suman** como suma el cielo que pierden
 * (1 − Π(1 − oᵢ)): el callejón entre dos es más oscuro que la fachada suelta.
 * Pura y determinista: la misma lista da los mismos bytes.
 */
export function contactMask(
  cellsWide: number, cellsHigh: number, bases: readonly ContactBase[],
  texels: number = CONTACT_SHADE.texels, reach: number = CONTACT_SHADE.reach,
): Uint8Array {
  const width = cellsWide * texels, height = cellsHigh * texels;
  const open = new Float32Array(width * height).fill(1);
  for (const base of bases) {
    const x0 = Math.max(0, Math.floor((base.minX - reach) * texels));
    const x1 = Math.min(width - 1, Math.ceil((base.maxX + reach) * texels));
    const z0 = Math.max(0, Math.floor((base.minZ - reach) * texels));
    const z1 = Math.min(height - 1, Math.ceil((base.maxZ + reach) * texels));
    for (let tz = z0; tz <= z1; tz += 1) {
      const z = (tz + 0.5) / texels;
      for (let tx = x0; tx <= x1; tx += 1) {
        const d = distanceTo(base, (tx + 0.5) / texels, z);
        if (d >= reach) continue;
        const t = Math.max(0, d) / reach;
        const occluded = (1 - t) * (1 - t);
        open[tz * width + tx]! *= 1 - occluded;
      }
    }
  }
  const mask = new Uint8Array(width * height);
  for (let at = 0; at < mask.length; at += 1) mask[at] = Math.round((1 - open[at]!) * 255);
  return mask;
}

/** El alcance con el que se hace la máscara; el gancho de taller lo cambia. */
let reachNow: number = CONTACT_SHADE.reach;

const uniforms = {
  uContactShade: { value: null as DataTexture | null },
  uContactSize: { value: new Vector2(1, 1) },
  uContactAmbient: { value: CONTACT_SHADE.ambient as number },
  uContactDirect: { value: CONTACT_SHADE.direct as number },
};

export interface ContactShade {
  /** Rehace la máscara con estos edificios. Llamarla sólo cuando cambian. */
  update(buildings: readonly PlannedBuilding[]): void;
  dispose(): void;
}

/** La textura del valle, compartida por el suelo que la lea. */
export function createContactShade(cellsWide: number, cellsHigh: number): ContactShade {
  const texels = CONTACT_SHADE.texels;
  const width = cellsWide * texels, height = cellsHigh * texels;
  const texture = new DataTexture(new Uint8Array(width * height), width, height, RedFormat, UnsignedByteType);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.flipY = false;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  uniforms.uContactShade.value = texture;
  uniforms.uContactSize.value.set(cellsWide, cellsHigh);
  // Un campo que crece o una puerta que cambia de hoja también es «un edificio
  // que cambia», y rehacer la máscara son unos 4 ms de CPU y 516 KB de subida
  // (medido en la villa 7/60): sólo se rehace si cambian las bases.
  let drawn = '';
  return {
    update(buildings): void {
      const bases = contactBases(buildings);
      const key = `${reachNow}|${bases.map((base) => `${base.minX},${base.minZ},${base.maxX},${base.maxZ}`).join(';')}`;
      if (key === drawn) return;
      drawn = key;
      (texture.image.data as Uint8Array).set(contactMask(cellsWide, cellsHigh, bases, texels, reachNow));
      texture.needsUpdate = true;
    },
    dispose(): void {
      if (uniforms.uContactShade.value === texture) uniforms.uContactShade.value = null;
      texture.dispose();
    },
  };
}

/**
 * Para comparar variantes en una toma (`__valleyContactShade`): cuánto se come
 * del cielo y del sol, y el alcance, que pide rehacer la máscara. El juego no
 * lo llama; lo que se elige se escribe en `CONTACT_SHADE`.
 */
export function tuneContactShade(tune: { readonly ambient?: number; readonly direct?: number; readonly reach?: number }): void {
  if (tune.ambient !== undefined) uniforms.uContactAmbient.value = tune.ambient;
  if (tune.direct !== undefined) uniforms.uContactDirect.value = tune.direct;
  if (tune.reach !== undefined) reachNow = tune.reach;
}

/**
 * Pone la máscara en este material de suelo. Idempotente, y encadena con los
 * parches que ya tenga (las nubes, las pisadas).
 *
 * Va donde three aplica su propia oclusión (`aomap_fragment`): quita luz del
 * cielo al pie de la pared y un poco de la del sol, antes del mapeo de tonos,
 * así que se lee igual sobre prado, senda, plaza o nieve.
 */
export function contactShade(material: Material): void {
  const marked = material as Material & { userData: { contact?: boolean } };
  if (marked.userData.contact === true) return;
  marked.userData.contact = true;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms['uContactShade'] = uniforms.uContactShade;
    shader.uniforms['uContactSize'] = uniforms.uContactSize;
    shader.uniforms['uContactAmbient'] = uniforms.uContactAmbient;
    shader.uniforms['uContactDirect'] = uniforms.uContactDirect;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vContactXZ;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vContactXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uContactShade;
uniform vec2 uContactSize;
uniform float uContactAmbient;
uniform float uContactDirect;
varying vec2 vContactXZ;`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
  float contactShadeAt = texture2D(uContactShade, vContactXZ / uContactSize).r;
  reflectedLight.indirectDiffuse *= 1.0 - uContactAmbient * contactShadeAt;
  reflectedLight.directDiffuse *= 1.0 - uContactDirect * contactShadeAt;`);
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${key.call(material)}|contact-shade`;
  material.needsUpdate = true;
}
