// P-1 · La plaza. `docs/task-log.md` §4.0b, y §7.4 de la especificación.
//
// **Hasta aquí la plaza no existía.** Era `valleyCore` —la media de los centros
// de los edificios en pie— y eso es un punto, no un sitio: se recalculaba cada
// vez que alguien preguntaba, así que **se movía sola** mientras la aldea
// crecía. Medido el 18 sep 2026 en ocho semillas, de la fundación al año 60: se
// desplaza de 4,2 a 10,8 celdas. Un empedrado no puede ir ahí, y una fuente
// menos.
//
// Lo pidió el dueño del diseño: «me gustaría que la plaza fuese un espacio que
// tuviese un círculo grande, con separación; las cosas se deberían mover para
// que esa plaza parezca una plaza de verdad. Y en el centro quizás una fuente».
//
// Son tres cosas y ésta es la primera, la del motor: **la plaza se elige el día
// que se funda la aldea, se guarda, y nadie construye dentro**. Las otras dos
// —empedrarla y ponerle la fuente— son del render y de la sesión de arte.
//
// Dos decisiones, y las dos con su motivo:
//
//   · **se elige al fundar y no se mueve nunca.** La alternativa era
//     recalcularla, y entonces el empedrado se desplazaría por debajo de los
//     pies de la gente. No hay pueblo donde la plaza se mude.
//   · **no consume azar.** Es una función pura de lo que la pareja acaba de
//     levantar y del terreno, como todo lo que decide un sitio en este motor
//     (§4.3): el mismo valle da la misma plaza, y si algún día se elige de otra
//     manera, las partidas guardadas conservan la suya porque está guardada.

import { PLAZA } from '../balance';
import { TERRAIN_CODE } from '../state';
import type { Building, GameState } from '../state';
import { HEART } from './tiles';

export interface Plaza { x: number; y: number }

/**
 * El centro geométrico de la plaza, en coordenadas de celda.
 *
 * `state.plaza` guarda **la celda** —dos enteros— y el centro de una celda está
 * en su medio, no en su esquina. La diferencia es media celda, o sea metro y
 * medio, y cuenta: la fuente va en el centro (P-2) y una fuente en la esquina de
 * cuatro celdas se dibuja partida entre las cuatro y no se puede cerrar al paso
 * sin cerrar las cuatro.
 */
export function plazaCentre(plaza: Plaza): { x: number; y: number } {
  return { x: plaza.x + 0.5, y: plaza.y + 0.5 };
}

/** Si en esa celda puede haber suelo de plaza: se pisa y no es agua ni roca. */
function open(state: GameState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= state.map.width || y >= state.map.height) return false;
  const tile = state.map.terrain[y * state.map.width + x];
  return tile !== TERRAIN_CODE.water && tile !== TERRAIN_CODE.marsh
    && tile !== TERRAIN_CODE.mountain && tile !== TERRAIN_CODE.lake;
}

