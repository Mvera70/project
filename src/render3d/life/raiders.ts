// D3 · La partida del valle vecino, con cuerpo. design.md §1b, fase 4.
//
// **El hecho ya existe en el motor y no se ve.** Desde B1, un clan baja de la
// ladera de al lado, se lleva plata, grano y una cabeza, y la aldea lo encaja o
// se prepara (B2). Todo eso pasaba **sin que apareciera nadie**: una línea de
// crónica y las cifras cambiadas. Era lo primero de la lista de
// `docs/encargos-3d.md` —«lo que pasa y no se ve»— y es lo que esta ronda
// arregla: la semana que llegan, se ven llegar.
//
// **Esta es la primera mitad de D3, y conviene saber qué no hace.** Llegan por
// el camino, se plantan ante el portón y se van. **No pelean, no rompen nada y
// no matan a nadie**: lo que se llevan ya lo decidió el motor antes de que
// empiece la jornada, y esto sólo lo enseña. Es el mismo trato que IA-5 le dio
// al lobo del corral —«no conviertas una conducta visual en consecuencia
// mecánica» (E.8)— y la razón por la que esta ronda no toca una sola cifra.
// La pelea es D4, y necesita los clips que todavía no existen.
//
// **Navegado, no guionizado**, por la lección que costó una tarde en IA-5: la
// primera versión del lobo iba en línea recta con `seek`/`avoid` y se atascaba
// contra la primera pared. Aquí se usa el mismo `Router`/`pathTo` con el que
// anda cualquiera en esta capa, así que la partida llega de verdad y nunca
// atraviesa una casa para conseguirlo.

import { hash32 } from '@engine/rng';
import type { GameState } from '@engine/state';
import type { Body, Point, Terrain } from './body';
import { reachableFrom, nearestReachable } from './terrain';
import { blockedAt, integrate, turnTo } from './body';
import { LIFE_STEP } from './clock';
import { pathTo } from './navigate';
import type { Waypoint } from './navigate';

/** En qué anda la partida ahora mismo. */
export type RaiderPhase = 'coming' | 'standing' | 'leaving' | 'gone';

export interface Raider {
  readonly body: Body;
  /** Por dónde entró al valle, y por dónde se irá. */
  readonly road: Point;
  /** El sitio ante el portón que le toca a éste. */
  readonly post: Point;
  phase: RaiderPhase;
  route: Waypoint[];
  /** Paso a partir del cual el tramo se da por hecho aunque no haya llegado. */
  deadline: number;
  /** Paso hasta el que se queda plantado antes de dar media vuelta. */
  standingUntil: number;
  /** Si algún tope tuvo que cortarle el viaje en vez de terminarlo andando. */
  forced: boolean;
}

/**
 * **Cuántos se ven, y por qué no son todos.**
 *
 * TUNE: doce. Una partida del clan puede ser de sesenta hombres (B1,
 * `THREAT.STRENGTH_CAP`), y sesenta cuerpos más en la jornada son sesenta rutas
 * de A* y sesenta figuras sobre una aldea que ya mueve ochenta. Lo que la
 * cámara ortográfica de este juego enseña de un grupo ante una puerta son las
 * primeras filas; doce llenan el encuadre y **cuestan un 15 % de lo que ya
 * cuesta la gente**. El número de verdad sigue estando en la crónica y en la
 * cifra que se llevaron: esto es cuántos se dibujan, no cuántos son.
 */
export const BAND_SHOWN = 12;

/** A qué distancia del portón se plantan, en celdas. */
const STAND_OFF = 2.5;

/** Cuánto se quedan plantados, en pasos de vida (de 6 a 10 segundos). */
const STAND_STEPS: readonly [number, number] = [180, 300];

/** El margen de pasos sobre lo que la ruta mide, antes de darla por perdida. */
const DEADLINE_SLACK = 240;

/**
 * Si hoy hay partida en el valle, y de cuántos.
 *
 * Lee `threat.arrivedTick`, que el motor pone la semana que llegan: es el mismo
 * trato que `wolfRaidToday` tiene con `state.happenings`, leer el hecho y no
 * inventarlo.
 */
export function raidToday(state: GameState): number {
  if (state.threat.arrivedTick !== state.tick) return 0;
  return Math.min(BAND_SHOWN, Math.max(1, state.threat.lastBand));
}

