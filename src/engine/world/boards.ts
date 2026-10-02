// K8+K9 · Los tablones de la herrería y de la iglesia (2 oct 2026).
//
// Vera: «cada edificio con sentido y su propio tablón, como el de misiones de
// la plaza: la herrería con encargos o mejoras pagadas; la iglesia, donde el
// cura reza o convoca misa y sube la moral». Es el patrón de §7.15 —se toca en
// el mundo, se elige, la aldea actúa y el resultado vuelve— aplicado a dos
// edificios más. Y K9 vive aquí: **inclinar la aldea hacia un recurso** no es
// un deslizador (las palancas de v2.0 se retiraron por trampa) sino un encargo
// que se paga, dura un año y se ve.
//
// Lo que se midió antes de diseñarlo está en
// `docs/medidas/k8-k9-edificios-2026-10-02.md`, y las decisiones de Vera, en
// `BOARDS` (`balance.ts`).
//
// **Nada de esto tira dados**: un acto del jugador no puede desplazar la
// partida (§4.3). Todo se guarda en `state.flags`, así que no sube el esquema.
//
//   smithy:<encargo>     caducidad del encargo (tick)
//   rite:mass            hasta cuándo no se puede convocar otra misa (tick)
//   rite:mass:at         **el tick en que se celebró** (no es caducidad)
//   rite:rogation        la siega que bendice (tick de la cosecha)
//   rite:rogation:at     el tick en que se hizo la procesión

import { BOARDS, TIME } from '../balance';
import { isHere } from '../people/demography';
import type { ChronicleEntry, GameState, Rite, SmithyOrder, VillageStats } from '../state';
import { RITES, SMITHY_ORDERS } from '../state';
import { seasonOf, weekOf } from '../time';
import { standing, smithyWorking } from '../subsistence/building-counts';
import { winterReserve } from '../subsistence/consumption';

/** Por qué no se puede pedir un encargo. */
export type OrderRefusal = 'ended' | 'smithy' | 'smith' | 'busy' | 'cost';
/** Por qué no se puede celebrar un rito. */
export type RiteRefusal = 'ended' | 'chapel' | 'priest' | 'soon' | 'faith' | 'blessed';

export interface OrderOpen {
  readonly id: SmithyOrder;
  readonly cost: Readonly<Partial<Record<keyof VillageStats, number>>>;
  readonly refusal: OrderRefusal | null;
  /** Si hay uno en marcha, cuál y hasta qué tick (para que el tablón lo diga). */
  readonly live: { readonly order: SmithyOrder; readonly until: number } | null;
}

export interface RiteOpen {
  readonly id: Rite;
  readonly refusal: RiteRefusal | null;
  /** Hasta qué tick no se puede repetir, si es eso lo que lo impide. */
  readonly until: number | null;
}

const someone = (state: GameState, role: 'smith' | 'priest'): boolean =>
  state.people.villagers.some((v) => isHere(v) && v.role === role);

/** El encargo en marcha, si lo hay: la herrería hace uno cada vez. */
export function liveOrder(state: GameState): { order: SmithyOrder; until: number } | null {
  for (const order of SMITHY_ORDERS) {
    const until = state.flags[`smithy:${order}`];
    if (until !== undefined && until > state.tick) return { order, until };
  }
  return null;
}

/** Si el encargo `order` está en marcha esta semana. */
export function orderLive(state: GameState, order: SmithyOrder): boolean {
  return liveOrder(state)?.order === order;
}

/** El tablón de la herrería: los cuatro encargos, con por qué no si no se puede. */
export function smithyOrdersOpen(state: GameState): OrderOpen[] {
  const live = liveOrder(state);
  return SMITHY_ORDERS.map((id) => {
    const cost = BOARDS.ORDERS[id];
    const refusal: OrderRefusal | null = state.ended !== null ? 'ended'
      : standing(state, 'smithy').length === 0 ? 'smithy'
        : !smithyWorking(state) || !someone(state, 'smith') ? 'smith'
          : live !== null ? 'busy'
            : Object.entries(cost).some(([stat, amount]) => state.village[stat as keyof VillageStats] < amount)
              // Y nunca la leña del invierno: la fragua no quema la que la aldea
              // necesita para no helarse, la misma regla que K3a puso a las obras
              // (`winterReserve`). Medido: con herrajes sin parar, una semilla
              // pasó 46 semanas con la leñera vacía.
              // K5 · un encargo sin madera (los petos) no toca la leñera.
              || (cost.wood > 0 && state.village.wood - cost.wood < winterReserve(state)) ? 'cost'
              : null;
    return { id, cost, refusal, live };
  });
}

/** Lo que devuelve un acto de un tablón: si se hizo, por qué no, y la línea de crónica. */
export interface BoardOutcome {
  readonly done: boolean;
  readonly refusal: OrderRefusal | RiteRefusal | null;
  readonly entry: Omit<ChronicleEntry, 'tick'> | null;
}