/** El centro de un edificio, en celdas. */
function centreOf(b: Building): Plaza {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/**
 * La casa con la que se fundó la aldea: la primera que se levantó.
 *
 * **Incluye las que ya no están en pie.** La plaza se elige una vez y el solar
 * de la casa fundadora sigue en la lista aunque se haya quemado, así que una
 * partida vieja que perdió esa casa deriva la misma plaza que habría tenido.
 */
function foundingHouse(state: GameState): Building | undefined {
  return [...state.buildings]
    .filter((b) => b.kind === 'house' || b.kind === 'stone_house')
    .sort((a, b) => a.builtTick - b.builtTick || a.id - b.id)[0];
}

/**
 * Cuántas celdas de un círculo de plaza son suelo abierto, de las que caben.
 *
 * Se mide sobre las celdas enteras que el círculo toca, que es lo mismo que
 * mira `inPlaza`: así lo que se puntúa al elegir es exactamente lo que después
 * se reserva.
 */
function openCells(state: GameState, plaza: Plaza): number {
  let count = 0;
  const r = PLAZA.RADIUS;
  const at = plazaCentre(plaza);
  for (let y = Math.floor(at.y - r); y <= Math.ceil(at.y + r); y += 1) {
    for (let x = Math.floor(at.x - r); x <= Math.ceil(at.x + r); x += 1) {
      if (Math.hypot(x + 0.5 - at.x, y + 0.5 - at.y) > r) continue;
      if (open(state, x, y)) count += 1;
    }
  }
  return count;
}

/** Cuántas celdas del círculo pisa algo ya construido. */
function takenCells(state: GameState, plaza: Plaza): number {
  let count = 0;
  const r = PLAZA.RADIUS;
  const at = plazaCentre(plaza);
  for (const b of state.buildings) {
    if (b.lostTick !== null) continue;
    for (let y = b.y; y < b.y + b.h; y += 1) {
      for (let x = b.x; x < b.x + b.w; x += 1) {
        if (Math.hypot(x + 0.5 - at.x, y + 0.5 - at.y) <= r) count += 1;
      }
    }
  }
  return count;
}

/**
 * Dónde está la plaza de este valle. Se llama **una vez**, al fundar (`found.ts`)
 * y al migrar una partida anterior al esquema 8 (`save.ts`).
 *
 * **Al lado de la casa fundadora, no encima.** La pareja levanta su casa y su
 * campo antes de que exista la plaza —y siempre a uno o tres pasos del centro
 * del corazón: medido, la casa cae entre (33,53) y (35,55) en ocho semillas—,
 * así que la plaza se busca **pegada a esa casa**, en la dirección donde quepa
 * entera. De las ocho direcciones se queda la que más suelo abierto tiene y
 * menos pisa lo ya construido; a igualdad, la más cercana al centro del
 * corazón, que es donde el valle es más llano.
 */
export function choosePlaza(state: GameState): Plaza {
  const heart = { x: (HEART.x0 + HEART.x1) / 2, y: (HEART.y0 + HEART.y1) / 2 };
  const house = foundingHouse(state);
  const from = house === undefined ? heart : centreOf(house);
  const reach = (house === undefined ? 0 : Math.max(house.w, house.h) / 2) + PLAZA.RADIUS
    + PLAZA.STREET;

  let best: Plaza | null = null;
  let bestScore: readonly number[] | null = null;
  // Ocho rumbos, y el propio sitio de la casa como último recurso. Nada de
  // ángulos sorteados: una plaza no puede depender de una tirada (§4.3).
  const rumbos: readonly Plaza[] = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
    { x: 0.7071, y: -0.7071 }, { x: 0.7071, y: 0.7071 },
    { x: -0.7071, y: 0.7071 }, { x: -0.7071, y: -0.7071 },
  ];
  for (const dir of rumbos) {
    const at = { x: Math.round(from.x + dir.x * reach), y: Math.round(from.y + dir.y * reach) };
    // **Vacía primero, despejada después.** El orden importa y lo enseñó la
    // fundación de veinte (`tests/helpers/founding.ts`): con el suelo abierto
    // como primer criterio, una dirección con más hierba ganaba aunque tuviera
    // una casa dentro, y la plaza de la semilla 7 salía encima de una casa y la
    // de la 11 encima de un campo. Con la pareja casi nunca pasaba —una sola
    // casa deja las ocho direcciones libres— y eso es lo que lo escondía.
    const score = [
      takenCells(state, at),
      -openCells(state, at),
      Math.round(Math.hypot(at.x - heart.x, at.y - heart.y) * 100),
    ] as const;
    if (bestScore === null || score.some((v, i) => v < bestScore![i]!
      && score.slice(0, i).every((w, j) => w === bestScore![j]!))) {
      best = at;
      bestScore = score;
    }
  }
  return best ?? { x: Math.round(heart.x), y: Math.round(heart.y) };
}

/**
 * Si un solar pisa la plaza. Lo pregunta la colocación de obras
 * (`placement.ts`), y es lo único que hace que la plaza sea un sitio y no una
 * anotación: **dentro no se levanta nada**, ni casa ni campo ni empalizada.
 *
 * El campo entra en la prohibición a propósito. Un sembrado se anda, así que no
 * cierra el paso, pero un trigal en medio de la plaza es exactamente lo que el
 * dueño del diseño no quiere ver: «las cosas se deberían mover para que esa
 * plaza parezca una plaza de verdad».
 */
export function inPlaza(state: GameState, x: number, y: number, w = 1, h = 1): boolean {
  const at = plazaCentre(state.plaza);
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      if (Math.hypot(col + 0.5 - at.x, row + 0.5 - at.y) <= PLAZA.RADIUS) return true;
    }
  }
  return false;
}
