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
 * A2c · **El anillo es un círculo rasterizado de una celda de grosor.**
 *
 * Antes era una *banda*: `|distancia - radio| <= 0,75`. Y la banda tenia que
 * ser de ese ancho -con 0,5 se rechazaban celdas que estan en el circulo y la
 * muralla se buscaba otro radio cada pocas piezas: **de 25 a 47 tramos por
 * valle al ano 60**-, pero 0,75 es celda y media, asi que **en muchos angulos
 * entran dos celdas** y la muralla salia de dos capas de grosor. De ahi salia
 * todo lo demas: un porton es una celda, perforaba una capa y la otra seguia
 * sellando el pueblo. Medido en la semilla 41, las quince casas encerradas en
 * una bolsa de 220 celdas de 8 064 con los dos lados de la puerta dando al
 * campo.
 *
 * Lo que hay ahora es el circulo **dibujado**, no una distancia: se recorre por
 * angulos y se queda la celda que contiene cada punto. Dos puntos seguidos caen
 * en la misma celda o en una pegada, asi que el resultado esta conectado en
 * ocho direcciones -lo que una muralla necesita para ser una muralla- y **no
 * hay dos celdas del anillo en la misma perpendicular**, que es lo que hace que
 * una sola puerta lo atraviese de verdad.
 *
 * Se guarda porque se pregunta miles de veces por tick y solo hay un punado de
 * anillos distintos por partida. Es memoria de una funcion pura: mismo centro y
 * mismo radio, mismas celdas, y nada de esto toca el azar del motor.
 */
function ringCells(centre: Point, radius: number): Set<number> {
  const key = `${centre.x}|${centre.y}|${radius}`;
  const had = RING_CACHE.get(key);
  if (had !== undefined) return had;
  const cells = new Set<number>();
  // Un paso de angulo por cada media celda de arco: sobra para que dos puntos
  // seguidos nunca se salten una celda.
  const steps = Math.max(64, Math.ceil(radius * 16));
  for (let n = 0; n < steps; n += 1) {
    const angle = (n / steps) * Math.PI * 2;
    const col = Math.floor(centre.x + Math.cos(angle) * radius);
    const row = Math.floor(centre.y + Math.sin(angle) * radius);
    if (col < 0 || row < 0 || col >= RING_STRIDE) continue;
    cells.add(row * RING_STRIDE + col);
  }
  if (RING_CACHE.size >= RING_CACHE_MAX) RING_CACHE.clear();
  RING_CACHE.set(key, cells);
  return cells;
}

/** Los anillos ya dibujados. Memoria de una funcion pura; ver `ringCells`. */
const RING_CACHE = new Map<string, Set<number>>();
/** Cuantos anillos se recuerdan antes de tirarlos todos. */
const RING_CACHE_MAX = 64;
/** El ancho con el que se numera una celda del anillo. Mayor que cualquier mapa. */
const RING_STRIDE = 1024;

/** Si esa celda es una de las del anillo. */
function onRing(point: Point, centre: Point, radius: number): boolean {
  const col = Math.floor(point.x);
  const row = Math.floor(point.y);
  if (col < 0 || row < 0 || col >= RING_STRIDE) return false;
  return ringCells(centre, radius).has(row * RING_STRIDE + col);
}

/** Si un solar entero pisa el anillo, celda a celda. */
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
  // **Que eso sea el tamaño bueno depende de cuándo se pregunte**, y de eso se
  // encarga §7.3: la muralla no se pide hasta que hay once casas
  // (`PALISADE_HOUSES`), que es cuando el pueblo tiene ya el 91 % de la
  // extensión que va a tener. El anillo se fija una vez y no se mueve.
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

/**
 * A1 · **Si el anillo de muralla está cerrado**: hay anillo y ya no cabe ni una
 * pieza más en él.
 *
 * Vive aquí y no en `derive/` porque la respuesta sale de las mismas rejillas
 * de ocupación que usa `placeBuilding` —lo construido, lo reservado, la línea
 * de la propia muralla— y duplicarlas fuera sería tener dos ideas distintas de
 * dónde cabe una pieza. Es pura: no escribe nada, ni siquiera el anillo.
 *
 * **Cerrado no quiere decir un círculo perfecto.** Quiere decir que la aldea
 * ya no tiene dónde seguir amurallando ese anillo: el agua, la roca y el borde
 * del mapa cierran el resto. Es exactamente la condición con la que §7.4c deja
 * de pedir muralla y la obra pasa a lo siguiente (`nextProject`), así que lo
 * que esto responde es «la aldea ha terminado su muralla», que es la fase 3 de
 * la meta (§1b).
 */
