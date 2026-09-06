// M-04 · Being born, growing old, dying, arriving, leaving.
// design.md §5.2, §5.7, §6.5, §12.4.
//
// The formulas are §6.5's and §5.7's, transcribed and not reinterpreted. What
// this module does NOT do is decide how hungry or how cold the village is:
// that arrives in the TickContext, computed by M-06. Step 12 of the tick must
// not recompute what step 7 already worked out.
//
// Every step photographs its list before it starts (§4.2): a newborn cannot
// die in the tick it is born, and somebody who dies this tick fathers nobody.

import { BIRTH, DEATH, DISASTER, FOUNDING, LABOUR, LIFE, MIGRATION, TIME } from '../balance';
import { int, next, pick } from '../rng';
import type {
  BirthEvent,
  DeathCause,
  DeathEvent,
  GameState,
  MigrationEvent,
  TickContext,
  Villager,
  VillagerId,
} from '../state';
import { weekOf } from '../time';
import { ageOf, makeVillager } from './villagers';

// ---------------------------------------------------------------------------
// Counting heads
// ---------------------------------------------------------------------------

/** Alive and still in the valley. The dead and the departed are neither. */
export function isHere(v: Villager): boolean {
  return v.diedTick === null && v.leftTick === null;
}

/** Everyone the village has to feed. design.md §3.3. */
export function population(state: GameState): number {
  return state.people.villagers.filter(isHere).length;
}

/** Beds under a roof. Stone houses are upgraded houses and still sleep five. */
export function housingCapacity(state: GameState): number {
  const houses = state.buildings.filter(
    (b) => b.lostTick === null && (b.kind === 'house' || b.kind === 'stone_house'),
  ).length;
  return houses * LIFE.HOUSE_CAPACITY;
}

/** Spare beds. Negative when the village is sleeping on floors. */
export function freeBeds(state: GameState): number {
  return housingCapacity(state) - population(state);
}

/**
 * The week's labour, W of §5.2:
 *
 *   W = (adults 15-59) · 1.0 + (12-14 and 60-69) · 0.5
 *
 * The children under twelve and the very old count for nothing. They still eat.
 */
export function workforce(state: GameState): number {
  let w = 0;
  for (const v of state.people.villagers) {
    if (!isHere(v)) continue;
    const age = ageOf(v, state.tick);
    if (age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1]) {
      w += 1;
    } else if (
      (age >= LABOUR.HALF_WORKER_YOUNG[0] && age <= LABOUR.HALF_WORKER_YOUNG[1]) ||
      (age >= LABOUR.HALF_WORKER_OLD[0] && age <= LABOUR.HALF_WORKER_OLD[1])
    ) {
      w += LABOUR.HALF_WORKER_SHARE;
    }
  }
  return w;
}

// ---------------------------------------------------------------------------
// Dying
//
// There is no `ageEveryone`. Ages are derived from `bornTick` in calendar years
// (§6.5), so every birthday already falls on week 0 and there is no field to
// increment at the year boundary. What does happen in week 0 — weather, plague,
// fire, migration, filling vacant offices — is step 2 of the tick and lives in
// sim.ts.
// ---------------------------------------------------------------------------

/** The annual base rate for an age, from the table of §12.4. */
export function annualMortality(age: number): number {
  for (const band of LIFE.MORTALITY) {
    if (age <= band.to) return band.rate;
  }
  return LIFE.MORTALITY[LIFE.MORTALITY.length - 1]?.rate ?? 0;
}

/** The plague hits the very young and the old harder. design.md §5.8. */
function plagueHazard(age: number): number {
  const weak = age <= DISASTER.PLAGUE_WEAK_MAX_AGE || age >= DISASTER.PLAGUE_WEAK_MIN_AGE;
  return weak ? DISASTER.PLAGUE_HAZARD_WEAK : DISASTER.PLAGUE_HAZARD_ADULT;
}

/** §6.3: hardy ×0.7, frail ×1.6. Nobody carries both (traits.ts OPPOSED). */
function traitMortality(v: Villager): number {
  if (v.traits.includes('hardy')) return LIFE.HARDY;
  if (v.traits.includes('frail')) return LIFE.FRAIL;
  return 1;
}

/**
 * Step 12 of the tick. design.md §6.5.
 *
 *   weekly = annualRate(age)/48, multiplied by
 *     · 1 + 2 · severity        (hunger)
 *     · 1.4 if cold             (winter with no firewood)
 *     · the trait modifier
 *   and combined with the plague as 1 − (1−p)(1−hazard).
 *
 * The cause of death falls out of one draw rather than a second one: the
 * thresholds are nested in the order the multipliers are applied, so whoever
 * dies is attributed to whatever pushed them over. A villager who dies at the
 * bare age rate dies of age even in a famine year.
 */
