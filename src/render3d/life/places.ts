// V-10 · Sitios con vida. design.md Anexo E.
//
// **La plaza, el vado, el claro: sitios que no son un edificio pero ofrecen.**
//
// El mundo ofrece acciones desde sitios. Hasta ahora todos tienen una casa,
// un pozo, un campo. Pero hay sitios que no son un edificio: la plaza donde
// la aldea se junta, el vado donde se cruza el río, el claro del bosque.
//
// Cada uno de estos sitios tiene su hora: el pozo por la mañana, la era
// al mediodía, la plaza al caer la tarde. Fuera de su hora una oferta vale
// menos, no cero — eso da forma a la jornada sin guionizar a nadie.

import type { GameState } from '@engine/state';
import { TERRAIN_CODE as CODES } from '@engine/state';
import type { Point, Terrain } from './body';
import type { Place } from './offers';
import { OFFERS, placedOffer, placesOf } from './offers';
import { canReach, reachableFrom } from './terrain';

/**
 * Las celdas a las que se puede llegar desde el núcleo del pueblo.
 *
 * **Sin esto, `detectSquare` y `detectGlade` podían escoger un candidato al
 * otro lado del río.** El río no se cruza (V-03): sólo el 37 % del suelo libre
 * queda conectado con el centro, así que buscar «la región de prado más
 * grande» o «el primer claro que cumpla el umbral» sin mirar la conectividad
 * encuentra a menudo uno en la orilla equivocada — transitable en sí mismo,
 * pero inalcanzable para nadie. Medido antes de esto: la plaza sin visita en
 * cuatro semillas de seis, el claro en dos, y en ninguno de los dos casos era
 * un problema de distancia o de la hora punta, sino que el sitio nunca llegaba
 * a la lista de `decide()`.
 *
 * **El corazón tiene que ser un punto transitable, no un promedio geométrico.**
 * La primera versión de esto usaba el centro de masa de los edificios, y ese
 * punto puede caer dentro de una pared: `reachableFrom` parte de una celda
 * bloqueada devuelve alcanzabilidad vacía entera, así que en tres de seis
 * semillas `commons()` dejó de encontrar nada en absoluto — ni siquiera el
 * vado, que antes sí aparecía. Se usa el mismo criterio que ya prueba ser
 * transitable por construcción: el sitio con más vecinos a mano entre los que
 * `placesOf` ya sabe alcanzar (su puerta), igual que hace `village.ts` cuando
 * no tiene una referencia mejor.
 */
function shoreOf(state: GameState, land: Terrain): Uint8Array {
  const built = placesOf(state, land);
  let heart: Point = { x: land.width / 2, z: land.height / 2 };
  let most = -1;
  for (const place of built) {
    const near = built.filter(
      (other) => Math.hypot(other.at.x - place.at.x, other.at.z - place.at.z) < 14,
    ).length;
    if (near > most) { most = near; heart = place.at; }
  }
  return reachableFrom(land, heart);
}

/**
 * La plaza: celdas libres rodeadas de edificios, donde la aldea se junta.
 *
 * Se detecta buscando una región de prado/talado suficientemente grande,
 * rodeada de construcciones.
 */
