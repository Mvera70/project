import { visibleBuildings } from '@derive/visible-buildings';
import { TIME } from '@engine/balance';
import { TURN_WEEKS } from '@derive/palette';
import { defenceGates } from '@derive/defence-gates';
// G-06 · What the scene should contain, as data. design.md D.5, D.6.
//
// The plan is a pure description of the valley at one instant: which ground,
// which buildings, what each of them looks like. It knows nothing about
// Three.js. `renderer.ts` takes a plan and a previous plan, asks what changed
// and touches only that.
//
// Splitting it this way is what makes the round testable at all. A renderer
// that only exists as WebGL calls can be checked with a screenshot and nothing
// else; a plan can be checked in the fast suite, with a real game, for the
// things D.6 actually asks for — that a ruin stops being a house, that a new
// game throws everything away, that painting twice as many frames changes
// nothing. The picture still needs looking at. The bookkeeping does not.

import type { Building, BuildingId, BuildingKind, ConstructionWork, GameState, ValleyMap } from '@engine/state';
import { HOUSE_RUBBLE } from '@engine/balance';
import { SEASONS, clockOf } from '@engine/time';
import { BUILDING_ASSETS } from './buildings';
import { BUILDING_LOOKS, RUIN, type BuildingLook } from '../visual-config';
import { DEFENCE_DIAGONALS, defenceConnections } from './defences';
import { forestLooks, forestSignature } from './forest-state';
import { scatterTransform } from './forest';
import { houseVariant } from './house-variation';
import { bastionAccessOf, type BastionAccess } from '@derive/bastion-access';
import { bastionWalkwayOf, type BastionWalkway } from '@derive/bastion-walkway';
import { elevatedRingOf, type ElevatedRing, type ElevatedRingSegment, type ElevatedRingVariant, type RingCell, type RingPoint } from '@derive/elevated-ring';
import { CROPS, cropOf, fieldMoment, type FieldPhase } from '@engine/world/crops';
import { RAMPART, rampartBoxes, rampartPlatformCells, rampartPrisms, type RampartBastion, type RampartLayout } from './rampart';

/** Radio del tronco adulto de `tree.glb`, medido en la receta E3b.2. */
const TREE_TRUNK_RADIUS = 0.34 / 3;
/** Alto máximo de la corteza en `tree.glb`; el plantón completo se escala. */
const TREE_BARK_TOP = 2.111249152161154;
/** La cara inferior del tablero de las fuentes nuevas está en esta cota. */
const RING_DECK_BOTTOM = 0.94;

/** Planta del cruce W+NE; el voladizo llega hasta media celda del muro NE. */
export function crossing24TreeOnDeck(cell: RingCell, tree: { x: number; z: number; scale: number }): boolean {
  const r = .5 / Math.SQRT2;
  const outline = [[0, -.2], [1.5 - r, -.5 - r], [1.5 + r, -.5 + r], [1, 1], [0, 1]]
    .map(([x, z]) => ({ x: cell.x + x!, z: cell.z + z! }));
  const trunkRadius = TREE_TRUNK_RADIUS * tree.scale;
  let inside = true;
  let closest = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!, b = outline[(i + 1) % outline.length]!;
    const dx = b.x - a.x, dz = b.z - a.z;
    const cross = dx * (tree.z - a.z) - dz * (tree.x - a.x);
    if (cross < -1e-8) inside = false;
    const t = Math.max(0, Math.min(1,
      ((tree.x - a.x) * dx + (tree.z - a.z) * dz) / (dx * dx + dz * dz)));
    closest = Math.min(closest, Math.hypot(tree.x - a.x - t * dx, tree.z - a.z - t * dz));
  }
  return inside || closest <= trunkRadius;
}

/** El retorno 66 incluye brazo SO y escalera desplazada hasta Z local 2,65. */
export function return66TreeOnDeck(cell: RingCell, tree: { x: number; z: number; scale: number }): boolean {
  const x = tree.x - cell.x, z = tree.z - cell.z;
  const trunk = TREE_TRUNK_RADIUS * tree.scale;
  const boxDistance = (minX: number, maxX: number, minZ: number, maxZ: number): number =>
    Math.hypot(Math.max(0, minX - x, x - maxX), Math.max(0, minZ - z, z - maxZ));
  if (boxDistance(0, 1, 0, 1) <= trunk || boxDistance(.05, .95, 1, 2.65) <= trunk) return true;
  // El tablero diagonal de anchura 0,90 llega al centro de la celda vecina.
  const t = Math.max(0, Math.min(1, ((x - .5) * -1 + (z - .5)) / 2));
  return Math.hypot(x - (.5 - t), z - (.5 + t)) <= .45 + trunk;
}

