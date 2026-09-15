// M-13: deterministic terrain, design.md §7.1.
import { MAPGEN, TRAITS, WORLD } from '../balance';
import { int, next } from '../rng';
import type { RngBundle } from '../rng';
import { TERRAIN_CODE, valleyTraits } from '../state';
import type { ValleyMap } from '../state';
import { idx, neighbours4 } from './tiles';

// The M-13 contract names all four functions together (§17). The topology two
// live in tiles.ts because M-14 and M-15 need them without pulling in the
// generator; re-exported here so the brief reads true from one import.
export { idx, neighbours4 } from './tiles';

interface Site { x: number; y: number }
const CELLS = WORLD.WIDTH * WORLD.HEIGHT;

/**
 * El corazón del valle: el rectángulo productivo, centrado en el mapa.
 *
 * Todo lo que la economía cuenta vive aquí dentro —el bosque, la roca, la
 * marisma, la fundación— y mide lo mismo que medía el mapa entero antes del
 * paso 3 (`WORLD.HEART_WIDTH`). Lo de fuera es montaña y lago: paisaje que
 * cierra y no produce.
 *
 * Centrado y no pegado a una esquina porque es literalmente lo que se pidió:
 * «el valle es el centro del mapa, pero debe ser más amplio».
 */
const HEART = {
  x0: Math.floor((WORLD.WIDTH - WORLD.HEART_WIDTH) / 2),
  y0: Math.floor((WORLD.HEIGHT - WORLD.HEART_HEIGHT) / 2),
} as const;
const HEART_X1 = HEART.x0 + WORLD.HEART_WIDTH;
const HEART_Y1 = HEART.y0 + WORLD.HEART_HEIGHT;

/** Si una celda cae en el corazón. */
function inHeart(x: number, y: number): boolean {
  return x >= HEART.x0 && x < HEART_X1 && y >= HEART.y0 && y < HEART_Y1;
}

/**
 * Lo lejos que una celda está del corazón, en celdas, y 0 dentro.
 *
 * Es lo que hace que la montaña suba hacia fuera en vez de caer en manchas
 * sueltas: la sierra de `ridge.ts` empieza donde acaba el mapa, y esto es su
 * pie dentro de él.
 */
function outOfHeart(x: number, y: number): number {
  const dx = Math.max(0, Math.max(HEART.x0 - x, x - (HEART_X1 - 1)));
  const dy = Math.max(0, Math.max(HEART.y0 - y, y - (HEART_Y1 - 1)));
  return Math.hypot(dx, dy);
}

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
    // **Y el claro entero cae dentro del corazón.** Sin esto, un claro podía
    // empezar en el corazón y acabar en la falda: medido en la semilla 197 de
    // 200, el sitio reservado salía en x 45 con el corazón acabando en 53, y el
    // lago se comía siete celdas de la plaza. La aldea es el centro del valle
    // productivo, no un pueblo a medio camino de la sierra.
    if (y < HEART.y0 || y + size > HEART_Y1) continue;
    for (let x = Math.max(0, HEART.x0); x <= Math.min(WORLD.WIDTH - size, HEART_X1 - size); x += 1) {
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

/**
 * El vado: las celdas de agua que se pisan para cruzar, desde una orilla.
 *
 * Recto, celda de agua a celda de agua, hasta tierra firme — un vado torcido no
 * es un vado. Devuelve la lista vacía si desde ahí no se cruza a ninguna parte:
 * un recodo donde el agua se ensancha, o una orilla que da a la marisma. Mejor
 * ningún vado que uno que no lleva al otro lado.
 *
 * La geometría es la que el 3D ya dibujaba en `render3d/world/ford.ts`, traída
 * al motor porque **el sitio que la ficción nombra no se calcula dos veces**:
 * es la lección que G-10 ya pagó una vez con dos vados en dos sitios.
 */
function crossingFrom(map: ValleyMap, cx: number, cy: number): number[] {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const crossing: number[] = [];
    for (let step = 1; step <= MAPGEN.FORD_SPAN; step += 1) {
      const nx = cx + dx * step;
      const ny = cy + dy * step;
      if (nx < 0 || ny < 0 || nx >= WORLD.WIDTH || ny >= WORLD.HEIGHT) break;
      const cell = idx(nx, ny);
      if (map.terrain[cell] === TERRAIN_CODE.water) { crossing.push(cell); continue; }
      if (map.terrain[cell] !== TERRAIN_CODE.marsh && crossing.length > 0) return crossing;
      break;
    }
  }
  return [];
}

