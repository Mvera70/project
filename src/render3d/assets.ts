// G-06 · The asset manifest and who owns what. design.md D.4, D.5.
//
// D.4 wants approved assets distributed from `public/assets/valley3d/` with a
// manifest that carries identity, hash and animation facts. This is the runtime
// side of that: it fetches the manifest, loads the GLBs it names, and hands out
// one shared original per asset that every actor clones.
//
// **Ownership is explicit, because D.5 asks for it.** The library owns the
// geometry, the materials and the animation clips; an actor owns only its own
// skeleton and its own mixer. Disposing the library disposes the originals;
// disposing an actor must never touch them, or the second villager to die would
// take the geometry of every other villager with them.

import type { AnimationClip, Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import {
  BufferAttribute, Color, Mesh, Object3D as Node, Skeleton, SkinnedMesh,
  type Bone, type BufferGeometry, type Material, type MeshStandardMaterial, type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

interface AssetMotion {
  readonly name: string;
  readonly seconds: number;
  readonly loop: boolean;
  /** Cells covered per cycle, or `null` for a clip that stays put. */
  readonly strideLength: number | null;
}

interface AssetEntry {
  readonly id: string;
  /** File name, relative to the manifest. */
  readonly file: string;
  readonly sha256: string;
  readonly motion: readonly AssetMotion[];
}

export interface AssetManifest {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly assets: readonly AssetEntry[];
}

export interface LoadedAsset {
  readonly id: string;
  /** The shared original. Clone it; never add it to a scene directly. */
  readonly original: Object3D;
  readonly clips: readonly AnimationClip[];
  readonly motion: readonly AssetMotion[];
}

export interface AssetLibrary {
  get(id: string): LoadedAsset | undefined;
  /** A fresh, independently posable copy. The caller owns what comes back. */
  instance(id: string): Object3D | undefined;
  readonly manifest: AssetManifest;
  dispose(): void;
}

function parseManifest(value: unknown): AssetManifest {
  if (typeof value !== 'object' || value === null) throw new Error('The asset manifest is not an object.');
  const root = value as Record<string, unknown>;
  if (root.schemaVersion !== 1) throw new Error('The asset manifest has an unknown schemaVersion.');
  if (!Array.isArray(root.assets)) throw new Error('The asset manifest has no assets.');
  const assets = root.assets.map((entry, index) => {
    const asset = entry as Record<string, unknown>;
    for (const field of ['id', 'file', 'sha256'] as const) {
      if (typeof asset[field] !== 'string' || asset[field] === '') {
        throw new Error(`Asset ${index} has no ${field}.`);
      }
    }
    const motion = Array.isArray(asset.motion) ? asset.motion as AssetMotion[] : [];
    return {
      id: asset.id as string, file: asset.file as string, sha256: asset.sha256 as string, motion,
    };
  });
  return {
    schemaVersion: 1,
    generatedAt: typeof root.generatedAt === 'string' ? root.generatedAt : '',
    assets,
  };
}

/** Everything a GLB brought with it that the GPU will not free by itself. */
function disposeTree(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value !== null && typeof value === 'object' && 'isTexture' in value) {
          (value as Texture).dispose();
        }
      }
      material.dispose();
    }
  });
}

export interface AssetOptions {
  /** Where the manifest lives. `public/assets/valley3d/` in the app. */
  readonly baseUrl: string;
  /** Only these ids are fetched. Loading the whole catalogue to show one villager is waste. */
  readonly wanted?: readonly string[];
  /** Overridable so tests can drive the loader without a network. */
  readonly fetcher?: typeof fetch;
  /**
   * GLB bytes already in hand, by asset id. Anything found here is parsed
   * instead of fetched.
   *
   * A published single-file page has no server to fetch from, and neither does
   * a test. The alternative was a `data:` URL, which asks the loader to fetch
   * something it already has and depends on a content policy allowing it.
   */
  readonly bytes?: Readonly<Record<string, ArrayBuffer>>;
  /** The manifest itself, when it travels with the page instead of beside it. */
  readonly manifest?: unknown;
}


