// M-10 · Orchestration. design.md §4.2, §6.2.
//
// The only file that knows the order of the tick. Everything it calls belongs
// to somebody else; what lives here is the sequence, and the sequence is
// normative — changing it changes the balance and breaks saved games.

import { PEOPLE } from './balance';
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
  DeathEvent,
  GameState,
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
import { rollFire, rollPlague } from './subsistence/disasters';
import { destroyBuilding } from './world/buildings';
import type { BuiltEvent } from './world/buildings';
import { advanceWorks, requestBuild } from './world/works';
import { holderOf } from './crossroads/conditions';
import { selectCrossroad } from './crossroads/select';
import { applyOption } from './crossroads/resolve';
import { fireSeeds } from './crossroads/seeds';
import type { AppliedEffects, Catalogue, FiredSeed } from './crossroads/schema';
import {
  arrivalKey,
  birthKey,
  builtKey,
  deathKey,
  departureKey,
  fireKey,
  harvestKey,
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
  harvested: number;
  spoiled: number;
  fired: FiredSeed[];
  decided: AppliedEffects | null;
  posed: string | null;
  entries: ChronicleEntry[];
  ended: boolean;
}

/**
 * How the player answers. §12.9 measures two of these, and neither is neutral.
 *
 *   `first`  takes the first option, which in almost every template is the
 *            accommodating one: it never pays a present cost. It never raises
 *            the palisade, so `bandits` never switches itself off. Calling it
 *            "neutral" is what let the cadence measurements of M-08 read
 *            higher than the game will play.
 *   `last`   takes the last, which is usually the defiant one. It pays now.
 *   `random` draws from the 'crossroads' stream, so a scripted game stays
 *            reproducible.
 *   `worst`  takes the option with the heaviest immediate cost, which is the
 *            adverse policy §12.9 uses to check that the village can be killed.
 *
 * The truth about a balance number lies between `first` and `last`, which is
 * why both are reported and neither is called neutral.
 */
export type Policy =
  | 'first'
  | 'last'
  | 'random'
  | 'worst'
  | ((state: GameState, options: readonly string[]) => string);

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
export function decide(
  state: GameState,
  catalogue: Catalogue,
  policy: Policy,
): string | null {
  const options = state.crossroad?.optionIds ?? [];
  if (options.length === 0) return null;
  if (typeof policy === 'function') return policy(state, options);

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
        if (c > cost) {
          cost = c;
          worst = id;
        }
      }
      return worst;
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
  let arrived = 0;
  let left = 0;
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
        weight: fire.kind === 'granary' ? 3 : 2,
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
      carryOutBuildings(state, decided, say);
    }
  }

  // ---- 4 · SEEDS -----------------------------------------------------------
  const fired = captureEntries(() => fireSeeds(state, catalogue));
  for (const seed of fired) {
    if (seed.effects !== null) {
      reportVictims(seed.effects.killed);
      carryOutBuildings(state, seed.effects, say);
    }
  }

  // ---- 5 · LABOUR ----------------------------------------------------------
  const allocation = allocateLabour(state);
  const produced = produce(state, allocation);

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
      weight: raised.kind === 'chapel' || raised.kind === 'church' ? 3 : 2,
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
      weight: reaped.weatherFactor < 0.7 || reaped.weatherFactor > 1.3 ? 3 : 2,
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
  // Traffic, paths, forest regrowth and lighting are M-15's. Nothing here yet.

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
          weight: 2,
        });
      }
    }
  }

  // ---- 16 · CHRONICLE ------------------------------------------------------
  // Calculates nothing. The steps above filled a buffer and this pours it out.
  state.chronicle.push(...buffer);

  // ---- 17 · END ------------------------------------------------------------
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

  for (const { kind, count: howMany } of applied.destroy) {
    const doomed = state.buildings
      .filter((b: Building) => b.kind === kind && b.lostTick === null)
      .slice(0, howMany);
    for (const b of doomed) destroyBuilding(state, b.id);
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
      weight: n > 2 ? 2 : 1,
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
