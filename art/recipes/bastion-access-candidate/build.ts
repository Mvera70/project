import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { loadRecipe } from '../../../tools/art/recipe';

const out = 'artifacts/graphics/E3-access-candidate';
await mkdir(out, { recursive: true });
const recipe = await loadRecipe('art/recipes/bastion-access-candidate/bastion-access-candidate.json');
await writeFile(`${out}/resolved-recipe.json`, JSON.stringify(recipe, null, 2));
const result = spawnSync('C:/Program Files/Blender Foundation/Blender 5.2/blender.exe', [
  '--background', '--factory-startup', '--python', 'tools/art/blender-build.py', '--',
  `${out}/resolved-recipe.json`, out, 'bastion-access-candidate',
], { encoding: 'utf8' });
await writeFile(`${out}/build.log`, result.stdout + result.stderr);
if (result.status !== 0 || !result.stdout.includes('VALLEY_ART_BUILD_OK:')) throw new Error(result.stderr || result.stdout);
console.log('Candidate exported without catalog changes.');
