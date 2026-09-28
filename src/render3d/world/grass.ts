// La hierba del valle (28 sep 2026).
//
// Pedido por Vera: «un césped, hierba, rastrojos… algo parecido a la hierba de
// Zelda Breath of the Wild. No se puede implementar nada que mate el
// rendimiento». Y al ver la primera versión, con una captura de Zelda: «en
// Zelda es como un felpudo, cubre todo el suelo… que se noten zonas de prado,
// si no se puede aplicar a todo por el coste». Y después: «mejorar aún más la
// hierba; se debe optimizar para poder poner zonas más densas». De Breath of
// the Wild se toma lo que hace que su hierba se sienta viva: briznas finas que
// oscurecen hacia la raíz y se aclaran en la punta, color que varía de mata a
// mata, el suelo de debajo verde hondo para que los huecos no se lean, y el
// viento pasando en **ondas** que recorren el prado.
//
// Y el presupuesto manda (skill `performance`). Lo que cuesta la hierba son
// vértices —medido: el coste es de vértices y no de píxeles—, así que el
// trabajo es no gastar vértices donde no se ven:
//
// 1. **Por tramos** de `TILE` celdas, cada uno una malla instanciada con su
//    esfera: la cámara recorta los tramos que no ve. De cerca, que es cuando la
//    hierba se mira, se dibujan uno o dos de quince.
// 2. **Menos matas cuanto más alta la vista** (`zoom`): dentro de cada tramo las
//    matas van ordenadas por una prioridad al azar, así que dibujar las `n`
//    primeras es dibujar una muestra uniforme. De lejos, una mata son cuatro
//    píxeles: con un cuarto se ve lo mismo.
// 3. Sin sombras (ni las echa ni las recibe), material Lambert —más barato por
//    píxel que el PBR del resto—, normales hacia arriba para que la luz la trate
//    como al suelo, y el viento entero en el sombreador de vértices con los
//    uniformes del bosque (`effects/wind.ts`). En táctil, menos matas.
//
// Con eso las manchas de prado pueden ir el doble de densas que la primera
// versión (14 → 28 matas por celda) y costar menos en la vista de siempre.
//
// La estación la pone la paleta (verde en primavera, amarillo en verano, paja
// en otoño) y la nieve la cubre: blanquea desde las puntas, la entierra y con la
// nieve asentada la apaga entera. Se planta desde el mapa, sin azar del motor
// (`hash32` con la celda): prado, claro y marisma; poca en la senda pisada y
// nada en el camino, el agua, la roca, la plaza, las casas ni las obras. Se
// replanta sólo cuando cambia algo de eso (`plant` compara una firma).

import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh,
  Matrix4, MeshLambertMaterial, Quaternion, Vector3,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { cropOf, fieldMoment } from '@engine/world/crops';
import type { Palette } from '@derive/palette';
import type { PlazaPatch } from '@derive/plaza';
import { windShaderUniforms } from '../effects/wind';
import { MAX_TRAMPLERS, trampleUniforms } from '../effects/trample';

/** TUNE visual. Una mata de hierba: cuántas briznas y cómo es cada una, en celdas. */
const GRASS = {
  BLADES: 8,
  HEIGHT: 0.3,
  WIDTH: 0.07,
  SPREAD: 0.22,
  /**
   * Matas por celda **dentro de un prado** y fuera, en escritorio y en táctil.
   * La primera versión repartía 4 por celda y Vera la vio rala; con manchas
   * densas y el resto suelto se llegó a 14; con los tramos y el recorte por
   * altura de la vista, a 28 sin gastar más en la vista de siempre (medido en
   * la aldea de referencia, ver el registro de cambios v4.88).
   */
  PER_CELL: 28,
  PER_CELL_HANDHELD: 18,
  /** Cuánto se dobla la punta con el viento, en celdas, a fuerza 1. */
  BEND: 0.16,
} as const;

