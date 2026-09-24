import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { validateGlb } from '../../../tools/art/glb';
import { loadRecipe } from '../../../tools/art/recipe';

// Inspección CPU del GLB exportado; no abre el juego ni crea capturas GPU.
const root = resolve(import.meta.dirname, '..', '..', '..');
const output = resolve(root, 'artifacts/graphics/E3b-bastion-joint-candidate/blender-review-01');
const assets = [
  ['e3b-bastion-joint-candidate', 'art/recipes/e3b-bastion-joint-candidate/e3b-bastion-joint-candidate.json', [0, 0, 0, 1, 1.36, 2]],
  ['e3b-walkway-entry-candidate', 'art/recipes/e3b-bastion-joint-candidate/e3b-walkway-entry-candidate.json', [0, .36, .33, 1, 1.20, 1.27]],
  ['e3b-walkway-candidate', 'art/recipes/e3b-walkway-candidate/e3b-walkway-candidate.json', [0, .36, .33, 1, 1.20, 1.27]],
] as const;

const results = [];
for (const [id, source, expected] of assets) {
  const recipe = await loadRecipe(resolve(root, source));
  const bytes = await readFile(resolve(output, `${id}.glb`));
  const inspection = validateGlb(recipe, bytes);
  const model = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
  );
  const box = new Box3().setFromObject(model.scene);
  const actual = [...box.min.toArray(), ...box.max.toArray()];
  if (!actual.every((n, i) => Math.abs(n - expected[i]!) < 1e-4)) {
    throw new Error(`${id}: caja Three.js inesperada ${JSON.stringify(actual)}`);
  }
  results.push({ id, source, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    boundsYUp: { min: box.min.toArray(), max: box.max.toArray() }, inspection });
}
await writeFile(resolve(output, 'three-validation.json'), `${JSON.stringify({
  status: 'pass', note: 'Carga real de GLTFLoader en Node; no prueba GPU ni juego.', assets: results,
}, null, 2)}\n`);
console.log(`GLTFLoader y contrato nativo correctos: ${results.map((item) => item.id).join(', ')}`);
