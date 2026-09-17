// V-03 · Ir de aquí a allí. design.md Anexo E.
//
// **Por qué no se reutiliza el A* del motor**, que era lo que el plan suponía:
// `engine/world/astar.ts` navega el **terreno** —agua, marisma, bosque, roqueda,
// caminos— para calcular las rutas de trabajo de §7.6, y **no sabe que hay
// edificios**. La gente sí tiene que rodearlos. Reutilizarlo obligaría a
// cambiarlo, y el motor no se toca en ninguna fase de este anexo.
//
// Lo que sí se le copia es la decisión que importa: **todo coste es entero**.
// Con decimales, dos máquinas que redondeen el último bit distinto desempatan
// distinto, la ruta cambia de celda y el valle deja de ser reproducible.
//
// Y hace falta, porque el empuje local de V-02 no basta: apartarse de lo que se
// tiene encima saca a alguien de un tropiezo, pero no de un rincón cóncavo. Sin
// ruta, quien va a un sitio detrás de una casa se queda empujando la pared.

import { fitsCircle, blockedAt, type Point, type Terrain, type Body } from './body';

/** Un punto por el que pasar. La ruta es una lista de ellos, en orden. */
export type Waypoint = Point;

/** Coste de un paso recto y de uno en diagonal, en enteros. 7/5 ≈ √2. */
const STRAIGHT = 5;
const DIAGONAL = 7;

/** Las ocho direcciones, en orden fijo: el desempate no puede variar. */
const WAYS: ReadonlyArray<readonly [number, number, number]> = [
  [0, -1, STRAIGHT], [-1, 0, STRAIGHT], [1, 0, STRAIGHT], [0, 1, STRAIGHT],
  [-1, -1, DIAGONAL], [1, -1, DIAGONAL], [-1, 1, DIAGONAL], [1, 1, DIAGONAL],
];

/**
 * Un montón binario ordenado por coste, con la celda desempatando.
 *
 * Escrito a mano en vez de ordenar un array, por lo mismo que en el motor: esto
 * corre una vez por persona y cambio de destino, y ordenar en cada inserción
 * convierte a una aldea de ochenta en una parte medible del paso.
 */
class Frontier {
  private readonly f: number[] = [];
  private readonly cell: number[] = [];

  get size(): number { return this.cell.length; }

  private before(a: number, b: number): boolean {
    const fa = this.f[a] as number;
    const fb = this.f[b] as number;
    return fa < fb || (fa === fb && (this.cell[a] as number) < (this.cell[b] as number));
  }

  private swap(a: number, b: number): void {
    [this.f[a], this.f[b]] = [this.f[b] as number, this.f[a] as number];
    [this.cell[a], this.cell[b]] = [this.cell[b] as number, this.cell[a] as number];
  }

  push(cell: number, f: number): void {
    this.f.push(f);
    this.cell.push(cell);
    let at = this.cell.length - 1;
    while (at > 0) {
      const up = (at - 1) >> 1;
      if (!this.before(at, up)) break;
      this.swap(at, up);
      at = up;
    }
  }

  pop(): number {
    const top = this.cell[0] as number;
    const last = this.cell.length - 1;
    this.swap(0, last);
    this.f.pop();
    this.cell.pop();
    let at = 0;
    for (;;) {
      const left = at * 2 + 1;
      const right = left + 1;
      let best = at;
      if (left < this.cell.length && this.before(left, best)) best = left;
      if (right < this.cell.length && this.before(right, best)) best = right;
      if (best === at) break;
      this.swap(at, best);
      at = best;
    }
    return top;
  }
}

/** La celda de un punto. */
function cellOf(land: Terrain, at: Point): number {
  const x = Math.max(0, Math.min(land.width - 1, Math.floor(at.x)));
  const z = Math.max(0, Math.min(land.height - 1, Math.floor(at.z)));
  return z * land.width + x;
}

/** El centro de una celda. Se anda por el medio, no por las esquinas. */
function centreOf(land: Terrain, cell: number): Waypoint {
  return { x: (cell % land.width) + 0.5, z: Math.floor(cell / land.width) + 0.5 };
}

