import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseRecipe, type ArtRecipe } from './schema';

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

export async function loadRecipe(path: string): Promise<ArtRecipe> {
  const raw = record(await json(path), 'recipe');
  if (raw.palette === undefined) return parseRecipe(raw);
  if (typeof raw.palette !== 'string' || raw.palette.length === 0) throw new Error('recipe.palette must be a relative JSON path.');
  if (raw.direction !== 'A' && raw.direction !== 'B') throw new Error('recipe.direction must be A or B when a palette is used.');
  const paletteRoot = record(await json(resolve(dirname(path), raw.palette)), 'palette');
  if (paletteRoot.schemaVersion !== 1) throw new Error('palette.schemaVersion must be 1.');
  const directions = record(paletteRoot.directions, 'palette.directions');
  const selected = record(directions[raw.direction], `palette.directions.${raw.direction}`);
  if (!Array.isArray(raw.materials)) throw new Error('recipe.materials must be an array.');
  const materials = raw.materials.map((entry, index) => {
    const material = record(entry, `recipe.materials[${index}]`);
    if (typeof material.role !== 'string') throw new Error(`recipe.materials[${index}].role must be a string.`);
    const color = selected[material.role];
    if (typeof color !== 'string') throw new Error(`Palette ${raw.direction} has no role '${material.role}'.`);
    return { ...material, color };
  });
  const render = record(raw.referenceRender, 'recipe.referenceRender');
  const worldRole = render.worldRole;
  if (typeof worldRole !== 'string') throw new Error('recipe.referenceRender.worldRole must be a string when a palette is used.');
  const worldColor = selected[worldRole];
  if (typeof worldColor !== 'string') throw new Error(`Palette ${raw.direction} has no role '${worldRole}'.`);
  return parseRecipe({ ...raw, materials, referenceRender: { ...render, worldColor } });
}
