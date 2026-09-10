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
  /** Qué clip se estaba reproduciendo, y cuánto dura. */
  clip: { name: string; duration: number } | null;
  camera: string;
  presentationSeconds: number;
  threeRevision: string;
  objectNames: string[];
  bounds: { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] };
  loadDurationMs: number;
}

/**
 * G-04 · La sonda de animacion.
 *
 * El visor rinde una imagen y se calla. Para juzgar un clip hace falta ademas
 * medirlo: donde esta cada hueso en cada instante. `animation-audit.ts` lo pide
 * por aqui en vez de reimplementar la carga de GLB en Node, que seria una
 * segunda verdad sobre el mismo fichero — y D.4 pide medir lo que el navegador
 * ve, no lo que Blender creia estar exportando.
 */
interface ViewerProbe {
  clips: Array<{ name: string; duration: number; tracks: string[] }>;
  /** Deja el recurso en ese instante de ese clip y lo rinde. */
  show: (clip: string, seconds: number) => void;
  /**
   * Donde esta cada nodo con nombre, tras el ultimo `show`.
   *
   * `joint` es su origen y `lever` un punto fijo a 25 cm por su eje propio.
   * Hacen falta los dos: el origen de un hueso no se mueve cuando el hueso
   * gira, asi que una cabeza que se vuelve entera marcaria cero desplazamiento
   * y un clip perfectamente visible pareceria vacio.
   */
  pose: () => Record<string, { joint: [number, number, number]; lever: [number, number, number] }>;
}

declare global {
  interface Window {
    valleyGraphicsReport?: ViewerReport;
    valleyGraphicsProbe?: ViewerProbe;
  }
}

/** Brazo de palanca de la sonda, en metros. Ver `ViewerProbe.pose`. */
const LEVER = 0.25;

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
  // El suelo baja de 64 a 16 px en G-04. No es para colar una prueba: a 390 px
  // de ancho la celda del valle mide 10 px (`cellFor`, §11), asi que un aldeano
  // ocupa unos veinte. La prueba de silueta que P1 dejo como condicion de
  // entrada consiste justo en rendirlo a ese tamano, y con el suelo en 64 habia
  // que rendirlo grande y encogerlo, que mide el filtro de reduccion del
  // navegador y no la silueta. 16 sigue cazando un cero de mas.
  const width = numericParameter('width', 640, 16, 4096);
  const height = numericParameter('height', 640, 16, 4096);
  const pixelRatio = numericParameter('pixelRatio', 1, 0.5, 4);
  const presentationSeconds = numericParameter('time', 0, 0, 1_000_000);
  const cameraId = params.get('camera') ?? 'iso-ne';
  const zoom = numericParameter('zoom', 1, 0.1, 20);
  let playing: { name: string; duration: number } | null = null;
  // Las cuatro esquinas. Hasta G-04 solo existian las dos del norte, y las dos
  // bastaban con una casa: mirar una casa por detras sigue siendo mirar la
  // casa. Un aldeano no: juzgar una pose por la espalda hace ver un doblez
  // donde solo hay escorzo, y G-04 tiene que juzgar poses.
  const cameraDirections: Record<string, Vector3> = {
    'iso-ne': new Vector3(1, 0.9, 1.15),
    'iso-nw': new Vector3(-1, 0.9, 1.15),
    'iso-se': new Vector3(1, 0.9, -1.15),
    'iso-sw': new Vector3(-1, 0.9, -1.15),
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

  // G-04 · Un clip cada vez.
  //
  // Antes se reproducían todos a la vez sobre el mismo esqueleto, y cuatro
  // acciones mezcladas dan una pose que no es ninguna de las cuatro. Con un
  // recurso sin animar daba igual; con el aldeano de G-04 hacía imposible
  // juzgar un clip, que es justo lo que la ronda tiene que juzgar.
  const show = (wanted: string | null, seconds: number): void => {
    if (gltf.animations.length === 0) return;
    const chosen = wanted === null
      ? gltf.animations[0]
      : gltf.animations.find((animation) => animation.name === wanted);
    if (chosen === undefined) {
      throw new Error(
        `Unknown clip '${wanted ?? ''}'. The asset has: ${gltf.animations.map((a) => a.name).join(', ')}.`,
      );
    }
    // Un mezclador nuevo por instante. Reaprovechar uno obliga a llevar la
    // cuenta del desfase entre su reloj y el de cada accion, y una captura que
    // sale un fotograma corrida no se distingue a ojo de una animacion mala.
    for (const previous of mixers) {
      previous.stopAllAction();
      previous.uncacheRoot(previous.getRoot());
    }
    mixers.length = 0;
    const mixer = new AnimationMixer(asset);
    mixers.push(mixer);
    mixer.clipAction(chosen).play();
    mixer.setTime(seconds);
    playing = { name: chosen.name, duration: chosen.duration };
    renderer.render(scene, camera);
  };

  show(params.get('clip'), presentationSeconds);
  // There is deliberately one render at the explicit presentation time.
  renderer.render(scene, camera);

  window.valleyGraphicsProbe = {
    clips: gltf.animations.map((animation) => ({
      name: animation.name,
      duration: animation.duration,
      tracks: animation.tracks.map((track) => track.name),
    })),
    show: (clip, seconds) => { show(clip, seconds); },
    pose: () => {
      asset.updateMatrixWorld(true);
      const positions: Record<string, { joint: [number, number, number]; lever: [number, number, number] }> = {};
      asset.traverse((object) => {
        if (!object.name) return;
        positions[object.name] = {
          joint: tuple(object.getWorldPosition(new Vector3())),
          lever: tuple(object.localToWorld(new Vector3(0, LEVER, 0))),
        };
      });
      return positions;
    },
  };

  window.valleyGraphicsReport = {
    resourceUrl: new URL(resource, location.href).href,
    viewport: { width, height, pixelRatio },
    zoom,
    clip: playing,
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
