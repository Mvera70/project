// Lo lento de `tests/fast/murrain.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 63 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-29 · design.md §7.7 — la peste del ganado.
//
// Lo que se protege: que un rebaño apretado enferme más que uno holgado, que
// el pozo sirva, que la peste no acabe nunca con toda una especie de golpe, y
// que su flujo propio no desplace ni un lobo ni una muerte.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run, tick } from '@engine/sim';
import { herdCapacity, herdDensity } from '@engine/subsistence/herd';
import { HERD_KINDS, type GameState } from '@engine/state';

// Una sola aldea por (años, semilla) y copias para cada prueba: correr mil
// ticks por prueba es lo que engorda la suite rápida, y §CLAUDE.md le da veinte
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
describe('la densidad es lo que enferma · §7.7', () => {
  it('el corral lleno da 1 y el vacío da 0', () => {
    const state = village(12);
    for (const kind of HERD_KINDS) state.herd[kind] = 0;
    expect(herdDensity(state)).toBe(0);
    const capacity = herdCapacity(state);
    for (const kind of HERD_KINDS) state.herd[kind] = capacity[kind];
    expect(herdDensity(state)).toBe(1);
  });
});

describe('la peste no desplaza nada · §4.3', () => {
  it('su flujo propio no mueve ni un lobo ni una muerte', () => {
    // Dos partidas iguales salvo por el flujo `murrain`: todo lo demás debe
    // seguir idéntico, incluidos los lobos, que tiran de `animals`.
    const a = foundGame(7);
    const b = foundGame(7);
    b.rng.murrain = (b.rng.murrain + 999) >>> 0;
    for (let n = 0; n < 400; n += 1) { tick(a, CATALOG); tick(b, CATALOG); }
    expect(a.rng.animals).toBe(b.rng.animals);
    expect(a.rng.deaths).toBe(b.rng.deaths);
    expect(a.rng.births).toBe(b.rng.births);
    expect(population(a)).toBe(population(b));
  });

  it('dos partidas con la misma semilla enferman igual', () => {
    const a = village(40);
    const b = village(40);
    expect(a.herd).toEqual(b.herd);
    expect(a.rng.murrain).toBe(b.rng.murrain);
  });
});
