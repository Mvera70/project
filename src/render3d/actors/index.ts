// G-05 · Actors, derived. design.md D.5, D.6, §11.9.
//
// `actorsFor` is a pure function of the state and the frame. It writes nothing,
// draws no randomness, keeps no cache of its own and holds no memory between
// frames. That is not tidiness: §4.3 requires that the same instant always
// produce the same picture, because the player closes the application and comes
// back two hours later and the valley has to be exactly where it should be
// without having simulated anything.
//
// It also means there is no such thing here as a stale route. D.6 asks that a
// death or a move never leave an actor walking an old path; nothing can, because
// every path is worked out again from the state that is in front of us.

import { DAY } from '@engine/balance';
import { isHere } from '@engine/people/demography';
import type { Building, GameState, Villager, VillagerId } from '@engine/state';
import { routesFor } from '@engine/world/paths';
import type { GraphicsFrame } from '../contracts';
import { dayPhase, SCENIC_DAY_SECONDS } from '../presentation-clock';
import { clipTime, VILLAGER_CLIPS, type ClipName } from './clips';
import { dayOf, energyOf, progressOf, stable, type Activity } from './day';

/**
 * The most villagers on stage at once.
 *
 * The Canvas renderer's limit, kept deliberately: D.6 says the initial visible
 * maximum stays where it is, and raising it is a performance decision that
 * belongs to G-09 with a measurement behind it, not to this round.
 */
export const MAX_ACTORS = 80;

export interface Actor {
  readonly id: VillagerId;
  /** Scene position. Map `(x, y)` becomes scene `(x, 0, z)` with `z = y` (D.4). */
  readonly x: number;
  readonly z: number;
  /** Where the actor looks, in radians about the vertical axis. Zero faces `+z`. */
  readonly facing: number;
  readonly activity: Activity;
  readonly clip: ClipName;
  /** Where that clip should be, in its own seconds. */
  readonly clipSeconds: number;
  /**
   * Ground covered along the route so far, in cells, since this leg began.
   *
   * What drives the clip, and therefore the reason the feet do not slide. It
   * counts distance ALONG the path, not the actor's total displacement: the
   * lane offset drifts sideways as someone leaves their door, and sideways is
   * not progress.
   */
  readonly travelled: number;
  /** The cell this actor belongs to right now. A door or an anchor hangs off it. */
  readonly cell: number;
  readonly named: boolean;
}

export interface ActorPlan {
  /** Where each villager is headed today. Defaults to the engine's own routes. */
  readonly routes: Map<VillagerId, number[]>;
}

interface Point { x: number; z: number }

/** The cell a building sits on, taken at its middle. */
function centre(building: Building, width: number): number {
  return (building.y + Math.floor(building.h / 2)) * width + building.x + Math.floor(building.w / 2);
}

function cellPoint(cell: number, width: number): Point {
  return { x: (cell % width) + 0.5, z: Math.floor(cell / width) + 0.5 };
}

/**
 * A point `t` of the way along a route, and the direction of travel there.
 *
 * D.6 asks that corners be turned along the tangent and never cut through water
 * or buildings. Following the cell centres does both: the route is already only
 * made of walkable cells, so a straight line between two consecutive centres
 * cannot leave them.
 */
function along(cells: readonly number[], t: number, width: number, total: number): { at: Point; heading: number } {
  if (cells.length === 0) return { at: { x: 0, z: 0 }, heading: 0 };
  if (cells.length === 1 || total === 0) {
    const only = cells[0] ?? 0;
    return { at: cellPoint(only, width), heading: 0 };
  }
  // Repartido por LONGITUD, no por indice de celda. Una ruta mezcla tramos
  // rectos y diagonales, que miden 1 y 1,41, asi que repartir por indice hace
  // que el aldeano acelere en las diagonales. No se veia a ojo, pero lo delato
  // el reloj del clip: el paso avanzaba dos tercios de lo que el cuerpo se
  // movia justo en esos tramos, que es exactamente lo que significa patinar.
  let want = Math.max(0, Math.min(1, t)) * total;
  for (let index = 0; index + 1 < cells.length; index += 1) {
    const from = cellPoint(cells[index] ?? 0, width);
    const to = cellPoint(cells[index + 1] ?? 0, width);
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const step = Math.hypot(dx, dz);
    if (want <= step || index + 2 === cells.length) {
      const local = step === 0 ? 0 : Math.min(1, want / step);
      return {
        at: { x: from.x + dx * local, z: from.z + dz * local },
        heading: dx === 0 && dz === 0 ? 0 : Math.atan2(dx, dz),
      };
    }
    want -= step;
  }
  const last = cells[cells.length - 1] ?? 0;
  return { at: cellPoint(last, width), heading: 0 };
}

