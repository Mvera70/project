import { describe, expect, it } from 'vitest';
import type { Season, ValleyMap } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { cellFor } from '@render/canvas';
import { luminance, outline, PALETTES, paletteFor } from '@render/palette';
import { regionContours } from '@render/layers/terrain';

const SILHOUETTES = ['forest', 'meadow', 'field', 'water', 'path'] as const;

describe('M-16 · paletas', () => {
  it('separa las cinco siluetas al menos ocho puntos en las cuatro estaciones', () => {
    for (const palette of Object.values(PALETTES)) {
      const values = SILHOUETTES.map((key) => luminance(palette[key])).sort((a, b) => a - b);
      for (let i = 1; i < values.length; i += 1) {
        expect((values[i] as number) - (values[i - 1] as number)).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('entra en cada estación sin un corte de color', () => {
    const order: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    order.forEach((season, index) => {
      const previous = PALETTES[order[(index + 3) % 4] as Season];
      expect(paletteFor(season, 0)).toEqual(previous);
      expect(paletteFor(season, 2)).toEqual(PALETTES[season]);
      expect(paletteFor(season, 1)).not.toEqual(previous);
      expect(paletteFor(season, 1)).not.toEqual(PALETTES[season]);
    });
  });

  it('deriva el contorno mezclando un 45 % de negro', () => {
    expect(outline('#ffffff')).toBe('#8c8c8c');
  });
});

describe('M-16 · geometría y regiones', () => {
  it('da una celda de 10 px al mapa móvil de 390 por 664', () => {
    expect(cellFor(390, 664)).toBe(10);
  });

  it('agrupa una mancha contigua en un solo contorno', () => {
    const map = {
      width: 36, height: 56,
      terrain: new Uint8Array(36 * 56), traffic: new Uint16Array(36 * 56),
      path: new Uint8Array(36 * 56), ruins: new Uint8Array(36 * 56),
      forestAge: new Uint8Array(36 * 56), forestStock: new Uint16Array(36 * 56),
    } satisfies ValleyMap;
    map.terrain[0] = TERRAIN_CODE.forest;
    map.terrain[1] = TERRAIN_CODE.forest;
    expect(regionContours(map, TERRAIN_CODE.forest)).toHaveLength(1);
  });
});

