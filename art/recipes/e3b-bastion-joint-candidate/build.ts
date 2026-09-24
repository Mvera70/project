import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRecipe } from '../../../tools/art/recipe';

// Revisión aislada: nunca escribe en el catálogo ni en los recursos publicados.
const root = resolve(import.meta.dirname, '..', '..', '..');
const output = resolve(root, 'artifacts/graphics/E3b-bastion-joint-candidate/blender-review-01');
const blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const generator = resolve(root, 'tools/art/blender-build.py');
const assets = [
  ['e3b-bastion-joint-candidate', 'art/recipes/e3b-bastion-joint-candidate/e3b-bastion-joint-candidate.json'],
  ['e3b-walkway-entry-candidate', 'art/recipes/e3b-bastion-joint-candidate/e3b-walkway-entry-candidate.json'],
  ['e3b-walkway-candidate', 'art/recipes/e3b-walkway-candidate/e3b-walkway-candidate.json'],
] as const;

if (existsSync(output)) throw new Error(`La revisión ya existe; no se sobrescribe: ${output}`);
await mkdir(output, { recursive: true });
for (const [id, source] of assets) {
  const recipe = await loadRecipe(resolve(root, source));
  if (recipe.id !== id) throw new Error(`ID inesperado en ${source}: ${recipe.id}`);
  const resolved = resolve(output, `${id}-resolved.json`);
  await writeFile(resolved, `${JSON.stringify(recipe, null, 2)}\n`);
  const result = spawnSync(blender, [
    '--background', '--factory-startup', '--python', generator, '--', resolved, output, id,
  ], { cwd: root, encoding: 'utf8', windowsHide: true });
  const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  await writeFile(resolve(output, `${id}-build.log`), log);
  if (result.status !== 0 || !log.includes(`VALLEY_ART_BUILD_OK:${id}`)) {
    throw new Error(`Falló la exportación de ${id}; revisar ${id}-build.log`);
  }
}
console.log(`Tres candidatos exportados para revisión en ${output}`);
