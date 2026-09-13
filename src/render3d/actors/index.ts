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
import {
  TERRAIN_CODE,
  type Building, type BuildingId, type BuildingKind, type GameState, type Villager, type VillagerId,
} from '@engine/state';
import { routesFor } from '@engine/world/paths';
import type { GraphicsFrame } from '../contracts';
import { CATALOG } from '@engine/crossroads/catalog';
import { gatheringsAt } from '@render/gatherings';
import { encountersAmong, type Encounter } from '@render/encounters';
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
   * Si ahora mismo esta parado con alguien (§11.9).
   *
   * Lo sabe quien coloca a la gente, y lo necesita quien dibuja la burbuja de
   * §11.1.1: deducirlo del clip —«trabajando pero con el clip de estarse»— era
   * adivinar desde fuera algo que aqui se sabe.
   */
  readonly talking: boolean;
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
  /**
   * Con quien se para hoy cada uno, y donde.
   *
   * Congelado al amanecer por el mismo motivo que los destinos: `encountersAmong`
   * decide el emparejamiento a partir del tick, y una jornada escenica dura ocho
   * ticks a x1. Sin congelarlo, la conversacion cambiaba de sitio ocho veces al
   * dia y la gente daba saltos de seis celdas. Medido: 5,88.
   */
  meetings: Map<VillagerId, Encounter>;
  meetingsDay: number;
}

