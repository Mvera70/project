// v5.85 · Las crías de primavera. Vera, 2 oct 2026: «cervatillos con la
// cierva; polluelos, lechones y terneros en la aldea, si la aldea tiene esa
// cabaña».
//
// **Una cría es un cuerpo que se ve, no una cabeza nueva.** `state.herd` no
// cambia, la caza tampoco, y la cría no entra en `beasts.ts` ni en el reparto
// de ofertas: va detrás de su madre a su escala (`Animal.scale`) y desaparece
// cuando acaba la primavera, como el rebaño de §7.7 es cosmético desde
// siempre. Qué madre lleva cría lo dice `derive/seasonal-fauna.ts`
// (`hasYoung`), estable todo el año por semilla, madre y año.
//
// **Va detrás, no al lado.** La cría se pone en la estela de la madre —vez y
// media su radio más un palmo, hacia donde la madre mira de espaldas; con su
// radio a secas, el cervatillo metía la cabeza en la grupa de la cierva en la
// primera captura— con
// un vaivén lento a los lados. Detrás de un cuerpo que anda es por donde acaba
// de pasar, así que es casi siempre suelo libre; si no lo es (una esquina, una
// valla), se pega a la madre en vez de meterse en la pared. Es una función de
// la posición de la madre y del paso, así que es continua mientras la madre lo
// sea: no hay salto que tapar (E.1).

import type { Animal } from '@derive/animals';
import { faunaSeason, hasYoung, type MotherKind } from '@derive/seasonal-fauna';
import type { GameState } from '@engine/state';
import { fitsCircle, type Body, type Terrain } from './body';
import { LIFE_STEP } from './clock';

/** Las crías van en su propio rango de ids, lejos de todo lo demás (`Fauna` indexa por id). */
const YOUNG_ID_BASE = 100_000;
/** Cuántas crías caben por madre en el rango de ids. */
const PER_MOTHER = 4;
/**
 * TUNE: la distancia de la estela, en celdas, además del radio de la madre:
 * un palmo para la primera cría y otro por cada hermana que va detrás. Y el
 * vaivén a los lados, que es lo que hace que un lechón no parezca un remolque.
 */
const TRAIL = 0.22;
const TRAIL_STEP = 0.2;
const SWAY = 0.22;
/** Radio con el que se comprueba que la cría cabe donde va (un polluelo, un ternero). */
const YOUNG_RADIUS = 0.08;

export interface Mother {
  readonly kind: MotherKind;
  readonly body: Body;
  /** El orden de la madre en su clase: la primera cierva siempre lleva cría. */
  readonly order: number;
}

/**
 * Las crías que se ven ahora, detrás de sus madres.
 *
 * Fuera de la primavera devuelve una lista vacía: la cría de abril es un
 * novillo en julio y ya no se distingue de su madre.
 */
export function youngOf(state: GameState, mothers: readonly Mother[], land: Terrain, step: number): Animal[] {
  const litters = faunaSeason(state).litters;
  const seconds = step * LIFE_STEP;
  const out: Animal[] = [];
  for (const mother of mothers) {
    const litter = litters[mother.kind];
    if (litter.count === 0 || !hasYoung(state, mother.kind, mother.body.id, mother.order)) continue;
    const { body } = mother;
    const moving = Math.hypot(body.vx, body.vz) > 0.05;
    // `facing` mira a +z con cero, como `Body`: la espalda es el opuesto.
    const backX = -Math.sin(body.facing), backZ = -Math.cos(body.facing);
    const sideX = backZ, sideZ = -backX;
    for (let k = 0; k < Math.min(litter.count, PER_MOTHER); k += 1) {
      const id = YOUNG_ID_BASE + body.id * PER_MOTHER + k;
      const phase = (id % 97) / 97 * Math.PI * 2;
      const behind = body.radius * 1.5 + TRAIL + TRAIL_STEP * k;
      const side = Math.sin(seconds * (0.5 + 0.13 * k) + phase) * SWAY + (k % 2 === 0 ? 1 : -1) * SWAY * 0.5 * Math.min(1, k);
      let x = body.x + backX * behind + sideX * side;
      let z = body.z + backZ * behind + sideZ * side;
      if (!fitsCircle(land, x, z, YOUNG_RADIUS)) { x = body.x + sideX * side * 0.4; z = body.z + sideZ * side * 0.4; }
      out.push({ id, kind: litter.kind ?? mother.kind, x, y: z, facing: body.facing, scale: litter.scale,
        action: moving ? 'walk' : undefined });
    }
  }
  return out;
}
