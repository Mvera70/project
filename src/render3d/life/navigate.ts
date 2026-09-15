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

import { blockedAt, type Point, type Terrain } from './body';

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
 * Muestrea a pasos de media celda, que es menos de lo que mide el obstáculo más
 * fino del valle —una celda— así que no se le puede colar nada por en medio.
 *
 * **Y el radio, si se da, tiene que pasar también** (rework.md §3.5.1): sin
 * él, la recta entre dos centros roza un muro que el cuerpo sí toca —el punto
 * pasa, el cuerpo no— y eso es lo que se veía como cortar una esquina. Se
 * comprueban los mismos cuatro puntos que la sonda de medida
 * (`tools/life-report.ts`) en cada muestra de la recta, no sólo los dos del
 * eje de avance: aquí no hay un solo eje, es una línea en cualquier ángulo.
 */
export function clearBetween(land: Terrain, from: Point, to: Point, radius = 0): boolean {
  const away = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(away / 0.5));
  for (let n = 0; n <= steps; n += 1) {
    const t = n / steps;
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    if (blockedAt(land, x, z)) return false;
    if (radius > 0 && (
      blockedAt(land, x - radius, z) || blockedAt(land, x + radius, z)
      || blockedAt(land, x, z - radius) || blockedAt(land, x, z + radius)
    )) return false;
  }
  return true;
}

/**
 * El camino de un punto a otro, o nada si no lo hay.
 *
 * **Devolver que no hay camino es una respuesta, no un fallo.** El valle tiene
 * un río que sólo se cruza por el vado, así que hay pares de puntos sin ruta y
 * quien pregunta tiene que poder oír que no. Inventarse una es lo que hacía el
 * render viejo y por eso la gente cruzaba el agua.
 */
export function pathTo(land: Terrain, from: Point, to: Point): Waypoint[] | null {
  const start = cellOf(land, from);
  const goal = cellOf(land, to);
  if (blockedAt(land, to.x, to.z)) return null;
  // En línea recta no hace falta nada más, y es el caso corriente: la mayoría
  // de los pasos de una jornada son campo abierto. Con el radio de sobra
  // (`ROUTE_CLEARANCE`), para que este atajo no corte una esquina.
  if (clearBetween(land, from, to, ROUTE_CLEARANCE)) return [{ x: to.x, z: to.z }];
  if (start === goal) return [{ x: to.x, z: to.z }];

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
      const soFar = spent + step;
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
    if (clearBetween(land, at, next, ROUTE_CLEARANCE)) continue;
    route.push(here);
    at = here;
  }
  route.push({ x: to.x, z: to.z });
  return route;
}

/**
 * Guarda las rutas ya calculadas, por par de celdas.
 *
 * La misma pregunta se repite mucho: ochenta personas yendo a seis sitios son
 * seis rutas y no ochenta. Se vacía cuando cambia el mundo —una casa nueva
 * cierra un paso— y eso pasa una vez al día escénico, no por fotograma.
 */
export interface Router {
  to(land: Terrain, from: Point, to: Point): Waypoint[] | null;
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

    to(land: Terrain, from: Point, to: Point): Waypoint[] | null {
      asked += 1;
      const key = `${cellOf(land, from)}:${cellOf(land, to)}`;
      const seen = known.get(key);
      if (seen !== undefined) {
        // La ruta guardada va de centro a centro de celda; el último tramo se
        // rehace hacia el punto pedido, que rara vez es el centro justo.
        return seen === null ? null : [...seen.slice(0, -1), { x: to.x, z: to.z }];
      }
      solved += 1;
      const found = pathTo(land, from, to);
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
export function follow(body: Point, route: Waypoint[]): Waypoint | null {
  while (route.length > 0) {
    const next = route[0] as Waypoint;
    if (Math.hypot(next.x - body.x, next.z - body.z) > REACHED) return next;
    route.shift();
  }
  return null;
}
