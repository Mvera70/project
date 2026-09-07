// M-10 · Orchestration. design.md §4.2, §6.2.
//
// The only file that knows the order of the tick. Everything it calls belongs
// to somebody else; what lives here is the sequence, and the sequence is
// normative — changing it changes the balance and breaks saved games.

import { PEOPLE } from './balance';
import { isHere } from './people/demography';
import { opinionOf } from './people/opinions';
import { ageOf, minAgeFor, promoteToNamed } from './people/villagers';
import type { GameState, Role, Villager } from './state';
import { count } from './subsistence/building-counts';
import { holderOf } from './crossroads/conditions';

/** The offices a village fills on its own. §6.2. */
const RENEWABLE_ROLES: readonly Role[] = ['smith', 'midwife', 'priest', 'woodward', 'reeve'];

/**
 * How well the rest of the village thinks of somebody. §6.2.
 *
 * Note it is zero for every anonymous villager, because opinions only exist
 * between the named (§6.4) and a candidate for a vacancy is by definition not
 * named yet. So today this only ever decides nothing and the tie-break — the
 * youngest — is what picks. It is written the way §6.2 words it so that the day
 * an anonymous villager can be disliked, the rule already reads them.
 */
function standing(state: GameState, id: number): number {
  const judges = state.people.namedIds
    .map((nid) => state.people.villagers.find((v) => v.id === nid))
    .filter((v): v is Villager => v !== undefined && isHere(v) && v.id !== id);
  if (judges.length === 0) return 0;
  return judges.reduce((sum, j) => sum + opinionOf(state, j.id, id), 0) / judges.length;
}

/**
 * Step 2 of the tick, in week 0: an office that fell empty gets filled. §6.2.
 *
 * The candidate comes from the band between the role's floor and
 * `ROLE_MAX_PREFERRED`; the best-regarded wins and the youngest breaks the tie.
 * Only if the band is empty does it widen upwards.
 *
 * "Chosen by age" does NOT mean "the oldest". Reading it that way ages the
 * whole cast within a few decades — the offices go to elders, the elders die
 * soon, and the succession fires at twice its natural rate. It also means
 * nobody is ever seen growing old in an office, which is half of the long loop.
 *
 * The leader is not on the list on purpose: that vacancy is a decision the
 * player makes (§6.6), and filling it here would kill the one template that is
 * the heartbeat of the long loop.
 */
export function fillVacancies(state: GameState): void {
  for (const role of RENEWABLE_ROLES) {
    if (holderOf(state, role) !== null) continue;
    // §6.2: no chapel, no priest. The office simply stays vacant.
    if (role === 'priest' && count(state, 'chapel') === 0) continue;

    const floor = minAgeFor(role);
    const free = state.people.villagers.filter(
      (v) =>
        isHere(v) &&
        !v.named &&
        v.role === null &&
        ageOf(v, state.tick) >= floor &&
        (role !== 'midwife' || v.female),
    );
    if (free.length === 0) continue;

    const inBand = free.filter((v) => ageOf(v, state.tick) <= PEOPLE.ROLE_MAX_PREFERRED);
    const pool = inBand.length > 0 ? inBand : free;

    const best = [...pool].sort(
      (a, b) =>
        standing(state, b.id) - standing(state, a.id) ||
        ageOf(a, state.tick) - ageOf(b, state.tick) ||
        a.id - b.id,
    )[0];
    if (best !== undefined) promoteToNamed(state, best.id, role);
  }
}
