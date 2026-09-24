import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Sólo prepara ocho GLB aislados de revisión. Requiere autorización exacta
// antes de ejecutar Blender; no toca el catálogo ni public/.
const root = resolve(import.meta.dirname, '../../..');
const sourceDir = resolve(root, 'art/recipes/e3b-walltop-mixed-finish-candidate');
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/walltop-mixed-finish-export-01');
const blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const generator = resolve(root, 'art/recipes/e3b-walltop-mixed-candidate/prepare-blender-export.py');
const variants = ['mixed-n-se', 'mixed-n-sw', 'mixed-e-sw', 'mixed-e-nw',
  'mixed-s-ne', 'mixed-s-nw', 'mixed-w-ne', 'mixed-w-se'] as const;

if (existsSync(output)) throw new Error(`La revisión ya existe; no se sobrescribe: ${output}`);
if (!existsSync(blender)) throw new Error(`Blender no disponible: ${blender}`);
const prepared = await Promise.all(variants.map(async variant => {
  const source = resolve(sourceDir, `${variant}.mesh.json`);
  const bytes = await readFile(source);
  const mesh = JSON.parse(bytes.toString('utf8')) as {
    format?: string; id?: string;
    parts?: { vertices?: number[][]; triangles?: number[][]; colorsLinear?: number[][] }[];
  };
  if (mesh.format !== 'valley-candidate-explicit-mesh-v1' || mesh.id !== `${variant}-finish`
    || !Array.isArray(mesh.parts) || mesh.parts.length === 0
    || mesh.parts.some(part => !Array.isArray(part.vertices) || !Array.isArray(part.triangles)
      || !Array.isArray(part.colorsLinear) || part.vertices.length !== part.colorsLinear.length)) {
    throw new Error(`Fuente explícita inválida: ${source}`);
  }
  return { id: mesh.id, source, sha256: createHash('sha256').update(bytes).digest('hex') };
}));

await mkdir(output, { recursive: true });
for (const item of prepared) {
  const result = spawnSync(blender, [
    '--background', '--factory-startup', '--python', generator, '--',
    '--source', item.source, '--output-dir', output, '--authorize-export',
  ], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  await writeFile(resolve(output, `${item.id}-build.log`), log);
  if (result.status !== 0 || !log.includes(`"triangles"`)) {
    throw new Error(`Falló la exportación de ${item.id}; revisar su build.log`);
  }
}
await writeFile(resolve(output, 'sources.json'), `${JSON.stringify(prepared, null, 2)}\n`);
console.log(`Ocho adaptadores mixtos candidatos exportados en ${output}`);