/** El portón en pie, o el corazón de la aldea si todavía no hay ninguno. */
function gateOf(state: GameState, heart: Point): Point {
  const gate = state.buildings.find((b) => b.kind === 'gate' && b.lostTick === null);
  return gate === undefined ? heart : { x: gate.x + 0.5, z: gate.y + 0.5 };
}

/**
 * El suelo de fuera del portón, y por dónde se entra a él.
 *
 * **Se inunda desde la puerta hacia fuera, y no al revés**, y esa inversión es
 * la lección de esta ronda. Las dos primeras versiones elegían el punto de
 * entrada mirando el mapa —una proyección geométrica, luego un barrido de
 * direcciones— y comprobaban la conexión después: medido en diez semillas, en
 * dos de ellas **los doce cuerpos se quedaban sin ruta** porque su entrada
 * caía en una bolsa que no daba a la puerta. Empezando por la puerta, la bolsa
 * en la que se entra **es** la de la puerta, y la conexión no hay que
 * comprobarla porque no puede faltar.
 *
 * De las dos caras de la puerta se coge la de fuera, que es la grande: el
 * interior de un cerco son un par de cientos de celdas y el campo es el resto
 * del valle.
 */
function outsideOf(land: Terrain, gate: Point, heart: Point): Uint8Array | null {
  const candidates: Point[] = [
    { x: gate.x + 1, z: gate.z }, { x: gate.x - 1, z: gate.z },
    { x: gate.x, z: gate.z + 1 }, { x: gate.x, z: gate.z - 1 },
  ];
  // **Y el campo abierto, por si la puerta no sirve.** Medido en la semilla 7
  // al año 25: su portón tiene **tres lados tapiados y una bolsa de ocho
  // celdas** —una puerta que no lleva a ninguna parte, que es un defecto de la
  // muralla anotado aparte—. Una partida que baja a robar no se queda en casa
  // porque la puerta del vecino esté mal puesta: viene **al pueblo**, así que
  // si la puerta no da a campo se prueba el campo directamente.
  for (let n = 0; n < 8; n += 1) {
    const angle = (n / 8) * Math.PI * 2;
    candidates.push({
      x: heart.x + Math.cos(angle) * OPEN_COUNTRY,
      z: heart.z + Math.sin(angle) * OPEN_COUNTRY,
    });
  }

  let best: Uint8Array | null = null;
  let bestSize = 0;
  for (const at of candidates) {
    if (at.x < 1 || at.z < 1 || at.x > land.width - 2 || at.z > land.height - 2) continue;
    if (blockedAt(land, at.x, at.z)) continue;
    const reach = reachableFrom(land, at);
    let size = 0;
    for (let i = 0; i < reach.length; i += 1) if (reach[i] === 1) size += 1;
    if (size > bestSize) { best = reach; bestSize = size; }
  }
  return best;
}

/** A qué distancia de la plaza se busca campo abierto, en celdas. */
const OPEN_COUNTRY = 22;

/**
 * Por dónde entran: el suelo alcanzable más lejano de la puerta, dentro de lo
 * que se busca.
 *
 * Así vienen **por fuera hacia dentro** y no aparecen en medio del pueblo, que
 * es lo único que esta elección tiene que garantizar. No se usa el camino
 * gastado (`map.path`) a propósito: un valle joven no tiene camino, y la
 * partida no deja de venir por eso.
 */
function roadInto(land: Terrain, gate: Point, reach: Uint8Array): Point | null {
  let best: Point | null = null;
  let bestFar = MIN_ENTRY;
  for (let z = 0; z < land.height; z += 1) {
    for (let x = 0; x < land.width; x += 1) {
      if (reach[z * land.width + x] !== 1) continue;
      const far = Math.hypot(x + 0.5 - gate.x, z + 0.5 - gate.z);
      if (far < bestFar || far > MAX_ENTRY) continue;
      bestFar = far;
      best = { x: x + 0.5, z: z + 0.5 };
    }
  }
  return best;
}

/**
 * Lo lejos que entran, en celdas desde el portón.
 *
 * TUNE: de 10 a 26. Diez es más de lo que mide el anillo de muralla de un valle
 * hecho (radio 10 a 12, medido en B-1), así que nacen **fuera del pueblo** y se
 * les ve venir; veintiséis es hasta dónde se mira, y sale del mismo sitio: el
 * doble del anillo es campo abierto en cualquier valle medido.
 */
