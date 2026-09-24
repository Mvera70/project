import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Part {
  readonly name: string;
  readonly material?: string;
  readonly location?: readonly number[];
  readonly dimensions?: readonly number[];
}

interface Recipe {
  readonly id: string;
  readonly metadata: { readonly footprint: readonly number[] };
  readonly materials: readonly { readonly name: string; readonly role: string }[];
  readonly primitives: readonly Part[];
}

function recipe(path: string): Recipe {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Recipe;
}

const variants = [
  { base: 'house', other: ['house-twin-gable', 'house-hip-roof'], prefix: 'House' },
  { base: 'stone-house', other: ['stone-house-cross-gable', 'stone-house-tower-loft'], prefix: 'Stone' },
] as const;

describe('nuevas siluetas de vivienda', () => {
  for (const { base, other, prefix } of variants) {
    const original = recipe(`art/recipes/${base}/${base}.json`);
    for (const id of other) {
      const candidate = recipe(`art/recipes/house-variant-candidate/${id}.json`);
      it(`${id} conserva parcela, puerta y tres ventanas para la noche`, () => {
        expect(candidate.id).toBe(id);
        expect(candidate.metadata.footprint).toEqual([2, 2]);
        const parts = (source: Recipe, names: readonly string[]) => source.primitives
          .filter(part => names.includes(part.name))
          .map(({ name, material, location, dimensions }) => ({ name, material, location, dimensions }));
        const openingNames = [`${prefix}_Door`, ...['A', 'B', 'C'].map(letter => `${prefix}_Window_${letter}`)];
        expect(parts(candidate, openingNames)).toEqual(parts(original, openingNames));
        expect(parts(candidate, openingNames)).toHaveLength(4);
        expect(candidate.primitives.filter(part => part.material === 'window')).toHaveLength(
          original.primitives.filter(part => part.material === 'window').length,
        );
        expect(candidate.materials.find(material => material.name === 'window'))
          .toEqual(original.materials.find(material => material.name === 'window'));
      });
    }
  }
});
