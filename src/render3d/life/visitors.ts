// El valle más vivo (25 sep 2026) · Los que vienen por el camino.
//
// El buhonero, el forastero de paso y las tres visitas de M-0 —el factor, el
// tratante de ganado y el de la sal— **existían sólo en la crónica**: el motor
// los sorteaba (`world/fate.ts`), la crónica los contaba y la plaza seguía
// vacía. Esto les da cuerpo: la semana que el motor dice que vinieron, uno o
// dos llegan por la misma entrada exterior que usa la partida del valle vecino
// (`approachOf`, `raiders.ts`), andan hasta la plaza, se quedan allí hasta
// media tarde y se van por donde vinieron.
//
// Como la partida, **navegado y no guionizado** (IA-5): `pathTo` y `integrate`,
// los mismos con los que anda cualquiera en esta capa, así que nunca atraviesan
// una casa. Y como todo en `life/`, sólo enseña: lo que traían ya lo decidió el
// motor, y nada de aquí escribe en `GameState` ni tira dados. La variación sale
// de un hash de la semilla de la jornada.

import { hash32 } from '@engine/rng';
import type { GameState, HappeningId } from '@engine/state';
import type { Animal } from '@derive/animals';
import type { Body, Point, Terrain } from './body';
import { fitsCircle, integrate, turnTo } from './body';
import { LIFE_STEP } from './clock';
import { clearBetween, pathTo } from './navigate';
import type { Waypoint } from './navigate';
import { approachOf } from './raiders';
import { nearestReachable, reachableFrom } from './terrain';

export type VisitorPhase = 'waiting' | 'coming' | 'staying' | 'leaving' | 'gone';

export interface Visitor {
  readonly body: Body;
  /** El suceso que lo trajo: el buhonero no es el forastero. */
  readonly kind: HappeningId;
  /** Por dónde entra y por dónde se va. */
  readonly road: Point;
  /** Su sitio en la plaza, y el centro al que mira mientras está. */
  readonly spot: Point;
  readonly centre: Point;
  phase: VisitorPhase;
  route: Waypoint[];
  /** Hora de llegar y de irse, en fase de jornada: cada uno la suya. */
  readonly arrive: number;
  readonly leave: number;
  /** Paso a partir del cual el tramo se da por hecho aunque no se haya llegado (E.7). */
  deadline: number;
  /** Lo andado, para la zancada del clip. */
  travelled: number;
  /** Pasos seguidos sin avanzar: al pasar de `STALL_STEPS`, se rehace la ruta. */
  stalled: number;
  /** Si trae género: el que viene a vender, sí; el de paso, no. */
  readonly pack: boolean;
  /**
   * El animal que trae, y que va detrás de él por donde ha pisado: la **mula**
   * del que viene a vender, con la carga a lomos (Vera, «mula de buhonero
   * mejor», frente a la carretilla), o la **vaca** que el tratante viene a
   * vender. `null` para el forastero y para el segundo de una pareja.
   */
  readonly beast: { readonly kind: 'mule' | 'cow'; x: number; z: number; moving: boolean } | null;
  /** Por dónde ha pisado, para que la mula lo siga sin atajar por una casa. */
  readonly trail: Point[];
}

/**
 * Los sucesos que traen a alguien por el camino, y cuántos días de la semana se
 * quedan. TUNE: los que vienen a vender, tres días —un mercadillo, que es lo
 * que tarda en correr la voz y en que se acerque toda la aldea—; el forastero,
 * uno, porque está de paso. A ×1 un día escénico son dos minutos, así que tres
 * días son seis minutos de plaza con alguien nuevo en ella.
 */
const VISITS: Readonly<Partial<Record<HappeningId, { days: number; people: number; pack: boolean }>>> = {
  pedlar: { days: 3, people: 1, pack: true },
  factor_visit: { days: 3, people: 2, pack: true },
  drover_visit: { days: 3, people: 2, pack: false },
  salt_visit: { days: 3, people: 1, pack: true },
  stranger_passes: { days: 1, people: 1, pack: false },
};

