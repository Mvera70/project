// V-06 · Elegir. design.md Anexo E.
//
// Lo que convierte «me pide el cuerpo» y «el mundo ofrece» en «voy a hacer
// esto». Es la pieza que cierra la cabeza, y la que decide si el valle
// sorprende: si a partir de aquí la aldea sigue pareciendo una coreografía, el
// problema es el modelo y no falta más código encima.
//
// **Utilidad, no árbol.** Cada oferta al alcance se puntúa con lo que calma de
// lo que a uno le aprieta, y se hace la que más puntúe. Un árbol de decisión
// diría «si tiene sed, al pozo», y entonces todo el que tenga sed va al pozo
// siempre: con utilidad, el sediento que además está agotado y tiene el pozo a
// veinte pasos se sienta, y eso no lo ha escrito nadie.

import type { Trait } from '@engine/state';
import { hash32 } from '@engine/rng';
import { blockedAt, type Point, type Terrain } from './body';
import type { Needs } from './needs';
import { NEED_NAMES } from './needs';
import type { Offer, Place } from './offers';
import { seatAt, seatKey } from './offers';
import type { Router, Waypoint } from './navigate';
import { STEPS_PER_DAY } from './clock';

/** Lo que alguien está haciendo o yendo a hacer. */
export interface Intent {
  readonly place: Place;
  readonly offer: Offer;
  /** El camino hasta allí. Se va gastando al andarlo. */
  readonly route: Waypoint[];
  /** En qué paso se dio por empezado esto. */
  readonly since: number;
  /** Y en cuál se acaba, una vez llegado. */
  until: number;
  /** Si ya está en el sitio haciendo lo suyo, o todavía yendo. */
  there: boolean;
  /** Qué plaza ocupa, para no ponerse todos en el mismo palmo de suelo. */
  readonly seat: number;
}

/**
 * Lo lejos que se busca algo que hacer, en celdas.
 *
 * TUNE: cinco, y empezó en doce. Lo que manda no es cuánto se tarda en llegar
 * sino **cuánto dura lo que se va a hacer**: beber son cuatro segundos y sentarse
 * ocho, así que un viaje de diez deja una jornada que es todo ir y venir.
 * Medido con doce: entre el 78 % y el 85 % del día andando. Con cinco, la gente
 * usa lo que tiene al lado, que además es lo que hace la gente.
 */
const LOOK = 5;

/**
 * Cuánto pesa lo lejos que está algo.
 *
 * TUNE: a doce celdas, una oferta vale la mitad que la misma al lado. Sin esto,
 * la aldea entera cruza el valle a por lo mejor y lo que se ve son ochenta
 * personas haciendo el mismo viaje.
 */
function falloff(away: number): number {
  return 1 / (1 + away / LOOK);
}

/**
 * Lo que un rasgo empuja hacia una acción.
 *
 * El sitio donde el carácter elige y no sólo se cansa distinto. Un `devout` va a
 * rezar aunque no le apriete nada; un `secretive` esquiva el corro. Es la misma
 * tabla de §6.3 leída para esto.
 */
const LEANING: Partial<Record<Trait, Partial<Record<string, number>>>> = {
  devout: { pray: 2.2 },
  kind: { gossip: 1.5 },
  generous: { gossip: 1.6 },
  secretive: { gossip: 0.3, pray: 0.7 },
  craven: { watch: 1.3, work: 0.8 },
  ambitious: { work: 1.6 },
  stubborn: { work: 1.4 },
  greedy: { work: 1.5 },
  loyal: { work: 1.3 },
  hardy: { work: 1.2, sit: 0.6 },
  frail: { sit: 1.5, work: 0.8 },
  cunning: { watch: 1.4, loiter: 1.3 },
  proud: { gossip: 0.7, watch: 1.2 },
  hot_tempered: { pray: 0.6 },
  spiteful: { gossip: 0.6 },
};

function leanOf(traits: readonly Trait[], offer: string): number {
  let lean = 1;
  for (const trait of traits) {
    const bias = LEANING[trait]?.[offer];
    if (bias !== undefined) lean *= bias;
  }
  return lean;
}

