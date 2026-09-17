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
import { Mesh, type Material, type Texture } from 'three';

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
      ? await loader.loadAsync(`${base}${asset.file}`).catch((error: unknown) => {
        const cause = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not load '${asset.id}' from ${base}${asset.file}: ${cause}`);
      })
      : await new Promise<GLTF>((done, fail) => {
        loader.parse(held, '', done, (error) => {
          fail(new Error(`Could not parse '${asset.id}': ${error.message}`));
        });
      });
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
