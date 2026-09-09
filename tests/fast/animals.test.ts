// M-29 · design.md §7.7.
//
// Lo que hay que proteger no es el dibujo: es que el ganado sea DERIVADO. No
// escribe estado, no se guarda, no mueve un número, y dos partidas con la
// misma semilla lo colocan igual. El día que sea comida, esta prueba tendrá
// que cambiar a propósito y no por accidente.
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { ANIMALS, TIME } from '@engine/balance';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { animalPositions, wildlifePositions } from '@render/animals';
import { TERRAIN_CODE } from '@engine/state';
import { fingerprint } from '../helpers/fingerprint';

function village(years: number, seed = 7) {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

/** Same village, clock moved to a chosen week of the year. */
function atWeek(state: ReturnType<typeof village>, week: number) {
  state.tick = Math.floor(state.tick / TIME.WEEKS_PER_YEAR) * TIME.WEEKS_PER_YEAR + week;
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

describe('la fauna · §7.7', () => {
  it('tampoco escribe estado', () => {
    const state = village(20);
    const before = fingerprint(state);
    for (const fraction of [0, 0.3, 0.6, 0.9]) wildlifePositions(state, fraction);
    expect(fingerprint(state)).toBe(before);
  });

  it('los cuervos solo bajan cuando hay grano en pie que valga la pena', () => {
    const state = village(20);
    const crows = (week: number, fraction = 0.45): number =>
      wildlifePositions(atWeek(state, week), fraction).filter((a) => a.kind === 'crow').length;

    // La cosecha es la semana 35 (§5.1): las semanas de antes, sí.
    expect(crows(TIME.HARVEST_WEEK - 1)).toBeGreaterThan(0);
    expect(crows(TIME.HARVEST_WEEK)).toBeGreaterThan(0);
    // Primavera, con el campo recién sembrado: no hay nada que robar.
    expect(crows(4)).toBe(0);
    // Después de segar, tampoco.
    expect(crows(TIME.HARVEST_WEEK + 4)).toBe(0);
    // Y de noche los cuervos no vuelan.
    expect(crows(TIME.HARVEST_WEEK - 1, 0.9)).toBe(0);
  });

  it('los lobos son de noche y de invierno, cuando el corral ya está vacío', () => {
    const state = village(20);
    const wolves = (week: number, fraction: number): number =>
      wildlifePositions(atWeek(state, week), fraction).filter((a) => a.kind === 'wolf').length;

    const winter = TIME.WEEKS_PER_SEASON * 3 + 4; // §5.1: el invierno empieza en la 36
    expect(wolves(winter, 0.9)).toBeGreaterThan(0);
    expect(wolves(winter, 0.45)).toBe(0); // de día no
    expect(wolves(TIME.WEEKS_PER_SEASON + 4, 0.9)).toBe(0); // en verano tampoco

    // Y a esa hora no queda una sola cabeza de ganado fuera: por eso vienen.
    expect(animalPositions(atWeek(state, winter), 0.9)).toEqual([]);
  });

  it('hay peces en el río, que llevaba desde M-13 sin nada dentro', () => {
    const state = village(20);
    const fish = wildlifePositions(state, 0.45).filter((a) => a.kind === 'fish');
    expect(fish.length).toBeGreaterThan(0);
    expect(fish.length).toBeLessThanOrEqual(ANIMALS.FISH_MAX);
    // Sobre agua, no sobre la hierba.
    for (const one of fish) {
      const cell = Math.round(one.y) * state.map.width + Math.round(one.x);
      expect(state.map.terrain[cell]).toBe(TERRAIN_CODE.water);
    }
  });

  it('la fauna también es determinista', () => {
    expect(wildlifePositions(village(20), 0.45)).toEqual(wildlifePositions(village(20), 0.45));
  });
});
