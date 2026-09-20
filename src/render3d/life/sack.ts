// D6 · Lo que hace la partida después de cruzar el portón.
//
// El motor ya decidió qué se perdió y si el valle acabó. Esta escena no vuelve
// a cobrar nada: baja ese hecho a cuerpos, rutas, cargas y una huella que queda
// en el suelo hasta que termine la jornada. Un saqueador sólo carga algo tras
// llegar de verdad a la puerta de un edificio existente y alcanzable.

import { hash32 } from '@engine/rng';
import type { BuildingKind, GameState } from '@engine/state';
import { fitsCircle, integrate, turnTo, type Point, type Terrain } from './body';
import { LIFE_STEP } from './clock';
import { pathTo, type Waypoint } from './navigate';
import { doorOf } from './offers';
import type { Prop } from './props';
import type { Raider } from './raiders';
import { nearestReachable, reachableFrom } from './terrain';

export type SackPhase = 'entering' | 'looting' | 'escaping' | 'complete';
export type SackLoad = 'grain' | 'bundle';

export interface SackTarget {
  readonly buildingId: number;
  readonly kind: BuildingKind;
  readonly at: Point;
  readonly load: SackLoad;
}

interface Assignment {
  readonly target: SackTarget;
  route: Waypoint[];
  deadline: number;
  sackUntil: number;
  traced: boolean;
}

export interface SackTrace {
  readonly raiderId: number;
  readonly targetId: number;
  readonly prop: Prop;
}

export interface SackScene {
  readonly targets: readonly SackTarget[];
  readonly traces: readonly SackTrace[];
  readonly assignments: ReadonlyMap<number, Assignment>;
  readonly phase: SackPhase;
  readonly ready: boolean;
  readonly loads: number;
  step(raiders: readonly Raider[], land: Terrain, seed: number, step: number): readonly Prop[];
}

/** Edificios que cuentan una historia de saqueo sin inventar un daño nuevo. */
const TARGET_WEIGHT: Partial<Record<BuildingKind, number>> = {
  granary: 0,
  hall: 1,
  mill: 2,
  smithy: 3,
  house: 4,
  stone_house: 4,
};

/** Un gesto corto, bastante largo para leerse desde la cámara de partida. */
const SACK_STEPS = 54;
/** Margen de viaje: el objetivo ya tiene ruta, esto sólo evita un cuerpo eterno. */
const ROUTE_SLACK = 300;
const REACHED = 0.58;
const TRACE_ID_BASE = 3_100_000;

function loadFor(kind: BuildingKind): SackLoad {
  return kind === 'granary' ? 'grain' : 'bundle';
}

function routeDeadline(from: Point, to: Point, step: number, pace: number): number {
  const seconds = Math.hypot(to.x - from.x, to.z - from.z) / Math.max(0.1, pace);
  return step + Math.ceil((seconds * 2) / LIFE_STEP) + ROUTE_SLACK;
}

function candidates(state: GameState, land: Terrain, from: Point, radius: number): SackTarget[] {
  return state.buildings
    .filter((building) => building.lostTick === null && TARGET_WEIGHT[building.kind] !== undefined)
    .map((building): SackTarget | null => {
      const at = doorOf(land, building.x, building.y, building.w, building.h);
      if (at === null || !fitsCircle(land, at.x, at.z, radius) || pathTo(land, from, at, radius) === null) return null;
      return { buildingId: building.id, kind: building.kind, at, load: loadFor(building.kind) };
    })
    .filter((target): target is SackTarget => target !== null)
    .sort((a, b) => (TARGET_WEIGHT[a.kind] ?? 99) - (TARGET_WEIGHT[b.kind] ?? 99)
      || a.buildingId - b.buildingId);
}

/**
 * Una rotura deja a veces el cuerpo rozando la jamba física. El A* no puede
 * arrancar desde ese solape aunque el siguiente suelo libre sea alcanzable.
 * Se conserva el primer tramo como movimiento normal —nunca se teletransporta
 * ni se concede carga— y sólo se usa para salir de ese contacto residual.
 */
