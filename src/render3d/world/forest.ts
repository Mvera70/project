import { visibleBuildings } from '@derive/visible-buildings';
// G-10, lote del mundo · El bosque. design.md D.8, D.9.
//
// Un valle maduro tiene varios cientos de celdas de bosque. Un árbol por celda
// como objeto suelto serían varios cientos de llamadas de dibujo, y D.9 nombra
// este caso concreto: **instanciar árboles**. Una malla por material, y cada
// árbol es una matriz dentro de ella. Trescientos árboles cuestan tres llamadas.
//
// Dónde va cada uno sale de su celda y de nada más. §4.3 prohíbe que el render
// consuma azar, y además un bosque que se resembrara en cada fotograma sería
// peor que uno alineado: aquí el mismo valle da siempre el mismo bosque.

import {
  Box3, CylinderGeometry, InstancedMesh, Group, Matrix4, MeshStandardMaterial, Quaternion, Vector3,
  type BufferGeometry, type Camera, type Color, type Material, type Object3D,
} from 'three';
import type { Building, ValleyMap } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import type { Palette } from '@derive/palette';
import { forestLooks, type ForestState } from './forest-state';
import { elevationAt } from './ground';
import {
  forestOccluders, type ForestOccluder, type ForestRevealTarget,
} from './forest-occlusion';

/**
 * Cuántos árboles caben en una celda de bosque.
 *
 * TUNE: uno. Una copa mide casi tres celdas de ancho, así que uno por celda ya
 * se solapa con sus vecinos y lee como espesura. Dos por celda no añadían
 * bosque, añadían triángulos.
 */
const PER_CELL = 1;

/** Cuánto varía el tamaño de un árbol al siguiente, en tanto por uno. */
const SIZE_SPREAD = 0.28;

/** Cuánto se aparta del centro de su celda, en celdas. */
const JITTER = 0.34;

function stable(cell: number, salt: number): number {
  const mixed = Math.imul(cell * 73_856_093 + salt * 19_349_663, 2_654_435_761) >>> 0;
  return (mixed % 100_003) / 100_003;
}

/** Contrato común del tronco visible y su obstáculo físico. */
export function scatterTransform(width: number, cell: number, extra = 0): { x: number; z: number; scale: number; facing: number } {
  const salt = extra * 977;
  return {
    x: cell % width + 0.5 + (stable(cell, salt + 1) - 0.5) * 2 * JITTER,
    z: Math.floor(cell / width) + 0.5 + (stable(cell, salt + 2) - 0.5) * 2 * JITTER,
    scale: 1 + (stable(cell, salt + 3) - 0.5) * 2 * SIZE_SPREAD,
    facing: stable(cell, salt + 4) * Math.PI * 2,
  };
}

export interface Piece {
  readonly geometry: BufferGeometry;
  readonly material: Material;
}

/** Las mallas de un recurso, aplanadas y con su transformación ya incorporada. */
export function piecesOf(source: Object3D): Piece[] {
  const pieces: Piece[] = [];
  source.updateMatrixWorld(true);
  source.traverse((object) => {
    const mesh = object as Object3D & { isMesh?: boolean; geometry?: BufferGeometry; material?: Material };
    if (mesh.isMesh !== true || mesh.geometry === undefined || mesh.material === undefined) return;
    // La geometría se clona con la transformación del nodo aplicada, para que
    // la instancia sólo tenga que colocar el árbol entero.
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    pieces.push({ geometry, material: mesh.material });
  });
  return pieces;
}