/** Huella conservadora del tablero sobre un muro, también en codos y diagonales. */
function treeOnDeck(segment: ElevatedRingSegment, tree: { x: number; z: number; scale: number },
  lane: 'inner' | 'center'): boolean {
  if (lane === 'center') {
    if (segment.variant === 'bastion-crossing' && segment.mask === 24) {
      return crossing24TreeOnDeck(segment.cell, tree);
    }
    if (segment.variant === 'bastion-return' && segment.mask === 66) {
      return return66TreeOnDeck(segment.cell, tree);
    }
    const center = { x: segment.cell.x + 0.5, z: segment.cell.z + 0.5 };
    const radius = 0.45 + TREE_TRUNK_RADIUS * tree.scale;
    // La fábrica nueva sigue dos brazos hasta los puertos; el círculo engloba
    // también los ingletes del pretil sin depender de la orientación del valle.
    const arm = (direction: RingCell): boolean => {
      const vx = direction.x * 0.5, vz = direction.z * 0.5;
      const lengthSquared = vx * vx + vz * vz;
      const t = Math.max(0, Math.min(1,
        ((tree.x - center.x) * vx + (tree.z - center.z) * vz) / lengthSquared));
      return Math.hypot(tree.x - center.x - vx * t, tree.z - center.z - vz * t) <= radius;
    };
    return arm(segment.incoming) || arm(segment.outgoing);
  }
  const tangentX = segment.outgoing.x - segment.incoming.x;
  const tangentZ = segment.outgoing.z - segment.incoming.z;
  const length = Math.hypot(tangentX, tangentZ);
  if (length === 0) return false;
  const alongX = tangentX / length, alongZ = tangentZ / length;
  const inwardX = -alongZ, inwardZ = alongX;
  const dx = tree.x - (segment.cell.x + 0.5);
  const dz = tree.z - (segment.cell.z + 0.5);
  const u = dx * alongX + dz * alongZ;
  const v = dx * inwardX + dz * inwardZ;
  // E3b.1: tablero de una celda en el eje y de 0,33 a 1,27 hacia dentro.
  // En diagonal se ensancha la prueba, nunca se acredita un tronco que roza.
  const halfLength = Math.abs(alongX) + Math.abs(alongZ) > 1.01 ? 0.71 : 0.5;
  return Math.hypot(Math.max(0, -halfLength - u, u - halfLength),
    Math.max(0, 0.33 - v, v - 1.27)) <= TREE_TRUNK_RADIUS * tree.scale;
}

/**
 * Audita los troncos de todos los tableros candidatos, aunque las variantes
 * aún no estén publicadas. La primera junta sigue siendo la única autorizada
 * para render y vida hasta validar sus sucesoras en la escena.
 */
export function sceneRingOf(state: GameState, bastion: Building,
  approvedVariants: readonly ElevatedRingVariant[] = ['straight'],
  lane: 'inner' | 'center' = 'inner'): ElevatedRing {
  const topology = elevatedRingOf(state, bastion, { approvedVariants: [
    'straight', 'turn', 'diagonal', 'mixed', 'gate-cardinal', 'gate-diagonal',
    'gate-mixed', 'bastion-crossing', 'bastion-return',
  ], lane });
  const standing = forestLooks(state).flatMap(look => {
    if (look.stage === 'stump') return [];
    const tree = scatterTransform(state.map.width, look.cell);
    const scale = tree.scale * (look.stage === 'regrowth' ? look.size : 1);
    // Un plantón pequeño cabe bajo el adarve; si su corteza ya llega al
    // tablero, su tronco visible debe bloquearlo igual que el árbol adulto.
    return TREE_BARK_TOP * scale < RING_DECK_BOTTOM ? [] : [{ ...tree, scale }];
  });
  const treesByCell = new Map<string, typeof standing>();
  for (const tree of standing) {
    const key = `${Math.floor(tree.x)},${Math.floor(tree.z)}`;
    const bucket = treesByCell.get(key) ?? [];
    bucket.push(tree);
    treesByCell.set(key, bucket);
  }
  const blockedCells = new Set<string>();
  for (const segment of topology.segments) {
    let blocked = false;
    // El tablero y el radio del tronco llegan como mucho a dos celdas del
    // centro. Consultar sólo esta vecindad evita comparar todo el bosque con
    // cada módulo del anillo en cada reconstrucción de escena.
    for (let dz = -2; dz <= 2 && !blocked; dz += 1) {
      for (let dx = -2; dx <= 2 && !blocked; dx += 1) {
        const trees = treesByCell.get(`${segment.cell.x + dx},${segment.cell.z + dz}`) ?? [];
        blocked = trees.some(tree => treeOnDeck(segment, tree, lane));
      }
    }
    if (blocked) blockedCells.add(`${segment.cell.x},${segment.cell.z}`);
  }
  const blockedAt = (cell: RingCell): boolean => blockedCells.has(`${cell.x},${cell.z}`);
  // Sólo el retorno 66 posee hoy escalera y descansillo en las fuentes nuevas.
  // El cruce 24 es pasante: ofrecerlo como acceso permitiría subir por una
  // escalera que su modelo no tiene, aunque el grafo lógico cerrase igual.
  const return66 = topology.segments.at(-1)?.variant === 'bastion-return'
    && topology.segments.at(-1)?.mask === 66;
  const approved = lane === 'center' && !return66
    ? approvedVariants.filter(variant => variant !== 'bastion-return') : approvedVariants;
  return elevatedRingOf(state, bastion, { approvedVariants: approved, blockedAt, lane });
}