function routeTo(land: Terrain, raider: Raider, goal: Point): Waypoint[] | null {
  const direct = pathTo(land, raider.body, goal, raider.body.radius);
  if (direct !== null || fitsCircle(land, raider.body.x, raider.body.z, raider.body.radius)) return direct;
  const recovery = nearestReachable(land, reachableFrom(land, goal), raider.body, raider.body.radius);
  if (recovery === null) return null;
  const tail = pathTo(land, recovery, goal, raider.body.radius);
  return tail === null ? null : [recovery, ...tail];
}

function follow(raider: Raider, route: Waypoint[], goal: Point, land: Terrain): boolean {
  const { body } = raider;
  if (Math.hypot(goal.x - body.x, goal.z - body.z) < REACHED) {
    body.vx = 0;
    body.vz = 0;
    return true;
  }
  const next = route[0];
  const to = next === undefined ? goal : next;
  // No se salta media celda de una ruta fina junto a una jamba: desde el
  // boquete esa poda cortaba una esquina y volvía a dejar al saqueador pegado
  // al poste. Un cuarto de radio conserva los giros que la ruta calculó.
  if (next !== undefined && Math.hypot(to.x - body.x, to.z - body.z) < body.radius * 0.5) route.shift();
  const distance = Math.hypot(to.x - body.x, to.z - body.z) || 1;
  body.vx = ((to.x - body.x) / distance) * body.pace;
  body.vz = ((to.z - body.z) / distance) * body.pace;
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  integrate(body, land, LIFE_STEP);
  return false;
}

function traceOf(raider: Raider, assignment: Assignment, land: Terrain, seed: number, index: number): SackTrace {
  const angle = (hash32(seed, `sack:${raider.body.id}:trace-angle`) / 0xffffffff) * Math.PI * 2;
  const radius = 0.3 + (hash32(seed, `sack:${raider.body.id}:trace-far`) / 0xffffffff) * 0.28;
  const wanted = {
    x: raider.body.x + Math.cos(angle) * radius,
    z: raider.body.z + Math.sin(angle) * radius,
  };
  // La huella nace junto a los pies, pero no cruza la pared por un adorno. Si
  // el lado sorteado no admite el mismo cuerpo que acaba de llegar, se queda
  // exactamente en su plaza alcanzada, que por construcción sí es suelo real.
  const safe = fitsCircle(land, wanted.x, wanted.z, 0.11)
    ? wanted : { x: raider.body.x, z: raider.body.z };
  return {
    raiderId: raider.body.id,
    targetId: assignment.target.buildingId,
    prop: {
      id: -(TRACE_ID_BASE + index), kind: assignment.target.load,
      x: safe.x, z: safe.z, y: 0, vx: 0, vz: 0, vy: 0, held: null,
      // No es una reserva nueva que un vecino pueda recoger: es el rastro de
      // una reserva que el motor ya quitó.
      restUntil: Number.POSITIVE_INFINITY,
      for: null,
      fixed: true,
    },
  };
}

/**
 * Prepara objetivos reales, pero no empieza a saquear hasta que cada cuerpo ha
 * cruzado. La asignación es estable dentro de la jornada y reparte el grupo
 * entre los sitios que existan, en vez de inventar un tesoro en la plaza.
 */