const MIN_ENTRY = 10;
const MAX_ENTRY = 26;

/**
 * Monta la partida que se ve hoy. Devuelve lista vacía si no hay por dónde
 * entrar —un valle cercado por agua— y eso no es un error: es que hoy no se ve
 * llegar a nadie, aunque el motor ya haya contado lo que se llevaron.
 */
export function createRaiders(
  state: GameState, land: Terrain, heart: Point,
  seed: number, step: number, howMany: number,
): Raider[] {
  const gate = gateOf(state, heart);
  const reach = outsideOf(land, gate, heart);
  if (reach === null) return [];
  const road = roadInto(land, gate, reach);
  if (road === null) return [];

  // **Su suelo es el de fuera, no el de la aldea**, y eso costó una depuración:
  // la primera versión colocaba con la orilla del valle —el suelo alcanzable
  // desde el corazón del pueblo— a gente que **no es del pueblo**. Medido en la
  // semilla 41 al año 20, esa orilla son 232 celdas de 8 064 (el interior del
  // cerco, y encima partido), así que no había un solo sitio válido y la partida
  // no llegaba a existir.

  const raiders: Raider[] = [];
  for (let n = 0; n < howMany; n += 1) {
    // Se reparten en abanico ante la puerta, no en fila: lo que se mira es un
    // grupo plantado, y un grupo en fila india parece una cola.
    const angle = (hash32(seed, `raider:${n}:angle`) / 0xffffffff) * Math.PI * 2;
    const spread = STAND_OFF + (hash32(seed, `raider:${n}:far`) / 0xffffffff) * 1.5;
    const start = {
      x: road.x + (hash32(seed, `raider:${n}:x`) / 0xffffffff - 0.5) * 3,
      z: road.z + (hash32(seed, `raider:${n}:z`) / 0xffffffff - 0.5) * 3,
    };
    const from = nearestReachable(land, reach, start, 6) ?? road;
    // **El sitio se elige probando a llegar, no mirando el mapa.** Que una celda
    // esté en la inundación no quiere decir que un cuerpo quepa por el camino:
    // A* pide anchura (`ROUTE_CLEARANCE`) y la inundación no. Medido con la
    // primera versión, en dos semillas de diez **los doce cuerpos se quedaban
    // sin ruta** y la visita se resolvía por vencimiento. Se prueban plazas
    // alrededor de la puerta, de la más cercana hacia fuera, y se coge la
    // primera a la que de verdad se puede ir andando.
    const body: Body = {
      id: -(RAIDER_ID_BASE + n), x: from.x, z: from.z,
      vx: 0, vz: 0, facing: 0, radius: RAIDER_RADIUS, pace: RAIDER_PACE,
    };
    let post = gate;
    let route: Waypoint[] = [];
    for (let far = 0; far < POST_TRIES; far += 1) {
      const spot = nearestReachable(land, reach, {
        x: gate.x + Math.cos(angle) * (spread + far),
        z: gate.z + Math.sin(angle) * (spread + far),
      }, 3);
      if (spot === null) continue;
      const found = pathTo(land, from, spot);
      if (found === null) continue;
      post = spot;
      route = found;
      break;
    }
    raiders.push({
      body,
      road,
      post,
      phase: 'coming',
      route,
      deadline: deadlineFor(from, post, step),
      standingUntil: 0,
      forced: false,
    });
  }
  return raiders;
}


/**
 * El plazo de un tramo, **a partir de lo que hay que andar** y no de cuántos
 * puntos tiene la ruta.
 *
 * Costó una medida: con `route.length * 30` el plazo salía de unos trece
 * segundos escénicos para tramos de veinte celdas, que a paso de saqueador son
 * catorce — así que **102 de 120 cuerpos** acababan la visita por vencimiento en
 * vez de por llegar. Un punto de ruta no dice cuánto se anda; la distancia sí.
 * El doble de lo que se tarda en línea recta, más el margen, cubre rodeos.
 */
function deadlineFor(from: Point, to: Point, step: number): number {
  const far = Math.hypot(to.x - from.x, to.z - from.z);
  const seconds = (far / RAIDER_PACE) * 2;
  return step + Math.round(seconds / LIFE_STEP) + DEADLINE_SLACK;
}

