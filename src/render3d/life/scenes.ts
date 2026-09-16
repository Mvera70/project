// V-07 · Escenas de dos. design.md Anexo E.
//
// **El corazón del encargo.** Dos que se cruzan pueden pararse a hablar,
// encararse, empujarse o pelear, con papeles distintos para cada uno. Es lo
// que hace que el tránsito se lea como vida y no como hormigas (E.6).
//
// Esto no inventó el mecanismo: lo portó del descarte de V-00, el banco que el
// dueño del diseño vio funcionar y midió (V-12 borró aquel código, y el informe
// de la ronda es lo que queda de él). Lo que cambia es de dónde sale
// el carácter — allí un cuerpo llevaba un `temper`/`sociable` fijo tirado a
// dados; aquí eso ya existe y se llama `needs.irritation` y `needs.company`
// (E.4: el carácter entra por la velocidad a la que suben los impulsos, así
// que un `hot_tempered` llega solo a `HOT_ENOUGH` sin que esta capa tenga que
// saber que es un `hot_tempered`) — y de que un rechazo también dibuja algo en
// pantalla, que el descarte no necesitaba porque allí un «no» era simplemente
// no crear ningún bout.
//
// **Ninguna oferta —y una escena es una oferta espontánea— conoce a nadie por
// nombre** (E.4): todo lo de aquí se decide por rasgos, impulsos y opinión, y
// el azar sale de `hash32(seed, ...)`, nunca de `Math.random` ni del reloj.

import type { Trait } from '@engine/state';
import { hash32 } from '@engine/rng';
import { drive } from './steering';
import { blockedAt, turnTo, type Body, type Point, type Terrain } from './body';
import { clearBetween } from './navigate';
import { LIFE_STEP } from './clock';
import type { Dweller } from './village';

export type SceneKind = 'chat' | 'shove' | 'brawl';

/** Dos personas, algo entre ellas, y un papel distinto para cada una. */
export interface Scene {
  readonly kind: SceneKind;
  readonly a: number; readonly b: number; // ids de cuerpo
  roleA: 'gives' | 'takes' | 'peer';
  roleB: 'gives' | 'takes' | 'peer';
  readonly since: number; // paso
  until: number; // paso
  /** En qué compás va la escena. Informativo: nada de la lógica lo necesita
   *  leer, todo se recalcula de `since` y `step`, porque eso es lo que permite
   *  reconstruir una escena a medias sin haber guardado nada (E.3.4). */
  beat: number;
}

// ---------------------------------------------------------------------------
// Lo que se porta de `spike/life.ts`, tal cual, con su comentario de origen.
// ---------------------------------------------------------------------------

/** A qué distancia se oye a alguien y se le puede parar. Ported de spike. */
const EARSHOT = 1.9;
/** A qué distancia se ponen dos que hablan. Ported de spike (`CHAT_GAP`). */
const CHAT_GAP = 0.95;
/** Lo que dura una charla aceptada, en segundos escénicos. Ported (`CHAT`). */
const CHAT_SPAN = [3, 9] as const;
/** Lo que se tarda en volver a tener ganas de parar con alguien. Ported (`COOLDOWN`). */
const COOLDOWN = 14;
/** A qué distancia se planta uno para empujar. Ported de spike (`SHOVE_GAP`). */
const SHOVE_GAP = 0.72;
/** El instante de tensión antes de soltarlo. Ported de spike (`WIND_UP`). */
const WIND_UP = 0.7;
/** Lo que dura el encontronazo entero, empujón y recomposición incluidos.
 *  Ported de spike (`BOUT`). */
const BOUT = 3.4;
/** La fuerza del empujón, en celdas por segundo. Ported de spike
 *  (`SHOVE_PUSH`): a treinta pasos por segundo son menos de diez centésimas
 *  de celda por paso, así que el trastabilleo se integra y no teletransporta. */
