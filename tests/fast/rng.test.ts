// M-01 · design.md §4.3. Determinism is the foundation everything else stands
// on: if these tests break, every saved game breaks with them.
import { describe, expect, it } from 'vitest';
import type { RngBundle, RngStream } from '@engine/rng';
import { RNG_STREAMS, hash32, int, makeBundle, next, pick, weighted } from '@engine/rng';

/** Draws `n` values from one stream. */
function draw(b: RngBundle, s: RngStream, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(next(b, s));
  return out;
}

describe('rng · reproducibilidad', () => {
  it('la misma semilla produce el mismo bundle', () => {
    expect(makeBundle(7)).toEqual(makeBundle(7));
  });

  it('la misma semilla produce la misma secuencia en cada flujo', () => {
    const a = makeBundle(1234);
    const b = makeBundle(1234);
    for (const s of RNG_STREAMS) {
      expect(draw(a, s, 200)).toEqual(draw(b, s, 200));
    }
  });

  it('semillas distintas producen secuencias distintas', () => {
    for (const s of RNG_STREAMS) {
      expect(draw(makeBundle(7), s, 50)).not.toEqual(draw(makeBundle(8), s, 50));
    }
  });

  // Vector dorado. Guarda contra un cambio accidental del algoritmo: mulberry32
  // sembrado con hash32 debe dar exactamente esto, hoy y dentro de dos años.
  it('mantiene el vector dorado de la semilla 7', () => {
    expect(hash32(7, 'weather')).toBe(990186957);
    const b = makeBundle(7);
    expect(draw(b, 'weather', 4)).toEqual([
      0.7225439161993563, 0.3634355610702187, 0.9009567615576088, 0.05248021217994392,
    ]);
  });

  it('mantiene el estado dorado tras 1 000 tiradas por flujo', () => {
    const b = makeBundle(7);
    for (const s of RNG_STREAMS) draw(b, s, 1000);
    expect(b).toEqual({
      map: 3792268442,
      weather: 2899931861,
      births: 376537434,
      deaths: 657109094,
      plague: 466647746,
      crossroads: 940948463,
      cast: 492570743,
      names: 3162285625,
      chronicle: 1317042200,
      world: 3713464134,
      // v2.91: el flujo `animals` (§7.7) entra al final y no mueve ni uno de
      // los diez anteriores. Eso es §4.3 por escrito: un sistema nuevo puede
      // añadir su propia aleatoriedad sin desplazar una sola partida guardada.
      animals: 3726732107,
    });
  });

  // El bundle viaja dentro de GameState y se guarda con structuredClone
  // (design.md §2.3): tras ir y volver debe seguir la misma secuencia.
  it('sobrevive a la serialización sin desviar la secuencia', () => {
    const a = makeBundle(99);
    draw(a, 'births', 37);
    const b: RngBundle = structuredClone(a);
    expect(draw(a, 'births', 100)).toEqual(draw(b, 'births', 100));
  });

  it('hash32 es estable, y depende de la semilla y del nombre del flujo', () => {
    expect(hash32(7, 'weather')).toBe(hash32(7, 'weather'));
    expect(hash32(7, 'weather')).not.toBe(hash32(7, 'births'));
    expect(hash32(7, 'weather')).not.toBe(hash32(8, 'weather'));
    expect(hash32(0, '')).toBe(hash32(0, ''));
  });

  it('hash32 devuelve un entero de 32 bits sin signo', () => {
    for (const seed of [0, 1, 7, -1, 2 ** 31, 2 ** 32 - 1, 123456789]) {
      for (const s of RNG_STREAMS) {
        const h = hash32(seed, s);
        expect(Number.isInteger(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(2 ** 32);
      }
    }
  });

  it('semillas contiguas no dan flujos correlacionados', () => {
    // Diez semillas seguidas: sus primeras tiradas deben ser diez números
    // distintos y repartidos, no diez vecinos.
    const firsts = Array.from({ length: 10 }, (_, i) => next(makeBundle(1000 + i), 'map'));
    expect(new Set(firsts).size).toBe(10);
    expect(Math.max(...firsts) - Math.min(...firsts)).toBeGreaterThan(0.4);
  });
});

describe('rng · distribución', () => {
  const N = 100_000;

  it('next se queda en [0, 1) con media y varianza razonables', () => {
    const b = makeBundle(42);
    let sum = 0;
    let sumSq = 0;
    let lo = 1;
    let hi = 0;
    for (let i = 0; i < N; i += 1) {
      const x = next(b, 'weather');
      sum += x;
      sumSq += x * x;
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
    // Los extremos se comprueban con el mínimo y el máximo, no muestra a
    // muestra: la suite rápida no puede permitirse 100 000 asertos.
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThan(1);
    const mean = sum / N;
    expect(mean).toBeGreaterThan(0.49);
    expect(mean).toBeLessThan(0.51);
    // Varianza de una uniforme: 1/12 ≈ 0.0833.
    expect(sumSq / N - mean * mean).toBeCloseTo(1 / 12, 2);
    expect(lo).toBeLessThan(0.001);
    expect(hi).toBeGreaterThan(0.999);
  });

  it('next reparte por igual en diez cubos', () => {
    const b = makeBundle(42);
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < N; i += 1) {
      const k = Math.floor(next(b, 'weather') * 10);
      buckets[k] = (buckets[k] ?? 0) + 1;
    }
    for (const c of buckets) {
      expect(c).toBeGreaterThan(N / 10 - 1000);
      expect(c).toBeLessThan(N / 10 + 1000);
    }
  });

  it('int cubre ambos extremos y reparte por igual', () => {
    const b = makeBundle(5);
    const counts = new Map<number, number>();
    let outOfRange = 0;
    for (let i = 0; i < N; i += 1) {
      const v = int(b, 'deaths', 1, 6);
      if (!Number.isInteger(v) || v < 1 || v > 6) outOfRange += 1;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect(outOfRange).toBe(0);
    expect(counts.size).toBe(6);
    for (const c of counts.values()) {
      expect(c).toBeGreaterThan(N / 6 - 1200);
      expect(c).toBeLessThan(N / 6 + 1200);
    }
  });

  it('int con rango de un solo valor lo devuelve, y consume una tirada', () => {
    const b = makeBundle(5);
    expect(int(b, 'deaths', 3, 3)).toBe(3);
    const control = makeBundle(5);
    next(control, 'deaths');
    expect(b.deaths).toBe(control.deaths);
  });

  it('int acepta los extremos invertidos', () => {
    const b = makeBundle(5);
    for (let i = 0; i < 100; i += 1) {
      const v = int(b, 'deaths', 6, 1);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('pick reparte por igual y nunca devuelve undefined', () => {
    const b = makeBundle(11);
    const xs = ['a', 'b', 'c', 'd'] as const;
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i += 1) {
      const x = pick(b, 'names', xs);
      counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    for (const c of counts.values()) {
      expect(c).toBeGreaterThan(N / 4 - 1200);
      expect(c).toBeLessThan(N / 4 + 1200);
    }
  });

  it('pick sobre un array vacío es un error, no un undefined silencioso', () => {
    const b = makeBundle(11);
    expect(() => pick(b, 'names', [])).toThrow();
  });

  it('weighted respeta las proporciones', () => {
    const b = makeBundle(3);
    const xs = [
      { id: 'rare', w: 1 },
      { id: 'common', w: 9 },
    ] as const;
    let rare = 0;
    for (let i = 0; i < N; i += 1) {
      if (weighted(b, 'crossroads', xs, (x) => x.w).id === 'rare') rare += 1;
    }
    expect(rare / N).toBeGreaterThan(0.09);
    expect(rare / N).toBeLessThan(0.11);
  });

  it('weighted nunca elige un elemento de peso cero, negativo o NaN', () => {
    const b = makeBundle(3);
    const xs = [
      { id: 'zero', w: 0 },
      { id: 'negative', w: -5 },
      { id: 'nan', w: Number.NaN },
      { id: 'real', w: 2 },
    ] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i += 1) seen.add(weighted(b, 'crossroads', xs, (x) => x.w).id);
    expect(seen).toEqual(new Set(['real']));
  });

  it('weighted con todos los pesos a cero no divide por cero', () => {
    const b = makeBundle(3);
    const xs = ['a', 'b', 'c'] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 5_000; i += 1) seen.add(weighted(b, 'crossroads', xs, () => 0));
    // Devuelve siempre un elemento del array, y reparte entre todos.
    expect(seen).toEqual(new Set(xs));
  });

  it('weighted consume exactamente una tirada, elija lo que elija', () => {
    const control = makeBundle(3);
    next(control, 'crossroads');

    const all = makeBundle(3);
    weighted(all, 'crossroads', ['a', 'b'], () => 1);
    expect(all.crossroads).toBe(control.crossroads);

    const none = makeBundle(3);
    weighted(none, 'crossroads', ['a', 'b'], () => 0);
    expect(none.crossroads).toBe(control.crossroads);
  });

  it('weighted evalúa el peso de cada elemento una sola vez', () => {
    const b = makeBundle(3);
    const calls: string[] = [];
    weighted(b, 'crossroads', ['a', 'b', 'c'], (x) => {
      calls.push(x);
      return 1;
    });
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('weighted sobre un array vacío es un error', () => {
    const b = makeBundle(3);
    expect(() => weighted(b, 'crossroads', [], () => 1)).toThrow();
  });
});

describe('rng · independencia de flujos', () => {
  // design.md §4.3: una tirada añadida en la crónica jamás puede desplazar la
  // simulación. Es lo que permite tocar el render sin romper una partida.
  it('consumir 1 000 números de chronicle no toca ningún otro flujo', () => {
    const b = makeBundle(2024);
    const before = { ...b };
    for (let i = 0; i < 1000; i += 1) next(b, 'chronicle');
    for (const s of RNG_STREAMS) {
      if (s === 'chronicle') expect(b[s]).not.toBe(before[s]);
      else expect(b[s]).toBe(before[s]);
    }
  });

  it('las tiradas de un flujo no cambian lo que dan los demás', () => {
    const clean = makeBundle(2024);
    const noisy = makeBundle(2024);
    for (let i = 0; i < 1000; i += 1) next(noisy, 'chronicle');
    for (const s of RNG_STREAMS) {
      if (s === 'chronicle') continue;
      expect(draw(noisy, s, 100)).toEqual(draw(clean, s, 100));
    }
  });

  it('int, pick y weighted tampoco tocan otro flujo que el suyo', () => {
    const b = makeBundle(2024);
    const before = { ...b };
    int(b, 'births', 0, 10);
    pick(b, 'names', ['a', 'b']);
    weighted(b, 'crossroads', ['a', 'b'], () => 1);
    const touched: RngStream[] = ['births', 'names', 'crossroads'];
    for (const s of RNG_STREAMS) {
      if (touched.includes(s)) expect(b[s]).not.toBe(before[s]);
      else expect(b[s]).toBe(before[s]);
    }
  });

  it('cada flujo arranca en un estado distinto', () => {
    const b = makeBundle(2024);
    const states = RNG_STREAMS.map((s) => b[s]);
    expect(new Set(states).size).toBe(RNG_STREAMS.length);
  });

  it('dos flujos de la misma semilla no van sincronizados', () => {
    const b = makeBundle(2024);
    const a = draw(b, 'births', 500);
    const c = draw(b, 'deaths', 500);
    expect(a).not.toEqual(c);
    // Y no solo desplazados: ninguna posición coincide.
    expect(a.filter((x, i) => x === c[i]).length).toBe(0);
  });

  it('todos los flujos de design.md §4.3 están en el bundle', () => {
    const b = makeBundle(1);
    expect(Object.keys(b).sort()).toEqual([...RNG_STREAMS].sort());
  });
});