/**
 * Cuánto vale una oferta en función de la hora del día.
 *
 * **Tiene que dar ventaja en su hora, no sólo penalizar fuera de ella.** La
 * primera versión topaba en 1,0 dentro de la franja punta y caía por debajo
 * fuera: así una oferta con hora nunca podía ganarle a una oferta idéntica sin
 * restricción horaria, porque ésa vale 1,0 siempre. Medido: la plaza (`gossip`
 * con hora) pierde casi siempre contra el pozo (`gossip` sin hora), y el claro
 * (`work` con hora) casi siempre contra un campo normal — en seis semillas,
 * la plaza no recibía visita en cuatro y el claro en dos. Con la hora como
 * puro lastre, los sitios comunes de V-10 no aportaban nada.
 *
 * TUNE: 1,4 dentro de la franja punta, 0,6 como mínimo fuera. Dentro gana a
 * cualquier alternativa sin hora que dé lo mismo; fuera sigue siendo viable,
 * porque nunca es cero.
 */
function hourFactor(offer: Offer, dayPhase: number): number {
  if (offer.hours === undefined) return 1;

  const [start, end] = offer.hours;
  // Cierra el intervalo: si es [0.6, 1.0] y la jornada es cíclica, hay que
  // considerar que [0.95, 1.0] y [0.0, 0.05] son adyacentes.
  const inRange = (dayPhase >= start && dayPhase <= end)
    || (start > end && (dayPhase >= start || dayPhase <= end));

  if (inRange) return 1.4;

  // Fuera de hora, vale menos pero no cero. Usa una caída suave según la
  // distancia: lo más lejano de la ventana vale menos.
  const mid = (start + end) / 2;
  let distance = Math.abs(dayPhase - mid);
  // Si la ventana cruza el borde del día, la distancia es la más corta en el
  // ciclo (acordeón).
  if (start > end && distance > 0.5) distance = 1 - distance;

  // Caída suave: lejos de la hora punta, valor base bajo.
  return 0.6 + 0.4 / (1 + distance * 5);
}

/**
 * Cuánto vale para alguien hacer esto, ahora.
 *
 * Lo que calma, pesado por lo que aprieta. Una oferta que da mucho de algo que
 * a uno no le pide nada vale poco, y ahí está lo que hace que dos personas
 * frente al mismo pozo hagan cosas distintas.
 */
export function worth(
  offer: Offer,
  needs: Needs,
  traits: readonly Trait[],
  from: Point,
): number {
  let value = 0;
  for (const name of NEED_NAMES) {
    const gives = offer.gives[name];
    if (gives === undefined) continue;
    value += needs[name] * gives;
  }
  if (value <= 0) return 0;
  const away = Math.hypot(offer.at.x - from.x, offer.at.z - from.z);
  return value * leanOf(traits, offer.id) * falloff(away);
}

/**
 * Cada cuántos pasos se replantea uno la vida.
 *
 * TUNE: 45, que son segundo y medio escénico. **No cada paso**: alguien que
 * cambia de idea treinta veces por segundo tiembla, y lo que se ve es un
 * temblor y no una duda. Tampoco tan pocas veces que no reaccione a lo que
 * pasa delante.
 */
export const RETHINK = 45;

/**
 * Cuánto se prefiere lo que ya se está haciendo.
 *
 * TUNE: un tercio más. Sin inercia nadie termina nada: en cuanto otra oferta
 * empata, se cambia, y lo que se ve es gente dando vueltas entre dos sitios.
 */
const STICKY = 1.35;

/**
 * Cuántas ofertas se prueban antes de darse por vencido.
 *
 * TUNE: cuatro. Pedir una ruta cuesta, así que no se pueden probar todas; pero
 * con una sola, cualquier oferta inalcanzable dejaba a alguien sin hacer nada
 * el resto del rato. Cuatro cubre el caso real —la mejor y sus vecinas
 * inmediatas suelen estar en el mismo rincón, y si ese rincón está cortado hay
 * que salir de él— sin convertir cada replanteo en un barrido del valle.
 */
const TRY = 4;

/** Lo que decide alguien, con todo lo suyo delante. */
export interface Chooser {
  readonly traits: readonly Trait[];
  readonly needs: Needs;
  readonly at: Point;
  readonly id: number;
  /** Lo que ya está haciendo, si es que hace algo. */
  readonly doing: Intent | null;
}

/**
 * Qué hace uno ahora.
 *
 * Devuelve nada cuando no hay nada que merezca la pena a su alcance, que es una
 * respuesta legítima: quien no tiene nada que hacer se queda por ahí, y eso
 * también es una aldea.
 *
 * El ruido sale de `seed` por una función pura: **misma jornada, mismas
 * decisiones**. §4.3 en pie, y además es lo que permite reconstruir el día tras
 * un letargo sin que la aldea cambie de planes.
 */
