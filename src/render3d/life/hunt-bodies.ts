// AN-5b · Lo que toca un tiro de caza: el cuerpo de la presa y lo que está de
// pie en el valle, con las medidas con que se pintan (29 sep 2026).
//
// Es la regla 5 de la skill `fisica-combate` —el cuerpo que decide es el que
// se pinta— llevada a la caza. Hasta esta ronda un tiro tocaba si pasaba cerca
// de una bola de radio «huella + 0,06» a 0,42 sobre el suelo: más ancha que un
// conejo y por encima de su lomo (el conejo mide 0,28 con las orejas).

import { TERRAIN_CODE, type BuildingKind, type GameState } from '@engine/state';
import type { HuntSpecies } from '@engine/world/hunting';
import { greatOakCell } from '@derive/landmark';
import type { ContactShape } from './physics';
import { WALLED } from './terrain';

/**
 * El tronco de cada presa, en celdas: una cápsula a lo largo del cuerpo. Sale
 * de las cajas del catálogo (`art/catalog.json`, `bounds`): el radio es la
 * mitad del ancho del modelo, y el largo y la altura del centro, los del
 * tronco sin cabeza, patas, orejas ni cornamenta —lo que no para una flecha—.
 * `tests/fast/hunt-bodies.test.ts` vigila que cada cápsula quepa en su caja.
 *
 * TUNE, medido el 29 sep 2026 sobre las cajas:
 *   perdiz 0,31 × 0,20 × 0,16 · conejo 0,31 × 0,28 × 0,14 · ciervo
 *   0,78 × 0,85 × 0,28 · jabalí 0,71 × 0,42 × 0,24 · oso 1,16 × 0,75 × 0,54.
 * El oso alzado (`attack`, el aviso y el zarpazo) se mide de pie.
 */
export const PREY_BODY: Readonly<Record<HuntSpecies, {
  readonly radius: number; readonly halfLength: number; readonly centre: number;
  /** Medio ancho del modelo: lo que sube la pieza caída al tumbarse de costado (`animal-motion.ts`). */
  readonly flank: number;
}>> = {
  partridge: { radius: 0.075, halfLength: 0.03, centre: 0.1, flank: 0.078 },
  rabbit: { radius: 0.065, halfLength: 0.05, centre: 0.09, flank: 0.072 },
  deer: { radius: 0.13, halfLength: 0.12, centre: 0.5, flank: 0.14 },
  boar: { radius: 0.12, halfLength: 0.16, centre: 0.25, flank: 0.12 },
  bear: { radius: 0.25, halfLength: 0.2, centre: 0.42, flank: 0.268 },
};

/** El oso de pie: tronco vertical, del vientre a los hombros. */
export const BEAR_RISEN = { radius: 0.24, halfLength: 0.24, centre: 0.62 } as const;

/** La cápsula de una presa en este instante: donde pisa, hacia dónde mira y si está alzada. */
export function preyShape(species: HuntSpecies, id: number, x: number, z: number, feet: number,
  facing: number, altitude = 0, risen = false): ContactShape {
  if (species === 'bear' && risen) {
    return { id, x, y: feet + BEAR_RISEN.centre, z, facing, halfLength: BEAR_RISEN.halfLength,
      radius: BEAR_RISEN.radius, upright: true };
  }
  const body = PREY_BODY[species];
  return { id, x, y: feet + altitude + body.centre, z, facing, halfLength: body.halfLength, radius: body.radius };
}

/**
 * La altura con que se pinta cada edificio que cierra sus celdas, del catálogo
 * (`bounds.size[1]`). Una casa tiene tres variantes (1,56–1,66) y la de piedra
 * cuatro (1,56–1,88): va la de base, que es la más común. TUNE en
 * `tests/fast/hunt-bodies.test.ts` contra el catálogo.
 */
export const STANDING_HEIGHT: Readonly<Partial<Record<BuildingKind, number>>> = {
  house: 1.583, stone_house: 1.573, granary: 1.765, chapel: 2.1, church: 3.717, smithy: 1.404,
  mill: 2.657, watchtower: 2.75, palisade: 0.867, wall: 0.885, hall: 1.923, bastion: 1.36, well: 1.033,
};

/** La fuente de la plaza (0,65) y el gran roble del lago (3,4), del catálogo. */
const FOUNTAIN = 0.65;
const GREAT_OAK = 3.4;
/**
 * TUNE: lo demás que cierra una celda sin ser edificio —la roca suelta, los
 * trastos del corral, el tablón—: el catálogo va de 0,5 (la roca) a 0,9 (el
 * cobertizo), y 0,7 es su mitad.
 */
const LOOSE = 0.7;

/**
 * Qué altura tiene lo que está de pie en cada celda cerrada, o null si lo que
 * la cierra es el suelo mismo (la montaña) o el agua. Es la `standing` del
 * mundo de contacto (`createContactWorld`): sin ella, cada celda cerrada sería
 * una muralla de dos celdas, y la ladera del monte, una pared invisible.
 */
export function standingOf(state: Pick<GameState, 'map' | 'buildings' | 'plaza'>): (x: number, z: number) => number | null {
  const { width, height } = state.map;
  const heights = new Float32Array(width * height).fill(Number.NaN);
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    const drawn = STANDING_HEIGHT[building.kind];
    if (drawn === undefined || (!WALLED.has(building.kind) && building.kind !== 'well')) continue;
    for (let z = building.y; z < building.y + building.h; z += 1) for (let x = building.x; x < building.x + building.w; x += 1) {
      if (x >= 0 && z >= 0 && x < width && z < height) heights[z * width + x] = drawn;
    }
  }
  const plaza = state.plaza;
  if (plaza !== undefined && plaza !== null && plaza.x >= 0 && plaza.y >= 0 && plaza.x < width && plaza.y < height) {
    heights[plaza.y * width + plaza.x] = FOUNTAIN;
  }
  const oak = greatOakCell(state.map);
  if (oak !== null) heights[oak] = GREAT_OAK;
  return (x, z) => {
    if (x < 0 || z < 0 || x >= width || z >= height) return null;
    const cell = z * width + x;
    const code = state.map.terrain[cell];
    if (code === TERRAIN_CODE.water || code === TERRAIN_CODE.lake || code === TERRAIN_CODE.mountain) return null;
    const drawn = heights[cell]!;
    return Number.isNaN(drawn) ? LOOSE : drawn;
  };
}