export interface Forest {
  readonly group: Group;
  /** Cuántos árboles adultos hay plantados. */
  readonly count: number;
  /** Cuántos plantones transitables representan un rebrote en curso. */
  readonly regrowthCount: number;
  /** Cuántos claros recién talados conservan el tocón. */
  readonly stumpCount: number;
  /** Árboles atenuados por estar entre la cámara y el asalto. */
  readonly revealedCount: number;
  /** Actualiza la oclusión selectiva; una lista vacía restaura el bosque. */
  reveal(camera: Camera, targets: readonly ForestRevealTarget[]): number;
  /**
   * IA-anim · Inclina el árbol de una celda sobre su base, hacia `(x, z)`, y
   * `angle = 0` lo devuelve a su sitio. Sólo toca las matrices de ese árbol:
   * un hachazo no rehace el bosque. Devuelve si la celda tenía árbol.
   */
  sway(cell: number, x: number, z: number, angle: number): boolean;
  season(palette: Palette): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Los pinos, en la loma de la montaña.
//
// **Corrección del 18 sep 2026, del dueño del diseño**: «los pinos deben salir
// en la loma de la montaña, están mal puestos». La primera versión los ponía en
// el **bosque** próximo a la falda —sustituían un árbol de hoja por una conífera
// en las celdas de bosque a menos de siete celdas de la montaña— y eso es otra
// cosa: un pinar dentro del robledal. Lo que pidió es lo que se ve en un valle
// de verdad: coníferas **subiendo la ladera**, donde ya no crece el bosque.
//
// Y con sus palabras, las tres condiciones: «en grupos de 3, 2 y 1, de
// diferentes tamaños», «por los alrededores del mapa más pegado a la montaña».
//
// Medido para elegir la banda (tres semillas): la montaña ocupa media hoja
// —3 980 celdas de 8 064— y sube de cota 0,15 a 6,00. Por cotas: de 0,15 a 0,5
// hay unas 500 celdas, de 0,5 a 1 unas 460, de 1 a 1,5 unas 280, y por encima
// de 2,5 más de dos mil. La loma es la banda baja: por debajo es el pie llano
// del prado, donde el bosque ya planta lo suyo, y por encima es roca pelada
// donde un pino no se agarra.
// ---------------------------------------------------------------------------

/** La cota entre la que un pino agarra en la ladera. */
const LOMA_LOW = 0.2;
const LOMA_HIGH = 1.6;

/**
 * Cuántas de las anclas posibles se quedan.
 *
 * TUNE: 0,18. La banda tiene de 1 250 a 1 350 celdas por valle, y una ancla por
 * celda daría más de cien corros: una ladera tapizada de pinos, que no es lo que
 * se pidió. Con esta parte salen de 17 a 26 corros y de 30 a 50 pinos, que es la
 * densidad de la primera versión —la que se vio bien, sólo que en el sitio
 * equivocado—.
 */
const ANCHOR_SHARE = 0.18;

/** Si esa celda es ladera de montaña donde un pino agarra. */
function onHillside(map: ValleyMap, cell: number): boolean {
  if (map.terrain[cell] !== TERRAIN_CODE.mountain) return false;
  const x = cell % map.width, z = Math.floor(cell / map.width);
  const height = elevationAt(map, x + 0.5, z + 0.5);
  return height >= LOMA_LOW && height <= LOMA_HIGH;
}

/**
 * Los pinos del valle: corros de uno a tres, separados entre sí, en la ladera.
 *
 * Determinista y sin azar del motor: el sitio sale de la celda, como todo lo
 * que este módulo planta (§4.3). El mismo valle da los mismos pinos.
 */
export function pineCells(map: ValleyMap): ReadonlySet<number> {
  const candidates = new Set<number>();
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (onHillside(map, cell)) candidates.add(cell);
  }
  const neighbours = (cell: number): number[] => {
    const x = cell % map.width, z = Math.floor(cell / map.width), around: number[] = [];
    for (let dz = -1; dz <= 1; dz += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dz === 0) continue;
      const nx = x + dx, nz = z + dz;
      if (nx >= 0 && nz >= 0 && nx < map.width && nz < map.height) around.push(nz * map.width + nx);
    }
    return around;
  };
  // Un ancla es la celda de menor rango de su vecindad —así no hay dos anclas
  // pegadas— y sólo una parte de ellas se queda, para que la ladera respire.
  const anchors = [...candidates].filter(cell => {
    if (stable(cell, 823) >= ANCHOR_SHARE) return false;
    const rank = stable(cell, 211);
    return neighbours(cell).every(near => !candidates.has(near) || stable(near, 211) >= rank);
  }).sort((a, b) => stable(a, 313) - stable(b, 313) || a - b);
  const selected = new Set<number>(), reserved = new Set<number>();
  for (const anchor of anchors) {
    if (reserved.has(anchor)) continue;
    const companions = neighbours(anchor).filter(cell => candidates.has(cell) && !reserved.has(cell))
      .sort((a, b) => stable(a, anchor + 419) - stable(b, anchor + 419) || a - b);
    // Uno, dos o tres. La cuenta sale del ancla, así que un corro de tres es
    // siempre el mismo corro de tres.
    const group = [anchor, ...companions].slice(0, 1 + Math.floor(stable(anchor, 421) * 3));
    for (const cell of group) {
      selected.add(cell); reserved.add(cell);
      for (const near of neighbours(cell)) reserved.add(near);
    }
  }
  return selected;
}

