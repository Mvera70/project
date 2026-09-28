// La hierba del valle (28 sep 2026).
//
// Pedido por Vera: «un césped, hierba, rastrojos… algo parecido a la hierba de
// Zelda Breath of the Wild. No se puede implementar nada que mate el
// rendimiento». De Breath of the Wild se toma lo que hace que su hierba se
// sienta viva: matas de briznas finas que oscurecen hacia la raíz y se aclaran
// en la punta, color que varía de mata a mata, y el viento pasando en **ondas**
// que recorren el prado en vez de mover cada brizna por su cuenta.
//
// Y el presupuesto manda (skill `performance`): lo que más castiga a una
// tablet son las llamadas de dibujo, así que la hierba entera es **una malla
// instanciada** y el rastrojo de los campos segados otra: dos llamadas, pase lo
// que pase. Sin sombras (ni las echa ni las recibe), con material Lambert —más
// barato por píxel que el PBR del resto—, normales hacia arriba para que la luz
// la trate como el suelo, y el viento entero en el sombreador de vértices con
// los uniformes del bosque (`effects/wind.ts`). En táctil, menos matas.
//
// Se planta desde el mapa, sin azar del motor (`hash32` con la celda): prado,
// claro y marisma; poca en la senda pisada y nada en el camino, el agua, la
// roca, la plaza, las casas ni las obras. Se replanta sólo cuando cambia algo
// de eso (`plant` compara una firma), y la estación la recolorea sin replantar.

import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4,
  MeshLambertMaterial, Quaternion, Vector3,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { cropOf, fieldMoment } from '@engine/world/crops';
import type { Palette } from '@derive/palette';
import type { PlazaPatch } from '@derive/plaza';
import { windShaderUniforms } from '../effects/wind';

/** TUNE visual. Una mata de hierba: cuántas briznas y cómo es cada una, en celdas. */
const GRASS = {
  BLADES: 8,
  HEIGHT: 0.3,
  WIDTH: 0.075,
  SPREAD: 0.22,
  /**
   * Matas por celda **dentro de un prado** y fuera, en escritorio y en táctil.
   * Vera, con una captura de Breath of the Wild: «en Zelda es como un felpudo,
   * cubre todo el suelo … que se noten zonas de prado, si no se puede aplicar a
   * todo por el coste». Medido con la hierba repartida por igual (4 por celda):
   * en la aldea de referencia, 464 llamadas como antes pero con dibujo por
   * software 120 fotogramas en 30 s contra 166. Así que la masa va donde se ve
   * —manchas de prado densas— y fuera quedan matas sueltas, con el mismo total.
   */
  PER_CELL: 14,
  PER_CELL_HANDHELD: 9,
  SPARSE: 1,
  /** Cuánto se dobla la punta con el viento, en celdas, a fuerza 1. */
  BEND: 0.16,
} as const;

/** TUNE visual. El rastrojo de un campo segado: bajo, tieso y color paja. */
const STUBBLE = {
  BLADES: 6,
  HEIGHT: 0.1,
  WIDTH: 0.03,
  SPREAD: 0.1,
  PER_CELL: 4,
  PER_CELL_HANDHELD: 3,
  BEND: 0.02,
} as const;

/**
 * TUNE visual. Las manchas de prado: ruido suave sobre una rejilla de `SCALE`
 * celdas; por encima de `FROM` empieza el prado y a `FULL` es alfombra. Con
 * 0,56 y 0,66 cubre cerca de un tercio del prado del mapa.
 */
const MEADOWS = { SCALE: 7, FROM: 0.56, FULL: 0.66 } as const;

/** Ruido de valor suave, de 0 a 1, estable por semilla del terreno. */
function meadowNoise(seed: number, x: number, z: number): number {
  const gx = x / MEADOWS.SCALE, gz = z / MEADOWS.SCALE;
  const x0 = Math.floor(gx), z0 = Math.floor(gz);
  const fx = gx - x0, fz = gz - z0;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const at = (i: number, j: number): number => unit(seed, `meadow:${i}:${j}`);
  const top = at(x0, z0) + (at(x0 + 1, z0) - at(x0, z0)) * sx;
  const bottom = at(x0, z0 + 1) + (at(x0 + 1, z0 + 1) - at(x0, z0 + 1)) * sx;
  return top + (bottom - top) * sz;
}

/** Cuánto prado hay en una celda, de 0 (matas sueltas) a 1 (alfombra). */
export function meadowWeight(seed: number, x: number, z: number): number {
  const n = meadowNoise(seed, x + 0.5, z + 0.5);
  const t = Math.max(0, Math.min(1, (n - MEADOWS.FROM) / (MEADOWS.FULL - MEADOWS.FROM)));
  return t * t * (3 - 2 * t);
}

