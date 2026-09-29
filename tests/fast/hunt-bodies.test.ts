// AN-5b · El cuerpo que decide un tiro de caza es el que se pinta: la cápsula
// de cada presa cabe en la caja de su modelo, y lo que está de pie mide lo que
// dice el catálogo. Si un modelo cambia de talla, esta prueba lo dice.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BEAR_RISEN, PREY_BODY, PREY_MODEL, STANDING_HEIGHT, standingOf } from '../../src/render3d/life/hunt-bodies';
import { WARNING_SECONDS } from '../../src/render3d/life/bear';
import { TERRAIN_CODE } from '../../src/engine/state';
import { foundTwenty } from '../helpers/founding';

const catalog = JSON.parse(readFileSync('art/catalog.json', 'utf8')) as {
  assets: { id: string; bounds?: { size: [number, number, number] }; motion?: { name: string; seconds: number }[] }[];
};
const size = (id: string): [number, number, number] => {
  const found = catalog.assets.find(asset => asset.id === id)?.bounds?.size;
  if (found === undefined) throw new Error(`sin caja en el catálogo: ${id}`);
  return found;
};

describe('AN-5b · los cuerpos de la caza', () => {
  // Los modelos de los animales van a cambiar (Vera, 29 sep 2026: «el oso,
  // por ejemplo, cambia»). Si esta falla, el mensaje trae la caja nueva: se
  // copia en `PREY_MODEL` (`hunt-bodies.ts`) y se vuelven a pasar
  // `hunt-report.ts` y `bear-visit-report.ts`, que dicen cuánto cambia la caza.
  it.each(Object.keys(PREY_MODEL) as (keyof typeof PREY_MODEL)[])('la caja de %s es la del modelo publicado', (species) => {
    const [length, height, width] = size(species);
    const nueva = `{ length: ${length.toFixed(3)}, height: ${height.toFixed(3)}, width: ${width.toFixed(3)} }`;
    const model = PREY_MODEL[species];
    const same = Math.abs(model.length - length) < 2e-3 && Math.abs(model.height - height) < 2e-3
      && Math.abs(model.width - width) < 2e-3;
    expect(same, `el modelo de ${species} ha cambiado: su caja es ahora ${nueva}`).toBe(true);
  });

  it('el aviso del oso dura lo que su clip `attack` del catálogo', () => {
    const attack = catalog.assets.find(asset => asset.id === 'bear')?.motion?.find(clip => clip.name === 'attack');
    expect(attack, 'el oso publicado trae `attack`').toBeDefined();
    expect(WARNING_SECONDS, `el clip nuevo dura ${attack?.seconds} s`).toBeCloseTo(attack!.seconds, 2);
  });

  it.each(Object.keys(PREY_BODY) as (keyof typeof PREY_BODY)[])('la cápsula de %s cabe en su modelo y no es un punto', (species) => {
    const body = PREY_BODY[species];
    const [length, height, width] = size(species);
    // A lo largo, de hocico a cola; de ancho, el costado; de alto, del suelo al lomo.
    expect(2 * (body.halfLength + body.radius), 'largo').toBeLessThanOrEqual(length + 1e-9);
    expect(2 * body.radius, 'ancho').toBeLessThanOrEqual(width + 1e-9);
    expect(body.centre + body.radius, 'lomo').toBeLessThanOrEqual(height + 1e-9);
    expect(body.centre - body.radius, 'vientre').toBeGreaterThan(0);
    // Y es un tronco de verdad: al menos dos tercios del ancho del modelo.
    expect(2 * body.radius, 'no es un palillo').toBeGreaterThanOrEqual(width * 0.66);
    // Caída, sube lo que el render la sube: medio ancho del modelo.
    expect(body.flank, 'costado').toBeCloseTo(width / 2, 2);
  });

  it('el oso alzado es más alto que a cuatro patas y cabe en su largo', () => {
    const [length] = size('bear');
    expect(BEAR_RISEN.centre + BEAR_RISEN.halfLength + BEAR_RISEN.radius).toBeGreaterThan(PREY_BODY.bear.centre + PREY_BODY.bear.radius);
    expect(BEAR_RISEN.centre + BEAR_RISEN.halfLength + BEAR_RISEN.radius).toBeLessThanOrEqual(length);
  });

  it('lo que está de pie mide lo que el catálogo dice que se pinta', () => {
    const asset: Record<string, string> = { stone_house: 'stone-house' };
    for (const [kind, drawn] of Object.entries(STANDING_HEIGHT)) {
      expect(drawn, kind).toBeCloseTo(size(asset[kind] ?? kind)[1], 2);
    }
  });

  it('la montaña y el agua no están de pie; una casa sí, con su altura', () => {
    const state = foundTwenty(7);
    const standing = standingOf(state);
    const { width } = state.map;
    const cellOf = (code: number): number => state.map.terrain.findIndex(value => value === code);
    const mountain = cellOf(TERRAIN_CODE.mountain);
    expect(standing(mountain % width, Math.floor(mountain / width))).toBeNull();
    const water = cellOf(TERRAIN_CODE.water);
    if (water >= 0) expect(standing(water % width, Math.floor(water / width))).toBeNull();
    const house = state.buildings.find(building => building.kind === 'house' && building.lostTick === null)!;
    expect(standing(house.x, house.y)).toBeCloseTo(STANDING_HEIGHT.house!, 5);
  });
});