/**
 * Cuándo se ponen en camino y cuándo se van, en fase de jornada. TUNE: salen al
 * alba (0,14) porque el camino desde la entrada exterior es largo —medido en
 * las semillas 7, 23 y 41, de 1 200 a 350 pasos de 3 600, o sea hasta un tercio
 * de la jornada—, así que llegan a la plaza entre media mañana y mediodía, que
 * es cuando más gente hay (`OFFERS.meal`, 0,42–0,52). Se van a media tarde
 * (0,6, las tres), antes de la hoguera, para volver con luz.
 */
const ARRIVE = 0.14;
const LEAVE = 0.6;
const JITTER = 0.05;
/** Lo que anda un visitante, en celdas por segundo: sin prisa, como un vecino (`body.ts`). */
const VISITOR_PACE = 1.1;
const VISITOR_RADIUS = 0.32;
/** Identificadores negativos y lejos de la partida (−9 000) y de la cabaña (−10 000). */
const VISITOR_ID_BASE = 8_500;
/**
 * Dónde se pone el que monta puesto: a tres celdas del centro, y el puesto a
 * medio camino hacia él (2,45), fuera de la fuente (radio 0,4).
 */
const STALL_RADIUS = 3;
/**
 * Los ángulos ocupados de la plaza, en radianes desde +X hacia +Z: la hoguera
 * (`effects/hearth.ts`, a +1,8/+1,1 del centro) y los cuatro postes de la
 * fiesta (`effects/festoon.ts`, a 45° + k·90°). Se copian aquí porque la capa
 * de vida no importa del render; si se mueven allí, se mueven aquí.
 */
const PLAZA_TAKEN = [Math.atan2(1.1, 1.8), ...[1, 3, 5, 7].map((k) => (k * Math.PI) / 4)];
const TAKEN_GAP = 0.4;
function stallAngle(wanted: number): number {
  for (let k = 0; k < 16; k += 1) {
    const angle = wanted + k * 0.39;
    const clear = PLAZA_TAKEN.every((taken) => Math.abs(Math.atan2(Math.sin(angle - taken), Math.cos(angle - taken))) > TAKEN_GAP);
    if (clear) return angle;
  }
  return wanted;
}

/** Cuántas entradas se prueban antes de renunciar a que venga. */
const ENTRY_TRIES = 12;
/** Holgura de un tramo, en pasos, sobre el doble de lo que se tarda en línea recta. */
const DEADLINE_SLACK = 240;

/** Quién viene hoy por el camino: el suceso de esta semana, si trae a alguien y hoy es uno de sus días. */
export function visitsToday(state: GameState, day: number, daysPerWeek: number): HappeningId[] {
  const out: HappeningId[] = [];
  const dayOfWeek = day - state.tick * daysPerWeek;
  for (const happening of state.happenings) {
    if (happening.tick !== state.tick) continue;
    const visit = VISITS[happening.id];
    if (visit === undefined || dayOfWeek < 0 || dayOfWeek >= visit.days) continue;
    out.push(happening.id);
  }
  return out;
}

function unit(seed: number, what: string): number {
  return hash32(seed, `visitor:${what}`) / 0x1_0000_0000;
}

function deadlineFor(from: Point, to: Point, step: number): number {
  const far = Math.hypot(to.x - from.x, to.z - from.z);
  return step + Math.round(((far / VISITOR_PACE) * 2) / LIFE_STEP) + DEADLINE_SLACK;
}

/**
 * Monta a los de hoy. Lista vacía si nadie viene o si no hay por dónde: un
 * valle sin entrada exterior no ve llegar a nadie, y no es un error.
 */
