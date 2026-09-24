import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRecipe } from '../../../tools/art/recipe';

// Exportación aislada: requiere autorización exacta; no toca public/ ni catálogo.
const root = resolve(import.meta.dirname, '../../..');
const sourceDir = resolve(root, 'art/recipes/e3b-gate-crossing-candidate');
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/gate-light-export-01');
const blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const meshBuilder = resolve(root, 'art/recipes/e3b-walltop-mixed-candidate/prepare-blender-export.py');
const recipeBuilder = resolve(root, 'tools/art/blender-build.py');
const meshIds = ['e3b-gate-crossing-65-light-finish-candidate',
  'e3b-gate-crossing-24-light-finish-candidate'] as const;
const gateId = 'e3b-gate-wide-light-finish-candidate';

if (existsSync(output)) throw new Error(`La revisión ya existe; no se sobrescribe: ${output}`);
if (!existsSync(blender)) throw new Error(`Blender no disponible: ${blender}`);
const meshes = await Promise.all(meshIds.map(async id => {
  const source = resolve(sourceDir, `${id}.mesh.json`);
  const bytes = await readFile(source);
  const mesh = JSON.parse(bytes.toString('utf8')) as {
    format?: string; id?: string;
    parts?: { vertices?: number[][]; triangles?: number[][]; colorsLinear?: number[][] }[];
  };
  if (mesh.format !== 'valley-candidate-explicit-mesh-v1' || mesh.id !== id
    || !Array.isArray(mesh.parts) || mesh.parts.length === 0
    || mesh.parts.some(part => !Array.isArray(part.vertices) || !Array.isArray(part.triangles)
      || !Array.isArray(part.colorsLinear) || part.vertices.length !== part.colorsLinear.length)) {
    throw new Error(`Fuente explícita inválida: ${source}`);
  }
  return { id, source, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
const gateSource = resolve(sourceDir, `${gateId}.json`);
const gateRecipe = await loadRecipe(gateSource);
if (gateRecipe.id !== gateId) throw new Error(`ID inesperado: ${gateRecipe.id}`);

await mkdir(output, { recursive: true });
for (const item of meshes) {
  const result = spawnSync(blender, [
    '--background', '--factory-startup', '--python', meshBuilder, '--',
    '--source', item.source, '--output-dir', output, '--authorize-export',
  ], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  await writeFile(resolve(output, `${item.id}-build.log`), log);
  if (result.status !== 0 || !log.includes('"triangles"')) {
    throw new Error(`Falló la exportación de ${item.id}; revisar build.log`);
  }
}
const resolvedGate = resolve(output, `${gateId}-resolved.json`);
await writeFile(resolvedGate, `${JSON.stringify(gateRecipe, null, 2)}\n`);
const result = spawnSync(blender, [
  '--background', '--factory-startup', '--python', recipeBuilder, '--', resolvedGate, output, gateId,
], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
await writeFile(resolve(output, `${gateId}-build.log`), log);
if (result.status !== 0 || !log.includes(`VALLEY_ART_BUILD_OK:${gateId}`)) {
  throw new Error(`Falló la exportación de ${gateId}; revisar build.log`);
}
await writeFile(resolve(output, 'sources.json'), `${JSON.stringify({ meshes, gateSource }, null, 2)}\n`);
console.log(`Tres candidatos aislados exportados en ${output}`);
