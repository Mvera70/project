import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atomicWriteJson } from '../../tools/art/files';
import { validateGlb } from '../../tools/art/glb';
import { parseCatalog, parseRecipe } from '../../tools/art/schema';

const ROOT = resolve(import.meta.dirname, '..', '..');

function source(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;
}

describe('G-02 · canonical art recipe and catalog', () => {
  it('keeps stable identity and references one canonical recipe and generator', () => {
    const recipe = parseRecipe(source('art/recipes/axis-marker.json'));
    const catalog = parseCatalog(source('art/catalog.json'));
    const asset = catalog.assets.find((item) => item.id === recipe.id);

    expect(asset).toBeDefined();
    expect(asset?.recipe).toBe('art/recipes/axis-marker.json');
    expect(asset?.generator).toBe('tools/art/blender-build.py');
    expect(existsSync(resolve(ROOT, asset?.recipe ?? 'missing'))).toBe(true);
    expect(existsSync(resolve(ROOT, asset?.generator ?? 'missing'))).toBe(true);
    expect(asset?.materials).toEqual(recipe.materials.map((item) => item.name));
    expect(asset?.connectors).toEqual(recipe.connectors);
    expect(asset?.clips).toEqual(recipe.clips);
    expect(asset?.status).toBe('study');
    expect(asset?.approved).not.toBeNull();
    expect(asset?.bounds?.size.every((value) => Number.isFinite(value) && value > 0)).toBe(true);
    expect(asset?.statistics).toEqual({ objects: 7, meshes: 7, materials: 4, triangles: 504 });
    expect(asset?.hashes?.['axis-marker.glb']).toMatch(/^[0-9A-F]{64}$/u);

    const approvedGlb = resolve(ROOT, asset?.approved?.directory ?? 'missing', 'axis-marker.glb');
    if (existsSync(approvedGlb)) {
      const buffer = readFileSync(approvedGlb);
      const inspection = validateGlb(recipe, buffer);
      expect(createHash('sha256').update(buffer).digest('hex').toUpperCase())
        .toBe(asset?.hashes?.['axis-marker.glb']);
      expect(inspection.statistics).toEqual(asset?.statistics);
      expect(inspection.materialNames.slice().sort()).toEqual(asset?.materials.slice().sort());
    }
  });

  it('rejects unsupported primitives and invalid dimensions before Blender', () => {
    const base = source('art/recipes/axis-marker.json') as Record<string, unknown>;
    expect(() => parseRecipe({ ...base, primitives: [{
      type: 'torus', name: 'Bad_Type', location: [0, 0, 0], material: 'ground',
    }] })).toThrow("recipe.primitives[0].type 'torus' is unsupported");
    expect(() => parseRecipe({ ...base, primitives: [{
      type: 'cube', name: 'Bad_Size', location: [0, 0, 0], dimensions: [1, 0, -2], material: 'ground',
    }] })).toThrow('recipe.primitives[0].dimensions[1] must be greater than zero');
  });

  it('rejects a truncated GLB before it can satisfy validation', () => {
    const recipe = parseRecipe(source('art/recipes/axis-marker.json'));
    expect(() => validateGlb(recipe, Buffer.from('glTF'))).toThrow('GLB is truncated');
  });

  it('preserves the prior catalog when interrupted before atomic replacement', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'valley-art-'));
    const catalogPath = join(directory, 'catalog.json');
    const original = '{"generation":"approved"}\n';
    try {
      await writeFile(catalogPath, original, 'utf8');
      await expect(atomicWriteJson(catalogPath, { generation: 'candidate' }, true))
        .rejects.toThrow('Simulated interruption');
      expect(await readFile(catalogPath, 'utf8')).toBe(original);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
