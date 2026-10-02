// El contorno del valle productivo (2 oct 2026), design.md §7.1.
//
// Vera: «el valle es muy cuadrado, debería tener una forma más natural, y hay
// zonas muy desaprovechadas» (marcó las dos laderas grandes del norte, a los
// lados de la garganta). Hasta hoy el corazón —donde nace el bosque, donde sale
// la piedra y donde se construye— era el rectángulo de 36 × 56 del centro del
// mapa (`HEART`, `tiles.ts`), y la montaña subía por la distancia a ese
// rectángulo: el valle se leía como una maqueta con marco.
//
// Esto lo sustituye por un contorno que sigue al río: ancho en el vientre y
// cerrándose hacia las dos gargantas, con lóbulos que suben por las laderas y
// espolones que bajan de ellas, **y con la misma superficie que el
// rectángulo**. La economía se mide contra esa cifra y no contra la forma
// (`forestLeft`, el bosque de partida), así que no se entera.
//
// Se crece desde el claro de fundación, celda a celda, por la vecina con más
// puntuación: así sale de una pieza y con la superficie justa, y todo lo que
// decide la forma está en la puntuación.

import { VALLEY_SHAPE, WORLD } from '../balance';
import { int, next } from '../rng';
import type { RngBundle } from '../rng';
import { noiseGrid } from './noise';
import { neighbours4 } from './tiles';

const W = WORLD.WIDTH;
const H = WORLD.HEIGHT;
const CELLS = W * H;

export interface ValleyShapeInput {
  /** La columna de la orilla izquierda del río, fila a fila. */
  readonly river: readonly number[];
  /** La anchura del río en una fila. */
  readonly riverWidth: (y: number) => number;
  /** Lo que tiene que quedar dentro sí o sí: el claro de fundación y su margen. */
  readonly keep: (x: number, y: number) => boolean;
  /** Desde dónde crece: el centro del claro. */
  readonly from: { readonly x: number; readonly y: number };
}

interface Lobe { readonly yc: number; readonly side: -1 | 1; readonly tilt: number; readonly len: number; readonly rad: number }
interface Spur { readonly yc: number; readonly side: -1 | 1; readonly depth: number; readonly rad: number }

const between = (b: RngBundle, [low, high]: readonly [number, number]): number => low + next(b, 'map') * (high - low);
const sideOf = (b: RngBundle): -1 | 1 => (next(b, 'map') < 0.5 ? -1 : 1);

/** Una curva suave a lo largo del valle, de −1 a 1: un nudo cada `WAVE` filas. */
function waver(b: RngBundle): (y: number) => number {
  const knots = Array.from({ length: Math.ceil(H / VALLEY_SHAPE.WAVE) + 2 }, () => next(b, 'map') * 2 - 1);
  return (y) => {
    const t = y / VALLEY_SHAPE.WAVE;
    const k = Math.floor(t);
    const f = t - k;
    const s = f * f * (3 - 2 * f);
    return knots[k]! * (1 - s) + knots[k + 1]! * s;
  };
}

/**
 * El valle productivo: 1 dentro y 0 fuera, celda a celda.
 *
 * La superficie es la del rectángulo de siempre más los agujeros que se
 * rellenan (un prado cercado de valle donde no se puede hacer nada no es un
 * paisaje, es un error): medido, de cero a un puñado de celdas.
 */
