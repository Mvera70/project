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
  /** Huella de contacto con otros cuerpos; el radio de navegación conserva margen frente a muros. */
  readonly contactRadius?: number;
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
  /** Obstáculos menores que una celda, indexados por las celdas que tocan. */
  readonly solids?: ReadonlyMap<number, readonly Solid[]>;
  /** Coste temporal de tráfico; no convierte un vecino en una pared. */
  readonly traffic?: Uint8Array;
  /** Cuerpos cercanos para desvíos que requieren salir de la propia celda. */
  readonly trafficBodies?: readonly Body[];
}

export interface Solid { readonly minX: number; readonly minZ: number; readonly maxX: number; readonly maxZ: number }

export function indexSolids(width: number, height: number, solids: readonly Solid[]): ReadonlyMap<number, readonly Solid[]> {
  const index = new Map<number, Solid[]>();
  for (const solid of solids) for (let z = Math.max(0, Math.floor(solid.minZ)); z <= Math.min(height - 1, Math.floor(solid.maxZ)); z++) {
    for (let x = Math.max(0, Math.floor(solid.minX)); x <= Math.min(width - 1, Math.floor(solid.maxX)); x++) {
      const cell = z * width + x, list = index.get(cell) ?? []; list.push(solid); index.set(cell, list);
    }
  }
  return index;
}

/** Si este punto cae donde no se puede estar, contando el borde del mapa. */
export function blockedAt(land: Terrain, x: number, z: number): boolean {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  if (cx < 0 || cz < 0 || cx >= land.width || cz >= land.height) return true;
  return land.blocked[cz * land.width + cx] === 1 || (land.solids?.get(cz * land.width + cx)
    ?.some(s => x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ) ?? false);
}

/** Penetración de un disco contra las cajas de la rejilla; incluye esquinas. */
export function penetration(land: Terrain, x: number, z: number, radius: number): number {
  let total = 0;
  const seen = new Set<Solid>();
  for (let cz = Math.floor(z - radius); cz <= Math.floor(z + radius); cz += 1) {
    for (let cx = Math.floor(x - radius); cx <= Math.floor(x + radius); cx += 1) {
      for (const s of land.solids?.get(cz * land.width + cx) ?? []) {
        if (seen.has(s)) continue;
        seen.add(s);
        const dx = x - Math.max(s.minX, Math.min(x, s.maxX));
        const dz = z - Math.max(s.minZ, Math.min(z, s.maxZ));
        const distance = Math.hypot(dx, dz);
        total += distance === 0 ? radius + Math.min(x - s.minX, s.maxX - x, z - s.minZ, s.maxZ - z)
          : Math.max(0, radius - distance);
      }
      if (cx >= 0 && cz >= 0 && cx < land.width && cz < land.height && land.blocked[cz * land.width + cx] !== 1) continue;
      const dx = x - Math.max(cx, Math.min(x, cx + 1));
      const dz = z - Math.max(cz, Math.min(z, cz + 1));
      const distance = Math.hypot(dx, dz);
      total += distance === 0 ? radius + Math.min(x - cx, cx + 1 - x, z - cz, cz + 1 - z)
        : Math.max(0, radius - distance);
    }
  }
  return total;
}

export function fitsCircle(land: Terrain, x: number, z: number, radius: number): boolean {
  return !blockedAt(land, x, z) && penetration(land, x, z, radius) <= 1e-9;
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

/** Avanza el disco contra la rejilla sólida. Resuelve cada eje por separado
 * para deslizar por las fachadas; si nace solapado sólo permite reducir o
 * mantener la penetración mientras busca la salida. */
export function integrate(body: Body, land: Terrain, seconds: number): void {
  // Barrido en subpasos: ni una velocidad alta ni una esquina diagonal
  // pueden saltarse una celda sólida. Un cuerpo solapado sólo puede salir.
  const count = Math.max(1, Math.ceil(Math.hypot(body.vx, body.vz) * seconds / 0.1));
  for (let n = 0; n < count; n += 1) {
    const before = penetration(land, body.x, body.z, body.radius);
    const x = body.x + body.vx * seconds / count;
    if (penetration(land, x, body.z, body.radius) <= before) body.x = x; else body.vx = 0;
    const afterX = penetration(land, body.x, body.z, body.radius);
    const z = body.z + body.vz * seconds / count;
    if (penetration(land, body.x, z, body.radius) <= afterX) body.z = z; else body.vz = 0;
  }

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
const TURN_RATE = 6;

/**
 * Umbral de velocidad, relativo al paso propio, por debajo del cual la cara no
 * sigue al cuerpo.
 *
 * TUNE: 0,25 (rework.md §3.5.3). Con un número fijo (0,05 celdas/s) una vaca
 * —`pace` 0,32— lo supera agitándose contra una pared sin moverse de sitio;
 * relativo al paso de cada cual, una gallina rápida y una vaca lenta piden lo
 * mismo: una cuarta parte de lo que andarían sueltas.
 */
export const TURN_MIN_SPEED = 0.25;

/**
 * Cuánto tiene que haber avanzado en la misma dirección desde la última vez
 * que se giró la cara, en celdas, antes de volver a girarla.
 *
 * TUNE: 0,3 (rework.md §3.5.3). Un cuerpo apretado contra un muro o contra sus
 * vecinos oscila con velocidad por encima del umbral de arriba sin cambiar de
 * sitio: lo que distingue andar de temblar no es la velocidad de este
 * instante, es que el sitio cambie. Unas décimas de celda son varios pasos
 * seguidos en el mismo sentido, que un tropiezo no tiene — y de sobra para que
 * el giro se note antes de que la calle se acabe.
 */
export const TURN_MIN_PROGRESS = 0.3;

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
