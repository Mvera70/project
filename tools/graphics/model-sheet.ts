// La hoja de todos los modelos publicados: cada GLB de `public/assets/valley3d`
// con la misma luz y la misma cámara isométrica, encuadrado por su caja. Es la
// página que monta `model-sheet.mjs`; no toca el juego.
import {
  AmbientLight, Box3, Color, DirectionalLight, OrthographicCamera, Scene, Vector3, WebGLRenderer,
  ACESFilmicToneMapping,
} from 'three';
import { loadAssets, type AssetManifest } from '../../src/render3d/assets';

declare const SHEET_BYTES: Record<string, string>;
declare const SHEET_MANIFEST: AssetManifest;
declare global { interface Window { sheetReady: boolean; shoot: (id: string) => { image: string; size: number[] } | null } }

const held = Object.fromEntries(Object.entries(SHEET_BYTES)
  .map(([id, b64]) => [id, Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer]));
const library = await loadAssets({ baseUrl: '/', manifest: SHEET_MANIFEST, bytes: held });
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(360, 360);
renderer.setPixelRatio(1);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
document.body.style.margin = '0';
document.body.append(renderer.domElement);
const scene = new Scene();
scene.background = new Color('#c9d1c3');
scene.add(new AmbientLight(0xffffff, 1.8));
const sun = new DirectionalLight(0xfff0d8, 3);
sun.position.set(-3, 6, 4);
scene.add(sun);
const camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);

window.shoot = (id) => {
  const model = library.instance(id);
  if (model === undefined) return null;
  scene.add(model);
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  // La misma vista que el juego: tres cuartos desde arriba, y encuadre por la
  // diagonal de la caja para que quepa cualquier forma.
  const radius = Math.max(0.05, size.length() / 2);
  camera.left = -radius; camera.right = radius; camera.top = radius; camera.bottom = -radius;
  camera.near = 0.01; camera.far = radius * 40;
  camera.position.copy(centre).add(new Vector3(-1, 0.9, 1.2).normalize().multiplyScalar(radius * 10));
  camera.lookAt(centre);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL('image/png');
  scene.remove(model);
  return { image, size: [size.x, size.y, size.z] };
};
window.sheetReady = true;