export function createActorMemory(): ActorMemory {
  return {
    game: '', day: -1, routes: new Map(), gathering: null, tick: 0,
    meetings: new Map(), meetingsDay: -1,
  };
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

interface Plot { id: BuildingId; x: number; z: number; w: number; h: number; enclosed: boolean }

/**
 * Que edificios tienen paredes.
 *
 * Dentro de una casa no se anda, y en la puerta si. El campo es lo contrario:
 * se trabaja dentro de la huella, que para eso es un campo. Un pozo, un
 * cementerio o una empalizada no tienen interior en el que meterse.
 *
 * Esto se ve mirando y se veia mal: la gente se plantaba en el centro del salon
 * de su casa y cruzaba las paredes de las del vecino como si no estuvieran.
 */
const ENCLOSED: ReadonlySet<BuildingKind> = new Set<BuildingKind>([
  'house', 'stone_house', 'granary', 'chapel', 'church', 'smithy', 'mill', 'watchtower',
]);


/**
 * La parcela de la casa de alguien, si la tiene y si tiene paredes.
 *
 * Se busca por `homeId` y no por la ruta: la casa de uno no cambia de semana en
 * semana y la ruta si.
 */
function homePlot(
  person: Villager, standing: Map<BuildingId, number>, plots: Map<number, Plot>,
): Plot | undefined {
  if (person.homeId === null) return undefined;
  const cell = standing.get(person.homeId);
  if (cell === undefined) return undefined;
  const plot = plots.get(cell);
  return plot !== undefined && plot.enclosed ? plot : undefined;
}

/**
 * Por donde se entra y se sale de cada edificio con paredes.
 *
 * **Una puerta por edificio y siempre la misma.** Sale de las huellas y de nada
 * mas: ni de quien entra, ni de por donde venia, ni de la semana. Las tres
 * versiones anteriores de esto la elegian por la ruta de cada uno, y la ruta
 * cambia cada semana: al amanecer la gente aparecia en otra cara de su propia
 * casa, hasta dos celdas y media mas alla, sin haberse movido nadie.
 *
 * La fachada —la cara de -Y, donde las recetas ponen la puerta— es la primera
 * opcion. En este valle las casas se tocan, asi que cuando esta tapada se
 * prueban las otras tres en orden fijo.
 */
interface Door {
  readonly face: readonly [number, number];
  /** La celda de fuera, por donde se pasa. */
  readonly cell: number;
}

function doorsFor(state: GameState, plots: Map<number, Plot>): Map<BuildingId, Door> {
  const width = state.map.width;
  const height = state.map.height;
  const walled = (cell: number): boolean => plots.get(cell)?.enclosed === true;

  // **Las casas de este valle se tocan.** El motor las coloca pegadas y sin
  // dejar calle: en una partida medida, seis casas seguidas sin un hueco. Eso
  // significa que la puerta de la de en medio da a la pared de la de al lado, y
  // que no hay manera de entrar ni de salir sin cruzar la casa del vecino.
  //
  // No es un fallo del dibujo y no se arregla dibujando: se ha anotado para
  // quien lleve la colocacion de §7.2. Lo que se puede hacer aqui es lo que
  // hace una hilera de casas de verdad: **la puerta da a la calle**, aunque la
  // calle este al final de la hilera. Se agrupan las huellas que se tocan y se
  // busca la salida del grupo mas cercana a cada edificio.
  const group = new Map<number, number>();
  let groups = 0;
  for (const [cell, plot] of plots) {
    if (!plot.enclosed || group.has(cell)) continue;
    const id = groups;
    groups += 1;
    const queue = [cell];
    group.set(cell, id);
    while (queue.length > 0) {
      const here = queue.pop() as number;
      const x = here % width;
      for (const [dx, dz] of FACES) {
        const nx = x + dx;
        const nz = Math.floor(here / width) + dz;
        if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
        const next = nz * width + nx;
        if (!walled(next) || group.has(next)) continue;
        group.set(next, id);
        queue.push(next);
      }
    }
  }

  // Las salidas de cada grupo: una celda de fuera pegada a una de dentro.
  const exits = new Map<number, { cell: number; face: readonly [number, number] }[]>();
  for (const [cell, id] of group) {
    const x = cell % width;
    const z = Math.floor(cell / width);
    for (const face of FACES) {
      const nx = x + face[0];
      const nz = z + face[1];
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const next = nz * width + nx;
      if (walled(next)) continue;
      const list = exits.get(id);
      if (list === undefined) exits.set(id, [{ cell: next, face }]);
      else list.push({ cell: next, face });
    }
  }

  const doors = new Map<BuildingId, Door>();
  for (const building of state.buildings) {
    if (building.lostTick !== null || !ENCLOSED.has(building.kind)) continue;
    const id = group.get(building.y * width + building.x);
    const ways = id === undefined ? undefined : exits.get(id);
    if (ways === undefined || ways.length === 0) continue;
    const cx = building.x + building.w / 2;
    const cz = building.y + building.h / 2;
    let best = ways[0] as { cell: number; face: readonly [number, number] };
    let bestCost = Infinity;
    for (const way of ways) {
      const wx = (way.cell % width) + 0.5;
      const wz = Math.floor(way.cell / width) + 0.5;
      // La mas cercana, y a igualdad la de la fachada: es donde esta la puerta
      // dibujada, y salir por ahi es lo que se espera ver.
      const cost = (wx - cx) ** 2 + (wz - cz) ** 2 + (way.face[1] === 1 ? -0.3 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = way;
      }
    }
    doors.set(building.id, { face: best.face, cell: best.cell });
  }
  return doors;
}

/**
 * El sitio de una persona en el umbral de un edificio.
 *
 * La cara la pone la puerta, que es del edificio; el sitio a lo ancho sale del
 * identificador, que no cambia. Asi dos vecinos no se pisan en el umbral y
 * ninguno se mueve el dia que se muda un tercero.
 */
function doorPoint(_plot: Plot, door: Door, who: VillagerId, width: number): Point {
  // El umbral es la celda de salida del grupo. Repartidos dentro de ella por el
  // identificador, que no cambia: asi dos vecinos no se pisan y ninguno se
  // mueve el dia que se muda un tercero.
  const spread = 0.55;
  return {
    x: (door.cell % width) + 0.5 + (stable(who, 7) - 0.5) * spread,
    z: Math.floor(door.cell / width) + 0.5 + (stable(who, 13) - 0.5) * spread,
  };
}

/**
 * Las cuatro caras, empezando por la fachada.
 *
 * En este valle **las casas se tocan**: la puerta de una cae dentro del vecino
 * de delante, y entonces el umbral vuelve a estar dentro de un muro, sólo que
 * del muro de otro. Se prueban las cuatro y se sale por la que esté libre. Si
 * ninguna lo está —una casa rodeada— se sale por la fachada y ya.
 */
/**
 * Las cuatro caras, empezando por **la fachada, que es la de +Z**.
 *
 * La puerta se dibuja en el borde de +Z del edificio: la receta la pone en
 * `y = 0` de Blender y el exportador convierte esa cara en la de +Z (v3.56).
 * Antes esta lista empezaba por -Z, o sea por la pared de atras.
 */
const FACES = [[0, 1], [1, 0], [-1, 0], [0, -1]] as const;

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
  if (plot !== undefined) {
    return plotSpot(plot, slot, group.length);
  }

  const here = cellPoint(cell, width);
  if (group.length <= 1) return here;
  const reach = ENCOUNTER.SPREAD * Math.sqrt(group.length);
  // El corro puede ser mas ancho que la celda y meterse en la casa de al lado,
  // que es de donde salia una parte de la gente que se veia dentro de un muro.
  // Se prueban ocho sitios del corro empezando por el suyo y se coge el primero
  // que este a campo abierto.
  for (let turn = 0; turn < 8; turn += 1) {
    const angle = ((slot + turn) / group.length) * Math.PI * 2;
    const at = { x: here.x + Math.cos(angle) * reach, z: here.z + Math.sin(angle) * reach };
    const there = plots.get(Math.floor(at.z) * width + Math.floor(at.x));
    if (there === undefined || !there.enclosed) return at;
  }
  return here;
}