/**
 * El radio con el que se comprueba un atajo, no el de quien pregunta.
 *
 * TUNE: 0,4 celdas — el cuerpo más ancho del valle (la vaca, `beasts.ts`,
 * `RADIUS.cow`). El `Router` cachea por par de celdas y no por cuerpo (más
 * abajo: «la misma pregunta se repite mucho»), así que persona y bestia
 * comparten la misma ruta calculada: un atajo que le vale a una vaca le vale
 * a cualquiera más estrecho, y uno que no le vale a la vaca no se ofrece a
 * nadie.
 */
const ROUTE_CLEARANCE = 0.4;

/**
 * Si de un punto se ve el otro sin que se cruce nada.
 *
 * Se usa para dos cosas: recortar la ruta y decidir si hace falta ruta siquiera.
 * Muestrea a pasos de 0,15 celdas y comprueba el disco contra cada sólido fino.
 *
 * **Y el radio, si se da, tiene que pasar también** (rework.md §3.5.1): sin
 * él, la recta entre dos centros roza un muro que el cuerpo sí toca —el punto
 * pasa, el cuerpo no— y eso es lo que se veía como cortar una esquina. Se
 * comprueba la intersección disco–rectángulo en cada muestra de la recta.
 */
export function clearBetween(land: Terrain, from: Point, to: Point, radius = 0): boolean {
  const away = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(away / 0.15));
  for (let n = 0; n <= steps; n += 1) {
    const t = n / steps;
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    if (!fitsCircle(land, x, z, radius)) return false;
  }
  return true;
}

function routeClear(land: Terrain, from: Point, to: Point, radius: number): boolean {
  if (!clearBetween(land, from, to, radius)) return false;
  if (land.traffic === undefined && land.trafficBodies === undefined) return true;
  const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.25));
  for (let i = 1; i <= count; i++) {
    const point = { x: from.x + (to.x - from.x) * i / count, z: from.z + (to.z - from.z) * i / count };
    if ((land.traffic?.[cellOf(land, point)] ?? 0) > 0 || bodyTraffic(land, point, radius) > 0) return false;
  }
  return true;
}

function bodyTraffic(land: Terrain, point: Point, radius: number): number {
  // TUNE: 1000. El desvío se pide después de un atasco real; atravesar
  // otra vez al vecino no debe resultar más barato que rodear una manzana.
  return land.trafficBodies?.some(other => Math.hypot(other.x - point.x, other.z - point.z) < radius + other.radius + 0.08) ? 1000 : 0;
}

/**
 * El camino de un punto a otro, o nada si no lo hay.
 *
 * **Devolver que no hay camino es una respuesta, no un fallo.** El valle tiene
 * un río que sólo se cruza por el vado, así que hay pares de puntos sin ruta y
 * quien pregunta tiene que poder oír que no. Inventarse una es lo que hacía el
 * render viejo y por eso la gente cruzaba el agua.
 */
export function pathTo(land: Terrain, from: Point, to: Point, radius = ROUTE_CLEARANCE): Waypoint[] | null {
  const coarse = coarsePathTo(land, from, to);
  if (land.solids === undefined || land.solids.size === 0) return coarse;
  let previous = from;
  if (coarse !== null && coarse.every(point => {
    const clear = clearBetween(land, previous, point, radius); previous = point; return clear;
  })) return coarse;
  return finePathTo(land, from, to, radius);
}

