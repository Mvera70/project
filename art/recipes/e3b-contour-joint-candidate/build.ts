import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRecipe } from '../../../tools/art/recipe';

// Exportación aislada para revisión: nunca toca el catálogo ni el juego.
const root = resolve(import.meta.dirname, '..', '..', '..');
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/contour-review-01');
const blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const generator = resolve(root, 'tools/art/blender-build.py');
const ids = [
  'e3b-contour-gate-24-candidate',
  'e3b-contour-gate-65-candidate',
  ...[0, 1, 2, 3].flatMap((turn) => [0, 1].map((mirror) =>
    `e3b-contour-mixed-r${turn}-m${mirror}-candidate`)),
] as const;

if (existsSync(output)) throw new Error(`La revisión ya existe; no se sobrescribe: ${output}`);
if (!existsSync(blender)) throw new Error(`Falta Blender: ${blender}`);
const sources = ids.map((id) => {
  const path = resolve(import.meta.dirname, `${id}.json`);
  const bytes = readFileSync(path);
  return { id, path, sha256: createHash('sha256').update(bytes).digest('hex') };
});
await mkdir(output, { recursive: true });
for (const source of sources) {
  const recipe = await loadRecipe(source.path);
  if (recipe.id !== source.id) throw new Error(`ID inesperado en ${source.path}: ${recipe.id}`);
  const resolved = resolve(output, `${source.id}-resolved.json`);
  await writeFile(resolved, `${JSON.stringify(recipe, null, 2)}\n`);
  const result = spawnSync(blender, [
    '--background', '--factory-startup', '--python', generator, '--', resolved, output, source.id,
  ], { cwd: root, encoding: 'utf8', windowsHide: true });
  const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  await writeFile(resolve(output, `${source.id}-build.log`), log);
  if (result.status !== 0 || !log.includes(`VALLEY_ART_BUILD_OK:${source.id}`)) {
    throw new Error(`Falló la exportación de ${source.id}; revisar ${source.id}-build.log`);
  }
}
await writeFile(resolve(output, 'sources.json'), `${JSON.stringify({ sources, published: false }, null, 2)}\n`);
console.log(`${sources.length} candidatos aislados exportados en ${output}`);
