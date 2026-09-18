import { BUILDINGS, BUILDING_RULES } from '../balance';
import { HEART } from './tiles';
import { inPlaza, plazaCentre } from './plaza';
import { TERRAIN_CODE } from '../state';
import type { Building, BuildingKind, GameState } from '../state';

interface Rect { x: number; y: number; w: number; h: number }
interface Point { x: number; y: number }
const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Existing works reserve their entire future footprint, including church growth. */
/**
 * Whether anything at all may stand on a terrain. §7.4.
 *
 * Los dos sitios que lo comprueban tenían la lista escrita a mano, y eso es lo
 * que hace que añadir un terreno sea un fallo esperando: con la montaña y el
 * lago del mapa grande (`docs/next-plan.md`) serían cuatro códigos repetidos en
 * dos condiciones. Aquí, una vez.
 */
function buildable(tile: number | undefined): boolean {
  return tile !== TERRAIN_CODE.water && tile !== TERRAIN_CODE.marsh
    && tile !== TERRAIN_CODE.mountain && tile !== TERRAIN_CODE.lake
    // El vado se anda, no se edifica: una casa sobre el paso cierra el paso.
    && tile !== TERRAIN_CODE.ford;
}

export function canPlace(state: GameState, kind: BuildingKind, x: number, y: number, upgradeOf: number | null = null): boolean {
  const { w, h } = BUILDINGS[kind];
  const rect = { x, y, w, h };
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x + w > state.map.width || y + h > state.map.height) return false;
  for (let row = y; row < y + h; row += 1) for (let col = x; col < x + w; col += 1) {
    const tile = state.map.terrain[row * state.map.width + col];
    if (!buildable(tile)) return false;
    if (kind === 'field' && tile !== TERRAIN_CODE.meadow && tile !== TERRAIN_CODE.cleared) return false;
  }
  if (state.buildings.some((b) => b.id !== upgradeOf && standsInTheWay(b, state.tick) && overlaps(rect, b))) return false;
  // P-1 · **la plaza es suelo de nadie.** Ni casa, ni campo, ni empalizada: es
  // lo único que la convierte en un sitio y no en una anotación (§7.4b). La
  // mejora de una casa a casa de piedra está exenta —`upgradeOf`—: una casa que
  // ya estaba ahí antes de que existiera la regla no se demuele por decreto, y
  // en una partida migrada eso pasa.
  if (upgradeOf === null && inPlaza(state, x, y, w, h)) return false;
  return !state.works.some((work) => overlaps(rect, work));
}

/**
 * Whether a building's plot is unavailable. §7.4: what stands, plus stone ruin,
 * plus — since v2.25 — burnt ground inside the years its `blockedUntil` names.
 */
function standsInTheWay(b: Building, tick: number): boolean {
  if (b.lostTick === null || b.tier === 1) return true;
  return b.blockedUntil !== null && b.blockedUntil > tick;
}

function distance(a: Point, b: Point): number { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }
function center(rect: Rect): Point { return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }; }



// ---------------------------------------------------------------------------
// §7.4c · La muralla por anillos (P-4, 18 sep 2026)
//
// **Lo pidió el dueño del diseño mirando una captura**, y con el diseño hecho:
// «¿podemos también evitar esos cachos sueltos? Sé que es complicado porque la
// aldea tiene que ir creciendo, pero la muralla también tendrá que quedarse por
// secciones. Es decir, si la aldea crece a un cierto punto, se construye la
// muralla alrededor y después la siguiente sección de construcción va fuera de
// la muralla».
//
// **Qué había y por qué salían cachos.** La empalizada se levantaba pieza a
// pieza sobre la **envolvente convexa del núcleo dilatada dos celdas**
// (`onEnvelope`), y esa envolvente **crece con la aldea**: cada pieza se ponía
// sobre la envolvente del día en que le tocó, así que las piezas de años
// distintos caían en líneas distintas. Medido en cuatro semillas al año 60:
// **de 7 a 19 tramos desconectados por valle**, ninguno cerrando nada.
//
// Lo que hay ahora es un **anillo**: un círculo alrededor de la plaza —que desde
// P-1 es el centro del pueblo y no se mueve— con un radio que **se deriva de la
// muralla que ya hay**, así que la primera pieza fija el anillo y las
// siguientes lo continúan. Cuando no cabe ni una pieza más en él, se empieza
// otro más afuera; y como la aldea también crece hacia fuera, el anillo
// siguiente la envuelve.
//
// No hace falta estado nuevo para esto —el anillo **está escrito en la propia
// muralla**— y eso es deliberado: un radio guardado sería un número más que
// migrar, y esto se puede leer del valle.
// ---------------------------------------------------------------------------


