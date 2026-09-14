// V-02 · Los cuerpos. design.md Anexo E.
//
// **Un cuerpo ocupa sitio, y de ahí sale todo lo demás.**
//
// La diferencia con `actors/index.ts` cabe en una línea: allí la posición es
// `f(tick, fase)` —una curva que se evalúa— y aquí es estado que avanza. Por eso
// aquí se puede chocar, y por eso aquí no hace falta `lane` para que dos no se
// solapen: no caben en el mismo punto.
//
// Sin Three.js ni nada de dibujo: esto se prueba sin pintar.

/** Dónde está algo en el valle. Celdas, no metros: una celda son tres (D.6.2). */
export interface Point { x: number; z: number }

export interface Body extends Point {
  readonly id: number;
  vx: number;
  vz: number;
  /** Hacia dónde mira, en radianes. `atan2(vx, vz)` cuando anda. */
  facing: number;
  readonly radius: number;
  /** Lo que anda cuando nada le retiene, en celdas por segundo. */
  readonly pace: number;
}

/**
 * Por dónde se puede pasar.
 *
 * Una máscara de celdas y no una lista de obstáculos: el valle de verdad tiene
 * noventa y nueve edificios, un río con su cauce y roqueda, y recorrer esa lista
 * por cuerpo y por paso no escala. Mirar las ocho casillas de alrededor cuesta
 * lo mismo haya lo que haya, que es la diferencia entre que la escala importe y
 * que no importe.
 */
export interface Terrain {
  readonly width: number;
  readonly height: number;
  /** 1 donde no se pisa. Un índice por celda, `z * width + x`. */
  readonly blocked: Uint8Array;
}

/** Si este punto cae donde no se puede estar, contando el borde del mapa. */
export function blockedAt(land: Terrain, x: number, z: number): boolean {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  if (cx < 0 || cz < 0 || cx >= land.width || cz >= land.height) return true;
  return land.blocked[cz * land.width + cx] === 1;
}

/**
 * Lo que se separa un cuerpo de una pared, además de su radio.
 *
 * TUNE: 0,62 celdas. Medido en el descarte: con 0,45 la gente se pegaba tanto
 * que acababa cruzando la esquina de una casa, y con 0,62 nadie entró en diez
 * mil pasos por seis valles. No es holgura de sobra: es la que hace que el
 * empujón de la pared llegue a tiempo.
 */
export const WALL_CLEAR = 0.62;

/**
 * Adelanta el cuerpo el tiempo que se le diga, chocando con lo que haya.
 *
 * **Los dos ejes se prueban por separado**, que es lo que permite deslizarse a
 * lo largo de una pared en vez de clavarse contra ella: quien va en diagonal
 * hacia una fachada sigue avanzando por el lado que sí tiene hueco. Clavarse se
 * lee como que el juego se ha colgado; deslizar se lee como rodear.
 */
export function integrate(body: Body, land: Terrain, seconds: number): void {
  const nextX = body.x + body.vx * seconds;
  const nextZ = body.z + body.vz * seconds;

  if (!blockedAt(land, nextX, body.z)) body.x = nextX; else body.vx = 0;
  if (!blockedAt(land, body.x, nextZ)) body.z = nextZ; else body.vz = 0;

  // Y dentro del mapa, siempre. Medio paso de margen: justo en el borde de la
  // última celda, el redondeo del suelo puede dejar a alguien fuera.
  body.x = Math.max(0.5, Math.min(land.width - 0.5, body.x));
  body.z = Math.max(0.5, Math.min(land.height - 0.5, body.z));
}

/**
 * Cuánto puede girar la cara en un segundo, en radianes.
 *
 * TUNE: seis. Un cuerpo que se orienta de golpe al cambiar de rumbo parece un
 * muñeco al que le han dado la vuelta; uno que tarda medio segundo en girarse
 * del todo parece que mira hacia donde va.
 */
export const TURN_RATE = 6;

/** Gira la cara hacia donde se anda, sin tirones y por el lado corto. */
export function turnTo(body: Body, heading: number, seconds: number): void {
  let turn = heading - body.facing;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  const most = TURN_RATE * seconds;
  body.facing += Math.max(-most, Math.min(most, turn));
}

/** Lo que hay entre dos puntos, en celdas. */
export function gap(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
