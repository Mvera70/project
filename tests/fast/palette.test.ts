// P1 · design.md D.2.1 — la paleta después de la decisión.
//
// Las direcciones A y B de G-03 dejaron de competir: el valle es uno solo y lo
// que varía de una casa a otra es el material del tejado. Lo que se protege
// aquí es que esa separación se respete y que las recetas ya aprobadas sigan
// reconstruyéndose exactamente como se aprobaron.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRecipe } from '../../tools/art/recipe';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PALETTE = resolve(ROOT, 'art/recipes/palette.json');

interface Palette {
  schemaVersion: number;
  valley: Record<string, string>;
  houses: Record<string, Record<string, string>>;
  directions: Record<string, Record<string, string>>;
}

const palette = JSON.parse(readFileSync(PALETTE, 'utf8')) as Palette;

/** Una receta mínima que sólo pide un material, escrita junto a la paleta. */
async function recipeAsking(
  fields: Record<string, unknown>,
  role = 'roof',
): Promise<{ colour: string | undefined; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'valley-palette-'));
  const path = join(dir, 'probe.json');
  await writeFile(path, JSON.stringify({
    schemaVersion: 1,
    id: 'probe',
    palette: PALETTE.replace(/\\/g, '/'),
    materials: [{ name: 'probe', role, roughness: 1 }],
    referenceRender: {
      width: 390, height: 640, cameraLocation: [10, -12, 10],
      cameraTarget: [0, 0, 1], orthoScale: 12, worldRole: 'ground',
    },
    groups: [],
    primitives: [{
      type: 'cube', name: 'Probe', location: [0, 0, 0],
      dimensions: [1, 1, 1], material: 'probe',
    }],
    connectors: [],
    clips: [],
    ...fields,
  }), 'utf8');

  const recipe = await loadRecipe(path);
  const material = recipe.materials.find((m) => m.name === 'probe');
  return { colour: material?.color, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

describe('la paleta después de P1 · D.2.1', () => {
  it('el valle es uno solo, con las formas y verdes de B', () => {
    expect(palette.schemaVersion).toBe(2);
    expect(palette.valley.ground).toBe(palette.directions.B?.ground);
    expect(palette.valley.foliage).toBe(palette.directions.B?.foliage);
  });

  it('y lo que varía por casa es el tejado, no el valle', () => {
    const tiled = palette.houses.tiled;
    const thatched = palette.houses.thatched;
    expect(tiled?.roof).not.toBe(thatched?.roof);
    // Ninguna de las dos puede tocar lo que es común: si una casa trajera su
    // propio prado o sus propios árboles, dejarían de convivir en un valle.
    for (const house of [tiled, thatched]) {
      for (const role of ['ground', 'foliage', 'foliageLight', 'sky', 'trunk']) {
        expect(house?.[role], `una casa no define ${role}`).toBeUndefined();
      }
    }
  });

  it('una casa de teja recibe su tejado y el prado del valle', async () => {
    const roof = await recipeAsking({ house: 'tiled' });
    expect(roof.colour).toBe(palette.houses.tiled?.roof);
    await roof.cleanup();

    const ground = await recipeAsking({ house: 'tiled' }, 'ground');
    expect(ground.colour, 'el prado sale del valle, no de la casa')
      .toBe(palette.valley.ground);
    await ground.cleanup();
  });

  it('una casa de paja recibe otro tejado y el mismo prado', async () => {
    const roof = await recipeAsking({ house: 'thatched' });
    expect(roof.colour).toBe(palette.houses.thatched?.roof);
    await roof.cleanup();

    const ground = await recipeAsking({ house: 'thatched' }, 'ground');
    expect(ground.colour).toBe(palette.valley.ground);
    await ground.cleanup();
  });

  it('un material desconocido no se inventa un color', async () => {
    await expect(recipeAsking({ house: 'marble' })).rejects.toThrow(/houses has no/);
  });

  it('las recetas aprobadas de G-03 se siguen reconstruyendo igual', async () => {
    // No es cortesía: si dejaran de reconstruirse, sus artefactos aprobados
    // dejarían de ser evidencia de nada.
    for (const direction of ['A', 'B'] as const) {
      const probe = await recipeAsking({ direction });
      expect(probe.colour, `dirección ${direction}`)
        .toBe(palette.directions[direction]?.roof);
      await probe.cleanup();
    }
  });
});
