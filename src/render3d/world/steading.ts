import { piecesOf } from './forest';
import { visibleBuildings } from '@derive/visible-buildings';
// G-15 · Los trastos del corral: lo que dice que aquí vive alguien.
//
// Lo pidió el dueño del diseño al probar la demo: *«los modelos son muy
// escasos: las construcciones, los aldeanos, objetos que pueda haber por el
// mapa, como herramientas»*. Y de los tres, el que faltaba de verdad era el
// tercero: los trece tipos de edificio de §7.2 tienen todos su recurso desde
// G-10, y hay ocho aldeanos por oficio. Lo que no había era **nada entre una
// casa y la siguiente**. El valle tenía árboles, rocas y juncos —cosas que
// crecen— y ni un objeto que alguien hubiera dejado ahí.
//
// Un almiar junto a un campo, la leña apilada contra una casa y una carreta
// parada en el camino. Tres objetos y el prado deja de ser un prado.
//
// **Y no tocan el motor.** No son edificios de §7.2, no ocupan solar, no valen
// nada y no entran en el guardado: se deducen del estado igual que un árbol
// —`builtCells` y el terreno— y si mañana desaparecen, la partida es la misma.
// Por eso no hay un `BuildingKind` nuevo: lo que el motor no decide no se le
// cuenta al motor.

import {
  InstancedMesh, Matrix4, Quaternion, Vector3, Group,
  type Object3D,
} from 'three';
import { TERRAIN_CODE, type Building, type ValleyMap, type VillageStats } from '@engine/state';
import { terrainOf } from '../life/terrain';
import { homeRoutine } from '../life/home';
import { hash32 } from '@engine/rng';
import { woodStoreCells } from '../life/resource-sites';

/** Qué se deja por el valle, y contra qué se apoya. */
export const STEADING_ASSETS = ['haystack', 'log-pile', 'handcart'] as const;
export type SteadingAsset = (typeof STEADING_ASSETS)[number];

/**
 * Cuántos se ponen de cada cosa, como mucho.
 *
 * TUNE: cuatro almiares, seis leñeras y dos carretas. Salen de lo que una aldea
 * de este tamaño justifica y no de lo que llena la pantalla: un almiar por cada
 * dos o tres campos, leña contra media docena de casas, y **dos carretas**,
 * porque una aldea de veinte personas no tiene diez. Poner más es lo que
 * convierte «vive alguien aquí» en «aquí hay un almacén».
 */
export const MOST_STEADED: Readonly<Record<SteadingAsset, number>> = {
  haystack: 4,
  'log-pile': 6,
  handcart: 2,
};

/**
 * Lo cerca que pueden quedar dos cosas iguales, en celdas.
 *
 * TUNE: tres. Sin separación los cuatro almiares salían **en fila pegados**,
 * porque los candidatos son el anillo de un campo y el anillo se recorre
 * seguido: cuatro conos idénticos uno al lado del otro leen como un campamento
 * de tiendas y no como la cosecha de cuatro campos. Visto en la primera captura
 * del valle con esto puesto.
 */
const APART = 3;

/** Un sitio elegido, con su rumbo. */
export interface Steaded {
  readonly asset: SteadingAsset;
  readonly cell: number;
  /** Radianes sobre la vertical. Sale del `cell`, así que no cambia nunca. */
  readonly facing: number;
}