/** Uses a local copy: neither the supplied map stream nor any other stream advances. */
export function generateMap(bundle: RngBundle, terrainSeed?: number): ValleyMap {
  // Los rasgos del valle se sortean de la semilla del terreno, igual que el
  // mapa: el bosque de un valle viejo es viejo desde antes de generarse.
  const traits = terrainSeed === undefined ? [] : valleyTraits(terrainSeed);
  const woodPerCell = traits.includes('old_forest') ? TRAITS.OLD_FOREST_WOOD : 1;
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
  const entry = HEART.x0 + int(b, 'map', ...MAPGEN.RIVER_ENTRY);
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
      // **Sólo el corazón.** Fuera de él no hay bosque que talar, porque el
      // bosque es la madera del valle y su cantidad es fija: ver
      // `WORLD.HEART_WIDTH`. Los árboles que se ven en las laderas de fuera son
      // de `ridge.ts` y no tienen tronco que contar.
      if (!inHeart(x, y)) continue;
      if (map.terrain[cell] !== TERRAIN_CODE.meadow || protectedCell(x, y) || distance[cell]! <= MAPGEN.MARSH_WIDTH[1]) continue;
      candidates.push({ cell, score: broad(x, y) + MAPGEN.FINE_NOISE_WEIGHT * fine(x, y)
        + MAPGEN.SLOPE_BIAS * Math.abs(2 * x / (WORLD.WIDTH - 1) - 1)
        + MAPGEN.NORTH_BIAS * (1 - y / (WORLD.HEIGHT - 1)) });
    }
  }
  candidates.sort((a, z) => z.score - a.score || a.cell - z.cell);
  const fraction = MAPGEN.FOREST_FRACTION[0] + next(b, 'map') * (MAPGEN.FOREST_FRACTION[1] - MAPGEN.FOREST_FRACTION[0]);
  // Del corazón del valle y no del mapa: ver `MAPGEN.HEART_CELLS`. Con el mapa
  // de hoy es la misma cuenta que antes, celda por celda.
  const forestCount = Math.round(WORLD.HEART_WIDTH * WORLD.HEART_HEIGHT * fraction);
  if (candidates.length < forestCount) throw new Error('Insufficient space for the forest target');
  for (const { cell } of candidates.slice(0, forestCount)) map.terrain[cell] = TERRAIN_CODE.forest;

  // 4. ROCK: connected outcrops, with distant starts preferred. Never occupy
  // the reserved clearing, forest, water, or the future marsh strip.
  // E5 · un valle de lomas peladas tiene la mitad de pedregales, y se ve.
  const rockCount = Math.max(1, Math.round(
    int(b, 'map', ...MAPGEN.ROCK_PATCHES)
    * (traits.includes('bare_hills') ? TRAITS.BARE_HILLS_ROCK : 1),
  ));
  for (let patch = 0; patch < rockCount; patch += 1) {
    const desired = int(b, 'map', ...MAPGEN.ROCK_SIZE);
    const eligible = Array.from({ length: CELLS }, (_, i) => i).filter((i) =>
      // En el corazón: la piedra de un pedregal es la de las casas de piedra
      // (§7.3), así que un pedregal a treinta celdas del pueblo no es un
      // recurso, es decorado — y ya hay montaña para eso.
      inHeart(i % WORLD.WIDTH, Math.floor(i / WORLD.WIDTH)) &&
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
  // 6. FORD: por dónde se cruza el río, junto al claro de fundación.
  //
  // Después de la marisma a propósito: la marisma se dibuja sobre prado y no
  // sobre agua, así que no puede tapar el paso, pero sí decide qué orillas son
  // firmes — y un vado que sale a una marisma no lleva a ninguna parte.
  const heartOfSite = {
    x: site.x + MAPGEN.CLEARING_SIZE / 2,
    y: site.y + MAPGEN.CLEARING_SIZE / 2,
  };
  let bank = -1;
  let bankDistance = Number.POSITIVE_INFINITY;
  for (let cell = 0; cell < CELLS; cell += 1) {
    const kind = map.terrain[cell];
    if (kind === TERRAIN_CODE.water || kind === TERRAIN_CODE.marsh) continue;
    if (!neighbours4(cell).some((n) => map.terrain[n] === TERRAIN_CODE.water)) continue;
    const x = cell % WORLD.WIDTH;
    const y = Math.floor(cell / WORLD.WIDTH);
    const away = (x + 0.5 - heartOfSite.x) ** 2 + (y + 0.5 - heartOfSite.y) ** 2;
    // La orilla más cercana al claro **que además cruce a alguna parte**: la
    // más cercana a secas podía ser un recodo sin salida, y entonces la aldea
    // se quedaba sin vado teniendo río.
    if (away >= bankDistance) continue;
    if (crossingFrom(map, x, y).length === 0) continue;
    bank = cell;
    bankDistance = away;
  }
  if (bank >= 0) {
    for (const cell of crossingFrom(map, bank % WORLD.WIDTH, Math.floor(bank / WORLD.WIDTH))) {
      map.terrain[cell] = TERRAIN_CODE.ford;
    }
  }
  // 6. LAKE: una mancha de agua quieta en la falda, fuera del corazón.
  //
  // Antes que la montaña a propósito: así la roca crece alrededor del lago y no
  // al revés, que es como se ven los lagos de montaña de verdad — el agua se
  // queda en el hueco y la piedra la rodea.
  const lakeWanted = int(b, 'map', ...MAPGEN.LAKE_SIZE);
  const lakeSeeds: { cell: number; random: number }[] = [];
  for (let y = 0; y < WORLD.HEIGHT; y += 1) {
    for (let x = 0; x < WORLD.WIDTH; x += 1) {
      const cell = idx(x, y);
      if (map.terrain[cell] !== TERRAIN_CODE.meadow) continue;
      // Ni dentro del corazón ni pegado al río: un lago sobre el cauce sería un
      // embalse, y el río es la espina del valle y tiene que llegar entero.
      const out = outOfHeart(x, y);
      if (inHeart(x, y) || protectedCell(x, y)) continue;
      if (out < MAPGEN.MOUNTAIN_FOOT || distance[cell]! <= MAPGEN.MARSH_WIDTH[1] + 1) continue;
      lakeSeeds.push({ cell, random: next(b, 'map') });
    }
  }
  lakeSeeds.sort((a, z) => a.random - z.random || a.cell - z.cell);
  const lakeStart = lakeSeeds[0];
  if (lakeStart !== undefined) {
    // Se crece como un pedregal: frontera en anchura sobre celdas admisibles. Un
    // lago no tiene por qué llegar al tamaño pedido —puede topar con el río o
    // con el borde— y eso no es un fallo: es un lago pequeño.
    // `protectedCell` y no sólo `inHeart`: el claro reservado puede asomar del
    // corazón —no debería, y `foundingSite` ya no lo permite, pero esta función
    // no es quien lo garantiza— y un lago dentro de la plaza del pueblo deja la
    // fundación sin sitio donde ponerse.
    const open = (cell: number): boolean => map.terrain[cell] === TERRAIN_CODE.meadow
      && !inHeart(cell % WORLD.WIDTH, Math.floor(cell / WORLD.WIDTH))
      && !protectedCell(cell % WORLD.WIDTH, Math.floor(cell / WORLD.WIDTH))
      && distance[cell]! > MAPGEN.MARSH_WIDTH[1] + 1;
    const shore = [lakeStart.cell];
    const seen = new Set(shore);
    for (let head = 0; head < shore.length && shore.length < lakeWanted; head += 1) {
      for (const neighbour of neighbours4(shore[head]!)) {
        if (seen.has(neighbour) || !open(neighbour)) continue;
        shore.push(neighbour);
        seen.add(neighbour);
        if (shore.length === lakeWanted) break;
      }
    }
    for (const cell of shore) map.terrain[cell] = TERRAIN_CODE.lake;
  }

  // 7. MOUNTAIN: la falda que cierra el valle, más maciza cuanto más lejos.
  //
  // Probabilidad y no umbral duro, y con ruido encima: un umbral daría un
  // rectángulo de roca alrededor de un rectángulo de prado, y el valle se leería
  // como una maqueta con marco. Lo que esto dibuja es una ladera que se cierra.
  const relief = noiseGrid(b, MAPGEN.NOISE_SCALES[0]);
  for (let y = 0; y < WORLD.HEIGHT; y += 1) {
    for (let x = 0; x < WORLD.WIDTH; x += 1) {
      const cell = idx(x, y);
      if (map.terrain[cell] !== TERRAIN_CODE.meadow) continue;
      // **Nunca dentro del corazón, y el ruido no puede colarla.** Primera
      // versión: el ruido se sumaba a la distancia al corazón sin este guardia,
      // así que una celda del centro con el ruido alto daba `out` de casi cinco
      // y se convertía en montaña. Costó una celda del claro de fundación —143
      // de 144— y con eso `foundingSite` dejaba de encontrar sitio y la
      // generación se caía en la semilla 1 de 200. Un valle con un risco en
      // medio de la plaza.
      if (inHeart(x, y) || protectedCell(x, y)) continue;
      // El río cruza la falda por el norte y por el sur, y tiene que seguir
      // cruzándola: sin esta holgura la montaña lo embalsa en el borde.
      if (distance[cell]! <= MAPGEN.MARSH_WIDTH[1]) continue;
      const out = outOfHeart(x, y) + (relief(x, y) - 0.5) * 2 * MAPGEN.MOUNTAIN_ROUGH;
      if (out <= MAPGEN.MOUNTAIN_FOOT) continue;
      const climb = Math.min(1,
        (out - MAPGEN.MOUNTAIN_FOOT) / (MAPGEN.MOUNTAIN_FULL - MAPGEN.MOUNTAIN_FOOT));
      if (next(b, 'map') < climb) map.terrain[cell] = TERRAIN_CODE.mountain;
    }
  }
  // Every standing tree, counted. §7.5 gives each forest cell its own store,
  // and this is the only place it is filled: after this, wood only leaves.
  //
  // `forestAge` marks the old wood with VIRGIN_FOREST. On a forest cell that
  // field has nothing else to say — it counts the years of a *cleared* cell —
  // so it is where "this tree was here when they arrived" fits without another
  // layer. A cell that is felled loses the mark, and one that grows back never
  // gets it: what grows back is not the wood they found.
  for (let i = 0; i < CELLS; i += 1) {
    if (map.terrain[i] !== TERRAIN_CODE.forest) continue;
    // E5 · un bosque viejo guarda más leña por celda. Se aplica **al generar**
    // y no al talar: es lo que el sitio era, no una bonificación que se cobra.
    map.forestStock[i] = Math.round(WORLD.WOOD_PER_FOREST_TILE * woodPerCell);
    map.forestAge[i] = WORLD.VIRGIN_FOREST;
  }
  return map;
}