function coarsePathTo(land: Terrain, from: Point, to: Point): Waypoint[] | null {
  const start = cellOf(land, from);
  const goal = cellOf(land, to);
  if (blockedAt(land, to.x, to.z)) return null;
  // En línea recta no hace falta nada más, y es el caso corriente: la mayoría
  // de los pasos de una jornada son campo abierto. Con el radio de sobra
  // (`ROUTE_CLEARANCE`), para que este atajo no corte una esquina.
  if (routeClear(land, from, to, ROUTE_CLEARANCE)) return [{ x: to.x, z: to.z }];
  if (start === goal) return fitsCircle(land, to.x, to.z, 0.32) ? [{ x: to.x, z: to.z }] : null;

  const cells = land.width * land.height;
  const cameFrom = new Int32Array(cells).fill(-1);
  const cost = new Int32Array(cells).fill(-1);
  const open = new Frontier();

  const heuristic = (cell: number): number => {
    const dx = Math.abs((cell % land.width) - (goal % land.width));
    const dz = Math.abs(Math.floor(cell / land.width) - Math.floor(goal / land.width));
    // Distancia de rey: lo que costaría sin obstáculos, en la misma escala.
    return STRAIGHT * (dx + dz) + (DIAGONAL - 2 * STRAIGHT) * Math.min(dx, dz);
  };

  cost[start] = 0;
  open.push(start, heuristic(start));

  while (open.size > 0) {
    const cell = open.pop();
    if (cell === goal) break;
    const cx = cell % land.width;
    const cz = Math.floor(cell / land.width);
    const spent = cost[cell] as number;

    for (const [dx, dz, step] of WAYS) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= land.width || nz >= land.height) continue;
      if (land.blocked[nz * land.width + nx] === 1) continue;
      // **Una diagonal no corta una esquina.** Sin esto, la gente pasa por el
      // vértice donde se tocan dos paredes, que es un sitio por el que no cabe
      // nadie y en pantalla se lee como atravesar la casa.
      if (dx !== 0 && dz !== 0) {
        if (land.blocked[cz * land.width + nx] === 1) continue;
        if (land.blocked[nz * land.width + cx] === 1) continue;
      }
      const next = nz * land.width + nx;
      const soFar = spent + step + (land.traffic?.[next] ?? 0);
      const known = cost[next] as number;
      if (known >= 0 && known <= soFar) continue;
      cost[next] = soFar;
      cameFrom[next] = cell;
      open.push(next, soFar + heuristic(next));
    }
  }

  if ((cost[goal] as number) < 0) return null;

  // Se deshace el camino y se recorta: de celda en celda sale un zigzag de
  // escalones, y lo que se anda es la recta entre los sitios que se ven.
  const chain: number[] = [];
  for (let at = goal; at !== -1; at = cameFrom[at] as number) chain.push(at);
  chain.reverse();

  const route: Waypoint[] = [];
  let at: Point = from;
  for (let i = 1; i < chain.length; i += 1) {
    const here = centreOf(land, chain[i] as number);
    const next = i + 1 < chain.length ? centreOf(land, chain[i + 1] as number) : { x: to.x, z: to.z };
    if (routeClear(land, at, next, ROUTE_CLEARANCE)) continue;
    route.push(here);
    at = here;
  }
  route.push({ x: to.x, z: to.z });
  return route;
}

/** Sólo cuando los troncos o lápidas cortan la ruta gruesa: medias celdas,
 * con cada segmento comprobado contra los sólidos reales. */
function finePathTo(land: Terrain, from: Point, to: Point, radius: number, resolution = 2): Waypoint[] | null {
  if (!fitsCircle(land, to.x, to.z, radius)) return null;
  const width = land.width * resolution - 1, height = land.height * resolution - 1;
  const point = (cell: number): Point => ({ x: (cell % width + 1) / resolution, z: (Math.floor(cell / width) + 1) / resolution });
  const start = Math.max(0, Math.min(height - 1, Math.round(from.z * resolution) - 1)) * width
    + Math.max(0, Math.min(width - 1, Math.round(from.x * resolution) - 1));
  const heuristic = (cell: number): number => { const p = point(cell); return Math.floor(Math.hypot(to.x - p.x, to.z - p.z) * 4.5 * resolution); };
  const cost = new Int32Array(width * height).fill(-1), came = new Int32Array(width * height).fill(-1);
  const open = new Frontier(); cost[start] = 0; open.push(start, heuristic(start));
  let goal = -1;
  while (open.size > 0) {
    const cell = open.pop(), here = cell === start ? from : point(cell);
    if (Math.hypot(here.x - to.x, here.z - to.z) <= 0.8 && clearBetween(land, here, to, radius)) { goal = cell; break; }
    for (const [dx, dz, step] of WAYS) {
      const x = cell % width + dx, z = Math.floor(cell / width) + dz;
      if (x < 0 || z < 0 || x >= width || z >= height) continue;
      const next = z * width + x, spent = cost[cell]! + step + (land.traffic?.[cellOf(land, point(next))] ?? 0)
        + bodyTraffic(land, point(next), radius);
      if (cost[next]! >= 0 && cost[next]! <= spent) continue;
      if (!clearBetween(land, here, point(next), radius)) continue;
      cost[next] = spent; came[next] = cell; open.push(next, spent + heuristic(next));
    }
  }
  // Algunos huecos junto a postes no contienen ningún nodo de media celda.
  // Se afina sólo tras fallar, con un límite para no buscar indefinidamente.
  if (goal < 0) return resolution === 2 ? finePathTo(land, from, to, radius, 4) : null;
  const chain: Point[] = [to];
  for (let cell = goal; cell !== start; cell = came[cell]!) chain.push(point(cell));
  chain.reverse();
  const route: Point[] = []; let here = from;
  for (let i = 0; i < chain.length; i++) {
    let last = i;
    while (last + 1 < chain.length && routeClear(land, here, chain[last + 1]!, radius)) last++;
    here = chain[last]!; route.push(here); i = last;
  }
  return route;
}