export function createVisitors(
  state: GameState, land: Terrain, heart: Point, plaza: Point, seed: number, kinds: readonly HappeningId[],
): Visitor[] {
  if (kinds.length === 0) return [];
  // **El suelo es el de la aldea, no el de fuera.** La primera versión usaba el
  // de la entrada exterior (`approachOf`), y en la semilla 11 al año 30 esa
  // entrada queda al otro lado del río: el buhonero acabó plantado en la
  // orilla, bajo la lluvia, mirando una plaza a la que no podía llegar. Ahora
  // la entrada es el punto del suelo de la aldea que cae más cerca de la de
  // fuera, pero siempre lejos de la plaza, para que se le vea venir.
  const shore = reachableFrom(land, heart);
  const road = approachOf(state, land, heart);
  const entry = entryOf(land, shore, plaza, road);
  if (entry === null) return [];
  const visitors: Visitor[] = [];
  for (const kind of kinds) {
    const visit = VISITS[kind]!;
    for (let n = 0; n < visit.people; n += 1) {
      const index = visitors.length;
      // El que monta puesto (`effects/stalls.ts`) se pone más lejos del centro,
      // para que el tenderete no caiga encima de la fuente, y en un ángulo que
      // no pise la hoguera ni los postes de la fiesta.
      const stall = n === 0 && visit.pack;
      const radius = stall ? STALL_RADIUS : 1.4;
      const angle = stall ? stallAngle(unit(seed, `${index}:angle`) * Math.PI * 2)
        : unit(seed, `${index}:angle`) * Math.PI * 2;
      const spot = nearestReachable(land, shore, {
        x: plaza.x + Math.cos(angle) * radius,
        z: plaza.z + Math.sin(angle) * radius,
      }, VISITOR_RADIUS);
      if (spot === null || Math.hypot(spot.x - plaza.x, spot.z - plaza.z) > radius + 1.6) continue;
      // **La entrada se elige probando a llegar, no mirando el mapa**, como el
      // puesto de la partida (`createRaiders`). Lo enseñó la primera toma del
      // navegador, semilla 11 al año 30: la entrada caía en el bosque, A* no
      // encontraba paso entre los troncos del juego de verdad —que la prueba
      // no tiene— y el buhonero se quedó plantado entre los árboles. Se prueban
      // puntos alrededor de la entrada, de dentro afuera, y se coge el primero
      // desde el que la plaza se alcanza andando.
      let from: Point | null = null;
      let route: Waypoint[] | null = null;
      for (let tries = 0; tries < ENTRY_TRIES && route === null; tries += 1) {
        const turn = unit(seed, `${index}:turn`) * Math.PI * 2 + tries * 2.4;
        const far = tries === 0 ? 0 : 1 + tries * 0.8;
        from = nearestReachable(land, shore, {
          x: entry.x + Math.cos(turn) * far,
          z: entry.z + Math.sin(turn) * far,
        }, VISITOR_RADIUS);
        if (from !== null) route = pathTo(land, from, spot);
      }
      if (from === null || route === null) continue;
      visitors.push({
        body: {
          id: -(VISITOR_ID_BASE + index), x: from.x, z: from.z,
          vx: 0, vz: 0, facing: 0, radius: VISITOR_RADIUS, pace: VISITOR_PACE,
        },
        kind,
        road: from,
        spot,
        centre: plaza,
        phase: 'waiting',
        route,
        arrive: ARRIVE + unit(seed, `${index}:arrive`) * JITTER,
        leave: LEAVE + unit(seed, `${index}:leave`) * JITTER,
        deadline: 0,
        travelled: 0,
        stalled: 0,
        pack: visit.pack,
        beast: n !== 0 ? null
          : visit.pack ? { kind: 'mule', x: from.x, z: from.z, moving: false }
            : kind === 'drover_visit' ? { kind: 'cow', x: from.x, z: from.z, moving: false } : null,
        trail: [{ x: from.x, z: from.z }],
      });
    }
  }
  return visitors;
}

/**
 * Lo lejos de la plaza que aparece, en celdas. TUNE: de 12 a 26, lo mismo que
 * la partida (`MIN_ENTRY`/`MAX_ENTRY`, `raiders.ts`) con dos de margen: fuera
 * del corro de casas, y dentro de lo que se mira.
 */