export function ringClosed(state: GameState): boolean {
  const ring = state.ring;
  if (ring === null) return false;
  const plaza = plazaCentre(state.plaza);
  const inside = plaza.x >= 0 && plaza.y >= 0
    && plaza.x < state.map.width && plaza.y < state.map.height;
  if (!inside) return false;
  return !ringHasRoom(state, plaza, ring, occupiedCells(state));
}




/**
 * A2b · Las celdas a las que se llega andando **desde donde vive la gente**.
 *
 * Una inundación en cruz sobre el suelo libre, sembrada en la puerta de una
 * casa. Sirve para una sola pregunta, y es la que convierte un hueco en una
 * puerta: **¿esta celda separa el pueblo del campo?** Sin ella, un portón puede
 * acabar en un trozo de muralla que no encierra nada —medido en la semilla 41:
 * sus dos lados daban a la misma bolsa de 1 457 celdas mientras las quince
 * casas se quedaban en otra de 220, sin salida—.
 *
 * Se calcula **una vez** antes de recorrer los solares, no por candidato: es un
 * barrido del corazón del valle y sólo se paga cuando se va a plantar una
 * puerta, que pasa una o dos veces por partida.
 */
function villageSide(state: GameState, ground: { occupied: Uint8Array }): Uint8Array | null {
  const seen = new Uint8Array(state.map.terrain.length);
  const house = state.buildings.find(
    (b) => (b.kind === 'house' || b.kind === 'stone_house') && b.lostTick === null,
  );
  if (house === undefined) return null;
  const free = (col: number, row: number): boolean => {
    if (col < 0 || row < 0 || col >= state.map.width || row >= state.map.height) return false;
    const cell = row * state.map.width + col;
    return ground.occupied[cell] === 0 && buildable(state.map.terrain[cell]);
  };
  const start: Point[] = [];
  for (let row = house.y - 1; row <= house.y + house.h; row += 1) {
    for (let col = house.x - 1; col <= house.x + house.w; col += 1) {
      if (free(col, row)) start.push({ x: col, y: row });
    }
  }
  const queue = [...start];
  for (const at of start) seen[at.y * state.map.width + at.x] = 1;
  while (queue.length > 0) {
    const at = queue.pop();
    if (at === undefined) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const col = at.x + dx;
      const row = at.y + dy;
      if (!free(col, row) || seen[row * state.map.width + col] === 1) continue;
      seen[row * state.map.width + col] = 1;
      queue.push({ x: col, y: row });
    }
  }
  return seen;
}

/**
 * A2b · Si por esa celda se puede cruzar la muralla: hay suelo libre a los dos
 * lados en alguno de los dos ejes.
 *
 * Es la misma pregunta que `derive/defence-gates.ts` se hace para saber por
 * dónde se pasa, hecha **antes** de plantar la puerta en vez de después.
 */
function crossable(
  state: GameState, x: number, y: number,
  ground: { occupied: Uint8Array; reserved: Uint8Array },
  village: Uint8Array | null,
  ring: number,
): boolean {
  const centre = plazaCentre(state.plaza);
  const open = (col: number, row: number): boolean => {
    if (col < 0 || row < 0 || col >= state.map.width || row >= state.map.height) return false;
    const cell = row * state.map.width + col;
    return ground.occupied[cell] === 0 && buildable(state.map.terrain[cell]);
  };
  const far = (col: number, row: number): number =>
    Math.hypot(col + 0.5 - centre.x, row + 0.5 - centre.y);
  const atHome = (col: number, row: number): boolean =>
    village === null || village[row * state.map.width + col] === 1;

  for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
    const a = { x: x - dx, y: y - dy };
    const b = { x: x + dx, y: y + dy };
    if (!open(a.x, a.y) || !open(b.x, b.y)) continue;
    // Uno de los dos lados tiene que caer dentro del anillo y el otro fuera:
    // eso es cruzar la muralla y no correr paralelo a ella.
    const inA = far(a.x, a.y) < ring;
    const inB = far(b.x, b.y) < ring;
    if (inA === inB) continue;
    // **Y el lado de dentro tiene que dar a las casas.** Es lo que hace que una
    // puerta sea funcional —la regla del dueño del diseño: «las dos puertas
    // tienen que ser funcionales»— y lo que faltaba: en la semilla 41 el portón
    // tenía sus dos lados libres y cruzaba el anillo, pero por dentro daba al
    // hueco **entre las dos capas** de una muralla que en algunos tramos es
    // gruesa, así que las quince casas quedaban en una bolsa de 220 celdas sin
    // salida mientras la puerta comunicaba campo con campo.
    const inner = inA ? a : b;
    if (atHome(inner.x, inner.y)) return true;
  }
  return false;
}