/**
 * Las celdas que no se pisan: el interior de todo lo que tiene paredes.
 *
 * El motor no las evita, y tiene razon: su camino es el que desgasta la senda y
 * la senda pasa por donde pasa la gente, no por donde cabe un muro. Pero
 * **dibujar a alguien atravesando una casa es dibujar mal**, y era lo que se
 * veia.
 */
function walledCells(state: GameState): Set<number> {
  const blocked = new Set<number>();
  for (const building of state.buildings) {
    if (building.lostTick !== null || !ENCLOSED.has(building.kind)) continue;
    for (let row = 0; row < building.h; row += 1) {
      for (let column = 0; column < building.w; column += 1) {
        blocked.add((building.y + row) * state.map.width + building.x + column);
      }
    }
  }
  // Y el agua, que tampoco se pisa. No hace falta para esquivar —el motor ya
  // rodea el rio— pero si para tensar la cuerda: un atajo en linea recta entre
  // dos puntos de la misma orilla puede cruzar el cauce.
  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    const kind = state.map.terrain[cell];
    if (kind === TERRAIN_CODE.water || kind === TERRAIN_CODE.marsh) blocked.add(cell);
  }
  return blocked;
}

/**
 * Quita de los extremos las celdas que caen dentro del propio edificio.
 *
 * La ruta del motor va del centro de la casa al centro del campo, y con huellas
 * de dos por dos eso deja una o dos celdas **dentro de las paredes** en cada
 * punta. Como la salida se dibuja en la puerta, el primer tramo volvia a
 * meterse en la casa para salir por el otro lado: se veia a la gente cruzar su
 * propia pared nada mas salir, y ademas descuadraba el suelo recorrido.
 */
function trimIndoors(cells: readonly number[], blocked: Set<number>): number[] {
  let from = 0;
  while (from < cells.length - 1 && blocked.has(cells[from] as number)) from += 1;
  let to = cells.length - 1;
  while (to > from && blocked.has(cells[to] as number)) to -= 1;
  // Si todo el camino esta tapado —una casa pegada a otra— se deja como venia:
  // mejor un tramo feo que ningun tramo.
  return to <= from ? [...cells] : cells.slice(from, to + 1);
}

/**
 * Tensa la cuerda: quita los vertices que no hacen falta.
 *
 * El motor busca camino por celdas, asi que sus rutas suben en escalera —un
 * paso al lado, uno arriba, uno al lado— y **eso se ve**: la gente andaba a
 * zigzag por un prado vacio. Si el tramo recto entre el punto anterior y el
 * siguiente no pisa nada prohibido, el vertice de en medio sobra.
 *
 * Ademas arregla lo que el rodeo estropeaba: cada esquina que se quita es un
 * sitio menos donde el carril lateral recorta y el suelo recorrido deja de
 * cuadrar con lo andado.
 */
/** Si el tramo recto entre dos celdas pasa por algo prohibido. */
function clearBetween(from: number, to: number, blocked: Set<number>, width: number): boolean {
  const ax = (from % width) + 0.5;
  const ay = Math.floor(from / width) + 0.5;
  const bx = (to % width) + 0.5;
  const by = Math.floor(to / width) + 0.5;
  const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) * 6));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const cell = Math.floor(ay + (by - ay) * t) * width + Math.floor(ax + (bx - ax) * t);
    if (blocked.has(cell)) return false;
  }
  return true;
}

function pullString(cells: readonly number[], blocked: Set<number>, width: number): number[] {
  const out = [...cells];
  const clear = (from: number, to: number): boolean => clearBetween(from, to, blocked, width);
  // Dos pasadas bastan: la primera se lleva las escaleras y la segunda los
  // codos que quedan. Mas pasadas dejarian la ruta en una recta, que ya no
  // seria el camino que el motor dice que anda esta persona.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = out.length - 2; index > 0; index -= 1) {
      const before = out[index - 1] as number;
      const after = out[index + 1] as number;
      if (clear(before, after)) out.splice(index, 1);
    }
  }
  return out;
}

