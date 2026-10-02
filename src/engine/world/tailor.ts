// K5 · La sastrería y su tablón (§7.18, v5.76, 2 oct 2026).
//
// Vera, el 2 oct: la tela es, de momento, **sólo ropa**; se pide **en la
// sastrería**, que es un edificio con su tablón como la herrería, y es una
// regla general suya —«los encargos se piden en el edificio del oficio que los
// hace; la plaza queda para cosas excepcionales»—; el encargo dura un año; y
// el lino **ocupa uno de los campos de trigo**: comida contra tela.
//
// Dos encargos, cada uno por un año y uno de cada a la vez:
//
//   flax      un campo se siembra de lino: en la siega da lienzo en vez de
//             grano (`subsistence/harvest.ts`). Pide cuatro campos o más.
//   clothes   la tejedora cose ropa nueva con el lienzo: ánimo cada semana
//             mientras dura (`subsistence/mood.ts`).
//
// **Nada de esto tira dados**: un acto del jugador no puede desplazar la
// partida (§4.3). Todo en `state.flags`, sin subir el esquema:
//
//   tailor:<encargo>     caducidad del encargo (tick)
//   tailor:flax:field    el id del campo sembrado de lino (para la pantalla)

import { FOOD, TAILOR, TIME } from '../balance';
import { isHere, population } from '../people/demography';
import type { ChronicleEntry, GameState, TailorOrder, VillageStats } from '../state';
import { TAILOR_ORDERS } from '../state';
import { seasonOf } from '../time';
import { count, standing } from '../subsistence/building-counts';

/** Por qué no se puede pedir un encargo de la sastrería. */
export type TailorRefusal = 'ended' | 'tailor' | 'weaver' | 'busy' | 'fields' | 'cost';

export interface TailorOrderOpen {
  readonly id: TailorOrder;
  readonly cost: Readonly<Partial<Record<keyof VillageStats, number>>>;
  readonly refusal: TailorRefusal | null;
  /** Hasta qué tick dura este encargo, si está en marcha. */
  readonly until: number | null;
}

/** Si el encargo `order` está en marcha esta semana. */
export function tailorOrderLive(state: GameState, order: TailorOrder): boolean {
  return (state.flags[`tailor:${order}`] ?? -1) > state.tick;
}

/** El campo sembrado de lino, si lo hay: el más lejano de la plaza, a igualdad el de id mayor. */
export function flaxField(state: GameState): number | null {
  if (!tailorOrderLive(state, 'flax')) return null;
  const id = state.flags['tailor:flax:field'];
  return id === undefined ? null : id;
}

/** Los campos que la aldea necesita para comer, como los cuenta la cola de obras (§5.2). */
function neededFields(state: GameState): number {
  return Math.ceil((population(state) * TIME.WEEKS_PER_YEAR * FOOD.NEEDED_FIELDS_MARGIN) / FOOD.FIELD_YIELD);
}

function farthestField(state: GameState): number | null {
  const { x: px, y: py } = state.plaza;
  const fields = standing(state, 'field')
    .map((b) => ({ id: b.id, d: Math.hypot(b.x + b.w / 2 - px, b.y + b.h / 2 - py) }))
    .sort((a, b) => b.d - a.d || b.id - a.id);
  return fields[0]?.id ?? null;
}

/** El tablón de la sastrería: los dos encargos, con por qué no si no se puede. */
export function tailorOrdersOpen(state: GameState): TailorOrderOpen[] {
  const workshop = standing(state, 'tailor').length > 0;
  const weaver = state.people.villagers.some((v) => isHere(v) && v.role === 'weaver');
  return TAILOR_ORDERS.map((id) => {
    const cost: Partial<Record<keyof VillageStats, number>> = TAILOR.ORDERS[id];
    const until = tailorOrderLive(state, id) ? state.flags[`tailor:${id}`]! : null;
    const refusal: TailorRefusal | null = state.ended !== null ? 'ended'
      : !workshop ? 'tailor'
        : !weaver ? 'weaver'
          : until !== null ? 'busy'
            : id === 'flax' && (count(state, 'field') < TAILOR.FLAX_MIN_FIELDS || neededFields(state) < TAILOR.FLAX_MIN_FIELDS) ? 'fields'
              : Object.entries(cost).some(([stat, amount]) => state.village[stat as keyof VillageStats] < (amount ?? 0)) ? 'cost'
                : null;
    return { id, cost, refusal, until };
  });
}

/** Lo que devuelve pedir un encargo: si se hizo, por qué no, y la línea de crónica. */
export interface TailorOutcome {
  readonly done: boolean;
  readonly refusal: TailorRefusal | null;
  readonly entry: Omit<ChronicleEntry, 'tick'> | null;
}

/** Paso 1b · el jugador encarga algo a la sastrería. Se paga aquí y dura un año. */
export function orderTailor(state: GameState, order: TailorOrder, year: number): TailorOutcome {
  const open = tailorOrdersOpen(state).find((o) => o.id === order)!;
  if (open.refusal !== null) return { done: false, refusal: open.refusal, entry: null };
  for (const [stat, amount] of Object.entries(open.cost)) {
    const key = stat as keyof VillageStats;
    state.village[key] = Math.max(0, state.village[key] - (amount ?? 0));
  }
  state.flags[`tailor:${order}`] = state.tick + TAILOR.ORDER_WEEKS;
  if (order === 'flax') {
    const field = farthestField(state);
    if (field !== null) state.flags['tailor:flax:field'] = field;
  }
  return {
    done: true,
    refusal: null,
    entry: {
      kind: 'means',
      templateKey: `tailor.${order}.ordered`,
      params: { year, season: seasonOf(state.tick), linen: open.cost.linen ?? 0 },
      weight: 2,
    },
  };
}

/** Cada semana, antes de la economía: el encargo que se acaba se cuenta y se borra. */
export function tailorWeek(state: GameState, year: number): Omit<ChronicleEntry, 'tick'>[] {
  const out: Omit<ChronicleEntry, 'tick'>[] = [];
  for (const order of TAILOR_ORDERS) {
    const key = `tailor:${order}`;
    const until = state.flags[key];
    if (until === undefined || state.tick < until) continue;
    delete state.flags[key];
    if (order === 'flax') delete state.flags['tailor:flax:field'];
    out.push({ kind: 'means', templateKey: `tailor.${order}.done`, params: { year, season: seasonOf(state.tick) }, weight: 1 });
  }
  return out;
}
