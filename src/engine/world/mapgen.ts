// M-13: deterministic terrain, design.md §7.1.
import { MAPGEN, WORLD } from '../balance';
import { int, next } from '../rng';
import type { RngBundle } from '../rng';
import { TERRAIN_CODE } from '../state';
import type { ValleyMap } from '../state';
import { idx, neighbours4 } from './tiles';

// The M-13 contract names all four functions together (§17). The topology two
// live in tiles.ts because M-14 and M-15 need them without pulling in the
// generator; re-exported here so the brief reads true from one import.
export { idx, neighbours4 } from './tiles';

interface Site { x: number; y: number }
const CELLS = WORLD.WIDTH * WORLD.HEIGHT;

/** Manhattan distance to water, including water itself at zero. */
function riverDistances(map: ValleyMap): Int16Array {
  const distance = new Int16Array(CELLS).fill(CELLS);
  const queue: number[] = [];
  map.terrain.forEach((terrain, i) => {
    if (terrain === TERRAIN_CODE.water) { distance[i] = 0; queue.push(i); }
  });
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head]!;
    for (const neighbour of neighbours4(cell)) {
      if (distance[neighbour]! <= distance[cell]! + 1) continue;
      distance[neighbour] = distance[cell]! + 1;
      queue.push(neighbour);
    }
  }
  return distance;
}

/** Top-left corner of a meadow square, with no adjacent marsh.
 * Ranking is lexicographic: optimal river distance, distance from map centre,
 * then cell index. No arbitrary weighted sum is used. */
export function foundingSite(map: ValleyMap): Site {
  const distance = riverDistances(map);
  const stride = WORLD.WIDTH + 1;
  const blocked = new Int32Array(stride * (WORLD.HEIGHT + 1));
  for (let y = 0; y < WORLD.HEIGHT; y += 1) {
    for (let x = 0; x < WORLD.WIDTH; x += 1) {
      const cell = idx(x, y);
      const unavailable = map.terrain[cell] !== TERRAIN_CODE.meadow ||
        neighbours4(cell).some((n) => map.terrain[n] === TERRAIN_CODE.marsh);
      const p = (y + 1) * stride + x + 1;
      blocked[p] = Number(unavailable) + blocked[p - 1]! + blocked[p - stride]! - blocked[p - stride - 1]!;
    }
  }
  let best: Site | undefined;
  let bestRiver = Infinity;
  let bestCentre = Infinity;
  const size = MAPGEN.CLEARING_SIZE;
  for (let y = 0; y <= WORLD.HEIGHT - size; y += 1) {
    // The clearing's centre, rather than its corner, lies in the central third.
    if (y + size / 2 < WORLD.HEIGHT / 3 || y + size / 2 >= 2 * WORLD.HEIGHT / 3) continue;
    for (let x = 0; x <= WORLD.WIDTH - size; x += 1) {
      const occupied = blocked[(y + size) * stride + x + size]! - blocked[y * stride + x + size]!
        - blocked[(y + size) * stride + x]! + blocked[y * stride + x]!;
      if (occupied !== 0) continue;
      const d = distance[idx(x, y)]!;
      const riverPenalty = Math.max(MAPGEN.SITE_RIVER_DISTANCE[0] - d, 0, d - MAPGEN.SITE_RIVER_DISTANCE[1]);
      const centrePenalty = (2 * x + size - WORLD.WIDTH) ** 2 + (2 * y + size - WORLD.HEIGHT) ** 2;
      if (riverPenalty > bestRiver || (riverPenalty === bestRiver && centrePenalty >= bestCentre)) continue;
      best = { x, y };
      bestRiver = riverPenalty;
      bestCentre = centrePenalty;
    }
  }
  if (best === undefined) throw new Error('No valid 12-by-12 founding clearing');
  return best;
}

function noiseGrid(b: RngBundle, scale: number): (x: number, y: number) => number {
  const width = Math.ceil(WORLD.WIDTH / scale) + 1;
  const height = Math.ceil(WORLD.HEIGHT / scale) + 1;
  const values = Array.from({ length: width * height }, () => next(b, 'map'));
  return (x, y) => {
    const gx = Math.floor(x / scale);
    const gy = Math.floor(y / scale);
    const ease = (t: number): number => t * t * (3 - 2 * t);
    const fx = ease(x / scale - gx);
    const fy = ease(y / scale - gy);
    const upper = values[gy * width + gx]! * (1 - fx) + values[gy * width + gx + 1]! * fx;
    const lower = values[(gy + 1) * width + gx]! * (1 - fx) + values[(gy + 1) * width + gx + 1]! * fx;
    return upper * (1 - fy) + lower * fy;
  };
}