/**
 * Si esa celda está en la banda del anillo.
 *
 * **Medio paso no basta, y esto costó tres medidas.** Un círculo dibujado con
 * celdas enteras no pasa por el centro de las celdas: al ir de una a la de al
 * lado en diagonal, el centro se separa del radio hasta 0,7. Con la banda en
 * 0,5 se rechazaban celdas que están en el anillo, el anillo parecía lleno
 * cuando no lo estaba, y la muralla salía a buscarse otro radio cada pocas
 * piezas: **de 25 a 47 tramos por valle al año 60**, con doce y dieciséis
 * piezas huérfanas. Con 0,75 la banda contiene un círculo de celdas conectado
 * en ocho direcciones, que es lo que una muralla necesita para ser una muralla.
 */
function onRing(point: Point, centre: Point, radius: number): boolean {
  return Math.abs(Math.sqrt(distance(point, centre)) - radius) <= RING_BAND;
}

/** Lo ancho que es el anillo, en celdas. Ver `onRing`. */
const RING_BAND = 0.75;

/** Si un solar entero pisa la banda del anillo, celda a celda. */
function onRingRect(rect: Rect, centre: Point, radius: number): boolean {
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (onRing({ x: x + 0.5, y: y + 0.5 }, centre, radius)) return true;
    }
  }
  return false;
}

/**
 * El radio del anillo que toca levantar, o nada si ya no hay muralla que hacer.
 *
 * **Una aldea tiene una muralla, y una sola.** Es lo que el dueño del diseño
 * pidió, con sus palabras: «si la aldea crece a un cierto punto, se construye la
 * muralla alrededor y **después la siguiente sección de construcción va fuera de
 * la muralla**». Lo nuevo va fuera; no dijo que se levantara otra muralla
 * alrededor de lo nuevo, y medido se ve por qué no conviene: cuando la aldea ya
 * no quiere más casas —§7.3 sólo pide casa si falta sitio para dormir— la
 * empalizada es lo único que queda en la lista de obras, así que el valle se
 * pasaba el siglo poniendo anillo tras anillo. **1 824 tramos de muralla contra
 * 131 casas en doce semillas a 120 años**, y la semilla 51 con anillos en 8, 11,
 * 14 y 17 y 336 tramos para catorce casas. Eso no es una aldea amurallada.
 *
 * Con un anillo por valle, cuando se cierra no hay más muralla que pedir y la
 * obra pasa a lo siguiente de §7.3 —las mejoras a piedra—, que es exactamente
 * lo que esa lista dice hacer cuando ya está todo levantado.
 */
function ringToBuild(state: GameState, centre: Point, coreRadius: number,
  ground: { occupied: Uint8Array; reserved: Uint8Array }): number | null {
  // El que ya se decidió, y si no hay ninguno, uno alrededor de lo construido.
  const base = state.ring ?? Math.round(coreRadius + BUILDING_RULES.PALISADE_DILATION);
  // Si el anillo elegido no tiene sitio, se busca uno más afuera **sólo
  // mientras la aldea no tenga muralla**: el primer anillo tiene que caber en
  // alguna parte, y para eso se prueba de tres en tres celdas (así dos anillos
  // nunca se pegan y entre ellos cabe una calle).
  if (state.ring !== null) return ringHasRoom(state, centre, base, ground) ? base : null;
  for (let radius = base; radius <= base + RING_SEARCH; radius += RING_STEP) {
    if (ringHasRoom(state, centre, radius, ground)) return radius;
  }
  return null;
}

/** Si en ese anillo queda alguna celda donde se pueda plantar una pieza. */
function ringHasRoom(state: GameState, centre: Point, radius: number,
  ground: { occupied: Uint8Array; reserved: Uint8Array }): boolean {
  // Se recorre el círculo por ángulos y no el mapa entero: un anillo de radio
  // veinte son ciento treinta celdas, y el mapa cuatro mil.
  const steps = Math.max(16, Math.round(radius * 8));
  for (let n = 0; n < steps; n += 1) {
    const angle = (n / steps) * Math.PI * 2;
    // La celda cuyo centro cae sobre el círculo, no la que contiene el punto:
    // así lo que se comprueba aquí es exactamente lo que `onRing` acepta abajo.
    const x = Math.round(centre.x + Math.cos(angle) * radius - 0.5);
    const y = Math.round(centre.y + Math.sin(angle) * radius - 0.5);
    if (x < HEART.x0 || y < HEART.y0 || x >= HEART.x1 || y >= HEART.y1) continue;
    if (!onRing({ x: x + 0.5, y: y + 0.5 }, centre, radius)) continue;
    if (!fitsEmptyGround(state, 'palisade', x, y, ground)) continue;
    return true;
  }
  return false;
}

