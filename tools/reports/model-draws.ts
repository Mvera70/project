// Cuántas llamadas de dibujo cuesta cada modelo publicado (30 sep 2026).
//
// Carga cada GLB como lo carga el juego —`fuseRigidPieces` si está en `PIECED`,
// y `fuseSkinnedParts` siempre (`src/render3d/assets.ts`)— y cuenta las mallas
// que quedan: cada una es una llamada de dibujo por copia en escena (y otra
// más si proyecta sombra). Lo pidió la revisión del 30 sep: los siete animales
// facetados de la PR #3 pasaron de 1 malla a 16–27 por animal, la villa 7/60 de
// 500 a 964 llamadas, y nada lo avisó porque `pieced-assets.test.ts` sólo
// recorre `PIECED` (`docs/medidas/revision-rendimiento-2026-09-30.md` §2).
//
//   npx tsx tools/reports/model-draws.ts [--ids cow,hen,pig] [--dir <carpeta-de-glb>] [--over 4]
//
// `--dir` mide otra carpeta con el mismo cargador —p. ej. los GLB de otro
// commit, sacados con `git show <commit>:public/assets/valley3d/cow.glb`—, que
// es como se comparan dos versiones de un modelo. `--over N` marca con «!» los
// que dejan más de N mallas. No toca nada.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Mesh, SkinnedMesh, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIECED, fuseRigidPieces, fuseSkinnedParts } from '../../src/render3d/assets';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ROOT = resolve(import.meta.dirname, '..', '..');
const dir = resolve(opt('dir') ?? resolve(ROOT, 'public', 'assets', 'valley3d'));
const ids = opt('ids')?.split(',');
const over = Number(opt('over') ?? '4');

interface Count { meshes: number; skinned: number; triangles: number; materials: number; textured: number }

function countOf(root: Object3D): Count {
  let meshes = 0, skinned = 0, triangles = 0, textured = 0;
  const materials = new Set<Material>();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    meshes += 1;
    if (node instanceof SkinnedMesh) skinned += 1;
    const geometry = node.geometry;
    triangles += (geometry.index === null ? geometry.getAttribute('position').count : geometry.index.count) / 3;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      if ((material as { map?: unknown }).map) textured += 1;
    }
  });
  return { meshes, skinned, triangles: Math.round(triangles), materials: materials.size, textured };
}

const rows: string[] = [];
let total = 0;
for (const file of readdirSync(dir).filter((name) => name.endsWith('.glb')).sort()) {
  const id = file.slice(0, -4);
  if (ids !== undefined && !ids.includes(id)) continue;
  const bytes = readFileSync(resolve(dir, file));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
  const before = countOf(gltf.scene);
  if (PIECED.has(id)) fuseRigidPieces(gltf.scene, gltf.animations);
  fuseSkinnedParts(gltf.scene);
  const after = countOf(gltf.scene);
  total += after.meshes;
  rows.push([
    after.meshes > over ? '!' : ' ',
    id.padEnd(28),
    `${Math.round(bytes.length / 1024)} KB`.padStart(7),
    `mallas ${before.meshes} → ${after.meshes}`.padEnd(17),
    `esqueleto ${after.skinned}`,
    `materiales ${after.materials}`,
    `texturas ${after.textured}`,
    `triángulos ${after.triangles}`,
    `clips ${gltf.animations.length}`,
    PIECED.has(id) ? 'PIECED' : '',
  ].join('  '));
}
console.log(rows.join('\n'));
console.log(`${rows.length} modelos, ${total} mallas tras cargar (una llamada por malla y copia; «!» = más de ${over})`);
