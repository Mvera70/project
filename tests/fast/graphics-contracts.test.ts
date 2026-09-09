import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { GraphicsTarget } from '../../src/render3d/contracts';
import type { InspectTarget } from '../../src/ui/inspect';

const CONTRACTS = fileURLToPath(new URL('../../src/render3d/contracts.ts', import.meta.url));
const STATE = fileURLToPath(new URL('../../src/engine/state.ts', import.meta.url));

describe('G-01 · graphics boundary', () => {
  it('returns exactly the identities accepted by the existing inspector', () => {
    expectTypeOf<GraphicsTarget>().toEqualTypeOf<InspectTarget>();
  });

  it('depends on the engine through a type-only GameState import', () => {
    const source = readFileSync(CONTRACTS, 'utf8');
    const imports = [...source.matchAll(/import\s+([^;]+)\s+from\s+['"]([^'"]+)['"]/gu)]
      .map((match) => ({ clause: match[1] ?? '', target: match[2] ?? '' }));

    expect(imports).toEqual([{ clause: 'type { GameState }', target: '../engine/state' }]);
    expect(source).not.toMatch(/from\s+['"]three(?:\/|['"])/u);
  });

  it('keeps renderer ownership and presentation data out of GameState', () => {
    const source = readFileSync(STATE, 'utf8');
    const body = source.match(/export interface GameState\s*\{(?<body>[\s\S]*?)\n\}/u)?.groups?.body;

    expect(body).toBeDefined();
    expect(body).not.toMatch(/\b(?:scene|camera|renderer|presentationSeconds|deltaSeconds)\s*:/u);
    expect(source).not.toMatch(/from\s+['"][^'"]*render3d/u);
  });

  it('declares asynchronous construction without shipping a placeholder implementation', () => {
    const source = readFileSync(CONTRACTS, 'utf8');
    expect(source).toMatch(/export declare function createGraphicsRenderer[\s\S]*Promise<GraphicsRenderer>;/u);
    expect(source).not.toMatch(/createGraphicsRenderer[\s\S]*\{/u);
  });
});
