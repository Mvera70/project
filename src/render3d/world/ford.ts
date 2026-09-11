// G-10 · El vado. design.md D.6, D.8, §7.6.
//
// El motor sabe dónde está el vado desde M-10: es la orilla firme más cercana
// al centro de la aldea, y es donde llegan los forasteros, de donde sale la
// cacería del lobo y donde se despide a quien se va. En la escena no había nada
// ahí: el río se cruzaba por el aire.
//
// **El sitio no se calcula aquí.** Se le pregunta al motor, que es quien lo
// define, por el mismo motivo por el que las señales salen de `tellsFor`:
// calcularlo dos veces es tener dos vados. `render/gatherings.ts` tiene su
// propia conjetura y apunta a otro sitio; ése es el fallo que esto no repite.
//
// Lo que sí se decide aquí es por dónde cruza: desde la orilla, derecho al otro
// lado, celda de agua a celda de agua. Un vado torcido no es un vado.

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
 * Pone una losa en cada celda de agua del paso.
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