/**
 * Lo que mide cada pino: tres tamaños, «de diferentes tamaños».
 *
 * TUNE: 0,78, 1 y 1,2, repartidos a tercios por la celda. Un pinar de clones se
 * lee como un patrón; con tres alturas la ladera parece crecida.
 */
export function pineScaleAt(cell: number): number {
  const rank = stable(cell, 577);
  return rank < 0.34 ? 0.78 : rank < 0.68 ? 1 : 1.2;
}

/**
 * Planta un árbol en cada celda de bosque del mapa.
 *
 * Se rehace cuando el suelo cambia, que es cuando alguien tala: unas pocas veces
 * al año, no sesenta veces por segundo.
 */
export function buildForest(
  state: ForestState,
  tree: Object3D,
  palette?: Palette,
  suppressed: ReadonlySet<number> = new Set(),
  pine?: Object3D,
): Forest {
  const looks = forestLooks(state, suppressed);
  const byCell = new Map(looks.map(look => [look.cell, look]));
  const growing = looks.filter(look => look.stage !== 'stump');
  const scaleFor = (cell: number, material: string): number => {
    const look = byCell.get(cell);
    if (look === undefined) return 1;
    if (look.stage === 'regrowth') return look.size;
    return material.includes('leaf') ? look.crown : 1;
  };
  // El bosque es de hoja, entero: los pinos **no salen del bosque** desde la
  // corrección del 18 sep 2026, salen de la ladera (ver `pineCells`).
  const scattered = scatterCells(
    state.map,
    tree,
    growing.map(look => look.cell),
    palette,
    false,
    false,
    scaleFor,
    true,
  );
  // Y los pinos, en la loma, con su tamaño propio. No dependen de `forestLooks`
  // —no son bosque que se tale— así que su escala es sólo la del pino.
  const conifers = pine === undefined ? null : scatterCells(state.map, pine,
    [...pineCells(state.map)], palette, false, false,
    (cell) => pineScaleAt(cell));
  const group = conifers === null ? scattered.group : new Group();
  if (conifers !== null) { group.name = 'Valley_Forest'; group.add(scattered.group, conifers.group); }
  const stumpCells = looks.filter(look => look.stage === 'stump').map(look => look.cell);
  const stumpGeometry = new CylinderGeometry(0.16, 0.2, 0.22, 8);
  stumpGeometry.translate(0, 0.11, 0);
  const stumpMaterial = new MeshStandardMaterial({ color: palette?.wood ?? '#735338', roughness: 1 });
  stumpMaterial.name = 'stump';
  const stumps = new InstancedMesh(stumpGeometry, stumpMaterial, stumpCells.length);
  stumps.name = 'Forest_Stumps';
  stumps.castShadow = true;
  stumps.receiveShadow = true;
  const matrix = new Matrix4();
  const position = new Vector3();
  const turn = new Quaternion();
  const size = new Vector3();
  const up = new Vector3(0, 1, 0);
  for (let slot = 0; slot < stumpCells.length; slot += 1) {
    const at = scatterTransform(state.map.width, stumpCells[slot]!);
    position.set(at.x, 0, at.z);
    turn.setFromAxisAngle(up, at.facing);
    size.setScalar(at.scale);
    matrix.compose(position, turn, size);
    stumps.setMatrixAt(slot, matrix);
  }
  if (stumpCells.length > 0) {
    stumps.instanceMatrix.needsUpdate = true;
    stumps.computeBoundingSphere();
    group.add(stumps);
  }
  return {
    group,
    count: looks.filter(look => look.stage === 'standing').length,
    regrowthCount: looks.filter(look => look.stage === 'regrowth').length,
    stumpCount: stumpCells.length,
    get revealedCount(): number { return scattered.revealedCount; },
    reveal(camera, targets): number { return scattered.reveal(camera, targets); },
    sway(cell, x, z, angle): boolean { return scattered.sway(cell, x, z, angle); },
    season(palette): void {
      scattered.season(palette);
      conifers?.season(palette);
      stumpMaterial.color.set(palette.wood);
    },
    dispose(): void {
      scattered.dispose();
      conifers?.dispose();
      if (conifers !== null) group.remove(scattered.group, conifers.group);
      if (stumpCells.length > 0) group.remove(stumps);
      stumps.dispose();
      stumpGeometry.dispose();
      stumpMaterial.dispose();
    },
  };
}