/**
 * TUNE visual. El césped de fuera de las manchas. Vera, al ver la mata alta
 * suelta por el prado: «poner lo mismo que haces en los conjuntos pero suelto
 * queda muy mal». La primera versión era una mata plana en estrella y tampoco:
 * «me refería a hacerla pequeñita, muy chiquitita, como cuando cortas el césped
 * muy corto y algunas puntas se quedan para arriba; hay alguna zona que es
 * muerta, otra que no; bajita, con poca densidad en algunos sitios». Así que
 * briznas cortas y casi verticales, pocas por mata, en rodales vivos con calvas
 * entre medias (un ruido de tres celdas, con el 40 % del prado sin nada).
 */
const LAWN = {
  BLADES: 4,
  HEIGHT: 0.075,
  WIDTH: 0.028,
  SPREAD: 0.09,
  /** Matas por celda dentro de un rodal vivo. */
  PER_CELL: 3,
  PER_CELL_HANDHELD: 2,
  /** Celdas de la rejilla del ruido que hace los rodales, y desde qué valor hay césped. */
  CLUMP: 3,
  ALIVE_FROM: 0.4,
  BEND: 0.03,
} as const;

/**
 * Cuánto tarda una mata en crecer del suelo cuando el zoom la va trayendo, en
 * fracción de la densidad. Vera: «no se puede ver muy exagerado; que vayas
 * viendo que se va pintando la hierba va a ser muy feo». Las matas no aparecen:
 * las que están junto al umbral de la densidad se dibujan pequeñas y crecen
 * con el zoom, así que ninguna salta de golpe.
 */
const GROW_BAND = 0.12;

/**
 * TUNE visual. Cómo se aparta la hierba al pisarla (`effects/trample.ts`): lo
 * que se abre la punta, en celdas, con un cuerpo encima; lo que se agacha; y
 * lo que queda aplastada después según el mapa de pisadas.
 */
const TRAMPLE = { PUSH: 0.32, DUCK: 0.55, FLAT: 0.7, SPLAY: 0.6 } as const;

/** Peso de prado a partir del cual hay matas altas; por debajo, sólo el césped. */
const TALL_FROM = 0.12;

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

/** Celdas de lado de cada tramo: 24 son 3 × 5 tramos en el mapa grande, quince mallas como mucho. */
const TILE = 24;

/**
 * TUNE visual. Cuántas matas se dibujan según la altura de la vista, en celdas
 * (`view.height`): todas hasta `NEAR`, `MIN` desde `FAR`, suave entre medias.
 * La vista de una aldea recién fundada mide unas 36 celdas (se dibuja el 57 %),
 * la más cercana 13 (todas). Medido en la aldea de referencia con dibujo por
 * software: con 22/64/0,25 la vista por defecto dibujaba el 80 % y costaba 711
 * mil triángulos; con esta curva, ver el registro de cambios v4.88.
 */
const LOD = { NEAR: 18, FAR: 52, MIN: 0.22 } as const;

/** Con esta nieve asentada la hierba está enterrada y se apaga entera (`snowCover` llega a 0,72). */
const BURIED = 0.7;

/**
 * TUNE visual. Las manchas de prado: ruido suave sobre una rejilla de `SCALE`
 * celdas; por encima de `FROM` empieza el prado y a `FULL` es alfombra. Con
 * 0,56 y 0,66 cubre cerca de un tercio del prado del mapa.
 */
const MEADOWS = { SCALE: 7, FROM: 0.56, FULL: 0.66 } as const;

/** Cuánta hierba deja cada grado de senda (`map.path`): la pisada, poca; el camino, nada. */
const PATH_KEEP = [1, 0.3, 0, 0] as const;
/** Y cada terreno: el claro de tala crece más bajo, la marisma más alta. */
const TERRAIN_SCALE: Readonly<Partial<Record<number, number>>> = {
  [TERRAIN_CODE.meadow]: 1,
  [TERRAIN_CODE.cleared]: 0.8,
  [TERRAIN_CODE.marsh]: 1.35,
};