/**
 * VZ-6 · **La dirección de un modelo lleva su huella.**
 *
 * El trabajador de `public/sw.js` responde a todo lo que no sea el documento
 * con «caché primero», y su propio comentario dice por qué eso es seguro:
 * «everything else carries a content hash in its name, so a cached copy can
 * never be the wrong copy». Para los modelos **no era verdad**: `cow.glb` se
 * llama igual siempre, así que un dispositivo que ya había visitado seguía
 * sirviendo el modelo viejo de su propia caché.
 *
 * Pasó de verdad y lo notó el dueño del diseño: los seis animales se
 * rediseñaron el 16 sep y en su tablet seguían saliendo los antiguos. Se tapó
 * subiendo a mano el nombre de la caché, que es la única invalidación que ese
 * fichero tiene; esto quita la necesidad de acordarse.
 *
 * El manifiesto ya trae el `sha256` de cada recurso, así que la huella no hay
 * que calcularla: se le cuelga a la dirección y con eso la suposición del
 * trabajador pasa a ser cierta. Ocho caracteres bastan —son 32 bits de
 * colisión sobre 57 ficheros— y dejan la dirección legible en la pestaña de
 * red, que es donde se depura esto.
 */
function urlOf(base: string, asset: AssetEntry): string {
  return `${base}${asset.file}?v=${asset.sha256.slice(0, 8).toLowerCase()}`;
}

/**
 * **Funde las piezas con esqueleto de un mismo cuerpo** (rendimiento, 27 sep
 * 2026). Aldeanos, gallinas, vacas, cerdos y ciervos llegan del generador con
 * cuatro o cinco mallas con esqueleto —ropa, adorno, oscuro, piel— que
 * comparten esqueleto y son de color liso. Cada malla era una llamada de
 * dibujo: con cincuenta aldeanos y cuarenta animales, 364 llamadas en la villa
 * grande. Se funden en una malla por cuerpo con **el color de cada pieza en
 * sus vértices** y un solo material: se ve igual y es una llamada.
 *
 * Sólo si todas las piezas comparten esqueleto, padre, posición y matriz de
 * enlace, no tienen textura y traen los mismos atributos. El material que
 * queda es el de la primera pieza, en blanco y con `vertexColors`: si las
 * piezas difieren en rugosidad o metal, gana la primera (en estos modelos son
 * iguales).
 */
export function fuseSkinnedParts(root: Object3D): void {
  const bodies = new Map<unknown, SkinnedMesh[]>();
  root.traverse((node) => {
    if (!(node instanceof SkinnedMesh) || Array.isArray(node.material)) return;
    const material = node.material as MeshStandardMaterial;
    if (material.map !== null && material.map !== undefined) return;
    const list = bodies.get(node.skeleton) ?? [];
    list.push(node);
    bodies.set(node.skeleton, list);
  });
  for (const parts of bodies.values()) {
    if (parts.length < 2) continue;
    const first = parts[0]!;
    first.updateMatrix();
    const names = Object.keys(first.geometry.attributes).filter((name) => name !== 'color').sort().join(',');
    const same = parts.every((part) => {
      part.updateMatrix();
      return part.parent === first.parent && part.matrix.equals(first.matrix)
        && part.bindMatrix.equals(first.bindMatrix)
        && Object.keys(part.geometry.attributes).filter((name) => name !== 'color').sort().join(',') === names
        && (part.geometry.index === null) === (first.geometry.index === null);
    });
    if (!same) continue;
    const pieces = parts.map((part) => {
      const geometry = part.geometry.clone();
      const colour = (part.material as MeshStandardMaterial).color ?? new Color(1, 1, 1);
      const count = geometry.getAttribute('position').count;
      const values = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) { values[i * 3] = colour.r; values[i * 3 + 1] = colour.g; values[i * 3 + 2] = colour.b; }
      geometry.setAttribute('color', new BufferAttribute(values, 3));
      return geometry;
    });
    const merged = mergeGeometries(pieces, false);
    for (const piece of pieces) piece.dispose();
    if (merged === null) continue;
    const material = (first.material as MeshStandardMaterial).clone();
    material.vertexColors = true;
    material.color.set(1, 1, 1);
    material.name = `${(first.material as Material).name}_fused`;
    const fused = new SkinnedMesh(merged, material);
    fused.name = `${first.name}_fused`;
    fused.position.copy(first.position);
    fused.quaternion.copy(first.quaternion);
    fused.scale.copy(first.scale);
    fused.castShadow = parts.some((part) => part.castShadow);
    fused.receiveShadow = parts.some((part) => part.receiveShadow);
    fused.frustumCulled = first.frustumCulled;
    fused.bind(first.skeleton, first.bindMatrix);
    const parent = first.parent!;
    for (const part of parts) parent.remove(part);
    parent.add(fused);
  }
}