/**
 * La misma ruta, rodeando lo que tiene paredes.
 *
 * Cada celda tapada se cambia por la mas cercana que este libre. Con huellas de
 * dos por dos eso es un paso de lado: se bordea el muro en vez de cruzarlo.
 *
 * **Se hace al amanecer, sobre la ruta que se congela**, y no en cada
 * fotograma: la linea queda hecha para todo el dia y quien la anda no nota
 * nada. Corrigiendo la posicion en cada pintada, el aldeano saltaria de un lado
 * del muro al otro cada vez que la correccion cambiara de pared.
 *
 * La primera celda y la ultima no se tocan: son la casa de la que se sale y el
 * sitio al que se va, y de esas dos ya se encarga la puerta.
 */
function aroundWalls(
  cells: readonly number[], blocked: Set<number>, width: number, height: number,
): number[] {
  if (cells.length < 2) return [...cells];
  const out: number[] = [];
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index] as number;
    // Los extremos no se tocan: son la puerta de la que se sale y el sitio al
    // que se va, y de esos se encarga el mapa de puertas.
    if (!blocked.has(cell) || index === 0 || index === cells.length - 1) {
      out.push(cell);
      continue;
    }
    // Un tramo tapado: se busca la vuelta desde lo ultimo bueno hasta lo
    // siguiente bueno. Sustituir la celda por la vecina libre, que era lo que
    // hacia esto antes, no basta cuando lo que hay delante es una hilera de
    // casas de seis celdas: no hay vecina libre que sirva.
    let next = index;
    while (next < cells.length && blocked.has(cells[next] as number)) next += 1;
    const target = cells[Math.min(next, cells.length - 1)] as number;
    const from = out[out.length - 1] as number;
    for (const step of detour(from, target, blocked, width, height)) out.push(step);
    index = next - 1;
  }
  return out;
}

/**
 * La vuelta mas corta entre dos celdas sin pisar lo prohibido.
 *
 * Una anchura primero, con tope: si en cuatrocientas celdas no ha salido, es
 * que no hay salida, y entonces se va en linea recta como se iba antes. Mejor
 * un tramo feo que una persona parada en el sitio.
 *
 * Esto **no es el camino del motor**: el suyo decide donde se desgasta la
 * senda y es cosa de la simulacion. Este solo decide por donde pasa el dibujo
 * en el ultimo tramo, y nunca se le devuelve a nadie.
 */
function detour(
  from: number, to: number, blocked: Set<number>, width: number, height: number,
): number[] {
  if (from === to) return [];
  const seen = new Map<number, number>([[from, -1]]);
  const queue = [from];
  let head = 0;
  while (head < queue.length && queue.length < 400) {
    const here = queue[head] as number;
    head += 1;
    if (here === to) break;
    const x = here % width;
    const z = Math.floor(here / width);
    for (const [dx, dz] of FACES) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const next = nz * width + nx;
      if (seen.has(next)) continue;
      if (next !== to && blocked.has(next)) continue;
      seen.set(next, here);
      queue.push(next);
    }
  }
  if (!seen.has(to)) return [to];
  const path: number[] = [];
  let step = to;
  while (step !== from && step !== -1) {
    path.unshift(step);
    step = seen.get(step) ?? -1;
  }
  return path;
}


/**
 * Cuanto se puede apartar de su puesto quien cava, sin meterse en una casa.
 *
 * Cavando uno se aparta hasta `WORK_REACH` —casi una celda— y con un campo
 * pegado a una casa eso le metia dentro del salon del vecino: medido, 0,92
 * celdas adentro. Se acota al hueco que hay de verdad.
 *
 * **Es una cuenta por turno, no por fotograma**: el puesto no se mueve mientras
 * se trabaja, asi que el radio tampoco, y por eso no introduce ningun salto.
 * Recortar el paso ya dado si que lo introducia: 0,78 celdas de un fotograma al
 * siguiente, cada vez que el vaiven rozaba la pared.
 */
