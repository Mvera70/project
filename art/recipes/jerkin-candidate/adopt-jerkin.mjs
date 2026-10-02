// Publish only the leather jerkin; later metal ages remain model candidates.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const id = 'jerkin';
const catalogPath = 'art/catalog.json';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
if (catalog.assets.some((asset) => asset.id === id)) throw new Error(`${id} is already in the catalog`);
const metrics = JSON.parse(readFileSync(`artifacts/graphics/astra/${id}/metrics.json`, 'utf8'));
if (metrics.triangles > metrics.budget || metrics.textures !== 0) throw new Error(`${id} failed budget`);
const approvedDirectory = `artifacts/graphics/astra-b3-2026-10-02/approved/${id}`;
mkdirSync(approvedDirectory, { recursive: true });
copyFileSync(`artifacts/graphics/astra/${id}/${id}.glb`, join(approvedDirectory, `${id}.glb`));
catalog.assets.push({
  id,
  blenderVersion: '5.2.1 LTS',
  provenance: {
    kind: 'original',
    source: 'Astra, The Valley long model batch 2026-10-02; art/recipes/jerkin-candidate/jerkin.json',
    license: 'project-original',
  },
  artifactRound: 'G-40',
  status: 'study',
  recipe: 'art/recipes/jerkin-candidate/jerkin.json',
  generator: 'art/recipes/jerkin-candidate/build.py',
  approved: { runId: 'astra-b3-2026-10-02', directory: approvedDirectory },
  bounds: null,
  recipeSha256: null,
  materials: ['valley_vertex'],
  clips: [],
  motion: [],
  connectors: ['jerkin_spine'],
  statistics: { objects: 1, meshes: 1, materials: 1, triangles: metrics.triangles },
  hashes: { [`${id}.glb`]: metrics.sha256.toUpperCase() },
});
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