/** Selector de la primera junta publicada, compartido por escena y vida. */
export function sceneWalkwayOf(state: GameState, bastion: Building): BastionWalkway | null {
  // El adarve generado ya cubre esa junta; dos tableros en la misma celda no.
  if (sceneRampartOf(state)?.layout.bastions.some(item => item.id === bastion.id)) return null;
  const walkway = bastionWalkwayOf(state, bastion);
  if (walkway === null) return null;
  const ring = sceneRingOf(state, bastion);
  return ring.route.length >= 3 && ring.segments[0]?.eligible === true ? walkway : null;
}

const ALL_RING_VARIANTS: readonly ElevatedRingVariant[] = ['straight', 'turn', 'diagonal', 'mixed',
  'gate-cardinal', 'gate-diagonal', 'gate-mixed', 'bastion-crossing', 'bastion-return'];

/**
 * E3b.3 · El anillo para el adarve generado: todas las formas valen, porque
 * la malla sale del trazado y no de un catálogo de esquinas. Sólo los
 * troncos, las obras y las casas pegadas al eje cortan el recorrido.
 */
export function sceneRampartRingOf(state: GameState, bastion: Building): ElevatedRing {
  const topology = elevatedRingOf(state, bastion, { approvedVariants: ALL_RING_VARIANTS, lane: 'center' });
  const trees = new Map<string, { x: number; z: number; scale: number }[]>();
  for (const look of forestLooks(state)) {
    if (look.stage === 'stump') continue;
    const tree = scatterTransform(state.map.width, look.cell);
    const scale = tree.scale * (look.stage === 'regrowth' ? look.size : 1);
    if (TREE_BARK_TOP * scale < RAMPART.deckBottom) continue;
    const bucket = `${Math.floor(tree.x)},${Math.floor(tree.z)}`;
    trees.set(bucket, [...trees.get(bucket) ?? [], { ...tree, scale }]);
  }
  const blockedCells = new Set<string>();
  for (const segment of topology.segments) {
    const centre = { x: segment.cell.x + 0.5, z: segment.cell.z + 0.5 };
    const tower = segment.kind === 'bastion'
      ? state.buildings.find(item => item.id === segment.buildingId) : undefined;
    const access = tower === undefined ? null : bastionAccessOf(state, tower);
    const hits = (tree: { x: number; z: number; scale: number }): boolean => {
      const radius = RAMPART.halfWidth + TREE_TRUNK_RADIUS * tree.scale;
      // Tablero: el paso de 0,90 hacia los dos vecinos, con el inglete dentro.
      for (const arm of [segment.incoming, segment.outgoing]) {
        const vx = arm.x / 2, vz = arm.z / 2;
        const t = Math.max(0, Math.min(1, ((tree.x - centre.x) * vx + (tree.z - centre.z) * vz) / (vx * vx + vz * vz)));
        if (Math.hypot(tree.x - centre.x - vx * t, tree.z - centre.z - vz * t) <= radius) return true;
      }
      if (tower === undefined) return false;
      // Torre, descansillo y escalera desplazada hasta 2,65 hacia dentro.
      const trunk = TREE_TRUNK_RADIUS * tree.scale;
      const reach = access === null ? 1 : 1 + RAMPART.stairShift + 1;
      const minX = access?.x === -1 ? segment.cell.x + 1 - reach : segment.cell.x;
      const maxX = access?.x === 1 ? segment.cell.x + reach : segment.cell.x + 1;
      const minZ = access?.z === -1 ? segment.cell.z + 1 - reach : segment.cell.z;
      const maxZ = access?.z === 1 ? segment.cell.z + reach : segment.cell.z + 1;
      return Math.hypot(Math.max(0, minX - tree.x, tree.x - maxX), Math.max(0, minZ - tree.z, tree.z - maxZ)) <= trunk;
    };
    let blocked = false;
    for (let dz = -3; dz <= 3 && !blocked; dz += 1) {
      for (let dx = -3; dx <= 3 && !blocked; dx += 1) {
        blocked = (trees.get(`${segment.cell.x + dx},${segment.cell.z + dz}`) ?? []).some(hits);
      }
    }
    if (blocked) blockedCells.add(`${segment.cell.x},${segment.cell.z}`);
  }
  return elevatedRingOf(state, bastion, { approvedVariants: ALL_RING_VARIANTS, lane: 'center',
    blockedAt: cell => blockedCells.has(`${cell.x},${cell.z}`) });
}

/** Lo que recorre el guardia de una torre: su escalera y el adarve que sale de ella. */
export interface RampartPatrol {
  readonly bastionId: number;
  readonly stairShift: number;
  /** Desde el puesto de la torre y de vuelta a él, a 1,02: vuelta entera o ida y vuelta. */
  readonly route: readonly RingPoint[];
  readonly closed: boolean;
}

