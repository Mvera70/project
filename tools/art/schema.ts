export type Vec3 = [number, number, number];

export interface ArtMaterial {
  name: string;
  color: string;
  roughness: number;
}

interface PrimitiveBase {
  name: string;
  location: Vec3;
  material: string;
  parent: string | null;
  rotationDegrees: Vec3;
  bevel: number;
  smooth: boolean;
}

export interface CubePrimitive extends PrimitiveBase {
  type: 'cube';
  dimensions: Vec3;
}

export interface ConePrimitive extends PrimitiveBase {
  type: 'cone';
  radius: number;
  depth: number;
  vertices: number;
  rotationDegrees: Vec3;
}

export interface CylinderPrimitive extends PrimitiveBase {
  type: 'cylinder';
  radius: number;
  depth: number;
  vertices: number;
}

export interface GablePrimitive extends PrimitiveBase {
  type: 'gable';
  width: number;
  depth: number;
  height: number;
}

export interface SpherePrimitive extends PrimitiveBase {
  type: 'sphere';
  radius: number;
  segments: number;
  rings: number;
}

export type ArtPrimitive = CubePrimitive | ConePrimitive | CylinderPrimitive | GablePrimitive | SpherePrimitive;

export interface ArtGroup { name: string; location: Vec3; parent: string | null }

export interface ArtRecipe {
  schemaVersion: 1;
  id: string;
  materials: ArtMaterial[];
  groups: ArtGroup[];
  primitives: ArtPrimitive[];
  connectors: string[];
  clips: string[];
  clipDefinitions: RecipeClip[];
  rig: RecipeRig | null;
  metadata: { cellUnit: 1; kind: 'axis' | 'village-corner' | 'villager-study' | 'villager'; direction: 'neutral' | 'A' | 'B'; footprint: [number, number] };
  referenceRender: {
    width: number;
    height: number;
    cameraLocation: Vec3;
    cameraTarget: Vec3;
    orthoScale: number;
    worldColor: string;
  };
}

/**
 * G-04 · Los fotogramas por segundo de la escena de Blender.
 *
 * Es el de fábrica, y `blender-build.py` arranca con `--factory-startup`, así
 * que no hay dos verdades. Vive aquí porque lo necesitan tres sitios: quien
 * escribe la duración en el catálogo, quien la audita sobre el GLB y quien lea
 * el catálogo mañana para saber de dónde salió el número.
 */
export const ANIMATION_FPS = 24;

export interface CatalogAsset {
  id: string;
  artifactRound: string;
  status: 'study' | 'approved';
  recipe: string;
  generator: string;
  blenderVersion: string;
  approved: null | { runId: string; directory: string };
  bounds: null | { min: Vec3; max: Vec3; size: Vec3 };
  materials: string[];
  clips: string[];
  /**
   * G-04 · Lo que el juego necesita para reproducir cada clip. design.md D.4.
   *
   * `clips` es el índice: los nombres, y nada más. `motion` son los hechos de
   * reproducción. Son dos cosas distintas y por eso son dos campos: al índice
   * le basta saber que existe `walk`, y al controlador no.
   *
   * `strideLength` es cuánto avanzaría el cuerpo en un ciclo si los pies
   * agarraran el suelo. El clip es *in-place* —quien desplaza al aldeano por el
   * valle es el juego— así que el controlador tiene que reproducirlo a
   * `velocidad / strideLength` ciclos por segundo. Con cualquier otro ritmo los
   * pies patinan, que es el fallo que D.4 nombra por su nombre.
   *
   * Campo añadido, nunca exigido: un recurso sin clips lo deja vacío y los
   * cinco que existían antes de G-04 siguen siendo válidos sin tocarlos.
   */
  motion: Array<{ name: string; seconds: number; loop: boolean; strideLength: number | null }>;
  connectors: string[];
  statistics: null | { objects: number; meshes: number; materials: number; triangles: number };
  hashes: null | Record<string, string>;
  provenance: { kind: 'original'; source: string; license: string };
}