/** Paso 1b · el jugador encarga algo a la herrería. Se paga aquí y dura un año. */
export function orderSmithy(state: GameState, order: SmithyOrder, year: number): BoardOutcome {
  const open = smithyOrdersOpen(state).find((o) => o.id === order)!;
  if (open.refusal !== null) return { done: false, refusal: open.refusal, entry: null };
  for (const [stat, amount] of Object.entries(open.cost)) {
    const key = stat as keyof VillageStats;
    state.village[key] = Math.max(0, state.village[key] - amount);
  }
  state.flags[`smithy:${order}`] = state.tick + BOARDS.ORDER_WEEKS;
  return {
    done: true,
    refusal: null,
    entry: {
      kind: 'means',
      templateKey: `smithy.${order}.ordered`,
      params: { year, season: seasonOf(state.tick), wood: open.cost.wood ?? 0, silver: open.cost.silver ?? 0, hides: open.cost.hides ?? 0 },
      weight: 2,
    },
  };
}

/**
 * Cada semana, antes de la economía: la herrería vende sus herrajes cada
 * `WARES_EVERY` semanas mientras dure el encargo, y el encargo que se acaba
 * se cuenta y se borra.
 */
export function smithyWeek(state: GameState, year: number): Omit<ChronicleEntry, 'tick'>[] {
  const out: Omit<ChronicleEntry, 'tick'>[] = [];
  for (const order of SMITHY_ORDERS) {
    const key = `smithy:${order}`;
    const until = state.flags[key];
    if (until === undefined) continue;
    const since = until - BOARDS.ORDER_WEEKS;
    if (order === 'ironware' && state.tick > since && state.tick <= until
      && (state.tick - since) % BOARDS.WARES_EVERY === 0) {
      state.village.silver += BOARDS.WARES_SILVER;
    }
    if (state.tick >= until) {
      delete state.flags[key];
      const sold = order === 'ironware' ? Math.floor(BOARDS.ORDER_WEEKS / BOARDS.WARES_EVERY) * BOARDS.WARES_SILVER : 0;
      out.push({ kind: 'means', templateKey: `smithy.${order}.done`, params: { year, season: seasonOf(state.tick), silver: sold }, weight: 1 });
    }
  }
  return out;
}

/** El tick de la próxima siega (la de este año si aún no ha llegado). */
function nextHarvest(tick: number): number {
  const start = tick - weekOf(tick);
  return weekOf(tick) < TIME.HARVEST_WEEK ? start + TIME.HARVEST_WEEK : start + TIME.WEEKS_PER_YEAR + TIME.HARVEST_WEEK;
}

/** El tablón de la iglesia: la misa y la rogativa, con por qué no. */
export function ritesOpen(state: GameState): RiteOpen[] {
  const chapel = standing(state, 'chapel').length + standing(state, 'church').length > 0;
  return RITES.map((id) => {
    let until: number | null = null;
    let refusal: RiteRefusal | null = state.ended !== null ? 'ended'
      : !chapel ? 'chapel'
        : !someone(state, 'priest') ? 'priest' : null;
    if (refusal === null && id === 'mass') {
      const next = state.flags['rite:mass'];
      if (next !== undefined && next > state.tick) { refusal = 'soon'; until = next; }
    }
    if (refusal === null && id === 'rogation') {
      const blessed = state.flags['rite:rogation'];
      if (blessed !== undefined && blessed >= state.tick) { refusal = 'blessed'; until = blessed; }
      else if (state.village.faith < BOARDS.ROGATION_FAITH) refusal = 'faith';
    }
    return { id, refusal, until };
  });
}

/**
 * Paso 1b · el jugador pide un rito al cura.
 *
 * **La misa no sale mal nunca** (Vera, 2 oct 2026): sube el ánimo con la fe y
 * lo que cuesta es el día de trabajo, que cobra `massWorkFactor` esta semana.
 * La rogativa cuesta fe y bendice la próxima siega (`rogationYield`).
 */
export function holdRite(state: GameState, rite: Rite, year: number): BoardOutcome {
  const open = ritesOpen(state).find((r) => r.id === rite)!;
  if (open.refusal !== null) return { done: false, refusal: open.refusal, entry: null };
  const params: Record<string, string | number> = { year, season: seasonOf(state.tick) };
  if (rite === 'mass') {
    const lift = Math.round(BOARDS.MASS_MORALE * state.village.faith / 100);
    state.village.morale = Math.min(100, state.village.morale + lift);
    state.flags['rite:mass'] = state.tick + BOARDS.MASS_EVERY;
    state.flags['rite:mass:at'] = state.tick;
    params['morale'] = lift;
  } else {
    state.village.faith = Math.max(0, state.village.faith - BOARDS.ROGATION_FAITH);
    state.flags['rite:rogation'] = nextHarvest(state.tick);
    state.flags['rite:rogation:at'] = state.tick;
    params['faith'] = BOARDS.ROGATION_FAITH;
  }
  return { done: true, refusal: null, entry: { kind: 'means', templateKey: `rite.${rite}.held`, params, weight: 2 } };
}

/** La parte de la obra y de la leña que se hace esta semana: menos el día de misa. */
export function massWorkFactor(state: GameState): number {
  return state.flags['rite:mass:at'] === state.tick ? 1 - BOARDS.MASS_WORK_LOSS : 1;
}

/** Lo que la rogativa añade a esta siega, si la bendice. La siega la consume. */
export function rogationYield(state: GameState): number {
  return state.flags['rite:rogation'] === state.tick ? BOARDS.ROGATION_YIELD : 1;
}