/**
 * La direccion de la marcha alrededor de `t`, no la del tramo que se pisa.
 *
 * Se mira un poco antes y un poco despues y se traza la recta entre los dos
 * puntos. Dos cosas salen de aqui: el giro en una esquina deja de ser
 * instantaneo, que es lo que D.6 pide al hablar de girar segun la tangente, y
 * el carril deja de dar un tirón lateral al cambiar de tramo. Ese tirón era
 * medible: en una esquina el aldeano se desplazaba el doble de lo que avanzaba.
 */
function headingAround(cells: readonly number[], t: number, width: number, total: number): number {
  if (total === 0) return 0;
  const reach = Math.min(0.5, 0.9 / total);
  const back = along(cells, t - reach, width, total).at;
  const ahead = along(cells, t + reach, width, total).at;
  const dx = ahead.x - back.x;
  const dz = ahead.z - back.z;
  if (dx === 0 && dz === 0) return along(cells, t, width, total).heading;
  return Math.atan2(dx, dz);
}

/** How long a route is, in cells. Feeds the clip phase, so the feet do not slide. */
function lengthOf(cells: readonly number[], width: number): number {
  let total = 0;
  for (let index = 0; index + 1 < cells.length; index += 1) {
    const from = cellPoint(cells[index] ?? 0, width);
    const to = cellPoint(cells[index + 1] ?? 0, width);
    total += Math.hypot(to.x - from.x, to.z - from.z);
  }
  return total;
}

/**
 * How far each villager stands to the side of the path's axis.
 *
 * Two neighbours walking the same route drew the same line, one behind the
 * other: on screen they were one figure, not two. People walk beside a path,
 * not along a painted stripe.
 */
/** Cuanto se aparta esta persona del eje del camino, en celdas. */
function laneWidth(id: number, total: number): number {
  const room = Math.min(1, total / LANE_FULL);
  return (stable(id, 4_919) - 0.5) * 2 * DAY.LANE * room;
}

function lane(heading: number, id: number, window: number, total: number): Point {
  // Y el carril se estrecha en un viaje corto: con la anchura entera, ir a la
  // casa de al lado salía un quiebro lateral casi del tamaño del viaje.
  const side = laneWidth(id, total) * window;
  return { x: Math.cos(heading) * side, z: -Math.sin(heading) * side };
}

/** A partir de esta longitud de ruta, en celdas, el carril usa toda su anchura. */
const LANE_FULL = 4;

/**
 * Cero en los extremos y uno en el medio.
 *
 * Todo lo que aparta a alguien de la línea de su ruta —el carril, el vaivén del
 * trabajo— se apaga al principio y al final de su fase. Sin esto, un aldeano
 * que deja de trabajar aparecía de golpe en el centro de la parcela: medido,
 * 1,67 celdas en la centésima parte de un día. El render de Canvas tiene el
 * mismo salto, y D.6 pide expresamente que no los haya.
 */
function window(t: number): number {
  // Al cuadrado, no el seno a secas: así la pendiente también es cero en los
  // extremos. Con el seno solo, el desvío lateral crecía de golpe al salir de
  // casa y añadía un 16 % de movimiento que no era avance.
  const eased = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  return eased * eased;
}

/**
 * Working is not standing still: it is going up and down the same piece of
 * field, at a pace and a bearing of one's own so that two neighbours do not
 * keep time like a mechanism.
 */
