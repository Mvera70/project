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
import type { Point, Terrain } from './body';
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
  let best: { place: Place; offer: Offer; score: number } | null = null;

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

      if (best === null || score > best.score) best = { place, offer, score };
    }
  }

  if (best === null) return null;
  if (who.doing !== null
    && who.doing.place.id === best.place.id
    && who.doing.offer.id === best.offer.id) {
    // Lo mismo que ya hacía: se sigue, sin recalcular el camino.
    return who.doing;
  }

  // La plaza que queda libre en ese sitio, y con ella el palmo de suelo donde
  // ponerse: un corro y no un montón.
  const seat = taken.get(seatKey(best.place, best.offer)) ?? 0;
  const spot = seatAt(best.offer, seat);
  const route = router.to(land, who.at, spot);
  if (route === null) return who.doing;

  const span = best.offer.seconds;
  const dice = hash32(seed, `span:${who.id}:${step}`) / 4_294_967_296;
  return {
    place: best.place,
    offer: best.offer,
    route: [...route],
    seat,
    since: step,
    until: step + Math.round((span[0] + dice * (span[1] - span[0])) * 30),
    there: false,
  };
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
