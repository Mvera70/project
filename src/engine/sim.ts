// M-10 · Orchestration. design.md §4.2, §6.2.
//
// The only file that knows the order of the tick. Everything it calls belongs
// to somebody else; what lives here is the sequence, and the sequence is
// normative — changing it changes the balance and breaks saved games.

import { LABOUR, MIGRATION, PEOPLE, TIME } from './balance';
import {
  isHere,
  population,
  resolveBirths,
  resolveDeaths,
  resolveMigration,
} from './people/demography';
import { decayMemories } from './people/memories';
import { driftOpinions, opinionOf } from './people/opinions';
import { ageOf, minAgeFor, promoteToNamed } from './people/villagers';
import { pick } from './rng';
import type {
  Building,
  ChronicleEntry,
  Decision,
  DecisionRecord,
  DeathEvent,
  GameState,
  PathEvent,
  Role,
  TickContext,
  Villager,
} from './state';
import { seasonOf, weekOf, yearOf } from './time';
import { count } from './subsistence/building-counts';
import { allocateLabour, produce } from './subsistence/labour';
import { consume, overwinter } from './subsistence/consumption';
import { applySpoilage, harvest } from './subsistence/harvest';
import { isUnexplained, updateMood } from './subsistence/mood';
import { rollWeather } from './subsistence/seasons';
import { outbreakActive, rollFire, rollPlague } from './subsistence/disasters';
import { destroyBuilding } from './world/buildings';
import type { BuiltEvent } from './world/buildings';
import { advanceWorks, requestBuild } from './world/works';
import { fellForest, regrowForest } from './world/forest';
import { accrueTraffic, upgradePaths } from './world/paths';
import { holderOf } from './crossroads/conditions';
import { selectCrossroad } from './crossroads/select';
import { applyOption } from './crossroads/resolve';
import { fireSeeds } from './crossroads/seeds';
import type {
  AppliedEffects,
  Catalogue,
  CrossroadTemplate,
  FiredSeed,
} from './crossroads/schema';
import {
  anonDeathWeight,
  arrivalKey,
  birthKey,
  builtKey,
  builtWeight,
  deathKey,
  departureKey,
  fireKey,
  harvestKey,
  harvestWeight,
  lostKey,
  namedDeathEntry,
  seasonKey,
} from './chronicle/events';

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
    // A church is a chapel that grew (§7.3 point 9): it still consecrates.
    if (role === 'priest' && count(state, 'chapel') + count(state, 'church') === 0) continue;

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

// ---------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------

/** What one tick did. Nothing here is state; it is the account of the week. */
export interface TickReport {
  tick: number;
  severity: number;
  cold: boolean;
  deaths: DeathEvent[];
  births: number;
  arrived: number;
  left: number;
  buildPoints: number;
  built: BuiltEvent[];
  wood: number;
  felled: number;
  paths: PathEvent[];
  harvested: number;
  spoiled: number;
  fired: FiredSeed[];
  decided: AppliedEffects | null;
  posed: string | null;
  entries: ChronicleEntry[];
  ended: boolean;
}

/**
 * How the player answers. §12.9 measures four of these, and only one of them
 * stands in for somebody playing with their head on.
 *
 *   `prudent` scores each option and takes the best. **The reference policy**
 *            (§12.9, v2.13): the bands of the balance suite are measured with
 *            it, because a band measured with a policy that ruins itself says
 *            nothing about whether the game is winnable.
 *   `first`  takes the first option, which in almost every template is the
 *            accommodating one — and in a subsistence game the accommodating
 *            option is the spendthrift one. It never pays a present cost
 *            either, so it never raises the palisade and every template whose
 *            off-switch is a work of the player's stays lit for ever.
 *   `last`   takes the last, which is usually the defiant one. It pays now.
 *   `random` draws from the 'crossroads' stream, so a scripted game stays
 *            reproducible.
 *   `worst`  takes the option with the heaviest immediate cost, the adverse
 *            policy §12.9 uses to check that the village can be killed.
 *
 * The first three are bounds, not measurements. The spread between `prudent`
 * and `worst` is what principle 2 of valle.md is measured by: if playing well
 * and playing badly end in the same place, the player is a spectator.
 */