/** Cuánta hierba deja cada grado de senda (`map.path`): la pisada, poca; el camino, nada. */
const PATH_KEEP = [1, 0.3, 0, 0] as const;
/** Y cada terreno: el claro de tala crece más bajo, la marisma más alta. */
const TERRAIN_SCALE: Readonly<Partial<Record<number, number>>> = {
  [TERRAIN_CODE.meadow]: 1,
  [TERRAIN_CODE.cleared]: 0.8,
  [TERRAIN_CODE.marsh]: 1.35,
};

interface Tuft { readonly x: number; readonly y: number; readonly z: number; readonly shade: number; readonly pick: number }

export interface Grass {
  readonly group: Group;
  /** Planta la hierba para este estado. No hace nada si nada de lo que la mueve ha cambiado. */
  plant(state: GameState, ground: (x: number, z: number) => number, plaza: PlazaPatch): void;
  /** La estación: el color de la hierba y cuánto la tapa la nieve (0 a 1). */
  season(palette: Palette, snow: number): void;
  /** Cuántas matas hay de cada, para el taller y las pruebas. */
  readonly counts: { readonly grass: number; readonly stubble: number };
  dispose(): void;
}

function unit(seed: number, key: string): number {
  return hash32(seed, key) / 4_294_967_296;
}

/**
 * Una mata: `blades` briznas en corro, **cada una un solo triángulo** afilado
 * que se abre hacia fuera; la curva la pone el viento, que dobla la punta y no
 * la raíz. Un triángulo por brizna es lo que deja poner muchas: la masa es lo
 * que hace alfombra. El color del vértice oscurece la raíz y aclara la punta
 * hacia el amarillo; el de la mata lo pone la instancia. Todas las normales
 * hacia arriba: la luz la trata como al suelo.
 */
function tuftGeometry(spec: typeof GRASS | typeof STUBBLE, salt: number): BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  for (let blade = 0; blade < spec.BLADES; blade += 1) {
    const angle = (blade / spec.BLADES) * Math.PI * 2 + unit(salt, `a${blade}`) * 0.9;
    const tall = spec.HEIGHT * (0.7 + unit(salt, `h${blade}`) * 0.45);
    const lean = spec.SPREAD * (0.5 + unit(salt, `l${blade}`));
    const ox = Math.cos(angle), oz = Math.sin(angle);
    // El ancho, perpendicular a hacia donde se abre.
    const wx = -oz * spec.WIDTH / 2, wz = ox * spec.WIDTH / 2;
    const bx = ox * spec.SPREAD * 0.25, bz = oz * spec.SPREAD * 0.25;
    const tx = bx + ox * lean, tz = bz + oz * lean, ty = tall;
    positions.push(bx - wx, 0, bz - wz, bx + wx, 0, bz + wz, tx, ty, tz);
    // Raíz en sombra, punta al sol: un poco más amarilla que la mata.
    // La raíz, casi del color del suelo: los huecos entre briznas no se leen y
    // la mancha de prado parece continua, que es lo que hace el felpudo.
    colours.push(0.82, 0.86, 0.76, 0.82, 0.86, 0.76, 1.22, 1.2, 0.92);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

const snowUniform = { value: 0 };

/**
 * El material de una hierba: Lambert con el color de vértice y de instancia,
 * y el viento en ondas. La onda avanza por el prado (fase por posición en el
 * mundo) y la dirección se lleva al espacio de la mata para que todas se
 * doblen hacia el mismo lado aunque cada una esté girada.
 */
function grassMaterial(height: number, bend: number): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
  const wind = windShaderUniforms();
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uWindTime'] = wind.uWindTime;
    shader.uniforms['uWindStrength'] = wind.uWindStrength;
    shader.uniforms['uGrassSnow'] = snowUniform;
    // Las dos caras con la misma luz: con `DoubleSide`, Three le da la vuelta a
    // la normal en la cara de atrás y media hierba salía negra.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
  normal = normalize(vNormal);`);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uWindTime;
uniform float uWindStrength;
uniform float uGrassSnow;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 grassOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 grassWind = transpose(mat3(instanceMatrix)) * vec3(0.86, 0.0, 0.51);
#else
  vec3 grassOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 grassWind = vec3(0.86, 0.0, 0.51);
#endif
  grassWind = normalize(vec3(grassWind.x, 0.0, grassWind.z));
  float grassH = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0);
  float grassWave = sin(uWindTime * 1.7 - (grassOrigin.x * 0.42 + grassOrigin.z * 0.25));
  float grassFlutter = sin(uWindTime * 4.7 + grassOrigin.x * 3.1 + grassOrigin.z * 2.3) * 0.3;
  float grassBend = (0.3 + 0.7 * uWindStrength) * (0.35 + 0.65 * max(grassWave, -0.3) + grassFlutter)
    * grassH * grassH * ${bend.toFixed(3)};
  transformed.xz += grassWind.xz * grassBend;
  transformed.y -= abs(grassBend) * 0.3 * grassH;
  transformed.y *= 1.0 - uGrassSnow;`);
  };
  material.customProgramCacheKey = () => `grass:${height}:${bend}`;
  return material;
}