export function decide(
  who: Chooser,
  places: readonly Place[],
  taken: ReadonlyMap<string, number>,
  land: Terrain,
  router: Router,
  seed: number,
  step: number,
): Intent | null {
  const dayPhase = (step % STEPS_PER_DAY) / STEPS_PER_DAY;
  const options: { place: Place; offer: Offer; score: number; key: string }[] = [];

  for (const place of places) {
    const away = Math.hypot(place.at.x - who.at.x, place.at.z - who.at.z);
    // Un sitio con hora punta se busca más lejos que uno corriente: es un
    // punto de encuentro deliberado (la plaza, el vado, el claro de V-10) y no
    // un pozo cualquiera, así que vale la pena caminar un poco más para
    // llegar a él. Sin esto, la plaza y el claro quedaban fuera del alcance de
    // casi todo el mundo —medido, sin visita en cuatro y dos semillas de seis
    // respectivamente— porque suelen caer en el borde del núcleo construido.
    const hasHour = place.offers.some((offer) => offer.hours !== undefined);
    if (away > LOOK * (hasHour ? 4 : 2)) continue;
    for (const offer of place.offers) {
      const key = seatKey(place, offer);
      // El aforo, salvo para quien ya está dentro: no se echa a nadie de su
      // propio sitio por estar lleno.
      const inside = who.doing?.place.id === place.id && who.doing?.offer.id === offer.id;
      if (!inside && (taken.get(key) ?? 0) >= offer.seats) continue;

      let score = worth(offer, who.needs, who.traits, who.at);
      if (score <= 0) continue;
      score *= hourFactor(offer, dayPhase);
      if (inside) score *= STICKY;
      // Un pellizco de azar, para que dos vecinos idénticos frente al mismo
      // pozo no se muevan como un solo cuerpo.
      const dice = hash32(seed, `pick:${who.id}:${step}:${place.id}:${offer.id}`) / 4_294_967_296;
      score *= 0.85 + dice * 0.3;

      options.push({ place, offer, score, key: seatKey(place, offer) });
    }
  }

  if (options.length === 0) return null;
  // De mejor a peor, y con desempate por clave para que dos ofertas que puntúen
  // exactamente igual no dependan del orden en que se recorrió el valle (§4.3).
  options.sort((a, b) => (b.score - a.score) || (a.key < b.key ? -1 : 1));

  for (const pick of options.slice(0, TRY)) {
    if (who.doing !== null
      && who.doing.place.id === pick.place.id
      && who.doing.offer.id === pick.offer.id) {
      // Lo mismo que ya hacía: se sigue, sin recalcular el camino.
      return who.doing;
    }

    // La plaza que queda libre en ese sitio, y con ella el palmo de suelo donde
    // ponerse: un corro y no un montón.
    //
    // **Al azar entre las libres, no siempre la primera** (checklist IA-1,
    // punto 2). Con `seat = ya ocupadas` a secas, una oferta de uso exclusivo
    // —el `self` de un animal (`beasts.ts`), que nadie más elige nunca—
    // siempre ve cero ocupadas y siempre cae en el mismo `spots[0]`: la vaca
    // que «vuelve siempre al mismo sitio exacto» de rework.md §3.5.2, aun
    // dándole varios puntos entre los que elegir. El desempate sale de
    // `hash32` por persona, paso y oferta, así que dos máquinas colocan al
    // mismo animal en el mismo sitio (§4.3), y sigue sin poder pasarse del
    // aforo: el hueco es sólo entre las plazas que quedan libres.
    const already = taken.get(pick.key) ?? 0;
    const free = pick.offer.seats - already;
    const jitter = free <= 1 ? 0 : Math.floor(
      (hash32(seed, `seat:${who.id}:${step}:${pick.key}`) / 4_294_967_296) * free,
    );
    const seat = already + jitter;
    const spot = seatAt(pick.offer, seat);
    const route = router.to(land, who.at, spot);
    // **Sin camino se prueba la siguiente, no se abandona el día.** Era la otra
    // mitad del fallo de las plazas en pared: bastaba con que la mejor oferta
    // fuera inalcanzable para que la persona se quedara sin hacer nada, y como
    // la elección es determinista, al replantearse volvía a ganar la misma y
    // volvía a no haber camino. Clavado hasta que se le pasaran las ganas.
    if (route === null) continue;

    const span = pick.offer.seconds;
    const dice = hash32(seed, `span:${who.id}:${step}`) / 4_294_967_296;
    return {
      place: pick.place,
      offer: pick.offer,
      route: [...route],
      seat,
      since: step,
      until: step + Math.round((span[0] + dice * (span[1] - span[0])) * 30),
      there: false,
    };
  }

  // Ninguna de las `TRY` mejores tiene ruta. Si ya se había llegado a algo
  // —`there === true`— se sigue: no hay motivo para soltar una ocupación en
  // marcha sólo porque nada mejor sea alcanzable ahora mismo, y esto también
  // cubre `who.doing === null` (no hay nada que conservar).
  //
  // **Pero una intención que iba de camino se invalida, no se repite**
  // (checklist IA-1, punto 4). Esta función sólo se llama con
  // `doing !== null && !there` cuando el viaje se ha dado por eterno —los dos
  // llamadores, `village.ts` y `beasts.ts`, sólo invocan `decide()` de camino
  // cuando `noProgress()` lo pide—, así que conservarla aquí es repetir el
  // mismo fracaso hasta `GIVE_UP` cada vez: el cuerpo vuelve a intentar la
  // misma ruta que ya ha demostrado no llevar a ningún sitio. `null` deja que
  // quien llama ofrezca otra cosa (`pauseHere`, más abajo).
  if (who.doing !== null && who.doing.there) return who.doing;
  return null;
}