export interface SceneRampart {
  readonly layout: RampartLayout;
  readonly patrols: ReadonlyMap<number, RampartPatrol>;
}

let rampartMemo: { key: string; value: SceneRampart | null } | null = null;

/**
 * E3b.3 · El adarve de la villa, derivado sin guardarlo.
 *
 * Cada torre con escalera abre su anillo. Si el anillo entero es transitable,
 * el guardia da la vuelta; si no, recorre los dos tramos que salen de su torre
 * hasta el primer corte —un tronco, una obra, una casa pegada, una ruina— y
 * vuelve. Un tramo perdido corta el recorrido sin más reglas: el anillo deja
 * de cerrar y el tramo roto no es transitable.
 */
export function sceneRampartOf(state: GameState): SceneRampart | null {
  // Firma de lo que decide el anillo: tipo, posición, material y ruina de
  // cada edificio, y las obras. El bosque cambia con el tick.
  const memo = `${state.seed}:${state.terrainSeed}:${state.tick}:${state.plaza.x},${state.plaza.y}:${
    state.buildings.map(item => `${item.id}${item.kind[0]}${item.kind.length}.${item.x}.${item.y}.${item.tier}${
      item.lostTick === null ? '' : 'x'}`).join(',')}:${
    state.works.reduce((sum, item) => (sum * 31 + item.id + item.x * 131 + item.y * 17) % 2147483647, 0)}`;
  if (rampartMemo?.key === memo) return rampartMemo.value;
  const value = computeRampart(state);
  rampartMemo = { key: memo, value };
  return value;
}

function computeRampart(state: GameState): SceneRampart | null {
  const cellKey = (cell: RingCell): string => `${cell.x},${cell.z}`;
  const edges = new Map<string, readonly [RingCell, RingCell]>();
  const found: { bastionId: number; route: RingPoint[]; closed: boolean }[] = [];
  const centreOf = (cell: RingCell): RingPoint => ({ x: cell.x + 0.5, z: cell.z + 0.5, y: 1.02 });
  for (const bastion of state.buildings) {
    if (bastion.kind !== 'bastion' || bastion.lostTick !== null) continue;
    const ring = sceneRampartRingOf(state, bastion);
    if (ring.access === null || ring.segments.length === 0) continue;
    const s = ring.segments, n = s.length;
    const start = { x: bastion.x, z: bastion.y };
    const post = ring.route[0]!;
    let runs: RingCell[][];
    if (ring.geometryReady) runs = [[start, ...s.slice(0, n - 1).map(item => item.cell), start]];
    else {
      let fwd = 0;
      while (fwd < n && s[fwd]!.eligible) fwd += 1;
      let back = 0;
      if (ring.topologyClosed && s[n - 1]!.variant === 'bastion-return') {
        while (back < n - fwd && s[n - 1 - back]!.eligible) back += 1;
      }
      runs = [[start, ...s.slice(0, fwd).map(item => item.cell)],
        [start, ...s.slice(n - back, n - 1).reverse().map(item => item.cell)]]
        .filter(run => run.length >= 2);
    }
    if (runs.length === 0) continue;
    for (const run of runs) {
      for (let i = 1; i < run.length; i += 1) {
        const a = run[i - 1]!, b = run[i]!;
        edges.set([cellKey(a), cellKey(b)].sort().join('|'), [a, b]);
      }
    }
    // El puesto está 0,08 hacia la escalera. Salir de él en línea recta al
    // vecino roza el pretil interior del primer tramo (0,31 medido, frente a
    // un cuerpo de 0,32): se pasa antes por el centro de la torre, en el eje.
    const tower = centreOf(start);
    const route: RingPoint[] = [post, tower];
    if (ring.geometryReady) route.push(...ring.route.slice(1, -1), tower, post);
    else {
      for (const run of runs) {
        const out = run.slice(1).map(centreOf);
        route.push(...out, ...out.slice(0, -1).reverse(), tower);
      }
      route.push(post);
    }
    found.push({ bastionId: bastion.id, route, closed: ring.geometryReady });
  }
  if (edges.size === 0) return null;
  const links = new Map<string, RingCell[]>();
  for (const [a, b] of edges.values()) {
    links.set(cellKey(a), [...links.get(cellKey(a)) ?? [], { x: b.x - a.x, z: b.z - a.z }]);
    links.set(cellKey(b), [...links.get(cellKey(b)) ?? [], { x: a.x - b.x, z: a.z - b.z }]);
  }
  const at = new Map(state.buildings.filter(item => item.lostTick === null && item.w === 1 && item.h === 1)
    .map(item => [`${item.x},${item.y}`, item]));
  const bastions: RampartBastion[] = [];
  const gates: RingCell[] = [];
  for (const [cell, directions] of [...links].sort(([a], [b]) => a.localeCompare(b))) {
    const building = at.get(cell);
    if (building === undefined) continue;
    const [x, z] = cell.split(',').map(Number) as [number, number];
    if (building.kind === 'gate') gates.push({ x, z });
    if (building.kind !== 'bastion') continue;
    const access = bastionAccessOf(state, building);
    // La escalera se aparta sólo si una diagonal sale por su lado: G-27 queda intacta en los demás.
    const shifted = access !== null && directions.some(link => link.x !== 0 && link.z !== 0
      && link.x * access.x + link.z * access.z > 0);
    bastions.push({ id: building.id, cell: { x, z }, access, links: directions,
      stairShift: shifted ? RAMPART.stairShift : 0 });
  }
  const shiftOf = new Map(bastions.map(item => [item.id, item.stairShift]));
  const centre = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
  const sortedEdges = [...edges.entries()].sort(([a], [b]) => a.localeCompare(b));
  const layout: RampartLayout = {
    edges: sortedEdges.map(([, edge]) => edge), bastions, gates, centre,
    signature: `${sortedEdges.map(([k]) => k).join(';')}#${bastions.map(item =>
      `${item.id}:${item.stairShift}:${item.access?.x ?? 'n'}${item.access?.z ?? 'n'}`).join(';')}`,
  };
  return { layout, patrols: new Map(found.map(item => [item.bastionId, { ...item,
    stairShift: shiftOf.get(item.bastionId) ?? 0 }])) };
}

