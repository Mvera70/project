// D3 · La partida del valle vecino, con cuerpo. design.md §1b, fase 4.
//
// **El hecho ya existe en el motor y no se ve.** Desde B1, un clan baja de la
// ladera de al lado, se lleva plata, grano y una cabeza, y la aldea lo encaja o
// se prepara (B2). Todo eso pasaba **sin que apareciera nadie**: una línea de
// crónica y las cifras cambiadas. Era lo primero de la lista de
// `docs/encargos-3d.md` —«lo que pasa y no se ve»— y es lo que esta ronda
// arregla: la semana que llegan, se ven llegar.
//
// **Y desde D3b/D5 hay dos visitas distintas, porque el motor las distingue.**
// Un **saqueo** es lo de la primera mitad: llegan, se plantan ante el portón, se
// llevan lo que el motor ya decidió y se van. Un **asalto** —el que el motor
// marca cuando la partida cuadruplica lo que el valle pone contra ella (B3)— va
// a por la puerta: la rompen a golpes y entran. Y eso **sí** tiene consecuencia,
// porque B4 abrió la puerta para ella: si el portón cede, el parte de la batalla
// dice `breached` y la partida se acaba.
//
// No es una excepción a E.8 («no conviertas una conducta visual en consecuencia
// mecánica»): la conducta no escribe en el motor. Cuenta lo que pasó y el motor
// lo lee como dato por donde entra lo que hace el jugador (§1b). La diferencia
// es que ahora hay una carrera de verdad —los golpes contra las flechas— y lo
// que salga de ella es lo que pasa.
//
// Lo que sigue sin hacer: pelear cuerpo a cuerpo con quien defiende (D4, que
// necesita los clips de E1) y quemar lo que hay dentro (E4, decisión del dueño).
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

/**
 * En qué anda la partida ahora mismo.
 *
 * **`down` lo trae D2**, y es la primera vez que algo de esta capa le pasa a
 * alguien en vez de decidirlo el motor: a quien le entra una flecha se le acaba
 * la visita ahí. Es un estado terminal como `gone`, pero **se sigue dibujando**:
 * un cuerpo en el suelo es la marca de que la muralla sirvió de algo.
 *
 * **`breaking` e `inside` los trae D3b/D5**, y sólo salen en un asalto: golpear
 * el portón hasta que cede, y pasar por el boquete. `inside` es terminal en la
 * jornada —lo que hacen dentro es D4 y D6— y lo que importa de él es que
 * existió: es lo que el parte de B4 llama `breached`.
 */
export type RaiderPhase = 'coming' | 'standing' | 'breaking' | 'inside' | 'leaving' | 'gone' | 'down';

