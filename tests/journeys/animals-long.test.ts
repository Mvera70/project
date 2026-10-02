// Lo lento de `tests/fast/animals.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 223 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-29 · design.md §7.7.
//
// Lo que hay que proteger no es el dibujo: es que el ganado sea DERIVADO. No
// escribe estado, no se guarda, no mueve un número, y dos partidas con la
// misma semilla lo colocan igual. El día que sea comida, esta prueba tendrá
// que cambiar a propósito y no por accidente.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { ANIMALS, TIME } from '@engine/balance';
import type { GameState } from '@engine/state';
import { run } from '@engine/sim';
import { animalPositions, wildlifePositions } from '@derive/animals';
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
    base = foundTwenty(seed);
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
});
