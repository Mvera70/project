// G-06 · What the valley looks like. design.md D.2.1, D.8.
//
// One place for every colour and every measurement the 3D pilot paints with.
// The colours are the ones P1 decided and that `art/recipes/palette.json`
// already holds; they are repeated here because the palette is authoring input
// for Blender and this is runtime, and a browser should not be parsing a
// recipe. `tests/fast/graphics-world.test.ts` reads the palette and asserts
// they still agree, so the copy cannot drift in silence.
//
// Heights are in map cells, which is the scene unit (D.4). A cell is about
// three metres (D.6.2), so a two-cell wall is six metres and a villager at 0.65
// comes up to a third of it. Every number below was chosen against that ruler
// and not against a screenshot.

import type { BuildingKind } from '@engine/state';

export const VALLEY_COLOURS = {
  sky: '#DDE3C4',
  ground: '#94AE68',
  soil: '#866044',
  path: '#C4A16B',
  foliage: '#62864F',
  foliageLight: '#7F9F64',
  trunk: '#735338',
  skin: '#C98A63',
  cloth: '#71885E',
  clothAccent: '#A96146',
} as const;

// Aquí había dos tablas de color —el terreno por su código de motor y los tres
// niveles de camino— que nadie usaba ya. Quien pinta el suelo lo hace con la
// paleta de las estaciones (`world/ground.ts` → `@derive/palette`), que cambia
// con la semana; dos tablas fijas al lado eran la versión de antes de que el
// suelo tuviera estaciones, y una de las dos mentía.

export interface BuildingLook {
  /** Height of the walls, in cells. */
  readonly walls: number;
  /** How far the roof rises above the walls, in cells. */
  readonly roof: number;
  readonly wallColour: string;
  readonly roofColour: string;
  /**
   * Whether the thing has a roof at all. A field and a graveyard are worked
   * ground with a footprint, not buildings, and giving them a roof would make
   * the village read as far denser than it is.
   */
  readonly roofed: boolean;
}

/**
 * How each kind of building reads. Two roof materials, as D.2.1 decided: tile
 * and thatch coexist in one village rather than competing as directions.
 */
const TILE = '#7A382B';
const THATCH = '#C7984A';
const PLASTER = '#D2B98A';
const STONE = '#9B958A';

export const BUILDING_LOOKS: Readonly<Record<BuildingKind, BuildingLook>> = {
  house: { walls: 0.62, roof: 0.42, wallColour: PLASTER, roofColour: THATCH, roofed: true },
  stone_house: { walls: 0.7, roof: 0.44, wallColour: STONE, roofColour: TILE, roofed: true },
  granary: { walls: 0.72, roof: 0.5, wallColour: '#C0A878', roofColour: THATCH, roofed: true },
  smithy: { walls: 0.6, roof: 0.36, wallColour: '#8A7A68', roofColour: TILE, roofed: true },
  mill: { walls: 0.95, roof: 0.55, wallColour: PLASTER, roofColour: THATCH, roofed: true },
  chapel: { walls: 0.85, roof: 0.6, wallColour: STONE, roofColour: TILE, roofed: true },
  church: { walls: 1.3, roof: 0.9, wallColour: STONE, roofColour: TILE, roofed: true },
  watchtower: { walls: 1.6, roof: 0.5, wallColour: STONE, roofColour: TILE, roofed: true },
  well: { walls: 0.3, roof: 0.22, wallColour: STONE, roofColour: THATCH, roofed: true },
  palisade: { walls: 0.75, roof: 0, wallColour: VALLEY_COLOURS.trunk, roofColour: TILE, roofed: false },
  // A2 · el portón: la misma madera y algo más alto que la estacada, porque
  // una puerta con jambas se ve por encima de la empalizada.
  gate: { walls: 0.95, roof: 0, wallColour: VALLEY_COLOURS.trunk, roofColour: TILE, roofed: false },
  wall: { walls: 0.8, roof: 0, wallColour: STONE, roofColour: TILE, roofed: false },
  // A3 · el bastión: una torre de una sola celda sobre la línea de muralla, más
  // alta que el muro que sustituye y con la malla prestada de la atalaya
  // suelta (`BUILDING_ASSETS`). Esta caja es sólo el respaldo mientras esa
  // malla carga o falta: más baja que la atalaya de dos celdas porque un
  // bastión de una celda se leería fuera de escala con la misma altura.
  bastion: { walls: 1.3, roof: 0.4, wallColour: STONE, roofColour: TILE, roofed: true },
  field: { walls: 0.04, roof: 0, wallColour: VALLEY_COLOURS.soil, roofColour: TILE, roofed: false },
  grave_yard: { walls: 0.1, roof: 0, wallColour: '#8E9576', roofColour: TILE, roofed: false },
  // K-4 · **la sala del rey**, y se diferencia sin malla: más alta que una casa
  // (0,93 de pared contra 0,62) y con el tejado burdeos del jefe, que es el
  // único color de la paleta que sólo lleva él. Cuando exista `hall.glb` esto
  // deja de usarse; el encargo de arte está en `docs/historico/plan-rey.md` §8.
  hall: { walls: 0.93, roof: 0.62, wallColour: PLASTER, roofColour: '#773B42', roofed: true },
};

