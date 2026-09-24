// IA-anim · Banco de gestos: el aldeano publicado con los clips que fabrica el juego.
//
// Carga el GLB real, deriva los clips con `action-clips.ts` y cuelga la
// herramienta del conector de la mano como `world/cast.ts`. No hay partida: se
// mira un ciclo entero, fotograma a fotograma, desde dos ángulos.
import {
  ACESFilmicToneMapping, AmbientLight, AnimationMixer, Color, DirectionalLight, Mesh,
  MeshStandardMaterial, OrthographicCamera, PlaneGeometry, Quaternion, Scene, Vector3, WebGLRenderer, type AnimationClip,
} from 'three';
import { loadAssets, type AssetManifest } from '../../src/render3d/assets';
import { actionClips } from '../../src/render3d/action-clips';
import { handTool } from '../../src/render3d/hand-tools';
import { VILLAGER_CLIPS, type ClipName } from '../../src/render3d/clips';

declare const PREVIEW_BYTES: Record<string, string>;
declare const PREVIEW_MANIFEST: AssetManifest;
declare const PREVIEW_ID: string;
declare global {
  interface Window {
    previewReady: boolean;
    SECONDS: Readonly<Record<string, number>>;
    pose: (clip: string, t: number, view: 'side' | 'front' | 'three') => { finite: boolean; hand: number[]; tool: number[] | null };
  }
}

const bytes = Object.fromEntries(Object.entries(PREVIEW_BYTES)
  .map(([id, b64]) => [id, Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer]));
const library = await loadAssets({ baseUrl: '/', manifest: PREVIEW_MANIFEST, bytes });
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(360, 420); renderer.setPixelRatio(1);
renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
document.body.style.margin = '0'; document.body.append(renderer.domElement);
const scene = new Scene(); scene.background = new Color('#b7c3b2');
scene.add(new AmbientLight(0xffffff, 2));
const sun = new DirectionalLight(0xffeed5, 3); sun.position.set(-3, 5, 4); scene.add(sun);
const plane = new Mesh(new PlaneGeometry(20, 20), new MeshStandardMaterial({ color: '#7f946f', roughness: 1 }));
plane.rotation.x = -Math.PI / 2; scene.add(plane);
// Un tronco y una roca de referencia, delante del cuerpo (+Z local).
const trunk = new Mesh(new PlaneGeometry(0.12, 0.9), new MeshStandardMaterial({ color: '#6b4b2e', side: 2 }));
trunk.position.set(0, 0.45, 0.42); scene.add(trunk);

const villager = library.instance(PREVIEW_ID)!;
scene.add(villager);
const idle = library.get(PREVIEW_ID)!.clips.find(clip => clip.name === 'idle')!;
const clips = new Map<string, AnimationClip>([
  ...library.get(PREVIEW_ID)!.clips.map(clip => [clip.name, clip] as const),
  ...actionClips(idle).map(clip => [clip.name, clip] as const),
]);
const mixer = new AnimationMixer(villager);
const camera = new OrthographicCamera(-0.6, 0.6, 0.7, -0.7, 0.01, 100);
let tool: ReturnType<typeof handTool> | undefined;
let toolFor = '';

window.pose = (name, t, view) => {
  const clip = clips.get(name);
  if (clip === undefined) throw new Error(`Sin clip ${name}`);
  mixer.stopAllAction();
  const action = mixer.clipAction(clip); action.reset().play(); action.time = t; mixer.update(0);
  if (toolFor !== name) {
    tool?.removeFromParent(); tool = handTool(name); toolFor = name;
    if (tool !== undefined) villager.getObjectByName('hand_r')?.add(tool);
  }
  const at = view === 'side' ? new Vector3(-2, 0.6, 0.35) : view === 'front' ? new Vector3(0, 0.6, 2.2) : new Vector3(-1.4, 1.1, 1.6);
  camera.position.copy(at); camera.lookAt(0, 0.42, 0.1);
  scene.updateMatrixWorld(true); renderer.render(scene, camera);
  let finite = true;
  villager.traverse(node => { finite &&= node.matrixWorld.elements.every(Number.isFinite); });
  const hand = villager.getObjectByName('hand_r')!.getWorldPosition(new Vector3()).toArray();
  const head = (tool?.children[0]?.children.at(-1) ?? tool?.children.at(-1))?.getWorldPosition(new Vector3()).toArray() ?? null;
  const handScale = villager.getObjectByName('hand_r')!.getWorldScale(new Vector3()).toArray();
  const actorScale = villager.getWorldScale(new Vector3()).toArray();
  const handQuat = villager.getObjectByName('hand_r')!.getWorldQuaternion(new Quaternion()).toArray();
  // Filo (−X de la cabeza, `hand-tools.ts`): hacia dónde corta la herramienta.
  const inner = tool?.children[0];
  const edge = inner === undefined ? null : new Vector3(-1, 0, 0).applyQuaternion(inner.getWorldQuaternion(new Quaternion())).toArray();
  const shaft = inner === undefined ? null : new Vector3(0, 1, 0).applyQuaternion(inner.getWorldQuaternion(new Quaternion())).toArray();
  return { finite, hand, tool: head, handScale, actorScale, handQuat, edge, shaft } as never;
};
window.SECONDS = Object.fromEntries(
  (Object.keys(VILLAGER_CLIPS) as ClipName[]).map(name => [name, VILLAGER_CLIPS[name].seconds]));
window.previewReady = true;
