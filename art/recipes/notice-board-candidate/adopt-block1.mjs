// Admit the six Block 1 assets whose game sites already exist. The tailor
// board waits for K5. Run from the repository root before assets:publish.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ids = ['notice-board', 'smithy-board', 'chapel-board', 'signpost', 'hide-rack', 'hammer'];
const catalogPath = 'art/catalog.json';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

for (const id of ids) {
  if (catalog.assets.some((asset) => asset.id === id)) throw new Error(`${id} is already in the catalog`);
  const metrics = JSON.parse(readFileSync(`artifacts/graphics/astra/${id}/metrics.json`, 'utf8'));
  if (metrics.triangles > metrics.budget || metrics.textures !== 0) throw new Error(`${id} failed budget`);
  const approvedDirectory = `artifacts/graphics/astra-b1-2026-10-02/approved/${id}`;
  mkdirSync(approvedDirectory, { recursive: true });
  copyFileSync(`artifacts/graphics/astra/${id}/${id}.glb`, join(approvedDirectory, `${id}.glb`));
  catalog.assets.push({
    id,
    blenderVersion: '5.2.1 LTS',
    provenance: {
      kind: 'original',
      source: `Astra, The Valley long model batch 2026-10-02; art/recipes/notice-board-candidate/${id}.json`,
      license: 'project-original',
    },
    artifactRound: 'G-40',
    status: 'study',
    recipe: `art/recipes/notice-board-candidate/${id}.json`,
    generator: 'art/recipes/notice-board-candidate/build.py',
    approved: { runId: 'astra-b1-2026-10-02', directory: approvedDirectory },
    bounds: null,
    recipeSha256: null,
    materials: ['valley_vertex'],
    clips: [],
    motion: [],
    connectors: [],
    statistics: {
      objects: metrics.meshes.length,
      meshes: metrics.meshes.length,
      materials: metrics.materials,
      triangles: metrics.triangles,
    },
    hashes: { [`${id}.glb`]: metrics.sha256.toUpperCase() },
  });
}
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