/** Cuántas celdas más afuera se prueban antes de renunciar a la muralla. */
const RING_SEARCH = 15;
/** Lo que se separa un anillo del siguiente, en celdas. */
const RING_STEP = 3;

/** Si esa celda tiene una pieza de muralla pegada, en cruz. */
function touchesWall(state: GameState, x: number, y: number): boolean {
  return state.buildings.some((b) => b.lostTick === null
    && (b.kind === 'wall' || b.kind === 'palisade')
    && Math.abs(b.x - x) + Math.abs(b.y - y) === 1);
}

/**
 * The kinds that have an inside, and therefore a door and a wall.
 *
 * §7.2's table says how big each building is; what it does not say is which of
 * them you can walk across. A field, a palisade, a graveyard and a well are
 * ground: people walk over them. A house is not.
 */
const WALLED = new Set<BuildingKind>([
  'house', 'stone_house', 'granary', 'chapel', 'church', 'smithy', 'mill', 'watchtower',
]);

/**
 * Which cells a new building may not use.
 *
 * `occupied` is what stands there. `reserved` is that plus a street: the ring
 * of cells around anything with walls, which only another walled building is
 * kept out of.
 *
 * Without the street the village grew as one solid block — six houses in a row
 * with no gap between them in a measured game — and that is not a stylistic
 * complaint: the door of the middle house opened onto the neighbour's wall, and
 * no villager could reach their own home without walking through somebody
 * else's. The 3D valley showed it plainly; the flat one had been hiding it
 * since M-14.
 */
function occupiedCells(state: GameState): { occupied: Uint8Array; reserved: Uint8Array } {
  const occupied = new Uint8Array(state.map.terrain.length);
  const reserved = new Uint8Array(state.map.terrain.length);
  const mark = (into: Uint8Array, rect: Rect, grow: number): void => {
    for (let y = rect.y - grow; y < rect.y + rect.h + grow; y += 1) {
      for (let x = rect.x - grow; x < rect.x + rect.w + grow; x += 1) {
        if (x < 0 || y < 0 || x >= state.map.width || y >= state.map.height) continue;
        into[y * state.map.width + x] = 1;
      }
    }
  };
  for (const building of state.buildings) {
    if (!standsInTheWay(building, state.tick)) continue;
    mark(occupied, building, 0);
    if (WALLED.has(building.kind)) mark(reserved, building, BUILDING_RULES.STREET_GAP);
  }
  for (const work of state.works) {
    mark(occupied, work, 0);
    if (WALLED.has(work.kind)) mark(reserved, work, BUILDING_RULES.STREET_GAP);
  }
  return { occupied, reserved };
}

function fitsEmptyGround(
  state: GameState,
  kind: BuildingKind,
  x: number,
  y: number,
  ground: { occupied: Uint8Array; reserved: Uint8Array },
): boolean {
  const { w, h } = BUILDINGS[kind];
  // Only a building with walls has to keep its distance. A field may lie
  // against a house; you walk over a field.
  const keepsAway = WALLED.has(kind);
  // P-1 · lo mismo que en `canPlace`, y aquí es donde de verdad muerde: este es
  // el filtro con el que `placeBuilding` recorre el corazón buscando solar.
  if (inPlaza(state, x, y, w, h)) return false;
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const cell = row * state.map.width + col;
      const tile = state.map.terrain[cell];
      if (ground.occupied[cell] !== 0 || !buildable(tile)) return false;
      if (keepsAway && ground.reserved[cell] !== 0) return false;
      if (kind === 'field' && tile !== TERRAIN_CODE.meadow && tile !== TERRAIN_CODE.cleared) return false;
    }
  }
  return true;
}

function lowerScore(candidate: number[], incumbent: number[]): boolean {
  for (let i = 0; i < candidate.length; i += 1) {
    if (candidate[i]! < incumbent[i]!) return true;
    if (candidate[i]! > incumbent[i]!) return false;
  }
  return false;
}

/**
 * §7.4 has no weights or elevation layer. Rank the stated preferences in their
 * written order, lexicographically; rock is the high-ground proxy, meadow by
 * water the prime-land proxy. Exact ties go to the lower row-major cell index.
 */
