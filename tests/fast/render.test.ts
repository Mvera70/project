import { describe, expect, it } from 'vitest';
import type { Season, ValleyMap } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { cellFor } from '@render/canvas';
import { luminance, outline, PALETTES, paletteFor } from '@render/palette';
import { regionContours } from '@render/layers/terrain';
import { BUILDING_SPRITES, NAMED_TONES } from '@render/sprites';
import { crowdPositions } from '@render/crowd';
import { foundGame } from '@engine/found';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { advanceAccumulator } from '@ui/loop';
import { roman } from '@ui/app';

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

describe('M-17 · catálogo visual', () => {
  it('tiene un sprite para cada clase de edificio', () => {
    expect(Object.keys(BUILDING_SPRITES).sort()).toEqual([
      'chapel', 'church', 'field', 'granary', 'grave_yard', 'house', 'mill',
      'palisade', 'smithy', 'stone_house', 'wall', 'watchtower', 'well',
    ]);
  });

  it('reserva ocho tonos estables para los personajes nombrados', () => {
    expect(NAMED_TONES).toHaveLength(8);
    expect(new Set(NAMED_TONES).size).toBe(8);
  });
});

describe('M-18 · multitud derivada', () => {
  it('es pura, determinista y no deja figuras fuera del valle', () => {
    const state = foundGame(7);
    run(state, 20 * 48, 'prudent', CATALOG);
    const tick = state.tick;
    const terrain = [...state.map.terrain];
    const first = crowdPositions(state, 0.45);
    expect(crowdPositions(state, 0.45)).toEqual(first);
    expect(state.tick).toBe(tick);
    expect([...state.map.terrain]).toEqual(terrain);
    for (const figure of first) {
      expect(figure.x).toBeGreaterThanOrEqual(0);
      expect(figure.y).toBeGreaterThanOrEqual(0);
      expect(figure.x + 1).toBeLessThanOrEqual(state.map.width);
      expect(figure.y + (figure.named ? 1.8 : 1.5)).toBeLessThanOrEqual(state.map.height);
    }
  });

  it('de noche no deja a nadie a la intemperie', () => {
    expect(crowdPositions(foundGame(7), 0.9)).toEqual([]);
  });

  it('calcula mil fotogramas de ochenta figuras en menos de 100 ms', () => {
    const state = foundGame(7);
    const originals = state.people.villagers;
    while (state.people.villagers.length < 80) {
      const source = originals[state.people.villagers.length % originals.length]!;
      state.people.villagers.push({ ...source, id: state.people.nextId++, named: false, name: '' });
    }
    const started = performance.now();
    for (let i = 0; i < 1_000; i += 1) crowdPositions(state, 0.45);
    expect(performance.now() - started).toBeLessThan(100);
  });
});

describe('M-20 · reloj de aplicación', () => {
  it('a 4× y 60 fps, doce minutos reales producen 192 ticks', () => {
    let remainder = 0;
    let ticks = 0;
    let maximum = 0;
    for (let frame = 0; frame < 12 * 60 * 60; frame += 1) {
      const advance = advanceAccumulator(remainder, 1000 / 60, 4);
      remainder = advance.remainderMs;
      ticks += advance.ticks;
      maximum = Math.max(maximum, advance.ticks);
    }
    expect(ticks).toBe(192);
    expect(maximum).toBeLessThanOrEqual(8);
  });

  it('un fotograma nunca ejecuta más de ocho ticks y conserva la deuda', () => {
    const advance = advanceAccumulator(0, 10 * 60_000, 16);
    expect(advance.ticks).toBe(8);
    expect(advance.remainderMs).toBeGreaterThan(0);
  });

  it('presenta el año civil en romanos desde ANNO I', () => {
    expect(roman(1)).toBe('I');
    expect(roman(4)).toBe('IV');
    expect(roman(120)).toBe('CXX');
  });
});