const ENTRY_NEAR = 12;
const ENTRY_FAR = 26;

/** Por dónde entra: del suelo de la aldea, lejos de la plaza y lo más cerca posible de la entrada de fuera. */
function entryOf(land: Terrain, shore: Uint8Array, plaza: Point, road: Point | null): Point | null {
  let best: Point | null = null;
  let bestScore = Infinity;
  for (let z = 0; z < land.height; z += 1) {
    for (let x = 0; x < land.width; x += 1) {
      if (shore[z * land.width + x] !== 1) continue;
      const at = { x: x + 0.5, z: z + 0.5 };
      const far = Math.hypot(at.x - plaza.x, at.z - plaza.z);
      if (far < ENTRY_NEAR || far > ENTRY_FAR) continue;
      // Sin entrada de fuera, lo más lejos posible dentro de lo que se mira.
      const score = road === null ? -far : Math.hypot(at.x - road.x, at.z - road.z);
      if (score < bestScore) { bestScore = score; best = at; }
    }
  }
  return best;
}

/** Si alguno está a la vista: fuera de `waiting` y de `gone`. */
export function visiting(visitor: Visitor): boolean {
  return visitor.phase !== 'waiting' && visitor.phase !== 'gone';
}

/**
 * Un paso de un visitante. Siempre acaba (E.7): cada tramo tiene su plazo, y
 * vencido se da por hecho.
 *
 * `phase` es la hora de la jornada. Quien abre la jornada ya pasada la hora de
 * irse no llega a salir: ese día ya se fue.
 */
export function stepVisitor(visitor: Visitor, land: Terrain, phase: number, step: number): void {
  moveVisitor(visitor, land, phase, step);
  followWithBeast(visitor);
}

function moveVisitor(visitor: Visitor, land: Terrain, phase: number, step: number): void {
  const { body } = visitor;
  if (visitor.phase === 'gone') return;
  if (visitor.phase === 'waiting') {
    if (phase >= visitor.leave) { visitor.phase = 'gone'; return; }
    if (phase < visitor.arrive) return;
    visitor.phase = 'coming';
    visitor.deadline = deadlineFor(body, visitor.spot, step);
  }
  if (visitor.phase === 'staying') {
    body.vx = 0;
    body.vz = 0;
    if (phase < visitor.leave) return;
    visitor.phase = 'leaving';
    visitor.route = pathTo(land, { x: body.x, z: body.z }, visitor.road) ?? [];
    visitor.deadline = deadlineFor(body, visitor.road, step);
  }

  const goal = visitor.phase === 'coming' ? visitor.spot : visitor.road;
  const gap = Math.hypot(goal.x - body.x, goal.z - body.z);
  if (gap < 0.6 || step > visitor.deadline) {
    body.vx = 0;
    body.vz = 0;
    if (visitor.phase === 'coming') {
      visitor.phase = 'staying';
      // Mira hacia el centro de la plaza, que es donde está la aldea.
      body.facing = Math.atan2(visitor.centre.x - body.x, visitor.centre.z - body.z);
    } else {
      visitor.phase = 'gone';
    }
    return;
  }
  // Como anda un vecino (`village.ts`): el punto de la ruta sólo se da por
  // pasado si desde aquí se ve limpio el siguiente, y nunca se pasa de largo.
  // La primera versión lo daba por pasado a media celda y cortaba la esquina:
  // en la semilla 11 al año 30 el buhonero se salía dos décimas de la línea
  // segura y quedaba contra un tronco del bosque, con A* sin salida desde allí.
  const route = visitor.route;
  while (route.length > 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.4
    && clearBetween(land, body, route[1]!, body.radius)) route.shift();
  if (route.length === 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.1) route.shift();
  const to = route[0] ?? goal;
  const span = Math.hypot(to.x - body.x, to.z - body.z) || 1;
  const pace = Math.min(VISITOR_PACE, span / LIFE_STEP);
  body.vx = ((to.x - body.x) / span) * pace;
  body.vz = ((to.z - body.z) / span) * pace;
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  const before = { x: body.x, z: body.z };
  integrate(body, land, LIFE_STEP);
  const moved = Math.hypot(body.x - before.x, body.z - before.z);
  visitor.travelled += moved;
  // **Atascado, se rehace la ruta desde donde está.** Lo enseñó la semilla 23:
  // de vuelta, el último tramo recto hacia la entrada daba contra una esquina y
  // el buhonero se quedó veinte segundos andando contra ella hasta el plazo.
  visitor.stalled = moved < VISITOR_PACE * LIFE_STEP * 0.2 ? visitor.stalled + 1 : 0;
  if (visitor.stalled >= STALL_STEPS) {
    visitor.stalled = 0;
    // Y si rehacer la ruta no basta —en el juego de verdad, semilla 11 al año
    // 30, se quedó encajado entre dos troncos del bosque, solapado con uno, y
    // `integrate` sólo le deja moverse hacia donde se solapa menos—, se le
    // aparta un palmo al primer hueco libre de alrededor. Un palmo no se ve;
    // un buhonero plantado entre los árboles todo el día, sí.
    if (!fitsCircle(land, body.x, body.z, body.radius)) {
      for (let ring = 1; ring <= 3; ring += 1) {
        const free = Array.from({ length: 8 }, (_, k) => ({
          x: body.x + Math.cos((k / 8) * Math.PI * 2) * ring * 0.2,
          z: body.z + Math.sin((k / 8) * Math.PI * 2) * ring * 0.2,
        })).find((at) => fitsCircle(land, at.x, at.z, body.radius));
        if (free !== undefined) { body.x = free.x; body.z = free.z; break; }
      }
    }
    visitor.route = pathTo(land, { x: body.x, z: body.z }, goal) ?? [];
  }
}

