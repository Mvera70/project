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

import { FOOD, LABOUR, TIME } from '../balance';
import { population, workforce } from '../people/demography';
import type { Allocation, GameState } from '../state';
import { count, smithyWorking } from './building-counts';

/**
 * Step 5. Splits the week's labour. Pure: reads the state, writes nothing.
 *
 * §5.2, in order:
 *
 *   neededFields = ceil(people · 48 · 1.3 / FIELD_YIELD)
 *   workedFields = min(fields, neededFields)
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
  const workedFields = Math.min(count(state, 'field'), neededFields);
  const farmDemand = workedFields * FOOD.FIELD_CREW;

  let farmers = Math.min(w, farmDemand);
  let spare = w - farmers;

  const reserve = w * LABOUR.WORKS_RESERVE;
  if (spare < reserve) {
    const borrowed = Math.min(farmers, reserve - spare);
    farmers -= borrowed;
    spare += borrowed;
  }

  const cutters = spare * LABOUR.CUTTER_SHARE;
  const builders = spare - cutters;

  return {
    workforce: w,
    workedFields,
    farmers,
    cutters,
    builders,
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

  const buildPoints =
    a.builders * LABOUR.BP_PER_BUILDER * (smithyWorking(state) ? LABOUR.SMITHY_BONUS : 1);

  return { wood, buildPoints };
}