export type Policy =
  | 'first'
  | 'last'
  | 'random'
  | 'worst'
  | 'prudent'
  | ((state: GameState, options: readonly string[]) => string);

/**
 * §12.9's scoring for `prudent`, literally:
 *
 *   score = −(grain it costs) − 3·(morale lost)
 *           + 10·(if it plants no seed)
 *
 * No lookahead: it weighs what it can see this week, exactly as a villager
 * would. It is not optimal play and does not pretend to be — it is the floor
 * below which no reasonable player should fall.
 *
 * A gain counts as a negative cost, so an option that brings grain scores
 * above one that does not. The seed bonus is a preference for consequences the
 * village can still see coming, not a claim that seeds are always bad.
 *
 * **People lost are not in that sum** (v2.14, v2.42). Deaths once were, and putting them there
 * priced a life at forty bushels: there are options in the catalogue where that
 * came out cheap, and measured over 60 seeds `prudent` was dying of violence
 * three times as often as `first` — 14.1 % of its dead against 4.2 %. A cautious
 * villager does not trade inhabitants for grain at any exchange rate. Deaths
 * and immediate departures are a filter in `decide`, never a term in the score.
 */
function prudentScore(state: GameState, catalogue: Catalogue, optionId: string): number {
  const option = optionOf(state, catalogue, optionId);
  if (option === undefined) return Number.NEGATIVE_INFINITY;

  let grain = 0;
  let morale = 0;
  for (const e of option.effects) {
    if (e.k !== 'stat') continue;
    // A multiplier's cost depends on the stat as it stands right now, which is
    // the whole reason this is evaluated per tick and not per template.
    const delta = 'delta' in e ? e.delta : state.village[e.stat] * (e.mul - 1);
    if (e.stat === 'grain') grain -= delta;
    if (e.stat === 'morale') morale -= delta;
  }

  return -grain - 3 * morale + (option.seeds.length === 0 ? 10 : 0);
}

/** The option of the pending crossroad with this id, or undefined. */
function optionOf(
  state: GameState,
  catalogue: Catalogue,
  optionId: string,
): CrossroadTemplate['options'][number] | undefined {
  const template = catalogue.find((t) => t.id === state.crossroad?.templateId);
  return template?.options.find((o) => o.id === optionId);
}

/** How many people the option removes outright. §12.9's filter, not its score. */
function immediatePeopleLost(state: GameState, catalogue: Catalogue, optionId: string): number {
  const option = optionOf(state, catalogue, optionId);
  if (option === undefined) return 0;
  let dead = 0;
  for (const e of option.effects) {
    if (e.k === 'kill') {
      dead += e.count === 'fraction' ? population(state) * (e.fraction ?? 0) : e.count;
    } else if (e.k === 'leave') {
      dead += e.count ?? 1;
    }
  }
  return dead;
}

/**
 * How much an option costs the village right now. Used only by `worst`.
 *
 * Deliberately shallow: it weighs the immediate effects and ignores the seeds,
 * because an adverse player cannot see the seeds either. Deaths count heaviest,
 * then grain, then the two moods.
 */
function immediateCost(state: GameState, catalogue: Catalogue, optionId: string): number {
  const template = catalogue.find((t) => t.id === state.crossroad?.templateId);
  const option = template?.options.find((o) => o.id === optionId);
  if (option === undefined) return 0;

  let cost = 0;
  for (const e of option.effects) {
    if (e.k === 'kill') {
      cost += 40 * (e.count === 'fraction' ? population(state) * (e.fraction ?? 0) : e.count);
    } else if (e.k === 'leave') {
      cost += 40 * (e.count ?? 1);
    } else if (e.k === 'stat') {
      const delta = 'delta' in e ? e.delta : state.village[e.stat] * (e.mul - 1);
      cost -= delta * (e.stat === 'grain' ? 0.05 : e.stat === 'wood' ? 0.02 : 1);
    } else if (e.k === 'destroy') {
      cost += 10 * e.count;
    }
  }
  return cost;
}