interface Field { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

function ringOf(map: ValleyMap, box: Field): number[] {
  const out: number[] = [];
  for (let y = box.y - 2; y <= box.y + box.h + 1; y += 1) {
    for (let x = box.x - 2; x <= box.x + box.w + 1; x += 1) {
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      if (inside || x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      out.push(y * map.width + x);
    }
  }
  return out;
}

/**
 * Dónde va cada cosa, deducido del estado.
 *
 * **Junto a algo y nunca en medio de la nada**, que es lo que separa un objeto
 * dejado de un objeto colocado: el almiar toca un campo, la leña toca una casa
 * y la carreta está en el camino más pisado que haya. Un almiar en mitad del
 * prado se lee como decorado; el mismo almiar pegado a un campo se lee como la
 * cosecha de ese campo.
 *
 * Puro y determinista: mismo estado, mismos sitios. El orden sale de `cell`, no
 * de una tirada, así que dos pintadas seguidas no mueven nada.
 */
export function steadingOf(
  state: {
    buildings: readonly Building[];
    map: ValleyMap;
    village: Pick<VillageStats, 'grain' | 'wood'>;
    tick: number;
  },
  seed: number,
): Steaded[] {
  const { map } = state;
  const taken = new Set<number>();
  for (const building of visibleBuildings(state)) {
    for (let row = 0; row < building.h; row += 1) {
      for (let column = 0; column < building.w; column += 1) {
        taken.add((building.y + row) * map.width + building.x + column);
      }
    }
  }

  // Los adornos no pueden cerrar la puerta de una vivienda. El mismo acceso
  // se usa para orientar la fachada y para la rutina de volver a casa.
  const land = terrainOf(state);
  const entrances = state.buildings.filter(building => building.lostTick === null
    && (building.kind === 'house' || building.kind === 'stone_house'))
    .map(building => homeRoutine(building, land).approach);
  const free = (cell: number): boolean => {
    const x = cell % map.width + 0.5, z = Math.floor(cell / map.width) + 0.5;
    if ((map.path[cell] ?? 0) > 0) return false;
    // Una calle de una celda no admite carros ni leña: se reserva el anillo
    // completo, incluso a los lados sin puerta y junto a las defensas.
    if (state.buildings.some(b => b.lostTick === null && b.kind !== 'field' && b.kind !== 'grave_yard'
      && x > b.x - 1 && x < b.x + b.w + 1 && z > b.y - 1 && z < b.y + b.h + 1)) return false;
    // TUNE: reserva de 1.5 celdas a cada lado del umbral para la anchura del
    // mayor adorno y el cuerpo que entra. Los candidatos se amplían un anillo.
    if (entrances.some(entry => Math.abs(entry.x - x) < 1.5 && Math.abs(entry.z - z) < 1.5)) return false;
    if (taken.has(cell)) return false;
    const kind = map.terrain[cell];
    // Prado o rastrojo. Nada sobre el agua, la marisma, la roca ni el bosque:
    // un almiar dentro de un robledal no lo puso nadie.
    return kind === TERRAIN_CODE.meadow || kind === TERRAIN_CODE.cleared;
  };

  const out: Steaded[] = [];
  const used = new Set<number>();
  const far = (asset: SteadingAsset, cell: number): boolean => {
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    return out.every((one) => {
      if (one.asset !== asset) return true;
      return Math.abs((one.cell % map.width) - x) >= APART
        || Math.abs(Math.floor(one.cell / map.width) - z) >= APART;
    });
  };
  const place = (asset: SteadingAsset, candidates: readonly number[], limit = MOST_STEADED[asset]): void => {
    for (const cell of candidates) {
      if (out.filter((one) => one.asset === asset).length >= limit) return;
      if (used.has(cell) || !free(cell) || !far(asset, cell)) continue;
      used.add(cell);
      // El rumbo sale de la celda, en ocho direcciones: un almiar y su vecino
      // mirando al mismo sitio se leen como dos copias.
      const facing = (hash32(seed, `steading:${asset}:${cell}`) % 8) * (Math.PI / 4);
      out.push({ asset, cell, facing });
    }
  };

  // La leña, contra una casa, sólo aparece después de que el valle haya vivido:
  // la reserva inicial viaja con los fundadores y no cuenta una tala inexistente.
  // Cada sesenta unidades visibles sostienen una pila. La rutina de transporte
  // comparte su emplazamiento y la colocamos primero para que un almiar próximo
  // no robe justo la celda donde se descarga.
  const homes = state.buildings.filter(
    (one) => (one.kind === 'house' || one.kind === 'stone_house') && one.lostTick === null,
  );
  const logPiles = state.tick === 0
    ? 0
    : Math.min(MOST_STEADED['log-pile'], Math.floor(state.village.wood / 60));
  place('log-pile', [
    ...woodStoreCells(state),
    ...homes.flatMap((one) => ringOf(map, one)),
  ], logPiles);

  // El almiar toca un campo y representa grano que existe. Antes aparecía por
  // el mero hecho de haber una parcela: la pareja fundadora empezaba junto a
  // un almiar sin haber cosechado una sola vez. Doscientas unidades por almiar
  // dan cambios grandes y legibles sin pretender que cada brizna sea inventario.
  const fields = state.buildings.filter((one) => one.kind === 'field' && one.lostTick === null);
  const haystacks = Math.min(MOST_STEADED.haystack, Math.floor(state.village.grain / 200));
  place('haystack', fields.flatMap((one) => ringOf(map, one)), haystacks);

  // Y la carreta, al lado del camino más pisado. Si no hay camino todavía —los
  // primeros años no hay— junto al granero, que es donde acaba el grano.
  const road = [...map.path.entries()]
    .filter(([, wear]) => wear >= 2)
    .sort((a, z) => z[1] - a[1] || a[0] - z[0])
    .flatMap(([cell]) => [-map.width, -1, 1, map.width]
      .filter(offset => (offset !== -1 || cell % map.width > 0) && (offset !== 1 || cell % map.width < map.width - 1))
      .map(offset => cell + offset))
    .filter(cell => cell >= 0 && cell < map.terrain.length && free(cell));
  const stores = state.buildings.filter(
    (one) => (one.kind === 'granary' || one.kind === 'mill') && one.lostTick === null,
  );
  place('handcart', [...road, ...stores.flatMap((one) => ringOf(map, one))]);

  return out;
}

/**
 * Los trastos del corral, puestos en la escena.
 *
 * Una malla instanciada por pieza y por recurso, igual que el bosque: son
 * decenas de objetos que no se mueven nunca, así que se montan cuando cambia lo
 * construido y no se vuelven a tocar.
 */
export class Steading {
  readonly group = new Group();
  private readonly owned: InstancedMesh[] = [];

  constructor() {
    this.group.name = 'Valley_Steading';
  }

  /** Cuántos objetos hay puestos ahora mismo. */
  get count(): number {
    return this.placed;
  }

  private placed = 0;

  build(
    places: readonly Steaded[],
    source: (asset: SteadingAsset) => Object3D | undefined,
    ground: (x: number, z: number) => number,
    width: number,
  ): void {
    this.clear();
    const matrix = new Matrix4();
    const position = new Vector3();
    const turn = new Quaternion();
    const size = new Vector3(1, 1, 1);
    const up = new Vector3(0, 1, 0);

    for (const asset of STEADING_ASSETS) {
      const mine = places.filter((one) => one.asset === asset);
      if (mine.length === 0) continue;
      const original = source(asset);
      if (original === undefined) continue;
      for (const piece of piecesOf(original)) {
        const instanced = new InstancedMesh(piece.geometry, piece.material, mine.length);
        instanced.name = `Steading_${asset}`;
        instanced.castShadow = true;
        instanced.receiveShadow = true;
        mine.forEach((one, slot) => {
          // El centro de la celda, no su esquina: lo que se deja en el suelo se
          // deja en medio del claro y no pisando la linde.
          const x = (one.cell % width) + 0.5;
          const z = Math.floor(one.cell / width) + 0.5;
          position.set(x, ground(x, z), z);
          turn.setFromAxisAngle(up, one.facing);
          instanced.setMatrixAt(slot, matrix.compose(position, turn, size));
        });
        instanced.instanceMatrix.needsUpdate = true;
        this.owned.push(instanced);
        this.group.add(instanced);
      }
    }
    this.placed = places.length;
  }

  clear(): void {
    for (const instanced of this.owned) {
      this.group.remove(instanced);
      instanced.dispose();
      instanced.geometry.dispose();
    }
    this.owned.length = 0;
    this.placed = 0;
  }

  dispose(): void {
    this.clear();
  }
}
