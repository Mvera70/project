// G-06 · The valley floor. design.md D.6, D.8.
//
// One mesh for the whole map, with a colour per vertex. Thirty-six by fifty-six
// cells is four thousand triangles, which is nothing, and one mesh is one draw
// call instead of two thousand.
//
// It is rebuilt only when `groundSignature` changes, which is when terrain or
// paths change — a few times a year, not sixty times a second. D.6 asks not to
// rebuild everything every frame and this is the biggest thing there is to
// rebuild.

import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshStandardMaterial,
} from 'three';
import { TERRAIN_CODE } from '@engine/state';
import type { ValleyMap } from '@engine/state';
import type { Palette } from '@derive/palette';
import type { Era } from '@derive/era';
import { GROUND_BIAS } from '../visual-config';

/**
 * How much a cell's colour varies from its neighbours of the same kind.
 *
 * A meadow painted in one flat green reads as a bedsheet. The variation is
 * derived from the cell index and never from randomness: §4.3 forbids the
 * renderer drawing a number, and a valley that shimmered differently on every
 * frame would be worse than a flat one.
 */
const MOTTLE = 0.05;

/**
 * El moteado, por esquina de la cuadricula.
 *
 * Antes iba por celda, y asi es un tono plano por cuadrado: cuarenta filas de
 * cuadrados de tono ligeramente distinto **son** la cuadricula: era lo ultimo
 * que quedaba de ella cuando los bordes ya no eran rectos. Por esquina, el tono
 * va cambiando dentro de la propia celda y lo que se ve es un prado desigual.
 *
 * Sale de las coordenadas de la esquina, asi que las cuatro celdas que la tocan
 * leen el mismo valor y la mancha cruza de una a otra sin costura.
 */
function mottleAt(x: number, z: number): number {
  const mixed = Math.imul(x * 374_761_393 + z * 668_265_263 + 1, 2_246_822_519) >>> 0;
  return ((mixed % 1000) / 999 - 0.5) * 2 * MOTTLE;
}

/**
 * Cuanto cambia de tono el suelo de una zona a otra, y cada cuantas celdas.
 *
 * El moteado de al lado varia de esquina a esquina, y a la distancia a la que
 * se juega eso se promedia y desaparece: el prado vuelve a ser una sabana de un
 * verde. Un prado de verdad tiene manchas mas grandes que sus hierbas —lo seco
 * de la loma, lo hondo que retiene el agua—, asi que encima va una segunda
 * variacion mas lenta.
 *
 * TUNE: siete centesimas cada seis celdas, dieciocho metros (D.6.2). Al doble
 * de amplitud se ven las manchas y no el prado.
 */
const PATCH = 0.07;
const PATCH_CELLS = 6;

/** Un valor entre cero y uno, siempre el mismo para el mismo par. */
function hash(x: number, z: number): number {
  const mixed = Math.imul(x * 668_265_263 + z * 374_761_393 + 1, 2_654_435_761) >>> 0;
  return (mixed % 1000) / 999;
}

/**
 * La mancha lenta en un punto: ruido de rejilla, interpolado suave.
 *
 * La rejilla va de seis en seis celdas y entre nudo y nudo se interpola con una
 * curva suave, no con una recta: con la recta se ven las aristas de la rejilla,
 * que seria cambiar una cuadricula por otra mas grande.
 */
function patchAt(x: number, z: number): number {
  const gx = x / PATCH_CELLS;
  const gz = z / PATCH_CELLS;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const fx = gx - x0;
  const fz = gz - z0;
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const sx = smooth(fx);
  const sz = smooth(fz);
  const top = hash(x0, z0) * (1 - sx) + hash(x0 + 1, z0) * sx;
  const bottom = hash(x0, z0 + 1) * (1 - sx) + hash(x0 + 1, z0 + 1) * sx;
  return ((top * (1 - sz) + bottom * sz) - 0.5) * 2 * PATCH;
}

/**
 * Cuanto se desplaza de su sitio una esquina de celda, en celdas.
 *
 * TUNE: veintidos centesimas, sesenta y cinco centimetros (D.6.2). El valle
 * estaba dibujado con cuadrados perfectos y desde que hay arboles y casas en
 * tres dimensiones encima, la cuadricula se lee como lo que es: papel
 * milimetrado verde. Un terreno no tiene el borde recto. Moviendo las esquinas
 * un poco, la linde entre el prado y el bosque deja de ser una escalera de
 * peldanos iguales y pasa a ser un borde irregular, que es lo que separa dos
 * terrenos de verdad. Mas de un cuarto de celda y los triangulos se cruzan.
 */