/** Pick an option according to the policy. */
/**
 * §12.9's non-degeneracy rule, v2.24. Mandatory in all four measured policies.
 *
 * If the same option was chosen on the **two** previous appearances of this
 * template, it is off the table this time, provided there is anything else to
 * take. Nothing else about the policy changes: it picks as it always did, from
 * what is left.
 *
 * This corrects the instrument, not the game. Measured in v2.23, `last` and
 * `worst` answered `succession:no_one` 178 times out of 178 — `last` because it
 * is the last option written, `worst` because its immediate cost is the highest
 * — and 68.2 % of every decision they made went to that one option. Both
 * adverse thresholds of §12.9 then "passed" while measuring a single option
 * instead of the game, which is worse than failing: an assertion that passes
 * for the wrong reason has stopped warning anybody. Neither policy looks past
 * the current week, so neither can ever see the cost of repeating. A player who
 * plays badly does not pick the same thing a hundred and seventy-eight times.
 *
 * The bar is on the option, not on the policy's reasoning, so it reads the same
 * for all four and cannot depend on which one is asking.
 */
function withoutRepeats(state: GameState, options: readonly string[]): readonly string[] {
  const templateId = state.crossroad?.templateId;
  if (templateId === undefined || options.length < 2) return options;

  // `history` holds what was decided before this tick: `applyOption` appends in
  // step 3, and this runs before it.
  const past = state.history.filter((d) => d.templateId === templateId);
  if (past.length < 2) return options;

  const last = past[past.length - 1] as DecisionRecord;
  const before = past[past.length - 2] as DecisionRecord;
  if (last.optionId !== before.optionId) return options;

  const rest = options.filter((id) => id !== last.optionId);
  // A template with one option left cannot be varied, and being unable to obey
  // the rule is not a reason to stop answering the question.
  return rest.length > 0 ? rest : options;
}

export function decide(
  state: GameState,
  catalogue: Catalogue,
  policy: Policy,
): string | null {
  const all = state.crossroad?.optionIds ?? [];
  if (all.length === 0) return null;
  // A function policy is the caller's own reasoning and is left alone; `random`
  // does not degenerate, and barring an option would make it less random rather
  // than more representative.
  if (typeof policy === 'function') return policy(state, all);
  const options = policy === 'random' ? all : withoutRepeats(state, all);

  switch (policy) {
    case 'first':
      return options[0] ?? null;
    case 'last':
      return options[options.length - 1] ?? null;
    case 'random':
      return pick(state.rng, 'crossroads', options);
    case 'worst': {
      let worst = options[0] as string;
      let cost = immediateCost(state, catalogue, worst);
      for (const id of options.slice(1)) {
        const c = immediateCost(state, catalogue, id);
        // Ties break on the id, as prudent's have since v2.13: the order the
        // options happen to be written in must not move a balance number.
        if (c > cost || (c === cost && id < worst)) {
          cost = c;
          worst = id;
        }
      }
      return worst;
    }
    case 'prudent': {
      // §12.9, v2.14/v2.42: people lost are a filter, not a price. If anything
      // on the table removes nobody, only those options are considered; if all
      // do, the fewest lost win and the score decides between equals.
      const lost = new Map(options.map((id) => [id, immediatePeopleLost(state, catalogue, id)]));
      const fewest = Math.min(...lost.values());
      const survivable = options.filter((id) => lost.get(id) === fewest);

      // Ties break on the option's id, never on where it happens to sit in the
      // template (§12.9, v2.13): the order the options are written in must not
      // be able to move a balance number.
      let best: string | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const id of survivable) {
        const score = prudentScore(state, catalogue, id);
        if (score > bestScore || (score === bestScore && best !== null && id < best)) {
          bestScore = score;
          best = id;
        }
      }
      return best;
    }
    default:
      return options[0] ?? null;
  }
}

/**
 * One week. The seventeen steps of §4.2, in that order, and the order is
 * normative — changing it changes the balance and breaks saved games.
 *
 * Writes nothing to the console and draws nothing on screen. What it returns is
 * an account of the week; what it changes is the state it was given.
 */
