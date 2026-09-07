// M-07 · Which crossroad, and when. design.md §8.6.
//
// Two rules pull against each other on purpose. The ceiling says one every 120
// ticks at most, because a crossroad that comes up every few weeks stops being
// a decision and becomes a menu. The guarantee says at least one every 960,
// because a generation with nothing to decide is a generation the player did
// not play. Between them the village is quiet for long stretches and then asks
// something.
//
// The catalogue is a parameter. M-08 writes it and M-10 passes it in; M-07
// never reaches for a global, which is also what lets the tests drive this with
// a handful of fake templates.

import { CROSSROADS, TIME } from '../balance';
import { population } from '../people/demography';
import { weighted } from '../rng';
import type { GameState, PendingCrossroad, VillagerId } from '../state';
import { fillCast } from './cast';
import { all, flagSet, holderOf, outbreakRunning, weeksToHarvest } from './conditions';
import type { Catalogue, CrossroadCategory, CrossroadTemplate, ScoredTemplate } from './schema';

/** The reserve template of §8.6, used when the guarantee fires and nothing fits. */
export const FALLBACK_ID = 'quiet_years';

/**
 * What kind of trouble the village is in, or null if none. §8.6.
 *
 * The projected famine is the one that needed a formula: `grain < people ·
 * (weeks to week 35)` — the pantry does not reach the next harvest. It fires
 * before anyone has starved, which is the point: the crossroad about the grain
 * has to arrive while there is still a decision to make about it.
 */
export function crisisOf(state: GameState): CrossroadCategory | null {
  const people = population(state);
  if (people > 0 && state.village.grain < people * weeksToHarvest(state.tick)) return 'famine';
  if (outbreakRunning(state)) return 'plague';
  if (flagSet(state, 'threatened')) return 'lord';
  if (holderOf(state, 'leader') === null) return 'succession';
  return null;
}

/**
 * When the office of leader fell vacant, or null if it is filled.
 *
 * §6.6 gives `succession` the one exemption from the ceiling: the death of a
 * leader always asks, immediately. "Always" means once per death — the office
 * staying empty afterwards is not a new death, and a template that skipped the
 * ceiling on the strength of a standing vacancy would fire every other tick
 * until somebody took the job.
 */
export function leaderVacantSince(state: GameState): number | null {
  if (holderOf(state, 'leader') !== null) return null;
  let latest = 0;
  for (const v of state.people.villagers) {
    if (v.role === 'leader' && v.diedTick !== null && v.diedTick > latest) latest = v.diedTick;
  }
  return latest;
}

/** When the village was last asked something. §8.6. */
export function lastCrossroadTick(state: GameState): number {
  let last = -1;
  for (const d of state.history) if (d.tick > last) last = d.tick;
  if (state.crossroad !== null && state.crossroad.posedTick > last) {
    last = state.crossroad.posedTick;
  }
  return last;
}

function timesSeen(state: GameState, templateId: string): number {
  return state.history.filter((d) => d.templateId === templateId).length;
}

/**
 * When the village last answered a question of this category. -1 if never.
 *
 * Needs the catalogue because `history` records the template, not its category:
 * the category is a property of the template, and duplicating it into the save
 * would be a second source of truth for something that never changes.
 */
function lastTickOfCategory(
  state: GameState,
  catalogue: Catalogue,
  category: CrossroadCategory,
): number {
  let last = -1;
  for (const d of state.history) {
    const t = catalogue.find((x) => x.id === d.templateId);
    if (t?.category === category && d.tick > last) last = d.tick;
  }
  return last;
}

/** How long since this template last came up, in years. Infinity if never. */
function yearsSince(state: GameState, templateId: string): number {
  let last = -1;
  for (const d of state.history) if (d.templateId === templateId && d.tick > last) last = d.tick;
  return last < 0 ? Number.POSITIVE_INFINITY : (state.tick - last) / TIME.WEEKS_PER_YEAR;
}

/**
 * The trait multiplier of §8.6: the cast's own traits weigh on whether their
 * story gets told. A `spiteful` villager makes the feud template likelier; the
 * weights are declared per option in §8.1 and the strongest opinion any option
 * has about a trait is the one that counts.
 */
function traitMultiplier(t: CrossroadTemplate, cast: Record<string, VillagerId>, state: GameState): number {
  const traits = new Set(
    Object.values(cast).flatMap(
      (id) => state.people.villagers.find((v) => v.id === id)?.traits ?? [],
    ),
  );
  if (traits.size === 0) return 1;

  let mult = 1;
  for (const trait of traits) {
    let strongest = 1;
    for (const option of t.options) {
      const w = option.traitWeight?.[trait];
      if (w !== undefined && Math.abs(w - 1) > Math.abs(strongest - 1)) strongest = w;
    }
    mult *= strongest;
  }
  return mult;
}

/**
 * Every template that could fire right now, scored. §8.6.
 *
 * A template is in only if all its `requires` hold, its cooldown has run out,
 * it has not been used up, the year is late enough, and its cast can be filled.
 * Casting consumes from the 'cast' stream, so eligibility is not free — but it
 * is the same cost every tick, which keeps it deterministic.
 */
