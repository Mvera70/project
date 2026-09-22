import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { validateGlb } from '../../../tools/art/glb';
import { loadRecipe } from '../../../tools/art/recipe';

const out = 'artifacts/graphics/E3-access-candidate';
const source = 'art/recipes/bastion-access-candidate/bastion-access-candidate.json';
const bytes = await readFile(`${out}/bastion-access-candidate.glb`);
const inspection = validateGlb(await loadRecipe(source), bytes);
const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const box = new Box3().setFromObject(model.scene);
const expected = [0, 0, 0, 1, 1.36, 2];
const actual = [...box.min.toArray(), ...box.max.toArray()];
if (!actual.every((n, i) => Math.abs(n - expected[i]!) < 1e-5)) throw new Error('Incorrect Three.js bounds');
const receipt = { inspection, boundsYUp: { min: box.min.toArray(), max: box.max.toArray() },
  sourceSha256: createHash('sha256').update(await readFile(source)).digest('hex'),
  glbSha256: createHash('sha256').update(bytes).digest('hex'),
  note: 'GLTFLoader real de Three.js en Node; no prueba GPU ni escena del juego.' };
await writeFile(`${out}/three-validation.json`, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
