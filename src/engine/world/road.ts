// M-0 · Lo que sube y baja por el camino: las ofertas y el diezmo.
// `docs/historico/plan-medios.md` §6, brief en `docs/historico/rework.md` §4b.
//
// **Por qué existe.** La plata es lo único que viene de fuera del valle, y lo
// que la mueve es quien pasa por el camino: el buhonero que compra leña, el
// factor que compra el grano que sobra, el tratante y el salinero que venden, y
// el señor que cobra. Hasta M-0 los tres comerciantes eran encrucijadas —una
// pantalla entera, tres opciones, dos veces en una vida— y el buhonero un suceso
// que cambiaba leña por grano sin preguntar. El dueño del diseño eligió el
// formato el 17 sep 2026: **una oferta que se acepta o se deja pasar**, desde la
// voz de la bandeja, sin pantalla entera.
//
// Aquí vive lo que una oferta **es** una vez puesta: si se puede pagar, qué pasa
// al aceptarla, y cuándo se va. Quién sube y qué ofrece lo decide el sorteo de
// sucesos (`fate.ts`), que es donde se tira el azar; este fichero no consume
// ninguna tirada, y por eso un acto del jugador no puede desplazar la partida.

import { FOOD, OFFER, TIME, TITHE } from '../balance';
import { population } from '../people/demography';
import type { ChronicleEntry, GameState, HappeningId, Offer, OfferGood } from '../state';
import { herdCapacity } from '../subsistence/herd';

/** Pone una oferta en el camino. La llama `fate.ts` desde un suceso de visita. */
export function postOffer(
  state: GameState,
  id: HappeningId,
  gives: OfferGood[],
  takes: OfferGood[],
): Offer {
  const offer: Offer = {
    id, gives, takes, postedTick: state.tick, expiresTick: state.tick + OFFER.WEEKS,
  };
  state.offer = offer;
  return offer;
}

/** Si el valle tiene lo que la oferta pide, y sitio para lo que da. */
export function canAccept(state: GameState, offer: Offer): boolean {
  for (const good of offer.takes) {
    if (good.k === 'stat' && state.village[good.stat] < good.amount) return false;
    if (good.k === 'herd' && state.herd[good.kind] < good.amount) return false;
  }
  for (const good of offer.gives) {
    // Una vaca que no cabe en el corral no se compra: se moriría la primera
    // semana (`herd.ts` recorta a la capacidad), y el jugador habría pagado por
    // nada.
    if (good.k === 'herd' && state.herd[good.kind] + good.amount > herdCapacity(state)[good.kind]) {
      return false;
    }
  }
  return true;
}

function apply(state: GameState, good: OfferGood, sign: 1 | -1): void {
  if (good.k === 'stat') {
    const next = state.village[good.stat] + sign * good.amount;
    state.village[good.stat] = good.stat === 'morale' || good.stat === 'faith'
      ? Math.max(0, Math.min(100, next))
      : Math.max(0, next);
  } else if (good.k === 'herd') {
    state.herd[good.kind] = Math.max(0, state.herd[good.kind] + sign * good.amount);
  } else if (sign > 0) {
    state.flags[good.flag] = state.tick + good.years * TIME.WEEKS_PER_YEAR;
  }
}

/** Lo que un trato deja escrito: las cifras de la oferta, con el nombre de su bien. */
function paramsOf(offer: Offer): Record<string, number> {
  const params: Record<string, number> = {};
  for (const good of [...offer.gives, ...offer.takes]) {
    if (good.k === 'stat') params[good.stat] = good.amount;
    else if (good.k === 'herd') params[good.kind] = good.amount;
  }
  return params;
}

export interface OfferOutcome {
  readonly id: HappeningId;
  readonly accepted: boolean;
  /** Aceptada pero sin con qué pagarla: no se hace, y la voz lo dice. */
  readonly refused: boolean;
  readonly entry: Omit<ChronicleEntry, 'tick'> | null;
}

/**
 * El jugador contesta a la oferta que hay en el camino. Sin oferta, `null`.
 *
 * Dejarla pasar no escribe nada en la crónica —quien no compra no hace
 * historia— y aceptarla sin poder pagarla tampoco la gasta: la oferta sigue ahí
 * hasta que caduque, por si al jugador le da tiempo a juntar lo que pide.
 */
export function settleOffer(state: GameState, accept: boolean, season: string, year: number): OfferOutcome | null {
  const offer = state.offer;
  if (offer === null) return null;
  if (!accept) {
    state.offer = null;
    return { id: offer.id, accepted: false, refused: false, entry: null };
  }
  if (!canAccept(state, offer)) return { id: offer.id, accepted: false, refused: true, entry: null };
  for (const good of offer.takes) apply(state, good, -1);
  for (const good of offer.gives) apply(state, good, 1);
  state.offer = null;
  return {
    id: offer.id,
    accepted: true,
    refused: false,
    entry: {
      kind: 'road',
      templateKey: `offer.${offer.id}.taken`,
      params: { ...paramsOf(offer), season, year },
      weight: 2,
    },
  };
}

/** Si la oferta ha caducado, se va, y lo dice en voz baja (peso 1). */
export function expireOffer(state: GameState, season: string, year: number): Omit<ChronicleEntry, 'tick'> | null {
  const offer = state.offer;
  if (offer === null || state.tick <= offer.expiresTick) return null;
  state.offer = null;
  return { kind: 'road', templateKey: `offer.${offer.id}.gone`, params: { season, year }, weight: 1 };
}

export interface Tithe {
  readonly silver: number;
  readonly grain: number;
}

/**
 * **El diezmo del señor**, cada otoño (`TITHE.WEEKS_AFTER_HARVEST` semanas
 * después de la siega). Decisión del dueño del diseño, 17 sep 2026: una sangría
 * fija y legible, que es lo que da sentido a juntar plata.
 *
 * Se lleva `SILVER_SHARE` de la plata. Si no hay plata que valga la pena, lo
 * cobra en grano **y sólo del que sobra** por encima de un año de comida: la
 * decisión 4 del dueño dice que el mundo no mata sin motivo, y un diezmo que
 * dejara a la pareja sin pan sería exactamente eso. Un caserío de menos de
 * `MIN_PEOPLE` no le interesa. Devuelve `null` las semanas que no toca.
 */
export function collectTithe(state: GameState): Tithe | null {
  if (state.tick % TIME.WEEKS_PER_YEAR !== (TIME.HARVEST_WEEK + TITHE.WEEKS_AFTER_HARVEST) % TIME.WEEKS_PER_YEAR) {
    return null;
  }
  const people = population(state);
  if (people < TITHE.MIN_PEOPLE) return null;
  const silver = Math.floor(state.village.silver * TITHE.SILVER_SHARE);
  if (silver >= 1) {
    state.village.silver -= silver;
    return { silver, grain: 0 };
  }
  const yearOfFood = people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON;
  const surplus = state.village.grain - yearOfFood;
  const grain = Math.floor(Math.max(0, surplus) * TITHE.GRAIN_OF_SURPLUS);
  if (grain <= 0) return { silver: 0, grain: 0 };
  state.village.grain -= grain;
  return { silver: 0, grain };
}

/** El grano que el factor querría comprar hoy, redondeado a diez, o cero. */
export function factorWants(state: GameState): number {
  const people = population(state);
  const keep = people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON * OFFER.FACTOR_KEEP_YEARS;
  const surplus = Math.min(OFFER.FACTOR_MAX_GRAIN, state.village.grain - keep);
  const rounded = Math.floor(surplus / 10) * 10;
  return rounded >= OFFER.FACTOR_MIN_GRAIN ? rounded : 0;
}
