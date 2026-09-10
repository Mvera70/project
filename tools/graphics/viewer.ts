import {
  AnimationMixer,
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Scene,
  Sphere,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
  REVISION,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Material, Object3D } from 'three';

interface ViewerReport {
  resourceUrl: string;
  viewport: { width: number; height: number; pixelRatio: number };
  /** Cuánto se acercó la cámara. 1 es la parcela entera. */
  zoom: number;
  camera: string;
  presentationSeconds: number;
  threeRevision: string;
  objectNames: string[];
  bounds: { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] };
  loadDurationMs: number;
}

declare global {
  interface Window { valleyGraphicsReport?: ViewerReport }
}

const root = document.documentElement;
const status = document.querySelector<HTMLOutputElement>('#status');
const params = new URLSearchParams(location.search);

function numericParameter(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = params.get(name);
  const value = raw === null ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid ${name}: expected ${minimum}..${maximum}.`);
  }
  return value;
}

function setState(state: 'loading' | 'ready' | 'error', message: string): void {
  root.dataset.graphicsState = state;
  root.dataset.graphicsMessage = message;
  if (status !== null) status.textContent = message;
}

function tuple(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z].map((value) => Number(value.toFixed(6))) as [number, number, number];
}

function boxCorners(box: Box3): Vector3[] {
  const { min, max } = box;
  return [
    new Vector3(min.x, min.y, min.z), new Vector3(max.x, min.y, min.z),
    new Vector3(min.x, max.y, min.z), new Vector3(max.x, max.y, min.z),
    new Vector3(min.x, min.y, max.z), new Vector3(max.x, min.y, max.z),
    new Vector3(min.x, max.y, max.z), new Vector3(max.x, max.y, max.z),
  ];
}

/**
 * Encuadra el objeto. `zoom` mayor que 1 acerca: divide el alto encuadrado, así
 * que el encuadre se estrecha alrededor del mismo centro. §D.2 · P1 pide el
 * rincón «general y cerca», y hasta G-03 sólo existía el general.
 *
 * Acercar recortando el encuadre y no moviendo la cámara mantiene la
 * ortográfica y el ángulo exactos: las dos vistas son la misma escena vista con
 * el mismo ojo, que es lo que permite compararlas.
 */
function frame(
  camera: OrthographicCamera,
  box: Box3,
  aspect: number,
  direction: Vector3,
  zoom: number,
): void {
  const sphere = box.getBoundingSphere(new Sphere());
  const radius = Math.max(sphere.radius, 0.01);
  camera.position.copy(sphere.center).addScaledVector(direction.normalize(), radius * 4);
  camera.up.set(0, 1, 0);
  camera.lookAt(sphere.center);
  camera.near = Math.max(radius * 0.01, 0.001);
  camera.far = radius * 10;
  camera.updateMatrixWorld(true);

  const inverse = camera.matrixWorldInverse;
  const points = boxCorners(box).map((point) => point.applyMatrix4(inverse));
  const halfWidth = Math.max(...points.map((point) => Math.abs(point.x)));
  const halfHeight = Math.max(...points.map((point) => Math.abs(point.y)));
  const fitted = Math.max(halfHeight, halfWidth / aspect, radius * 0.1) * 1.14;
  const framedHalfHeight = fitted / Math.max(0.01, zoom);
  camera.left = -framedHalfHeight * aspect;
  camera.right = framedHalfHeight * aspect;
  camera.top = framedHalfHeight;
  camera.bottom = -framedHalfHeight;
  camera.updateProjectionMatrix();
}

function disposeObject(rootObject: Object3D): void {
  rootObject.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

async function main(): Promise<void> {
  const resource = params.get('asset') ?? '/artifacts/graphics/G-00/axis-marker.glb';
  const width = numericParameter('width', 640, 64, 4096);
  const height = numericParameter('height', 640, 64, 4096);
  const pixelRatio = numericParameter('pixelRatio', 1, 0.5, 4);
  const presentationSeconds = numericParameter('time', 0, 0, 1_000_000);
  const cameraId = params.get('camera') ?? 'iso-ne';
  const zoom = numericParameter('zoom', 1, 0.1, 20);
  const cameraDirections: Record<string, Vector3> = {
    'iso-ne': new Vector3(1, 0.9, 1.15),
    'iso-nw': new Vector3(-1, 0.9, 1.15),
  };
  const direction = cameraDirections[cameraId];
  if (direction === undefined) throw new Error(`Unknown camera '${cameraId}'.`);

  document.body.style.width = `${width}px`;
  document.body.style.height = `${height}px`;
  setState('loading', `Loading ${resource}`);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(new Color('#e8e2d6'));
  document.body.prepend(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#e8e2d6');
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const owned = new Group();
  const mixers: AnimationMixer[] = [];
  scene.add(owned);
  const hemi = new HemisphereLight('#fff6df', '#776f62', 1.65);
  const sun = new DirectionalLight('#fff4d8', 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(hemi, sun);

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const mixer of mixers) {
      mixer.stopAllAction();
      mixer.uncacheRoot(mixer.getRoot());
    }
    disposeObject(owned);
    renderer.dispose();
    renderer.forceContextLoss();
  };
  window.addEventListener('pagehide', dispose, { once: true });

  const started = performance.now();
  const gltf = await new GLTFLoader().loadAsync(resource).catch((error: unknown) => {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not load GLB '${resource}': ${cause}`);
  });
  if (disposed) return;
  const asset = gltf.scene;
  owned.add(asset);
  asset.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(asset);
  if (bounds.isEmpty()) throw new Error('The loaded GLB has no renderable bounds.');

  const names: string[] = [];
  asset.traverse((object) => {
    if (object.name) names.push(object.name);
    if (object instanceof Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const groundSize = Math.max(size.x, size.z, 1) * 2.5;
  const ground = new Mesh(
    new PlaneGeometry(groundSize, groundSize),
    new MeshStandardMaterial({ color: '#cec5b5', roughness: 1 }),
  );
  ground.name = 'Viewer_Ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(center.x, bounds.min.y - Math.max(size.y * 0.004, 0.002), center.z);
  ground.receiveShadow = true;
  owned.add(ground);

  frame(camera, bounds, width / height, direction, zoom);
  const sphere = bounds.getBoundingSphere(new Sphere());
  sun.position.copy(sphere.center).add(new Vector3(-sphere.radius * 2, sphere.radius * 4, sphere.radius * 2));
  sun.target.position.copy(sphere.center);
  sun.shadow.normalBias = sphere.radius * 0.004;
  sun.shadow.camera.left = -sphere.radius * 1.5;
  sun.shadow.camera.right = sphere.radius * 1.5;
  sun.shadow.camera.top = sphere.radius * 1.5;
  sun.shadow.camera.bottom = -sphere.radius * 1.5;
  sun.shadow.camera.near = sphere.radius * 0.1;
  sun.shadow.camera.far = sphere.radius * 8;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun.target);

  if (gltf.animations.length > 0) {
    const mixer = new AnimationMixer(asset);
    mixers.push(mixer);
    for (const clip of gltf.animations) mixer.clipAction(clip).play();
    mixer.setTime(presentationSeconds);
  }
  // There is deliberately one render at the explicit presentation time.
  renderer.render(scene, camera);

  window.valleyGraphicsReport = {
    resourceUrl: new URL(resource, location.href).href,
    viewport: { width, height, pixelRatio },
    zoom,
    camera: cameraId,
    presentationSeconds,
    threeRevision: REVISION,
    objectNames: [...new Set(names)].sort(),
    bounds: { min: tuple(bounds.min), max: tuple(bounds.max), size: tuple(size) },
    loadDurationMs: Math.round(performance.now() - started),
  };
  setState('ready', `Loaded ${names.length} named objects`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  setState('error', message);
});
