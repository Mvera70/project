// Admite los cinco GLB G-41 construidos por build-candidates.py. El constructor
// genérico sólo entiende primitivas y omite candidateBuild (juntas y pivotes).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const catalogPath = 'art/catalog.json';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const ids = ['house-twin-gable', 'house-hip-roof', 'stone-house-cross-gable', 'stone-house-tower-loft', 'stone-house'];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const round = (value) => Number(value.toFixed(6));

function inspect(bytes, id) {
  if (bytes.subarray(0, 4).toString() !== 'glTF' || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`${id}: cabecera GLB inválida`);
  }
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  const names = (gltf.nodes ?? []).map((node) => node.name);
  if (!names.includes(`${id}_door`)) throw new Error(`${id}: falta puerta con pivote`);
  if ((gltf.textures ?? []).length || (gltf.images ?? []).length) throw new Error(`${id}: contiene texturas`);
  let triangles = 0;
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    const accessor = gltf.accessors[primitive.indices ?? primitive.attributes.POSITION];
    triangles += accessor.count / 3;
  }
  return {
    triangles: Math.round(triangles),
    objects: gltf.nodes?.length ?? 0,
    meshes: gltf.meshes?.length ?? 0,
    materials: (gltf.materials ?? []).map((material) => material.name),
  };
}

for (const id of ids) {
  const asset = catalog.assets.find((item) => item.id === id);
  if (!asset || asset.artifactRound !== 'G-41') throw new Error(`${id}: falta la declaración G-41`);
  const source = `artifacts/graphics/astra/${id}`;
  const bytes = readFileSync(`${source}/${id}.glb`);
  const metrics = JSON.parse(readFileSync(`${source}/metrics.json`, 'utf8'));
  const seen = inspect(bytes, id);
  if (seen.triangles !== metrics.triangles || seen.triangles > metrics.triangleLimit) {
    throw new Error(`${id}: recuento de triángulos incoherente o fuera de presupuesto`);
  }
  const recipeBytes = readFileSync(asset.recipe);
  const recipe = JSON.parse(recipeBytes.toString('utf8'));
  if (recipe.id !== id || recipe.metadata?.footprint?.join(',') !== '2,2') {
    throw new Error(`${id}: receta o parcela incorrecta`);
  }
  const expectedMaterials = recipe.materials.map((material) => material.name);
  if (seen.materials.slice().sort().join(',') !== expectedMaterials.slice().sort().join(',')) {
    throw new Error(`${id}: materiales distintos de la receta`);
  }
  const digest = sha(bytes);
  const directory = `artifacts/graphics/G-41/approved/${digest.slice(0, 16).toLowerCase()}`;
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/${id}.glb`, bytes);
  const [minX, minY, minZ] = metrics.boundsBlenderCells.min;
  const [maxX, maxY, maxZ] = metrics.boundsBlenderCells.max;
  const min = [round(minX), round(minZ), round(-maxY)];
  const max = [round(maxX), round(maxZ), round(-minY)];
  asset.generator = 'art/recipes/house-variant-candidate/build-candidates.py';
  asset.approved = { runId: `astra-${digest.slice(0, 12).toLowerCase()}`, directory };
  asset.recipeSha256 = sha(recipeBytes);
  asset.bounds = { min, max, size: max.map((value, index) => round(value - min[index])) };
  asset.materials = seen.materials;
  asset.statistics = { objects: seen.objects, meshes: seen.meshes, materials: seen.materials.length, triangles: seen.triangles };
  asset.hashes = { [`${id}.glb`]: digest };
  console.log(`${id}: ${seen.triangles} tris → ${directory}`);
}
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
