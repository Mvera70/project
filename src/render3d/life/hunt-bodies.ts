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
 * La caja de cada modelo publicado, en celdas: largo (X, de hocico a cola),
 * alto (Y) y ancho (Z), **copiada de `art/catalog.json` (`bounds.size`)**.
 *
 * **Los modelos de los animales van a cambiar** (Vera, 29 sep 2026: «se van a
 * subir nuevos modelos en 3D de los animales; el oso, por ejemplo, cambia»).
 * Por eso lo que decide la caza no guarda medidas sueltas: guarda la caja y
 * saca de ella el tronco con las proporciones de `TORSO`. Cuando llegue un
 * modelo nuevo, `tests/fast/hunt-bodies.test.ts` falla con la caja nueva
 * escrita en el mensaje; se copia aquí y se vuelven a pasar
 * `tools/reports/hunt-report.ts` y `tools/reports/bear-visit-report.ts`.
 */
export const PREY_MODEL: Readonly<Record<HuntSpecies, { readonly length: number; readonly height: number; readonly width: number }>> = {
  partridge: { length: 0.313, height: 0.204, width: 0.156 },
  rabbit: { length: 0.313, height: 0.285, width: 0.144 },
  deer: { length: 0.654, height: 0.765, width: 0.327 },
  boar: { length: 0.713, height: 0.34, width: 0.24 },
  bear: { length: 1.166, height: 0.728, width: 0.51 },
};

/**
 * Qué parte de la caja es tronco —lo que para una flecha—, sin cabeza, patas,
 * orejas ni cornamenta: el ancho del tronco, su largo de extremo a extremo y la
 * altura de su eje, como fracción del ancho, el largo y el alto del modelo.
 *
 * TUNE, medido sobre la malla del tronco de cada GLB publicado (29 sep 2026):
 * el radio es medio lado corto de su sección y el eje, su centro.
 *
 * - **Ciervo** (el de la PR #3), `Torso`: 0,43 de largo, 0,19 de ancho, eje a
 *   0,357. La caja es más ancha que el tronco porque la cuerna mide 0,327:
 *   con la fracción de antes la cápsula salía casi el doble de ancha que el
 *   ciervo que se pinta (0,13 de radio contra 0,07 del modelo viejo).
 * - **Jabalí** (PR #3, `BOAR_DROP` 0,08), `Barrel`: el mismo barril, ocho
 *   centímetros más bajo; eje a su centro, 0,208.
 * - **Oso** (el v4 de la PR #3), `Massive_Torso`: de 0,235 a 0,728 de alto, eje
 *   a 0,48; de largo, del cuello a la grupa, como el de antes.
 * - Perdiz y conejo, sin cambio de modelo: `Plump_Body` (eje 0,10, radio
 *   0,075) y el cuerpo del conejo sin las orejas (eje a un tercio del alto).
 */
const TORSO: Readonly<Record<HuntSpecies, { readonly width: number; readonly length: number; readonly axis: number }>> = {
  partridge: { width: 0.96, length: 0.67, axis: 0.49 },
  rabbit: { width: 0.9, length: 0.735, axis: 0.316 },
  deer: { width: 0.581, length: 0.657, axis: 0.467 },
  boar: { width: 1, length: 0.785, axis: 0.612 },
  bear: { width: 0.967, length: 0.776, axis: 0.66 },
};

type TorsoShape = { readonly radius: number; readonly halfLength: number; readonly centre: number; readonly flank: number };

/**
 * El tronco de cada presa, en celdas: una cápsula a lo largo del cuerpo, sacada
 * de su caja (`PREY_MODEL`) con sus proporciones (`TORSO`), y lo que sube al
 * tumbarse de costado: medio ancho **del tronco**, que es sobre lo que se apoya
 * (`effects/animal-motion.ts` lo sube igual). La cuerna del ciervo, más ancha,
 * se hunde en la hierba en vez de dejarlo flotando.
 * `tests/fast/hunt-bodies.test.ts` vigila que cada cápsula quepa en su modelo.
 */
export const PREY_BODY: Readonly<Record<HuntSpecies, TorsoShape>> = Object.fromEntries(
  (Object.keys(PREY_MODEL) as HuntSpecies[]).map((species) => {
    const model = PREY_MODEL[species], torso = TORSO[species];
    const radius = torso.width * model.width / 2;
    return [species, { radius, halfLength: Math.max(0, torso.length * model.length / 2 - radius),
      centre: torso.axis * model.height, flank: radius }];
  })) as Record<HuntSpecies, TorsoShape>;

/**
 * El oso de pie (`attack`: el aviso y el zarpazo): el tronco vertical, del
 * vientre a los hombros, sacado del largo del modelo tumbado —de pie, lo que
 * era largo es alto—. TUNE: el eje a 0,53 del largo y medio tramo de 0,21.
 */
export const BEAR_RISEN = {
  radius: 0.9 * PREY_MODEL.bear.width / 2,
  halfLength: 0.207 * PREY_MODEL.bear.length,
  centre: 0.534 * PREY_MODEL.bear.length,
} as const;

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