const SHOVE_PUSH = 2.8;
/** Lo que se tarda en recomponerse tras recibirlo. Ported de spike (`REEL`). */
const REEL = 0.75;
/** A partir de qué genio salta uno. Ported de spike (`HOT_ENOUGH`). */
const HOT_ENOUGH = 0.62;
/** Cuánto salta el que pasa de ahí, por encuentro. Ported de spike (`SHOVE_ODDS`). */
const SHOVE_ODDS = 0.22;
/** Lo que decae la velocidad de quien trastabilla, por paso. Ported de spike
 *  (`body.vx *= 0.94` en la rama de `reelUntil`). */
const REEL_DRAG = 0.94;
/** Cuánto más decidido se acerca el que va a empujar que el que charla.
 *  Ported de spike (`urge = body.bout === 'shove' ? 1.7 : 1`). */
const SHOVE_URGE = 1.7;
const CHAT_URGE = 1;
/** El umbral de las ganas de charlar. Ported de spike (`dice > willing * 0.35`). */
const CHAT_WILLING = 0.35;

/**
 * Cuánto por encima de las ganas sigue contando como «casi».
 *
 * TUNE: la mitad. Es lo que hace que el rechazo sea una escena rara al lado de
 * la charla en vez de la escena corriente: por construcción salen del orden de
 * un rechazo por cada dos charlas, y no dos o tres por cada una.
 */
const NEAR_MISS = 0.5;
/** Cuánto pesa el genio de quien recibe el empujón a la hora de devolverlo.
 *  Ported de spike (`back < partner.temper * 0.8`). */
const RETALIATE_AT = 0.8;

/**
 * Lo que dura un rechazo: apartar la vista y seguir.
 *
 * TUNE: 0,4 a 0,9 s. No sale de spike —allí un «no» no dejaba rastro, y aquí
 * la regla de V-07 pide que sí— así que se ha elegido corto a propósito:
 * bastante para leerse en pantalla como un cruce de miradas, no tanto que se
 * confunda con una charla de verdad.
 */
const REJECT_SPAN = [0.4, 0.9] as const;

/** Pasos escénicos que caben en estos segundos, con el paso fijo de la vida. */
function stepsOf(seconds: number): number {
  return Math.max(1, Math.round(seconds / LIFE_STEP));
}

const WIND_UP_STEPS = stepsOf(WIND_UP);
const REEL_STEPS = stepsOf(REEL);

// ---------------------------------------------------------------------------
// El carácter, leído de lo que ya existe — nunca un campo nuevo por persona.
// ---------------------------------------------------------------------------

/**
 * Cuánto empuja un rasgo hacia pararse a hablar.
 *
 * Los mismos números que `decide.ts` usa para el corro de cotilleo
 * (`LEANING.gossip`): es la misma gana, aquí espontánea en vez de ir a
 * buscarla a la era.
 */
const TALK_LEAN: Partial<Record<Trait, number>> = {
  kind: 1.5,
  generous: 1.6,
  secretive: 0.3,
  spiteful: 0.6,
  proud: 0.7,
};

