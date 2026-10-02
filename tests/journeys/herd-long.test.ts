// Lo lento de `tests/fast/herd.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 106 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-29 · design.md §7.7, la mecánica del rebaño.
//
// «Comida almacenada que anda, come y puede perderse». Cada prueba de aquí es
// una de esas tres cosas, y ninguna mira el dibujo.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { ANIMALS, FOOD, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { population } from '@engine/people/demography';
import { run, tick } from '@engine/sim';
import { herdCapacity, tendHerd } from '@engine/subsistence/herd';
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
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

describe('el rebaño crece · §7.7', () => {
  it('nunca por encima de lo que la aldea sostiene', () => {
    const state = village(40);
    const capacity = herdCapacity(state);
    for (const kind of HERD_KINDS) {
      expect(state.herd[kind], kind).toBeLessThanOrEqual(capacity[kind]);
    }
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
    // **Lo que §4.3 promete, y lo que no.** Promete que un flujo no desplaza a
    // otro: cambiar el dado de los animales no puede hacer que se tiren más o
    // menos dados de muertes o de nacimientos. Eso es lo que se mide aquí y es
    // lo que sigue intacto.
    //
    // Lo que **no** promete —y la prueba lo daba por hecho— es que el rebaño no
    // cambie nada: **el rebaño come grano** (`upkeep`, §7.7), así que dos valles
    // con distinto ganado tienen distinto grano, y el grano entra en la
    // probabilidad de un nacimiento (§5.7). Medido al balancear la leña: los dos
    // valles se separan en el tick 84 por **cuatro décimas de grano** y acaban
    // con diecisiete y diecinueve personas.
    //
    // Que eso no se viera antes era suerte: la cuota fija de leñadores repartía
    // las manos en proporción, y ahora la aldea corta por necesidad (§7.13) con
    // un suelo y un techo, así que una diferencia mínima puede cruzar un umbral
    // y adelantar una casa una semana. La cadena es legítima —menos animales,
    // más grano, un nacimiento antes— y lo que hay que vigilar es que sea
    // **pequeña**, no que no exista.
    const a = foundTwenty(7);
    const b = foundTwenty(7);
    b.rng.animals = (b.rng.animals + 12_345) >>> 0;
    for (let n = 0; n < 300; n += 1) { tick(a, CATALOG); tick(b, CATALOG); }
    // **Y no se comparan los estados de los otros flujos**, porque no pueden
    // coincidir: la mortalidad tira **un dado por persona viva** (§12.4), así
    // que en cuanto los dos valles tienen distinta gente, el flujo de muertes
    // va por distinto sitio por construcción. Lo que §4.3 prohíbe es que un
    // sistema tire del dado de otro, y eso se guarda donde se puede guardar: en
    // `tendHerd` y `rollFate`, que tienen sus propias pruebas de que sólo
    // consumen `animals`, `murrain` y `fate`.
    const gap = Math.abs(population(a) - population(b));
    expect(gap, `el rebaño mueve la demografía poco: ${population(a)} contra ${population(b)}`)
      .toBeLessThanOrEqual(Math.ceil(population(a) * 0.15));
  });
});
