// M-15 · Getting from one cell to another. design.md §7.6.
//
// A* over the four cardinal neighbours, with the cost of §7.6: forest and rock
// are dear, an existing path is cheap, water and marsh are not passable at all.
//
// Every cost is an integer. Floats would tie differently on two machines that
// round the last bit differently, and a route that differs by one cell puts the
// traffic on a different cell, which after a century is a different village.
// The tie-break is the lower cell index, for the same reason.

import { PATHING } from '../balance';
import { TERRAIN_CODE } from '../state';
import type { ValleyMap } from '../state';
import { neighbours4 } from './tiles';

/** What it costs to step into a cell, or null if it cannot be stepped into. */
export function stepCost(map: ValleyMap, cell: number): number | null {
  const terrain = map.terrain[cell];
  if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.marsh) return null;

  let cost = PATHING.STEP;
  if (terrain === TERRAIN_CODE.forest) cost += PATHING.FOREST;
  if (terrain === TERRAIN_CODE.rock) cost += PATHING.ROCK;
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
 * The cheapest route from `from` to `to`, both ends included, or an empty array
 * if there is no way through.
 *
 * The heuristic is the Manhattan distance times the cheapest a step can
 * possibly be, which keeps it admissible however generous the path discount
 * gets: overestimate it and A* stops being optimal, and the route would change
 * the day somebody tuned `PATH_DISCOUNT`.
 */
export function route(map: ValleyMap, from: number, to: number): number[] {
  if (from === to) return [from];
  if (stepCost(map, to) === null) return [];

  const cells = map.terrain.length;
  const width = map.width;
  const gScore = new Int32Array(cells).fill(-1);
  const cameFrom = new Int32Array(cells).fill(-1);
  const done = new Uint8Array(cells);

  const heuristic = (cell: number): number => {
    const dx = Math.abs((cell % width) - (to % width));
    const dy = Math.abs(Math.floor(cell / width) - Math.floor(to / width));
    return (dx + dy) * PATHING.MIN_STEP;
  };

  const frontier = new Frontier();
  gScore[from] = 0;
  frontier.push(from, heuristic(from));

  while (frontier.size > 0) {
    const current = frontier.pop();
    if (current === to) break;
    if (done[current] === 1) continue;
    done[current] = 1;

    for (const next of neighbours4(current)) {
      if (done[next] === 1) continue;
      const cost = stepCost(map, next);
      if (cost === null) continue;
      const tentative = (gScore[current] as number) + cost;
      const known = gScore[next] as number;
      if (known !== -1 && tentative >= known) continue;
      gScore[next] = tentative;
      cameFrom[next] = current;
      frontier.push(next, tentative + heuristic(next));
    }
  }

  if (gScore[to] === -1) return [];
  const path: number[] = [];
  for (let at = to; at !== -1; at = cameFrom[at] as number) {
    path.push(at);
    if (at === from) break;
  }
  return path.reverse();
}