export function resolveDeaths(state: GameState, ctx: TickContext): DeathEvent[] {
  const events: DeathEvent[] = [];
  const outbreakActive =
    ctx.outbreak !== null && state.tick >= ctx.outbreak.startedTick && state.tick < ctx.outbreak.endsTick;

  // Photographed before the first death: the list must not shift underfoot.
  const present = state.people.villagers.filter(isHere);

  for (const v of present) {
    const age = ageOf(v, state.tick);

    const pAge = (annualMortality(age) / TIME.WEEKS_PER_YEAR) * traitMortality(v);
    const pHunger = pAge * (1 + DEATH.HUNGER_MULT * ctx.severity);
    const pCold = pHunger * (ctx.cold ? LABOUR.COLD_MORTALITY : 1);
    const base = Math.min(1, pCold);
    const hazard = outbreakActive ? plagueHazard(age) : 0;
    const total = 1 - (1 - base) * (1 - hazard);

    const r = next(state.rng, 'deaths');
    if (r >= total) continue;

    let cause: DeathCause;
    if (r < Math.min(pAge, base)) cause = 'age';
    else if (r < Math.min(pHunger, base)) cause = 'starvation';
    else if (r < base) cause = 'cold';
    else cause = 'plague';

    v.diedTick = state.tick;
    v.causeOfDeath = cause;
    events.push({ id: v.id, cause, age, named: v.named, role: v.role });
  }

  // The named leave the roster the moment they die. Their opinions and the
  // grudges against them stay untouched: that housekeeping is M-05's, and the
  // dependency must not run in this direction.
  if (events.length > 0) {
    const gone = new Set(events.map((e) => e.id));
    state.people.namedIds = state.people.namedIds.filter((id) => !gone.has(id));
  }

  return events;
}

// ---------------------------------------------------------------------------
// Being born
// ---------------------------------------------------------------------------

/**
 * Step 13 of the tick. design.md §6.5.
 *
 *   p = BIRTH_BASE · foodFactor · moraleFactor · housingFactor
 *   foodFactor    = clamp(grain / (people · 24), 0, 1.2)
 *   moraleFactor  = 0.6 + 0.8 · morale/100
 *   housingFactor = freeBeds >= 3 ? 1.3 : (freeBeds >= 1 ? 1.0 : 0.15)
 */
