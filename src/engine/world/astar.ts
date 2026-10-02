// M-15 · Getting from one cell to another. design.md §7.6.
//
// A* over the four cardinal neighbours, with the cost of §7.6: forest and rock
// are dear, an existing path is cheap, water and marsh are not passable at all.
//
// Every cost is an integer. Floats would tie differently on two machines that
// round the last bit differently, and a route that differs by one cell puts the
// traffic on a different cell, which after a century is a different village.
// The tie-break is the lower cell index, for the same reason.

import { PATHING, WORLD } from '../balance';
import { TERRAIN_CODE } from '../state';
import type { ValleyMap } from '../state';

/**
 * v5.71 · Lo que cuesta pisar cada clase de terreno antes del descuento de la
 * senda, o -1 si no se pisa: la misma cuenta de `stepCost`, hecha una vez. Bajo
 * vitest cada `TERRAIN_CODE.x` y `PATHING.x` es un *getter* del módulo, y A*
 * los leía ocho veces por vecino: era la cuarta parte de su tiempo.
 */
let BASE: Int16Array | null = null;
function baseCosts(): Int16Array {
  if (BASE !== null) return BASE;
  // Los 256 códigos que caben en el `Uint8Array` del terreno, no sólo los que
  // hoy tienen nombre: uno sin nombre cuesta lo que diga `stepCost`, igual.
  const base = new Int16Array(256);
  const probe = { terrain: new Uint8Array(1), path: new Uint8Array(1) } as unknown as ValleyMap;
  for (let code = 0; code < 256; code += 1) {
    (probe.terrain as Uint8Array)[0] = code;
    base[code] = stepCost(probe, 0) ?? -1;
  }
  BASE = base;
  return base;
}

/** What it costs to step into a cell, or null if it cannot be stepped into. */
export function stepCost(map: ValleyMap, cell: number): number | null {
  const terrain = map.terrain[cell];
  // Lo que no se cruza. La montaña y el lago se suman aquí y no en otro sitio
  // porque **el brief del mapa grande los define por esto**: terreno que cierra
  // en vez de terreno que produce (`docs/historico/next-plan.md`). Un lago se cruza tan
  // poco como el río, y una montaña menos.
  if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.marsh
    || terrain === TERRAIN_CODE.mountain || terrain === TERRAIN_CODE.lake) return null;

  let cost = PATHING.STEP;
  if (terrain === TERRAIN_CODE.forest) cost += PATHING.FOREST;
  if (terrain === TERRAIN_CODE.rock) cost += PATHING.ROCK;
  // Y el vado se cruza pagando. Es la única celda de agua que se pisa, y por
  // eso existe como terreno propio: ver `TERRAIN_CODE.ford`.
  if (terrain === TERRAIN_CODE.ford) cost += PATHING.FORD;
  // The discount is what makes paths self-reinforcing (§7.6): a trodden cell is
  // cheaper, so the next villager takes it too, so it gets more trodden.
  cost -= PATHING.PATH_DISCOUNT[map.path[cell] ?? 0] ?? 0;
  return Math.max(PATHING.MIN_STEP, cost);
}

/**
 * A binary heap keyed on f, with the cell index breaking ties.
 *
 * Written out rather than sorting an array: this runs once per villager per
 * route change, and a sort on every push turns a fifty-person village into a
 * measurable share of the tick.
 */
class Frontier {
  private readonly f: number[] = [];
  private readonly cell: number[] = [];

  get size(): number {
    return this.cell.length;
  }

  private before(a: number, b: number): boolean {
    return (this.f[a] as number) < (this.f[b] as number) ||
      ((this.f[a] as number) === (this.f[b] as number) &&
        (this.cell[a] as number) < (this.cell[b] as number));
  }

  private swap(a: number, b: number): void {
    // Sin desestructurar: `[x, y] = [y, x]` reserva un array por intercambio, y
    // esto corre una vez por nivel del montículo en cada empuje y cada saque.
    const f = this.f[a] as number;
    this.f[a] = this.f[b] as number;
    this.f[b] = f;
    const cell = this.cell[a] as number;
    this.cell[a] = this.cell[b] as number;
    this.cell[b] = cell;
  }

  push(cell: number, f: number): void {
    this.cell.push(cell);
    this.f.push(f);
    let i = this.cell.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(i, parent)) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.cell[0] as number;
    const last = this.cell.length - 1;
    this.swap(0, last);
    this.cell.pop();
    this.f.pop();
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let best = i;
      if (left < this.cell.length && this.before(left, best)) best = left;
      if (right < this.cell.length && this.before(right, best)) best = right;
      if (best === i) break;
      this.swap(i, best);
      i = best;
    }
    return top;
  }
}

/**
 * Los tres arrays de trabajo de A*, reutilizados entre llamadas.
 *
 * **Esto no es micro-optimización: era el coste del tick.** A* pedía tres
 * arrays del tamaño del mapa y los **rellenaba** en cada ruta —`fill(-1)` dos
 * veces y un `Uint8Array` nuevo—, y `routesFor` pide una ruta por aldeano y por
 * semana. Con el mapa grande son 8 064 celdas × 3 × ochenta aldeanos: dos
 * millones de escrituras por tick para dejar a cero algo que se va a usar en
 * las cien celdas de una ruta.
 *
 * Medido: la suite rápida se fue de 18,4 a 28,5 segundos con el mapa grande
 * —su presupuesto son 20 (`CLAUDE.md`)— y la de balance de 18 minutos a más de
 * cincuenta, y esto era la mitad.
 *
 * En vez de rellenar, **se marca la visita**: un contador que sube en cada ruta
 * y una celda cuyo `seen` no es la marca de esta ruta cuenta como no vista. La
 * función sigue siendo pura hacia fuera —misma entrada, misma salida, y ninguna
 * ruta depende de la anterior— y sigue sin consumir azar (§4.3): lo único que
 * se comparte es memoria de borrador.
 */