interface Tuft {
  readonly x: number; readonly y: number; readonly z: number;
  readonly shade: number; readonly pick: number; readonly order: number;
}

interface Chunk { readonly mesh: InstancedMesh; readonly tufts: readonly Tuft[] }

export interface Grass {
  readonly group: Group;
  /**
   * Planta la hierba para este estado. No hace nada si nada de lo que la mueve
   * ha cambiado. `wear` es el desgaste que pinta el suelo además del del motor
   * —el camino del valle y sus hombros (`world/road.ts`)—: donde el suelo se
   * pinta pisado, la hierba no crece.
   */
  plant(state: GameState, ground: (x: number, z: number) => number, plaza: PlazaPatch, wear?: Uint8Array): void;
  /** La estación: el color de la hierba y cuánto la tapa la nieve (0 a 1). */
  season(palette: Palette, snow: number): void;
  /** La altura de la vista, en celdas: de lejos se dibujan menos matas. */
  zoom(viewHeight: number): void;
  /** Cuántas matas hay plantadas de cada, y cuántas se dibujan ahora. */
  readonly counts: { readonly grass: number; readonly lawn: number; readonly stubble: number; readonly drawn: number };
  dispose(): void;
}

function unit(seed: number, key: string): number {
  return hash32(seed, key) / 4_294_967_296;
}

/** Ruido de valor suave, de 0 a 1, estable por semilla del terreno. */
function valueNoise(seed: number, x: number, z: number, scale: number, salt: string): number {
  const gx = x / scale, gz = z / scale;
  const x0 = Math.floor(gx), z0 = Math.floor(gz);
  const fx = gx - x0, fz = gz - z0;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const at = (i: number, j: number): number => unit(seed, `${salt}:${i}:${j}`);
  const top = at(x0, z0) + (at(x0 + 1, z0) - at(x0, z0)) * sx;
  const bottom = at(x0, z0 + 1) + (at(x0 + 1, z0 + 1) - at(x0, z0 + 1)) * sx;
  return top + (bottom - top) * sz;
}

/** Cuánto prado hay en una celda, de 0 (césped bajo) a 1 (alfombra). El suelo lo lee también. */
export function meadowWeight(seed: number, x: number, z: number): number {
  const n = valueNoise(seed, x + 0.5, z + 0.5, MEADOWS.SCALE, 'meadow');
  const t = Math.max(0, Math.min(1, (n - MEADOWS.FROM) / (MEADOWS.FULL - MEADOWS.FROM)));
  return t * t * (3 - 2 * t);
}

/** Cuántas de las matas se dibujan a esta altura de vista, de `LOD.MIN` a 1. */
export function densityAt(viewHeight: number): number {
  const t = Math.max(0, Math.min(1, (viewHeight - LOD.NEAR) / (LOD.FAR - LOD.NEAR)));
  return 1 - (1 - LOD.MIN) * t * t * (3 - 2 * t);
}

/**
 * Una mata: `blades` briznas en corro, **cada una un solo triángulo** afilado
 * que se abre hacia fuera; la curva la pone el viento, que dobla la punta y no
 * la raíz. Un triángulo por brizna es lo que deja poner muchas: la masa es lo
 * que hace alfombra. El color del vértice oscurece la raíz y aclara la punta
 * hacia el amarillo; el de la mata lo pone la instancia. Todas las normales
 * hacia arriba: la luz la trata como al suelo.
 */
