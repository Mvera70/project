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

import { DAY, ENCOUNTER } from '@engine/balance';
import { isHere } from '@engine/people/demography';
import type { Building, GameState, Villager, VillagerId } from '@engine/state';
import { routesFor } from '@engine/world/paths';
import type { GraphicsFrame } from '../contracts';
import { CATALOG } from '@engine/crossroads/catalog';
import { gatheringsAt } from '@render/gatherings';
import { ageOf } from '@engine/people/villagers';
import { dayNumber, dayPhase } from '../presentation-clock';
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
  /**
   * Los anos que tiene. Sirven para la talla y para nada mas.
   *
   * Un valle de adultos identicos no es un valle: los ninos tienen que verse
   * ninos desde arriba, que es donde no hay fichas que leer. La talla sale de
   * aqui y el resto de la variacion sale del `id`, porque el estado no guarda
   * de que color viste nadie ni tiene por que.
   */
  readonly age: number;
}

export interface ActorPlan {
  /** Where each villager is headed today. Defaults to the engine's own routes. */
  readonly routes: Map<VillagerId, number[]>;
}

/**
 * Lo que un actor recuerda de su propia jornada. design.md D.6.
 *
 * D.6 dice que cada actor posee estado efimero de representacion, y esto es
 * ese estado: **a donde decidio ir hoy**. No entra en el guardado, no produce
 * recursos y se rehace solo al amanecer siguiente.
 *
 * Existe por un fallo que se vio jugando. El motor reasigna quien trabaja que
 * campo cada semana, y el 6,7 % de las persona-semanas cambia de destino, con
 * saltos de nueve celdas de mediana. A x1 eso son ocho reasignaciones por dia
 * escenico; a x16, ciento veintiocho. Lo que se veia era gente cruzando el
 * valle de un parpadeo cada pocos segundos.
 *
 * Alguien no cambia de opinion sobre que campo esta arando a media manana. La
 * decision se toma al amanecer y dura el dia; lo que el motor reasigne durante
 * la semana entra manana. El trafico y la economia no se tocan: es el motor
 * quien decide, y esto solo elige cuando se entera.
 *
 * El duenno es quien pinta, no esta funcion, para que siga habiendo una manera
 * de derivar actores sin memoria ninguna: las pruebas la usan asi.
 */
export interface ActorMemory {
  game: string;
  day: number;
  routes: Map<VillagerId, number[]>;
  /**
   * La celda donde la aldea se junta hoy, o `null` si hoy no hay reunion.
   *
   * Se decide al amanecer como los destinos y por el mismo motivo: cambiarla a
   * media jornada teletransporta.
   */
  gathering: number | null;
  /** En que tick estabamos en el amanecer anterior, para no perderse nada. */
  tick: number;
}