/** El recorrido del guardia de una torre, o `null` si su torre no abre adarve. */
export function sceneRampartPatrolOf(state: GameState, bastion: Building): RampartPatrol | null {
  return sceneRampartOf(state)?.patrols.get(bastion.id) ?? null;
}

let rampartPhysics: { signature: string; cells: RingCell[]; obstacles: RampartObstacle[] } | null = null;

/** Caja de Rapier con la forma de `PhysicsObstacle`, sin que el plan dependa de la vida. */
export interface RampartObstacle {
  readonly at: { readonly x: number; readonly y: number; readonly z: number };
  readonly halfExtents: { readonly x: number; readonly y: number; readonly z: number };
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number; readonly w: number };
}

/**
 * E3b.3 · Lo que la vida necesita del adarve de una torre: ruta, escalera,
 * suelo físico y pretiles. Sale de los mismos prismas que se dibujan.
 */
export function sceneRampartPatrolView(state: GameState, bastion: Building): {
  readonly stairShift: number; readonly route: readonly RingPoint[];
  readonly platformCells: readonly RingCell[]; readonly obstacles: readonly RampartObstacle[];
} | null {
  const rampart = sceneRampartOf(state);
  const patrol = rampart?.patrols.get(bastion.id);
  if (rampart === null || rampart === undefined || patrol === undefined) return null;
  if (rampartPhysics?.signature !== rampart.layout.signature) {
    rampartPhysics = {
      signature: rampart.layout.signature,
      cells: rampartPlatformCells(rampart.layout),
      obstacles: rampartBoxes(rampartPrisms(rampart.layout)).map(item => ({
        at: item.at, halfExtents: item.half,
        rotation: { x: 0, y: Math.sin(item.yaw / 2), z: 0, w: Math.cos(item.yaw / 2) },
      })),
    };
  }
  return { stairShift: patrol.stairShift, route: patrol.route,
    platformCells: rampartPhysics.cells, obstacles: rampartPhysics.obstacles };
}

export interface PlannedBuilding {
  readonly id: BuildingId;
  readonly kind: BuildingKind;
  /** Top-left corner, in cells. */
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly ruin: boolean;
  readonly walls: number;
  readonly roof: number;
  readonly wallColour: string;
  readonly roofColour: string;
  readonly roofed: boolean;
  /**
   * G-10 · Qué recurso del catálogo le toca, o `null` para la caja con tejado.
   *
   * Va en el plan y no en el renderer porque es parte de **qué hay que ver**, no
   * de cómo se dibuja: un campo segado y uno sembrado son dos cosas distintas en
   * la escena, y el diff tiene que notar el cambio para reconstruir ese edificio
   * y sólo ese la semana de la siega.
   */
  readonly asset: string | null;
  /** Vecinos cardinales de una defensa viva; ausente en los demás edificios. */
  readonly connections?: number;
  /** Corners where a diagonal stone wall must meet the gate frame. */
  readonly gateCornerLinks?: number;
  readonly gate?: 'x' | 'z';
  /** Acabado estable por parcela, ajeno al estado y al azar del motor. */
  readonly variant?: number;
  /** Edad visual de los escombros domésticos; no modifica la parcela del motor. */
  readonly rubbleStage?: 'fresh' | 'settling' | 'scar';
  /** E3 · Variante visual con escalera y la cara que mira al interior. */
  readonly bastionAccess?: BastionAccess;
  /** E3b · Junta visible con el primer tramo de muro, derivada sin guardarla. */
  readonly bastionWalkway?: BastionWalkway;
  /** E3b.3 · Torre bajo el adarve generado: sin almenas propias y, si hace falta, escalera apartada. */
  readonly rampartShift?: number;
  /** IA-fields · En qué punto del año está la parcela. */
  readonly fieldPhase?: FieldPhase;
  /** IA-fields · Cuánto han crecido sus plantas, en décimas de 0 a 1. */
  readonly fieldGrowth?: number;
}