/**
 * Los modelos hechos pieza a pieza (Vera, `deliverables/marked-models-trial/`,
 * adoptados con `tools/art/adopt-models.mjs`): nodos rígidos con de 6 a 68
 * mallas sueltas, y cada malla es una llamada de dibujo. Los del generador de
 * recetas vienen ya fundidos por material (4 mallas por animal).
 */
export const PIECED: ReadonlySet<string> = new Set([
  'wolf', 'bear', 'partridge', 'boar', 'dog', 'mule', 'hoe', 'bucket', 'arrow', 'shield', 'pickaxe',
]);

/**
 * **Funde las piezas que se mueven juntas.** Dentro de cada articulación, las
 * mallas hoja que comparten material pasan a ser una sola, con su posición
 * horneada en la geometría: la articulación sigue girando igual y el animal
 * pasa de 40–68 llamadas de dibujo a unas 15–25. No se toca una malla con
 * hijos ni una que algún clip mueva por su nombre.
 */
export function fuseRigidPieces(root: Object3D, clips: readonly AnimationClip[]): void {
  const animated = new Set(clips.flatMap((clip) => clip.tracks.map((track) => track.name.split('.')[0]!)));
  const parents: Object3D[] = [];
  root.traverse((node) => { parents.push(node); });
  for (const parent of parents) {
    const groups = new Map<Material, Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof Mesh) || child instanceof SkinnedMesh || child.children.length > 0
        || animated.has(child.name) || Array.isArray(child.material)) continue;
      const list = groups.get(child.material) ?? [];
      list.push(child);
      groups.set(child.material, list);
    }
    for (const [material, meshes] of groups) {
      if (meshes.length < 2) continue;
      const pieces = meshes.map((mesh) => {
        mesh.updateMatrix();
        const geometry = (mesh.geometry.index === null ? mesh.geometry : mesh.geometry.toNonIndexed()).clone();
        geometry.applyMatrix4(mesh.matrix);
        // Sólo lo que el material usa: estos son de color liso, y unas piezas
        // traen coordenadas de textura y otras no, lo que impide fundirlas
        // (medido: la cabeza del lobo, 14 piezas, no se fundía).
        const textured = (material as { map?: unknown }).map !== null && (material as { map?: unknown }).map !== undefined;
        for (const name of Object.keys(geometry.attributes)) {
          if (name !== 'position' && name !== 'normal' && !(textured && name === 'uv')) geometry.deleteAttribute(name);
        }
        return geometry;
      });
      const merged = mergeGeometries(pieces, false);
      if (merged === null) continue;
      const fused = new Mesh(merged, material);
      fused.name = `${meshes[0]!.name}_fused`;
      fused.castShadow = meshes.some((mesh) => mesh.castShadow);
      fused.receiveShadow = meshes.some((mesh) => mesh.receiveShadow);
      for (const mesh of meshes) parent.remove(mesh);
      parent.add(fused);
    }
  }
}

/** Lo que distingue a dos materiales salvo el color y la rugosidad. */
const lookOf = (material: MeshStandardMaterial): string => [
  material.type, material.metalness, material.emissive?.getHex(), material.transparent, material.opacity,
  material.side, material.flatShading, material.vertexColors, material.alphaTest, material.depthWrite,
].join('/');