export function placeBuilding(state: GameState, kind: BuildingKind): Point | null {
  const live = state.buildings.filter((b) => b.lostTick === null);
  const houses = live.filter((b) => b.kind === 'house' || b.kind === 'stone_house');
  const fields = live.filter((b) => b.kind === 'field');
  const occupied = occupiedCells(state);
  const fieldCells = new Uint8Array(state.map.terrain.length);
  for (const field of fields) {
    for (let y = field.y; y < field.y + field.h; y += 1) {
      for (let x = field.x; x < field.x + field.w; x += 1) fieldCells[y * state.map.width + x] = 1;
    }
  }
  // **El pueblo crece alrededor de la plaza**, y eso es P-1 llevado hasta el
  // final: lo pidió el dueño del diseño con estas palabras —«las cosas se
  // deberían mover para que esa plaza parezca una plaza de verdad»— y sin esto
  // no pasaba. §7.4 mide todo contra un centro, y ese centro era **la media de
  // las casas**: la aldea crecía alrededor de sí misma y se alejaba de su
  // plaza. Medido en la semilla 41 al año 60: la plaza acababa en el borde del
  // caserío, con las casas apiñadas al otro lado.
  //
  // Con la plaza como centro, el borde del núcleo se mide desde ella y las
  // casas se reparten a su alrededor, que es la forma que tiene un pueblo con
  // plaza. La reserva del círculo (`inPlaza`) impide que alguien la ocupe, así
  // que lo que queda es exactamente un anillo.
  const plaza = plazaCentre(state.plaza);
  const inside = plaza.x >= 0 && plaza.y >= 0
    && plaza.x < state.map.width && plaza.y < state.map.height;
  const centre = inside ? plaza
    : houses.length === 0 ? { x: state.map.width / 2, y: state.map.height / 2 }
      : { x: houses.reduce((n, b) => n + center(b).x, 0) / houses.length, y: houses.reduce((n, b) => n + center(b).y, 0) / houses.length };
  // How far a point sits from the edge of the built core, in cells. Zero is on
  // the rim; `set` pushes it that many cells beyond. This is the one shape §7.4
  // asks for twice — "en el borde del núcleo" and "algo apartada" — and it is a
  // distance, not a weight, so nothing has to be tuned against anything else.
  const coreRadius = Math.sqrt(Math.max(...houses.map((h) => distance(center(h), centre)), 0));
  const rimOffset = (p: Point, set: number): number =>
    Math.abs(Math.sqrt(distance(p, centre)) - (coreRadius + set));
  let best: Point | null = null;
  let bestScore: number[] | null = null;
  const spec = BUILDINGS[kind];
  // §7.4c · el anillo que toca, sólo cuando se va a levantar muralla: es un
  // barrido de círculos y no hay que pagarlo por cada casa.
  const ring = kind === 'palisade' ? ringToBuild(state, centre, coreRadius, occupied) : null;
  // **Y se escribe.** Es la única cosa que esta función cambia del estado, y es
  // a propósito: un anillo es una decisión de la aldea —«hasta aquí llega el
  // pueblo»— y una decisión se apunta. Si se volviera a calcular cada vez,
  // volvería a moverse medio paso por pieza, que es lo que llenaba el valle de
  // tramos sueltos (ver `GameState.ring`).
  if (ring !== null && ring !== state.ring) state.ring = ring;
  // **Y la línea de la muralla empezada es de la muralla.** Sin esto, la aldea
  // levantaba casas encima del anillo en curso, el anillo se quedaba sin sitio
  // y el siguiente arrancaba más afuera dejando la pieza vieja suelta: medido
  // en la semilla 11 al año 40, once tramos de los que cuatro eran de una sola
  // pieza. Reservarla es además lo que el dueño del diseño pidió con sus
  // palabras —«después la siguiente sección de construcción va fuera de la
  // muralla»—: cuando dentro ya no cabe nada, lo nuevo sale fuera solo.
  const wallLine = kind === 'palisade' || kind === 'wall' ? null : state.ring;
  // **Sólo el corazón del valle**, y por dos razones que apuntan al mismo sitio.
  //
  // La de diseño: fuera del corazón no hay terreno productivo —es montaña, lago
  // y falda (§7)— y los topes de §12 son absolutos, así que una aldea de
  // dieciséis casas y ocho campos no tiene por qué desparramarse por la sierra.
  // «El valle es el centro del mapa» incluye que la aldea se quede en el centro.
  //
  // Y la de coste, medida: este bucle recorría el mapa entero por cada solar, y
  // `nextProject` lo llama hasta ocho veces por tick. Con el mapa grande eso son
  // cuatro veces más celdas por nada: la suite rápida pasó de 18,4 a 28,5
  // segundos —su presupuesto son 20— y la de balance de 18 minutos a más de
  // cincuenta. Acotar al corazón devuelve el coste que tenía.
  for (let y = HEART.y0; y <= Math.min(HEART.y1, state.map.height) - spec.h; y += 1) {
    for (let x = HEART.x0; x <= Math.min(HEART.x1, state.map.width) - spec.w; x += 1) {
    if (!fitsEmptyGround(state, kind, x, y, occupied)) continue;
    const rect = { x, y, w: spec.w, h: spec.h };
    const p = center(rect);
    // §7.4c · la muralla va en el anillo, no en la envolvente del día.
    if (kind === 'palisade' && (ring === null || !onRing(p, centre, ring))) continue;
    if (wallLine !== null && onRingRect(rect, centre, wallLine)) continue;
    let river = false;
    let touchesForest = false;
    let path = false;
    let touchesField = false;
    for (let row = y - 1; row <= y + spec.h; row += 1) for (let col = x - 1; col <= x + spec.w; col += 1) {
      if (row < 0 || col < 0 || row >= state.map.height || col >= state.map.width) continue;
      if ((row === y - 1 || row === y + spec.h) && col >= x && col < x + spec.w ||
        (col === x - 1 || col === x + spec.w) && row >= y && row < y + spec.h) {
        const cell = row * state.map.width + col;
        // El vado cuenta como río: una casa junto al paso está junto al agua,
        // y además junto a por dónde se cruza, que es mejor sitio todavía.
        river ||= state.map.terrain[cell] === TERRAIN_CODE.water
          || state.map.terrain[cell] === TERRAIN_CODE.ford;
        touchesForest ||= state.map.terrain[cell] === TERRAIN_CODE.forest;
        path ||= (state.map.path[cell] ?? 0) > 0;
        touchesField ||= fieldCells[cell] !== 0;
      }
    }
    const houseDistance = houses.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...houses.map((h) => distance(p, center(h))));
    const fieldDistance = fields.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...fields.map((f) => distance(p, center(f))));
    const rock = state.map.terrain[y * state.map.width + x] === TERRAIN_CODE.rock;
    let score: number[];
    switch (kind) {
      case 'house': case 'stone_house': score = [distance(p, centre), Number(!path), Number(river)]; break;
      // "Lejos del bosque" es *no pegado* al bosque, no lo más lejos posible.
      // Maximizar esa distancia manda los campos al borde del mapa y deja la
      // aldea desperdigada por el valle, que es justo lo contrario de §7.4.
      case 'field': score = [Number(!touchesField && !river), Number(touchesForest), distance(p, centre)]; break;
      case 'granary':
        if (houseDistance >= BUILDING_RULES.GRANARY_HOUSE_DISTANCE ** 2) continue;
        score = [Number(!touchesField), fieldDistance, houseDistance]; break;
      // "Algo apartada" es al otro lado del borde del núcleo, no en la esquina
      // opuesta del mapa: maximizar la distancia a las casas deja la capilla
      // contra el borde, donde una iglesia de 3×3 ya no cabe.
      // Set-back first, rounded to whole cells, and "alta y visible" as the
      // tie-break within that ring. The other way round, a rock outcrop
      // fifteen cells away outranks every sensible spot and the chapel ends up
      // in a corner of the map — where a 3×3 church can no longer replace it.
      case 'chapel': case 'church': score = [Math.round(rimOffset(p, BUILDING_RULES.CHAPEL_SET_BACK)), Number(!rock), distance(p, centre)]; break;
      case 'smithy': score = [rimOffset(p, 0), -houseDistance]; break;
      // §7.4c · **la muralla crece pegada a la muralla.** Primero, que la pieza
      // toque una que ya esté puesta: eso es lo que convierte piezas sueltas en
      // secciones. Después, el ángulo alrededor del centro, que es lo que hace
      // que el tramo avance siempre por el mismo lado en vez de saltar de un
      // extremo al otro; y por último lo pisado, para que el portón caiga donde
      // ya se pasa.
      case 'palisade': score = [
        Number(!touchesWall(state, x, y)),
        Math.round((Math.atan2(p.y - centre.y, p.x - centre.x) + Math.PI) * 100),
        Number(!path),
      ]; break;
      default: score = [distance(p, centre)];
    }
    if (bestScore === null || lowerScore(score, bestScore)) {
      best = { x, y }; bestScore = score;
    }
    }
  }
  return best;
}