const WOBBLE = 0.22;

/**
 * A donde se mueve la esquina `(x, z)` de la cuadricula.
 *
 * **Depende solo de la esquina**, no de la celda que la usa. Es la condicion de
 * que esto funcione: las cuatro celdas que tocan una esquina tienen cada una su
 * propio vertice ahi, y si cada uno se moviera a su aire se abririan agujeros
 * entre celda y celda. Saliendo del mismo par de coordenadas, los cuatro se
 * mueven juntos y la malla sigue cerrada.
 *
 * El borde del mapa no se mueve: el valle sigue siendo un rectangulo y su
 * contorno es el limite del mundo, no un accidente del terreno.
 */
function wobbleAt(map: ValleyMap, x: number, z: number): { x: number; z: number } {
  if (x <= 0 || z <= 0 || x >= map.width || z >= map.height) return { x, z };
  const mixed = Math.imul(x * 73_856_093 + z * 19_349_663 + 1, 2_654_435_761) >>> 0;
  const other = Math.imul(mixed ^ 0x9e37_79b9, 2_246_822_519) >>> 0;
  return {
    x: x + ((mixed % 1000) / 999 - 0.5) * 2 * WOBBLE,
    z: z + ((other % 1000) / 999 - 0.5) * 2 * WOBBLE,
  };
}

/**
 * Cuanto pesa la propia celda en el color de sus esquinas.
 *
 * TUNE: cuarenta y seis centesimas contra dieciocho de cada vecina. Con el
 * color plano por celda, dos terrenos vecinos se encuentran en un escalon recto
 * y el valle entero es un tablero de ajedrez. Promediando del todo se pierde el
 * campo de cultivo, que mide tres por dos y se disolveria en el prado. Con la
 * celda pesando algo mas de lo que suman sus vecinas, la linde es un degradado
 * de una celda de ancho y lo que hay a cada lado sigue siendo reconocible.
 */
const OWN_CELL = 0.46;

/**
 * El color de una esquina de celda: el suyo, mezclado con el de las vecinas.
 *
 * `own` es la celda a la que pertenece este vertice; las otras tres que tocan
 * la esquina entran con el peso que sobra.
 */
function cornerColour(
  map: ValleyMap, own: number, x: number, z: number, palette: Palette, into: Color,
  plaza?: Plaza, era?: Era,
): void {
  const rest = (1 - OWN_CELL) / 3;
  const ownX = own % map.width;
  const ownZ = Math.floor(own / map.width);
  let r = 0;
  let g = 0;
  let b = 0;
  const sample = new Color();
  for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) {
    const cx = x + dx;
    const cz = z + dz;
    const mine = cx === ownX && cz === ownZ;
    // Fuera del mapa no hay terreno que mezclar: esa parte de la mezcla la pone
    // la propia celda, y asi los pesos siguen sumando uno.
    const inside = cx >= 0 && cz >= 0 && cx < map.width && cz < map.height;
    sample.set(cellColour(map, inside ? cz * map.width + cx : own, palette, plaza, era));
    const weight = mine ? OWN_CELL : rest;
    r += sample.r * weight;
    g += sample.g * weight;
    b += sample.b * weight;
  }
  into.setRGB(r, g, b);
}

/**
 * El color de una celda: su terreno, o el camino gastado encima.
 *
 * Los colores salen de la paleta de la estación, que es la de §10.3 y la que el
 * render 2D ya usa. Duplicarla aquí habría hecho que los dos valles se
 * separaran en cuanto alguien retocara un verde, y G-08 pide expresamente
 * reutilizar el significado existente en vez de repetir las reglas.
 */
