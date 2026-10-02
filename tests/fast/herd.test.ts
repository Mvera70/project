// Lo lento de este fichero vive en `tests/journeys/herd-long.test.ts` (v5.56).
//
// M-29 · design.md §7.7, la mecánica del rebaño.
//
// «Comida almacenada que anda, come y puede perderse». Cada prueba de aquí es
// una de esas tres cosas, y ninguna mira el dibujo.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { ANIMALS, FOOD } from '@engine/balance';
import { population } from '@engine/people/demography';
import { tendHerd, upkeep } from '@engine/subsistence/herd';
import { consume } from '@engine/subsistence/consumption';

describe('el rebaño come · §7.7', () => {
  it('cada cabeza cuesta grano cada semana', () => {
    const state = foundTwenty(7);
    state.herd = { hens: 10, pigs: 4, cows: 2 };
    const expected = 10 * ANIMALS.UPKEEP.hens + 4 * ANIMALS.UPKEEP.pigs + 2 * ANIMALS.UPKEEP.cows;
    expect(upkeep(state)).toBeCloseTo(expected);

    const before = state.village.grain;
    const people = population(state);
    consume(state);
    // Comió el rebaño y comió la gente, y ni un grano de más.
    expect(before - state.village.grain).toBeCloseTo(expected + people * FOOD.GRAIN_PER_PERSON);
  });

  it('un rebaño no puede comer grano que no hay', () => {
    const state = foundTwenty(7);
    state.herd = { hens: 40, pigs: 20, cows: 10 };
    state.village.grain = 1;
    consume(state);
    expect(state.village.grain).toBeGreaterThanOrEqual(0);
  });
});

describe('el rebaño se come · §7.7', () => {
  it('la aldea sacrifica antes de dejar morir a nadie', () => {
    const state = foundTwenty(7);
    state.village.grain = 0;
    state.herd = { hens: 6, pigs: 2, cows: 1 };
    const { starved, herd } = consume(state);
    expect(herd.meat).toBeGreaterThan(0);
    expect(starved).toEqual([]); // la carne cubrió la semana
  });

  it('empieza por las gallinas y deja la vaca para el final', () => {
    const state = foundTwenty(7);
    state.village.grain = 0;
    state.herd = { hens: 3, pigs: 1, cows: 1 };
    consume(state);
    // Con veinte bocas hacen falta 20: tres gallinas son 6, el cerdo 25. La
    // vaca no hace falta tocarla.
    expect(state.herd.hens).toBe(0);
    expect(state.herd.cows).toBe(1);
  });

  it('sin rebaño que sacrificar, el hambre sigue matando', () => {
    const state = foundTwenty(7);
    state.village.grain = 0;
    state.herd = { hens: 0, pigs: 0, cows: 0 };
    const { severity } = consume(state);
    expect(severity).toBeGreaterThan(0);
  });

  it('no mata la vaca por una fanega que falta', () => {
    const state = foundTwenty(7);
    const people = population(state);
    state.herd = { hens: 0, pigs: 0, cows: 4 };
    // Falta poco: una sola vaca cubre de sobra.
    state.village.grain = people * FOOD.GRAIN_PER_PERSON - 1 + upkeep(state);
    consume(state);
    expect(state.herd.cows).toBe(3);
  });
});

describe('el rebaño crece · §7.7', () => {
  it('no cría con el granero vacío', () => {
    const state = foundTwenty(7);
    state.tick = ANIMALS.BREED_EVERY * 4; // un tick de cría
    state.village.grain = 0;
    const before = { ...state.herd };
    expect(tendHerd(state).bred).toBeNull();
    expect(state.herd).toEqual(before);
  });
});