/**
 * Tine el follaje con el verde de la estación.
 *
 * El suelo cambiaba de color con la estación desde G-08 y el bosque no: en
 * octubre el valle se ponía de oro y los árboles seguían de mayo. **El color lo
 * pone §10.3**, el mismo que pinta el suelo y el mismo que usa el render 2D:
 * aquí no se decide ningún verde, sólo se aplica el que ya estaba decidido.
 *
 * Sólo toca el follaje, nunca el tronco: la corteza no cambia con el año.
 */
export function tintFoliage(material: Material, palette: Palette): void {
  const painted = material as Material & { name: string; color?: Color };
  if (painted.color === undefined) return;
  if (painted.name.includes('leaf-light') || painted.name.includes('reed-light')) {
    painted.color.set(palette.forest);
  } else if (painted.name.includes('leaf') || painted.name.includes('reed')) {
    painted.color.set(palette.forestDark);
  }
}

/** Copia y tiñe los materiales de un árbol suelto sin tocar la biblioteca. */
export function seasonTree(source: Object3D, palette: Palette): Material[] {
  const owned: Material[] = [];
  source.traverse((object) => {
    const mesh = object as Object3D & { isMesh?: boolean; material?: Material | Material[] };
    if (mesh.isMesh !== true || mesh.material === undefined) return;
    const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => {
      const copy = material.clone();
      tintFoliage(copy, palette);
      owned.push(copy);
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0]!;
  });
  return owned;
}

/**
 * Lo mismo para cualquier terreno: un recurso repetido sobre las celdas de un
 * tipo. Los arboles sobre el bosque y las rocas sobre la roca son el mismo
 * problema, y separarlos habria sido tener dos veces la misma cuenta.
 */
export function scatterOn(
  map: ValleyMap, source: Object3D, terrain: number, palette?: Palette, taken?: ReadonlySet<number>,
): Forest {
  const cells: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    // Un arbol dentro de una casa es un arbol dentro de una casa. El motor deja
    // levantar sobre bosque talado sin cambiar el terreno de la celda, asi que
    // esto hay que mirarlo aqui.
    if (map.terrain[cell] === terrain && taken?.has(cell) !== true
      && (terrain !== TERRAIN_CODE.rock || (map.path[cell] ?? 0) === 0)) cells.push(cell);
  }
  return scatterCells(map, source, cells, palette, terrain === TERRAIN_CODE.rock, terrain === TERRAIN_CODE.rock);
}

/**
 * Las celdas que ocupa lo construido.
 *
 * Incluye las ruinas: §7.4 las deja en el mapa, y un junco creciendo entre los
 * postes quemados de una casa es exactamente igual de raro.
 */
export function builtCells(state: { buildings: readonly Building[]; map: ValleyMap }): Set<number> {
  const taken = new Set<number>();
  for (const building of visibleBuildings(state)) {
    for (let row = 0; row < building.h; row += 1) {
      for (let column = 0; column < building.w; column += 1) {
        taken.add((building.y + row) * state.map.width + building.x + column);
      }
    }
  }
  return taken;
}

