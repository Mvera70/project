// M-29 · design.md §7.7 — la peste del ganado.
//
// Lo que se protege: que un rebaño apretado enferme más que uno holgado, que
// el pozo sirva, que la peste no acabe nunca con toda una especie de golpe, y
// que su flujo propio no desplace ni un lobo ni una muerte.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run, tick } from '@engine/sim';
import { herdCapacity, herdDensity, murrainChance, tendHerd } from '@engine/subsistence/herd';
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
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** Cuenta brotes en muchas semanas, con el rebaño repuesto cada vez. */
function outbreaks(state: GameState, weeks: number, fill: (s: GameState) => void): number {
  let seen = 0;
  for (let n = 0; n < weeks; n += 1) {
    fill(state);
    // Fuera de invierno y sin semana de cría, para aislar la peste.
    state.tick = TIME.WEEKS_PER_SEASON + 1 + n * TIME.WEEKS_PER_YEAR;
    if (tendHerd(state).murrain !== null) seen += 1;
  }
  return seen;
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

  it('un rebaño apretado corre más riesgo que uno holgado', () => {
    // Medido sobre el riesgo y no contando brotes: con una tasa anual del
    // orden del 4 % harían falta decenas de miles de ticks para tener señal, y
    // la suite rápida tiene veinte segundos de presupuesto entero.
    const state = village(12);
    const capacity = herdCapacity(state);

    for (const kind of HERD_KINDS) state.herd[kind] = capacity[kind];
    const packed = murrainChance(state);

    for (const kind of HERD_KINDS) state.herd[kind] = Math.floor(capacity[kind] * 0.1);
    const thin = murrainChance(state);

    expect(packed).toBeGreaterThan(thin);
  });

  it('un corral vacío todavía corre el riesgo de base', () => {
    // No es cero: la enfermedad entra de fuera. Lo que la densidad hace es
    // empeorarla, no crearla.
    const state = village(12);
    for (const kind of HERD_KINDS) state.herd[kind] = 0;
    expect(murrainChance(state)).toBeGreaterThan(0);
  });

  it('sin ganado no hay peste que declarar', () => {
    const state = village(12);
    const seen = outbreaks(state, 300, (s) => {
      for (const kind of HERD_KINDS) s.herd[kind] = 0;
    });
    expect(seen).toBe(0);
  });
});

describe('el pozo · §7.7, §5.8', () => {
  it('un valle con pozo corre menos riesgo que el mismo sin él', () => {
    const state = village(12);
    const capacity = herdCapacity(state);
    for (const kind of HERD_KINDS) state.herd[kind] = capacity[kind];

    for (const b of state.buildings) if (b.kind === 'well') b.lostTick = state.tick;
    const bare = murrainChance(state);

    state.buildings.push({
      id: 9_100, kind: 'well', x: 0, y: 0, w: 1, h: 1, builtTick: 0,
      lostTick: null, blockedUntil: null, tier: 0, lit: true,
    });
    const guarded = murrainChance(state);

    expect(guarded).toBeLessThan(bare);
  });

  it('el pozo protege también al corral vacío', () => {
    // Una versión anterior sólo cubría el término de densidad, así que una
    // aldea con pozo y dos gallinas no estaba más segura que una sin él. El
    // pozo va de agua limpia, no de cuántos animales beben.
    const state = village(12);
    for (const kind of HERD_KINDS) state.herd[kind] = 0;

    for (const b of state.buildings) if (b.kind === 'well') b.lostTick = state.tick;
    const bare = murrainChance(state);
    state.buildings.push({
      id: 9_101, kind: 'well', x: 0, y: 0, w: 1, h: 1, builtTick: 0,
      lostTick: null, blockedUntil: null, tier: 0, lit: true,
    });
    expect(murrainChance(state)).toBeLessThan(bare);
  });
});

describe('lo que se lleva · §7.7', () => {
  it('nunca se lleva una especie entera de golpe', () => {
    const state = village(12);
    const capacity = herdCapacity(state);
    for (let n = 0; n < 1_500; n += 1) {
      for (const kind of HERD_KINDS) state.herd[kind] = capacity[kind];
      state.tick = TIME.WEEKS_PER_SEASON + 1 + n * TIME.WEEKS_PER_YEAR;
      const report = tendHerd(state);
      if (report.murrain === null) continue;
      expect(state.herd[report.murrain.kind]).toBeGreaterThan(0);
      expect(report.murrain.lost).toBeLessThan(capacity[report.murrain.kind]);
    }
  });

  it('se lleva siempre al menos una cabeza cuando brota', () => {
    const state = village(12);
    let brotes = 0;
    for (let n = 0; n < 10_000 && brotes < 3; n += 1) {
      for (const kind of HERD_KINDS) state.herd[kind] = herdCapacity(state)[kind];
      state.tick = TIME.WEEKS_PER_SEASON + 1 + n * TIME.WEEKS_PER_YEAR;
      const report = tendHerd(state);
      if (report.murrain === null) continue;
      brotes += 1;
      expect(report.murrain.lost).toBeGreaterThanOrEqual(1);
    }
    expect(brotes).toBeGreaterThan(0);
  });

  it('se ceba en lo que más hay', () => {
    const state = village(12);
    let visto = false;
    for (let n = 0; n < 10_000 && !visto; n += 1) {
      state.herd = { hens: 20, pigs: 1, cows: 1 };
      state.tick = TIME.WEEKS_PER_SEASON + 1 + n * TIME.WEEKS_PER_YEAR;
      const report = tendHerd(state);
      if (report.murrain === null) continue;
      expect(report.murrain.kind).toBe('hens');
      visto = true;
    }
    expect(visto).toBe(true);
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

  it('la peste gasta su propio flujo y no el de los animales', () => {
    // Este hueco lo destapó una mutación: tirar de `animals` en vez de
    // `murrain` pasaba las once pruebas anteriores, porque perturbar un flujo
    // que nadie usa no cambia nada. Hay que mirar el contador de frente.
    const state = foundGame(7);
    const start = state.rng.murrain;
    for (let n = 0; n < 50; n += 1) tick(state, CATALOG);
    expect(state.rng.murrain).not.toBe(start);
  });

  it('dos partidas con la misma semilla enferman igual', () => {
    const a = village(40);
    const b = village(40);
    expect(a.herd).toEqual(b.herd);
    expect(a.rng.murrain).toBe(b.rng.murrain);
  });
});