function elbowRoom(spot: Point, plots: Map<number, Plot>, width: number): number {
  let room: number = DAY.WORK_REACH;
  const cx = Math.floor(spot.x);
  const cz = Math.floor(spot.z);
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const plot = plots.get((cz + dz) * width + cx + dx);
      if (plot === undefined || !plot.enclosed) continue;
      // Distancia del punto al rectangulo de la huella.
      const gap = Math.hypot(
        Math.max(plot.x - spot.x, 0, spot.x - (plot.x + plot.w)),
        Math.max(plot.z - spot.z, 0, spot.z - (plot.z + plot.h)),
      );
      room = Math.min(room, gap);
    }
  }
  // Un minimo, o quien trabaja pegado a un muro se queda clavado y el clip de
  // cavar se lee como un maniqui.
  return Math.max(0.18, room);
}

/**
 * Mete un punto de paso donde la recta entre dos celdas roza una esquina.
 *
 * Ninguna celda de la ruta esta tapada y aun asi el tramo entre dos puede pasar
 * por encima de una casa: dos celdas libres en diagonal, con la esquina del
 * edificio en medio. Se rodea por la esquina del rectangulo que forman, que es
 * la que un peaton toma de todas formas.
 */
function skirt(
  cells: readonly number[], blocked: Set<number>, width: number, height: number,
): number[] {
  const out = [...cells];
  for (let index = 0; index < out.length - 1; index += 1) {
    const from = out[index] as number;
    const to = out[index + 1] as number;
    if (clearBetween(from, to, blocked, width)) continue;
    const fx = from % width;
    const fy = Math.floor(from / width);
    const tx = to % width;
    const ty = Math.floor(to / width);
    let fixed = false;
    for (const corner of [ty * width + fx, fy * width + tx]) {
      if (blocked.has(corner) || corner === from || corner === to) continue;
      if (!clearBetween(from, corner, blocked, width)) continue;
      if (!clearBetween(corner, to, blocked, width)) continue;
      out.splice(index + 1, 0, corner);
      index += 1;
      fixed = true;
      break;
    }
    if (fixed) continue;
    // Ninguna de las dos esquinas sirve: el tramo no roza un edificio, lo cruza
    // entero. Se pide la vuelta completa, que es lo mismo que se hace cuando la
    // ruta trae una celda tapada.
    const around = detour(from, to, blocked, width, height).slice(0, -1);
    if (around.length === 0) continue;
    out.splice(index + 1, 0, ...around);
    index += around.length;
  }
  return out;
}

/**
 * Quita las puas: los vertices por los que la linea va y vuelve.
 *
 * `skirt` rodea una esquina metiendo puntos de paso, y rodeando puede dejar la
 * linea pasada de largo: sale `13,23 12,23 15,23`, o sea andar al oeste una
 * celda y desandarla. En el suelo eso es una vuelta en redondo, y como el
 * carril se lleva a la derecha de la marcha, al cambiar de sentido el cuerpo se
 * corre dos decimas de celda de lado: un brinco donde tendria que haber un paso.
 *
 * Se quita el vertice solo si sus dos vecinos se ven entre si. Un fondo de saco
 * de verdad —entrar y salir por el mismo sitio porque no hay otro— no se ve, y
 * ese se queda: no es una pua, es el camino.
 */
function unwind(cells: readonly number[], blocked: Set<number>, width: number): number[] {
  const out = [...cells];
  for (let index = out.length - 2; index > 0; index -= 1) {
    const before = out[index - 1] as number;
    const here = out[index] as number;
    const after = out[index + 1] as number;
    const inx = (here % width) - (before % width);
    const iny = Math.floor(here / width) - Math.floor(before / width);
    const outx = (after % width) - (here % width);
    const outy = Math.floor(after / width) - Math.floor(here / width);
    // Vuelve sobre sus pasos: el producto escalar de entrada y salida es
    // negativo, o sea mas de noventa grados de giro.
    if (inx * outx + iny * outy >= 0) continue;
    if (!clearBetween(before, after, blocked, width)) continue;
    out.splice(index, 1);
  }
  return out;
}

/**
 * Cuanto de acercado esta alguien a su conversacion, y si esta andando.
 *
 * TUNE: la sexta parte del encuentro se va en ir y otra sexta en volver. Menos
 * es un salto; mas y la conversacion es un paseo. Devuelve `null` fuera del
 * tramo, que es la mayor parte del dia.
 */
const APPROACH = 0.4;

/**
 * A que ritmo se anda, en celdas por dia escenico.
 *
 * TUNE: cuarenta. Es el paso vivo con el que la jornada de §11.9 cubre sus
 * viajes: seis celdas de mediana en el quince por ciento del dia. El primer
 * intento repartia la ida en una sexta parte de la conversacion pasara lo que
 * pasara, y eso mandaba a la gente a la carrera —dos celdas y cuarto en segundo
 * y medio, seis veces su propio paso— que en pantalla es un salto.
 */