export function shapeValley(b: RngBundle, input: ValleyShapeInput): Uint8Array {
  const S = VALLEY_SHAPE;
  const left = waver(b);
  const right = waver(b);
  const centre = new Float64Array(H);
  const halves = [new Float64Array(H), new Float64Array(H)] as const;
  for (let y = 0; y < H; y += 1) {
    centre[y] = input.river[y]! + input.riverWidth(y) / 2;
    const t = Math.min(1, Math.max(0, (y - S.ENDS) / (H - 2 * S.ENDS - 1)));
    const fill = S.NARROW + (1 - S.NARROW) * Math.pow(Math.sin(Math.PI * t), S.BELLY);
    halves[0][y] = S.HALF * (1 + S.WAVER * left(y)) * fill;
    halves[1][y] = S.HALF * (1 + S.WAVER * right(y)) * fill;
  }
  const row = (y: number): number => Math.max(0, Math.min(H - 1, Math.round(y)));
  const half = (side: -1 | 1, y: number): number => halves[side < 0 ? 0 : 1][row(y)]!;

  const lobe = (yc: number, side: -1 | 1, tilt: number): Lobe => {
    const len = between(b, S.LOBE_LENGTH);
    return { yc, side, tilt, len, rad: between(b, S.LOBE_RADIUS) };
  };
  // Los dos del norte, a cada lado de la garganta, inclinados hacia arriba.
  const lobes: Lobe[] = [-1, 1].map((side) => {
    const yc = between(b, S.NORTH_LOBE_ROWS);
    return lobe(yc, side as -1 | 1, -between(b, S.NORTH_LOBE_TILT));
  });
  for (let n = int(b, 'map', ...S.LOBES); n > 0; n -= 1) {
    const yc = between(b, S.LOBE_ROWS);
    const side = sideOf(b);
    lobes.push(lobe(yc, side, (next(b, 'map') - 0.5) * S.LOBE_SWING));
  }
  const spurs: Spur[] = [];
  for (let n = int(b, 'map', ...S.SPURS); n > 0; n -= 1) {
    const yc = between(b, S.SPUR_ROWS);
    const side = sideOf(b);
    const depth = between(b, S.SPUR_DEPTH);
    spurs.push({ yc, side, depth, rad: between(b, S.SPUR_RADIUS) });
  }
  const broad = noiseGrid(b, S.ROUGH_SCALES[0]);
  const fine = noiseGrid(b, S.ROUGH_SCALES[1]);

  // La puntuación: 1 en el río, 0 en la orilla del valle, y lo que los
  // lóbulos, los espolones y el borde rugoso le suman o le quitan.
  const score = new Float64Array(CELLS).fill(Number.NEGATIVE_INFINITY);
  for (let y = S.ENDS; y < H - S.ENDS; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      const side = cx < centre[y]! ? -1 : 1;
      let s = 1 - Math.abs(cx - centre[y]!) / Math.max(1, half(side, y));
      for (const l of lobes) {
        // Media elipse que nace dentro del valle y sale ladera arriba.
        const ox = centre[row(l.yc)]! + l.side * half(l.side, l.yc) * S.LOBE_ROOT;
        const ax = l.side * Math.cos(l.tilt);
        const ay = Math.sin(l.tilt);
        const dx = cx - ox;
        const dy = cy - l.yc;
        const along = dx * ax + dy * ay;
        if (along < 0) continue;
        const across = -dx * ay + dy * ax;
        s = Math.max(s, 1 - (along / l.len) ** 2 - (across / l.rad) ** 2);
      }
      for (const spur of spurs) {
        const sx = centre[row(spur.yc)]! + spur.side * (half(spur.side, spur.yc) - spur.depth / 2);
        const reach = spur.rad + spur.depth / 2;
        const d = Math.hypot(cx - sx, (cy - spur.yc) * 0.6);
        if (d < reach) s -= S.SPUR_CUT * (1 - d / reach);
      }
      s += S.ROUGH[0] * (broad(x, y) - 0.5) + S.ROUGH[1] * (fine(x, y) - 0.5);
      score[y * W + x] = input.keep(x, y) ? Number.POSITIVE_INFINITY : s;
    }
  }

  // Crecer desde el claro por la vecina mejor puntuada, hasta la superficie
  // del rectángulo. A igualdad, la celda de índice menor: determinista.
  const area = WORLD.HEART_WIDTH * WORLD.HEART_HEIGHT;
  const heart = new Uint8Array(CELLS);
  const queued = new Uint8Array(CELLS);
  const heap: number[] = [];
  const before = (a: number, z: number): boolean => score[a]! > score[z]! || (score[a] === score[z] && a < z);
  const push = (cell: number): void => {
    heap.push(cell);
    for (let i = heap.length - 1; i > 0;) {
      const parent = (i - 1) >> 1;
      if (!before(heap[i]!, heap[parent]!)) break;
      [heap[i], heap[parent]] = [heap[parent]!, heap[i]!];
      i = parent;
    }
  };
  const pop = (): number => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let best = i;
        if (l < heap.length && before(heap[l]!, heap[best]!)) best = l;
        if (r < heap.length && before(heap[r]!, heap[best]!)) best = r;
        if (best === i) break;
        [heap[i], heap[best]] = [heap[best]!, heap[i]!];
        i = best;
      }
    }
    return top;
  };
  const start = Math.floor(input.from.y) * W + Math.floor(input.from.x);
  push(start);
  queued[start] = 1;
  for (let kept = 0; kept < area && heap.length > 0; kept += 1) {
    const cell = pop();
    heart[cell] = 1;
    for (const n of neighbours4(cell)) {
      if (queued[n] === 1 || score[n] === Number.NEGATIVE_INFINITY) continue;
      queued[n] = 1;
      push(n);
    }
  }

  // Sin agujeros: lo que no se alcanza desde el borde del mapa sin pisar el
  // valle, es valle.
  const outside = new Uint8Array(CELLS);
  const queue: number[] = [];
  for (let cell = 0; cell < CELLS; cell += 1) {
    const x = cell % W;
    const y = Math.floor(cell / W);
    if (heart[cell] === 0 && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) {
      outside[cell] = 1;
      queue.push(cell);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    for (const n of neighbours4(queue[head]!)) {
      if (outside[n] === 1 || heart[n] === 1) continue;
      outside[n] = 1;
      queue.push(n);
    }
  }
  for (let cell = 0; cell < CELLS; cell += 1) if (outside[cell] === 0) heart[cell] = 1;
  return heart;
}

/**
 * Lo lejos que queda cada celda del valle, en celdas, y 0 dentro.
 *
 * Es lo que antes era la distancia al rectángulo, y por lo mismo: la falda y
 * el lago se miden desde el borde del valle, y con un contorno la montaña lo
 * sigue en vez de dibujar un marco. Distancia de chaflán (1 y √2), en dos
 * pasadas: de sobra para decidir dónde empieza una ladera.
 */
export function distanceOutside(heart: Uint8Array): Float64Array {
  const d = new Float64Array(CELLS);
  const far = W + H;
  for (let i = 0; i < CELLS; i += 1) d[i] = heart[i] === 1 ? 0 : far;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      let v = d[i]!;
      if (x > 0) v = Math.min(v, d[i - 1]! + 1);
      if (y > 0) {
        v = Math.min(v, d[i - W]! + 1);
        if (x > 0) v = Math.min(v, d[i - W - 1]! + diagonal);
        if (x + 1 < W) v = Math.min(v, d[i - W + 1]! + diagonal);
      }
      d[i] = v;
    }
  }
  for (let y = H - 1; y >= 0; y -= 1) {
    for (let x = W - 1; x >= 0; x -= 1) {
      const i = y * W + x;
      let v = d[i]!;
      if (x + 1 < W) v = Math.min(v, d[i + 1]! + 1);
      if (y + 1 < H) {
        v = Math.min(v, d[i + W]! + 1);
        if (x + 1 < W) v = Math.min(v, d[i + W + 1]! + diagonal);
        if (x > 0) v = Math.min(v, d[i + W - 1]! + diagonal);
      }
      d[i] = v;
    }
  }
  return d;
}