export interface ScenePlan {
  /**
   * Which game this is. A different seed is a different valley, and everything
   * built for the previous one has to go rather than be updated into place.
   */
  readonly game: string;
  /** Changes whenever the ground's look changes: terrain, paths, cleared land. */
  readonly ground: number;
  /** Cambia al adelgazar una copa o avanzar una etapa de rebrote. */
  readonly forest: number;
  readonly buildings: readonly PlannedBuilding[];
  /** Obras separadas de lo terminado: no comparten id ni registro de render. */
  readonly works: readonly PlannedWork[];
  /** E3b.3 · El adarve generado sobre el anillo de piedra, o nada. */
  readonly rampart: RampartLayout | null;
}

export interface PlannedWork {
  readonly id: number;
  readonly kind: BuildingKind;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly upgradeOf: BuildingId | null;
  readonly progress: number;
}

export interface PlanChange {
  readonly ground: boolean;
  readonly forest: boolean;
  readonly cleared: boolean;
  readonly added: readonly PlannedBuilding[];
  readonly changed: readonly PlannedBuilding[];
  readonly removed: readonly BuildingId[];
  readonly works: WorkChange;
  readonly rampart: boolean;
}

export interface WorkChange {
  readonly added: readonly PlannedWork[];
  readonly changed: readonly PlannedWork[];
  readonly removed: readonly number[];
}

/**
 * A number that changes when the ground's appearance changes, and not otherwise.
 *
 * Terrain and paths are two arrays of about two thousand bytes. Walking them
 * once a frame costs almost nothing and saves keeping a version counter inside
 * `GameState`, which §4 would not have: the engine does not know a screen
 * exists, and a field whose only reader is a renderer is exactly the kind of
 * thing D.5 forbids adding.
 */
/** Las tres paletas que puede mostrar una estación: base, media mezcla y siguiente. */
export function seasonColourStep(seasonWeek: number): number {
  // La paleta gira en las `TURN_WEEKS` últimas semanas (`derive/palette.ts`).
  return Math.max(0, seasonWeek - (TIME.WEEKS_PER_SEASON - 1 - TURN_WEEKS));
}

export function groundSignature(map: ValleyMap, tick: number): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < map.terrain.length; index += 1) {
    hash = Math.imul(hash ^ (map.terrain[index] ?? 0), 16_777_619);
    hash = Math.imul(hash ^ (map.path[index] ?? 0), 16_777_619);
  }
  // G-08 · la estación cambia el color del suelo sin cambiar el terreno, y las
  // dos últimas semanas de cada estación anticipan la siguiente (§10.3).
  // Sin esto, el valle seguía verde en enero: el suelo sólo se reconstruía
  // cuando alguien talaba un árbol.
  const clock = clockOf(tick);
  hash = Math.imul(hash ^ SEASONS.indexOf(clock.season), 16_777_619);
  hash = Math.imul(hash ^ seasonColourStep(clock.seasonWeek), 16_777_619);
  return hash >>> 0;
}

function look(building: Building): BuildingLook {
  return BUILDING_LOOKS[building.kind];
}


/**
 * El recurso que le toca a un edificio esta semana.
 *
 * Casi todos tienen uno fijo. El campo no: entre la siembra y la siega está
 * sembrado y el resto del año está segado, y eso se ve desde arriba. La regla
 * sale de `TIME.HARVEST_WEEK`, la misma semana en la que el motor recoge el
 * grano, así que si alguien mueve la cosecha el campo cambia con ella.
 */
/**
 * En que se queda una casa perdida.
 *
 * De madera o de piedra, porque §7.4 las trata distinto: sobre la de madera se
 * vuelve a construir y sobre la de piedra no, y lo que el jugador ve tiene que
 * ser lo que el juego hace. Un campo perdido no es una ruina, es un rastrojo.
 */
const RUIN_ASSETS: Readonly<Record<0 | 1, string>> = {
  0: 'ruin-wood',
  1: 'ruin-stone',
};

/** Los materiales terminan de caer y luego queda sólo la huella del solar. */
export function houseRubbleStage(building: Building, tick: number): 'fresh' | 'settling' | 'scar' | 'gone' | null {
  if (building.lostTick === null || (building.kind !== 'house' && building.kind !== 'stone_house')) return null;
  const age = Math.max(0, tick - building.lostTick);
  if (age < HOUSE_RUBBLE.FRESH_WEEKS) return 'fresh';
  if (age < HOUSE_RUBBLE.CLEAR_WEEKS) return 'settling';
  // La piedra conserva una cimentación visible porque su solar sigue cerrado.
  // También se marca la madera si el suelo quemado sigue bloqueado.
  return building.tier === 1 || (building.blockedUntil !== null && building.blockedUntil > tick)
    ? 'scar' : 'gone';
}

// G-22 · Variedades visuales estables por parcela, sin azar ni recursos nuevos.
export const FIELD_CROPS: readonly string[] = ['field', 'field-cabbage', 'field-leeks'];