/**
 * A2b · **El paso de un portón**, reservado igual que la plaza (`inPlaza`).
 *
 * Un disco alrededor de cada puerta en pie. Lo que garantiza es lo único que
 * una puerta tiene que garantizar: que se pueda entrar y salir por ella — que
 * es justo lo que dos valles medidos no podían (ver `BUILDING_RULES.GATE_CLEAR`).
 */
export function inGateway(state: GameState, x: number, y: number, w = 1, h = 1): boolean {
  const centre = plazaCentre(state.plaza);
  for (const gate of state.buildings) {
    if (gate.kind !== 'gate' || gate.lostTick !== null) continue;
    const at = { x: gate.x + 0.5, y: gate.y + 0.5 };
    // El eje del paso: hacia fuera desde la plaza, que es por donde se cruza un
    // anillo. La muralla corre perpendicular a él.
    const ray = { x: at.x - centre.x, y: at.y - centre.y };
    const span = Math.hypot(ray.x, ray.y) || 1;
    const unit = { x: ray.x / span, y: ray.y / span };
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) {
        const dx = col + 0.5 - at.x;
        const dy = row + 0.5 - at.y;
        if (Math.hypot(dx, dy) > BUILDING_RULES.GATE_CLEAR) continue;
        // **Y el túnel es lo que de verdad se reserva.** Un disco entero
        // tendría que dejar pasar la muralla —su línea cruza la puerta— y
        // entonces no reserva nada: medido en la semilla 41, el anillo es de
        // **dos capas** en algunos tramos y la puerta perforaba sólo una, así
        // que las quince casas quedaban en una bolsa de 220 celdas sin salida
        // mientras los dos lados de la puerta daban al campo. Lo que se guarda
        // libre es la franja **a lo largo del paso**, ancha de una celda a cada
        // lado; la muralla puede cruzarla por su propia línea, que es
        // perpendicular, y de hecho lo hace: la puerta es esa cruz.
        const along = dx * unit.x + dy * unit.y;
        const aside = Math.abs(dx * unit.y - dy * unit.x);
        if (aside <= GATE_TUNNEL_HALF && Math.abs(along) > 0.5) return true;
      }
    }
  }
  return false;
}

/** Medio ancho del túnel del portón, en celdas. Una a cada lado del paso. */
const GATE_TUNNEL_HALF = 1;

/** Si en ese anillo queda alguna celda donde se pueda plantar una pieza. */
function ringHasRoom(state: GameState, centre: Point, radius: number,
  ground: { occupied: Uint8Array; reserved: Uint8Array }): boolean {
  // Se recorren las celdas del anillo y no el mapa entero: un anillo de radio
  // veinte son ciento treinta celdas, y el mapa cuatro mil.
  for (const cell of ringCells(centre, radius)) {
    const x = cell % RING_STRIDE;
    const y = (cell - x) / RING_STRIDE;
    if (x < HEART.x0 || y < HEART.y0 || x >= HEART.x1 || y >= HEART.y1) continue;
    if (!fitsEmptyGround(state, 'palisade', x, y, ground)) continue;
    return true;
  }
  return false;
}

/** Cuántas celdas más afuera se prueban antes de renunciar a la muralla. */
const RING_SEARCH = 15;
/** Lo que se separa un anillo del siguiente, en celdas. */
const RING_STEP = 3;

