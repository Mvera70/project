// M-18 · Cosmetic villagers. Positions are derived; GameState is never written.

import { isHere } from '@engine/people/demography';
import type { Building, GameState, Villager, VillagerId } from '@engine/state';
import { route } from '@engine/world/astar';
import { routesFor } from '@engine/world/paths';
import type { Figure } from './layers/figures';
import { hungerSeverity } from './layers/tells';
import { gatheringsAt } from './gatherings';
import { encountersAmong, type Encounter } from './encounters';
import { DAY, ENCOUNTER, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';

interface Point { x: number; y: number }
interface CachedPaths { tick: number; paths: Map<VillagerId, number[]> }
const SUNDAY = new WeakMap<GameState, CachedPaths>();
const WORKDAY = new WeakMap<GameState, CachedPaths>();
interface CachedMeeting extends CachedPaths { target: number }
const MEETING = new WeakMap<GameState, CachedMeeting>();
interface CachedTalk { tick: number; talks: Map<VillagerId, Encounter> }
const TALK = new WeakMap<GameState, CachedTalk>();

/**
 * §11.9: quién se para con quién hoy. Una vez por tick y sobre los destinos,
 * no en cada pintada y sobre las posiciones.
 */
function talksOf(state: GameState, routes: Map<VillagerId, number[]>): Map<VillagerId, Encounter> {
  const known = TALK.get(state);
  if (known !== undefined && known.tick === state.tick) return known.talks;
  const width = state.map.width;
  const spots = [...routes].flatMap(([id, cells]) => {
    const last = cells[cells.length - 1];
    if (last === undefined) return [];
    return [{ id, x: (last % width) + 0.5, y: Math.floor(last / width) + 0.5 }];
  });
  const talks = encountersAmong(state, spots);
  TALK.set(state, { tick: state.tick, talks });
  return talks;
}

function centre(building: Building, width: number): number {
  return (building.y + Math.floor(building.h / 2)) * width + building.x + Math.floor(building.w / 2);
}

/** La celda de una reunión, recortada al mapa. */
function cellOf(state: GameState, at: { x: number; y: number }): number {
  const x = Math.min(state.map.width - 1, Math.max(0, Math.round(at.x)));
  const y = Math.min(state.map.height - 1, Math.max(0, Math.round(at.y)));
  return y * state.map.width + x;
}

function plaza(state: GameState): number {
  const standing = state.buildings.filter((building) => building.lostTick === null);
  const well = standing.find((building) => building.kind === 'well');
  if (well !== undefined) return centre(well, state.map.width);
  if (standing.length === 0) return Math.floor(state.map.height / 2) * state.map.width + Math.floor(state.map.width / 2);
  const x = Math.round(standing.reduce((sum, building) => sum + building.x + building.w / 2, 0) / standing.length);
  const y = Math.round(standing.reduce((sum, building) => sum + building.y + building.h / 2, 0) / standing.length);
  return Math.min(state.map.terrain.length - 1, Math.max(0, y * state.map.width + x));
}

/**
 * Todos, desde su casa, hacia una misma celda. Es lo que ya hacía el domingo, y
 * ahora también lo que hace una reunión convocada por una decisión (§11.8).
 */
function pathsToward(state: GameState, target: number): Map<VillagerId, number[]> {
  const homes = new Map(state.buildings.filter((building) => building.lostTick === null)
    .map((building) => [building.id, centre(building, state.map.width)]));
  const paths = new Map<VillagerId, number[]>();
  for (const person of state.people.villagers) {
    if (!isHere(person)) continue;
    const from = person.homeId === null ? undefined : homes.get(person.homeId);
    const cells = from === undefined ? [target] : route(state.map, from, target);
    paths.set(person.id, cells.length > 0 ? cells : [from ?? target]);
  }
  return paths;
}

function sundayPaths(state: GameState): Map<VillagerId, number[]> {
  const known = SUNDAY.get(state);
  if (known !== undefined && known.tick === state.tick) return known.paths;
  const paths = pathsToward(state, plaza(state));
  SUNDAY.set(state, { tick: state.tick, paths });
  return paths;
}

/**
 * §11.8: la aldea se junta donde la decisión dijo que se juntaba.
 *
 * Cacheada por tick Y por celda: una reunión en la capilla y otra en el vado
 * son rutas distintas, y una caché que solo mirase el tick devolvería la
 * anterior el resto de la semana.
 */
function gatheringPaths(state: GameState, target: number): Map<VillagerId, number[]> {
  const known = MEETING.get(state);
  if (known !== undefined && known.tick === state.tick && known.target === target) return known.paths;
  const paths = pathsToward(state, target);
  MEETING.set(state, { tick: state.tick, target, paths });
  return paths;
}

function workdayPaths(state: GameState): Map<VillagerId, number[]> {
  const known = WORKDAY.get(state);
  if (known !== undefined && known.tick === state.tick) return known.paths;
  const paths = new Map(routesFor(state));
  const target = plaza(state);
  const homes = new Map(state.buildings.filter((building) => building.lostTick === null)
    .map((building) => [building.id, centre(building, state.map.width)]));
  for (const person of state.people.villagers) {
    if (!isHere(person) || paths.has(person.id)) continue;
    const home = person.homeId === null ? undefined : homes.get(person.homeId);
    paths.set(person.id, [home ?? target]);
  }
  WORKDAY.set(state, { tick: state.tick, paths });
  return paths;
}

function onPath(cells: readonly number[], progress: number, width: number): Point {
  const distance = Math.max(0, cells.length - 1) * Math.max(0, Math.min(1, progress));
  const at = Math.min(cells.length - 1, Math.floor(distance));
  const next = Math.min(cells.length - 1, at + 1);
  const amount = distance - at;
  const a = cells[at] as number;
  const b = cells[next] as number;
  return {
    x: (a % width) + 0.5 + (((b % width) - (a % width)) * amount),
    y: Math.floor(a / width) + 0.5 + ((Math.floor(b / width) - Math.floor(a / width)) * amount),
  };
}

/**
 * §11.9: el sitio exacto donde esta persona pasa la jornada, dentro de su
 * destino. Ocho segando el mismo campo no están en la misma celda: están
 * repartidos por él. Estable por identificador, así que cada uno vuelve a su
 * mismo trozo de campo, y sin tocar ningún flujo de azar (§4.3).
 */
function workSpot(id: number, at: Point, crowding: number, base: number): Point {
  const angle = ((Math.imul(id + 17, 2654435761) >>> 0) % 6283) / 1000;
  // El radio crece con la raíz de cuántos comparten el sitio, que es como
  // crece el área: veinte personas en un campo ocupan un corro más ancho que
  // tres, y si no se dibujan una encima de otra.
  const spread = base * Math.sqrt(Math.max(1, crowding));
  const radius = (((Math.imul(id + 91, 40503) >>> 0) % 1000) / 999) ** 0.5 * spread;
  return { x: at.x + Math.cos(angle) * radius, y: at.y + Math.sin(angle) * radius };
}

/** Cuánta gente comparte cada destino esta semana. */
function crowdingOf(routes: Map<VillagerId, number[]>): Map<number, number> {
  const out = new Map<number, number>();
  for (const cells of routes.values()) {
    const last = cells[cells.length - 1];
    if (last === undefined) continue;
    out.set(last, (out.get(last) ?? 0) + 1);
  }
  return out;
}

/** Un pseudoaleatorio estable en 0..1 desde dos enteros. Sin tocar §4.3. */
function stable(a: number, b: number): number {
  let h = Math.imul(a + 0x6d2b, 0x85eb_ca6b) ^ Math.imul(b + 0x35a7, 0xc2b2_ae35);
  h = Math.imul(h ^ (h >>> 15), 0x27d4_eb2f);
  h ^= h >>> 16;
  return ((h >>> 0) % 100_000) / 99_999;
}

interface Day {
  /** Cuándo sale de casa. */
  leave: number;
  /** Cuándo está ya en su sitio. */
  arrive: number;
  /** Cuándo lo deja. */
  depart: number;
  /** Cuándo ha vuelto. */
  home: number;
}

/**
 * §11.9: la jornada de esta persona esta semana.
 *
 * Cambia con el tick y con quién es, así que ni dos personas hacen el mismo
 * día ni la misma persona repite el de la semana pasada. Los críos y los
 * viejos lo dan por terminado antes, que es lo que pasaba de verdad.
 */
function dayOf(person: Villager, tick: number): Day {
  const leave = stable(person.id, tick) * DAY.LEAVE_SPAN;
  const arrive = leave + DAY.TRAVEL;
  const age = Math.floor((tick - person.bornTick) / TIME.WEEKS_PER_YEAR);
  const short = age < DAY.CHILD_UNDER || age >= DAY.ELDER_OVER;
  const full = DAY.RETURN_EARLIEST + stable(tick, person.id) * DAY.RETURN_SPAN;
  const depart = short ? arrive + (full - arrive) * DAY.SHORT_DAY : full;
  return { leave, arrive, depart, home: depart + DAY.TRAVEL };
}

function clampFigure(point: Point, state: GameState): Point {
  return {
    x: Math.max(0, Math.min(state.map.width - 1, point.x - 0.5)),
    y: Math.max(0, Math.min(state.map.height - 1.8, point.y - 1.35)),
  };
}

export function crowdPositions(state: GameState, tickFraction: number): Figure[] {
  const fraction = Math.max(0, Math.min(1, tickFraction));
  if (fraction >= 0.8) return [];
  const hunger = hungerSeverity(state);
  // §11.8: si una decisión convocó a la aldea, eso manda sobre el domingo y
  // sobre el trabajo. Es la única semana en que la gente hace algo porque el
  // jugador lo decidió, y por eso se ve.
  const meeting = gatheringsAt(state, CATALOG)[0];
  const routes = meeting !== undefined
    ? gatheringPaths(state, cellOf(state, meeting))
    : state.tick % 4 === 0 ? sundayPaths(state) : workdayPaths(state);
  const talks = meeting === undefined ? talksOf(state, routes) : new Map<VillagerId, Encounter>();
  const crowding = crowdingOf(routes);
  const namedOrder = new Map(state.people.namedIds.map((id, index) => [id, index]));
  const figures: Figure[] = [];
  for (const person of state.people.villagers.filter(isHere).sort((a, b) => a.id - b.id).slice(0, 80)) {
    const cells = routes.get(person.id);
    if (cells === undefined || cells.length === 0) continue;
    const day = dayOf(person, state.tick);
    if (fraction >= day.arrive && fraction < day.depart
      && ((Math.imul(person.id + 7, 2654435761) >>> 0) % 1000) / 999 < hunger * 0.5) continue;
    let point: Point;
    if (fraction < day.leave) {
      // Todavía en casa: el día no ha empezado para esta persona.
      point = onPath(cells, 0, state.map.width);
    } else if (fraction < day.arrive) {
      const progress = (fraction - day.leave) / Math.max(0.001, day.arrive - day.leave);
      point = onPath(cells, progress ** (1 + hunger), state.map.width);
    } else if (fraction < day.depart) {
      const here = cells[cells.length - 1];
      point = workSpot(
        person.id,
        onPath(cells, 1, state.map.width),
        here === undefined ? 1 : (crowding.get(here) ?? 1),
        meeting === undefined ? ENCOUNTER.SPREAD : ENCOUNTER.MEETING_SPREAD,
      );
      const talk = talks.get(person.id);
      if (talk !== undefined && fraction >= talk.from && fraction < talk.to) {
        // §11.9: se han parado a hablar. Quietos y juntos, uno a cada lado del
        // punto de encuentro — dos figuras exactamente encima leerían como una
        // sola, y lo que tiene que leerse es que son dos.
        const side = person.id < talk.withId ? -0.35 : 0.35;
        point = { x: talk.x + side, y: talk.y };
      } else {
        // §11.9: trabajando. Recorre su parcela en vez de quedarse clavado —
        // el surco de ida y el de vuelta— con un ritmo y una dirección propios
        // para que dos vecinos no vayan acompasados como un mecanismo.
        const through = (fraction - day.arrive) / Math.max(0.001, day.depart - day.arrive);
        const swing = Math.sin(through * Math.PI * 2 * DAY.WORK_LAPS + person.id * 1.7);
        const heading = ((Math.imul(person.id + 31, 374761393) >>> 0) % 6283) / 1000;
        point.x += Math.cos(heading) * swing * DAY.WORK_REACH;
        point.y += Math.sin(heading) * swing * DAY.WORK_REACH;
      }
    } else if (fraction < day.home) {
      const back = (fraction - day.depart) / Math.max(0.001, day.home - day.depart);
      point = onPath(cells, 1 - (back ** (1 + hunger)), state.map.width);
    } else {
      // De vuelta en casa antes de que caiga la noche, que es lo que hace que
      // el valle se vaya apagando por partes en vez de de golpe.
      point = onPath(cells, 0, state.map.width);
    }

    const placed = clampFigure(point, state);
    figures.push({
      id: person.id,
      x: placed.x,
      y: placed.y,
      named: person.named,
      namedIndex: namedOrder.get(person.id) ?? 0,
    });
  }
  return figures;
}