export function createActorMemory(): ActorMemory {
  return { game: '', day: -1, routes: new Map(), gathering: null, tick: 0 };
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
function along(line: readonly Point[], t: number, total: number): { at: Point; heading: number } {
  if (line.length === 0) return { at: { x: 0, z: 0 }, heading: 0 };
  if (line.length === 1 || total === 0) {
    return { at: line[0] ?? { x: 0, z: 0 }, heading: 0 };
  }
  // Repartido por LONGITUD, no por indice de celda. Una ruta mezcla tramos
  // rectos y diagonales, que miden 1 y 1,41, asi que repartir por indice hace
  // que el aldeano acelere en las diagonales. No se veia a ojo, pero lo delato
  // el reloj del clip: el paso avanzaba dos tercios de lo que el cuerpo se
  // movia justo en esos tramos, que es exactamente lo que significa patinar.
  let want = Math.max(0, Math.min(1, t)) * total;
  for (let index = 0; index + 1 < line.length; index += 1) {
    const from = line[index] ?? { x: 0, z: 0 };
    const to = line[index + 1] ?? from;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const step = Math.hypot(dx, dz);
    if (want <= step || index + 2 === line.length) {
      const local = step === 0 ? 0 : Math.min(1, want / step);
      return {
        at: { x: from.x + dx * local, z: from.z + dz * local },
        heading: dx === 0 && dz === 0 ? 0 : Math.atan2(dx, dz),
      };
    }
    want -= step;
  }
  return { at: line[line.length - 1] ?? { x: 0, z: 0 }, heading: 0 };
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
function headingAround(line: readonly Point[], t: number, total: number): number {
  if (total === 0) return 0;
  const reach = Math.min(0.5, 0.9 / total);
  const back = along(line, t - reach, total).at;
  const ahead = along(line, t + reach, total).at;
  const dx = ahead.x - back.x;
  const dz = ahead.z - back.z;
  if (dx === 0 && dz === 0) return along(line, t, total).heading;
  return Math.atan2(dx, dz);
}

/** How long a route is, in cells. Feeds the clip phase, so the feet do not slide. */
function lengthOf(line: readonly Point[]): number {
  let total = 0;
  for (let index = 0; index + 1 < line.length; index += 1) {
    const from = line[index] ?? { x: 0, z: 0 };
    const to = line[index + 1] ?? from;
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

interface Plot { x: number; z: number; w: number; h: number }

/**
 * El puesto de trabajo de uno entre los `count` que comparten la misma parcela.
 *
 * Todos los que van al mismo campo terminaban su ruta en la misma celda, asi
 * que trabajaban amontonados en un punto mientras el resto del campo quedaba
 * vacio. Una parcela es un edificio con huella —un campo mide tres por dos— y
 * lo que se reparte es esa huella, no un circulo alrededor de una celda.
 *
 * El reparto es una rejilla, y el orden dentro de ella sale del identificador,
 * asi que dos vecinos no se cambian de sitio de un fotograma al siguiente.
 */
function plotSpot(plot: Plot, slot: number, count: number): Point {
  const columns = Math.max(1, Math.min(count, Math.round(Math.sqrt(count * (plot.w / Math.max(0.001, plot.h))))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const column = slot % columns;
  const row = Math.floor(slot / columns) % rows;
  return {
    x: plot.x + plot.w * ((column + 0.5) / columns),
    z: plot.z + plot.h * ((row + 0.5) / rows),
  };
}

/**
 * Cuantos surcos hace alguien a lo largo de su jornada, y cuanto del tramo se
 * le va en cambiar de uno al siguiente.
 *
 * TUNE: seis surcos deja unos veinte segundos escenicos de faena en cada uno,
 * que es tiempo de sobra para que se lea el golpe de azada. Y un cuarto del
 * tramo andando da un par de pasos, no una excursion.
 */
const FURROWS = 6;
const STEPPING = 0.25;

interface Working {
  readonly at: Point;
  readonly heading: number;
  readonly moving: boolean;
  readonly travelled: number;
}

/**
 * Que hace alguien durante su jornada en la parcela.
 *
 * **Cava quieto, da unos pasos al surco siguiente, y vuelve a cavar.** No es un
 * adorno: la version anterior reproducia el golpe de azada en el sitio mientras
 * el cuerpo se deslizaba de un lado a otro, y eso siempre se lee como patinar,
 * por poco que sea el desplazamiento. Un clip en el sitio exige un cuerpo en el
 * sitio; en cuanto el cuerpo se mueve, el clip tiene que ser el de andar.
 *
 * Los surcos salen del identificador, asi que dos vecinos no recorren el campo
 * al mismo compas, y cada uno tiene el suyo.
 */
function working(
  person: Villager, tick: number, through: number, spot: Point, reach: number,
): Working {
  const energy = energyOf(person, tick);
  // Un crio no cava: juega, y por eso cambia de sitio mas veces.
  const furrows = Math.max(2, Math.round(FURROWS * energy));
  const bearing = stable(person.id, 31_337) * Math.PI * 2;

  const furrow = (index: number): Point => {
    // Ida y vuelta por el mismo trozo de campo, **empezando y acabando en el
    // puesto**. Con una fase por persona, el primer surco caia lejos del punto
    // al que se acababa de llegar andando y la llegada era un salto con el
    // golpe de azada puesto. Lo que separa a dos vecinos es la direccion del
    // surco, que si es suya, no el momento en que empiezan.
    const swing = Math.sin(((index % furrows) / furrows) * Math.PI * 2);
    return {
      x: spot.x + Math.cos(bearing) * swing * reach,
      z: spot.z + Math.sin(bearing) * swing * reach,
    };
  };

  const walked = Math.max(0, Math.min(1, through)) * furrows;
  const index = Math.min(furrows - 1, Math.floor(walked));
  const local = walked - index;
  const from = furrow(index);
  const to = furrow(index + 1);
  const leg = Math.hypot(to.x - from.x, to.z - from.z);

  if (local < 1 - STEPPING) {
    return { at: from, heading: bearing, moving: false, travelled: index * leg };
  }
  const along = (local - (1 - STEPPING)) / STEPPING;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return {
    at: { x: from.x + dx * along, z: from.z + dz * along },
    heading: dx === 0 && dz === 0 ? bearing : Math.atan2(dx, dz),
    moving: true,
    travelled: index * leg + leg * along,
  };
}

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
  if (activity === 'working') return 'work_hoe';
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

/**
 * Donde trabaja alguien que ha llegado a `cell`.
 *
 * Si la celda es de una parcela, un puesto dentro de ella, repartido entre
 * todos los que van al mismo sitio. Si no —un claro del bosque, la orilla del
 * rio— un puesto en corro alrededor de la celda, que es lo unico que hay.
 */
function workSpot(
  cell: number, id: VillagerId, width: number,
  plots: Map<number, Plot>, sharing: Map<number, VillagerId[]>,
): Point {
  const group = sharing.get(cell) ?? [id];
  const slot = Math.max(0, group.indexOf(id));
  const plot = plots.get(cell);
  if (plot !== undefined) return plotSpot(plot, slot, group.length);

  const here = cellPoint(cell, width);
  if (group.length <= 1) return here;
  const angle = (slot / group.length) * Math.PI * 2;
  const reach = ENCOUNTER.SPREAD * Math.sqrt(group.length);
  return { x: here.x + Math.cos(angle) * reach, z: here.z + Math.sin(angle) * reach };
}

/**
 * Las rutas de hoy: las del motor, congeladas al amanecer si hay memoria.
 *
 * Sin memoria devuelve las de este instante, que es lo que hacia antes y lo que
 * las pruebas necesitan para ser puras. Con memoria, las del amanecer de hoy,
 * salvo que el fotograma venga marcado como discontinuo: un letargo reconstruye
 * desde el estado final y no tiene sentido honrar una decision de hace ochenta
 * semanas.
 */
/**
 * Donde se junta hoy la aldea, si es que se junta.
 *
 * §11.8: veinticinco de las cincuenta y seis opciones del catalogo convocan a
 * la gente, y el principio 1 del juego dice que **toda opcion cambia algo en
 * pantalla**. Quien decide si hay reunion y donde es `gatheringsAt`, el mismo
 * del render 2D; aqui solo se pregunta, y se pregunta **desde el amanecer
 * anterior** porque una reunion de cuatro semanas cabe entera entre dos
 * amaneceres.
 *
 * Si hay varias a la vez se toma la primera, que es la mas antigua: la aldea no
 * puede juntarse en dos sitios.
 */
function gatheringCell(state: GameState, since: number, width: number): number | null {
  const live = gatheringsAt(state, CATALOG, since);
  const first = live[0];
  if (first === undefined) return null;
  const x = Math.max(0, Math.min(width - 1, Math.floor(first.x)));
  const y = Math.max(0, Math.min(state.map.height - 1, Math.floor(first.y)));
  return y * width + x;
}

function routesFrom(
  state: GameState, frame: GraphicsFrame, today: number, memory?: ActorMemory,
): Map<VillagerId, number[]> {
  const live = routesFor(state);
  if (memory === undefined) return live;

  const game = `${state.seed}:${state.terrainSeed}`;
  if (memory.game !== game || memory.day !== today || frame.discontinuity) {
    const since = memory.game === game && !frame.discontinuity ? memory.tick : state.tick;
    memory.game = game;
    memory.day = today;
    memory.tick = state.tick;
    memory.gathering = gatheringCell(state, since, state.map.width);
    memory.routes = new Map(live);
    if (memory.gathering !== null) {
      // Hoy nadie va al tajo: se va a la plaza, a la capilla o al vado. La ruta
      // es la puerta de casa y el sitio de la reunion, en linea recta, que es
      // lo mismo que hace el render 2D —donde tampoco hay camino calculado— y
      // lo unico que se puede hacer sin pedirle rutas al motor: su cache de
      // rutas es la que el motor usa para desgastar caminos, y escribir en ella
      // seria que el render moviera la simulacion.
      const where = memory.gathering;
      for (const [id, cells] of memory.routes) {
        const door = cells[0];
        if (door === undefined || door === where) continue;
        memory.routes.set(id, [door, where]);
      }
    }
    return memory.routes;
  }

  // Quien no tenia destino al amanecer no lo tiene hoy: reposa en su casa y
  // sale manana. Darselo a media jornada lo hacia aparecer de golpe en el tajo,
  // a once celdas de donde estaba, que es el mismo teletransporte por otra
  // puerta. Un dia en casa es una respuesta honesta; un salto no lo es.
  //
  // Y quien ya no esta se olvida, para que la memoria no crezca con los muertos
  // de sesenta anos de partida.
  for (const id of [...memory.routes.keys()]) {
    if (!live.has(id)) memory.routes.delete(id);
  }
  return memory.routes;
}

export function actorsFor(
  state: GameState,
  frame: GraphicsFrame,
  options: { tracked?: VillagerId | null; plan?: ActorPlan; memory?: ActorMemory } = {},
): Actor[] {
  const width = state.map.width;
  const phase = dayPhase(frame.presentationSeconds);
  const today = dayNumber(frame.presentationSeconds);
  const routes = options.plan?.routes ?? routesFrom(state, frame, today, options.memory);
  // Donde se junta la aldea hoy, decidido al amanecer. Sin memoria no hay
  // reunion: las rutas son las del motor y nadie las ha cambiado.
  const gathering = options.memory?.gathering ?? null;
  const standing = new Map(state.buildings.filter((building) => building.lostTick === null)
    .map((building) => [building.id, centre(building, width)]));

  // Que parcela ocupa cada celda, para saber donde puede repartirse la gente.
  const plots = new Map<number, Plot>();
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    const plot: Plot = { x: building.x, z: building.y, w: building.w, h: building.h };
    for (let row = 0; row < building.h; row += 1) {
      for (let column = 0; column < building.w; column += 1) {
        plots.set((building.y + row) * width + building.x + column, plot);
      }
    }
  }

  // Quien comparte destino con quien. Se cuenta una vez, sobre los destinos y
  // no sobre las posiciones, porque el destino no cambia durante la jornada.
  const sharing = new Map<number, VillagerId[]>();
  for (const [id, cells] of routes) {
    const last = cells[cells.length - 1];
    if (last === undefined) continue;
    const group = sharing.get(last);
    if (group === undefined) sharing.set(last, [id]);
    else group.push(id);
  }
  for (const group of sharing.values()) group.sort((a, b) => a - b);

  const actors: Actor[] = [];

  for (const person of cast(state, options.tracked ?? null)) {
    const cells = routes.get(person.id);
    const day = dayOf(person, state.tick, today);

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
        cell: home, named: person.named, age: ageOf(person, state.tick), travelled: 0,
      });
      continue;
    }

    const { activity, along: progress } = progressOf(day, phase);
    // El camino termina **en su puesto**, no en la celda de destino.
    //
    // El puesto se sabe antes de salir de casa, asi que forma parte de la ruta
    // en vez de ser un desvio anadido al final. Con el desvio anadido, al
    // llegar se daba un salto de dos celdas; y contarlo aparte hacia que el
    // suelo recorrido no cuadrara con el camino, hasta un veinte por ciento en
    // un viaje corto, que es exactamente el patinaje que la zancada evita.
    const target = cells[cells.length - 1] ?? 0;
    const summoned = gathering !== null && target === gathering;
    const spot = workSpot(target, person.id, width, plots, sharing);
    const line = cells.map((cell) => cellPoint(cell, width));
    if (line.length > 0) line[line.length - 1] = spot;
    const total = lengthOf(line);
    let point: Point;
    let facing: number;
    let travelled: number;
    // Si el cuerpo se mueve, el clip tiene que ser el de andar. Siempre.
    let stepping = false;

    if (activity === 'working' && summoned) {
      // En una reunion no se trabaja: se esta. Quieto, mirando al centro del
      // corro, que es lo que convierte a doce personas sueltas en una reunion.
      point = spot;
      const centre = cellPoint(target, width);
      facing = Math.atan2(centre.x - spot.x, centre.z - spot.z);
      travelled = 0;
    } else if (activity === 'working') {
      const span = Math.max(1e-6, day.depart - day.arrive);
      const through = (phase - day.arrive) / span;
      const turn = working(person, state.tick, through, spot, DAY.WORK_REACH);
      point = leash(turn.at, spot);
      facing = turn.heading;
      travelled = turn.travelled;
      stepping = turn.moving;
    } else if (activity === 'walking' || activity === 'returning') {
      const step = along(line, progress, total);
      const heading = headingAround(line, progress, total);
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
      point = line[0] ?? { x: 0, z: 0 };
      facing = headingAround(line, 0, total);
      travelled = 0;
    }

    const clip = stepping ? 'walk'
      : summoned && activity === 'working' ? 'idle'
        : clipFor(activity, person, state.tick);
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
      age: ageOf(person, state.tick),
    });
  }

  return actors;
}

export type { Activity } from './day';
export { type ClipName, type ClipMotion } from './clips';
export { VILLAGER_CLIPS };