function detectSquare(state: GameState, land: Terrain, shore: Uint8Array): Place | null {
  const { width, height } = state.map;
  const visited = new Uint8Array(width * height);
  let best: { center: Point; size: number } | null = null;

  for (let z = 1; z < height - 1; z += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const cell = z * width + x;
      if (visited[cell] === 1) continue;
      if (land.blocked[cell] === 1) continue;

      // Busca una región de prado/talado que no sea muy pequeña.
      const terrainKind = state.map.terrain[cell];
      if (terrainKind !== CODES.meadow && terrainKind !== CODES.cleared) continue;

      // Inundación por las 4 direcciones para medir la región.
      const queue = [cell];
      visited[cell] = 1;
      let size = 0;
      for (let head = 0; head < queue.length; head += 1) {
        const cur = queue[head] as number;
        size += 1;
        const cx = cur % width;
        const cz = Math.floor(cur / width);
        for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
          const next = nz * width + nx;
          if (visited[next] === 1 || land.blocked[next] === 1) continue;
          const nextTerrain = state.map.terrain[next];
          if (nextTerrain !== CODES.meadow && nextTerrain !== CODES.cleared) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      // TUNE: 25 celdas es un área de 5×5. La plaza debe ser clara y no confundirse
      // con un claro casual.
      if (size >= 25) {
        // Centro de la región: selecciona una celda que sea de verdad libre.
        let sumX = 0;
        let sumZ = 0;
        for (const cell of queue) {
          sumX += cell % width;
          sumZ += Math.floor(cell / width);
        }
        const centerX = sumX / size;
        const centerZ = sumZ / size;

        // Busca la celda más cercana al centro que esté en la región.
        let closest: Point | null = null;
        let closestDist = Number.POSITIVE_INFINITY;
        for (const cell of queue) {
          const cx = (cell % width) + 0.5;
          const cz = Math.floor(cell / width) + 0.5;
          const dist = (cx - centerX) ** 2 + (cz - centerZ) ** 2;
          if (dist < closestDist) {
            closestDist = dist;
            closest = { x: cx, z: cz };
          }
        }

        // **Sólo si se puede llegar.** El río no se cruza (V-03): una región
        // de prado grande al otro lado es transitable en sí misma pero
        // inalcanzable para nadie, y sin este filtro ganaba igual si era la
        // más grande.
        if (closest !== null && canReach(land, shore, closest)
          && (best === null || size > best.size)) {
          best = { center: closest, size };
        }
      }
    }
  }

  if (best === null) return null;

  // Ofrece compañía y aburrimiento (gossip), con hora punta al caer la tarde.
  const gossipSpec = OFFERS.gossip;
  if (gossipSpec === undefined) return null;

  const offer = placedOffer(gossipSpec, best.center, land, [0.6, 1.0]);
  if (offer === null) return null;
  return { id: 'square:common', at: offer.at, offers: [offer] };
}

/**
 * El vado: tierra junto a agua, donde se puede cruzar.
 *
 * Es un punto de interés donde la aldea pasa para cruzar el río, aunque no sea
 * un puente transitable en la simulación. Ofrece un lugar de reunión.
 */
function detectFord(state: GameState, land: Terrain, shore: Uint8Array): Place | null {
  const { width, height } = state.map;
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  // Busca tierra junto a agua, más cercana al centro.
  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    const terrain = state.map.terrain[cell];
    if (terrain === CODES.water || terrain === CODES.marsh) continue;
    if (land.blocked[cell] === 1) continue;

    // Debe estar adyacente a agua.
    const x = cell % width;
    const z = Math.floor(cell / width);
    let hasWater = false;
    for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const next = nz * width + nx;
      if (state.map.terrain[next] === CODES.water) {
        hasWater = true;
        break;
      }
    }
    if (!hasWater) continue;
    // El río tiene dos orillas: un vado en la orilla de nadie no sirve.
    if (!canReach(land, shore, { x: x + 0.5, z: z + 0.5 })) continue;

    // Más cercano al centro del valle.
    const cx = width / 2;
    const cz = height / 2;
    const distance = (x + 0.5 - cx) ** 2 + (z + 0.5 - cz) ** 2;
    if (distance < bestDistance || (distance === bestDistance && cell < best)) {
      best = cell;
      bestDistance = distance;
    }
  }

  if (best < 0) return null;

  const at: Point = { x: (best % width) + 0.5, z: Math.floor(best / width) + 0.5 };
  const loiterSpec = OFFERS.loiter;
  if (loiterSpec === undefined) return null;

  // El vado ofrece un lugar tranquilo, con hora punta por la mañana.
  const offer = placedOffer(loiterSpec, at, land, [0.0, 0.4]);
  if (offer === null) return null;

  // **Y da de beber** (IA-1). El vado es una celda de tierra con el río al
  // lado: hasta ahora la única agua del valle era el pozo, un edificio, y con
  // dos plazas. Eso dejaba a la aldea entera dependiendo de un brocal —y sin
  // ninguna si el pozo no estaba levantado todavía—, y se midió gente de pie
  // con la sed al máximo. Un río del que no se puede beber es el hueco de
  // contenido que estaba detrás de esa cifra. Sin hora punta: al río se va
  // cuando se tiene sed, no a una hora.
  const drinkSpec = OFFERS.drink;
  const water = drinkSpec === undefined ? null : placedOffer(drinkSpec, at, land);
  const offers = water === null ? [offer] : [offer, water];
  return { id: 'ford:crossing', at: offer.at, offers };
}