/**
 * A ruin is the same footprint, lower, greyer and without a roof.
 *
 * §7.4 keeps a ruin on the map, so it has to read as one at a glance and from
 * the panoramic view, where a person is six pixels and nobody is reading labels.
 */
export const RUIN = {
  height: 0.22,
  colour: '#7B7368',
} as const;

/** How far above the ground the whole valley's geometry sits, to avoid z-fighting. */
export const GROUND_BIAS = 0.002;

/**
 * GV-1 · El pie de los edificios: cuánto oscurece el suelo pegado a una pared
 * y hasta dónde (`world/contact-shade.ts`).
 *
 * TUNE visual, contrastado en las tomas de GV-1 (aldea 11/21 y villa 7/60 a
 * 390×844, despejado y nublado, `docs/encargos/profundidad-visual-movil-2026-09-29.md`).
 * `ambient` es la parte de la luz del cielo que no llega al pie de la pared y
 * `direct` la del sol, menor: al sol el pie de un muro sigue alumbrado, y
 * comerse la misma fracción lo pintaba como una mancha de barro. Se probaron
 * tres juegos (`ambient` · `direct` · `reach`): C1 0,62 · 0,24 · 0,42, la más
 * clara al sol (con el cielo cubierto, casi la de C3 y más corta); C2 0,85 ·
 * 0,40 · 0,55, que en el lado de sombra dejaba el pie de la
 * capilla casi negro (allí sólo llega luz de cielo, y se comía el 85 %); y C3
 * 0,55 · 0,42 · 0,55, más marcada al sol. **Vera eligió C1** (29 sep 2026, a
 * la vista de las tres: «me gusta la sombra más clara, C1, o la de antes»).
 * Con el cielo cubierto —o en Low, sin sombras— es lo único que apoya la casa
 * en el suelo.
 *
 * `bases` es cuánto se mete la malla dentro de su huella por cada lado, en
 * celdas y por eje, **medido sobre la caja de los GLB publicados** (29 sep
 * 2026; los que no están llenan la huella): la atalaya es la celda central de
 * su 2 × 2, el pozo un brocal dentro de su celda, la capilla deja 0,18 a cada
 * costado. `round` redondea las esquinas de la base; al pozo, casi un disco.
 */
export const CONTACT_SHADE = {
  texels: 8,
  reach: 0.42,
  ambient: 0.62,
  direct: 0.24,
  bases: {
    watchtower: { x: 0.51, z: 0.51, round: 0.12 },
    well: { x: 0.1, z: 0.1, round: 0.34 },
    chapel: { x: 0.18, z: 0, round: 0.08 },
    mill: { x: 0.08, z: 0.08, round: 0.08 },
    church: { x: 0.08, z: 0, round: 0.08 },
  } as Partial<Record<BuildingKind, { readonly x: number; readonly z: number; readonly round: number }>>,
  /** Lo que no está en `bases`: la malla llena su huella. */
  base: { x: 0, z: 0, round: 0.06 },
} as const;

/**
 * Parámetros de la sombra solar. El mapa cubre el valle jugable, no la sierra
 * decorativa: cuanto más volumen vacío dejamos, menos texels tiene cada tejado
 * y más saltan los bordes al girar el sol. Los sesgos evitan que una superficie
 * se auto-sombree por la precisión del depth buffer.
 *
 * TUNE: escena de 72 × 112 celdas con PCF suave. El mapa sube de 1024 a 2048
 * tras la revisión en movimiento de S-1: reduce el flicker global sin eliminarlo.
 * Una comparación rápida de cinco segundos mantuvo la misma cadencia p50/p95/p99.
 *
 * **Y el flicker no era de resolución** (28 sep 2026, `effects/sun-steps.ts`):
 * era la cámara de sombra girando con el sol en cada fotograma. Desde entonces
 * el sol de las sombras avanza por pasos (`stepDegrees`) y el alcance a
 * escalones (`reachStep`), y entre pasos la cámara no se mueve. Medido con
 * `tools/graphics/performance/shadow-flicker.mjs` (fracción de píxeles que
 * cambian entre fotogramas seguidos sobre el borde del bosque, a ×1): ver el
 * registro de cambios v4.90.
 */
export const SUN_SHADOW = {
  mapSize: 2048,
  /** Aire para que un objeto situado fuera de pantalla todavía proyecte dentro. */
  focusMargin: 20,
  farMultiplier: 4,
  bias: -0.0002,
  normalBias: 0.02,
  /**
   * Cada cuántos grados de sol se reorienta la cámara de sombra. Con 1 (medio
   * segundo a ×1) Vera vio «un tic al moverse la sombra», así que 0: gira de
   * forma continua y la sombra se desliza. Lo que quitaba el temblor no era el
   * paso, era no ajustar el centro a una rejilla que gira (`stabilizeSunShadow`).
   */
  stepDegrees: 0,
  /** El alcance de la cámara de sombra sube en escalones de tantas celdas. */
  reachStep: 4,
  /** Radio del filtro PCF en texeles: suaviza el escalón del borde sin emborronar. */
  radius: 1.5,
} as const;