/** Uses a local copy: neither the supplied map stream nor any other stream advances. */
export function generateMap(bundle: RngBundle): ValleyMap {
  const b = { ...bundle };
  // 1. BASE: a meadow, with independent blank simulation overlays.
  const map: ValleyMap = {
    width: WORLD.WIDTH, height: WORLD.HEIGHT,
    terrain: new Uint8Array(CELLS).fill(TERRAIN_CODE.meadow),
    traffic: new Uint16Array(CELLS), path: new Uint8Array(CELLS),
    ruins: new Uint8Array(CELLS), forestAge: new Uint8Array(CELLS),
    forestStock: new Uint16Array(CELLS),
  };
  // 2. RIVER: one continuous strip; a lateral move never skips a row.
  const entry = int(b, 'map', ...MAPGEN.RIVER_ENTRY);
  const river: number[] = [];
  let riverX = entry;
  for (let y = 0; y < WORLD.HEIGHT; y += 1) {
    if (y > 0 && next(b, 'map') >= MAPGEN.RIVER_FORWARD_CHANCE) {
      riverX = Math.max(entry - MAPGEN.RIVER_MEANDER,
        Math.min(entry + MAPGEN.RIVER_MEANDER, riverX + (next(b, 'map') < 0.5 ? -1 : 1)));
    }
    river.push(riverX);
    const width = y >= 2 * WORLD.HEIGHT / 3 ? MAPGEN.RIVER_LOWER_WIDTH : MAPGEN.RIVER_WIDTH;
    for (let dx = 0; dx < width; dx += 1) map.terrain[idx(riverX + dx, y)] = TERRAIN_CODE.water;
  }
  const distance = riverDistances(map);
  // Reserve the actual winning clearing before adding obstructions. This never
  // clears existing terrain or rerolls a river, and always terminates.
  const site = foundingSite(map);
  const protectedCell = (x: number, y: number): boolean =>
    x >= site.x - 1 && x <= site.x + MAPGEN.CLEARING_SIZE &&
    y >= site.y - 1 && y <= site.y + MAPGEN.CLEARING_SIZE;

  // 3. FOREST: two-octave value noise, thresholded by rank to meet the target.
  const broad = noiseGrid(b, MAPGEN.NOISE_SCALES[0]);
  const fine = noiseGrid(b, MAPGEN.NOISE_SCALES[1]);
  const candidates: { cell: number; score: number }[] = [];
  for (let y = 0; y < WORLD.HEIGHT; y += 1) {
    for (let x = 0; x < WORLD.WIDTH; x += 1) {
      const cell = idx(x, y);
      if (map.terrain[cell] !== TERRAIN_CODE.meadow || protectedCell(x, y) || distance[cell]! <= MAPGEN.MARSH_WIDTH[1]) continue;
      candidates.push({ cell, score: broad(x, y) + MAPGEN.FINE_NOISE_WEIGHT * fine(x, y)
        + MAPGEN.SLOPE_BIAS * Math.abs(2 * x / (WORLD.WIDTH - 1) - 1)
        + MAPGEN.NORTH_BIAS * (1 - y / (WORLD.HEIGHT - 1)) });
    }
  }
  candidates.sort((a, z) => z.score - a.score || a.cell - z.cell);
  const fraction = MAPGEN.FOREST_FRACTION[0] + next(b, 'map') * (MAPGEN.FOREST_FRACTION[1] - MAPGEN.FOREST_FRACTION[0]);
  const forestCount = Math.round(CELLS * fraction);
  if (candidates.length < forestCount) throw new Error('Insufficient space for the forest target');
  for (const { cell } of candidates.slice(0, forestCount)) map.terrain[cell] = TERRAIN_CODE.forest;

  // 4. ROCK: connected outcrops, with distant starts preferred. Never occupy
  // the reserved clearing, forest, water, or the future marsh strip.
  const rockCount = int(b, 'map', ...MAPGEN.ROCK_PATCHES);
  for (let patch = 0; patch < rockCount; patch += 1) {
    const desired = int(b, 'map', ...MAPGEN.ROCK_SIZE);
    const eligible = Array.from({ length: CELLS }, (_, i) => i).filter((i) =>
      map.terrain[i] === TERRAIN_CODE.meadow && distance[i]! > MAPGEN.MARSH_WIDTH[1] &&
      !protectedCell(i % WORLD.WIDTH, Math.floor(i / WORLD.WIDTH)) &&
      !neighbours4(i).some((n) => map.terrain[n] === TERRAIN_CODE.rock));
    const ranked = eligible.map((cell) => ({ cell, random: next(b, 'map') }));
    ranked.sort((a, z) => Number(distance[z.cell]! >= MAPGEN.ROCK_RIVER_DISTANCE)
      - Number(distance[a.cell]! >= MAPGEN.ROCK_RIVER_DISTANCE) || a.random - z.random || a.cell - z.cell);
    const eligibleSet = new Set(eligible);
    let cells: number[] = [];
    for (const start of ranked) {
      const visited = new Set([start.cell]);
      const frontier = [start.cell];
      for (let head = 0; head < frontier.length && frontier.length < desired; head += 1) {
        for (const neighbour of neighbours4(frontier[head]!)) {
          if (!eligibleSet.has(neighbour) || visited.has(neighbour)) continue;
          frontier.push(neighbour);
          visited.add(neighbour);
          if (frontier.length === desired) break;
        }
      }
      if (frontier.length === desired) { cells = frontier; break; }
    }
    if (cells.length === 0) throw new Error('Insufficient space for a rock outcrop');
    for (const cell of cells) map.terrain[cell] = TERRAIN_CODE.rock;
  }
  // 5. MARSH: low-slope reaches are rows whose river does not turn. The strip
  // stays clear of the protected square and cannot erase the forest target.
  for (let y = 1; y + 1 < WORLD.HEIGHT; y += 1) {
    if (river[y - 1] !== river[y] || river[y] !== river[y + 1]) continue;
    const width = int(b, 'map', ...MAPGEN.MARSH_WIDTH);
    for (let x = 0; x < WORLD.WIDTH; x += 1) {
      const cell = idx(x, y);
      if (distance[cell]! <= width && map.terrain[cell] === TERRAIN_CODE.meadow && !protectedCell(x, y)) {
        map.terrain[cell] = TERRAIN_CODE.marsh;
      }
    }
  }
  // Every standing tree, counted. §7.5 gives each forest cell its own store,
  // and this is the only place it is filled: after this, wood only leaves.
  for (let i = 0; i < CELLS; i += 1) {
    if (map.terrain[i] === TERRAIN_CODE.forest) map.forestStock[i] = WORLD.WOOD_PER_FOREST_TILE;
  }
  return map;
}