export interface ArtCatalog { schemaVersion: 1; assets: CatalogAsset[] }

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, pattern?: RegExp): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string.`);
  if (pattern !== undefined && !pattern.test(value)) throw new Error(`${label} has invalid value '${value}'.`);
  return value;
}

function numberValue(value: unknown, label: string, positive = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  if (positive && value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}

function integer(value: unknown, label: string, minimum: number): number {
  const parsed = numberValue(value, label, true);
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`${label} must be an integer >= ${minimum}.`);
  return parsed;
}

function vec3(value: unknown, label: string, positive = false): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`${label} must contain exactly three numbers.`);
  return value.map((item, index) => numberValue(item, `${label}[${index}]`, positive)) as Vec3;
}

function vec2Positive(value: unknown, label: string): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) throw new Error(`${label} must contain exactly two numbers.`);
  return [numberValue(value[0], `${label}[0]`, true), numberValue(value[1], `${label}[1]`, true)];
}

function objectsForGroups(value: unknown): ArtGroup[] {
  if (!Array.isArray(value)) throw new Error('recipe.groups must be an array.');
  const groups = value.map((entry, index): ArtGroup => {
    const item = record(entry, `recipe.groups[${index}]`);
    return {
      name: stringValue(item.name, `recipe.groups[${index}].name`, /^[A-Za-z][A-Za-z0-9_]*$/u),
      location: vec3(item.location, `recipe.groups[${index}].location`),
      parent: item.parent === undefined || item.parent === null ? null : stringValue(item.parent, `recipe.groups[${index}].parent`, /^[A-Za-z][A-Za-z0-9_]*$/u),
    };
  });
  if (new Set(groups.map((item) => item.name)).size !== groups.length) throw new Error('recipe.groups contains duplicate names.');
  return groups;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  const result = value.map((item, index) => stringValue(item, `${label}[${index}]`, /^[A-Za-z][A-Za-z0-9_-]*$/u));
  if (new Set(result).size !== result.length) throw new Error(`${label} contains duplicate names.`);
  return result;
}

/**
 * G-04 · Los clips de una receta.
 *
 * El catálogo los lista por nombre —es un índice— y la receta los define
 * enteros, con sus huesos y sus fotogramas. Son dos cosas distintas que hasta
 * aquí compartían nombre de campo, y una receta con clips de verdad no pasaba
 * la validación del índice.
 */
function clipDefinitions(value: unknown): RecipeClip[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('recipe.clips must be an array.');
  if (value.every((entry) => typeof entry === 'string')) return [];

  return value.map((entry, index) => {
    const clip = record(entry, `recipe.clips[${index}]`);
    const name = stringValue(clip.name, `recipe.clips[${index}].name`);
    const frames = integer(clip.frames, `recipe.clips[${index}].frames`, 2);
    if (!Array.isArray(clip.tracks) || clip.tracks.length === 0) {
      throw new Error(`recipe.clips[${index}].tracks must be a non-empty array.`);
    }
    const tracks = clip.tracks.map((trackEntry, trackIndex) => {
      const label = `recipe.clips[${index}].tracks[${trackIndex}]`;
      const track = record(trackEntry, label);
      const bone = stringValue(track.bone, `${label}.bone`);
      if (!Array.isArray(track.keys) || track.keys.length === 0) {
        throw new Error(`${label}.keys must be a non-empty array.`);
      }
      const keys = track.keys.map((keyEntry, keyIndex) => {
        const keyLabel = `${label}.keys[${keyIndex}]`;
        const key = record(keyEntry, keyLabel);
        return {
          frame: integer(key.frame, `${keyLabel}.frame`, 1),
          rotation: vec3(key.rotation, `${keyLabel}.rotation`),
        };
      });
      // Un clip que cicla y no vuelve a su primer fotograma da un salto
      // visible. Se comprueba aquí, sobre la fuente, además de en la
      // auditoría del GLB: cuanto antes se vea, más barato sale.
      if (clip.loop !== false) {
        const first = keys[0];
        const last = keys[keys.length - 1];
        if (first !== undefined && last !== undefined && last.frame === frames) {
          const same = first.rotation.every((n, axis) => Math.abs(n - (last.rotation[axis] ?? 0)) < 1e-6);
          if (!same) throw new Error(`${label} loops but its last key does not match its first.`);
        }
      }
      return { bone, keys };
    });
    // D.4 · un clip de locomocion lleva su zancada: el controlador la necesita
    // para casar la velocidad del cuerpo con la del desplazamiento y que los
    // pies no patinen. Aqui solo se valida y se conserva; quien la use es el
    // juego, en una ronda posterior.
    const stride = clip.strideLength;
    if (stride !== undefined && (typeof stride !== 'number' || !Number.isFinite(stride) || stride <= 0)) {
      throw new Error(`recipe.clips[${index}].strideLength must be a positive number.`);
    }
    return {
      name, frames, loop: clip.loop !== false, tracks,
      strideLength: stride === undefined ? null : stride,
    };
  });
}

function clipNames(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('recipe.clips must be an array.');
  if (value.every((entry) => typeof entry === 'string')) return value as string[];
  return clipDefinitions(value).map((clip) => clip.name);
}

/** G-04 · El esqueleto, si la receta lo declara. */
function rigOf(value: unknown): RecipeRig | null {
  if (value === undefined || value === null) return null;
  const rig = record(value, 'recipe.rig');
  if (!Array.isArray(rig.bones) || rig.bones.length === 0) {
    throw new Error('recipe.rig.bones must be a non-empty array.');
  }
  const names = new Set<string>();
  const bones = rig.bones.map((entry, index) => {
    const bone = record(entry, `recipe.rig.bones[${index}]`);
    const name = stringValue(bone.name, `recipe.rig.bones[${index}].name`);
    if (names.has(name)) throw new Error(`recipe.rig.bones has a duplicate '${name}'.`);
    names.add(name);
    return {
      name,
      head: vec3(bone.head, `recipe.rig.bones[${index}].head`),
      tail: vec3(bone.tail, `recipe.rig.bones[${index}].tail`),
      parent: bone.parent === undefined || bone.parent === null
        ? null
        : stringValue(bone.parent, `recipe.rig.bones[${index}].parent`),
    };
  });
  for (const bone of bones) {
    if (bone.parent !== null && !names.has(bone.parent)) {
      throw new Error(`recipe.rig: bone '${bone.name}' has unknown parent '${bone.parent}'.`);
    }
    if (bone.head.every((n, axis) => n === bone.tail[axis])) {
      throw new Error(`recipe.rig: bone '${bone.name}' has zero length.`);
    }
  }
  const bind = record(rig.bind, 'recipe.rig.bind');
  for (const [piece, bone] of Object.entries(bind)) {
    if (typeof bone !== 'string' || !names.has(bone)) {
      throw new Error(`recipe.rig.bind['${piece}'] names an unknown bone.`);
    }
  }
  return { bones, bind: bind as Record<string, string> };
}

export interface RecipeClipKey { frame: number; rotation: [number, number, number] }
export interface RecipeClipTrack { bone: string; keys: RecipeClipKey[] }
export interface RecipeClip {
  name: string;
  frames: number;
  loop: boolean;
  /** Metros que avanza el cuerpo en un ciclo, o `null` si el clip no camina. */
  strideLength: number | null;
  tracks: RecipeClipTrack[];
}
export interface RecipeBone {
  name: string;
  head: [number, number, number];
  tail: [number, number, number];
  parent: string | null;
}
export interface RecipeRig { bones: RecipeBone[]; bind: Record<string, string> }

/**
 * G-04 · Los hechos de reproducción de cada clip del catálogo.
 *
 * Se comprueba que nombran clips que el índice conoce. Un `motion` que hable de
 * un clip inexistente sería un número que nadie puede usar y que nadie
 * descubriría, porque el juego pediría el que sí existe y se encontraría sin
 * zancada justo cuando la necesita.
 */
function motionOf(
  value: unknown, clips: unknown, label: string,
): Array<{ name: string; seconds: number; loop: boolean; strideLength: number | null }> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${label}.motion must be an array.`);
  const known = new Set(Array.isArray(clips) ? clips.filter((clip) => typeof clip === 'string') : []);
  return value.map((entry, index) => {
    const motion = record(entry, `${label}.motion[${index}]`);
    const name = stringValue(motion.name, `${label}.motion[${index}].name`);
    if (!known.has(name)) throw new Error(`${label}.motion[${index}] names an unlisted clip '${name}'.`);
    const seconds = motion.seconds;
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
      throw new Error(`${label}.motion[${index}].seconds must be a positive number.`);
    }
    const stride = motion.strideLength;
    if (stride !== null && stride !== undefined
      && (typeof stride !== 'number' || !Number.isFinite(stride) || stride <= 0)) {
      throw new Error(`${label}.motion[${index}].strideLength must be a positive number or null.`);
    }
    return {
      name, seconds, loop: motion.loop !== false,
      strideLength: stride === undefined || stride === null ? null : stride,
    };
  });
}

