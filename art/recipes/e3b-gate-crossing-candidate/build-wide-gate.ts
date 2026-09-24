import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRecipe } from '../../../tools/art/recipe';

// Exportación aislada: nunca sustituye recursos públicos ni catálogo.
const root = resolve(import.meta.dirname, '..', '..', '..');
const source = resolve(root, 'art/recipes/e3b-gate-crossing-candidate/e3b-gate-wide-opening-candidate.json');
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/gate-wide-review-01');
const id = 'e3b-gate-wide-opening-candidate';
const blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const generator = resolve(root, 'tools/art/blender-build.py');

if (existsSync(output)) throw new Error(`La revisión ya existe; no se sobrescribe: ${output}`);
if (!existsSync(blender)) throw new Error(`Blender no disponible: ${blender}`);
const recipe = await loadRecipe(source);
if (recipe.id !== id) throw new Error(`ID inesperado: ${recipe.id}`);
await mkdir(output, { recursive: true });
const resolved = resolve(output, `${id}-resolved.json`);
await writeFile(resolved, `${JSON.stringify(recipe, null, 2)}\n`);
const result = spawnSync(blender, [
  '--background', '--factory-startup', '--python', generator, '--', resolved, output, id,
], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
await writeFile(resolve(output, `${id}-build.log`), log);
if (result.status !== 0 || !log.includes(`VALLEY_ART_BUILD_OK:${id}`)) {
  throw new Error(`Falló la exportación; revisar ${id}-build.log`);
}
console.log(`Candidato aislado exportado en ${output}`);