export function eligible(state: GameState, catalogue: Catalogue): ScoredTemplate[] {
  const crisis = crisisOf(state);
  const out: ScoredTemplate[] = [];

  for (const t of catalogue) {
    // La reserva no compite: §8.6 la usa cuando NO hay ninguna elegible, y
    // dejarla en la baraja la convertía en el 57 % de los ticks elegibles y en
    // una de cada seis encrucijadas.
    if (t.id === FALLBACK_ID) continue;
    if (t.minYear !== undefined && Math.floor(state.tick / TIME.WEEKS_PER_YEAR) < t.minYear) continue;
    if (t.maxPerGame !== undefined && timesSeen(state, t.id) >= t.maxPerGame) continue;
    if (yearsSince(state, t.id) < t.cooldownYears) continue;
    if (!all(t.requires, state)) continue;

    const cast = fillCast(t, state);
    if (cast === null) continue;

    const crisisMult = crisis !== null && t.category === crisis ? CROSSROADS.CRISIS_MULTIPLIER : 1;
    const noveltyMult = timesSeen(state, t.id) > 0 ? CROSSROADS.NOVELTY_MULTIPLIER : 1;
    const traitMult = traitMultiplier(t, cast, state);

    out.push({
      template: t,
      cast,
      weight: t.weight,
      crisis: crisisMult,
      trait: traitMult,
      novelty: noveltyMult,
      score: t.weight * crisisMult * traitMult * noveltyMult,
    });
  }

  // A total order, so that a weighted draw over this list is reproducible
  // whatever order the catalogue happens to be written in.
  return out.sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id));
}

/**
 * Step 15 of the tick. Returns the crossroad to pose, or null.
 *
 * §8.6 says a crisis jumps the minimum interval, and §6.6 gives `succession`
 * the same exemption on the death of a leader. Both mean **once**, not once a
 * tick: a famine lasts months and an empty office lasts until somebody takes
 * it, and an exemption that held for the whole of either would fire a crossroad
 * every other week and turn the decision into a menu — which is precisely what
 * the ceiling exists to prevent.
 *
 * So the exemption is spent on the first question. A crisis lets a crossroad of
 * its own category through the ceiling; having just answered one of those, the
 * village waits out the ceiling like anyone else. The succession is stricter
 * still: the exemption belongs to a death nobody has been asked about yet.
 *
 * The guarantee overrides the weighted draw rather than joining it — after 960
 * quiet ticks the village gets its best question, not a random one.
 */
export function selectCrossroad(state: GameState, catalogue: Catalogue): PendingCrossroad | null {
  if (state.crossroad !== null) return null;

  const last = lastCrossroadTick(state);
  const since = state.tick - last;
  const crisis = crisisOf(state);
  const guaranteed = since >= CROSSROADS.GUARANTEE_TICKS;

  const candidates = eligible(state, catalogue);

  // The succession exemption belongs to a death nobody has been asked about.
  const vacantSince = leaderVacantSince(state);
  const succession =
    vacantSince !== null && last < vacantSince
      ? candidates.filter((c) => c.template.category === 'succession')
      : [];

  // Any other crisis spends its exemption on the first question of its own kind.
  const crisisJumps =
    crisis !== null &&
    crisis !== 'succession' &&
    state.tick - lastTickOfCategory(state, catalogue, crisis) >= CROSSROADS.MIN_TICKS_BETWEEN;

  let chosen: ScoredTemplate | undefined;

  if (since < CROSSROADS.MIN_TICKS_BETWEEN) {
    // Under the ceiling only the crisis's OWN question may pass, and only the
    // best one. A famine is a reason to ask about the grain; it is not a reason
    // to ask what to do with a surplus, and letting it wave everything through
    // turns the ceiling off for whole decades at a time.
    const allowed =
      succession.length > 0
        ? succession
        : crisisJumps
          ? candidates.filter((c) => c.template.category === crisis)
          : [];
    if (allowed[0] === undefined) return null;
    return pose(state, allowed[0].template, allowed[0].cast);
  }

  if (candidates.length === 0) {
    if (!guaranteed) return null;
    const fallback = catalogue.find((t) => t.id === FALLBACK_ID);
    if (fallback === undefined) return null;
    const cast = fillCast(fallback, state);
    if (cast === null) return null;
    return pose(state, fallback, cast);
  } else if (guaranteed) {
    chosen = candidates[0]; // the best question, not a random one
  } else {
    chosen = weighted(state.rng, 'crossroads', candidates, (c) => c.score);
  }

  if (chosen === undefined) return null;
  return pose(state, chosen.template, chosen.cast);
}

function pose(
  state: GameState,
  t: CrossroadTemplate,
  cast: Record<string, VillagerId>,
): PendingCrossroad {
  return {
    templateId: t.id,
    posedTick: state.tick,
    cast,
    // Only the options whose own `requires` hold are offered (§8.1).
    optionIds: t.options.filter((o) => o.requires === undefined || all(o.requires, state)).map((o) => o.id),
  };
}