export function tick(
  state: GameState,
  catalogue: Catalogue,
  decision?: Decision,
): TickReport {
  // The buffer of step 16. Nothing below writes to the chronicle directly:
  // every step pushes here and step 16 pours it out (§4.2).
  const buffer: ChronicleEntry[] = [];
  const say = (e: Omit<ChronicleEntry, 'tick'>): void => {
    buffer.push({ ...e, tick: state.tick });
  };
  const year = (): number => yearOf(state.tick);
  const season = (): string => seasonOf(state.tick);
  const deaths: DeathEvent[] = [];
  const reportVictims = (ids: readonly number[]): void => {
    const events: DeathEvent[] = [];
    for (const id of ids) {
      const v = state.people.villagers.find((person) => person.id === id);
      if (v === undefined || v.causeOfDeath === null) continue;
      events.push({ id, cause: v.causeOfDeath, age: ageOf(v, state.tick), named: v.named, role: v.role });
    }
    deaths.push(...events);
    reportDeaths(state, events, say, year, season);
  };

  // M-07 also supports standalone resolution and writes its own entries.
  // Move those entries into this tick's buffer immediately, keeping step 16
  // as the single flush and preserving ANNUAL → DECISION → SEEDS ordering.
  const captureEntries = <T>(resolve: () => T): T => {
    const start = state.chronicle.length;
    const result = resolve();
    buffer.push(...state.chronicle.splice(start));
    return result;
  };

  // ---- 1 · ADVANCE ---------------------------------------------------------
  state.tick += 1;

  // ---- 2 · ANNUAL ----------------------------------------------------------
  // Week 0 and week 0 only: the weather of the year, the plague, the fire, the
  // spring migration, and the offices that fell vacant (§6.2). There is no
  // ageing to do — ages derive from bornTick (§6.5).
  // An outbreak ceases to be state on the first tick after its last active
  // week. Keeping the expired object made mood apply its weekly penalty for
  // decades and prevented every later annual plague roll (v2.18).
  if (state.outbreak !== null && !outbreakActive(state, state.outbreak)) {
    state.outbreak = null;
  }
  let arrived = 0;
  let left = 0;
  let crossroadFelled = 0;
  const oldWoodStoodAtStart = state.flags['old_forest_gone'] === undefined;
  if (weekOf(state.tick) === 0) {
    state.weather = rollWeather(state);

    const outbreak = rollPlague(state);
    if (outbreak !== null) {
      state.outbreak = outbreak;
      say({ kind: 'plague', templateKey: 'plague.begins', params: { year: year(), season: season() }, weight: 3 });
    }

    // The fire of §5.9 comes back as a description; this is where it happens.
    const fire = rollFire(state);
    if (fire !== null) {
      // M-14 owns the destruction: the plot becomes a ruin and whoever slept
      // there is homeless this week, which the housing factor of §5.7 reads.
      destroyBuilding(state, fire.buildingId);
      state.village.grain = Math.max(0, state.village.grain - fire.grainLost);
      state.village.morale = Math.max(0, Math.min(100, state.village.morale + fire.moraleDelta));
      say({
        kind: 'fire',
        templateKey: fireKey(fire.kind),
        params: {
          year: year(),
          season: season(),
          building: fire.kind,
          grain: Math.round(fire.grainLost),
        },
        weight: 2, // §9.2: a fire is a fire, the granary included.
      });
    }

    for (const move of resolveMigration(state)) {
      const n = move.ids.length;
      if (move.kind === 'arrival') {
        arrived += n;
        say({
          kind: 'arrival',
          templateKey: arrivalKey(n),
          params: { year: year(), season: season(), count: n, people: population(state) },
          weight: 2,
        });
      } else {
        left += n;
        say({
          kind: 'departure',
          templateKey: departureKey(n),
          params: { year: year(), season: season(), count: n, people: population(state) },
          weight: 2,
        });
      }
    }

    decayMemories(state);
    fillVacancies(state);
  }

  // The turn of the season, at weight 1: the quiet ticking underneath.
  if (weekOf(state.tick) % 12 === 0) {
    say({ kind: 'season', templateKey: seasonKey(seasonOf(state.tick)), params: { year: year() }, weight: 1 });
  }

  // ---- 3 · DECISION --------------------------------------------------------
  let decided: AppliedEffects | null = null;
  if (decision !== undefined && state.crossroad?.templateId === decision.templateId) {
    decided = captureEntries(() => applyOption(state, decision.optionId, catalogue));
    if (decided !== null) {
      reportVictims(decided.killed);
      if (decided.left.length > 0) {
        left += decided.left.length;
        say({
          kind: 'departure',
          templateKey: departureKey(decided.left.length),
          params: { year: year(), season: season(), count: decided.left.length, people: population(state) },
          weight: 2,
        });
      }
      carryOutBuildings(state, decided, say);
      crossroadFelled += carryOutForest(state, decided);

      // Annex A.15, v2.22: `no_one` answered three times running, with no
      // leader appointed between them, and the valley gives up rather than
      // ask a fourth. `choose_a`/`choose_b` break the streak — a leader in
      // office, however briefly, makes next time a different question.
      if (decision.templateId === 'succession') {
        if (decision.optionId === 'no_one') {
          state.noOneStreak += 1;
          if (state.noOneStreak >= MIGRATION.NO_LEADER_DISPERSAL_STREAK && state.ended === null) {
            const scattering = population(state);
            for (const v of state.people.villagers) {
              if (isHere(v)) v.leftTick = state.tick;
            }
            state.ended = { tick: state.tick, cause: 'dispersed', lastId: null };
            say({
              kind: 'abandonment',
              templateKey: 'dispersal',
              params: { year: year(), season: season(), count: scattering },
              weight: 3,
            });
          }
        } else {
          state.noOneStreak = 0;
        }
      }
    }
  }

  // ---- 4 · SEEDS -----------------------------------------------------------
  const fired = captureEntries(() => fireSeeds(state, catalogue));
  for (const seed of fired) {
    if (seed.effects !== null) {
      reportVictims(seed.effects.killed);
      if (seed.effects.left.length > 0) {
        left += seed.effects.left.length;
        say({
          kind: 'departure',
          templateKey: departureKey(seed.effects.left.length),
          params: { year: year(), season: season(), count: seed.effects.left.length, people: population(state) },
          weight: 2,
        });
      }
      carryOutBuildings(state, seed.effects, say);
      crossroadFelled += carryOutForest(state, seed.effects);
    }
  }

  // ---- 5 · LABOUR ----------------------------------------------------------
  // The cutters can only bring back what is standing. M-15 fells it first and
  // says how much it actually got, which is §5.2's `woodCap`: a valley that has
  // been cut flat stops producing timber instead of producing it out of air.
  const allocation = allocateLabour(state);
  const felled = fellForest(state, allocation.cutters * LABOUR.WOOD_PER_CUTTER);
  const produced = produce(state, allocation, felled);
  // §9, v2.16: the one thing about the forest that is an event and not a state.
  if (oldWoodStoodAtStart && state.flags['old_forest_gone'] !== undefined) {
    say({
      kind: 'lost',
      templateKey: 'forest.old_gone',
      params: { year: year(), season: season() },
      weight: 2,
    });
  }

  // ---- 6 · WORKS -----------------------------------------------------------
  // M-14 spends the week's build points and opens the next project. The
  // chronicle line for a building is written when it is raised, never when it
  // is decided: a crossroad that grants a watchtower still has to build it.
  const built = advanceWorks(state, produced.buildPoints);
  for (const raised of built) {
    say({
      kind: 'built',
      templateKey: builtKey(raised.kind),
      params: {
        year: year(),
        season: season(),
        count: count(state, raised.kind),
        building: raised.kind,
      },
      weight: builtWeight(raised.kind, count(state, raised.kind)),
    });
  }

  // ---- 7 · CONSUME ---------------------------------------------------------
  // Before the harvest on purpose (§4.2): the week of the harvest is eaten
  // first and reaped after, which is what makes a bad autumn show in the
  // granary before the winter.
  const { severity, starved } = consume(state);
  reportVictims(starved);

  // ---- 8 · WINTER ----------------------------------------------------------
  const { cold } = overwinter(state);

  // ---- 9 · HARVEST ---------------------------------------------------------
  const reaped = harvest(state, allocation);
  if (reaped.happened) {
    say({
      kind: 'harvest',
      templateKey: harvestKey(reaped.weatherFactor),
      params: {
        year: year(),
        season: season(),
        grain: Math.round(reaped.yielded),
        people: population(state),
      },
      weight: harvestWeight(reaped.weatherFactor),
    });
  }

  // ---- 10 · STORAGE --------------------------------------------------------
  const spoiled = applySpoilage(state);

  // ---- 11 · DEATHS ---------------------------------------------------------
  const partial: TickContext = {
    severity,
    cold,
    outbreak: state.outbreak,
    deaths: deaths.length,
    unexplainedDeaths: 0,
  };
  const demographicDeaths = resolveDeaths(state, partial);
  deaths.push(...demographicDeaths);
  reportDeaths(state, demographicDeaths, say, year, season);

  // ---- 12 · MOOD -----------------------------------------------------------
  // After DEATHS since v2.5, so the mood sees the week's dead rather than last
  // week's, and the births of step 13 use a morale that is already up to date.
  const ctx: TickContext = {
    ...partial,
    deaths: deaths.length,
    unexplainedDeaths: deaths.filter((d) => isUnexplained(d.cause, d.age)).length,
  };
  updateMood(state, ctx);

  // ---- 13 · BIRTHS ---------------------------------------------------------
  const births = resolveBirths(state, ctx);
  if (births.length > 0) {
    const mother = state.people.villagers.find((v) => v.id === births[0]?.motherId);
    if (births.length === 1 && mother?.named === true) {
      say({
        kind: 'birth',
        templateKey: birthKey(true, births[0]?.female === true),
        params: { year: year(), season: season(), name: mother.name },
        weight: 1,
      });
    } else {
      say({
        kind: 'birth',
        templateKey: birthKey(false, false, births.length),
        params: { year: year(), season: season(), count: births.length, people: population(state) },
        weight: 1,
      });
    }
  }

  // ---- 14 · WORLD ----------------------------------------------------------
  // §7.5 and §7.6. The week's walking wears the ground, wear becomes a path,
  // and once a year the wood behind the cutters closes over again.
  //
  // Nothing here invalidates the routes on a building. A building is not an
  // obstacle: §7.6's cost reads the terrain and the path and nothing else, so
  // raising one changes no route. What it can change is where people are going,
  // and that is part of the route's cache key already.
  accrueTraffic(state);
  const paths = upgradePaths(state);
  regrowForest(state);

  // The week's living-together, which §6.4 puts nowhere in particular and which
  // has to happen once a week and only once.
  driftOpinions(state);

  // ---- 15 · CROSSROAD ------------------------------------------------------
  let posed: string | null = null;
  if (state.crossroad === null && state.ended === null) {
    const next = selectCrossroad(state, catalogue);
    if (next !== null) {
      state.crossroad = next;
      posed = next.templateId;
      const template = catalogue.find((t) => t.id === next.templateId);
      if (template !== undefined) {
        say({
          kind: 'crossroad_posed',
          templateKey: template.title,
          params: { year: year(), season: season() },
          // 9.2, v2.14: the question the player was asked is the spine of the
          // chronicle. At weight 2 it read below an ordinary harvest.
          weight: 3,
        });
      }
    }
  }

  // ---- 16 · CHRONICLE ------------------------------------------------------
  // Calculates nothing. The steps above filled a buffer and this pours it out.
  state.chronicle.push(...buffer);

  // ---- 17 · END ------------------------------------------------------------
  // §5.7's abandonment, checked before extinction so that the two are told
  // apart by which happened: a hamlet that walks out has people in it when it
  // does, and a village that dies has nobody.
  const living = population(state);
  if (living >= MIGRATION.VIABLE_POPULATION) {
    state.dwindlingSince = null;
  } else if (living > 0 && state.dwindlingSince === null) {
    state.dwindlingSince = state.tick;
  }

  if (
    state.ended === null &&
    living > 0 &&
    state.dwindlingSince !== null &&
    state.tick - state.dwindlingSince >= MIGRATION.ABANDON_YEARS * TIME.WEEKS_PER_YEAR
  ) {
    // They walk out; they do not die. `leftTick` is §5.7's own word for it, and
    // it keeps the mortality of §12.4 honest — nobody was killed by this.
    for (const v of state.people.villagers) {
      if (isHere(v)) v.leftTick = state.tick;
    }
    state.ended = { tick: state.tick, cause: 'abandoned', lastId: null };
    state.chronicle.push({
      tick: state.tick,
      kind: 'abandonment',
      templateKey: 'abandonment',
      params: { year: year(), season: season(), count: living },
      weight: 3,
    });
  }

  if (state.ended === null && population(state) === 0) {
    const last = [...state.people.villagers]
      .filter((v) => v.diedTick !== null)
      .sort((a, b) => (b.diedTick ?? 0) - (a.diedTick ?? 0))[0];
    state.ended = { tick: state.tick, cause: 'extinction', lastId: last?.id ?? null };
    state.chronicle.push({
      tick: state.tick,
      kind: 'extinction',
      templateKey: 'extinction',
      params: {
        year: year(),
        season: season(),
        name: last?.name !== undefined && last.name !== '' ? last.name : 'The last of them',
        age: last === undefined ? 0 : ageOf(last, state.tick),
      },
      weight: 3,
    });
  }

  return {
    tick: state.tick,
    severity,
    cold,
    deaths,
    births: births.length,
    arrived,
    left,
    buildPoints: produced.buildPoints,
    built,
    wood: produced.wood,
    felled: felled + crossroadFelled,
    paths,
    harvested: reaped.yielded,
    spoiled,
    fired,
    decided,
    posed,
    entries: buffer,
    ended: state.ended !== null,
  };
}

