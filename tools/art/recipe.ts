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

/**
 * Los colores que le tocan a esta receta.
 *
 * El esquema 1 tenía dos direcciones enteras y rivales, A y B, y una receta
 * elegía una. El 2 recoge la decisión de P1 (design.md D.2.1): el valle es uno
 * solo y lo que varía de una casa a otra es el material del tejado. Una receta
 * declara `house: 'tiled' | 'thatched'` y hereda del valle todo lo demás.
 *
 * El 1 se sigue leyendo, y no por cortesía: los artefactos aprobados de G-03
 * tienen que poder reconstruirse tal como se aprobaron, o dejarían de ser
 * evidencia de nada.
 */
function resolveColours(
  paletteRoot: Record<string, unknown>,
  raw: Record<string, unknown>,
  isVersionTwo: boolean,
): Record<string, unknown> {
  if (!isVersionTwo) {
    if (raw.direction !== 'A' && raw.direction !== 'B') {
      throw new Error('recipe.direction must be A or B with a schema 1 palette.');
    }
    const directions = record(paletteRoot.directions, 'palette.directions');
    return record(directions[raw.direction], `palette.directions.${raw.direction}`);
  }

  // Esquema 2. Una receta antigua que todavía pida una dirección la recibe de
  // `directions`, que el esquema 2 conserva intacta.
  if (raw.direction === 'A' || raw.direction === 'B') {
    const directions = record(paletteRoot.directions, 'palette.directions');
    return record(directions[raw.direction], `palette.directions.${raw.direction}`);
  }

  const valley = record(paletteRoot.valley, 'palette.valley');
  const house = raw.house;
  if (house === undefined) return { ...valley };
  if (typeof house !== 'string') throw new Error('recipe.house must be a string.');
  const houses = record(paletteRoot.houses, 'palette.houses');
  const chosen = houses[house];
  if (chosen === undefined) throw new Error(`palette.houses has no '${house}'.`);
  return { ...valley, ...record(chosen, `palette.houses.${house}`) };
}

export async function loadRecipe(path: string): Promise<ArtRecipe> {
  const raw = record(await json(path), 'recipe');
  if (raw.palette === undefined) return parseRecipe(raw);
  if (typeof raw.palette !== 'string' || raw.palette.length === 0) throw new Error('recipe.palette must be a relative JSON path.');
  const paletteRoot = record(await json(resolve(dirname(path), raw.palette)), 'palette');
  const version = paletteRoot.schemaVersion;
  if (version !== 1 && version !== 2) throw new Error('palette.schemaVersion must be 1 or 2.');
  const selected = resolveColours(paletteRoot, raw, version === 2);
  if (!Array.isArray(raw.materials)) throw new Error('recipe.materials must be an array.');
  const materials = raw.materials.map((entry, index) => {
    const material = record(entry, `recipe.materials[${index}]`);
    if (typeof material.role !== 'string') throw new Error(`recipe.materials[${index}].role must be a string.`);
    const color = selected[material.role];
    if (typeof color !== 'string') throw new Error(`The palette has no role '${material.role}'.`);
    return { ...material, color };
  });
  const render = record(raw.referenceRender, 'recipe.referenceRender');
  const worldRole = render.worldRole;
  if (typeof worldRole !== 'string') throw new Error('recipe.referenceRender.worldRole must be a string when a palette is used.');
  const worldColor = selected[worldRole];
  if (typeof worldColor !== 'string') throw new Error(`The palette has no role '${worldRole}'.`);
  return parseRecipe({ ...raw, materials, referenceRender: { ...render, worldColor } });
}