/** La firma de lo que mueve la hierba: si no cambia, no se replanta. */
function signature(state: GameState, plaza: PlazaPatch): string {
  let path = 0, terrain = 0;
  for (let i = 0; i < state.map.path.length; i += 1) {
    path = (path * 31 + state.map.path[i]!) | 0;
    terrain = (terrain * 31 + state.map.terrain[i]!) | 0;
  }
  const buildings = state.buildings.map((b) => {
    const stubble = b.kind === 'field' && (b.lostTick !== null || fieldMoment(cropOf(b), state.tick).phase === 'stubble');
    return `${b.id}:${b.x},${b.y},${b.w},${b.h}:${b.lostTick === null ? 1 : 0}:${stubble ? 1 : 0}`;
  }).join('|');
  const works = state.works.map((w) => `${w.id}:${w.x},${w.y},${w.w},${w.h}`).join('|');
  return `${state.seed}:${path}:${terrain}:${plaza.x},${plaza.y}:${buildings}:${works}`;
}

export function createGrass(handheld: boolean): Grass {
  const group = new Group();
  group.name = 'Valley_Grass';
  const perCell = handheld ? GRASS.PER_CELL_HANDHELD : GRASS.PER_CELL;
  const stubblePerCell = handheld ? STUBBLE.PER_CELL_HANDHELD : STUBBLE.PER_CELL;
  const grassGeometry = tuftGeometry(GRASS, 1);
  const stubbleGeometry = tuftGeometry(STUBBLE, 2);
  const grassMat = grassMaterial(GRASS.HEIGHT, GRASS.BEND);
  const stubbleMat = grassMaterial(STUBBLE.HEIGHT, STUBBLE.BEND);
  let grass: InstancedMesh | null = null;
  let stubble: InstancedMesh | null = null;
  let grassTufts: Tuft[] = [];
  let stubbleTufts: Tuft[] = [];
  let planted = '';
  let palette: Palette | null = null;
  let snow = 0;

  const matrix = new Matrix4();
  const turn = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const at = new Vector3();
  const size = new Vector3();
  const tint = new Color();
  const other = new Color();

  function fill(mesh: InstancedMesh, tufts: readonly Tuft[], seed: number): void {
    tufts.forEach((tuft, n) => {
      turn.setFromAxisAngle(up, unit(seed, `r${n}`) * Math.PI * 2);
      at.set(tuft.x, tuft.y, tuft.z);
      size.setScalar(tuft.shade);
      matrix.compose(at, turn, size);
      mesh.setMatrixAt(n, matrix);
    });
    mesh.count = tufts.length;
    mesh.instanceMatrix.needsUpdate = true;
  }

  function colour(): void {
    if (palette === null) return;
    const p = palette;
    if (grass !== null) {
      grassTufts.forEach((tuft, n) => {
        // Tres verdes del prado, mezclados por mata: como en Breath of the
        // Wild, el prado no es de un color sino de muchos parecidos.
        tint.set(tuft.pick < 0.45 ? p.meadow : p.meadowAlt);
        other.set(tuft.pick > 0.8 ? p.field : p.forest);
        tint.lerp(other, 0.18 + (tuft.pick % 0.2));
        tint.multiplyScalar(0.92 + (tuft.pick * 7 % 1) * 0.16);
        grass!.setColorAt(n, tint);
      });
      if (grass.instanceColor !== null) grass.instanceColor.needsUpdate = true;
    }
    if (stubble !== null) {
      stubbleTufts.forEach((tuft, n) => {
        tint.set(p.field).lerp(other.set(p.accent), 0.35 + tuft.pick * 0.25);
        stubble!.setColorAt(n, tint);
      });
      if (stubble.instanceColor !== null) stubble.instanceColor.needsUpdate = true;
    }
  }

  function remake(which: 'grass' | 'stubble', tufts: Tuft[]): InstancedMesh | null {
    const old = which === 'grass' ? grass : stubble;
    if (old !== null) { group.remove(old); old.dispose(); }
    if (tufts.length === 0) return null;
    const mesh = new InstancedMesh(which === 'grass' ? grassGeometry : stubbleGeometry,
      which === 'grass' ? grassMat : stubbleMat, tufts.length);
    mesh.name = which === 'grass' ? 'Valley_Grass_Tufts' : 'Valley_Stubble';
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // Cubre el valle entero y la cámara casi siempre lo ve: recortarla por mata
    // costaría más de lo que ahorra.
    mesh.frustumCulled = false;
    fill(mesh, tufts, which === 'grass' ? 11 : 12);
    group.add(mesh);
    return mesh;
  }

  return {
    group,
    get counts() { return { grass: grassTufts.length, stubble: stubbleTufts.length }; },
    plant(state, ground, plaza): void {
      const key = `${handheld ? 1 : 0}:${signature(state, plaza)}`;
      if (key === planted) return;
      planted = key;
      const { width, height } = state.map;
      const blocked = new Uint8Array(width * height);
      const stubbleCells = new Uint8Array(width * height);
      const mark = (x: number, y: number, w: number, h: number, into: Uint8Array): void => {
        for (let z = y; z < y + h; z += 1) for (let x2 = x; x2 < x + w; x2 += 1) {
          if (x2 >= 0 && z >= 0 && x2 < width && z < height) into[z * width + x2] = 1;
        }
      };
      for (const b of state.buildings) {
        if (b.kind === 'field') {
          const cut = b.lostTick !== null || fieldMoment(cropOf(b), state.tick).phase === 'stubble';
          mark(b.x, b.y, b.w, b.h, cut ? stubbleCells : blocked);
          if (!cut) continue;
        }
        mark(b.x, b.y, b.w, b.h, blocked);
      }
      for (const w of state.works) mark(w.x, w.y, w.w, w.h, blocked);
      const seed = state.terrainSeed;
      grassTufts = [];
      stubbleTufts = [];
      for (let cell = 0; cell < width * height; cell += 1) {
        const x = cell % width, z = Math.floor(cell / width);
        if (stubbleCells[cell] === 1) {
          for (let k = 0; k < stubblePerCell; k += 1) {
            const px = x + 0.1 + unit(seed, `sx${cell}:${k}`) * 0.8;
            const pz = z + 0.1 + unit(seed, `sz${cell}:${k}`) * 0.8;
            stubbleTufts.push({ x: px, y: ground(px, pz), z: pz, shade: 0.8 + unit(seed, `ss${cell}:${k}`) * 0.4, pick: unit(seed, `sp${cell}:${k}`) });
          }
          continue;
        }
        if (blocked[cell] === 1) continue;
        const scale = TERRAIN_SCALE[state.map.terrain[cell]!];
        if (scale === undefined) continue;
        const keep = PATH_KEEP[Math.min(3, state.map.path[cell] ?? 0)] ?? 0;
        if (keep <= 0) continue;
        if (Math.hypot(x + 0.5 - plaza.x, z + 0.5 - plaza.y) < plaza.radius + 0.5) continue;
        const lush = meadowWeight(seed, x, z);
        const tufts = Math.round(GRASS.SPARSE + (perCell - GRASS.SPARSE) * lush);
        for (let k = 0; k < tufts; k += 1) {
          if (unit(seed, `gk${cell}:${k}`) > keep) continue;
          const px = x + unit(seed, `gx${cell}:${k}`);
          const pz = z + unit(seed, `gz${cell}:${k}`);
          // En el prado, más alta; suelta, más baja: la mancha se lee de lejos.
          const shade = scale * (0.6 + unit(seed, `gs${cell}:${k}`) * 0.35) * (0.8 + 0.45 * lush) * (keep < 1 ? 0.6 : 1);
          grassTufts.push({ x: px, y: ground(px, pz), z: pz, shade, pick: unit(seed, `gp${cell}:${k}`) });
        }
      }
      grass = remake('grass', grassTufts);
      stubble = remake('stubble', stubbleTufts);
      colour();
    },
    season(next, cover): void {
      const changed = palette === null || next.meadow !== palette.meadow || next.meadowAlt !== palette.meadowAlt
        || next.field !== palette.field || next.forest !== palette.forest || next.accent !== palette.accent;
      palette = { ...next };
      snow = Math.max(0, Math.min(1, cover));
      snowUniform.value = snow;
      group.visible = snow < 0.95;
      if (changed) colour();
    },
    dispose(): void {
      grass?.dispose();
      stubble?.dispose();
      grassGeometry.dispose();
      stubbleGeometry.dispose();
      grassMat.dispose();
      stubbleMat.dispose();
    },
  };
}