/**
 * Las celdas de prado que tocan el agua, que es donde crecen los juncos.
 *
 * La orilla no es un terreno: el mapa no la nombra y no tiene por que. Es la
 * frontera entre dos que si nombra, y sale de mirar los cuatro vecinos.
 */
export function shoreCells(map: ValleyMap, taken?: ReadonlySet<number>): number[] {
  const cells: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] !== TERRAIN_CODE.meadow) continue;
    // Nada crece en mitad de un camino pisado, ni debajo de lo construido: se
    // veian juncos saliendo por el suelo del molino y del embarcadero.
    if ((map.path[cell] ?? 0) > 0) continue;
    if (taken?.has(cell) === true) continue;
    const x = cell % map.width;
    const wet = [
      x > 0 ? cell - 1 : -1,
      x < map.width - 1 ? cell + 1 : -1,
      cell - map.width,
      cell + map.width,
    ].some((side) => side >= 0 && map.terrain[side] === TERRAIN_CODE.water);
    if (wet) cells.push(cell);
  }
  return cells;
}

/** Monte bajo decorativo en bordes, con un cinturón libre junto a accesos.
 * TUNE visual: se conserva aproximadamente un tercio de candidatos, sin azar
 * del motor ni obstáculos nuevos. El interior de los prados sigue despejado. */
export function scrubCells(map: ValleyMap, taken: ReadonlySet<number>): number[] {
  const cells: number[] = [];
  const selected = new Set<number>();
  for (let cell = 0; cell < map.terrain.length; cell++) {
    if (map.terrain[cell] !== TERRAIN_CODE.meadow || stable(cell, 83) >= 0.33) continue;
    const x = cell % map.width, z = Math.floor(cell / map.width);
    const adjacent = [cell - 1, cell + 1, cell - map.width, cell + map.width];
    if (!adjacent.some(n => map.terrain[n] === TERRAIN_CODE.forest || map.terrain[n] === TERRAIN_CODE.rock)) continue;
    let clear = true;
    for (let dz = -1; dz <= 1 && clear; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, nz = z + dz, neighbour = nz * map.width + nx;
      if (nx < 0 || nx >= map.width || nz < 0 || nz >= map.height
        || taken.has(neighbour) || selected.has(neighbour) || (map.path[neighbour] ?? 0) > 0
        || map.terrain[neighbour] === TERRAIN_CODE.water || map.terrain[neighbour] === TERRAIN_CODE.ford) {
        clear = false;
        break;
      }
    }
    if (clear) { cells.push(cell); selected.add(cell); }
  }
  return cells;
}

