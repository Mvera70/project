// M-29 · design.md §7.7, la mecánica del rebaño.
//
// «Comida almacenada que anda, come y puede perderse». Cada prueba de aquí es
// una de esas tres cosas, y ninguna mira el dibujo.
import { describe, expect, it } from 'vitest';
import { ANIMALS, FOOD, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run, tick } from '@engine/sim';
import { herdCapacity, tendHerd, upkeep } from '@engine/subsistence/herd';
import { consume } from '@engine/subsistence/consumption';
import { HERD_KINDS, type GameState } from '@engine/state';

// Una sola aldea por (años, semilla) y copias para cada prueba: correr mil
// ticks por prueba es lo que engorda la suite rápida, y CLAUDE.md le da veinte
// segundos a toda ella. El clon es estructurado porque el estado es plano y
// serializable por diseño (§2.3), así que copiarlo es legal y barato.
const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

describe('el rebaño come · §7.7', () => {
  it('cada cabeza cuesta grano cada semana', () => {
    const state = foundGame(7);
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
    const state = foundGame(7);
    state.herd = { hens: 40, pigs: 20, cows: 10 };
    state.village.grain = 1;
    consume(state);
    expect(state.village.grain).toBeGreaterThanOrEqual(0);
  });
});

describe('el rebaño se come · §7.7', () => {
  it('la aldea sacrifica antes de dejar morir a nadie', () => {
    const state = foundGame(7);
    state.village.grain = 0;
    state.herd = { hens: 6, pigs: 2, cows: 1 };
    const { starved, herd } = consume(state);
    expect(herd.meat).toBeGreaterThan(0);
    expect(starved).toEqual([]); // la carne cubrió la semana
  });

  it('empieza por las gallinas y deja la vaca para el final', () => {
    const state = foundGame(7);
    state.village.grain = 0;
    state.herd = { hens: 3, pigs: 1, cows: 1 };
    consume(state);
    // Con veinte bocas hacen falta 20: tres gallinas son 6, el cerdo 25. La
    // vaca no hace falta tocarla.
    expect(state.herd.hens).toBe(0);
    expect(state.herd.cows).toBe(1);
  });

  it('sin rebaño que sacrificar, el hambre sigue matando', () => {
    const state = foundGame(7);
    state.village.grain = 0;
    state.herd = { hens: 0, pigs: 0, cows: 0 };
    const { severity } = consume(state);
    expect(severity).toBeGreaterThan(0);
  });

  it('no mata la vaca por una fanega que falta', () => {
    const state = foundGame(7);
    const people = population(state);
    state.herd = { hens: 0, pigs: 0, cows: 4 };
    // Falta poco: una sola vaca cubre de sobra.
    state.village.grain = people * FOOD.GRAIN_PER_PERSON - 1 + upkeep(state);
    consume(state);
    expect(state.herd.cows).toBe(3);
  });
});

describe('el rebaño crece · §7.7', () => {
  it('nunca por encima de lo que la aldea sostiene', () => {
    const state = village(40);
    const capacity = herdCapacity(state);
    for (const kind of HERD_KINDS) {
      expect(state.herd[kind], kind).toBeLessThanOrEqual(capacity[kind]);
    }
  });

  it('no cría con el granero vacío', () => {
    const state = foundGame(7);
    state.tick = ANIMALS.BREED_EVERY * 4; // un tick de cría
    state.village.grain = 0;
    const before = { ...state.herd };
    expect(tendHerd(state).bred).toBeNull();
    expect(state.herd).toEqual(before);
  });

  it('cría cuando hay un año de grano y sitio libre', () => {
    const state = village(20);
    state.tick = Math.ceil(state.tick / ANIMALS.BREED_EVERY) * ANIMALS.BREED_EVERY;
    state.village.grain = population(state) * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON * 2;
    state.herd = { hens: 0, pigs: 0, cows: 0 };
    expect(tendHerd(state).bred).not.toBeNull();
  });

  it('perder una casa recorta el rebaño a lo que queda en pie', () => {
    const state = village(30);
    state.herd.hens = herdCapacity(state).hens;
    for (const building of state.buildings) {
      if (building.kind === 'house') building.lostTick = state.tick;
    }
    tendHerd(state);
    expect(state.herd.hens).toBeLessThanOrEqual(herdCapacity(state).hens);
  });
});

describe('los lobos · §7.7', () => {
  it('con empalizada en pie no entran nunca', () => {
    const state = village(30);
    state.buildings.push({
      id: 9_000, kind: 'palisade', x: 0, y: 0, w: 1, h: 1, builtTick: 0,
      lostTick: null, blockedUntil: null, tier: 0, lit: true,
    });
    state.herd = { hens: 20, pigs: 8, cows: 4 };
    // Cien inviernos con muralla: ni una cabeza.
    let taken = 0;
    for (let n = 0; n < 100; n += 1) {
      state.tick = TIME.WEEKS_PER_SEASON * 3 + 2 + n * TIME.WEEKS_PER_YEAR;
      state.herd = { hens: 20, pigs: 8, cows: 4 };
      if (tendHerd(state).wolved !== null) taken += 1;
    }
    expect(taken).toBe(0);
  });

  it('sin nada que los pare, en invierno se llevan cabezas', () => {
    const state = village(30);
    for (const building of state.buildings) {
      if (building.kind === 'palisade' || building.kind === 'wall') building.lostTick = state.tick;
    }
    let taken = 0;
    for (let n = 0; n < 200; n += 1) {
      state.tick = TIME.WEEKS_PER_SEASON * 3 + 2 + n * TIME.WEEKS_PER_YEAR;
      state.herd = { hens: 20, pigs: 8, cows: 4 };
      if (tendHerd(state).wolved !== null) taken += 1;
    }
    expect(taken).toBeGreaterThan(0);
    // Y no todos los inviernos: es un riesgo, no un impuesto.
    expect(taken).toBeLessThan(200);
  });

  it('en verano no hay lobos', () => {
    const state = village(30);
    for (const building of state.buildings) {
      if (building.kind === 'palisade' || building.kind === 'wall') building.lostTick = state.tick;
    }
    let taken = 0;
    for (let n = 0; n < 200; n += 1) {
      state.tick = TIME.WEEKS_PER_SEASON + 2 + n * TIME.WEEKS_PER_YEAR;
      state.herd = { hens: 20, pigs: 8, cows: 4 };
      if (tendHerd(state).wolved !== null) taken += 1;
    }
    expect(taken).toBe(0);
  });

  it('las tiradas de lobos no desplazan la demografía (§4.3)', () => {
    // Dos partidas iguales salvo por el flujo `animals`: todo lo demás tiene
    // que seguir siendo idéntico.
    const a = foundGame(7);
    const b = foundGame(7);
    b.rng.animals = (b.rng.animals + 12_345) >>> 0;
    for (let n = 0; n < 300; n += 1) { tick(a, CATALOG); tick(b, CATALOG); }
    expect(population(a)).toBe(population(b));
    expect(a.people.nextId).toBe(b.people.nextId);
    expect(a.rng.deaths).toBe(b.rng.deaths);
    expect(a.rng.births).toBe(b.rng.births);
  });
});