function assetFor(building: Building, tick: number): string | null {
  if (building.lostTick !== null) {
    return building.kind === 'field' ? 'field-cut' : RUIN_ASSETS[building.tier];
  }
  if (building.kind === 'field') {
    // IA-fields · la fase la dice el año del campo del motor (`world/crops`):
    // abonado, rastrojo y reposo sobre tierra lisa; desde el arado, los surcos
    // del cultivo, con sus plantas creciendo (`fieldGrowth`).
    const { phase } = fieldMoment(cropOf(building), tick);
    return phase === 'manure' || phase === 'stubble' || phase === 'fallow'
      ? 'field-cut' : FIELD_CROPS[CROPS.indexOf(cropOf(building))] ?? 'field';
  }
  return BUILDING_ASSETS[building.kind] ?? null;
}

function plannedFrom(building: Building, tick: number): PlannedBuilding {
  const ruin = building.lostTick !== null;
  const rubbleStage = houseRubbleStage(building, tick);
  const shape = look(building);
  return {
    asset: rubbleStage === 'scar' ? null : assetFor(building, tick),
    id: building.id,
    kind: building.kind,
    x: building.x,
    z: building.y,
    w: building.w,
    h: building.h,
    ruin,
    // A ruin is the same footprint, lower and greyer, and it loses its roof.
    // §7.4 leaves it standing on the map, so it has to read as a ruin from the
    // panoramic view where nobody is reading labels.
    walls: ruin ? RUIN.height : shape.walls,
    roof: ruin ? 0 : shape.roof,
    wallColour: ruin ? RUIN.colour : shape.wallColour,
    roofColour: shape.roofColour,
    roofed: ruin ? false : shape.roofed,
    ...(rubbleStage !== null && rubbleStage !== 'gone' ? { rubbleStage } : {}),
    ...(building.kind === 'field' && !ruin ? fieldLook(building, tick) : {}),
  };
}

/**
 * IA-fields · Cómo está la tierra y cuánto ha crecido lo sembrado.
 *
 * El crecimiento se cuantiza a décimas: el plan compara edificios en cada
 * pintada y una parcela sólo se reconstruye cuando se nota la diferencia.
 */
function fieldLook(building: Building, tick: number): Pick<PlannedBuilding, 'fieldPhase' | 'fieldGrowth'> {
  const moment = fieldMoment(cropOf(building), tick);
  const growth = moment.phase === 'plough' ? 0 : Math.round(moment.growth * 10) / 10;
  return { fieldPhase: moment.phase, fieldGrowth: growth };
}

function plannedWork(work: ConstructionWork): PlannedWork {
  return {
    id: work.id, kind: work.kind, x: work.x, z: work.y, w: work.w, h: work.h,
    upgradeOf: work.upgradeOf,
    progress: Math.max(0, Math.min(1, work.bpCost <= 0 ? 1 : work.bpDone / work.bpCost)),
  };
}

export function planFor(state: GameState): ScenePlan {
  const hiding = new Set(state.works
    .filter((work) => work.upgradeOf !== null && (work.kind === 'gate' || work.kind === 'wall'))
    .map((work) => work.upgradeOf!));
  // Sólo la fuente de la sustitución desaparece durante la obra: sus vecinos
  // siguen en el plan para que el ensamblador de defensas abra el hueco real.
  const visible = visibleBuildings(state).filter((building) =>
    !hiding.has(building.id) && houseRubbleStage(building, state.tick) !== 'gone');
  const connections = defenceConnections(visible);
  const gates = defenceGates(state);
  const gateAsset = (gate: Building): string => {
    const nearby = visible.filter((building) => building.lostTick === null
      && Math.abs(building.x - gate.x) <= 1 && Math.abs(building.y - gate.y) <= 1);
    // Durante la sustitución del cerco, el portón conserva madera mientras
    // alguna estaca vecina siga en pie. Sin vecinos, manda el material del anillo.
    if (nearby.some((building) => building.kind === 'palisade')) return 'gate-timber';
    if (nearby.some((building) => building.kind === 'wall' || building.kind === 'bastion')) return 'gate';
    return visible.some((building) => building.kind === 'wall' || building.kind === 'bastion')
      ? 'gate' : 'gate-timber';
  };
  const gateCornerLinks = (gate: Building): number => DEFENCE_DIAGONALS.reduce((mask, direction) => {
    const neighbour = visible.find((building) => building.kind === 'wall' && building.lostTick === null
      && building.x === gate.x + direction.x && building.y === gate.y + direction.z);
    if (neighbour === undefined) return mask;
    const returnBit = DEFENCE_DIAGONALS.find((diagonal) => diagonal.x === -direction.x
      && diagonal.z === -direction.z)?.bit ?? 0;
    return (connections.get(neighbour.id) ?? 0) & returnBit ? mask | direction.bit : mask;
  }, 0);
  const rampart = sceneRampartOf(state);
  const rampartShift = new Map(rampart?.layout.bastions.map(item => [item.id, item.stairShift]) ?? []);
  return {
    game: `${state.seed}:${state.terrainSeed}`,
    rampart: rampart?.layout ?? null,
    ground: groundSignature(state.map, state.tick),
    forest: forestSignature(state),
    buildings: visible.map((building) => {
      const access = building.kind === 'bastion' ? bastionAccessOf(state, building) : null;
      const walkway = access === null ? null : sceneWalkwayOf(state, building);
      return { ...plannedFrom(building, state.tick),
        ...(building.kind === 'gate' && building.lostTick === null ? {
          asset: gateAsset(building),
          gateCornerLinks: gateAsset(building) === 'gate' ? gateCornerLinks(building) : 0,
        } : {}),
        ...((building.kind === 'house' || building.kind === 'stone_house') && building.lostTick === null
          ? { variant: houseVariant(state.seed, building.x, building.y) } : {}),
        ...(connections.has(building.id) ? { connections: connections.get(building.id)! } : {}),
        ...(gates.has(building.id) ? { gate: gates.get(building.id)! } : {}),
        ...(access === null ? {} : walkway === null
          ? { asset: 'bastion-access-candidate', bastionAccess: access }
          : { asset: 'e3b-bastion-joint-candidate', bastionAccess: access, bastionWalkway: walkway }),
        ...(rampartShift.has(building.id) ? { rampartShift: rampartShift.get(building.id)! } : {}),
      };
    })
      .sort((a, b) => a.id - b.id),
    works: state.works.map(plannedWork).sort((a, b) => a.id - b.id),
  };
}