export function createSackScene(state: GameState, land: Terrain, raiders: readonly Raider[]): SackScene {
  const from = raiders[0]?.inside ?? { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
  const targets = candidates(state, land, from, raiders[0]?.body.radius ?? 0.32);
  const assignments = new Map<number, Assignment>();
  for (let index = 0; index < raiders.length && targets.length > 0; index += 1) {
    const raider = raiders[index]!;
    const target = targets[index % targets.length]!;
    assignments.set(raider.body.id, {
      target,
      route: [],
      deadline: 0,
      sackUntil: 0,
      traced: false,
    });
  }
  const traces: SackTrace[] = [];

  return {
    targets,
    traces,
    assignments,
    get phase(): SackPhase {
      if (raiders.some((r) => !r.entered && r.phase !== 'down' && r.phase !== 'gone')) return 'entering';
      if (raiders.some((r) => r.phase === 'inside' || r.phase === 'seeking' || r.phase === 'sacking')) return 'looting';
      if (raiders.some((r) => r.phase === 'escaping'
        || (r.load !== null && r.load !== undefined && r.phase !== 'gone' && r.phase !== 'down'))) return 'escaping';
      return 'complete';
    },
    get ready(): boolean { return traces.length > 0 && this.phase !== 'entering' && this.phase !== 'looting'; },
    get loads(): number { return raiders.filter((raider) => raider.load !== null && raider.load !== undefined).length; },

    step(active, terrain, seed, step): readonly Prop[] {
      const created: Prop[] = [];
      for (const raider of active) {
        if (raider.phase === 'down' || raider.phase === 'gone' || !raider.entered) continue;
        const assignment = assignments.get(raider.body.id);
        if (assignment === undefined) {
          // Sin edificio alcanzable no se finge haber saqueado: se retira con
          // las manos vacías y el resultado económico sigue siendo el del motor.
          if (raider.phase === 'inside') {
            raider.phase = 'escaping';
            raider.route = routeTo(terrain, raider, raider.road) ?? [];
            raider.deadline = routeDeadline(raider.body, raider.road, step, raider.body.pace);
          }
        } else if (raider.phase === 'inside') {
          const route = routeTo(terrain, raider, assignment.target.at);
          if (route === null) {
            // Alcanzable desde el corazón no garantiza alcanzable desde cada
            // cuerpo junto al boquete. Sin ruta propia se retira vacío.
            raider.phase = 'escaping';
            raider.route = routeTo(terrain, raider, raider.road) ?? [];
            raider.deadline = routeDeadline(raider.body, raider.road, step, raider.body.pace);
          } else {
            raider.phase = 'seeking';
            assignment.route = route;
            assignment.deadline = routeDeadline(raider.body, assignment.target.at, step, raider.body.pace);
          }
        }

        if (raider.phase === 'seeking' && assignment !== undefined) {
          if (follow(raider, assignment.route, assignment.target.at, terrain)) {
            raider.phase = 'sacking';
            assignment.sackUntil = step + SACK_STEPS;
            raider.body.facing = Math.atan2(
              assignment.target.at.x - raider.body.x,
              assignment.target.at.z - raider.body.z,
            );
          } else if (step > assignment.deadline) {
            // Un plazo vencido no concede una carga. Es la diferencia entre
            // «había ruta al crear la escena» y «llegó de verdad».
            raider.forced = true;
            raider.phase = 'escaping';
            raider.route = routeTo(terrain, raider, raider.road) ?? [];
            raider.deadline = routeDeadline(raider.body, raider.road, step, raider.body.pace);
          }
        } else if (raider.phase === 'sacking' && assignment !== undefined) {
          raider.body.vx = 0;
          raider.body.vz = 0;
          if (step >= assignment.sackUntil) {
            raider.load = assignment.target.load;
            if (!assignment.traced) {
              assignment.traced = true;
              const trace = traceOf(raider, assignment, terrain, seed, traces.length);
              traces.push(trace);
              created.push(trace.prop);
            }
            raider.phase = 'escaping';
            raider.route = routeTo(terrain, raider, raider.road) ?? [];
            raider.deadline = routeDeadline(raider.body, raider.road, step, raider.body.pace);
          }
        }

        if (raider.phase === 'escaping') {
          const arrived = follow(raider, raider.route, raider.road, terrain);
          if (arrived || step > raider.deadline) {
            if (!arrived) raider.forced = true;
            raider.phase = 'gone';
            raider.body.vx = 0;
            raider.body.vz = 0;
          }
        }
      }
      return created;
    },
  };
}

export interface SackSnapshot {
  readonly phase: SackPhase;
  readonly ready: boolean;
  readonly loads: number;
  readonly traces: number;
  readonly targets: readonly { readonly id: number; readonly kind: BuildingKind; readonly x: number; readonly z: number }[];
}

export function sackSnapshot(scene: SackScene): SackSnapshot {
  return {
    phase: scene.phase,
    ready: scene.ready,
    loads: scene.loads,
    traces: scene.traces.length,
    targets: scene.targets.map((target) => ({
      id: target.buildingId, kind: target.kind, x: target.at.x, z: target.at.z,
    })),
  };
}