/**
 * Un paso de la partida. Tres tramos y siempre acaba: llegar, plantarse,
 * volverse. Nunca es una intención que se repite para siempre (E.7).
 */
export function stepRaider(
  raider: Raider, land: Terrain, seed: number, step: number,
): void {
  if (raider.phase === 'gone') return;
  const { body } = raider;

  if (raider.phase === 'standing') {
    body.vx = 0;
    body.vz = 0;
    integrate(body, land, LIFE_STEP);
    if (step < raider.standingUntil) return;
    raider.phase = 'leaving';
    raider.route = pathTo(land, { x: body.x, z: body.z }, raider.road) ?? [];
    raider.deadline = deadlineFor({ x: body.x, z: body.z }, raider.road, step);
    return;
  }

  const goal = raider.phase === 'coming' ? raider.post : raider.road;
  const gap = Math.hypot(goal.x - body.x, goal.z - body.z);
  const arrived = gap < 0.6;
  const late = step > raider.deadline;
  if (arrived || late) {
    if (late) raider.forced = true;
    if (raider.phase === 'coming') {
      raider.phase = 'standing';
      const span = STAND_STEPS[1] - STAND_STEPS[0];
      raider.standingUntil = step + STAND_STEPS[0]
        + Math.round((hash32(seed, `raider:${body.id}:stand`) / 0xffffffff) * span);
    } else {
      raider.phase = 'gone';
    }
    body.vx = 0;
    body.vz = 0;
    return;
  }

  // El siguiente punto de la ruta, y andar hacia él. La velocidad es la de
  // alguien que viene a lo que viene: algo más viva que un vecino paseando.
  const next = raider.route[0];
  const to = next === undefined ? goal : { x: next.x, z: next.z };
  if (next !== undefined && Math.hypot(to.x - body.x, to.z - body.z) < 0.5) raider.route.shift();
  const step2 = Math.hypot(to.x - body.x, to.z - body.z) || 1;
  body.vx = ((to.x - body.x) / step2) * RAIDER_PACE;
  body.vz = ((to.z - body.z) / step2) * RAIDER_PACE;
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  // **Y andan de verdad.** Sin esto sólo se les ponía una velocidad que nadie
  // aplicaba: medido en diez semillas, los ciento veinte cuerpos se quedaban
  // donde nacían y la visita entera se resolvía por vencimiento de plazo
  // —«forzados 120 de 120»—, que es exactamente el defecto que IA-5 documentó
  // con el lobo. `integrate` es el mismo barrido con el que anda cualquiera en
  // esta capa, y el que impide que una velocidad alta atraviese una pared.
  integrate(body, land, LIFE_STEP);
}

/**
 * Lo que anda un saqueador, en celdas por segundo escénico.
 *
 * TUNE: 1,4. Un vecino de este valle anda a 1,1 (`body.ts`), y quien baja a
 * robar no pasea: la diferencia se nota de lejos y es lo que hace que un grupo
 * acercándose se lea como una amenaza y no como una visita.
 */
const RAIDER_PACE = 1.4;

/**
 * El radio de un saqueador y el hueco de identificadores que usa.
 *
 * El radio es el mismo que el de un vecino (`body.ts`): la misma gente, del
 * valle de al lado. Los identificadores van **en negativo y lejos**, como ya
 * hace esta capa con el lobo y con los trastos, para que nunca se crucen con
 * un `VillagerId` de verdad — que es de quien el renderer saca la cara.
 */
const RAIDER_RADIUS = 0.32;

/** Cuántas plazas se prueban alrededor de la puerta antes de rendirse. */
const POST_TRIES = 6;
const RAIDER_ID_BASE = 9000;

/** Si queda alguien de la partida en el valle. */
export function raidersHere(raiders: readonly Raider[]): boolean {
  return raiders.some((r) => r.phase !== 'gone');
}

/** Para que quien dibuje sepa dónde están, sin conocer este módulo por dentro. */
export function raiderSpots(raiders: readonly Raider[]): { id: number; at: Point }[] {
  return raiders
    .filter((r) => r.phase !== 'gone')
    .map((r) => ({ id: r.body.id, at: { x: r.body.x, z: r.body.z } }));
}