export function cellColour(
  map: ValleyMap, cell: number, palette: Palette, plaza?: Plaza, era: Era = 'hamlet',
): string {
  // P-2 · **el acabado de la plaza.** Va antes que el camino y antes que el
  // terreno porque es lo que manda: dentro del círculo la Era decide tierra
  // pisada, mezcla o piedra, y el motor ya garantiza que ahí no hay nada
  // construido (P-1, `engine/world/plaza.ts`). El borde dibuja el espacio sin
  // convertir el exterior en un camino nuevo.
  if (plaza !== undefined) {
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    const gap = Math.hypot(x + 0.5 - plaza.x, z + 0.5 - plaza.y);
    if (gap <= plaza.radius) {
      return plazaPaving(palette, era, x, z, plaza, gap);
    }
  }
  const wear = map.path[cell] ?? 0;
  if (wear > 0) {
    // La era no inventa caminos: sólo asienta los que ya dice el mapa. Cada
    // peldaño conserva un tono distinto para que una calzada no aparezca donde
    // sólo había hierba, ni una senda pase a leerse como piedra de golpe.
    const base = wear >= 3 ? palette.accent : wear === 2 ? palette.path : mixed(palette.path, palette.meadowAlt);
    if (era === 'hamlet') return base;
    if (era === 'village') {
      return wear >= 3 ? palette.accent
        : wear === 2 ? mixed(palette.path, palette.accent) : mixed(base, palette.path);
    }
    return wear >= 3 ? mixed(palette.accent, palette.stone)
      : wear === 2 ? palette.accent : palette.path;
  }
  switch (map.terrain[cell] ?? 0) {
    case 1: return palette.forest;
    case 2: return palette.water;
    case 3: return palette.rock;
    case 4: return palette.forestDark;
    case 5: return palette.field;
    // El mapa grande: piedra desnuda y agua quieta (`docs/historico/next-plan.md`).
    case 6: return palette.stone;
    case 7: return palette.lake;
    // El vado: el agua del río aclarada con el color de los caminos, que es
    // exactamente lo que es —agua somera con piedras puestas—. No pide color
    // propio en la paleta porque no es un terreno nuevo del valle, es un río
    // que se puede pisar.
    case 8: return mixed(palette.water, palette.path);
    default: return palette.meadow;
  }
}

/**
 * El acabado de la plaza, siempre dentro de su círculo reservado.
 *
 * No son losas ni geometría nueva: son tierra y piedra en el color por vértice
 * del único suelo. La mancha sale de bloques de dos celdas, no de ruido fino,
 * para que sobreviva la mezcla de vértices y el tamaño móvil.
 */
function plazaPaving(
  palette: Palette, era: Era, x: number, z: number, plaza: Plaza, gap: number,
): string {
  // La tierra pisada no es prado: conserva el ocre del camino, pero se apoya
  // en la madera para no parecer que la plaza ha nacido ya como una calzada.
  const compacted = mixed(palette.path, palette.wood);
  const compactedRim = mixed(compacted, palette.wood);
  // La piedra mezcla los tonos ya estacionales de la paleta. No hay material,
  // textura ni malla nuevos: sólo cambia el color de los vértices existentes.
  const stone = mixed(palette.stone, palette.accent);
  const stoneShade = mixed(palette.stone, palette.path);
  const blockX = Math.floor((x - plaza.x + 4) / 2);
  const blockZ = Math.floor((z - plaza.y + 4) / 2);
  const patch = (Math.imul(blockX, 3) + Math.imul(blockZ, 5) + 17) & 3;
  // El borde sólo perfila el espacio reservado; jamás sale del círculo ni
  // altera un camino exterior. Caserío = tierra completa; aldea = dos bloques
  // de piedra por cada dos de tierra; villa = piedra continua.
  if (era === 'hamlet') return gap > plaza.radius - 0.35 ? compactedRim : compacted;
  if (era === 'village') return patch <= 1 ? stone : compacted;
  return patch === 0 ? stoneShade : stone;
}