const CHAT_PACE = 40;

function talking(
  phase: number, from: number, to: number, reach: number,
): { there: number; moving: boolean } | null {
  if (phase < from || phase > to) return null;
  const span = Math.max(1e-6, to - from);
  // Lo que tarda en llegar andando, en tanto por uno de la conversacion. Si no
  // le da tiempo a ir, estarse y volver, no va: mejor seguir cavando que
  // cruzar el campo a la carrera para no llegar.
  const approach = reach / CHAT_PACE / span;
  if (approach > APPROACH) return null;
  const through = (phase - from) / span;
  if (through < approach) return { there: approach <= 0 ? 1 : through / approach, moving: true };
  if (through > 1 - approach) return { there: approach <= 0 ? 1 : (1 - through) / approach, moving: true };
  return { there: 1, moving: false };
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
  state: GameState, frame: GraphicsFrame, today: number,
  doors: Map<BuildingId, Door>, memory?: ActorMemory,
): Map<VillagerId, number[]> {
  const blocked = walledCells(state);
  // Por que celda se entra y se sale de cada edificio, indexado por la celda de
  // dentro que el motor usa como extremo de la ruta.
  const ways = new Map<number, number>();
  for (const building of state.buildings) {
    const door = doors.get(building.id);
    if (door === undefined) continue;
    for (let row = 0; row < building.h; row += 1) {
      for (let column = 0; column < building.w; column += 1) {
        ways.set((building.y + row) * state.map.width + building.x + column, door.cell);
      }
    }
  }

  const live = new Map<VillagerId, number[]>();
  for (const [id, cells] of routesFor(state)) {
    // **La ruta empieza y acaba en la puerta.** El motor la da de centro a
    // centro de edificio, que es lo que necesita para desgastar caminos; quien
    // la anda tiene que salir por donde se sale. Sin esto, el ultimo tramo iba
    // de la puerta al centro de la casa y se veia a la gente cruzar su pared.
    const first = cells[0];
    const last = cells[cells.length - 1];
    const trimmed = trimIndoors(cells, blocked);
    const doorIn = first === undefined ? undefined : ways.get(first);
    const doorOut = last === undefined ? undefined : ways.get(last);
    const walk = [...trimmed];
    if (doorIn !== undefined && walk[0] !== doorIn) walk.unshift(doorIn);
    if (doorOut !== undefined && walk[walk.length - 1] !== doorOut) walk.push(doorOut);
    live.set(id, unwind(
      skirt(
        pullString(aroundWalls(walk, blocked, state.map.width, state.map.height), blocked, state.map.width),
        blocked, state.map.width, state.map.height,
      ),
      blocked, state.map.width,
    ));
  }
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
  // de sesenta anos de partida. **Solo quien ya no esta**: la primera version
  // borraba a todo el que hubiera dejado de tener ruta, y perder el tajo a
  // media semana —el campo que se pierde, el oficio que cambia— no es morirse.
  // A quien le pasaba se le acababa la jornada de golpe y aparecia sentado en
  // la puerta de su casa; medido, siete celdas y media de salto. El destino de
  // hoy se decidio al amanecer y aguanta hasta el siguiente, como todo lo
  // demas que cambia con el tick dentro de un dia escenico.
  const still = new Set(state.people.villagers.filter(isHere).map((person) => person.id));
  for (const id of [...memory.routes.keys()]) {
    if (!still.has(id)) memory.routes.delete(id);
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
  // Que parcela ocupa cada celda, para saber donde puede repartirse la gente.
  const plots = new Map<number, Plot>();
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    const plot: Plot = {
      id: building.id, x: building.x, z: building.y, w: building.w, h: building.h,
      enclosed: ENCLOSED.has(building.kind),
    };
    for (let row = 0; row < building.h; row += 1) {
      for (let column = 0; column < building.w; column += 1) {
        plots.set((building.y + row) * width + building.x + column, plot);
      }
    }
  }

  // Por donde se entra y se sale de cada edificio. Antes que nada, porque las
  // rutas del dia se recortan a las puertas.
  const doors = doorsFor(state, plots);

  const routes = options.plan?.routes ?? routesFrom(state, frame, today, doors, options.memory);
  // Donde se junta la aldea hoy, decidido al amanecer. Sin memoria no hay
  // reunion: las rutas son las del motor y nadie las ha cambiado.
  const gathering = options.memory?.gathering ?? null;
  const standing = new Map(state.buildings.filter((building) => building.lostTick === null)
    .map((building) => [building.id, centre(building, width)]));

  // Quien comparte destino con quien. Se cuenta una vez, sobre los destinos y
  // no sobre las posiciones, porque el destino no cambia durante la jornada.
  const sharing = new Map<number, VillagerId[]>();
  for (const [id, cells] of routes) {
    const last = cells[cells.length - 1];
    if (last !== undefined) {
      const group = sharing.get(last);
      if (group === undefined) sharing.set(last, [id]);
      else group.push(id);
    }
  }
  for (const group of sharing.values()) group.sort((a, b) => a - b);

  // Quien se para con quien, y donde.
  //
  // §11.9: una aldea donde cuarenta personas coinciden en un campo y ninguna
  // habla con otra no parece una aldea. Quien se para con quien lo decide
  // `encountersAmong`, **el mismo del render 2D**, y lo decide la opinion: dos
  // que se aprecian se paran a menudo y dos que se detestan no se paran nunca.
  // Aqui solo se dibuja.
  //
  // Hace falta saber antes donde trabaja cada uno, porque el encuentro se
  // decide sobre los puestos y no sobre las posiciones: dos que pasan cerca un
  // instante no se quedan pegados.
  const memory = options.memory;
  let meetings: Map<VillagerId, Encounter>;
  if (memory !== undefined && memory.meetingsDay === today) {
    meetings = memory.meetings;
  } else {
    const spots = new Map<VillagerId, Point>();
    for (const person of cast(state, options.tracked ?? null)) {
      const cells = routes.get(person.id);
      const target = cells?.[cells.length - 1];
      if (target === undefined) continue;
      spots.set(person.id, workSpot(target, person.id, width, plots, sharing));
    }
    meetings = encountersAmong(state, [...spots].map(([id, at]) => ({ id, x: at.x, y: at.z })));
    if (memory !== undefined) {
      memory.meetings = meetings;
      memory.meetingsDay = today;
    }
  }

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
      const shelter = homePlot(person, standing, plots);
      const shelterDoor = person.homeId === null ? undefined : doors.get(person.homeId);
      const at = shelter === undefined || shelterDoor === undefined
        ? cellPoint(home, width)
        : doorPoint(shelter, shelterDoor, person.id, width);
      actors.push({
        id: person.id, x: at.x, z: at.z, facing: 0, activity: 'resting',
        clip: 'idle', clipSeconds: clipTime('idle', 0, frame.presentationSeconds, stable(person.id, 11)),
        cell: home, named: person.named, age: ageOf(person, state.tick), travelled: 0,
        talking: false,
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
    const shed = plots.get(target);
    const shedDoor = shed === undefined ? undefined : doors.get(shed.id);
    const spot = shed !== undefined && shed.enclosed && shedDoor !== undefined
      ? doorPoint(shed, shedDoor, person.id, width)
      : workSpot(target, person.id, width, plots, sharing);
    const line = cells.map((cell) => cellPoint(cell, width));
    if (line.length > 0) line[line.length - 1] = spot;
    // Y empieza **en la puerta de su casa**, no en el salon. La ruta del motor
    // arranca en la celda del centro de la casa, que es donde se guarda la casa
    // y no donde se esta: la gente aparecia plantada dentro de su vivienda.
    const doorway = homePlot(person, standing, plots);
    const homeDoor = person.homeId === null ? undefined : doors.get(person.homeId);
    if (doorway !== undefined && homeDoor !== undefined && line.length > 0) {
      line[0] = doorPoint(doorway, homeDoor, person.id, width);
    }
    const total = lengthOf(line);
    let point: Point;
    let facing: number;
    let travelled: number;
    // Si el cuerpo se mueve, el clip tiene que ser el de andar. Siempre.
    let stepping = false;

    const meeting = summoned ? undefined : meetings.get(person.id);
    // El tramo de charla se recorta a **la jornada de esta persona**.
    //
    // Los limites de §11.9 son fracciones de tick iguales para todos, y la
    // jornada no: cada uno sale y vuelve a su hora. Sin recortar, a quien
    // llegaba tarde al tajo le empezaba la conversacion antes de llegar, y al
    // llegar aparecia de golpe en mitad del corro. Medido: 0,86 celdas de
    // salto, contra 0,50 que da la jornada sin conversaciones.
    const opens = meeting === undefined ? 0 : Math.max(meeting.from, day.arrive);
    const shuts = meeting === undefined ? 0 : Math.min(meeting.to, day.depart);
    // Lo que hay que andar hasta la conversacion, contando que **no se sale del
    // centro del puesto**: cavando uno se aparta hasta `WORK_REACH` de el. Sin
    // contarlo, una conversacion a un palmo del puesto se daba por alcanzada al
    // instante y el aldeano aparecia alli desde donde estuviera cavando, que
    // eran 0,78 celdas de salto.
    const away = meeting === undefined
      ? 0
      : Math.max(Math.hypot(meeting.x - spot.x, meeting.y - spot.z), DAY.WORK_REACH);
    const talk = meeting === undefined || activity !== 'working' || shuts <= opens
      ? null
      : talking(phase, opens, shuts, away);

    const indoors = plots.get(target)?.enclosed === true;
    if (activity === 'working' && indoors && talk === null) {
      // A cubierto no se ve trabajar a nadie: lo que se ve es a alguien en la
      // puerta de la fragua. Y el golpe de azada dentro de una fragua era, de
      // paso, una imagen equivocada.
      point = spot;
      facing = Math.atan2(cellPoint(target, width).x - spot.x, cellPoint(target, width).z - spot.z);
      travelled = 0;
    } else if (talk !== null) {
      // Se acerca, se queda un rato y vuelve a lo suyo. Los dos extremos se
      // andan de verdad: el punto de encuentro esta a un par de celdas, y
      // aparecer alli de golpe seria el teletransporte de siempre.
      //
      // Y se sale **de donde se estaba**, no del centro de la parcela: cavando
      // uno se aparta hasta casi una celda de su puesto, asi que arrancar desde
      // el puesto daba un salto de esa celda justo al empezar a hablar. Medido:
      // 1,05.
      const span = Math.max(1e-6, day.depart - day.arrive);
      const through = (phase - day.arrive) / span;
      // El mismo radio que fuera de la conversacion: con uno distinto, el
      // cuerpo saltaba un tercio de celda justo al empezar a hablar.
      const turn = working(person, state.tick, through, spot, elbowRoom(spot, plots, width));
      const base = leash(turn.at, spot);
      const meet = { x: meeting?.x ?? base.x, z: meeting?.y ?? base.z };
      point = {
        x: base.x + (meet.x - base.x) * talk.there,
        z: base.z + (meet.z - base.z) * talk.there,
      };
      // Mirando al centro del encuentro, que es mirarse el uno al otro.
      facing = Math.atan2(meet.x - base.x, meet.z - base.z);
      travelled = turn.travelled + Math.hypot(meet.x - base.x, meet.z - base.z) * talk.there;
      stepping = talk.moving;
    } else if (activity === 'working' && summoned) {
      // En una reunion no se trabaja: se esta. Quieto, mirando al centro del
      // corro, que es lo que convierte a doce personas sueltas en una reunion.
      point = spot;
      const centre = cellPoint(target, width);
      facing = Math.atan2(centre.x - spot.x, centre.z - spot.z);
      travelled = 0;
    } else if (activity === 'working') {
      const span = Math.max(1e-6, day.depart - day.arrive);
      const through = (phase - day.arrive) / span;
      const turn = working(person, state.tick, through, spot, elbowRoom(spot, plots, width));
      point = leash(turn.at, spot);
      facing = turn.heading;
      travelled = turn.travelled;
      stepping = turn.moving;
    } else if (activity === 'walking' || activity === 'returning') {
      const step = along(line, progress, total);
      const heading = headingAround(line, progress, total);
      const side = lane(heading, person.id, window(progress), total);
      // El carril aparta a cada uno del eje del camino para que dos no anden
      // pisandose. Pegado a una casa, ese apartarse le metia dentro. Se recorta
      // al hueco que queda, y como el hueco cambia de forma continua segun se
      // avanza, recortarlo no da ningun salto.
      const room = elbowRoom(step.at, plots, width);
      const width0 = Math.hypot(side.x, side.z);
      const fit = width0 <= room ? 1 : room / Math.max(1e-6, width0);
      point = { x: step.at.x + side.x * fit, z: step.at.z + side.z * fit };
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

    // Parado es parado: ni cavando ni andando. Una conversacion con la azada
    // en la mano no es una conversacion.
    const clip = stepping ? 'walk'
      : talk !== null ? 'idle'
        : (summoned || indoors) && activity === 'working' ? 'idle'
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
      talking: talk !== null,
      age: ageOf(person, state.tick),
    });
  }

  return actors;
}

export type { Activity } from './day';
export { type ClipName, type ClipMotion } from './clips';
export { VILLAGER_CLIPS };
