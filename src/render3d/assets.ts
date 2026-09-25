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
import { Mesh, SkinnedMesh, type Material, type Texture } from 'three';
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
    if (PIECED.has(asset.id)) fuseRigidPieces(gltf.scene, gltf.animations);
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
