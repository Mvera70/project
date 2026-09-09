// M-29 · design.md §7.7.
//
// Lo que hay que proteger no es el dibujo: es que el ganado sea DERIVADO. No
// escribe estado, no se guarda, no mueve un número, y dos partidas con la
// misma semilla lo colocan igual. El día que sea comida, esta prueba tendrá
// que cambiar a propósito y no por accidente.
import { describe, expect, it } from 'vitest';
import { ANIMALS } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { animalPositions } from '@render/animals';
import { fingerprint } from '../helpers/fingerprint';

function village(years: number, seed = 7) {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

describe('el ganado · §7.7', () => {
  it('no escribe una sola vez en el estado', () => {
    const state = village(20);
    const before = fingerprint(state);
    for (const fraction of [0, 0.2, 0.45, 0.7, 0.95]) animalPositions(state, fraction);
    expect(fingerprint(state)).toBe(before);
  });

  it('la misma partida en el mismo instante da el mismo ganado', () => {
    const a = village(20);
    const b = village(20);
    expect(animalPositions(a, 0.4)).toEqual(animalPositions(b, 0.4));
  });

  it('de noche el corral está vacío: es la ventana por la que entrarán los lobos', () => {
    const state = village(20);
    expect(animalPositions(state, 0.45).length).toBeGreaterThan(0);
    expect(animalPositions(state, 0.8)).toEqual([]);
    expect(animalPositions(state, 0.99)).toEqual([]);
  });

  it('sin aldea no hay ganado', () => {
    const state = village(20);
    for (const building of state.buildings) building.lostTick = state.tick;
    expect(animalPositions(state, 0.45)).toEqual([]);
  });

  it('las gallinas siguen a las casas y las vacas a los campos', () => {
    const state = village(20);
    const animals = animalPositions(state, 0.45);
    const houses = state.buildings.filter((b) => b.lostTick === null
      && (b.kind === 'house' || b.kind === 'stone_house')).length;
    const fields = state.buildings.filter((b) => b.kind === 'field' && b.lostTick === null).length;

    expect(houses).toBeGreaterThan(0);
    expect(animals.filter((a) => a.kind === 'hen')).toHaveLength(
      Math.min(houses, ANIMALS.MAX_PER_KIND) * ANIMALS.HENS_PER_HOUSE,
    );
    expect(animals.filter((a) => a.kind === 'cow').length)
      .toBe(Math.min(Math.floor(fields / ANIMALS.FIELDS_PER_COW), ANIMALS.MAX_PER_KIND));
  });

  it('no hay cerdos hasta que hay granero con que cebarlos', () => {
    const state = village(20);
    const granaries = state.buildings.filter((b) => b.kind === 'granary' && b.lostTick === null);
    expect(granaries.length).toBeGreaterThan(0);
    expect(animalPositions(state, 0.45).some((a) => a.kind === 'pig')).toBe(true);

    for (const granary of granaries) granary.lostTick = state.tick;
    expect(animalPositions(state, 0.45).some((a) => a.kind === 'pig')).toBe(false);
  });

  it('ninguna cabeza se sale del mapa, ni en una aldea del borde', () => {
    for (const seed of [3, 7, 11, 19, 42]) {
      const state = village(30, seed);
      for (const fraction of [0, 0.25, 0.5, 0.75]) {
        for (const animal of animalPositions(state, fraction)) {
          expect(animal.x, `seed ${seed}`).toBeGreaterThanOrEqual(0);
          expect(animal.y, `seed ${seed}`).toBeGreaterThanOrEqual(0);
          expect(animal.x, `seed ${seed}`).toBeLessThanOrEqual(state.map.width - 1);
          expect(animal.y, `seed ${seed}`).toBeLessThanOrEqual(state.map.height - 1);
        }
      }
    }
  });

  it('una aldea de ochenta no se convierte en un corral de cientos', () => {
    const state = village(60);
    const animals = animalPositions(state, 0.45);
    for (const kind of ['hen', 'pig', 'cow'] as const) {
      const many = animals.filter((a) => a.kind === kind).length;
      const cap = kind === 'hen' ? ANIMALS.MAX_PER_KIND * ANIMALS.HENS_PER_HOUSE : ANIMALS.MAX_PER_KIND;
      expect(many, kind).toBeLessThanOrEqual(cap);
    }
  });
});