/**
 * §8.4's `build` and `destroy`, carried out by M-14's rules.
 *
 * A granted building is a **project**, not a building: `free: true` waives its
 * materials (§17 M-14, v2.12) and nothing else, so the plot is chosen now under
 * §7.4 and the village still has to raise it. That is why no chronicle line is
 * written here — step 6 writes it the week the thing actually stands.
 *
 * A destroyed building becomes a ruin on the map and empties its beds.
 */
function carryOutBuildings(
  state: GameState,
  applied: AppliedEffects,
  say: (e: Omit<ChronicleEntry, 'tick'>) => void,
): void {
  for (const kind of applied.build) requestBuild(state, kind);

  for (const { kind, count: howMany, blockYears } of applied.destroy) {
    const doomed = state.buildings
      .filter((b: Building) => b.kind === kind && b.lostTick === null)
      .slice(0, howMany);
    for (const b of doomed) destroyBuilding(state, b.id, blockYears ?? 0);
    if (doomed.length > 0) {
      say({
        kind: 'lost',
        templateKey: lostKey(kind),
        params: { year: yearOf(state.tick), season: seasonOf(state.tick), building: kind },
        weight: 2,
      });
    }
  }
}

/** §8.4's explicit removal of standing timber, using M-15's map rules. */
function carryOutForest(state: GameState, applied: AppliedEffects): number {
  let total = 0;
  for (const request of applied.fell) {
    total += fellForest(state, request.wood, request.permanent);
  }
  return total;
}