function tuftGeometry(spec: typeof GRASS | typeof LAWN | typeof STUBBLE, salt: number): BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  for (let blade = 0; blade < spec.BLADES; blade += 1) {
    const angle = (blade / spec.BLADES) * Math.PI * 2 + unit(salt, `a${blade}`) * 0.9;
    const tall = spec.HEIGHT * (0.7 + unit(salt, `h${blade}`) * 0.45);
    const lean = spec.SPREAD * (0.5 + unit(salt, `l${blade}`));
    const ox = Math.cos(angle), oz = Math.sin(angle);
    const wx = -oz * spec.WIDTH / 2, wz = ox * spec.WIDTH / 2;
    const bx = ox * spec.SPREAD * 0.25, bz = oz * spec.SPREAD * 0.25;
    const tx = bx + ox * lean, tz = bz + oz * lean, ty = tall;
    positions.push(bx - wx, 0, bz - wz, bx + wx, 0, bz + wz, tx, ty, tz);
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

interface Kind { readonly geometry: BufferGeometry; readonly material: MeshLambertMaterial; readonly name: string; readonly grow: { value: number } }

/**
 * El material de una hierba: Lambert con el color de vértice y de instancia,
 * el viento en ondas y la nieve. La onda avanza por el prado (fase por
 * posición en el mundo) y la dirección se lleva al espacio de la mata para que
 * todas se doblen hacia el mismo lado aunque cada una esté girada. La nieve
 * blanquea desde las puntas —es donde se posa— y entierra la brizna.
 */
function grassMaterial(height: number, bend: number, grow: { value: number }): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
  const wind = windShaderUniforms();
  const trample = trampleUniforms();
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uWindTime'] = wind.uWindTime;
    shader.uniforms['uWindStrength'] = wind.uWindStrength;
    shader.uniforms['uGrassSnow'] = snowUniform;
    shader.uniforms['uGrowEdge'] = grow;
    shader.uniforms['uTrample'] = trample.uTrample;
    shader.uniforms['uTrampleSize'] = trample.uTrampleSize;
    shader.uniforms['uTramplers'] = trample.uTramplers;
    shader.uniforms['uTramplerCount'] = trample.uTramplerCount;
    // Las dos caras con la misma luz: con `DoubleSide`, Three le da la vuelta a
    // la normal en la cara de atrás y media hierba salía negra.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
  normal = normalize(vNormal);`);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uWindTime;
uniform float uWindStrength;
uniform float uGrassSnow;
uniform float uGrowEdge;
uniform sampler2D uTrample;
uniform vec2 uTrampleSize;
uniform vec4 uTramplers[${MAX_TRAMPLERS}];
uniform int uTramplerCount;
attribute float grassRank;`)
      .replace('#include <color_vertex>', `#include <color_vertex>
  float snowH = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0);
  vColor.rgb = mix(vColor.rgb, vec3(0.93, 0.95, 0.98), clamp(uGrassSnow * (0.5 + 0.9 * snowH), 0.0, 1.0));`)
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
  // Quien pasa la aparta: las briznas se abren lejos del cuerpo y se agachan.
  vec2 trampleAway = vec2(0.0);
  float trampleUnder = 0.0;
  for (int i = 0; i < ${MAX_TRAMPLERS}; i++) {
    if (i >= uTramplerCount) break;
    vec2 gap = grassOrigin.xz - uTramplers[i].xy;
    float dist = length(gap);
    float under = 1.0 - smoothstep(0.0, uTramplers[i].z, dist);
    trampleAway += gap / max(dist, 0.05) * under;
    trampleUnder = max(trampleUnder, under);
  }
  // Y lo pisado hace poco sigue aplastado un rato (el mapa de pisadas).
  float trod = texture2D(uTrample, grassOrigin.xz / uTrampleSize).r;
  trampleUnder = max(trampleUnder, trod * ${TRAMPLE.FLAT.toFixed(2)});
#ifdef USE_INSTANCING
  vec3 trampleLocal = transpose(mat3(instanceMatrix)) * vec3(trampleAway.x, 0.0, trampleAway.y);
#else
  vec3 trampleLocal = vec3(trampleAway.x, 0.0, trampleAway.y);