/** Media de dos colores, para el escalón que la paleta no nombra. */
function mixed(from: string, to: string): string {
  const parse = (hex: string): number[] => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const a = parse(from);
  const b = parse(to);
  return `#${a.map((value, index) => Math.round((value + (b[index] ?? value)) / 2)
    .toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Cuanto sube o baja cada terreno respecto al prado, en celdas.
 *
 * El rio era color plano: agua y prado a la misma altura, y desde arriba se
 * leia como una alfombra azul. Un cauce hundido hace que el rio corte el valle
 * y que el prado tenga orilla. La roca sube un poco por el mismo motivo: un
 * afloramiento que no sobresale no aflora.
 *
 * TUNE: catorce centesimas de celda son cuarenta centimetros (D.6.2). Poco es
 * suficiente porque lo que hace el cauce no es la profundidad, es la sombra
 * que proyecta el borde.
 */
const RELIEF: Readonly<Record<number, number>> = {
  2: -0.14,   // agua
  4: -0.05,   // marisma
  3: 0.09,    // roca
  // La montaña no está aquí: su cota **no es una constante por celda**, sube
  // según lo adentro que esté del macizo. Ver `risesOf`.
  // Y el lago, más hondo que el río: un cauce se vadea y un lago no.
  7: -0.30,   // lago
  // El vado, menos hondo que el cauce: las losas asoman sobre la corriente y
  // por eso se puede cruzar. Si estuviera a la cota del agua, la gente cruzaría
  // el río andando sobre el río.
  8: -0.06,   // vado
};

/**
 * Cuánto se levanta cada celda de montaña, en celdas de altura.
 *
 * **Y no es un número por celda, que fue el primer intento y se vio en una
 * captura.** Con una cota fija —2,4 celdas para toda montaña— el cinturón de
 * roca del mapa grande salía como una **meseta plana**: el valle se leía como
 * una tarta de piedra con un rectángulo verde encima, y encima el rectángulo
 * del corazón se veía dibujado a tiralíneas porque el borde de la meseta era su
 * borde.
 *
 * Lo que una ladera hace es subir cuanto más adentro está del macizo, así que
 * la cota sale de eso: la distancia de cada celda de montaña a la celda más
 * cercana que **no** es montaña. En el borde del prado la roca asoma un palmo;
 * catorce celdas adentro es una pared. Y así el macizo empalma con la sierra de
 * `ridge.ts`, que arranca desde la cota del borde del mapa y sigue subiendo.
 *
 * Se calcula una vez por mapa y se guarda: es una anchura de BFS sobre ocho mil
 * celdas, y `elevationAt` lo pregunta por cada cosa que pisa el valle y por cada
 * fotograma.
 */
const RISES = new WeakMap<ValleyMap, Float32Array>();

/** TUNE: cuánto sube la roca por cada celda adentro del macizo. */
const MOUNTAIN_SLOPE = 0.6;
/** TUNE: y hasta dónde. Seis celdas son dieciocho metros: una ladera, no un pico. */
const MOUNTAIN_RISE = 6;

function risesOf(map: ValleyMap): Float32Array {
  const known = RISES.get(map);
  if (known !== undefined) return known;

  const cells = map.width * map.height;
  const depth = new Int16Array(cells).fill(-1);
  const queue: number[] = [];
  for (let cell = 0; cell < cells; cell += 1) {
    if (map.terrain[cell] === TERRAIN_CODE.mountain) continue;
    depth[cell] = 0;
    queue.push(cell);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head] as number;
    const x = cell % map.width;
    const y = Math.floor(cell / map.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const next = ny * map.width + nx;
      if (depth[next] !== -1) continue;
      depth[next] = (depth[cell] as number) + 1;
      queue.push(next);
    }
  }

  const rises = new Float32Array(cells);
  for (let cell = 0; cell < cells; cell += 1) {
    // Una montaña rodeada de montaña hasta el borde del mapa no tiene fondo
    // conocido: cuenta como lo más alto, que es lo que hay pegado a la sierra.
    const deep = depth[cell] as number;
    const from = deep < 0 ? MOUNTAIN_RISE / MOUNTAIN_SLOPE : deep;
    rises[cell] = Math.min(MOUNTAIN_RISE, from * MOUNTAIN_SLOPE);
  }
  RISES.set(map, rises);
  return rises;
}

/**
 * La altura de una esquina de celda, promediando las celdas que la tocan.
 *
 * Promediar es lo que da la orilla. Bajando la celda entera de golpe, el rio
 * queda con paredes verticales y un escalon en cada borde; promediando, el
 * prado baja hacia el agua y sube desde ella.
 */
/**
 * Cuanto se hunde un camino segun lo pisado que este, en celdas.
 *
 * Un camino era solo un color mas claro. Un camino de verdad es una rodada: el
 * paso se lleva la hierba y luego la tierra, y lo que se ve desde arriba es la
 * sombra del borde. TUNE: seis centimetros la senda, quince el camino real.
 */
const RUT: readonly number[] = [0, -0.02, -0.035, -0.05];

/** La cota de una **esquina** de celda, promediando las celdas que la tocan. */
function heightAt(map: ValleyMap, x: number, z: number): number {
  const rises = risesOf(map);
  let total = 0;
  let seen = 0;
  for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) {
    const cx = x + dx;
    const cz = z + dz;
    if (cx < 0 || cz < 0 || cx >= map.width || cz >= map.height) continue;
    const cell = cz * map.width + cx;
    total += RELIEF[map.terrain[cell] ?? 0] ?? 0;
    // Y lo que la montaña levanta, que depende de dónde está y no sólo de qué es.
    if (map.terrain[cell] === TERRAIN_CODE.mountain) total += rises[cell] as number;
    // La rodada se suma al terreno, no lo sustituye: un vado es camino sobre
    // agua y tiene que seguir estando mas bajo que el prado.
    total += RUT[Math.min(RUT.length - 1, map.path[cell] ?? 0)] ?? 0;
    seen += 1;
  }
  return seen === 0 ? 0 : total / seen;
}

/**
 * A que altura esta la lamina de agua, en celdas.
 *
 * Por encima del fondo del cauce y por debajo de la orilla, que es lo que hace
 * que el borde del prado asome dentro del agua y se lea como ribera en vez de
 * como un corte.
 */
const WATER_LEVEL = -0.10;

/**
 * La lamina de agua sobre las celdas de rio.
 *
 * El suelo esta pintado con color por vertice y un solo material mate: un rio
 * pintado ahi es hierba azul. El agua necesita ser otra superficie porque lo
 * que la distingue no es el color, es que brilla y el prado no. Va aparte
 * tambien porque es plana: el cauce baja, ella no, y esa diferencia es la que
 * dibuja la orilla.
 */
function buildWater(map: ValleyMap, palette: Palette): Mesh | null {
  const cells: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] === 2) cells.push(cell);
  }
  if (cells.length === 0) return null;

  const positions = new Float32Array(cells.length * 4 * 3);
  const indices = new Uint32Array(cells.length * 6);
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index] ?? 0;
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    const corner = index * 4;
    const points = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]] as const;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const at = (corner + vertex) * 3;
      // La misma esquina movida que el suelo: si la lamina se quedara en la
      // cuadricula, el agua asomaria por fuera del cauce.
      const moved = wobbleAt(map, points[vertex]?.[0] ?? 0, points[vertex]?.[1] ?? 0);
      positions[at] = moved.x;
      positions[at + 1] = GROUND_BIAS + WATER_LEVEL;
      positions[at + 2] = moved.z;
    }
    const face = index * 6;
    indices[face] = corner;
    indices[face + 1] = corner + 2;
    indices[face + 2] = corner + 1;
    indices[face + 3] = corner;
    indices[face + 4] = corner + 3;
    indices[face + 5] = corner + 2;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new MeshStandardMaterial({
    color: palette.water,
    roughness: 0.18,
    metalness: 0.1,
    // Translucida lo justo para que el fondo del cauce se intuya. Del todo
    // opaca el rio es una chapa; del todo clara no hay rio.
    transparent: true,
    opacity: 0.86,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Water';
  // No recibe sombra: un rio a la sombra de sus propios arboles se veia negro,
  // y el agua de un valle refleja el cielo aunque tenga un roble encima.
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Cuanto sube y baja la superficie del agua, en celdas.
 *
 * TUNE: dos centesimas, seis centimetros. Lo que se ve desde arriba no es la
 * ola: es que la luz cambia al inclinarse la superficie, y con seis centimetros
 * ya cambia. Con mas, el rio parece el mar.
 */
const RIPPLE = 0.02;

/** Cuanto tarda la onda en recorrer una celda, en segundos. */
const RIPPLE_SECONDS = 2.2;

/**
 * La cota del suelo en un punto cualquiera, en celdas.
 *
 * `heightAt` vale para esquinas de celda, que son los vertices de la malla. Un
 * aldeano no anda por las esquinas: anda por el medio, asi que aqui se
 * interpola entre las cuatro que le rodean. Es exactamente la superficie que se
 * dibuja, asi que nadie flota ni se hunde.
 *
 * Se exporta porque en cuanto el suelo dejo de ser plano dejo de valer poner
 * las cosas a cero. Todo lo que pisa el valle pregunta aqui.
 */
export function elevationAt(map: ValleyMap, x: number, z: number): number {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  const fx = x - cx;
  const fz = z - cz;
  const a = heightAt(map, cx, cz);
  const b = heightAt(map, cx + 1, cz);
  const c = heightAt(map, cx, cz + 1);
  const d = heightAt(map, cx + 1, cz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

export interface Ground {
  readonly mesh: Mesh;
  /** La lamina de agua, o `null` si el mapa no tiene rio. */
  readonly water: Mesh | null;
  /**
   * Hace correr el agua.
   *
   * Un rio quieto es un suelo azul, por bien hecho que este el cauce. Lo que
   * dice que eso es agua y no piedra pintada es que se mueve, y basta con que
   * la superficie se incline un poco para que la luz haga el resto.
   *
   * La hora sale del reloj de presentacion y de nada mas, asi que el mismo
   * instante da siempre la misma onda (§4.3).
   */
  ripple(presentationSeconds: number): void;
  dispose(): void;
}

/**
 * La plaza, como el suelo la necesita: dónde está y cuánto mide.
 *
 * Llega de fuera —del estado, `GameState.plaza`, y de `PLAZA.RADIUS`— porque
 * esta capa no puede importar del motor (`CLAUDE.md`, las cuatro capas).
 */
export interface Plaza { readonly x: number; readonly y: number; readonly radius: number }

/** La firma de presentación añade la era a la firma pura del mapa. */
export function groundAppearanceKey(ground: number, era: Era): string {
  return `${ground}:${era}`;
}

export function buildGround(map: ValleyMap, palette: Palette, plaza?: Plaza, era: Era = 'hamlet'): Ground {
  const cells = map.width * map.height;
  const positions = new Float32Array(cells * 4 * 3);
  const colours = new Float32Array(cells * 4 * 3);
  const normals = new Float32Array(cells * 4 * 3);
  const indices = new Uint32Array(cells * 6);
  const tint = new Color();

  for (let cell = 0; cell < cells; cell += 1) {
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    const corner = cell * 4;

    // Map (x, y) becomes scene (x, 0, y), per D.4's spatial convention.
    const points = [
      [x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1],
    ] as const;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const at = (corner + vertex) * 3;
      const px = points[vertex]?.[0] ?? 0;
      const pz = points[vertex]?.[1] ?? 0;
      // La cota se toma en la esquina de la cuadricula y el vertice se dibuja
      // movido: el relieve es el mismo, el borde no es recto.
      const moved = wobbleAt(map, px, pz);
      positions[at] = moved.x;
      positions[at + 1] = GROUND_BIAS + heightAt(map, px, pz);
      positions[at + 2] = moved.z;
      normals[at] = 0;
      normals[at + 1] = 1;
      normals[at + 2] = 0;
      cornerColour(map, cell, px, pz, palette, tint, plaza, era);
      const shade = 1 + mottleAt(px, pz) + patchAt(px, pz);
      colours[at] = tint.r * shade;
      colours[at + 1] = tint.g * shade;
      colours[at + 2] = tint.b * shade;
    }

    const face = cell * 6;
    indices[face] = corner;
    indices[face + 1] = corner + 2;
    indices[face + 2] = corner + 1;
    indices[face + 3] = corner;
    indices[face + 4] = corner + 3;
    indices[face + 5] = corner + 2;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  // Las normales se recalculan porque el suelo dejo de ser plano en cuanto el
  // rio se hundio: con todas apuntando arriba, la orilla no coge luz y el cauce
  // no se ve.
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Ground';
  mesh.receiveShadow = true;

  // El agua cuelga del suelo para que quien pone el suelo en la escena no tenga
  // que saber que ademas hay un rio: se mueven y se sueltan juntos siempre.
  const water = buildWater(map, palette);
  if (water !== null) mesh.add(water);
  // El reposo se guarda una vez: la onda se calcula desde el, no desde donde
  // quedo el fotograma anterior, que acumularia error hasta hundir el rio.
  const still = water === null
    ? null
    : Float32Array.from((water.geometry.getAttribute('position') as BufferAttribute).array);

  return {
    mesh,
    water,
    ripple(presentationSeconds: number): void {
      if (water === null || still === null) return;
      const surface = water.geometry.getAttribute('position') as BufferAttribute;
      const turn = (presentationSeconds / RIPPLE_SECONDS) * Math.PI * 2;
      for (let vertex = 0; vertex < surface.count; vertex += 1) {
        const at = vertex * 3;
        const px = still[at] ?? 0;
        const pz = still[at + 2] ?? 0;
        // La onda viaja en diagonal y lleva dos frecuencias: una sola deja un
        // oleaje de piscina, con dos el patron tarda en repetirse.
        const wave = Math.sin((px + pz) * 1.7 - turn) + 0.5 * Math.sin((px - pz * 1.3) * 0.9 - turn * 0.6);
        surface.setY(vertex, (still[at + 1] ?? 0) + wave * RIPPLE * 0.5);
      }
      surface.needsUpdate = true;
      water.geometry.computeVertexNormals();
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
      if (water !== null) {
        mesh.remove(water);
        water.geometry.dispose();
        (water.material as MeshStandardMaterial).dispose();
      }
    },
  };
}