/**
 * A death goes into the chronicle by name if the village knew the name, and by
 * count if it did not (§6.1). A named death is weight 3 and carries what that
 * person was (§9.4).
 */
function reportDeaths(
  state: GameState,
  deaths: readonly DeathEvent[],
  say: (e: Omit<ChronicleEntry, 'tick'>) => void,
  year: () => number,
  season: () => string,
): void {
  const anonymous = new Map<string, number>();

  for (const death of deaths) {
    if (death.named) {
      const v = state.people.villagers.find((x) => x.id === death.id);
      if (v !== undefined) say(namedDeathEntry(state, v, death.cause));
      continue;
    }
    anonymous.set(death.cause, (anonymous.get(death.cause) ?? 0) + 1);
  }

  for (const [cause, n] of anonymous) {
    say({
      kind: 'death',
      templateKey: deathKey(cause as DeathEvent['cause'], false, n),
      params: { year: year(), season: season(), count: n, people: population(state) },
      weight: anonDeathWeight(cause as DeathEvent['cause']),
    });
  }
}

/**
 * Run the village forward. The loop the CLI and the lethargy of §13.2 share.
 *
 * A pending crossroad is answered on the tick after it was posed, which is what
 * gives §8.7 its teeth in a scripted game: the week of hesitation is a week the
 * village still ate.
 */
export function run(
  state: GameState,
  ticks: number,
  policy: Policy,
  catalogue: Catalogue,
): TickReport[] {
  const reports: TickReport[] = [];
  for (let i = 0; i < ticks && state.ended === null; i += 1) {
    const pending = state.crossroad;
    const optionId = pending === null ? null : decide(state, catalogue, policy);
    const decision: Decision | undefined =
      pending === null || optionId === null
        ? undefined
        : { templateId: pending.templateId, optionId };
    reports.push(tick(state, catalogue, decision));
  }
  return reports;
}
