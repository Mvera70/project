// AN-0 · La zancada de cada clip de desplazamiento, medida sobre el GLB
// publicado y sin navegador. Para cada especie con `strideLength` en el
// catálogo dice, por clip: la cadencia que tendrán las patas al paso que le da
// la vida (`ciclos por segundo` = paso / zancada), la fracción del ciclo en que
// cada pie está apoyado, y cuánto retrocede el pie apoyado respecto a lo que
// avanza el cuerpo (1,00× es «plantado»; menos es que patina, más es que
// frena). Es la medida con la que se comparan el antes y el después de AN-1.
//
//   npx tsx tools/reports/gait-report.ts
//
// Los pasos de la vida se copian de los módulos que los declaran (`village.ts`,
// `beasts.ts`, `companions.ts`, `deer.ts`, `bear.ts`, `rabbits.ts`,
// `wild-prey.ts`, `wildlife.ts`, `visitors.ts`): no se leen de ahí porque
// esos módulos no exportan sus constantes, y cambiar eso por un informe es
// mover la frontera al revés.
import { readFileSync } from 'node:fs';
import { AnimationMixer, Bone, Mesh, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const catalog = JSON.parse(readFileSync('art/catalog.json', 'utf8')) as { assets: { id: string; motion?: { name: string; seconds: number; strideLength: number | null }[] }[] };
const PACE: Record<string, number[]> = { villager: [1.05, 1.65], hen: [0.55], pig: [0.4], cow: [0.32], dog: [1.25], fox: [0.95], duck: [0.35], deer: [0.72, 1.35], bear: [0.56], wolf: [0.75], rabbit: [0.8, 2.4], boar: [0.85, 1.2], mule: [1.43], partridge: [1.5], crow: [0.3], fish: [0.2] };
// `--only villager --glb ruta.glb` mide un candidato sin publicarlo.
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;
const override = args.includes('--glb') ? args[args.indexOf('--glb') + 1] : undefined;
const paceOverride = args.includes('--pace') ? args[args.indexOf('--pace') + 1]!.split(',').map(Number) : undefined;
async function load(id: string) {
  const bytes = readFileSync(override !== undefined && id === only ? override : `public/assets/valley3d/${id}.glb`);
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
function feet(root: Object3D): Map<string, Object3D> {
  const out = new Map<string, Object3D>();
  root.traverse(n => {
    if (n instanceof Bone && /(Foot|foot)/.test(n.name)) out.set(n.name, n);
    else if (!(n instanceof Bone) && /^((fore|hind)[LR]Lower|foot[LR]|legL|legR)$/u.test(n.name)) out.set(n.name, n);
  });
  return out;
}
function lowestVertex(node: Object3D): Vector3 | null {
  let low: Vector3 | null = null; const v = new Vector3();
  node.traverse(m => { if (m instanceof Mesh) { const pos = m.geometry.getAttribute('position'); for (let i = 0; i < pos.count; i += 1) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); if (low === null || v.y < low.y) low = v.clone(); } } });
  return low;
}
for (const asset of catalog.assets) {
  const moving = (asset.motion ?? []).filter(m => m.strideLength !== null);
  if (moving.length === 0 || PACE[asset.id] === undefined || (only !== undefined && asset.id !== only)) continue;
  if (paceOverride !== undefined) PACE[asset.id] = paceOverride;
  const gltf = await load(asset.id);
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  // El frente del aldeano es +Z; el de los animales, −X.
  const forward = asset.id.startsWith('villager') ? new Vector3(0, 0, 1) : new Vector3(-1, 0, 0);
  for (const m of moving) {
    const clip = gltf.animations.find(c => c.name === m.name); if (clip === undefined) continue;
    const mixer = new AnimationMixer(scene); const action = mixer.clipAction(clip); action.play();
    const samples = 96, dt = clip.duration / samples; const stride = m.strideLength!;
    const bodySpeed = stride / clip.duration;
    const joints = feet(scene);
    const report: string[] = [];
    const measured: number[] = [];
    let heightRange = 0;
    for (const [name, node] of joints) {
      const track: Vector3[] = [];
      for (let k = 0; k <= samples; k += 1) { mixer.setTime(k * dt); scene.updateMatrixWorld(true); track.push(node instanceof Bone ? node.getWorldPosition(new Vector3()) : (lowestVertex(node) ?? node.getWorldPosition(new Vector3()))); }
      const ground = Math.min(...track.map(p => p.y)); const top = Math.max(...track.map(p => p.y)); heightRange = Math.max(heightRange, top - ground);
      const lift = Math.max(0.004, (top - ground) * 0.15);
      const planted: number[] = [];
      for (let k = 1; k < track.length; k += 1) if (track[k]!.y < ground + lift && track[k - 1]!.y < ground + lift) planted.push(track[k]!.clone().sub(track[k - 1]!).dot(forward) / dt);
      const mean = planted.length === 0 ? NaN : planted.reduce((s, v) => s + v, 0) / planted.length;
      // Apoyado, el pie retrocede a la velocidad del cuerpo: −bodySpeed. slip = 1 − (−mean / bodySpeed).
      // La zancada medida: lo que el pie apoyado retrocede en un ciclo entero es lo
      // que el cuerpo avanza. Sólo con pies que son huesos: en un modelo de nodos
      // rígidos el vértice más bajo de la pata cambia al girar y la cifra no vale.
      if (node instanceof Bone) measured.push(-mean * clip.duration);
      report.push(`${name}: plant ${(planted.length / samples * 100).toFixed(0)}% footBack ${(-mean / bodySpeed).toFixed(2)}×`);
    }
    const cad = PACE[asset.id]!.map(p => `${p}→${(p / stride).toFixed(1)}Hz`).join(' ');
    const avg = measured.filter(Number.isFinite);
    const measuredStride = avg.length === 0 ? NaN : avg.reduce((s, v) => s + v, 0) / avg.length;
    console.log(`${asset.id.padEnd(18)} ${m.name.padEnd(10)} stride ${stride.toFixed(3)} (medida ${Number.isFinite(measuredStride) ? measuredStride.toFixed(3) : 'no fiable: nodos rígidos'}) dur ${clip.duration.toFixed(2)} natural ${bodySpeed.toFixed(3)} c/s | ${cad} | lift ${heightRange.toFixed(3)} | ${report.join(' · ')}`);
    action.stop(); mixer.uncacheRoot(scene);
  }
}