/**
 * **Un animal de piezas rígidas, en una llamada de dibujo** (revisión del 30
 * sep 2026, RV-1). Los animales facetados de la PR #3 —y los de piezas de Vera:
 * oso, jabalí, mula, lobo, perdiz, perro— son nodos rígidos que los clips de
 * `tools/art/rigid-clips.mjs` giran por su nombre, con cada pieza en su malla:
 * 16 a 40 llamadas por animal, y la villa 7/60 pasó de 500 a 964.
 * `fuseRigidPieces` no los arreglaba porque cada pieza cuelga de su
 * articulación.
 *
 * Aquí todas las piezas se vuelven **una malla con esqueleto**: cada vértice va
 * entero al nodo de su pieza, y el color del material viaja en el vértice, como
 * en `fuseSkinnedParts`. Cada malla deja en su sitio un nodo vacío con su
 * nombre, su postura y sus hijos, que hace de hueso: los clips, los gestos
 * (`animal-gestures.ts`, que mide un giro contra el primer hijo de un hueso) y
 * cualquier `getObjectByName` encuentran lo mismo que antes. La rugosidad
 * (pelo 0,85, pezuña 0,65, ojo y pico 0,35) también va en el vértice, para que
 * los ojos sigan brillando.
 *
 * Sólo si ninguna pieza tiene textura ni lleva ya esqueleto, y los materiales
 * no difieren más que en color y rugosidad. Devuelve si lo hizo.
 */
export function skinRigidBody(root: Object3D): boolean {
  const meshes: Mesh[] = [];
  let skinned = false;
  root.traverse((node) => {
    if (node instanceof SkinnedMesh) skinned = true;
    else if (node instanceof Mesh) meshes.push(node);
  });
  if (skinned || meshes.length < 2) return false;
  const materials = meshes.map((mesh) => mesh.material as MeshStandardMaterial);
  if (materials.some((material) => Array.isArray(material) || (material.map !== null && material.map !== undefined))) return false;
  const look = lookOf(materials[0]!);
  if (!materials.every((material) => lookOf(material) === look)) return false;

  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const indexed = meshes.every((mesh) => mesh.geometry.index !== null);
  const bones: Node[] = [];
  const pieces: BufferGeometry[] = [];
  meshes.forEach((mesh, bone) => {
    const joint = new Node();
    joint.name = mesh.name;
    joint.position.copy(mesh.position);
    joint.quaternion.copy(mesh.quaternion);
    joint.scale.copy(mesh.scale);
    joint.visible = mesh.visible;
    joint.userData = mesh.userData;
    for (const child of [...mesh.children]) joint.add(child);
    const parent = mesh.parent!;
    parent.children[parent.children.indexOf(mesh)] = joint;
    joint.parent = parent;
    mesh.parent = null;
    bones.push(joint);

    const geometry = (indexed ? mesh.geometry : mesh.geometry.toNonIndexed()).clone();
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    }
    geometry.applyMatrix4(toRoot.clone().multiply(mesh.matrixWorld));
    const count = geometry.getAttribute('position').count;
    const material = mesh.material as MeshStandardMaterial;
    const colour = material.color ?? new Color(1, 1, 1);
    const colours = new Float32Array(count * 3);
    const rough = new Float32Array(count).fill(material.roughness);
    const index = new Uint16Array(count * 4);
    const weight = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) {
      colours[i * 3] = colour.r; colours[i * 3 + 1] = colour.g; colours[i * 3 + 2] = colour.b;
      index[i * 4] = bone;
      weight[i * 4] = 1;
    }
    geometry.setAttribute('color', new BufferAttribute(colours, 3));
    geometry.setAttribute('roughnessOf', new BufferAttribute(rough, 1));
    geometry.setAttribute('skinIndex', new BufferAttribute(index, 4));
    geometry.setAttribute('skinWeight', new BufferAttribute(weight, 4));
    pieces.push(geometry);
  });
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (merged === null) throw new Error(`skinRigidBody: the pieces of '${root.name}' did not merge`);

  const material = materials[0]!.clone();
  material.vertexColors = true;
  material.color.set(1, 1, 1);
  material.name = `${materials[0]!.name}_skinned`;
  if (new Set(materials.map((one) => one.roughness)).size > 1) {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float roughnessOf;\nvarying float vRoughnessOf;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoughnessOf = roughnessOf;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vRoughnessOf;')
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRoughnessOf;');
    };
    material.customProgramCacheKey = () => 'rigid-roughness';
  }
  const body = new SkinnedMesh(merged, material);
  body.name = `${root.name || 'body'}_skinned`;
  body.castShadow = meshes.some((mesh) => mesh.castShadow);
  body.receiveShadow = meshes.some((mesh) => mesh.receiveShadow);
  body.frustumCulled = meshes[0]!.frustumCulled;
  root.add(body);
  root.updateMatrixWorld(true);
  body.bind(new Skeleton(bones as Bone[]));
  for (const mesh of meshes) mesh.geometry.dispose();
  for (const one of new Set(materials)) one.dispose();
  return true;
}