/** Lo mismo sobre una lista de celdas ya elegida. */
export function scatterCells(
  map: ValleyMap, source: Object3D, cells: readonly number[], palette?: Palette,
  containInCell = false, varyRockSize = false,
  scaleFor?: (cell: number, material: string) => number,
  occludable = false,
): Forest {
  const tree = source;
  const group = new Group();
  group.name = 'Valley_Forest';
  const pieces = piecesOf(tree);
  // Una roca bloquea su celda, no la vecina. Su caja girada y escalada debe
  // caber entera; comprobar solo el origen dejaba piedras dentro de caminos.
  const bounds = new Box3();
  if (containInCell) for (const piece of pieces) {
    piece.geometry.computeBoundingBox();
    if (piece.geometry.boundingBox !== null) bounds.union(piece.geometry.boundingBox);
  }
  const owned: InstancedMesh[] = [];
  const faded: InstancedMesh[] = [];
  const tinted: Material[] = [];
  const fadedMaterials: Material[] = [];
  const matrices: Matrix4[][] = [];
  const total = cells.length * PER_CELL;
  const occluders: ForestOccluder[] = [];
  if (occludable) {
    const sourceBounds = new Box3().setFromObject(tree);
    const sourceCentre = sourceBounds.getCenter(new Vector3());
    const sourceRadius = sourceBounds.getSize(new Vector3()).length() / 2;
    for (const cell of cells) for (let extra = 0; extra < PER_CELL; extra += 1) {
      const scattered = scatterTransform(map.width, cell, extra);
      const visualScale = pieces.reduce((largest, piece) => Math.max(
        largest, scaleFor?.(cell, piece.material.name) ?? 1,
      ), 0);
      const scale = scattered.scale * visualScale;
      occluders.push({
        x: scattered.x,
        y: sourceCentre.y * scale,
        z: scattered.z,
        radius: sourceRadius * scale,
      });
    }
  }

  if (total > 0) {
    const matrix = new Matrix4();
    const position = new Vector3();
    const turn = new Quaternion();
    const size = new Vector3();
    const up = new Vector3(0, 1, 0);

    for (const piece of pieces) {
      // El material se copia cuando hay estación que aplicar: el del recurso es
      // de la biblioteca y pintarlo aquí se lo pintaría a todo el que lo use.
      const material = palette === undefined ? piece.material : piece.material.clone();
      if (palette !== undefined) tintFoliage(material, palette);
      const instanced = new InstancedMesh(piece.geometry, material, total);
      instanced.castShadow = true;
      // La copa tiene muchas caras pequeñas: recibir su propia sombra hace
      // parpadear los contornos al girar el sol. Sigue proyectando sombra al
      // suelo y al tronco, que sí conservan el movimiento de la jornada.
      instanced.receiveShadow = !piece.material.name.includes('leaf');
      let slot = 0;
      const pieceMatrices: Matrix4[] = [];
      for (const cell of cells) {
        for (let extra = 0; extra < PER_CELL; extra += 1) {
          const scattered = scatterTransform(map.width, cell, extra);
          const { facing } = scattered;
          let { x, z, scale } = scattered;
          let heightScale = scale;
          const visualScale = scaleFor?.(cell, piece.material.name) ?? 1;
          scale *= visualScale;
          heightScale *= visualScale;
          if (containInCell && !bounds.isEmpty()) {
            const rotated = bounds.clone().applyMatrix4(new Matrix4().makeRotationY(facing));
            const span = rotated.getSize(new Vector3());
            const fit = 1 / Math.max(span.x, span.z);
            if (varyRockSize) {
              // TUNE visual: guijarros, piedras medianas y bloques dominantes.
              // Antes el límite recortaba todas las escalas grandes al mismo
              // tamaño. Elegimos la ocupación DESPUÉS de calcular ese límite.
              const rank = stable(cell, 117);
              const occupancy = rank < 0.3 ? 0.28 + rank * 0.6
                : rank < 0.7 ? 0.58 + (rank - 0.3) * 0.65
                  : 0.9 + (rank - 0.7) * 0.3;
              scale = fit * occupancy;
              heightScale = scale * (1.05 + stable(cell, 151) * 0.85);
            } else {
              scale = Math.min(scale, fit);
              heightScale = scale;
            }
            const left = cell % map.width, top = Math.floor(cell / map.width);
            x = Math.max(left - rotated.min.x * scale, Math.min(x, left + 1 - rotated.max.x * scale));
            z = Math.max(top - rotated.min.z * scale, Math.min(z, top + 1 - rotated.max.z * scale));
          }
          position.set(x, 0, z);
          // Girar cada uno lo suyo: una copa asimétrica repetida sin girar deja
          // un patrón que se ve desde arriba como un papel pintado.
          turn.setFromAxisAngle(up, facing);
          size.set(scale, heightScale, scale);
          matrix.compose(position, turn, size);
          instanced.setMatrixAt(slot, matrix);
          if (occludable) pieceMatrices.push(matrix.clone());
          slot += 1;
        }
      }
      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingSphere();
      group.add(instanced);
      owned.push(instanced);
      if (palette !== undefined) tinted.push(material);
      if (occludable) {
        matrices.push(pieceMatrices);
        // TUNE visual contrastado en captura: 0,06 evita que varias copas
        // superpuestas reconstruyan una pared oscura. Es material propio; el
        // GLB compartido nunca se modifica.
        const fadedMaterial = material.clone();
        fadedMaterial.transparent = true;
        fadedMaterial.opacity = 0.06;
        fadedMaterial.depthWrite = false;
        const revealed = new InstancedMesh(piece.geometry, fadedMaterial, total);
        revealed.name = `${instanced.name || material.name}_revealed`;
        revealed.count = 0;
        revealed.castShadow = false;
        revealed.receiveShadow = true;
        faded.push(revealed);
        fadedMaterials.push(fadedMaterial);
      }
    }
  }

  let revealedSlots = '';
  let revealedCount = 0;
  const slotOf = new Map(cells.map((cell, index) => [cell, index * PER_CELL]));

  function sway(cell: number, x: number, z: number, angle: number): boolean {
    // Con el robledal atenuado los huecos se reparten de otra manera: ese rato
    // el árbol no se mueve, antes que mover el que no es.
    const slot = slotOf.get(cell);
    if (!occludable || slot === undefined || revealedCount > 0) return false;
    const base = new Vector3(), turn = new Quaternion(), size = new Vector3();
    const axis = new Vector3(z, 0, -x);
    if (axis.lengthSq() < 1e-9) axis.set(1, 0, 0);
    const tilt = new Quaternion().setFromAxisAngle(axis.normalize(), angle);
    const matrix = new Matrix4();
    for (let piece = 0; piece < owned.length; piece += 1) {
      matrices[piece]![slot]!.decompose(base, turn, size);
      matrix.compose(base, tilt.clone().multiply(turn), size);
      owned[piece]!.setMatrixAt(slot, matrix);
      owned[piece]!.instanceMatrix.needsUpdate = true;
    }
    return true;
  }

  function reveal(camera: Camera, targets: readonly ForestRevealTarget[]): number {
    if (!occludable || total === 0) return 0;
    const slots = forestOccluders(occluders, camera, targets);
    const signature = slots.join(',');
    if (signature === revealedSlots) return revealedCount;
    revealedSlots = signature;
    revealedCount = slots.length;
    const selected = new Set(slots);
    for (let piece = 0; piece < owned.length; piece += 1) {
      const opaque = owned[piece]!;
      const translucent = faded[piece]!;
      const transforms = matrices[piece]!;
      if (slots.length > 0 && translucent.parent !== group) group.add(translucent);
      if (slots.length === 0 && translucent.parent === group) group.remove(translucent);
      let solidSlot = 0, fadedSlot = 0;
      for (let slot = 0; slot < transforms.length; slot += 1) {
        if (selected.has(slot)) {
          translucent.setMatrixAt(fadedSlot, transforms[slot]!);
          fadedSlot += 1;
        } else {
          opaque.setMatrixAt(solidSlot, transforms[slot]!);
          solidSlot += 1;
        }
      }
      opaque.count = solidSlot;
      translucent.count = fadedSlot;
      opaque.instanceMatrix.needsUpdate = true;
      translucent.instanceMatrix.needsUpdate = true;
      opaque.computeBoundingSphere();
      translucent.computeBoundingSphere();
    }
    return revealedCount;
  }

  return {
    group,
    count: total,
    regrowthCount: 0,
    stumpCount: 0,
    get revealedCount(): number { return revealedCount; },
    reveal,
    sway,
    season(palette): void {
      for (const material of tinted) tintFoliage(material, palette);
      for (const material of fadedMaterials) tintFoliage(material, palette);
    },
    dispose(): void {
      for (const instanced of owned) {
        group.remove(instanced);
        instanced.dispose();
        // La geometría es una copia nuestra y se suelta. El material es del
        // recurso compartido y no: soltarlo dejaría sin material a cualquier
        // otro que estuviera usando el mismo árbol.
        instanced.geometry.dispose();
      }
      for (const instanced of faded) {
        group.remove(instanced);
        instanced.dispose();
      }
      // Los materiales teñidos sí eran nuestros, y se sueltan. El del recurso,
      // cuando no hay estación que aplicar, no.
      for (const material of tinted) material.dispose();
      for (const material of fadedMaterials) material.dispose();
      tinted.length = 0;
      fadedMaterials.length = 0;
      faded.length = 0;
      matrices.length = 0;
      owned.length = 0;
    },
  };
}
