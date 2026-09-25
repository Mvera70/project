// Adoptar modelos hechos fuera de las recetas. 25 sep 2026.
//
// Las recetas (`art/recipes/`, `tools/art/index.ts`) no son la única forma de
// hacer un modelo: Vera rehízo once con su propio script de Blender
// (`deliverables/marked-models-trial/build-models.py`). Esto los admite en el
// catálogo con el mismo recibo que un modelo de receta —carpeta de aprobados,
// hash, estadísticas, caja, clips y marcha— para que `publish-assets.ts` los
// publique por el camino de siempre y las pruebas puedan comprobar sus bytes.
//
//   node tools/art/adopt-models.mjs <lista.json>
//
// La lista: [{ "id", "glb", "preview"?, "motion"? }, …], con `motion` la que
// imprime `rigid-clips.mjs` para los animales.

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const [listPath] = process.argv.slice(2);
if (!listPath) throw new Error('Uso: adopt-models.mjs <lista.json>');
const list = JSON.parse(readFileSync(listPath, 'utf8'));
const CATALOG = 'art/catalog.json';
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const ROUND = 'marked-models-63db59c';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();

function gltfOf(bytes) {
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  const binStart = 20 + length;
  return { json, bin: bytes.subarray(binStart + 8, binStart + 8 + bytes.readUInt32LE(binStart)) };
}

// Matrices de columna, como glTF.
const multiply = (a, b) => {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) {
    for (let k = 0; k < 4; k += 1) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  }
  return out;
};
function trs(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const apply = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

/** Lo que el catálogo guarda de un GLB: estadísticas, caja, materiales y clips. */
function inspect(bytes) {
  const { json } = gltfOf(bytes);
  const nodes = json.nodes ?? [];
  let triangles = 0;
  let meshes = 0;
  const materials = new Set();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (index, parent) => {
    const node = nodes[index];
    const world = multiply(parent, trs(node));
    if (node.mesh !== undefined) {
      meshes += 1;
      for (const primitive of json.meshes[node.mesh].primitives) {
        const count = primitive.indices !== undefined ? json.accessors[primitive.indices].count
          : json.accessors[primitive.attributes.POSITION].count;
        triangles += count / 3;
        if (primitive.material !== undefined) materials.add(json.materials[primitive.material].name ?? String(primitive.material));
        const position = json.accessors[primitive.attributes.POSITION];
        // Las ocho esquinas de la caja de la primitiva, llevadas al mundo.
        for (const cx of [position.min[0], position.max[0]]) for (const cy of [position.min[1], position.max[1]]) {
          for (const cz of [position.min[2], position.max[2]]) {
            const p = apply(world, [cx, cy, cz]);
            for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, identity);
  const round = (v) => Number(v.toFixed(6));
  return {
    statistics: { objects: nodes.length, meshes, materials: materials.size, triangles: Math.round(triangles) },
    bounds: { min: min.map(round), max: max.map(round), size: max.map((v, k) => round(v - min[k])) },
    // El catálogo admite letras, cifras, `_` y `-`; Blender numera los
    // duplicados con punto (`coat.002`). El GLB conserva su nombre.
    materials: [...new Set([...materials].map((name) => name.replace(/[^A-Za-z0-9_-]/gu, '_')))],
    clips: (json.animations ?? []).map((animation) => animation.name),
    connectors: nodes.some((node) => node.name === 'grip') ? ['grip'] : [],
  };
}

for (const item of list) {
  const bytes = readFileSync(item.glb);
  const directory = `artifacts/graphics/marked-models/approved/${item.id}`;
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/${item.id}.glb`, bytes);
  const hashes = { [`${item.id}.glb`]: sha(bytes) };
  if (item.preview && existsSync(item.preview)) {
    copyFileSync(item.preview, `${directory}/${item.id}-preview.png`);
    hashes[`${item.id}-preview.png`] = sha(readFileSync(item.preview));
  }
  const seen = inspect(bytes);
  const motion = (item.motion ?? []).slice().sort((a, b) => seen.clips.indexOf(a.name) - seen.clips.indexOf(b.name));
  const index = catalog.assets.findIndex((asset) => asset.id === item.id);
  if (index < 0) throw new Error(`'${item.id}' no está en el catálogo`);
  const previous = catalog.assets[index];
  catalog.assets[index] = {
    ...previous,
    artifactRound: 'G-40',
    status: 'study',
    recipe: 'deliverables/marked-models-trial/build-models.py',
    generator: item.motion === undefined ? 'deliverables/marked-models-trial/build-models.py'
      : 'deliverables/marked-models-trial/build-models.py · tools/art/rigid-clips.mjs',
    approved: { runId: ROUND, directory },
    bounds: seen.bounds,
    recipeSha256: null,
    materials: seen.materials,
    clips: seen.clips,
    motion: seen.clips.map((name) => {
      const declared = motion.find((entry) => entry.name === name);
      if (declared === undefined) throw new Error(`'${item.id}': el clip ${name} no tiene marcha declarada`);
      return declared;
    }),
    connectors: seen.connectors,
    statistics: seen.statistics,
    hashes,
    provenance: {
      kind: 'original',
      source: `Modelado por Vera para The Valley (deliverables/marked-models-trial, ${basename(item.glb)}; commit 63db59c)`
        + (item.motion === undefined ? '.' : '; clips idle/walk de tools/art/rigid-clips.mjs sobre sus nodos.'),
      license: previous.provenance.license,
    },
  };
  process.stdout.write(`${item.id}: ${seen.statistics.triangles} tri, ${seen.statistics.meshes} mallas, ${seen.materials.length} materiales, clips ${seen.clips.join('/') || '—'}\n`);
}
writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
