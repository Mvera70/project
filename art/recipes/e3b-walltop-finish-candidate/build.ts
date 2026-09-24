import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRecipe } from '../../../tools/art/recipe';

// Exporta únicamente copias de revisión. No toca el catálogo ni public/.
const root = resolve(import.meta.dirname, '..', '..', '..');
const sourceDir = resolve(root, 'art/recipes/e3b-walltop-finish-candidate');
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/walltop-finish-export-01');
const blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const generator = resolve(root, 'tools/art/blender-build.py');
const variants = ['straight', 'turn', 'diagonal', 'gate', 'bastion295', 'bastion296'] as const;

if (existsSync(output)) throw new Error(`La revisión ya existe; no se sobrescribe: ${output}`);
if (!existsSync(blender)) throw new Error(`Blender no disponible: ${blender}`);
const prepared = await Promise.all(variants.map(async variant => {
  const id = `e3b-walltop-finish-${variant}-candidate`;
  const source = resolve(sourceDir, `${id}.json`);
  const bytes = await readFile(source);
  const recipe = await loadRecipe(source);
  if (recipe.id !== id) throw new Error(`ID inesperado en ${source}: ${recipe.id}`);
  return { id, source, recipe, sha256: createHash('sha256').update(bytes).digest('hex') };
}));

await mkdir(output, { recursive: true });
for (const item of prepared) {
  const resolved = resolve(output, `${item.id}-resolved.json`);
  await writeFile(resolved, `${JSON.stringify(item.recipe, null, 2)}\n`);
  const result = spawnSync(blender, [
    '--background', '--factory-startup', '--python', generator, '--', resolved, output, item.id,
  ], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  await writeFile(resolve(output, `${item.id}-build.log`), log);
  if (result.status !== 0 || !log.includes(`VALLEY_ART_BUILD_OK:${item.id}`)) {
    throw new Error(`Falló la exportación de ${item.id}; revisar su build.log`);
  }
}
await writeFile(resolve(output, 'sources.json'), `${JSON.stringify(prepared.map(
  ({ id, source, sha256 }) => ({ id, source, sha256 }),
), null, 2)}\n`);
console.log(`Seis candidatos aislados exportados en ${output}`);