function workWander(
  person: Villager, tick: number, through: number, spanSeconds: number,
): { offset: Point; heading: number; travelled: number } {
  const energy = energyOf(person, tick);
  const laps = DAY.WORK_LAPS * energy;
  // Nadie se mueve más deprisa de lo que su propio ciclo de andar permite.
  //
  // Sin este tope, un crío —que juega en vez de trabajar, y por eso da más
  // vueltas y más amplias— cruzaba cuatro celdas de ida y vuelta cinco veces
  // por jornada: 8,6 celdas por segundo escénico, doce veces la velocidad a la
  // que anda un aldeano. En Canvas no se notaba porque un sprite no tiene
  // piernas; con un clip de andar movido por el suelo, se veía patinar.
  const wanted = DAY.WORK_REACH * energy;
  const peak = spanSeconds <= 0 ? 0 : (wanted * 2 * Math.PI * laps) / spanSeconds;
  const amplitude = peak > WALK_SPEED ? wanted * (WALK_SPEED / peak) : wanted;

  const swing = Math.sin(through * Math.PI * 2 * laps + person.id * 1.7) * window(through);
  const heading = stable(person.id, 31_337) * Math.PI * 2;
  return {
    offset: {
      x: Math.cos(heading) * swing * amplitude,
      z: Math.sin(heading) * swing * amplitude,
    },
    // Facing follows the furrow, and flips when the furrow does.
    heading: swing >= 0 ? heading : heading + Math.PI,
    // Cada vuelta recorre cuatro veces la amplitud. Basta para que el clip de
    // quien va y viene por su parcela avance con el suelo y no con el reloj.
    travelled: amplitude * 4 * laps * Math.max(0, Math.min(1, through)),
  };
}

/** Celdas por segundo escénico que da el ciclo de andar del aldeano. */
const WALK_SPEED = (VILLAGER_CLIPS.walk.strideLength ?? 1) / VILLAGER_CLIPS.walk.seconds;

/** Nobody strays further than the leash from where they are supposed to be. */
function leash(point: Point, anchor: Point): Point {
  const dx = point.x - anchor.x;
  const dz = point.z - anchor.z;
  const far = Math.hypot(dx, dz);
  if (far <= DAY.MAX_DRIFT || far === 0) return point;
  const scale = DAY.MAX_DRIFT / far;
  return { x: anchor.x + dx * scale, z: anchor.z + dz * scale };
}

function clipFor(activity: Activity, person: Villager, tick: number): ClipName {
  if (activity === 'walking') return 'walk';
  // They go out empty-handed and come back loaded, which is what makes the
  // fourth clip earn its place. A child plays instead of working, so a child
  // carries nothing home.
  if (activity === 'returning') return energyOf(person, tick) > 1 ? 'walk' : 'carry_walk';
  // Un crío no azadona: juega, y anda. Reproducir un golpe de azada mientras se
  // desplaza es exactamente la figura sin vida que hay que evitar.
  if (activity === 'working') return energyOf(person, tick) > 1 ? 'walk' : 'work_hoe';
  return 'idle';
}

/**
 * Who is on stage, and in what order.
 *
 * D.6 asks for the tracked villager and the named ones first, then a stable
 * order. Stable means by id: any order that depended on position would reshuffle
 * the cast as people walked, and the cut would fall on someone different every
 * frame.
 */
function cast(state: GameState, tracked: VillagerId | null): Villager[] {
  const rank = new Map(state.people.namedIds.map((id, index) => [id, index]));
  const here = state.people.villagers.filter(isHere);
  // Three buckets rather than one comparator. A comparator with a special case
  // for the tracked villager is not a total order —it says both `a < b` and
  // `b < a` when either of them is the tracked one— and a sort given one of
  // those is free to return anything at all.
  const followed = here.filter((person) => person.id === tracked);
  const rest = here.filter((person) => person.id !== tracked);
  const byRank = (a: Villager, b: Villager): number => {
    const rankA = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return rankA === rankB ? a.id - b.id : rankA - rankB;
  };
  return [...followed, ...rest.sort(byRank)].slice(0, MAX_ACTORS);
}

