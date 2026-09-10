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
import type { GameState } from '@engine/state';
import { run } from '@engine/sim';
import { animalPositions, wildlifePositions } from '@render/animals';
import { herdCapacity } from '@engine/subsistence/herd';
import { TERRAIN_CODE } from '@engine/state';
import { fingerprint } from '../helpers/fingerprint';

// Una sola aldea por (años, semilla) y copias para cada prueba: correr mil
// ticks por prueba es lo que engorda la suite rápida, y CLAUDE.md le da veinte
// segundos a toda ella. El clon es estructurado porque el estado es plano y
// serializable por diseño (§2.3), así que copiarlo es legal y barato.
const grown = new Map<string, GameState>();
function village(years: number, seed = 7) {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
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

  // v2.91: el conteo dejó de derivarse del censo de edificios y ahora lo dice
  // `state.herd`. La prueba cambia a propósito, como anunciaba la cabecera.
  // Lo que se sigue protegiendo es que el dibujo no miente: si el lobo se
  // llevo la vaca, hay una vaca menos en pantalla.
  it('el dibujo enseña exactamente el rebaño que la aldea tiene', () => {
    const state = village(20);
    state.herd = { hens: 5, pigs: 3, cows: 2 };
    const animals = animalPositions(state, 0.45);
    expect(animals.filter((a) => a.kind === 'hen')).toHaveLength(5);
    expect(animals.filter((a) => a.kind === 'pig')).toHaveLength(3);
    expect(animals.filter((a) => a.kind === 'cow')).toHaveLength(2);

    state.herd.cows = 0;
    expect(animalPositions(state, 0.45).some((a) => a.kind === 'cow')).toBe(false);
  });

  it('las gallinas siguen a las casas y las vacas a los campos', () => {
    // La colocación sigue derivada: gallina a puerta de casa, vaca a linde de
    // campo. Eso no se guarda y no tiene por qué guardarse.
    const state = village(20);
    state.herd = { hens: 2, pigs: 0, cows: 1 };
    const animals = animalPositions(state, 0.45);
    const houses = state.buildings.filter((b) => b.lostTick === null
      && (b.kind === 'house' || b.kind === 'stone_house')).sort((a, b) => a.id - b.id);
    const fields = state.buildings.filter((b) => b.kind === 'field' && b.lostTick === null)
      .sort((a, b) => a.id - b.id);
    expect(houses.length).toBeGreaterThan(0);
    expect(fields.length).toBeGreaterThan(0);

    const hen = animals.find((a) => a.kind === 'hen')!;
    const house = houses[0]!;
    expect(Math.hypot(hen.x - (house.x + house.w * 0.5), hen.y - (house.y + house.h)))
      .toBeLessThan(2);

    const cow = animals.find((a) => a.kind === 'cow')!;
    const field = fields[0]!;
    expect(Math.hypot(cow.x - (field.x + field.w * 0.5), cow.y - (field.y + field.h * 0.5)))
      .toBeLessThan(field.w + field.h);
  });

  it('sin granero no se puede cebar un cerdo', () => {
    // La regla del granero se mudó del dibujo a `herdCapacity`, que es donde
    // tenía que estar desde el principio: es una regla del juego, no un pixel.
    const state = village(20);
    const granaries = state.buildings.filter((b) => b.kind === 'granary' && b.lostTick === null);
    expect(granaries.length).toBeGreaterThan(0);
    expect(herdCapacity(state).pigs).toBeGreaterThan(0);

    for (const granary of granaries) granary.lostTick = state.tick;
    expect(herdCapacity(state).pigs).toBe(0);
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

  it('el ganado no pasta veinte años en el mismo metro cuadrado', () => {
    // v3.06: el vagabundeo dependía sólo del identificador y de la hora del
    // día, así que una vaca repetía el mismo círculo desde la fundación hasta
    // el final de la partida. Un rebaño clavado es un adorno pintado al fondo.
    const state = village(20);
    state.herd = { hens: 4, pigs: 0, cows: 2 };
    const now = animalPositions(state, 0.45);
    state.tick += 1;
    const later = animalPositions(state, 0.45);

    expect(now.length).toBeGreaterThan(0);
    expect(later.length).toBe(now.length);
    const before = new Map(now.map((a) => [a.id, a]));
    let moved = 0;
    for (const a of later) {
      const was = before.get(a.id);
      if (was !== undefined && Math.hypot(a.x - was.x, a.y - was.y) > 0.3) moved += 1;
    }
    expect(moved, 'la mayoría del rebaño cambia de sitio de una semana a otra')
      .toBeGreaterThan(later.length / 2);
  });

  it('pero un pez no se sale del río al cambiar de semana', () => {
    const state = village(20);
    for (let week = 0; week < 8; week += 1) {
      state.tick += 1;
      for (const one of wildlifePositions(state, 0.45).filter((a) => a.kind === 'fish')) {
        const cell = Math.round(one.y) * state.map.width + Math.round(one.x);
        expect(state.map.terrain[cell], `semana ${week}`).toBe(TERRAIN_CODE.water);
      }
    }
  });

  it('la bandada depende de la vigilancia, no sólo de los campos', () => {
    // §7.7 descuenta la vigilancia del mordisco desde v2.93 y en la imagen no
    // se notaba. Ahora sí, aunque **en una partida corriente casi no se ve**:
    // los guardas se sirven de los brazos que sobran antes que nadie, así que
    // la cobertura suele estar al máximo y la bandada sale siempre reducida.
    // Se comprueba la regla, no un escenario que casi nunca ocurre.
    const state = village(60);
    atWeek(state, TIME.HARVEST_WEEK - 2);
    const fields = state.buildings.filter((b) => b.kind === 'field' && b.lostTick === null);
    const flock = Math.min(
      Math.floor(fields.length / ANIMALS.FIELDS_PER_CROW), ANIMALS.CROWS_MAX,
    );
    const seen = wildlifePositions(state, 0.45).filter((a) => a.kind === 'crow').length;

    expect(flock, 'la aldea grande tiene bandada').toBeGreaterThan(1);
    expect(seen, 'y con guardas se ven menos de los que serían').toBeLessThan(flock);
  });

  it('pero vigilar espanta, no borra: siempre queda alguno', () => {
    // Un campo sin un solo pájaro en agosto se lee como un campo muerto.
    const state = village(20);
    atWeek(state, TIME.HARVEST_WEEK - 2);
    state.village.grain = 50_000;
    expect(wildlifePositions(state, 0.45).filter((a) => a.kind === 'crow').length)
      .toBeGreaterThan(0);
  });

  it('la fauna también es determinista', () => {
    expect(wildlifePositions(village(20), 0.45)).toEqual(wildlifePositions(village(20), 0.45));
  });
});