/** Lo que una oferta calma, aplicado a quien la está haciendo. */
export function satisfy(needs: Needs, offer: Offer, seconds: number): void {
  for (const name of NEED_NAMES) {
    const gives = offer.gives[name];
    if (gives === undefined) continue;
    // Se calma poco a poco mientras dura, no de golpe al acabar: así sentarse
    // un rato corto sirve de algo y se puede interrumpir sin perderlo todo.
    const rate = gives / Math.max(1, offer.seconds[0]);
    needs[name] = Math.max(0, Math.min(1, needs[name] - rate * seconds));
  }
}

/**
 * Cada cuántos pasos se comprueba si un viaje avanza.
 *
 * TUNE: 90 pasos, tres segundos escénicos (checklist IA-1, punto 6). Ni cada
 * paso —confundiría el vaivén de un forcejeo de un instante con un atasco de
 * verdad— ni sólo al `GIVE_UP` entero (600 pasos, veinte segundos): eso es
 * justo la espera fija que se deja de hacer.
 */
export const PROGRESS_CHECK = 90;

/**
 * Cuánto tiene que haberse acercado al objetivo desde la última comprobación
 * para contar como avance, en celdas.
 *
 * TUNE: 0,3. Más que el vaivén de un forcejeo con un vecino o una pared
 * (rework.md §3.5.1 y §3.5.3, mismo margen que `TURN_MIN_PROGRESS` en
 * `body.ts`), menos que cualquier tramo real de camino andado a paso normal
 * en tres segundos.
 */
const PROGRESS_MIN = 0.3;

/**
 * Lo que hace falta recordar, de una llamada a `noProgress()` a la
 * siguiente, para saber si una intención avanza.
 *
 * Vive fuera de `Dweller`/`Beast` a propósito: `Dweller` lo construyen
 * también ficheros ajenos a esta fase (pruebas de escenas, por ejemplo), y
 * añadirle campos obligatorios les rompería el tipo sin que esta fase pueda
 * tocarlos. `village.ts` guarda uno de éstos por persona en un mapa aparte;
 * `beasts.ts` lo lleva colgado del propio `Beast`, que sólo construye él.
 */
export interface ProgressState {
  at: number;
  gap: number;
  stalls: number;
}

/** Un `ProgressState` recién nacido: sin comprobación hecha todavía. */
export function freshProgress(): ProgressState {
  return { at: 0, gap: Number.POSITIVE_INFINITY, stalls: 0 };
}

/**
 * Si el viaje se ha quedado sin avanzar y toca replantearlo.
 *
 * **Espera creciente, no un `GIVE_UP` fijo** (checklist IA-1, punto 6): la
 * primera vez que no hay avance se concede el replanteo a los tres segundos
 * (`PROGRESS_CHECK`), y si la intención nueva vuelve a atascarse la espera se
 * dobla cada vez, hasta el tope que marca `giveUp` — así un tropiezo de un
 * instante no dispara el router de más (`RETHINK` ya evita recalcular cada
 * paso; esto evita recalcular cada tres segundos para siempre), y quien está
 * de verdad clavado no espera nunca el tope entero para que se note.
 *
 * Muta `state` porque necesita recordar, de una llamada a la siguiente,
 * cuánto se había acercado la última vez y cuántas veces seguidas no ha
 * mejorado — la misma clase de estado por cuerpo que `rethinkAt`, no algo que
 * quepa calcular sin memoria.
 */
