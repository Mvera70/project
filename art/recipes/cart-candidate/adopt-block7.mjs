// Admit only static village furniture. The horse waits for Claude Code review;
// fence pieces wait for the corral rule.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ids = ['bench', 'log-seat', 'cart'];
const catalogPath = 'art/catalog.json';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
for (const id of ids) {
  if (catalog.assets.some((asset) => asset.id === id)) throw new Error(`${id} is already in the catalog`);
  const metrics = JSON.parse(readFileSync(`artifacts/graphics/astra/${id}/metrics.json`, 'utf8'));
  if (metrics.triangles > metrics.limit || metrics.textures !== 0 || metrics.vertexColors !== true) {
    throw new Error(`${id} failed budget or palette`);
  }
  const glb = readFileSync(`artifacts/graphics/astra/${id}/${id}.glb`);
  const sha256 = createHash('sha256').update(glb).digest('hex').toUpperCase();
  const approvedDirectory = `artifacts/graphics/astra-b7-2026-10-02/approved/${id}`;
  mkdirSync(approvedDirectory, { recursive: true });
  copyFileSync(`artifacts/graphics/astra/${id}/${id}.glb`, join(approvedDirectory, `${id}.glb`));
  catalog.assets.push({
    id,
    blenderVersion: '5.2.1 LTS',
    provenance: {
      kind: 'original',
      source: `Astra, The Valley long model batch 2026-10-02; art/recipes/${id}-candidate/${id}.json`,
      license: 'project-original',
    },
    artifactRound: 'G-40',
    status: 'study',
    recipe: `art/recipes/${id}-candidate/${id}.json`,
    generator: 'art/recipes/cart-candidate/build.py',
    approved: { runId: 'astra-b7-2026-10-02', directory: approvedDirectory },
    bounds: null,
    recipeSha256: null,
    materials: ['valley_vertex'],
    clips: [],
    motion: [],
    connectors: [],
    statistics: {
      objects: metrics.meshCount,
      meshes: metrics.meshCount,
      materials: 1,
      triangles: metrics.triangles,
    },
    hashes: { [`${id}.glb`]: sha256 },
  });
}
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
