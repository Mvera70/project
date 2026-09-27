// Admite un modelo original de Astra sin perder su fuente ni el hash publicado.
// Uso: node tools/art/adopt-scenic-model.mjs burnt-house [great-oak]
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const catalogPath = 'art/catalog.json';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const ids = process.argv.slice(2);
if (!ids.length || ids.some((id) => !['burnt-house', 'great-oak'].includes(id))) {
  throw new Error('Uso: adopt-scenic-model.mjs burnt-house [great-oak]');
}

for (const id of ids) {
  const source = `artifacts/graphics/astra/${id}`;
  const recipe = `art/recipes/${id}-candidate/build.py`;
  const bytes = readFileSync(`${source}/${id}.glb`);
  const metrics = JSON.parse(readFileSync(`${source}/metrics.json`, 'utf8'));
  if (bytes.subarray(0, 4).toString() !== 'glTF' || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`${id}: GLB incompleto`);
  }
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  const names = (gltf.nodes ?? []).map((node) => node.name);
  for (const name of metrics.meshNames ?? []) if (!names.includes(name)) throw new Error(`${id}: falta ${name}`);
  if ((gltf.textures ?? []).length || (gltf.images ?? []).length) throw new Error(`${id}: hay texturas`);
  let triangles = 0;
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
  }
  triangles = Math.round(triangles);
  if (triangles !== metrics.triangles || triangles > metrics.triangleLimit) {
    throw new Error(`${id}: presupuesto o recuento incoherente`);
  }
  const materials = (gltf.materials ?? []).map((material) => material.name);
  const metricNames = materials.map((name) => name.replace(/^great_oak_/, ''));
  if (metricNames.slice().sort().join(',') !== Object.keys(metrics.materials).sort().join(',')) {
    throw new Error(`${id}: materiales distintos de la fuente`);
  }
  const digest = sha(bytes);
  const directory = `artifacts/graphics/G-42/approved/${digest.slice(0, 16).toLowerCase()}`;
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/${id}.glb`, bytes);
  const bounds = metrics.boundsRuntimeCells;
  const min = bounds.min.map((value) => Number(value.toFixed(6)));
  const max = bounds.max.map((value) => Number(value.toFixed(6)));
  const entry = {
    id, artifactRound: 'G-42', status: 'study', recipe, generator: recipe,
    blenderVersion: '5.2.1 LTS',
    approved: { runId: `astra-${digest.slice(0, 12).toLowerCase()}`, directory },
    bounds: { min, max, size: max.map((value, index) => Number((value - min[index]).toFixed(6))) },
    recipeSha256: sha(readFileSync(recipe)),
    materials, clips: [], motion: [], connectors: [],
    statistics: { objects: gltf.nodes?.length ?? 0, meshes: gltf.meshes?.length ?? 0,
      materials: materials.length, triangles },
    hashes: { [`${id}.glb`]: digest },
    provenance: { kind: 'original', source: `Modelo original de The Valley, fuente ${recipe}.`,
      license: 'Project original' },
  };
  const index = catalog.assets.findIndex((asset) => asset.id === id);
  if (index < 0) catalog.assets.push(entry);
  else catalog.assets[index] = entry;
  console.log(`${id}: ${triangles} triángulos, ${digest.slice(0, 16)}`);
}
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
