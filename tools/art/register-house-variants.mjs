// Prepara el catálogo G-41 para construir y validar las cuatro viviendas nuevas
// y la revisión de mampostería. La promoción la hace `npm run art -- all <id>`.
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'art/catalog.json';
const catalog = JSON.parse(readFileSync(path, 'utf8'));
const byId = (id) => {
  const asset = catalog.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Falta ${id} en el catálogo`);
  return asset;
};
const definitions = [
  ['house-twin-gable', 'house'],
  ['house-hip-roof', 'house'],
  ['stone-house-cross-gable', 'stone-house'],
  ['stone-house-tower-loft', 'stone-house'],
];
for (const [id, original] of definitions) {
  if (catalog.assets.some((item) => item.id === id)) continue;
  const base = byId(original);
  catalog.assets.push({
    ...base,
    id,
    artifactRound: 'G-41',
    recipe: `art/recipes/house-variant-candidate/${id}.json`,
    approved: null,
    bounds: null,
    recipeSha256: null,
    statistics: null,
    hashes: null,
    provenance: {
      kind: 'original',
      source: `Variante original de ${original} para The Valley, receta G-41.`,
      license: 'Project original',
    },
  });
}
const stone = byId('stone-house');
stone.artifactRound = 'G-41';
stone.recipe = 'art/recipes/house-variant-candidate/stone-house.json';
stone.provenance = {
  kind: 'original',
  source: 'Revisión original de mampostería para The Valley, receta G-41.',
  license: 'Project original',
};
writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
