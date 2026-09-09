// M-06 · Steps 5 and 6 of the tick: who works at what, and what comes of it.
// design.md §5.2, §5.4.
//
// Two things in the allocation look like inefficiencies and are not. Both are
// defended in §5.2 and neither may be "optimised away":
//
//   · workedFields is capped at what the village needs. A valley with eight
//     fields and few hands would otherwise spread itself thin and harvest less
//     than it would with four — counterintuitive and infuriating to watch.
//
//   · fifteen per cent of the labour is reserved for the works, borrowed back
//     off the farmers if nothing is left over. Without it a village short of
//     people puts everything into the fields, never builds, and the player
//     watches a valley that does not change — the cardinal sin of this game.

import { FOOD, FORAGE, LABOUR, TIME } from '../balance';
import { population, workforce } from '../people/demography';
import type { Allocation, GameState } from '../state';
import { count, smithyWorking } from './building-counts';
import { foragingUrgency, hasRiver } from './forage';
import { wardensWanted } from './crows';

/**
 * Step 5. Splits the week's labour. Pure: reads the state, writes nothing.
 *
 * §5.2, in order:
 *
 *   neededFields = ceil(people · 48 · 1.3 / FIELD_YIELD)
 *   workedFields = min(fields, neededFields, crewable)
 *   farmers      = min(W, workedFields · FIELD_CREW)
 *   spare        = W − farmers
 *   if spare < W · WORKS_RESERVE: borrow the difference back off the farmers
 *   cutters      = spare · CUTTER_SHARE
 *   builders     = spare − cutters
 */
export function allocateLabour(state: GameState): Allocation {
  const w = workforce(state);
  const people = population(state);

  const neededFields = Math.ceil(
    (people * TIME.WEEKS_PER_YEAR * FOOD.NEEDED_FIELDS_MARGIN) / FOOD.FIELD_YIELD,
  );
  // §5.2, v2.14: a field with fewer than MIN_FIELD_CREW on it yields nothing —
  // one pair of hands cannot plough, sow and reap a field. So the village works
  // no more fields than it can crew at that minimum.
  //
  // The labour measured against is what is left after the works reserve, not
  // the raw workforce: those hands are not standing in the field. Without that,
  // two survivors still crew one field, and two survivors reaping three hundred
  // bushels against ninety-six of consumption is the flat line §5.2 is written
  // to end — forty years of a village that neither dies nor recovers.
  const farmLabour = w * (1 - LABOUR.WORKS_RESERVE);
  const crewable = Math.floor(farmLabour / FOOD.MIN_FIELD_CREW);
  const workedFields = Math.min(count(state, 'field'), neededFields, crewable);
  const farmDemand = workedFields * FOOD.FIELD_CREW;

  let farmers = Math.min(w, farmDemand);
  let spare = w - farmers;

  const reserve = w * LABOUR.WORKS_RESERVE;
  if (spare < reserve) {
    const borrowed = Math.min(farmers, reserve - spare);
    farmers -= borrowed;
    spare += borrowed;
  }

  // §7.7, v2.93: the crows come first of the three, because the grain already
  // in the field is worth more than the grain nobody has hunted yet. Only in
  // the weeks before the reaping, and only up to what is spare: a village does
  // not take people off the harvest itself to guard it.
  const wardens = Math.min(spare, wardensWanted(state, workedFields));
  spare -= wardens;

  // §7.7, v2.92: before the wood and the works, the hungry village takes hands
  // off both and sends them out for food. Only when it is short — with a full
  // granary `urgency` is 0 and this whole block does nothing — and never more
  // than half of what is spare, so the works reserve above survives it.
  const grainYears = people > 0
    ? state.village.grain / (people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON)
    : Number.POSITIVE_INFINITY;
  const foragers = spare * FORAGE.MAX_SHARE * foragingUrgency(state, grainYears);
  spare -= foragers;

  // Half to the woods and half to the river, and all of it to whichever the
  // valley actually has. A map with no water fishes nothing; that is why the
  // river being on the map matters before anyone eats from it.
  const river = hasRiver(state);
  const hunters = river ? foragers * 0.5 : foragers;
  const fishers = river ? foragers - hunters : 0;

  const cutters = spare * LABOUR.CUTTER_SHARE;
  const builders = spare - cutters;

  return {
    workforce: w,
    workedFields,
    farmers,
    cutters,
    builders,
    hunters,
    fishers,
    wardens,
    // No fields worked means no harvest at all, so the factor is 0 rather than
    // a division by zero.
    labourFactor: farmDemand > 0 ? farmers / farmDemand : 0,
  };
}

/**
 * Step 6. The week's wood and build points. §5.2, §5.4.
 *
 * The wood goes into the village store, which is what §5.4 says. The build
 * points do NOT: they are handed back so that M-10 can pass them to M-14's
 * `advanceWorks`. Parking them in the state would add a field that only exists
 * between two steps of the same tick, and would have to be saved and migrated.
 *
 * `woodCap` is how much the forest can actually give this week. M-15 owns the
 * forest and will supply it; until then the cap is off and the cutters are
 * limited only by their own hands.
 */
export function produce(
  state: GameState,
  a: Allocation,
  woodCap: number = Number.POSITIVE_INFINITY,
): { wood: number; buildPoints: number } {
  const cut = a.cutters * LABOUR.WOOD_PER_CUTTER;
  const wood = Math.max(0, Math.min(cut, woodCap));
  state.village.wood += wood;

  const active = (flag: string): boolean => {
    const until = state.flags[flag];
    return until !== undefined && (until === 0 || until > state.tick);
  };
  let worksFactor = 1;
  if (active('works_slowed_85')) worksFactor = Math.min(worksFactor, 0.85);
  if (active('works_slowed_80')) worksFactor = Math.min(worksFactor, 0.8);
  if (active('works_slowed_40')) worksFactor = Math.min(worksFactor, 0.4);

  const buildPoints = a.builders * LABOUR.BP_PER_BUILDER *
    (smithyWorking(state) ? LABOUR.SMITHY_BONUS : 1) * worksFactor;

  return { wood, buildPoints };
}
