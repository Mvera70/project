import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateGlb } from '../../tools/art/glb';
import { parseCatalog } from '../../tools/art/schema';
import { loadRecipe } from '../../tools/art/recipe';

const root = resolve(import.meta.dirname, '../..');
const catalog = parseCatalog(JSON.parse(readFileSync(resolve(root, 'art/catalog.json'), 'utf8')));

describe('Modelos originales: presupuestos y contratos de exportación', () => {
  // La flecha y el escudo los rehízo Vera pieza a pieza (25 sep 2026,
  // `deliverables/marked-models-trial/`) y ya no salen de una receta: su recibo
  // es el GLB mismo (`tools/art/adopt-models.mjs`). Y su tope sube, por decisión
  // suya, a lo que miden: flecha 104 triángulos en 4 materiales (antes 62 en 3),
  // escudo 1 408 en 6 (antes 122 en 3). Al cargarlos se funden por material
  // (`fuseRigidPieces`), así que cada uno cuesta sus materiales en llamadas.
  it.each([
    ['arrow', 110, 4], ['shield', 1500, 6],
  ] as const)('%s, adoptado, conserva recibo verificable y su tope', (id, budget, materials) => {
    const asset = catalog.assets.find((entry) => entry.id === id)!;
    expect(asset.statistics?.triangles).toBeGreaterThan(0);
    expect(asset.statistics?.triangles).toBeLessThanOrEqual(budget);
    expect(asset.statistics?.materials).toBeLessThanOrEqual(materials);
    expect(asset.connectors).toContain('grip');
    expect(asset.bounds?.size.every((size) => Number.isFinite(size) && size > 0)).toBe(true);
    const path = resolve(root, asset.approved!.directory, `${id}.glb`);
    if (existsSync(path)) {
      expect(createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase()).toBe(asset.hashes?.[`${id}.glb`]);
    }
  });

  it.each([
    ['bow', 400], ['spear', 200],
    ['gate', 500], ['plough', 400], ['fountain', 500],
  ] as const)('%s conserva receta, escala y recibo verificable', async (id, budget) => {
    const asset = catalog.assets.find((entry) => entry.id === id)!;
    expect(asset).toBeDefined();
    const recipe = await loadRecipe(resolve(root, asset.recipe));
    expect(recipe.scale).toBeCloseTo(1 / 3);
    expect(asset.statistics?.triangles).toBeGreaterThan(0);
    expect(asset.statistics?.triangles).toBeLessThanOrEqual(budget);
    expect(asset.statistics?.materials).toBeLessThanOrEqual(3);
    expect(asset.connectors).toEqual(recipe.connectors);
    expect(asset.bounds?.size.every((size) => Number.isFinite(size) && size > 0)).toBe(true);
    expect(asset.hashes?.[`${id}.glb`]).toMatch(/^[0-9A-F]{64}$/u);
    const path = resolve(root, asset.approved!.directory, `${id}.glb`);
    // Los artefactos locales no se versionan; cuando existen se inspeccionan sus bytes.
    if (existsSync(path)) {
      const bytes = readFileSync(path);
      expect(validateGlb(recipe, bytes).statistics).toEqual(asset.statistics);
      expect(createHash('sha256').update(bytes).digest('hex').toUpperCase())
        .toBe(asset.hashes?.[`${id}.glb`]);
    }
    if (['bow', 'spear'].includes(id)) {
      expect(recipe.connectors).toContain('grip');
    }
    if (id === 'gate') {
      expect(recipe.mergeByMaterial).toBe(false);
      expect(recipe.connectors).toContain('gate_door');
      expect(recipe.groups.find((group) => group.name === 'gate_door')?.parent).toBe('Root');
    }
    if (id === 'fountain') {
      expect(asset.bounds?.size[0]).toBeCloseTo(0.8, 2);
      expect(asset.bounds?.size[1]).toBeCloseTo(0.65, 2);
      expect(asset.bounds?.min[1]).toBeCloseTo(0, 5);
    }
  });
});
