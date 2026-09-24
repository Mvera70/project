import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRecipe } from '../../../tools/art/recipe';

// Genera sólo GLB y vistas de revisión; no toca catálogo ni recursos publicados.
const root = resolve(import.meta.dirname, '..', '..', '..');
const output = resolve(root, 'artifacts/graphics/house-variant-export-01');
const blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const generator = resolve(root, 'tools/art/blender-build.py');
const ids = ['house-twin-gable', 'stone-house-cross-gable'] as const;

if (existsSync(output)) throw new Error(`Review folder already exists: ${output}`);
if (!existsSync(blender)) throw new Error(`Blender unavailable: ${blender}`);
const prepared = await Promise.all(ids.map(async id => {
  const source = resolve(import.meta.dirname, `${id}.json`);
  const bytes = await readFile(source);
  const recipe = await loadRecipe(source);
  if (recipe.id !== id || recipe.metadata?.footprint?.join(',') !== '2,2') {
    throw new Error(`Unexpected recipe id or footprint: ${id}`);
  }
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
    throw new Error(`Export failed for ${item.id}; inspect ${item.id}-build.log`);
  }
}
await writeFile(resolve(output, 'sources.json'), `${JSON.stringify(prepared.map(
  ({ id, source, sha256 }) => ({ id, source, sha256 }),
), null, 2)}\n`);
console.log(`House candidates exported to ${output}`);