export function parseRecipe(value: unknown): ArtRecipe {
  const root = record(value, 'recipe');
  if (root.schemaVersion !== 1) throw new Error('recipe.schemaVersion must be 1.');
  const id = stringValue(root.id, 'recipe.id', /^[a-z][a-z0-9-]*$/u);
  if (!Array.isArray(root.materials) || root.materials.length === 0) throw new Error('recipe.materials must be a non-empty array.');
  const materials = root.materials.map((entry, index): ArtMaterial => {
    const item = record(entry, `recipe.materials[${index}]`);
    const color = stringValue(item.color, `recipe.materials[${index}].color`);
    if (!/^#[0-9A-Fa-f]{6}$/u.test(color)) throw new Error(`recipe.materials[${index}].color must be #RRGGBB.`);
    const roughness = numberValue(item.roughness, `recipe.materials[${index}].roughness`);
    if (roughness < 0 || roughness > 1) throw new Error(`recipe.materials[${index}].roughness must be between 0 and 1.`);
    return { name: stringValue(item.name, `recipe.materials[${index}].name`, /^[a-z][a-z0-9-]*$/u), color, roughness };
  });
  const materialNames = materials.map((item) => item.name);
  if (new Set(materialNames).size !== materialNames.length) throw new Error('recipe.materials contains duplicate names.');
  if (!Array.isArray(root.primitives) || root.primitives.length === 0) throw new Error('recipe.primitives must be a non-empty array.');
  const primitives = root.primitives.map((entry, index): ArtPrimitive => {
    const item = record(entry, `recipe.primitives[${index}]`);
    const type = stringValue(item.type, `recipe.primitives[${index}].type`);
    const base = {
      name: stringValue(item.name, `recipe.primitives[${index}].name`, /^[A-Za-z][A-Za-z0-9_]*$/u),
      location: vec3(item.location, `recipe.primitives[${index}].location`),
      material: stringValue(item.material, `recipe.primitives[${index}].material`, /^[a-z][a-z0-9-]*$/u),
      parent: item.parent === undefined || item.parent === null ? null : stringValue(item.parent, `recipe.primitives[${index}].parent`, /^[A-Za-z][A-Za-z0-9_]*$/u),
      rotationDegrees: item.rotationDegrees === undefined ? [0, 0, 0] as Vec3 : vec3(item.rotationDegrees, `recipe.primitives[${index}].rotationDegrees`),
      bevel: item.bevel === undefined ? 0 : numberValue(item.bevel, `recipe.primitives[${index}].bevel`),
      smooth: item.smooth === true,
    };
    if (!materialNames.includes(base.material)) throw new Error(`recipe.primitives[${index}].material '${base.material}' is not declared.`);
    if (type === 'cube') return { ...base, type, dimensions: vec3(item.dimensions, `recipe.primitives[${index}].dimensions`, true) };
    if (type === 'cone') return {
      ...base, type, radius: numberValue(item.radius, `recipe.primitives[${index}].radius`, true),
      depth: numberValue(item.depth, `recipe.primitives[${index}].depth`, true),
      vertices: integer(item.vertices, `recipe.primitives[${index}].vertices`, 3),
    };
    if (type === 'cylinder') return {
      ...base, type, radius: numberValue(item.radius, `recipe.primitives[${index}].radius`, true),
      depth: numberValue(item.depth, `recipe.primitives[${index}].depth`, true),
      vertices: integer(item.vertices, `recipe.primitives[${index}].vertices`, 3),
    };
    if (type === 'gable') return {
      ...base, type, width: numberValue(item.width, `recipe.primitives[${index}].width`, true),
      depth: numberValue(item.depth, `recipe.primitives[${index}].depth`, true),
      height: numberValue(item.height, `recipe.primitives[${index}].height`, true),
    };
    if (type === 'sphere') return {
      ...base, type, radius: numberValue(item.radius, `recipe.primitives[${index}].radius`, true),
      segments: integer(item.segments, `recipe.primitives[${index}].segments`, 3),
      rings: integer(item.rings, `recipe.primitives[${index}].rings`, 2),
    };
    throw new Error(`recipe.primitives[${index}].type '${type}' is unsupported.`);
  });
  const primitiveNames = primitives.map((item) => item.name);
  if (new Set(primitiveNames).size !== primitiveNames.length) throw new Error('recipe.primitives contains duplicate names.');
  const render = record(root.referenceRender, 'recipe.referenceRender');
  const groups = root.groups === undefined ? [] : objectsForGroups(root.groups);
  const allNames = new Set([...groups.map((item) => item.name), ...primitiveNames]);
  if (allNames.size !== groups.length + primitiveNames.length) throw new Error('recipe groups and primitives contain duplicate names.');
  for (const item of [...groups, ...primitives]) {
    if (item.parent !== null && !allNames.has(item.parent)) throw new Error(`Parent '${item.parent}' for '${item.name}' is not declared.`);
  }
  const metadataValue = root.metadata === undefined ? null : record(root.metadata, 'recipe.metadata');
  const kind = metadataValue?.kind ?? 'axis';
  const direction = metadataValue?.direction ?? 'neutral';
  if (kind !== 'axis' && kind !== 'village-corner' && kind !== 'villager-study' && kind !== 'villager') throw new Error('recipe.metadata.kind is invalid.');
  if (direction !== 'neutral' && direction !== 'A' && direction !== 'B') throw new Error('recipe.metadata.direction is invalid.');
  const footprint = metadataValue === null ? [1, 1] as [number, number] : vec2Positive(metadataValue.footprint, 'recipe.metadata.footprint');
  return {
    schemaVersion: 1, id, materials, groups, primitives,
    connectors: stringArray(root.connectors, 'recipe.connectors'),
    clips: clipNames(root.clips),
    clipDefinitions: clipDefinitions(root.clips),
    rig: rigOf(root.rig),
    metadata: { cellUnit: 1, kind, direction, footprint },
    referenceRender: {
      width: integer(render.width, 'recipe.referenceRender.width', 64),
      height: integer(render.height, 'recipe.referenceRender.height', 64),
      cameraLocation: vec3(render.cameraLocation, 'recipe.referenceRender.cameraLocation'),
      cameraTarget: vec3(render.cameraTarget, 'recipe.referenceRender.cameraTarget'),
      orthoScale: numberValue(render.orthoScale, 'recipe.referenceRender.orthoScale', true),
      worldColor: (() => {
        const color = stringValue(render.worldColor, 'recipe.referenceRender.worldColor');
        if (!/^#[0-9A-Fa-f]{6}$/u.test(color)) throw new Error('recipe.referenceRender.worldColor must be #RRGGBB.');
        return color;
      })(),
    },
  };
}

export function parseCatalog(value: unknown): ArtCatalog {
  const root = record(value, 'catalog');
  if (root.schemaVersion !== 1) throw new Error('catalog.schemaVersion must be 1.');
  if (!Array.isArray(root.assets)) throw new Error('catalog.assets must be an array.');
  const assets = root.assets.map((entry, index) => {
    const item = record(entry, `catalog.assets[${index}]`);
    const provenance = record(item.provenance, `catalog.assets[${index}].provenance`);
    const approved = item.approved === null ? null : record(item.approved, `catalog.assets[${index}].approved`);
    if (item.status !== 'study' && item.status !== 'approved') throw new Error(`catalog.assets[${index}].status must be study or approved.`);
    if (provenance.kind !== 'original') throw new Error(`catalog.assets[${index}].provenance.kind must be original.`);
    const bounds = item.bounds === null ? null : record(item.bounds, `catalog.assets[${index}].bounds`);
    const statistics = item.statistics === null ? null : record(item.statistics, `catalog.assets[${index}].statistics`);
    let hashes: Record<string, string> | null = null;
    if (item.hashes !== null) {
      const values = record(item.hashes, `catalog.assets[${index}].hashes`);
      hashes = Object.fromEntries(Object.entries(values).map(([name, digest]) => {
        if (typeof digest !== 'string' || !/^[0-9A-F]{64}$/u.test(digest)) throw new Error(`catalog.assets[${index}].hashes.${name} must be a SHA-256.`);
        return [name, digest];
      }));
    }
    return {
      id: stringValue(item.id, `catalog.assets[${index}].id`, /^[a-z][a-z0-9-]*$/u),
      artifactRound: stringValue(item.artifactRound, `catalog.assets[${index}].artifactRound`, /^G-[0-9]{2}$/u),
      status: item.status,
      recipe: stringValue(item.recipe, `catalog.assets[${index}].recipe`),
      generator: stringValue(item.generator, `catalog.assets[${index}].generator`),
      blenderVersion: stringValue(item.blenderVersion, `catalog.assets[${index}].blenderVersion`),
      approved: approved === null ? null : {
        runId: stringValue(approved.runId, `catalog.assets[${index}].approved.runId`),
        directory: stringValue(approved.directory, `catalog.assets[${index}].approved.directory`),
      },
      bounds: bounds === null ? null : {
        min: vec3(bounds.min, `catalog.assets[${index}].bounds.min`),
        max: vec3(bounds.max, `catalog.assets[${index}].bounds.max`),
        size: vec3(bounds.size, `catalog.assets[${index}].bounds.size`, true),
      },
      materials: stringArray(item.materials, `catalog.assets[${index}].materials`),
      clips: stringArray(item.clips, `catalog.assets[${index}].clips`),
      motion: motionOf(item.motion, item.clips, `catalog.assets[${index}]`),
      connectors: stringArray(item.connectors, `catalog.assets[${index}].connectors`),
      statistics: statistics === null ? null : {
        objects: integer(statistics.objects, `catalog.assets[${index}].statistics.objects`, 0),
        meshes: integer(statistics.meshes, `catalog.assets[${index}].statistics.meshes`, 0),
        materials: integer(statistics.materials, `catalog.assets[${index}].statistics.materials`, 0),
        triangles: integer(statistics.triangles, `catalog.assets[${index}].statistics.triangles`, 0),
      },
      hashes,
      provenance: {
        kind: 'original' as const,
        source: stringValue(provenance.source, `catalog.assets[${index}].provenance.source`),
        license: stringValue(provenance.license, `catalog.assets[${index}].provenance.license`),
      },
    } satisfies CatalogAsset;
  });
  if (new Set(assets.map((item) => item.id)).size !== assets.length) throw new Error('catalog.assets contains duplicate ids.');
  return { schemaVersion: 1, assets };
}