/**
 * A2c · **La pieza de muralla que hay en esa celda**, si la hay y sigue en pie.
 *
 * Existe para una sola cosa: **la segunda puerta se abre en la muralla ya
 * hecha, no en un hueco del anillo.** Hasta aquí una puerta necesitaba una
 * celda vacía del círculo, y eso sólo se cumple mientras el cerco está a
 * medias: medido en cuatro semillas con la aldea levantando una sola puerta,
 * **la segunda no cabía en ningún año de los cuarenta** salvo en la semilla 11,
 * porque al cerrarse el anillo no queda ni una celda libre en él. Una aldea que
 * quiere otra salida no espera a que le sobre muralla: tira un tramo y cuelga
 * ahí la puerta.
 */
export function wallAt(state: GameState, x: number, y: number): Building | null {
  return state.buildings.find((b) => b.lostTick === null && b.x === x && b.y === y
    && (b.kind === 'palisade' || b.kind === 'wall')) ?? null;
}

/**
 * Si esa celda tiene una pieza de muralla pegada.
 *
 * **En ocho direcciones desde A2c**: el anillo es un círculo rasterizado y dos
 * estacas seguidas caen en diagonal cada pocos pasos, así que en cruz la celda
 * donde de verdad toca abrir la puerta parecía no tocar muralla.
 */