/** Un atasco temporal no cambia el mapa: se calcula una ruta alternativa
 * penalizando las celdas ocupadas ahora, sin contaminar la caché permanente. */
export function routeAroundBodies(land: Terrain, body: Body, to: Point, bodies: readonly Body[]): Waypoint[] | null {
  const traffic = new Uint8Array(land.width * land.height);
  const start = cellOf(land, body), goal = cellOf(land, to);
  for (const other of bodies) {
    if (other.id === body.id || Math.hypot(other.x - body.x, other.z - body.z) > 5) continue;
    const cell = cellOf(land, other);
    if (cell !== start && cell !== goal) traffic[cell] = 60;
  }
  const trafficBodies = bodies.filter(other => other.id !== body.id && Math.hypot(other.x - body.x, other.z - body.z) <= 5);
  // La rejilla de celdas no distingue a dos vecinos dentro de la misma celda.
  // El desvío fino puede retroceder o salir lateralmente sin atravesarlos.
  return finePathTo({ ...land, traffic, trafficBodies }, body, to, body.radius);
}

/**
 * Guarda las rutas ya calculadas, por par de celdas.
 *
 * La misma pregunta se repite mucho: ochenta personas yendo a seis sitios son
 * seis rutas y no ochenta. Se vacía cuando cambia el mundo —una casa nueva
 * cierra un paso— y eso pasa una vez al día escénico, no por fotograma.
 */
export interface Router {
  to(land: Terrain, from: Point, to: Point, radius?: number): Waypoint[] | null;
  /** Olvida lo aprendido. El valle ha cambiado de forma. */
  clear(): void;
  readonly asked: number;
  readonly solved: number;
}

export function createRouter(limit = 512): Router {
  const known = new Map<string, Waypoint[] | null>();
  let asked = 0;
  let solved = 0;

  return {
    get asked(): number { return asked; },
    get solved(): number { return solved; },

    clear(): void { known.clear(); },

    to(land: Terrain, from: Point, to: Point, radius = ROUTE_CLEARANCE): Waypoint[] | null {
      asked += 1;
      const key = `${cellOf(land, from)}:${cellOf(land, to)}:${radius}`;
      const seen = known.get(key);
      if (seen !== undefined && (land.solids === undefined || (seen !== null && seen.length > 0
        && clearBetween(land, from, seen[0]!, radius)
        && clearBetween(land, seen.length > 1 ? seen[seen.length - 2]! : from, to, radius)))) {
        // La ruta guardada va de centro a centro de celda; el último tramo se
        // rehace hacia el punto pedido, que rara vez es el centro justo.
        return seen === null ? null : [...seen.slice(0, -1), { x: to.x, z: to.z }];
      }
      solved += 1;
      const found = pathTo(land, from, to, radius);
      if (known.size >= limit) known.clear();
      known.set(key, found);
      return found;
    },
  };
}

/** A qué distancia se da por alcanzado un punto de paso. */
const REACHED = 0.45;

/**
 * El punto de la ruta al que hay que ir ahora.
 *
 * Va quitando los que ya se han alcanzado. Devuelve nada cuando se acabó la
 * ruta, que es como el que anda sabe que ha llegado.
 */
export function follow(body: Point, route: Waypoint[], reached = REACHED): Waypoint | null {
  while (route.length > 0) {
    const next = route[0] as Waypoint;
    if (Math.hypot(next.x - body.x, next.z - body.z) > reached) return next;
    route.shift();
  }
  return null;
}
