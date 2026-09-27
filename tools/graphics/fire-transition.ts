import type { Group} from 'three';
import { AmbientLight, Color, DirectionalLight, Mesh, MeshStandardMaterial, OrthographicCamera, PlaneGeometry, Scene, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFires } from '../../src/render3d/effects/fires';
import { SCENIC_DAY_SECONDS } from '../../src/render3d/presentation-clock';
import type { GameState } from '../../src/engine/state';

const scene = new Scene();
scene.background = new Color('#d8ded2');
const ground = new Mesh(new PlaneGeometry(12, 12), new MeshStandardMaterial({ color: '#8ca478', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.025;
scene.add(ground, new AmbientLight('#ffffff', 2));
const sun = new DirectionalLight('#fff4dd', 3);
sun.position.set(-3, 8, 5);
scene.add(sun);
const camera = new OrthographicCamera(-3.5, 3.5, 2.4, -2.4, 0.1, 100);
camera.position.set(5, 4.5, 7);
camera.lookAt(1, 0.7, 1);
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1000, 700);
renderer.setPixelRatio(1);
renderer.setClearColor('#d8ded2');
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();
const ids = ['burnt-house', 'ruin-wood'] as const;
const assets = new Map<string, Group>();
await Promise.all(ids.map(async (id) => {
  const gltf = await loader.loadAsync(`/assets/valley3d/${id}.glb`);
  assets.set(id, gltf.scene);
}));
const fires = createFires((id) => assets.get(id)?.clone(true));
scene.add(fires.group);
const state = {
  tick: 0,
  map: { width: 8, height: 8, terrain: new Uint8Array(64), path: new Uint8Array(64) },
  buildings: [{ id: 1, kind: 'house', x: 0, y: 0, w: 2, h: 2, lostTick: 0 }],
  flags: { 'burnt:1': 2 },
} as unknown as GameState;
fires.update(state, 0);
declare global { interface Window { setFireDay: (day: number) => void } }
window.setFireDay = (day: number) => {
  fires.update(state, day * SCENIC_DAY_SECONDS);
  renderer.render(scene, camera);
};
window.setFireDay(1);
document.documentElement.dataset.ready = 'true';