export function noProgress(
  doing: Intent | null, state: ProgressState, at: Point, step: number, giveUp: number,
): boolean {
  if (doing === null || doing.there) { state.stalls = 0; return false; }
  if (step < state.at) return false;

  const target = seatAt(doing.offer, doing.seat);
  const gap = Math.hypot(target.x - at.x, target.z - at.z);
  const improved = gap < state.gap - PROGRESS_MIN;
  state.stalls = improved ? 0 : Math.min(state.stalls + 1, 4);
  state.gap = gap;
  state.at = step + Math.min(giveUp, PROGRESS_CHECK * 2 ** state.stalls);
  return !improved;
}

/**
 * Una pausa local, siempre alcanzable.
 *
 * Checklist IA-1, punto 5: para cuando `decide()` no encuentra nada que
 * merezca la pena — o lo que había se acaba de invalidar por inalcanzable
 * (punto 4) — el cuerpo tiene que poder hacer algo donde está, en vez de
 * quedarse con `doing === null` hasta que la jornada vuelva a intentarlo
 * entero. Es la medida que sigue sin moverse en rework.md §3.6: parados con
 * un impulso ≥ 0,9, 0,19 %.
 *
 * No es una oferta del catálogo (`offers.ts`, `OFFERS`): nadie más la ve —se
 * construye aquí mismo, de un uso— y no compite por aforo con nadie. Sólo
 * tiene que existir un instante y ser alcanzable de verdad, así que sus
 * `spots` viven a una o dos celdas del punto de partida (el rango que pide
 * rework.md §3.5.4) y sólo en celda libre; si ninguno de los intentos cae
 * bien —un rincón de una sola celda, rarísimo pero posible—, el propio punto
 * de partida entra como último recurso, porque ahí es donde el cuerpo ya
 * está de pie y por tanto siempre es alcanzable.
 *
 * `reach: 1` a propósito: `follow()` considera un tramo andado en cuanto se
 * está a `REACHED = 0.45` celdas (`navigate.ts`), y la llegada de verdad se
 * mide a `offer.reach * 0.6` — con `reach` por debajo de 0,75 ese margen cae
 * por debajo de 0,45 y un cuerpo podría vaciar la ruta sin llegar nunca a
 * marcarse como llegado, quedándose de pie sin `there === true` para
 * siempre.
 */
const PAUSE_SPOTS = 3;

export function pauseHere(
  at: Point, land: Terrain, router: Router, seed: number, id: number, step: number,
): Intent {
  const spots: Point[] = [];
  for (let n = 0; n < PAUSE_SPOTS; n += 1) {
    const angle = (hash32(seed, `pause:${id}:${step}:${n}:a`) / 4_294_967_296) * Math.PI * 2;
    const dist = 1 + (hash32(seed, `pause:${id}:${step}:${n}:d`) / 4_294_967_296);
    const spot = { x: at.x + Math.cos(angle) * dist, z: at.z + Math.sin(angle) * dist };
    if (spot.x <= 0.5 || spot.z <= 0.5 || spot.x >= land.width - 0.5 || spot.z >= land.height - 0.5) continue;
    if (blockedAt(land, spot.x, spot.z)) continue;
    spots.push(spot);
  }
  if (spots.length === 0) spots.push({ x: at.x, z: at.z });

  const anchor = spots[0] as Point;
  const offer: Offer = {
    id: 'pause', at: anchor, reach: 1, seats: spots.length,
    // **Una pausa no bebe agua, ni cumple tu deber, ni te da compañía.** La
    // primera versión de IA-1 calmaba un pellizco de sed, compañía y deber
    // «para que nadie se quede con sed 1,0 mostrada indefinidamente», y eso es
    // tapar el síntoma: con la sed calmándose de pie, un cuerpo sediento se
    // queda parado en vez de ir al agua, y la cifra de §3.6 mejora sin que el
    // valle mejore. El sediento que no encuentra agua es un hueco de
    // contenido, no de decisión, y se arregla donde estaba el hueco: había un
    // solo pozo de dos plazas para toda la aldea, y ahora el vado da de beber
    // (`places.ts`, `OFFERS.drink`). Aquí sólo lo que de verdad da estar
    // parado un rato: descansar, dejar de aburrirse y templarse.
    gives: { rest: 0.2, boredom: 0.2, irritation: 0.15 },
    seconds: [4, 9],
    spots,
  };
  const place: Place = { id: `pause:${id}`, at: anchor, offers: [offer] };
  const route = router.to(land, at, anchor) ?? [{ x: anchor.x, z: anchor.z }];
  const dice = hash32(seed, `pausespan:${id}:${step}`) / 4_294_967_296;
  return {
    place,
    offer,
    route: [...route],
    seat: 0,
    since: step,
    until: step + Math.round((offer.seconds[0] + dice * (offer.seconds[1] - offer.seconds[0])) * 30),
    there: false,
  };
}