function same(a: PlannedBuilding, b: PlannedBuilding): boolean {
  return a.kind === b.kind && a.x === b.x && a.z === b.z && a.w === b.w && a.h === b.h
    && a.ruin === b.ruin && a.walls === b.walls && a.roof === b.roof
    && a.wallColour === b.wallColour && a.roofColour === b.roofColour && a.roofed === b.roofed
    && a.asset === b.asset && a.connections === b.connections
    && a.gateCornerLinks === b.gateCornerLinks && a.gate === b.gate && a.variant === b.variant
    && a.rubbleStage === b.rubbleStage
    && a.bastionAccess?.x === b.bastionAccess?.x && a.bastionAccess?.z === b.bastionAccess?.z
    && a.bastionWalkway?.firstWallId === b.bastionWalkway?.firstWallId
    && a.bastionWalkway?.nextWallId === b.bastionWalkway?.nextWallId
    && a.bastionWalkway?.side.x === b.bastionWalkway?.side.x
    && a.bastionWalkway?.side.z === b.bastionWalkway?.side.z
    && a.rampartShift === b.rampartShift
    && a.fieldPhase === b.fieldPhase && a.fieldGrowth === b.fieldGrowth;
}

function sameWork(a: PlannedWork, b: PlannedWork): boolean {
  return a.kind === b.kind && a.x === b.x && a.z === b.z && a.w === b.w && a.h === b.h
    && a.upgradeOf === b.upgradeOf && a.progress === b.progress;
}

function workChange(previous: readonly PlannedWork[], next: readonly PlannedWork[]): WorkChange {
  const before = new Map(previous.map((work) => [work.id, work]));
  const added: PlannedWork[] = [];
  const changed: PlannedWork[] = [];
  for (const work of next) {
    const was = before.get(work.id);
    if (was === undefined) added.push(work);
    else if (!sameWork(was, work)) changed.push(work);
    before.delete(work.id);
  }
  return { added, changed, removed: [...before.keys()] };
}

/**
 * What has to be touched to go from one plan to the next.
 *
 * `cleared` means start again from nothing: a different game, or a load. There
 * is no sense updating a house from another valley into a house in this one,
 * and trying would leave whatever the two plans happened to share.
 */
export function planChange(previous: ScenePlan | null, next: ScenePlan): PlanChange {
  if (previous === null || previous.game !== next.game) {
    return {
      ground: true, forest: true, cleared: true, added: next.buildings, changed: [], removed: [],
      works: { added: next.works, changed: [], removed: [] }, rampart: true,
    };
  }

  const before = new Map(previous.buildings.map((building) => [building.id, building]));
  const added: PlannedBuilding[] = [];
  const changed: PlannedBuilding[] = [];
  for (const building of next.buildings) {
    const was = before.get(building.id);
    if (was === undefined) added.push(building);
    else if (!same(was, building)) changed.push(building);
    before.delete(building.id);
  }

  return {
    ground: previous.ground !== next.ground,
    forest: previous.forest !== next.forest,
    cleared: false,
    added,
    changed,
    removed: [...before.keys()],
    works: workChange(previous.works, next.works),
    rampart: previous.rampart?.signature !== next.rampart?.signature,
  };
}

/** Whether a change asks for any work at all. Most frames ask for none. */
export function isQuiet(change: PlanChange): boolean {
  return !change.ground && !change.forest && !change.cleared && !change.rampart
    && change.added.length === 0 && change.changed.length === 0 && change.removed.length === 0
    && change.works.added.length === 0 && change.works.changed.length === 0 && change.works.removed.length === 0;
}