export function actorsFor(
  state: GameState,
  frame: GraphicsFrame,
  options: { tracked?: VillagerId | null; plan?: ActorPlan } = {},
): Actor[] {
  const width = state.map.width;
  const phase = dayPhase(frame.presentationSeconds);
  const routes = options.plan?.routes ?? routesFor(state);
  const standing = new Map(state.buildings.filter((building) => building.lostTick === null)
    .map((building) => [building.id, centre(building, width)]));
  const actors: Actor[] = [];

  for (const person of cast(state, options.tracked ?? null)) {
    const cells = routes.get(person.id);
    const day = dayOf(person, state.tick);

    // D.6 · no reachable destination is not an excuse to invent a workshop.
    // Someone with nowhere to go rests where they are, and the frame says so.
    if (cells === undefined || cells.length === 0) {
      // Someone whose house burned down this week has neither a route nor a
      // doorstep. There is nowhere honest to draw them, so they are not drawn.
      const home = person.homeId === null ? undefined : standing.get(person.homeId);
      if (home === undefined) continue;
      const at = cellPoint(home, width);
      actors.push({
        id: person.id, x: at.x, z: at.z, facing: 0, activity: 'resting',
        clip: 'idle', clipSeconds: clipTime('idle', 0, frame.presentationSeconds, stable(person.id, 11)),
        cell: home, named: person.named, travelled: 0,
      });
      continue;
    }

    const { activity, along: progress } = progressOf(day, phase);
    const total = lengthOf(cells, width);
    const anchorCell = activity === 'working' || activity === 'returning'
      ? cells[cells.length - 1] ?? 0
      : cells[0] ?? 0;
    const anchor = cellPoint(anchorCell, width);

    let point: Point;
    let facing: number;
    let travelled: number;

    if (activity === 'working') {
      const span = Math.max(1e-6, day.depart - day.arrive);
      const through = (phase - day.arrive) / span;
      const wander = workWander(person, state.tick, through, span * SCENIC_DAY_SECONDS);
      const spot = cellPoint(cells[cells.length - 1] ?? 0, width);
      point = leash({ x: spot.x + wander.offset.x, z: spot.z + wander.offset.z }, anchor);
      facing = wander.heading;
      travelled = wander.travelled;
    } else if (activity === 'walking' || activity === 'returning') {
      const step = along(cells, progress, width, total);
      const heading = headingAround(cells, progress, width, total);
      const side = lane(heading, person.id, window(progress), total);
      point = { x: step.at.x + side.x, z: step.at.z + side.z };
      // Going home is going the other way, so the figure turns round.
      facing = activity === 'returning' ? heading + Math.PI : heading;
      // Suelo a lo largo de la ruta. El carril añade algo más —al girar una
      // esquina, el punto desviado barre un arco de radio igual al desvío— y
      // eso no entra aquí: acotado por la anchura del carril por el giro total,
      // queda por debajo del quince por ciento en las rutas de este valle, y un
      // quince por ciento de deslizamiento no se ve. Un error en el reparto de
      // la ruta sí: el que tenía esto al principio valía un tercio.
      travelled = total * (activity === 'returning' ? 1 - progress : progress);
    } else {
      // At home or on the doorstep. Facing outwards, along the first step of
      // the journey, so that stepping out is a step and not a spin.
      point = cellPoint(cells[0] ?? 0, width);
      facing = headingAround(cells, 0, width, total);
      travelled = 0;
    }

    const clip = clipFor(activity, person, state.tick);
    const cellX = Math.max(0, Math.min(width - 1, Math.floor(point.x)));
    const cellZ = Math.max(0, Math.min(state.map.height - 1, Math.floor(point.z)));

    actors.push({
      id: person.id,
      x: point.x,
      z: point.z,
      facing,
      activity,
      clip,
      clipSeconds: clipTime(clip, travelled, frame.presentationSeconds, stable(person.id, 11)),
      travelled,
      cell: cellZ * width + cellX,
      named: person.named,
    });
  }

  return actors;
}

export type { Activity } from './day';
export { type ClipName, type ClipMotion } from './clips';
export { VILLAGER_CLIPS };
