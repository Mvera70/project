import { readFile } from 'node:fs/promises';
import { loadRecipe } from '../../../tools/art/recipe';
const ids: string[] = JSON.parse(await readFile('art/recipes/barrel-candidate/ids.json', 'utf8'));
for (const id of ids) {
  const recipe = await loadRecipe(`art/recipes/${id}-candidate/${id}.json`);
  if (recipe.id !== id) throw new Error(`Wrong id: ${id}`);
}
console.log(`${ids.length} canonical recipes validated`);