export function resolveBirths(state: GameState, ctx: TickContext): BirthEvent[] {
  // §6.5's birth formula reads the village stats, not the tick context: a
  // famine reaches it through `grain`, which is already near zero by then. The
  // parameter is in the M-04 contract so every resolver has the same shape.
  void ctx;

  const people = population(state);
  if (people === 0) return [];

  const beds = freeBeds(state);
  const foodFactor = Math.max(
    0,
    Math.min(BIRTH.FOOD_FACTOR_MAX, state.village.grain / (people * BIRTH.FOOD_WEEKS)),
  );
  const moraleFactor = BIRTH.MORALE_BASE + BIRTH.MORALE_SPAN * (state.village.morale / 100);
  const housingFactor =
    beds >= BIRTH.HOUSING_GOOD_BEDS
      ? BIRTH.HOUSING_GOOD
      : beds >= BIRTH.HOUSING_SOME_BEDS
        ? BIRTH.HOUSING_SOME
        : BIRTH.HOUSING_NONE;

  const p = LIFE.BIRTH_BASE * foodFactor * moraleFactor * housingFactor;

  // Photographed before the first birth: a baby born this tick is not a mother
  // this tick, and the odds do not shift as the village grows mid-step.
  const mothers = state.people.villagers.filter(
    (v) =>
      isHere(v) &&
      v.female &&
      ageOf(v, state.tick) >= LIFE.FERTILE[0] &&
      ageOf(v, state.tick) <= LIFE.FERTILE[1],
  );
  const fathers = state.people.villagers.filter(
    (v) =>
      isHere(v) &&
      !v.female &&
      ageOf(v, state.tick) >= LIFE.ADULT[0] &&
      ageOf(v, state.tick) <= LIFE.ADULT[1],
  );

  const events: BirthEvent[] = [];
  for (const mother of mothers) {
    if (next(state.rng, 'births') >= p) continue;

    // §6.5: the father is drawn among the living adults, preferring the one who
    // shares her house. Before there are any buildings every homeId is null, so
    // "shares her house" is true of everyone and this falls through to the
    // general case without a special path.
    const sameHome = fathers.filter((f) => f.homeId !== null && f.homeId === mother.homeId);
    const pool = sameHome.length > 0 ? sameHome : fathers;
    const father = pool.length > 0 ? pick(state.rng, 'births', pool) : null;

    const child = makeVillager({
      id: state.people.nextId,
      female: next(state.rng, 'births') < 0.5,
      bornTick: state.tick,
      parentIds: [mother.id, father?.id ?? null],
      homeId: mother.homeId,
    });
    state.people.nextId += 1;
    state.people.villagers.push(child);
    events.push({
      id: child.id,
      motherId: mother.id,
      fatherId: father?.id ?? null,
      female: child.female,
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Arriving and leaving
// ---------------------------------------------------------------------------

/** A flag is set while it has no expiry (0) or its expiry is still ahead. */
function flagSet(state: GameState, flag: string): boolean {
  const until = state.flags[flag];
  if (until === undefined) return false;
  return until === 0 || until > state.tick;
}

/**
 * Step 2 of the tick, week 0 only. design.md §5.7.
 *
 * Arrival needs all five gates open — people, morale, grain reserve, no
 * `hostile` flag, and free beds — and then wins a 0.30 roll. Departure needs
 * morale under 30 and then a roll of (30 − morale)/60.
 *
 * The two cannot both happen: one wants morale >= 50 and the other morale < 30.
 *
 * Outsiders are the main engine of early growth (§5.7). Biology alone grows the
 * village too slowly for the first generation to be worth watching.
 */
export function resolveMigration(state: GameState): MigrationEvent[] {
  if (weekOf(state.tick) !== 0) return [];

  const people = population(state);
  const grainYears = people > 0
    ? state.village.grain / (people * TIME.WEEKS_PER_YEAR * 1)
    : Number.POSITIVE_INFINITY;

  const gatesOpen =
    people >= MIGRATION.ARRIVE_MIN_PEOPLE &&
    state.village.morale >= MIGRATION.ARRIVE_MIN_MORALE &&
    grainYears >= MIGRATION.ARRIVE_MIN_GRAIN_YEARS &&
    !flagSet(state, 'hostile') &&
    freeBeds(state) >= MIGRATION.ARRIVE_MIN_FREE_BEDS;

  if (gatesOpen) {
    if (next(state.rng, 'births') >= MIGRATION.ARRIVE_CHANCE) return [];
    return [arrive(state)];
  }

  if (state.village.morale < MIGRATION.LEAVE_BELOW_MORALE) {
    const chance = (MIGRATION.LEAVE_BELOW_MORALE - state.village.morale) / MIGRATION.LEAVE_SCALE;
    if (next(state.rng, 'births') >= chance) return [];
    const event = depart(state);
    return event === null ? [] : [event];
  }

  return [];
}

/**
 * Two to four strangers, a mix of young adults and children (§5.7). They are
 * anonymous: no name, no role, no traits. One of them may be promoted later,
 * and that is when a character is born (§6.2).
 *
 * The roll that decides whether anyone comes runs on 'births'; who they turn
 * out to be runs on 'names', the same stream the founding draws its ages and
 * sexes from.
 */
function arrive(state: GameState): MigrationEvent {
  const count = int(state.rng, 'births', MIGRATION.ARRIVE_COUNT[0], MIGRATION.ARRIVE_COUNT[1]);
  const ids: VillagerId[] = [];

  for (let i = 0; i < count; i += 1) {
    const child = next(state.rng, 'names') < MIGRATION.ARRIVE_CHILD_SHARE;
    const range = child ? FOUNDING.AGE_RANGES.children : MIGRATION.ARRIVE_ADULT_AGE;
    const age = int(state.rng, 'names', range[0] as number, range[1] as number);
    const female = next(state.rng, 'names') < 0.5;

    const v = makeVillager({
      id: state.people.nextId,
      female,
      bornTick: state.tick - age * TIME.WEEKS_PER_YEAR,
    });
    state.people.nextId += 1;
    state.people.villagers.push(v);
    ids.push(v.id);
  }

  return { kind: 'arrival', ids };
}

/**
 * One to three walk out. Only the anonymous leave: a named villager walking off
 * is a story, and stories are what the crossroads are for — letting one vanish
 * here would take a character out of the chronicle with nothing said.
 *
 * They are not dead. `leftTick` is what marks them gone; nobody is ever removed
 * from `villagers` (§3.4).
 */
function depart(state: GameState): MigrationEvent | null {
  const leavers = state.people.villagers.filter((v) => isHere(v) && !v.named);
  if (leavers.length === 0) return null;

  const count = Math.min(
    leavers.length,
    int(state.rng, 'births', MIGRATION.LEAVE_COUNT[0], MIGRATION.LEAVE_COUNT[1]),
  );

  const ids: VillagerId[] = [];
  const pool = [...leavers];
  for (let i = 0; i < count; i += 1) {
    const v = pick(state.rng, 'births', pool);
    pool.splice(pool.indexOf(v), 1);
    v.leftTick = state.tick;
    ids.push(v.id);
  }

  return { kind: 'departure', ids };
}