export interface Raider {
  readonly body: Body;
  /** Por dónde entró al valle, y por dónde se irá. */
  readonly road: Point;
  /** El sitio ante el portón que le toca a éste. */
  readonly post: Point;
  /**
   * D3b · Y adónde va si el portón cede: el corazón del pueblo.
   *
   * Se calcula al montar la partida y no al entrar, por la misma razón que el
   * puesto: lo que hay que comprobar es que **se puede llegar**, y eso se hace
   * una vez (`pathTo` pide anchura y la inundación no).
   */
  readonly inside: Point;
  phase: RaiderPhase;
  route: Waypoint[];
  /** Paso a partir del cual el tramo se da por hecho aunque no haya llegado. */
  deadline: number;
  /** Paso hasta el que se queda plantado antes de dar media vuelta. */
  standingUntil: number;
  /** Si algún tope tuvo que cortarle el viaje en vez de terminarlo andando. */
  forced: boolean;
  /**
   * D2/D4 · Los golpes que lleva encima, de flecha o de mano.
   *
   * **Una flecha basta y un golpe de mano no**, y las dos cosas usan este mismo
   * contador: la arquería lo sube y le acaba la visita en el acto (una flecha en
   * el pecho), y el cuerpo a cuerpo necesita tres. No es una incoherencia, es la
   * diferencia entre las dos armas dicha con un solo número.
   *
   * Se cuenta y no se usa para nada más: **lo que un asalto le costó al clan es
   * un dato que B4 mete en el motor** por la puerta de `PlayerAct`, y hasta
   * entonces vive aquí, que es donde pasó.
   */
  hits: number;
  /**
   * D3b · Si éste **pasó por el portón**.
   *
   * Y es lo que el parte de B4 mira, no que la puerta haya caído: medido en la
   * semilla 7, el portón cedía a los veinte segundos con **los doce ya en el
   * suelo**, o sea que el valle se perdía sin que entrara nadie. Una puerta
   * rota no es un valle tomado; un hombre dentro, sí.
   */
  entered: boolean;
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

/**
 * A qué distancia del portón se paran, en celdas.
 *
 * Dos y media si vienen a mirar el cerco y llevarse lo de fuera (un saqueo,
 * D3), y **una y poco si vienen a tirar la puerta** (un asalto, D3b): a esa
 * distancia el brazo llega (`BLOW_REACH`), y los que no quepan en la primera
 * fila esperan detrás, que es lo que pasa cuando doce hombres quieren golpear
 * la misma hoja.
 */
const STAND_OFF = 2.5;
const ASSAULT_OFF = 1.1;

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

/**
 * D3b · **Si lo de hoy es un asalto y no un saqueo.**
 *
 * Lo dice el motor y no esta capa: `flags['assault']` es la marca que
 * `advanceThreat` pone la semana en que llegan cuando la partida da para tomar
 * el valle (B3), y que resuelve la semana siguiente con el parte de la pelea
 * (B4). Leerla es leer el hecho, que es lo que esta capa hace con todo.
 */
export function assaultToday(state: GameState): boolean {
  return raidToday(state) > 0 && state.flags['assault'] !== undefined;
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
  /** D3b · si vienen a tirar la puerta, se paran al alcance del brazo. */
  assault = false,
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
    const spread = (assault ? ASSAULT_OFF : STAND_OFF)
      + (hash32(seed, `raider:${n}:far`) / 0xffffffff) * (assault ? 0.6 : 1.5);
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
    // **El sitio se busca desde la puerta hacia fuera, anillo a anillo**, y con
    // una búsqueda de una celda y no de tres. Con tres, y viniendo a un asalto
    // —donde el punto pedido cae **dentro** del cerco—, `nearestReachable`
    // devolvía a los doce **la misma celda**, a 5,8 celdas de la puerta: ni se
    // repartían ni llegaban a golpear. Medido en cuatro semillas: cero golpes.
    for (let far = 0; far < POST_TRIES; far += 1) {
      const radius = spread + far * (assault ? 0.7 : 1);
      const spot = nearestReachable(land, reach, {
        x: gate.x + Math.cos(angle) * radius,
        z: gate.z + Math.sin(angle) * radius,
      }, assault ? 1 : 3);
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
      inside: heart,
      phase: 'coming',
      route,
      deadline: deadlineFor(from, post, step),
      standingUntil: 0,
      forced: false,
      hits: 0,
      entered: false,
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
 * Un paso de la partida. Siempre acaba: nunca es una intención que se repite
 * para siempre (E.7).
 *
 * Cuatro caminos, y el motor decide cuál: un **saqueo** llega, se planta y se
 * vuelve; un **asalto** llega, golpea el portón y entra por él. Los dos pueden
 * acabar en el suelo si a uno le entra una flecha (D2).
 *
 * `gate` sólo se pasa en un asalto, y es lo que convierte plantarse en golpear.
 */
export function stepRaider(
  raider: Raider, land: Terrain, seed: number, step: number, gate?: Gate,
): void {
  if (raider.phase === 'gone') return;
  // D2 · el que ha caído no anda. Se queda donde le dio la flecha.
  if (raider.phase === 'down') {
    raider.body.vx = 0;
    raider.body.vz = 0;
    return;
  }
  const { body } = raider;

  // D3b · **golpeando el portón.** Se queda donde está y pega; cada golpe es
  // uno de los sesenta que la puerta aguanta, así que cuantos menos queden en
  // pie, más tarda en caer. Es la carrera contra las flechas de D2.
  if (raider.phase === 'breaking') {
    if (gate === undefined) { raider.phase = 'standing'; return; }
    if (gate.brokeAt === null) {
      const gap = Math.hypot(gate.at.x - body.x, gate.at.z - body.z);
      // **Se empuja contra la puerta, no se golpea desde el puesto**, y esto lo
      // enseñó una toma del navegador: los cinco que llegaban se plantaban
      // donde su puesto dijera y la puerta recibía **cero golpes** en cuarenta
      // segundos, porque el suelo pisable de la cara de fuera queda a más de un
      // brazo de la hoja. El terreno del juego no es el de la prueba —el
      // renderer cierra las celdas con las mallas de verdad—, así que un número
      // de alcance nunca va a valer para las dos: lo que vale es andar hacia
      // ella. `integrate` los para contra la puerta, que está cerrada para un
      // cuerpo, y lo que se ve es un grupo apretándose contra la hoja.
      if (gap > BLOW_REACH * 0.6) {
        const step2 = gap || 1;
        body.vx = ((gate.at.x - body.x) / step2) * RAIDER_PACE;
        body.vz = ((gate.at.z - body.z) / step2) * RAIDER_PACE;
        turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
      } else {
        body.vx = 0;
        body.vz = 0;
      }
      integrate(body, land, LIFE_STEP);
      if (step % BLOW_STEPS === 0
        && Math.hypot(gate.at.x - body.x, gate.at.z - body.z) <= BLOW_REACH) {
        gate.hits += 1;
        if (gate.hits >= GATE_BLOWS) gate.brokeAt = step;
      }
      return;
    }
    body.vx = 0;
    body.vz = 0;
    integrate(body, land, LIFE_STEP);
    // Ha cedido: se entra por él. El destino es el corazón del pueblo, que es
    // adonde va quien entra a un sitio a llevarse lo que hay.
    raider.phase = 'inside';
    raider.entered = true;
    raider.route = pathTo(land, { x: body.x, z: body.z }, raider.inside) ?? [];
    raider.deadline = deadlineFor({ x: body.x, z: body.z }, raider.inside, step);
    return;
  }

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

  const goal = raider.phase === 'coming' ? raider.post
    : raider.phase === 'inside' ? raider.inside : raider.road;
  const gap = Math.hypot(goal.x - body.x, goal.z - body.z);
  const arrived = gap < 0.6;
  const late = step > raider.deadline;
  if (arrived || late) {
    if (late) raider.forced = true;
    if (raider.phase === 'coming') {
      // D3b · **el que viene a un asalto no se planta: golpea.** Y el que viene
      // a un saqueo se queda mirando el cerco, que es lo de D3.
      if (gate !== undefined) {
        raider.phase = 'breaking';
      } else {
        raider.phase = 'standing';
        const span = STAND_STEPS[1] - STAND_STEPS[0];
        raider.standingUntil = step + STAND_STEPS[0]
          + Math.round((hash32(seed, `raider:${body.id}:stand`) / 0xffffffff) * span);
      }
    } else if (raider.phase === 'inside') {
      // Dentro. Lo que hacen aquí es D4 y D6; lo que importa de esta jornada es
      // que entraron, y eso ya está dicho.
      raider.phase = 'gone';
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

/**
 * D5 · **El portón, como cosa que se rompe.** design.md §1b, fase 4.
 *
 * Vive en la jornada y no en el motor a propósito: lo que aguanta una puerta
 * mientras doce hombres la golpean es la clase de cosa que §1b manda resolver
 * en físico. Si cede, lo dice el parte (B4) y entonces sí lo sabe el motor.
 */
export interface Gate {
  /** Dónde está, para que los golpes y las jambas caigan en el mismo sitio. */
  readonly at: Point;
  /** Los golpes que lleva encima. */
  hits: number;
  /** Si ya ha cedido, y en qué paso: la escena lo usa para abrir el boquete. */
  brokeAt: number | null;
}

/**
 * Lo que aguanta el portón, en golpes, y lo que tarda un hombre en dar uno.
 *
 * TUNE: sesenta golpes, uno por hombre y por segundo. Esos dos números son **la
 * carrera** de la fase 4, y por eso están elegidos con la arquería de D2 medida
 * en la mano: cinco arqueros sueltan una flecha cada 2,1 s y aciertan más de la
 * mitad, o sea que tumban del orden de **uno y medio por segundo**. Con sesenta
 * golpes, doce hombres tiran la puerta en cinco segundos y tres tardan veinte:
 * así el asalto grande entra y el que llega mermado se queda fuera, que es
 * exactamente lo que se quiere que decida la pelea y no una tabla.
 *
 * Y son golpes y no segundos porque lo que rompe una puerta son las manos que
 * la golpean: matar a la mitad de la partida dobla lo que tarda en caer.
 */
const GATE_BLOWS = 60;
const BLOW_STEPS = 30;

/**
 * A qué distancia del portón cuenta un golpe, en celdas.
 *
 * TUNE: 2,6, o sea ocho metros, y **no es el alcance de un brazo**: es el del
 * grupo que se apretuja contra una puerta. Medido con el primer número (1,6,
 * un brazo y su arma): la cara de fuera de un portón son una o dos celdas
 * pisables, así que sólo los dos de delante llegaban y sesenta golpes tardaban
 * medio minuto en caer — con las flechas de D2 volando, la puerta no cedía
 * nunca en ninguna semilla. Con 2,6 empujan los seis de delante, que es lo que
 * se ve en cualquier asalto pintado de la historia.
 */
const BLOW_REACH = 2.6;

/** Cuántas plazas se prueban alrededor de la puerta antes de rendirse. */
const POST_TRIES = 6;
const RAIDER_ID_BASE = 9000;

/**
 * D3b · Si alguien de la partida pasó por el portón **y sigue en pie**.
 *
 * Las dos mitades hacen falta, y la segunda la enseñó una medida: en la semilla
 * 7 el portón cedía a los veinte segundos y cuatro hombres entraban, **y los
 * doce acababan en el suelo** con las flechas de los siete puestos. Un valle en
 * el que no queda un solo enemigo vivo no es un valle tomado, por muy roto que
 * esté el portón: contar sólo «entró alguien» perdía partidas que la muralla
 * había ganado.
 */
export function anyEntered(raiders: readonly Raider[]): boolean {
  return raiders.some((raider) => raider.entered && raider.phase !== 'down');
}

/** D5 · El portón de hoy, sin un golpe todavía. */
export function gateNow(state: GameState, heart: Point): Gate {
  return { at: gateOf(state, heart), hits: 0, brokeAt: null };
}

/**
 * Si queda alguien de la partida **en pie** en el valle.
 *
 * Los caídos (D2) no cuentan: siguen en pantalla pero la visita, para ellos, ya
 * acabó. Lo que esta pregunta contesta es si hay todavía algo que defender.
 */
export function raidersHere(raiders: readonly Raider[]): boolean {
  return raiders.some((r) => r.phase !== 'gone' && r.phase !== 'down');
}

/** Para que quien dibuje sepa dónde están, sin conocer este módulo por dentro. */
export function raiderSpots(raiders: readonly Raider[]): { id: number; at: Point }[] {
  return raiders
    .filter((r) => r.phase !== 'gone')
    .map((r) => ({ id: r.body.id, at: { x: r.body.x, z: r.body.z } }));
}