/**
 * El claro del bosque: prado rodeado de bosque.
 *
 * Un lugar de sosiego lejos del pueblo, donde la aldea va a trabajar o
 * descansar. Ofrece lo que ofrece la era (trabajo).
 */
function detectGlade(state: GameState, land: Terrain, shore: Uint8Array): Place | null {
  const { width, height } = state.map;
  const visited = new Uint8Array(width * height);
  // **El mejor, no el primero.** La versión original devolvía en cuanto
  // encontraba una región que pasara los dos umbrales, en el orden en que el
  // barrido del mapa se la topara — que depende de dónde el generador de
  // terreno puso el bosque, no de dónde vive la gente. Así se podía devolver
  // un claro perfectamente válido y a la vez inalcanzable, con otro más cerca
  // sin llegar a mirarse siquiera. Ahora se compara como en `detectSquare`.
  let best: { center: Point; size: number } | null = null;

  for (let z = 2; z < height - 2; z += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const cell = z * width + x;
      if (visited[cell] === 1) continue;
      if (land.blocked[cell] === 1) continue;

      const terrainKind = state.map.terrain[cell];
      if (terrainKind !== CODES.meadow && terrainKind !== CODES.cleared) continue;

      // Inundación para medir la región de prado.
      const queue = [cell];
      visited[cell] = 1;
      let size = 0;
      for (let head = 0; head < queue.length; head += 1) {
        const cur = queue[head] as number;
        size += 1;
        const cx = cur % width;
        const cz = Math.floor(cur / width);
        for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
          const next = nz * width + nx;
          if (visited[next] === 1 || land.blocked[next] === 1) continue;
          const nextTerrain = state.map.terrain[next];
          if (nextTerrain !== CODES.meadow && nextTerrain !== CODES.cleared) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      // TUNE: 30 celdas. Un claro debe ser claro, no un campo casual.
      if (size < 30) continue;

      // Verifica que esté rodeado de bosque: cuenta el bosque adyacente.
      const perimeter = new Set<number>();
      for (const cell of queue) {
        const cx = cell % width;
        const cz = Math.floor(cell / width);
        for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
          const next = nz * width + nx;
          if (state.map.terrain[next] === CODES.forest) {
            perimeter.add(next);
          }
        }
      }

      // TUNE: al menos 12 celdas de bosque adyacente.
      if (perimeter.size < 12) continue;

      // Centro de la región: selecciona una celda que sea de verdad libre.
      let sumX = 0;
      let sumZ = 0;
      for (const cell of queue) {
        sumX += cell % width;
        sumZ += Math.floor(cell / width);
      }
      const centerX = sumX / size;
      const centerZ = sumZ / size;

      // Busca la celda más cercana al centro que esté en la región.
      let closest: Point | null = null;
      let closestDist = Number.POSITIVE_INFINITY;
      for (const cell of queue) {
        const cx = (cell % width) + 0.5;
        const cz = Math.floor(cell / width) + 0.5;
        const dist = (cx - centerX) ** 2 + (cz - centerZ) ** 2;
        if (dist < closestDist) {
          closestDist = dist;
          closest = { x: cx, z: cz };
        }
      }

      if (closest === null) continue;
      if (!canReach(land, shore, closest)) continue;

      if (best === null || size > best.size) best = { center: closest, size };
    }
  }

  if (best === null) return null;

  const workSpec = OFFERS.work;
  if (workSpec === undefined) return null;

  // El claro ofrece trabajo, con hora punta al mediodía.
  const offer = placedOffer(workSpec, best.center, land, [0.3, 0.7]);
  if (offer === null) return null;
  return { id: 'glade:meadow', at: offer.at, offers: [offer] };
}

/**
 * Los sitios comunes del valle: plaza, vado, claro.
 *
 * Se rehace cuando cambia el pueblo, una vez por jornada escénica.
 */
export function commons(state: GameState, land: Terrain): Place[] {
  const places: Place[] = [];
  const shore = shoreOf(state, land);

  const square = detectSquare(state, land, shore);
  if (square !== null) places.push(square);

  const ford = detectFord(state, land, shore);
  if (ford !== null) places.push(ford);

  const glade = detectGlade(state, land, shore);
  if (glade !== null) places.push(glade);

  return places;
}