let VISIT = 0;
interface Scratch {
  gScore: Int32Array;
  cameFrom: Int32Array;
  seen: Int32Array;
  done: Int32Array;
}
let SCRATCH: Scratch | null = null;

/**
 * v5.71 · El rectángulo de las celdas que la última búsqueda llegó a mirar:
 * las que sacó de la frontera y sus vecinas. Una celda de fuera no influyó en
 * nada de lo que hizo, así que si cambia de coste la misma búsqueda daría la
 * misma ruta. `paths.ts` lo usa para no repetir A* cuando se tala un árbol
 * lejos de una ruta.
 */
export interface SearchBounds { x0: number; y0: number; x1: number; y1: number }
let BOUNDS: SearchBounds = { x0: 0, y0: 0, x1: -1, y1: -1 };

/** Lo que miró la última llamada a `route`. Borrador compartido, como `SCRATCH`. */
export function lastSearchBounds(): SearchBounds {
  return BOUNDS;
}

function scratchFor(cells: number): Scratch {
  if (SCRATCH === null || SCRATCH.gScore.length < cells) {
    SCRATCH = {
      gScore: new Int32Array(cells),
      cameFrom: new Int32Array(cells),
      seen: new Int32Array(cells),
      done: new Int32Array(cells),
    };
  }
  return SCRATCH;
}

/**
 * The cheapest route from `from` to `to`, both ends included, or an empty array
 * if there is no way through.
 *
 * The heuristic is the Manhattan distance times the cheapest a step can
 * possibly be, which keeps it admissible however generous the path discount
 * gets: overestimate it and A* stops being optimal, and the route would change
 * the day somebody tuned `PATH_DISCOUNT`.
 */
export function route(map: ValleyMap, from: number, to: number): number[] {
  if (from === to) {
    BOUNDS = { x0: from % map.width, y0: Math.floor(from / map.width), x1: from % map.width, y1: Math.floor(from / map.width) };
    return [from];
  }
  if (stepCost(map, to) === null) return [];

  const cells = map.terrain.length;
  const width = map.width;
  const { gScore, cameFrom, seen, done } = scratchFor(cells);
  // **La marca de visita, en vez de tres `fill` por ruta.** Ver `scratchFor`.
  VISIT += 1;
  const visit = VISIT;
  const scoreOf = (cell: number): number => (seen[cell] === visit ? gScore[cell] as number : -1);

  const toX = to % width, toY = Math.floor(to / width), floor = PATHING.MIN_STEP;
  const heuristic = (cell: number): number => {
    const dx = Math.abs((cell % width) - toX);
    const dy = Math.abs(Math.floor(cell / width) - toY);
    return (dx + dy) * floor;
  };

  const base = baseCosts();
  const discount = PATHING.PATH_DISCOUNT as readonly number[];
  const minStep = PATHING.MIN_STEP;
  const terrain = map.terrain, worn = map.path;
  // La topología de `neighbours4`, en línea y sin un array por celda: el mismo
  // orden (arriba, izquierda, derecha, abajo) para empatar igual.
  const gridW = WORLD.WIDTH, gridH = WORLD.HEIGHT;
  const costOf = (cell: number): number => {
    const t = terrain[cell] as number;
    const b = base[t] as number;
    if (b < 0) return -1;
    const c = b - (discount[worn[cell] ?? 0] ?? 0);
    return c > minStep ? c : minStep;
  };

  const frontier = new Frontier();
  let x0 = from % width, x1 = x0, y0 = Math.floor(from / width), y1 = y0;
  gScore[from] = 0;
  seen[from] = visit;
  frontier.push(from, heuristic(from));

  while (frontier.size > 0) {
    const current = frontier.pop();
    if (current === to) break;
    if (done[current] === visit) continue;
    done[current] = visit;
    const cx = current % width, cy = (current - cx) / width;
    if (cx < x0) x0 = cx; else if (cx > x1) x1 = cx;
    if (cy < y0) y0 = cy; else if (cy > y1) y1 = cy;

    const here = gScore[current] as number;
    const nx = current % gridW, ny = (current - nx) / gridW;
    for (let k = 0; k < 4; k += 1) {
      let next: number;
      if (k === 0) { if (ny === 0) continue; next = current - gridW; }
      else if (k === 1) { if (nx === 0) continue; next = current - 1; }
      else if (k === 2) { if (nx + 1 >= gridW) continue; next = current + 1; }
      else { if (ny + 1 >= gridH) continue; next = current + gridW; }
      if (done[next] === visit) continue;
      const cost = costOf(next);
      if (cost < 0) continue;
      const tentative = here + cost;
      if (seen[next] === visit && tentative >= (gScore[next] as number)) continue;
      gScore[next] = tentative;
      seen[next] = visit;
      cameFrom[next] = current;
      frontier.push(next, tentative + heuristic(next));
    }
  }

  // Las vecinas de lo expandido también se miraron: un borde de una celda.
  BOUNDS = { x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1 };
  if (scoreOf(to) === -1) return [];
  const path: number[] = [];
  for (let at = to; at !== -1; at = seen[at] === visit ? cameFrom[at] as number : -1) {
    path.push(at);
    if (at === from) break;
  }
  return path.reverse();
}