function talkLean(traits: readonly Trait[]): number {
  let lean = 1;
  for (const trait of traits) {
    const bias = TALK_LEAN[trait];
    if (bias !== undefined) lean *= bias;
  }
  return lean;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Cuánto le apetece a éste pararse a hablar ahora mismo.
 *
 * Spike tiraba un dado fijo por cuerpo (`sociable`, uniforme 0..1, promedio
 * 0,5) para toda la jornada; aquí no hay ese rasgo, así que se parte de la
 * misma base —0,5— y las ganas de compañía (`needs.company`) la mueven para
 * un lado o el otro, no la sustituyen entera: medido, `company` pasa la mayor
 * parte del día bajo, porque en una aldea apretada casi siempre hay alguien
 * cerca y eso ya lo calma (`needs.ts`, `withOthers`). Sustituir la base por
 * `company` a secas dejaba a casi todo el mundo sin ganas nunca —medido, un
 * aldeano hablando por cada doscientos rechazos— que es justo lo que la regla
 * séptima de E.3 llama «es el modelo, no el número».
 */
function willing(who: Dweller): number {
  const base = 0.5 + (who.needs.company - 0.3) * 0.6;
  return clamp01(base * talkLean(who.traits));
}

function roll(seed: number, key: string): number {
  return hash32(seed, key) / 4_294_967_296;
}

// ---------------------------------------------------------------------------
// Proponer
// ---------------------------------------------------------------------------

/**
 * Si estos dos, al cruzarse, tienen algo. Determinista con `seed` y `step`.
 *
 * **Ninguna escena conoce a nadie por nombre**: sólo mira rasgos, impulsos y
 * `opinion`, nunca compara contra un `VillagerId` concreto. `opinion` llega ya
 * calculada por quien llama (`village.ts`, con `opinionOf` del motor, sólo
 * lectura) porque esta función no toca `GameState`.
 *
 * **Con umbral, no proporcional**: un intento anterior con probabilidad
 * proporcional al genio daba diez a diecisiete encontronazos por jornada —una
 * taberna, no una aldea. Sólo salta quien tiene mal genio de verdad
 * (`HOT_ENOUGH`), y una aldea sin gente de ese temple no empuja a nadie en
 * todo el día. `needs.irritation` es el `temper` de spike, pero vivo: ya sube
 * más deprisa en quien es `hot_tempered` (E.4, `needs.ts`), así que el
 * carácter entra sin que esta función necesite saber de rasgos para eso.
 */
export function propose(
  a: Dweller, b: Dweller, opinion: number, seed: number, step: number,
): Scene | null {
  const hot = a.needs.irritation >= b.needs.irritation ? a : b;
  const cold = hot === a ? b : a;
  const key = `${a.body.id}:${b.body.id}:${step}`;

  const spark = roll(seed, `spark:${key}`);
  const angry = hot.needs.irritation > HOT_ENOUGH
    && spark < (hot.needs.irritation - HOT_ENOUGH) * SHOVE_ODDS;

  if (angry) {
    // **¿Se devuelve el empujón?** Se decide aquí y no al soltarlo, porque
    // `kind` no cambia una vez nacida la escena (E.3.5: misma jornada, mismas
    // decisiones, sin campos ocultos que la propia escena no pueda reconstruir
    // de `since`). Una `brawl` es exactamente eso: un empujón devuelto una
    // vez. «Se devuelve una vez, no se monta una trifulca» — nunca hay una
    // tercera vez, y si esto tuviera que llegar a más, lo diría el motor
    // (V-11), no esta capa.
    const back = roll(seed, `back:${key}`);
    const brawl = back < cold.needs.irritation * RETALIATE_AT;
    const giverIsA = hot === a;
    const span = stepsOf(brawl ? BOUT + WIND_UP + REEL : BOUT);
    return {
      kind: brawl ? 'brawl' : 'shove',
      a: a.body.id,
      b: b.body.id,
      roleA: giverIsA ? 'gives' : 'takes',
      roleB: giverIsA ? 'takes' : 'gives',
      since: step,
      until: step + span,
      beat: 0,
    };
  }

  // Ni chispa: ¿les apetece pararse? `opinion` corre −100..100 (§6.4) y aquí
  // se lee como medio punto de más o de menos ganas por cada cien.
  const social = clamp01((willing(a) + willing(b)) / 2 + opinion / 200);
  const dice = roll(seed, `chat:${key}`);
  const want = social * CHAT_WILLING;

  // **Un rechazo es un casi, no todo lo que no es un sí.** Por debajo de
  // `want`, hablan. Justo por encima —un margen corto— es el rechazo: tenían
  // ganas y no llegaron, que es lo que se lee como apartar la vista y seguir.
  // Más arriba no pasa nada, y ésa es la respuesta corriente: dos que se cruzan
  // sin mirarse no son una escena, son dos que andaban por ahí.
  //
  // La primera versión de V-07 hacía del rechazo **toda** la banda entre las
  // ganas y `CHAT_WILLING`, y como las ganas rondan 0,38, eso era casi dos
  // tercios de la ventana. Medido en tres semillas: de 2,0 a 3,0 rechazos por
  // cada charla, y a esa proporción la aldea se lee como un sitio donde todo el
  // mundo desaira a todo el mundo — que es justo lo que ese segundo corte venía
  // a evitar, resuelto a medias. El descarte que gustó no tenía ni un rechazo;
  // la respuesta no es volver a cero —un «no» invisible fue lo que se quiso
  // arreglar— sino que sea raro al lado de las charlas.
  if (dice >= want * (1 + NEAR_MISS)) return null;

  if (dice >= want) {
    // **Un rechazo también es una escena**: apartar la vista y seguir. Quien
    // más ganas tenía es quien propuso; el otro se la queda y sigue su
    // camino, y por eso los papeles no son iguales aunque los dos acaben sin
    // hablar.
    const proposerIsA = willing(a) >= willing(b);
    const span = stepsOf(REJECT_SPAN[0]
      + roll(seed, `reject:${key}`) * (REJECT_SPAN[1] - REJECT_SPAN[0]));
    return {
      kind: 'chat',
      a: a.body.id,
      b: b.body.id,
      roleA: proposerIsA ? 'gives' : 'takes',
      roleB: proposerIsA ? 'takes' : 'gives',
      since: step,
      until: step + span,
      beat: 0,
    };
  }

  const span = stepsOf(CHAT_SPAN[0]
    + roll(seed, `span:${key}`) * (CHAT_SPAN[1] - CHAT_SPAN[0]));
  return {
    kind: 'chat',
    a: a.body.id,
    b: b.body.id,
    roleA: 'peer',
    roleB: 'peer',
    since: step,
    until: step + span,
    beat: 0,
  };
}

// ---------------------------------------------------------------------------
// Vivirla
// ---------------------------------------------------------------------------

/**
 * Se coloca a la distancia que toque, sin congelarse donde le pillara.
 *
 * **Da velocidad, no posición**: `drive` sólo suaviza `vx`/`vz` hacia lo que
 * se quiere, y es `village.ts` quien la integra con el mismo `integrate` de
 * `body.ts` que usa todo el mundo. Es la trampa de esta fase (E.7 y E.8): la
 * primera versión del descarte dejaba a los que hablaban quietos donde les
 * pillara y quedaban metidos el uno en el otro.
 *
 * **Nunca más cerca que dos radios**, aunque el hueco pedido sea menor —no lo
 * es, `SHOVE_GAP` y `CHAT_GAP` son mayores que dos radios— porque `drive` no
 * frena en seco: el acercamiento decidido de un encaro (`SHOVE_URGE`) puede
 * pasarse de largo el instante antes de que el cálculo del paso siguiente
 * empiece a frenar. Medido sin este suelo: dos que se encaraban llegaban a
 * 0,517 celdas, por debajo de los dos radios (0,64) — el mismo apiñamiento
 * que `separate()` (`steering.ts`) evita para el resto de la aldea, pero aquí
 * no se puede usar esa función tal cual: su holgura (`ELBOW`) empujaría a los
 * dos antes incluso de llegar a `SHOVE_GAP`.
 */
function position(body: Body, partner: Body, gapWant: number, urge: number): void {
  const away = Math.hypot(partner.x - body.x, partner.z - body.z);
  if (away < 1e-6) { drive(body, { x: 0, z: 0 }); return; }
  const floor = body.radius + partner.radius;
  if (away < floor) {
    const push = (floor - away) / floor;
    drive(body, {
      x: (body.x - partner.x) / away * push * body.pace * urge,
      z: (body.z - partner.z) / away * push * body.pace * urge,
    });
    return;
  }
  const off = (away - gapWant) / Math.max(gapWant, away);
  drive(body, {
    x: (partner.x - body.x) / away * off * body.pace * urge,
    z: (partner.z - body.z) / away * off * body.pace * urge,
  });
}

/** Mira a quien le habla, sin tirón: el mismo `turnTo` de todo el mundo. */
function face(body: Body, partner: Body): void {
  turnTo(body, Math.atan2(partner.x - body.x, partner.z - body.z), LIFE_STEP);
}

/** Trastabillando: las piernas no obedecen, sólo se deja correr y frenar. */
function reel(body: Body): void {
  body.vx *= REEL_DRAG;
  body.vz *= REEL_DRAG;
}

/**
 * Suelta el empujón: **velocidad, nunca posición.** `village.ts` es quien la
 * integra, así que esto nunca escribe `x`/`z`.
 */
function shove(giver: Body, taker: Body): void {
  const away = Math.max(1e-6, Math.hypot(taker.x - giver.x, taker.z - giver.z));
  taker.vx = (taker.x - giver.x) / away * SHOVE_PUSH;
  taker.vz = (taker.z - giver.z) / away * SHOVE_PUSH;
}

/**
 * Lo que le toca a un cuerpo en su propio empujón: colocarse mientras espera
 * su turno, trastabillar justo después de recibirlo, y quedarse quieto —ni lo
 * uno ni lo otro— en el paso exacto en que la velocidad ya viene puesta.
 */
function shoveTick(body: Body, partner: Body, hit: number, step: number): void {
  if (step === hit) return;
  if (step > hit && step < hit + REEL_STEPS) { reel(body); return; }
  position(body, partner, SHOVE_GAP, SHOVE_URGE);
  face(body, partner);
}

/**
 * Un paso de la escena: coloca, empuja, hace trastabillar, termina.
 *
 * `a` y `b` deben corresponder a `scene.a` y `scene.b`, en ese orden — es
 * `village.ts` quien los busca por id, porque esta función no sabe nada de
 * quién es cada uno más allá de eso.
 */
export function play(scene: Scene, a: Dweller, b: Dweller, step: number): void {
  if (scene.kind === 'chat') {
    position(a.body, b.body, CHAT_GAP, CHAT_URGE);
    position(b.body, a.body, CHAT_GAP, CHAT_URGE);
    face(a.body, b.body);
    face(b.body, a.body);
    scene.beat = 1;
    return;
  }

  const giver = scene.roleA === 'gives' ? a : b;
  const taker = giver === a ? b : a;
  const hit = scene.since + WIND_UP_STEPS;
  const counter = hit + REEL_STEPS + WIND_UP_STEPS;
  const takerBusy = scene.kind === 'brawl' && step === counter;

  if (!takerBusy) shoveTick(taker.body, giver.body, hit, step);
  if (step === hit) shove(giver.body, taker.body);

  if (scene.kind === 'brawl') {
    shoveTick(giver.body, taker.body, counter, step);
    if (step === counter) shove(taker.body, giver.body);
  } else if (step !== hit) {
    position(giver.body, taker.body, SHOVE_GAP, SHOVE_URGE);
    face(giver.body, taker.body);
  }

  scene.beat = step < hit ? 0
    : step < hit + REEL_STEPS ? 1
    : scene.kind !== 'brawl' || step < counter ? 2
    : step < counter + REEL_STEPS ? 3 : 4;
}

/** Si la escena sigue en pie: nadie se ha muerto, nadie se ha ido. */
export function alive(scene: Scene, dwellers: readonly Dweller[]): boolean {
  let foundA = false;
  let foundB = false;
  for (const dweller of dwellers) {
    if (dweller.body.id === scene.a) foundA = true;
    else if (dweller.body.id === scene.b) foundB = true;
    if (foundA && foundB) return true;
  }
  return false;
}

/** A qué distancia dos que se cruzan pueden llegar a proponerse algo. */
export const SCENE_EARSHOT = EARSHOT;
/** Lo que se tarda en volver a tener ganas de parar con quien se acaba de
 *  separar de una escena. */
export const SCENE_COOLDOWN = COOLDOWN;

// ---------------------------------------------------------------------------
// IA-2 · Saludo de paso. docs/life-ai-proposal.md §7: «Mirada, gesto, siguen
// andando.» A diferencia de `chat`/`shove`/`brawl`, esto no para a nadie: es
// el gesto más ligero del catálogo, y por eso sólo se ofrece cuando `propose`
// ya ha mirado la pareja y no ha encontrado ni charla ni encontronazo
// (`village.ts`) — un saludo no compite con una charla de verdad, la
// completa para los cruces que no llegan a parar a nadie.
// ---------------------------------------------------------------------------

/**
 * A qué distancia dos que se cruzan **sin pararse** llegan a saludarse.
 *
 * TUNE: 1,6 celdas, por debajo de `SCENE_EARSHOT` (1,9): un saludo se ve, no
 * hace falta oírlo, y como no frena a nadie el margen puede ser más corto —da
 * tiempo de sobra a que el gesto se lea antes de que se crucen del todo.
 */
const GREET_RANGE = 1.6;

/** Cuánto dura el gesto de un saludo, en segundos escénicos.
 *
 * TUNE: 0,3 a 0,6 — un cruce de miradas, más corto que el rechazo más breve
 * de V-07 (`REJECT_SPAN`, 0,4 a 0,9) porque aquí ni siquiera se reduce el
 * paso: sólo gira la cara un instante.
 */
const GREET_SPAN = [0.3, 0.6] as const;

/**
 * Uno de cada cuántos cruces sin charla ni encontronazo se vuelve saludo.
 *
 * TUNE: uno de cinco. No hay medida de spike ni cifra del brief de la que
 * partir — es la primera y se corrige con la captura de esta ronda (IA-2,
 * §método obligatorio, punto 7): bastante para que se vea de vez en cuando,
 * poco para que sea el gesto por defecto de cualquier cruce y banalice el
 * gesto frente a una charla de verdad.
 */
const GREET_ODDS = 0.2;

/** Lo que se tarda en tener ganas de volver a saludar a quien se acaba de
 *  cruzar. Mismo criterio que `SCENE_COOLDOWN`. */
const GREET_COOLDOWN = 8;

/** Un saludo de paso, IA-2: sin roles — el gesto es el mismo para los dos. */
export interface Greeting {
  readonly a: number;
  readonly b: number;
  readonly since: number;
  readonly until: number;
}

/**
 * Si estos dos, cruzándose sin más, llegan a saludarse. Determinista con
 * `seed` y `step`, igual que `propose`.
 *
 * Se llama sólo cuando `propose` ya ha dicho que no hay charla ni
 * encontronazo (`village.ts`): el saludo es el gesto de reserva para un cruce
 * que si no, no dejaría nada en pantalla.
 */
export function proposeGreet(a: Dweller, b: Dweller, seed: number, step: number): Greeting | null {
  const apart = Math.hypot(b.body.x - a.body.x, b.body.z - a.body.z);
  if (apart > GREET_RANGE) return null;
  const key = `greet:${a.body.id}:${b.body.id}:${step}`;
  if (roll(seed, key) >= GREET_ODDS) return null;
  const span = stepsOf(GREET_SPAN[0] + roll(seed, `${key}:span`) * (GREET_SPAN[1] - GREET_SPAN[0]));
  return { a: a.body.id, b: b.body.id, since: step, until: step + span };
}

/**
 * El gesto de un saludo: mirar a quien se cruza, sin frenar ni desviarse.
 *
 * **Nunca toca velocidad ni posición** — «siguen andando» (§7): el `seek`/
 * `separate`/`avoid`/`drive`/`integrate` normal de `village.ts` sigue
 * corriendo igual que para cualquiera que no esté en nada; esto sólo
 * sobrescribe la cara al final del paso, después de que la marcha normal ya
 * la haya puesto mirando hacia donde se anda.
 */
export function playGreet(a: Dweller, b: Dweller): void {
  face(a.body, b.body);
  face(b.body, a.body);
}

/** A qué distancia se saludan dos que se cruzan de largo. */
export const GREET_REACH = GREET_RANGE;
/** Lo que se tarda en volver a tener ganas de saludar a quien se acaba de
 *  cruzar. */
export const GREET_COOLDOWN_SPAN = GREET_COOLDOWN;

// ---------------------------------------------------------------------------
// IA-2 · Cesión de paso. docs/life-ai-proposal.md §7: «Uno espera, otro pasa,
// primero continúa.» Es de las cosas que más se notan en pantalla, porque hoy
// dos que se cruzan en un hueco estrecho se empujan sin más (`separate`,
// `steering.ts`) en vez de leerse como dos personas que se ceden el paso.
// ---------------------------------------------------------------------------

/**
 * Qué tan ancho tiene que ser el hueco para que nadie tenga que ceder.
 *
 * TUNE: 1,2 celdas. `ROUTE_CLEARANCE` (`navigate.ts`) ya usa 0,4 —el radio de
 * una vaca, el cuerpo más ancho del valle— como margen de una ruta para uno
 * solo; el doble más un margen es lo que hace falta para que **dos** cuerpos
 * anchos se crucen sin rozarse.
 */
const YIELD_WIDE = 1.2;

/**
 * A qué distancia dos que van el uno hacia el otro se consideran un cruce.
 *
 * TUNE: 1,1 celdas, algo menos que `SCENE_EARSHOT` (1,9): un cruce en un
 * hueco estrecho se nota más cerca que una charla al aire libre, porque hay
 * menos sitio para verlo venir.
 */
const YIELD_RANGE = 1.1;

/**
 * Cuánto se aparta quien cede, en celdas.
 *
 * TUNE: 0,6. El radio de una vaca (0,4, `beasts.ts`) más un margen corto: de
 * sobra para dejar un pasillo libre sin salirse del hueco que se estaba
 * cruzando.
 */
const YIELD_ASIDE = 0.6;

/** Lo que dura el paso a un lado, en segundos escénicos. */
const YIELD_ACT_SPAN = [0.5, 0.9] as const;
/** La cola de recuperación tras el paso a un lado: nadie vuelve a intentar
 *  cederle el paso al mismo cruce en el mismo aliento. */
const YIELD_RECOVER_SPAN = [0.2, 0.35] as const;

/** Una cesión de paso, IA-2: papeles distintos — quien cede y quien pasa. */
export interface Yielding {
  readonly yielder: number;
  readonly passer: number;
  readonly since: number;
  /** Hasta cuándo dura el paso a un lado. Desde aquí a `until`, es sólo
   *  enfriamiento: nadie mueve nada a mano. */
  readonly actUntil: number;
  readonly until: number;
  /** A dónde se aparta. Nada si no había hueco al lado: entonces cede
   *  quedándose quieto donde está — «uno espera» es una cesión tan válida
   *  como «uno se aparta» (§7). */
  readonly aside: Point | null;
}

/**
 * Si estos dos van de frente por un hueco tan estrecho que uno tiene que
 * ceder. Determinista con `seed` y `step`.
 *
 * Tres condiciones, las tres necesarias: cerca, yendo el uno hacia el otro de
 * verdad (no sólo cerca por casualidad) y por un hueco que, en línea recta,
 * dos cuerpos anchos no se cruzarían sin rozarse — reutilizando `clearBetween`
 * (`navigate.ts`) con el radio de una vaca y con el doble, tal como `pathTo`
 * ya lo usa para las rutas.
 */
export function proposeYield(
  land: Terrain, a: Dweller, b: Dweller, seed: number, step: number,
): Yielding | null {
  const apart = Math.hypot(b.body.x - a.body.x, b.body.z - a.body.z);
  if (apart > YIELD_RANGE || apart < 1e-6) return null;

  const towardB = ((b.body.x - a.body.x) * a.body.vx + (b.body.z - a.body.z) * a.body.vz) / apart;
  const towardA = ((a.body.x - b.body.x) * b.body.vx + (a.body.z - b.body.z) * b.body.vz) / apart;
  if (towardB < 0.15 || towardA < 0.15) return null;

  // Ancho de sobra para uno, no para dos: si por el doble ya se pasa sin
  // rozar, esto no es un hueco estrecho y no hace falta que nadie ceda.
  if (clearBetween(land, a.body, b.body, YIELD_WIDE)) return null;
  // Y si ni por el hueco justo hay paso, esto no es un cruce: es que no hay
  // camino, y eso ya lo resuelve `pathTo` en otro sitio.
  if (!clearBetween(land, a.body, b.body, 0)) return null;

  const lowId = Math.min(a.body.id, b.body.id);
  const highId = Math.max(a.body.id, b.body.id);
  const key = `yield:${lowId}:${highId}:${step}`;
  const yielderIsA = roll(seed, key) < 0.5;
  const yielder = yielderIsA ? a : b;
  const passer = yielderIsA ? b : a;

  // Perpendicular a por dónde viene quien pasa, a un lado o al otro: el que
  // caiga libre. Si ninguno cae libre, cede quedándose quieto (`aside: null`).
  const dx = passer.body.x - yielder.body.x;
  const dz = passer.body.z - yielder.body.z;
  const along = Math.hypot(dx, dz) || 1;
  const sideX = -dz / along;
  const sideZ = dx / along;
  let aside: Point | null = null;
  for (const sign of [1, -1] as const) {
    const at = {
      x: yielder.body.x + sideX * YIELD_ASIDE * sign,
      z: yielder.body.z + sideZ * YIELD_ASIDE * sign,
    };
    if (at.x <= 0.5 || at.z <= 0.5 || at.x >= land.width - 0.5 || at.z >= land.height - 0.5) continue;
    if (blockedAt(land, at.x, at.z)) continue;
    aside = at;
    break;
  }

  const actSpan = stepsOf(YIELD_ACT_SPAN[0]
    + roll(seed, `${key}:act`) * (YIELD_ACT_SPAN[1] - YIELD_ACT_SPAN[0]));
  const recoverSpan = stepsOf(YIELD_RECOVER_SPAN[0]
    + roll(seed, `${key}:rec`) * (YIELD_RECOVER_SPAN[1] - YIELD_RECOVER_SPAN[0]));
  return {
    yielder: yielder.body.id,
    passer: passer.body.id,
    since: step,
    actUntil: step + actSpan,
    until: step + actSpan + recoverSpan,
    aside,
  };
}

/**
 * El paso a un lado de quien cede. Sólo se llama mientras `step < actUntil`;
 * pasado eso es la cola de recuperación, y ahí no se toca nada — el `seek`/
 * `separate`/`avoid` normal de `village.ts` ya lleva a quien cedió de vuelta
 * a lo suyo, y el compromiso sigue vivo un rato más sólo para el
 * enfriamiento. Nunca mueve a quien pasa: pasar es no cambiar de plan.
 */
export function playYield(yielding: Yielding, yielder: Dweller): void {
  if (yielding.aside === null) { drive(yielder.body, { x: 0, z: 0 }); return; }
  const dx = yielding.aside.x - yielder.body.x;
  const dz = yielding.aside.z - yielder.body.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) { drive(yielder.body, { x: 0, z: 0 }); return; }
  drive(yielder.body, {
    x: (dx / dist) * yielder.body.pace * 0.6,
    z: (dz / dist) * yielder.body.pace * 0.6,
  });
}