#endif
  transformed.xz += trampleLocal.xz * grassH * grassH * ${TRAMPLE.PUSH.toFixed(2)};
  transformed.xz *= 1.0 + trod * grassH * ${TRAMPLE.SPLAY.toFixed(2)};
  transformed.y *= 1.0 - trampleUnder * grassH * ${TRAMPLE.DUCK.toFixed(2)};
  transformed.y *= max(0.0, 1.0 - uGrassSnow * ${(1 / BURIED).toFixed(3)});
  // Las matas junto al umbral del zoom, pequeñas: crecen al acercarse en vez de aparecer.
  transformed *= 1.0 - smoothstep(uGrowEdge - ${GROW_BAND.toFixed(2)}, uGrowEdge, grassRank);`);
  };
  material.customProgramCacheKey = () => `grass:${height}:${bend}`;
  return material;
}

/** La firma de lo que mueve la hierba: si no cambia, no se replanta. */
function signature(state: GameState, plaza: PlazaPatch, wear: Uint8Array | undefined): string {
  let path = 0, terrain = 0;
  for (let i = 0; i < state.map.path.length; i += 1) {
    path = (path * 31 + Math.max(state.map.path[i]!, wear?.[i] ?? 0)) | 0;
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
  const lawnPerCell = handheld ? LAWN.PER_CELL_HANDHELD : LAWN.PER_CELL;
  const kind = (spec: typeof GRASS | typeof LAWN | typeof STUBBLE, salt: number, name: string): Kind => {
    const grow = { value: 1 };
    return { geometry: tuftGeometry(spec, salt), material: grassMaterial(spec.HEIGHT, spec.BEND, grow), name, grow };
  };
  const kinds = {
    grass: kind(GRASS, 1, 'Valley_Grass_Tufts'),
    lawn: kind(LAWN, 3, 'Valley_Lawn'),
    stubble: kind(STUBBLE, 2, 'Valley_Stubble'),
  } as const;
  let grassChunks: Chunk[] = [];
  let lawnChunks: Chunk[] = [];
  let stubbleChunks: Chunk[] = [];
  let planted = '';
  let palette: Palette | null = null;
  let density = 1;

  const matrix = new Matrix4();
  const turn = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const at = new Vector3();
  const size = new Vector3();
  const tint = new Color();
  const other = new Color();

  function chunk(which: keyof typeof kinds, tufts: Tuft[], tile: number, seed: number): Chunk {
    // Ordenadas por su prioridad: las `n` primeras son una muestra uniforme.
    tufts.sort((a, b) => a.order - b.order);
    // La geometría se copia por tramo para llevar el rango de cada mata (su
    // puesto en la fila, de 0 a 1): es lo que el sombreador compara con el
    // umbral del zoom para hacerla crecer. Veinticuatro vértices: no pesa.
    const geometry = kinds[which].geometry.clone();
    geometry.setAttribute('grassRank', new InstancedBufferAttribute(
      Float32Array.from(tufts, (_, n) => n / Math.max(1, tufts.length - 1)), 1));
    const mesh = new InstancedMesh(geometry, kinds[which].material, tufts.length);
    mesh.name = `${kinds[which].name}_${tile}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    tufts.forEach((tuft, n) => {
      turn.setFromAxisAngle(up, unit(seed, `r${tile}:${n}`) * Math.PI * 2);
      at.set(tuft.x, tuft.y, tuft.z);
      size.setScalar(tuft.shade);
      matrix.compose(at, turn, size);
      mesh.setMatrixAt(n, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // La esfera con todas las matas, antes de que el recorte por altura baje
    // la cuenta: es lo que deja a la cámara saltarse el tramo entero.
    mesh.computeBoundingSphere();
    mesh.frustumCulled = true;
    group.add(mesh);
    return { mesh, tufts };
  }

  function applyDensity(): void {
    // El umbral va un poco por encima de la densidad: las matas de la banda
    // de crecimiento se dibujan (pequeñas) y a densidad 1 ninguna se encoge.
    const edge = (d: number): number => d * (1 + GROW_BAND);
    const apply = (chunks: readonly Chunk[], d: number): void => {
      for (const { mesh, tufts } of chunks) mesh.count = Math.min(tufts.length, Math.ceil(tufts.length * edge(d)));
    };
    kinds.grass.grow.value = edge(density);
    kinds.stubble.grow.value = edge(density);
    // El césped es un palmo de alto: de lejos es un píxel, así que baja antes.
    kinds.lawn.grow.value = edge(density * density);
    apply(grassChunks, density);
    apply(stubbleChunks, density);
    apply(lawnChunks, density * density);
  }

  function colour(): void {
    if (palette === null) return;
    const p = palette;
    for (const { mesh, tufts } of grassChunks) {
      tufts.forEach((tuft, n) => {
        // Tres verdes del prado, mezclados por mata: como en Breath of the
        // Wild, el prado no es de un color sino de muchos parecidos.
        tint.set(tuft.pick < 0.45 ? p.meadow : p.meadowAlt);
        other.set(tuft.pick > 0.8 ? p.field : p.forest);
        tint.lerp(other, 0.18 + (tuft.pick % 0.2));
        tint.multiplyScalar(0.92 + (tuft.pick * 7 % 1) * 0.16);
        mesh.setColorAt(n, tint);
      });
      if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    }
    for (const { mesh, tufts } of lawnChunks) {
      tufts.forEach((tuft, n) => {
        // Del color del prado, un poco más hondo y con poca variación: textura,
        // no matas.
        // Del verde del prado, un punto más claro en las puntas (lo pone el
        // vértice) y con poca variación entre matas.
        tint.set(tuft.pick < 0.5 ? p.meadow : p.meadowAlt).multiplyScalar(0.94 + (tuft.pick * 5 % 1) * 0.1);
        mesh.setColorAt(n, tint);
      });
      if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    }
    for (const { mesh, tufts } of stubbleChunks) {
      tufts.forEach((tuft, n) => {
        tint.set(p.field).lerp(other.set(p.accent), 0.35 + tuft.pick * 0.25);
        mesh.setColorAt(n, tint);
      });
      if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    }
  }

  function clear(): void {
    for (const { mesh } of [...grassChunks, ...lawnChunks, ...stubbleChunks]) {
      group.remove(mesh);
      mesh.geometry.dispose();
      mesh.dispose();
    }
    grassChunks = [];
    lawnChunks = [];
    stubbleChunks = [];
  }

  return {
    group,
    get counts() {
      const sum = (chunks: readonly Chunk[]): number => chunks.reduce((n, c) => n + c.tufts.length, 0);
      const drawn = [...grassChunks, ...lawnChunks, ...stubbleChunks].reduce((n, c) => n + c.mesh.count, 0);
      return { grass: sum(grassChunks), lawn: sum(lawnChunks), stubble: sum(stubbleChunks), drawn };
    },
    plant(state, ground, plaza, wear): void {
      const key = `${handheld ? 1 : 0}:${signature(state, plaza, wear)}`;
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
      const tilesX = Math.ceil(width / TILE);
      const grassTiles = new Map<number, Tuft[]>();
      const lawnTiles = new Map<number, Tuft[]>();
      const stubbleTiles = new Map<number, Tuft[]>();
      const into = (tiles: Map<number, Tuft[]>, tuft: Tuft): void => {
        const tile = Math.floor(tuft.x / TILE) + Math.floor(tuft.z / TILE) * tilesX;
        const list = tiles.get(tile);
        if (list === undefined) tiles.set(tile, [tuft]); else list.push(tuft);
      };
      for (let cell = 0; cell < width * height; cell += 1) {
        const x = cell % width, z = Math.floor(cell / width);
        if (stubbleCells[cell] === 1) {
          for (let k = 0; k < stubblePerCell; k += 1) {
            const px = x + 0.1 + unit(seed, `sx${cell}:${k}`) * 0.8;
            const pz = z + 0.1 + unit(seed, `sz${cell}:${k}`) * 0.8;
            into(stubbleTiles, { x: px, y: ground(px, pz), z: pz, shade: 0.8 + unit(seed, `ss${cell}:${k}`) * 0.4,
              pick: unit(seed, `sp${cell}:${k}`), order: unit(seed, `so${cell}:${k}`) });
          }
          continue;
        }
        if (blocked[cell] === 1) continue;
        const scale = TERRAIN_SCALE[state.map.terrain[cell]!];
        if (scale === undefined) continue;
        const keep = PATH_KEEP[Math.min(3, Math.max(state.map.path[cell] ?? 0, wear?.[cell] ?? 0))] ?? 0;
        if (keep <= 0) continue;
        if (Math.hypot(x + 0.5 - plaza.x, z + 0.5 - plaza.y) < plaza.radius + 0.5) continue;
        const lush = meadowWeight(seed, x, z);
        // El césped bajo, en matojos por todo el prado (un ruido fino junta las
        // matas en unas celdas y vacía otras); las matas altas sólo dentro de
        // la mancha, y en su borde van entrando de una en una.
        const clump = valueNoise(seed, x + 0.5, z + 0.5, LAWN.CLUMP, 'lawn');
        const lawnHere = Math.round(lawnPerCell * Math.max(0, clump - LAWN.ALIVE_FROM) / (1 - LAWN.ALIVE_FROM) * 1.6);
        for (let k = 0; k < lawnHere; k += 1) {
          if (unit(seed, `lk${cell}:${k}`) > keep) continue;
          const px = x + unit(seed, `lx${cell}:${k}`);
          const pz = z + unit(seed, `lz${cell}:${k}`);
          into(lawnTiles, { x: px, y: ground(px, pz), z: pz,
            shade: scale * (0.7 + unit(seed, `ls${cell}:${k}`) * 0.5) * (keep < 1 ? 0.6 : 1),
            pick: unit(seed, `lp${cell}:${k}`), order: unit(seed, `lo${cell}:${k}`) });
        }
        // Por debajo de `TALL_FROM` ninguna: una o dos matas altas sueltas en
        // el borde son justo lo que Vera vio quedar mal.
        const tufts = lush < TALL_FROM ? 0 : Math.round(perCell * lush);
        for (let k = 0; k < tufts; k += 1) {
          if (unit(seed, `gk${cell}:${k}`) > keep) continue;
          const px = x + unit(seed, `gx${cell}:${k}`);
          const pz = z + unit(seed, `gz${cell}:${k}`);
          // Más alta hacia el centro de la mancha.
          const shade = scale * (0.6 + unit(seed, `gs${cell}:${k}`) * 0.35) * (0.85 + 0.4 * lush) * (keep < 1 ? 0.6 : 1);
          into(grassTiles, { x: px, y: ground(px, pz), z: pz, shade, pick: unit(seed, `gp${cell}:${k}`),
            order: unit(seed, `go${cell}:${k}`) });
        }
      }
      clear();
      for (const [tile, tufts] of grassTiles) grassChunks.push(chunk('grass', tufts, tile, seed));
      for (const [tile, tufts] of lawnTiles) lawnChunks.push(chunk('lawn', tufts, tile, seed));
      for (const [tile, tufts] of stubbleTiles) stubbleChunks.push(chunk('stubble', tufts, tile, seed));
      applyDensity();
      colour();
    },
    season(next, cover): void {
      const changed = palette === null || next.meadow !== palette.meadow || next.meadowAlt !== palette.meadowAlt
        || next.field !== palette.field || next.forest !== palette.forest || next.accent !== palette.accent;
      palette = { ...next };
      const snow = Math.max(0, Math.min(1, cover));
      snowUniform.value = snow;
      group.visible = snow < BURIED;
      if (changed) colour();
    },
    zoom(viewHeight): void {
      const next = Math.round(densityAt(viewHeight) * 100) / 100;
      if (next === density) return;
      density = next;
      applyDensity();
    },
    dispose(): void {
      clear();
      for (const one of Object.values(kinds)) { one.geometry.dispose(); one.material.dispose(); }
    },
  };
}