/** Pasos sin avanzar antes de rehacer la ruta: medio segundo escénico. */
const STALL_STEPS = Math.round(0.5 / LIFE_STEP);

/** Lo que va la mula detrás del ramal, en celdas, y lo que anda como mucho. */
const MULE_BEHIND = 1.1;
const MULE_PACE = VISITOR_PACE * 1.3;
const TRAIL_STEP = 0.25;
const TRAIL_KEEP = 16;

function followWithBeast(visitor: Visitor): void {
  const { beast: mule, trail, body } = visitor;
  if (mule === null) return;
  const last = trail[trail.length - 1]!;
  if (Math.hypot(body.x - last.x, body.z - last.z) > TRAIL_STEP) {
    trail.push({ x: body.x, z: body.z });
    if (trail.length > TRAIL_KEEP) trail.shift();
  }
  // El punto de la huella que queda a un ramal de distancia; si él está quieto
  // y la mula ya llegó, se queda donde está.
  let target: Point | null = null;
  for (let n = trail.length - 1; n >= 0; n -= 1) {
    const point = trail[n]!;
    if (Math.hypot(point.x - body.x, point.z - body.z) >= MULE_BEHIND) { target = point; break; }
  }
  const gap = target === null ? 0 : Math.hypot(target.x - mule.x, target.z - mule.z);
  mule.moving = target !== null && gap > 0.05;
  if (!mule.moving || target === null) return;
  const move = Math.min(gap, MULE_PACE * LIFE_STEP);
  mule.x += ((target.x - mule.x) / gap) * move;
  mule.z += ((target.z - mule.z) / gap) * move;
}

/** La mula o la vaca, como animal para el render, si está a la vista. */
export function beastOf(visitor: Visitor): Animal[] {
  const beast = visitor.beast;
  if (beast === null || !visiting(visitor)) return [];
  return [{ id: MULE_ID_BASE - visitor.body.id - VISITOR_ID_BASE, kind: beast.kind, x: beast.x, y: beast.z,
    action: beast.moving ? 'walk' : undefined }];
}

/** Fuera de los animales del valle (40 000–44 299). */
const MULE_ID_BASE = 44_300;