function touchesWall(state: GameState, x: number, y: number): boolean {
  return state.buildings.some((b) => b.lostTick === null
    // A2 · **el portón cuenta como muralla para pegarse a él**, y hace falta:
    // sin esto, las dos celdas que flanquean la puerta puntuaban como «no toca
    // muralla», la estacada crecía por otro lado y el anillo se cerraba con un
    // hueco a cada lado del portón. Medido en la semilla 11 al año 40: el
    // anillo partido en dos arcos de 37 y 32 piezas en vez de uno de 69.
    // A3 · y el bastión igual: es una pieza de muralla mejorada, no un hueco.
    && (b.kind === 'wall' || b.kind === 'palisade' || b.kind === 'gate' || b.kind === 'bastion')
    && Math.max(Math.abs(b.x - x), Math.abs(b.y - y)) === 1);
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
  // A2b · y el paso del portón, por la misma razón y con el mismo mecanismo: lo
  // que la aldea reserva no se le da a nadie. La muralla es la excepción —su
  // línea pasa por la puerta— y por eso se pregunta por la clase.
  if (kind !== 'gate' && inGateway(state, x, y, w, h)) return false;
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
  // §7.4c · el anillo que toca, sólo cuando se va a levantar muralla: es un
  // barrido de círculos y no hay que pagarlo por cada casa.
  const ring = kind === 'palisade' ? ringToBuild(state, centre, coreRadius, occupied) : null;
  // A2 · **el portón va en el anillo escrito, y en ninguno provisional.**
  //
  // Esto costó una depuración y es la trampa de B-1 vista desde la puerta:
  // mientras el valle no tiene once casas, `ringToBuild` devuelve un radio
  // **tanteado** que no se apunta (ver arriba), y con él el portón se colgaba
  // de una sección temprana a radio 7 mientras la muralla de verdad se cerraba
  // luego a radio 11. Medido en la semilla 23: puerta a 7,07 del centro, anillo
  // en 11, y **el valle amurallado sin una sola salida** — `ringClosed` decía
  // que sí y la gente no tenía por dónde pasar.
  //
  // Una puerta pertenece a una muralla, y a la de verdad: sin anillo escrito no
  // hay portón, que es lo mismo que §7.3 dice al no pedirlo.
  const gateRing = kind === 'gate' ? state.ring : null;
  // **Y se escribe, pero sólo cuando hay pueblo que amurallar.** Un anillo es
  // una decisión de la aldea —«hasta aquí llega el pueblo»— y una decisión se
  // apunta: si se volviera a calcular cada vez, volvería a moverse medio paso
  // por pieza, que es lo que llenaba el valle de tramos sueltos (ver
  // `GameState.ring`).
  //
  // **B-1 le pone la condición de las once casas**, y hace falta porque §7.3 no
  // es el único que levanta muralla: una encrucijada contestada también la
  // concede, y con el ritmo nuevo la primera decisión llega a las 14 horas de
  // reloj en vez de a las cien. Medido, eso fijaba el anillo **en el año 1,8 a
  // 6,3 con cuatro o cinco casas y radio 7**, y como no se mueve nunca, el
  // valle acababa creciendo fuera de su propia muralla: 49 piezas en un círculo
  // de 44 celdas. Con la condición, esas piezas tempranas son un trozo de
  // empalizada donde la aldea podía ponerlo —lo que el dueño del diseño llama
  // una sección— y el anillo de verdad se fija cuando el pueblo ya tiene su
  // forma (once casas, el 91 % del radio que va a ocupar).
  // A2b · el suelo del pueblo, para saber si una puerta separa de verdad. Se
  // calcula una vez y sólo cuando se va a plantar una: es un barrido del valle.
  const villageBag = kind === 'gate' ? villageSide(state, occupied) : null;
  const grown = houses.length >= BUILDING_RULES.PALISADE_HOUSES;
  if (ring !== null && ring !== state.ring && grown) state.ring = ring;
  // A2c · **y no hay estaca antes de que el anillo esté decidido.** El tope de
  // once casas existe para que el anillo no se elija el año dos, con el pueblo
  // aún sin forma; pero una encrucijada puede conceder una empalizada antes de
  // eso, y esa pieza no tenía anillo al que agarrarse: cada una se buscaba su
  // propio radio y la muralla salía en dos arcos pegados. Medido en diez
  // semillas: de 3 a 13 piezas fuera del anillo y **cinco valles con bloques de
  // dos por dos**, que es justo el grosor doble que una puerta de una celda no
  // atraviesa. Dejar que esa pieza fije el anillo es peor —el anillo se cerraba
  // en radio 7 y la aldea crecía fuera de su propia muralla—, así que lo que se
  // hace es esperar: la concesión se rechaza como se rechaza cualquier obra que
  // hoy no cabe, y la muralla empieza cuando la aldea tiene su forma.
  // **Y la línea de la muralla empezada es de la muralla.** Sin esto, la aldea
  // levantaba casas encima del anillo en curso, el anillo se quedaba sin sitio
  // y el siguiente arrancaba más afuera dejando la pieza vieja suelta: medido
  // en la semilla 11 al año 40, once tramos de los que cuatro eran de una sola
  // pieza. Reservarla es además lo que el dueño del diseño pidió con sus
  // palabras —«después la siguiente sección de construcción va fuera de la
  // muralla»—: cuando dentro ya no cabe nada, lo nuevo sale fuera solo.
  if ((kind === 'palisade' || kind === 'wall') && state.ring === null) return null;
  const wallLine = kind === 'palisade' || kind === 'wall' || kind === 'gate' ? null : state.ring;
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
    // A2c · un portón vale sobre una estaca en pie: se derriba y se cuelga ahí.
    const onWall = kind === 'gate' && wallAt(state, x, y) !== null;
    if (!onWall && !fitsEmptyGround(state, kind, x, y, occupied)) continue;
    const rect = { x, y, w: spec.w, h: spec.h };
    const p = center(rect);
    // §7.4c · la muralla va en el anillo, no en la envolvente del día.
    if (kind === 'palisade' && (ring === null || !onRing(p, centre, ring))) continue;
    if (kind === 'gate' && (gateRing === null || !onRing(p, centre, gateRing))) continue;
    // A2 · **un portón se cuelga de una muralla**, nunca en un hueco suelto del
    // anillo: sin esto, la primera puerta del valle podía acabar en la parte
    // del círculo que todavía no tiene una sola estaca.
    if (kind === 'gate' && !touchesWall(state, x, y)) continue;
    // A2c · **y la segunda puerta va en otro lado del cerco.** Ver `GATE_APART`.
    // Cuenta también la que está en obra: las dos puertas se pueden pedir la
    // misma temporada —una la aldea y otra el jugador— y mirando sólo las que
    // están en pie salían a cuatro celdas una de otra (semilla 36), que es un
    // portillo ancho y no dos puertas.
    if (kind === 'gate' && gateRing !== null) {
      const apart = gateRing * BUILDING_RULES.GATE_APART;
      const near = state.buildings.some((b) => b.lostTick === null && b.kind === 'gate'
        && Math.hypot(b.x - x, b.y - y) < apart)
        || state.works.some((w) => w.kind === 'gate' && Math.hypot(w.x - x, w.y - y) < apart);
      if (near) continue;
    }
    // A2b · **y donde de verdad se pueda pasar.** Reservar el paso (`inGateway`)
    // llega tarde si la puerta se planta donde ya hay casas a los dos lados: la
    // reserva impide lo que venga después, no deshace lo de antes. Medido en
    // diez valles, eso dejaba a uno encerrado en su propio cerco —la semilla 41
    // con 220 celdas de 8 064 a su alcance—. Una puerta se abre donde hay por
    // dónde entrar y por dónde salir.
    if (kind === 'gate'
      && (gateRing === null || !crossable(state, x, y, occupied, villageBag, gateRing))) continue;
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
      // A4 · **la torre va contra el cerco, por dentro.** Es la tercera parte
      // de la fila A4 («las torres como mejora del anillo») y el defecto que
      // arregla se ve desde C2: `watchtower` no tenía caso propio, así que
      // caía en el `default` —lo más cerca posible de la plaza— y `postsOf`
      // colgaba de ella un arquero tierra adentro, mirando los tejados.
      // Medido en doce semillas a ochenta años, veinte torres: **de 10 de 20
      // pegadas al cerco a 20 de 20**, y la distancia media al muro de 2,2 a
      // 1,4 celdas —1,4 es el mínimo de una pieza de 2×2 cuyo centro cae media
      // celda dentro, o sea tocándolo—.
      //
      // **No sustituye una pieza de muralla**, y eso es deliberado: la torre
      // es 2×2 y el anillo tiene una celda de grosor, así que colgarla del
      // anillo como se cuelga el portón (A2c, `upgradeOf`) taparía dos o tres
      // tramos y sólo se daría de baja uno — un boquete en el cerco, con
      // `ringClosed` diciendo que está cerrado. Lo que hace es **pegarse**: el
      // `onRingRect` de abajo sigue prohibiéndole la línea, y este marcador la
      // trae a la celda de al lado. Por dentro, porque entre dos sitios igual
      // de pegados gana el más cercano a la plaza.
      //
      // **Y dentro pesa más que pegada**, porque una torre fuera es un arquero
      // fuera: al primer asalto es una baja de C2 regalada. Aun así **cuatro
      // de las veinte salen fuera** —semillas 61 y 73— y no por el marcador:
      // en un valle ya cerrado no queda un solo solar de 2×2 que respete la
      // calle de §7.4, así que fuera es lo único que hay. Dejarlo así es
      // deliberado: una torre en la línea del anillo taparía dos o tres
      // tramos y sólo daría de baja uno (ver arriba), y **un bastión de verdad
      // —una pieza de cerco que además es torre— es trabajo de A3**, con su
      // `ringClosed` y su `wallRuns` de la mano. Apuntado en `plan-meta.md`.
      //
      // Sin anillo decidido no hay a qué pegarse y vale lo de antes: la torre
      // llega también por carro (C1) y por encrucijada (§8.4), y esas no
      // esperan a que el valle tenga cerco.
      case 'watchtower': {
        if (wallLine === null) { score = [distance(p, centre)]; break; }
        const radius = Math.sqrt(distance(p, centre));
        score = [
          radius > wallLine ? 1 : 0,
          Math.round(Math.abs(radius - wallLine)),
          distance(p, centre),
        ];
        break;
      }
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
      // A2 · **el portón, donde ya se pasa.** Lo pisado manda —un camino
      // gastado es por donde la aldea entra y sale, y ahí es donde una puerta
      // tiene sentido— y entre dos sitios igual de pisados gana el que está más
      // cerca de la plaza, que es de donde se sale. Es el mismo criterio con el
      // que `defence-gates.ts` elegía el paso cuando un portón no se construía;
      // lo que cambia es que ahora la elección se levanta y se queda.
      // A2b · **y la que de verdad separa el pueblo del campo va primero.** Si
      // no hay ninguna —la primera puerta se pide cuando la muralla tiene cinco
      // piezas y todavía no encierra nada— vale la que se pueda cruzar, que es
      // lo que impide que un valle se quede sin puerta.
      case 'gate': score = [
        -(state.map.path[y * state.map.width + x] ?? 0),
        distance(p, centre),
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