/**
 * Lo que el cargador hace con cada modelo antes de repartirlo, y lo mismo que
 * mide `tools/reports/model-draws.ts`: un cuerpo de piezas rígidas que sus
 * clips mueven se vuelve una malla con esqueleto (`skinRigidBody`); lo que está
 * hecho de piezas y no se anima se funde por articulación; y las piezas con
 * esqueleto de un mismo cuerpo, en una.
 */
export function prepareModel(id: string, scene: Object3D, clips: readonly AnimationClip[]): void {
  const skinned = clips.length > 0 && skinRigidBody(scene);
  if (!skinned && PIECED.has(id)) fuseRigidPieces(scene, clips);
  fuseSkinnedParts(scene);
}

export async function loadAssets(options: AssetOptions): Promise<AssetLibrary> {
  const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
  const get = options.fetcher ?? fetch;
  const manifest = options.manifest === undefined
    ? await (async (): Promise<AssetManifest> => {
      const response = await get(`${base}manifest.json`);
      if (!response.ok) throw new Error(`No asset manifest at ${base}manifest.json (${response.status}).`);
      return parseManifest(await response.json());
    })()
    : parseManifest(options.manifest);

  const wanted = options.wanted === undefined
    ? manifest.assets
    : manifest.assets.filter((asset) => options.wanted?.includes(asset.id));
  const loader = new GLTFLoader();
  const loaded = new Map<string, LoadedAsset>();

  for (const asset of wanted) {
    // Deliberately sequential. A phone loading six GLBs at once competes with
    // itself for the same decode budget, and D.9 asks the pilot to spend a
    // budget rather than to grab.
    const held = options.bytes?.[asset.id];
    const gltf = held === undefined
      ? await loader.loadAsync(urlOf(base, asset)).catch((error: unknown) => {
        const cause = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not load '${asset.id}' from ${base}${asset.file}: ${cause}`);
      })
      : await new Promise<GLTF>((done, fail) => {
        loader.parse(held, '', done, (error) => {
          fail(new Error(`Could not parse '${asset.id}': ${error.message}`));
        });
      });
    prepareModel(asset.id, gltf.scene, gltf.animations);
    loaded.set(asset.id, {
      id: asset.id,
      original: gltf.scene,
      clips: gltf.animations,
      motion: asset.motion,
    });
  }

  let disposed = false;
  return {
    manifest,
    get(id: string): LoadedAsset | undefined {
      return loaded.get(id);
    },
    instance(id: string): Object3D | undefined {
      const asset = loaded.get(id);
      if (asset === undefined) return undefined;
      // The skeleton-aware clone and not `Object3D.clone`: a plain clone shares
      // the skeleton, so every villager in the valley would strike the same
      // pose. Geometry and materials stay shared, which is the point.
      return cloneSkinned(asset.original);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const asset of loaded.values()) disposeTree(asset.original);
      loaded.clear();
    },
  };
}
