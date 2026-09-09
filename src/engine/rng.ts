// M-01 · Seeded randomness. design.md §4.3.
//
// One shared generator would break determinism the moment any system drew an
// extra number: every later draw in the tick would shift. So each system owns
// an independent stream, all derived from the master seed. A roll added to the
// chronicle can never displace births, and a roll added to the renderer can
// never displace the simulation at all.
//
// No other module implements randomness.

/** Independent random streams. design.md §4.3. */
export type RngStream =
  | 'map'
  | 'weather'
  | 'births'
  | 'deaths'
  | 'plague'
  | 'crossroads'
  | 'cast'
  | 'names'
  | 'chronicle'
  | 'world'
  | 'animals'
  | 'murrain'
  | 'traders'
  | 'quarrels';

/**
 * The 32-bit state of every stream. Part of GameState, so it is flat and
 * serializable: plain numbers, no closures (design.md §2.3). A generator
 * captured in a closure could not be saved.
 */
export type RngBundle = { [K in RngStream]: number };

/** Every stream, in a fixed order. Iteration order must not vary. */
export const RNG_STREAMS: readonly RngStream[] = [
  'map',
  'weather',
  'births',
  'deaths',
  'plague',
  'crossroads',
  'cast',
  'names',
  'chronicle',
  'world',
  'animals',
  'murrain',
  'traders',
  'quarrels',
] as const;

/**
 * Deterministic 32-bit hash of (seed, stream name). FNV-1a over the seed bytes
 * and the name, then a murmur3 finalizer so that neighbouring seeds land far
 * apart: seeds 7 and 8 must not produce correlated streams.
 */
export function hash32(seed: number, stream: string): number {
  let h = 0x811c9dc5;
  const s = seed >>> 0;
  for (let i = 0; i < 4; i += 1) {
    h ^= (s >>> (i * 8)) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  for (let i = 0; i < stream.length; i += 1) {
    h ^= stream.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // murmur3 fmix32 — avalanche, so one changed bit changes half the output.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Seeds every stream from the master seed. design.md §4.3. */
export function makeBundle(seed: number): RngBundle {
  return {
    map: hash32(seed, 'map'),
    weather: hash32(seed, 'weather'),
    births: hash32(seed, 'births'),
    deaths: hash32(seed, 'deaths'),
    plague: hash32(seed, 'plague'),
    crossroads: hash32(seed, 'crossroads'),
    cast: hash32(seed, 'cast'),
    names: hash32(seed, 'names'),
    chronicle: hash32(seed, 'chronicle'),
    world: hash32(seed, 'world'),
    animals: hash32(seed, 'animals'),
    murrain: hash32(seed, 'murrain'),
    traders: hash32(seed, 'traders'),
    quarrels: hash32(seed, 'quarrels'),
  };
}

/**
 * Next value in [0, 1) from stream `s`. Mutates that stream's state inside the
 * bundle and leaves every other stream untouched. mulberry32.
 */
export function next(b: RngBundle, s: RngStream): number {
  const a = (b[s] + 0x6d2b79f5) | 0;
  b[s] = a >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Integer in [a, z], both ends included. Always consumes exactly one draw,
 * whatever the range: a call site whose range collapses must not shift the
 * stream for the call sites after it.
 */
export function int(b: RngBundle, s: RngStream, a: number, z: number): number {
  const lo = Math.ceil(Math.min(a, z));
  const hi = Math.floor(Math.max(a, z));
  const r = next(b, s);
  const span = hi - lo + 1;
  if (span <= 1) return lo;
  return lo + Math.floor(r * span);
}

/** Uniform element of a non-empty array. One draw. */
export function pick<T>(b: RngBundle, s: RngStream, xs: readonly T[]): T {
  if (xs.length === 0) throw new Error('rng.pick: empty array');
  return xs[int(b, s, 0, xs.length - 1)] as T;
}

/**
 * Element chosen in proportion to `w`. One draw, always.
 *
 * Negative, NaN and infinite weights count as zero. If every weight is zero the
 * choice falls back to uniform rather than dividing by zero: a caller whose
 * weights all collapsed still gets an element back, and the stream still
 * advances by exactly one.
 */
export function weighted<T>(
  b: RngBundle,
  s: RngStream,
  xs: readonly T[],
  w: (x: T) => number,
): T {
  if (xs.length === 0) throw new Error('rng.weighted: empty array');

  // `w` is called once per element: it may be neither cheap nor pure.
  const weights: number[] = [];
  let total = 0;
  for (const x of xs) {
    const raw = w(x);
    const wi = Number.isFinite(raw) && raw > 0 ? raw : 0;
    weights.push(wi);
    total += wi;
  }

  const r = next(b, s);
  if (total <= 0) return xs[Math.min(xs.length - 1, Math.floor(r * xs.length))] as T;

  const target = r * total;
  let acc = 0;
  for (let i = 0; i < xs.length; i += 1) {
    acc += weights[i] as number;
    if (target < acc) return xs[i] as T;
  }
  // Only reachable through floating-point drift at the very top of the range.
  return xs[xs.length - 1] as T;
}
