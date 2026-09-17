// G-10 · El vado. design.md D.6, D.8, §7.6.
//
// El motor sabe dónde está el vado desde M-10. Desde el mapa grande sabe además
// qué celdas concretas lo forman (`TERRAIN_CODE.ford`): son agua somera que se
// puede pisar, no una conjetura que el render tenga que repetir.
//
// **El sitio no se calcula aquí.** Se le pregunta al motor, que es quien lo
// define, por el mismo motivo por el que las señales salen de `tellsFor`:
// calcularlo dos veces es tener dos vados. `render/gatherings.ts` tiene su
// propia conjetura y apunta a otro sitio; ése es el fallo que esto no repite.
//
// La búsqueda desde la orilla se conserva sólo para partidas antiguas, cuyos
// mapas se guardaron antes de que existiera ese código de terreno.

import { Group, type Object3D } from 'three';
import type { ValleyMap } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';

/** Hasta dónde se busca la otra orilla, en celdas. Más ancho que eso es un río. */
const MAX_SPAN = 14;

/**
 * Las celdas de agua que hay que pisar para cruzar desde `x, y`.
 *
 * Devuelve la lista vacía si desde ahí no se cruza a ninguna parte: un recodo
 * donde el agua se ensancha, o una orilla que da a la marisma. Mejor ningún
 * vado que uno que no lleva al otro lado.
 */
export function fordCells(map: ValleyMap, x: number, y: number): number[] {
  const marked: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] === TERRAIN_CODE.ford) marked.push(cell);
  }
  if (marked.length > 0) return marked;

  // Compatibilidad con partidas anteriores al mapa grande: allí el vado no
  // estaba marcado y sólo se guardaba agua. No usar esta conjetura en mapas
  // nuevos: fue la causa de la hilera de losas de hasta catorce celdas que
  // podía continuar lejos del paso real y pisar visualmente los campos.
  const from = Math.floor(y) * map.width + Math.floor(x);
  const cx = from % map.width;
  const cy = Math.floor(from / map.width);

  const ways = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  for (const [dx, dy] of ways) {
    const crossing: number[] = [];
    for (let step = 1; step <= MAX_SPAN; step += 1) {
      const nx = cx + dx * step;
      const ny = cy + dy * step;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) break;
      const cell = ny * map.width + nx;
      const kind = map.terrain[cell];
      if (kind === TERRAIN_CODE.water) {
        crossing.push(cell);
        continue;
      }
      // Se llegó a tierra firme: hay vado si hubo agua que cruzar.
      if (kind !== TERRAIN_CODE.marsh && crossing.length > 0) return crossing;
      break;
    }
  }
  return [];
}

export interface Ford {
  readonly group: Group;
  readonly count: number;
  dispose(): void;
}

/**
 * Pone una losa en cada celda marcada como paso (o en el paso legado).
 *
 * Sin instanciar: son dos o tres piedras, y una malla instanciada para tres
 * cosas cuesta más código del que ahorra.
 */
export function buildFord(map: ValleyMap, x: number, y: number, stone: () => Object3D | undefined): Ford {
  const group = new Group();
  group.name = 'Valley_Ford';
  const cells = fordCells(map, x, y);
  let count = 0;
  for (const cell of cells) {
    const slab = stone();
    if (slab === undefined) break;
    slab.position.set(cell % map.width, 0, Math.floor(cell / map.width));
    // Cada losa girada lo suyo: tres piedras iguales y alineadas se leen como
    // un puente de hormigón, y esto son piedras que alguien acarreó.
    slab.rotation.set(0, ((cell * 37) % 4) * (Math.PI / 2), 0);
    group.add(slab);
    count += 1;
  }
  return {
    group,
    count,
    dispose(): void {
      // La geometría y los materiales son del recurso compartido; lo único
      // nuestro son los nodos.
      group.clear();
    },
  };
}
