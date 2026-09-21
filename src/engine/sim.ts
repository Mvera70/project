// M-10 · Orchestration. design.md §4.2, §6.2.
//
// The only file that knows the order of the tick. Everything it calls belongs
// to somebody else; what lives here is the sequence, and the sequence is
// normative — changing it changes the balance and breaks saved games.

import { CROWS, FORAGE, LABOUR, MIGRATION, PEOPLE, TIME, MEANS } from './balance';
import {
  isHere,
  population,
  resolveBirths,
  resolveDeaths,
  resolveMigration,
} from './people/demography';
import { decayMemories } from './people/memories';
import { passedOver } from './people/minds';
import { driftOpinions, opinionOf } from './people/opinions';
import { quarrelOf } from './people/quarrels';
import { rubShoulders, workedTogether } from './people/neighbours';
import { ageOf, minAgeFor, promoteToNamed } from './people/villagers';
import { pick } from './rng';
import type {
  HappeningId,
  Building,
  BuildingKind,
  ChronicleEntry,
  Decision,
  PlayerAct,
  DecisionRecord,
  DeathEvent,
  GameState,
  PathEvent,
  Role,
  TickContext,
  Villager,
  VillagerId,
} from './state';
import { TERRAIN_CODE, hasTrait } from './state';
import { seasonOf, weekOf, yearOf } from './time';
import { count } from './subsistence/building-counts';
import { allocateLabour, produce } from './subsistence/labour';
import { forage } from './subsistence/forage';
import { crowsPeck } from './subsistence/crows';
import { consume, overwinter } from './subsistence/consumption';
import { tendHerd, type HerdReport } from './subsistence/herd';
import { applySpoilage, harvest } from './subsistence/harvest';
import { isUnexplained, updateMood } from './subsistence/mood';
import { rollWeather } from './subsistence/seasons';
import { outbreakActive, rollFire, rollPlague } from './subsistence/disasters';
import { scarFire } from './people/scars';
import { destroyBuilding } from './world/buildings';
import { rollFate } from './world/fate';
import { giveMeans } from './world/means';
import { crownKing, type CrownOutcome } from './world/crown';
import type { MeansOutcome } from './world/means';
import { collectTithe, expireOffer, settleOffer } from './world/road';
import type { OfferOutcome, Tithe } from './world/road';
import type { BuiltEvent } from './world/buildings';
import { advanceWorks, requestBuild } from './world/works';
import { ringClosed } from './world/placement';
import { advanceThreat, type Battle } from './world/threat';
import { fellForest, fellForestWithLocation, regrowForest } from './world/forest';
import { neighbours4 } from './world/tiles';
import { accrueTraffic, routesFor, upgradePaths } from './world/paths';
import { holderOf, ratioOf } from './crossroads/conditions';
import { selectCrossroad } from './crossroads/select';
import { applyOption } from './crossroads/resolve';
import { fireSeeds } from './crossroads/seeds';
import type {
  AppliedEffects,
  Catalogue,
  CrossroadTemplate,
  FiredSeed,
  VisualEffect,
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
    if (best !== undefined) {
      promoteToNamed(state, best.id, role);
      // §6.3, v3.61 · y a quien se creia con derecho le sienta mal. Va despues
      // de la promocion porque resiente al que se lo quedo, no al puesto.
      passedOver(state, best.id);
    }
  }
}

// ---------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------

/**
 * A `VisualEffect` (§8.4) names a kind of change, never a cell — the catalogue
 * writes "raise a field", not a coordinate. `locate` (below) is what turns one
 * into a place, so the interface can point a camera at it (§2.60, §17 M-22):
 * the engine says what changed and where, never where to look.
 */
interface PositionedVisualEffect {
  effect: VisualEffect;
  x: number;
  y: number;
}

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
  /** What the herd did this week (§7.7): eaten, slaughtered, bred, taken. */
  herd: HerdReport;
  decided: AppliedEffects | null;
  /** `decided`'s own `visible`, each placed on the map. Empty if nothing was decided this tick. */
  visualEffects: PositionedVisualEffect[];
  /** R-1 · el suceso del valle de este tick, si lo hubo (§7.10). */
  happening: HappeningId | null;
  /** M-0 · lo que pasó con la oferta del camino por lo que hizo el jugador. */
  offer: OfferOutcome | null;
  /** M-2 · lo que el jugador metió en el valle esta semana, si metió algo. */
  means: MeansOutcome | null;
  /** K-1 · la coronación de esta semana, si la hubo. */
  crown: CrownOutcome | null;
  /** M-0 · el diezmo, la semana que se cobra. */
  tithe: Tithe | null;
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
 * The centre of the valley: standing buildings averaged, or the map's own
 * centre before anything has been raised. It is also where the Sunday crowd
 * gathers (`render/crowd.ts`'s `plaza`) and where the woodcutters walk from
 * (`world/forest.ts`'s `core`) — the same figure, kept as its own copy here
 * because engine code cannot import render, and because this round's brief is
 * `app.ts` and this file only, not the two modules that already have it.
 */
function valleyCore(state: GameState): { x: number; y: number } {
  const standing = state.buildings.filter((b) => b.lostTick === null);
  if (standing.length === 0) return { x: state.map.width / 2, y: state.map.height / 2 };
  return {
    x: standing.reduce((sum, b) => sum + b.x + b.w / 2, 0) / standing.length,
    y: standing.reduce((sum, b) => sum + b.y + b.h / 2, 0) / standing.length,
  };
}

/** The one standing building of this kind, or null if there are zero or several. */
function theStanding(state: GameState, kind: BuildingKind): Building | null {
  const found = state.buildings.filter((b) => b.kind === kind && b.lostTick === null);
  return found.length === 1 ? (found[0] as Building) : null;
}

function centreOf(b: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/**
 * The landward end of the ford road: walkable ground beside water, nearest the
 * village core, then lower cell index. Paths cannot occupy water (§7.6), so a
 * literal "path cell crossing the river" cannot exist in this map model.
 *
 * Exported because the 3D render draws stepping stones there, and G-10 found
 * out the hard way what happens when a place the fiction names is worked out
 * twice: `render/gatherings.ts` has its own guess and it is a different place.
 * This is the one the game means — where strangers arrive, where the wolves are
 * hunted from. It reads the state and writes nothing.
 */
export function ford(state: GameState): { x: number; y: number } {
  const core = valleyCore(state);
  const hasFord = state.map.terrain.includes(TERRAIN_CODE.ford);
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    const terrain = state.map.terrain[cell];
    if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.marsh) continue;
    // **La orilla del paso de verdad, si el valle tiene uno.** Desde que el
    // vado es terreno (`TERRAIN_CODE.ford`), el sitio que la ficción nombra
    // existe en el mapa y esta función ya no tiene que adivinarlo: se busca la
    // orilla que da al vado, y sólo si no hay ninguna se cae a cualquier orilla
    // del río, que es lo que hacía siempre.
    const touchesFord = neighbours4(cell)
      .some((next) => state.map.terrain[next] === TERRAIN_CODE.ford);
    if (hasFord !== touchesFord) continue;
    if (!touchesFord
      && !neighbours4(cell).some((next) => state.map.terrain[next] === TERRAIN_CODE.water)) continue;
    const x = cell % state.map.width;
    const y = Math.floor(cell / state.map.width);
    const distance = (x + 0.5 - core.x) ** 2 + (y + 0.5 - core.y) ** 2;
    if (distance < bestDistance || (distance === bestDistance && cell < best)) {
      best = cell;
      bestDistance = distance;
    }
  }
  return best < 0
    ? core
    : { x: (best % state.map.width) + 0.5, y: Math.floor(best / state.map.width) + 0.5 };
}

/** The building this cast letter calls home, standing, if there is one. */
function homeOf(
  state: GameState,
  cast: Record<string, VillagerId> | undefined,
  who: string,
): Building | null {
  const id = cast?.[who];
  if (id === undefined) return null;
  const villager = state.people.villagers.find((v) => v.id === id);
  if (villager === undefined || villager.homeId === null) return null;
  const home = state.buildings.find((b) => b.id === villager.homeId && b.lostTick === null);
  return home ?? null;
}

/**
 * Where a `VisualEffect` just applied actually happened (§2.60, §17 M-22).
 * Reads the state *after* `carryOutBuildings`/`carryOutForest` ran this tick,
 * so a fresh work-in-progress or a fresh ruin is found by "did this change on
 * `state.tick`", never by guessing which building an option meant. `cast` is
 * the pending crossroad's own — captured before `applyOption` clears it — so
 * `douse ... who` can resolve to whichever letter it names (§8.1, §11.5,
 * v2.62): A.7 promised "B's building", and a kind alone cannot say which one.
 *
 * Two cases still have nothing to point at, and fall back to `valleyCore`
 * rather than inventing a cell:
 *
 *   - `douse`/`gather:'chapel'` without a `who` that resolves, on a kind the
 *     village has more than one of standing — the effect names a kind, never
 *     an instance, so which one is not knowable from here.
 *   - `banner` — schema.ts's own comment settles it: "a banner over the core".
 */
function locate(
  state: GameState,
  effect: VisualEffect,
  cast: Record<string, VillagerId> | undefined,
  felledCell: number | null,
): { x: number; y: number } {
  switch (effect.k) {
    case 'raise': {
      const work = state.works.find((w) => w.kind === effect.kind && w.startedTick === state.tick);
      return work !== undefined ? centreOf(work) : valleyCore(state);
    }
    case 'ruin': {
      const ruin = state.buildings.find((b) => b.kind === effect.kind && b.lostTick === state.tick);
      return ruin !== undefined ? centreOf(ruin) : valleyCore(state);
    }
    case 'douse': {
      const home = effect.who !== undefined ? homeOf(state, cast, effect.who) : null;
      if (home !== null) return centreOf(home);
      const building = theStanding(state, effect.kind);
      return building !== null ? centreOf(building) : valleyCore(state);
    }
    case 'scar': {
      if (effect.what === 'burnt_field') {
        const field = state.buildings.find((b) => b.kind === 'field' && b.lostTick === state.tick);
        return field !== undefined ? centreOf(field) : valleyCore(state);
      }
      if (effect.what === 'grave_row') {
        const yard = theStanding(state, 'grave_yard');
        return yard !== null ? centreOf(yard) : valleyCore(state);
      }
      return felledCell === null
        ? valleyCore(state)
        : { x: (felledCell % state.map.width) + 0.5, y: Math.floor(felledCell / state.map.width) + 0.5 };
    }
    case 'gather': {
      if (effect.where === 'chapel') {
        const chapel = theStanding(state, 'chapel') ?? theStanding(state, 'church');
        if (chapel !== null) return centreOf(chapel);
      }
      return effect.where === 'ford' ? ford(state) : valleyCore(state);
    }
    case 'banner':
      return valleyCore(state);
    default:
      return valleyCore(state);
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
  acts: readonly PlayerAct[] = [],
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

  // ---- 1b · ACTS (M-0) ------------------------------------------------------
  // Lo que el jugador hizo esta semana sin que nadie le preguntara: contestar a
  // quien espera en el camino. **Antes que nada del mundo**, porque contestó al
  // valle tal como lo vio, y antes de que un suceso de esta semana pudiera
  // poner otra oferta en su sitio. No consume ninguna tirada: un acto no puede
  // desplazar la partida (`world/road.ts`). Y queda en `state.acts`, que es lo
  // que mantiene el guardado reproducible.
  let offer: OfferOutcome | null = null;
  let means: MeansOutcome | null = null;
  let crown: CrownOutcome | null = null;
  let battle: Battle | undefined;
  for (const act of acts) {
    if (act.kind === 'offer') {
      const outcome = settleOffer(state, act.accept, seasonOf(state.tick), yearOf(state.tick));
      state.acts.push({ tick: state.tick, act, done: outcome !== null && !outcome.refused });
      if (outcome === null) continue;
      offer = outcome;
      if (outcome.entry !== null) say(outcome.entry);
    } else if (act.kind === 'means') {
      // M-2 · dar un medio. Se paga aquí y lo que abra lo abren los sistemas de
      // la aldea por su cuenta: el arado libera brazos en el reparto de §5.2,
      // los cerdos llaman a los lobos de §7.10, y el barril se celebra en el
      // paso 2b de esta misma semana.
      const outcome = giveMeans(state, act.means, seasonOf(state.tick), yearOf(state.tick));
      state.acts.push({ tick: state.tick, act, done: outcome.given });
      means = outcome;
      if (outcome.entry !== null) say(outcome.entry);
    } else if (act.kind === 'crown') {
      // K-1 · dar la corona. Es el mismo verbo que un medio —se paga con lo del
      // valle y la aldea decide qué hace con ello— sólo que lo que se da es a
      // **alguien**: desde esta semana, lo que ese alguien quiere lo leen el
      // reparto de manos, la cola de obras, el ánimo y los sucesos.
      const outcome = crownKing(state, act.who, seasonOf(state.tick), yearOf(state.tick));
      state.acts.push({ tick: state.tick, act, done: outcome.crowned });
      crown = outcome;
      for (const entry of outcome.entries) say(entry);
    } else {
      // B4 · **lo que el mundo hizo.** El único acto que no hace el jugador: el
      // parte de la batalla física de la semana pasada (§1b). No se aplica
      // aquí —lo aplica `advanceThreat`, que es quien sabe si había un asalto
      // por resolver— y se apunta como cualquier otro acto, que es lo que hace
      // que una partida guardada siga contando la misma historia.
      //
      // `done` dice si de verdad había batalla que contar: un parte sin asalto
      // pendiente no hace nada, igual que una oferta que ya no se puede pagar.
      battle = act;
      state.acts.push({ tick: state.tick, act, done: state.flags['assault'] !== undefined });
    }
  }
  // Y quien esperaba y no tuvo respuesta, sigue camino.
  const gone = expireOffer(state, seasonOf(state.tick), yearOf(state.tick));
  if (gone !== null) say(gone);

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
      // §7.9, v2.99: before the building is destroyed, because afterwards
      // nobody's `homeId` points at it any more and there would be no way to
      // tell whose roof it was. A granary burning marks nobody, which is right:
      // `scarFire` only writes for whoever actually lived there.
      scarFire(state, fire.buildingId);
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

    decayMemories(state);
    fillVacancies(state);
  }

  // ---- 2a · QUIEN LLEGA Y QUIEN SE VA (§5.7) --------------------------------
  // **Sigue siendo el paso 2 y en el mismo sitio de la secuencia**; lo que
  // cambia desde B-1 es que ya no se pregunta sólo en la semana 0 del año. El
  // compás lo pone `MIGRATION.ARRIVE_EVERY_WEEKS`/`_SMALL` y `resolveMigration`
  // lo respeta por su cuenta: una aldea hecha recibe una vez al año, la joven
  // una vez por estación. El motivo, en horas reales, está escrito en
  // `balance.ts`: a catorce minutos por semana, una tirada al año era una
  // tirada cada once horas de juego, y las veinte personas costaban ciento
  // treinta y ocho.
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

  // ---- 2a bis · EL CLAN DEL VALLE VECINO (B1, §1b) --------------------------
  // Va aquí, entre lo que le pasa a la aldea por el año (paso 2) y lo que le
  // pasa por azar (2b), porque es de la misma clase que los dos: algo que el
  // mundo hace y la aldea encaja. Y va **antes** de los sucesos para que un
  // asalto y un rayo no se pisen en la misma semana: lo que se cuenta primero
  // es lo que trae gente armada.
  const raid = advanceThreat(state, battle);
  if (raid !== null) {
    // B2 · el aviso, la vuelta y el saqueo: tres cosas que contar, y sólo una
    // por semana. El aviso es lo que da sentido a las ocho semanas de margen —
    // el valle se entera y `crisisOf` abre la pregunta de §8.6— y la vuelta es
    // lo que se ve cuando se les pagó.
    if (raid.kind === 'coming') {
      say({
        kind: 'raid',
        templateKey: 'raid.coming',
        params: { year: year(), season: season(), count: raid.band },
        weight: 3,
      });
    } else if (raid.kind === 'turned_back') {
      say({
        kind: 'raid',
        templateKey: 'raid.turned_back',
        params: { year: year(), season: season(), count: raid.band },
        weight: 3,
      });
    } else if (raid.kind === 'held') {
      // B4 · **el cerco aguantó**, y esta línea sólo existe porque alguien
      // peleó la batalla: sin parte, un asalto siempre entra.
      say({
        kind: 'raid',
        templateKey: 'raid.held',
        params: {
          year: year(),
          season: season(),
          count: raid.band,
          slain: raid.slain,
          fallen: raid.fallen,
        },
        weight: 3,
      });
    } else if (raid.kind === 'stormed') {
      // B3 · **el final que no es la aldea acabándose sola.** `advanceThreat` ya
      // ha puesto `state.ended`: aquí sólo se cuenta, y con peso 3, que es lo
      // que §9.2 reserva para el momento del siglo.
      say({
        kind: 'raid',
        templateKey: 'raid.stormed',
        params: {
          year: year(),
          season: season(),
          count: raid.band,
          fallen: raid.fallen,
        },
        weight: 3,
      });
    } else if (raid.sack !== null) {
      const sack = raid.sack;
      say({
        kind: 'raid',
        // B4 · y si esto es el asalto grande, se dice al llegar: el jugador
        // tiene una semana para verlo venir, que es la semana en la que la
        // batalla física se pelea.
        templateKey: raid.kind === 'assault' ? 'raid.assault'
          : sack.walled ? 'raid.walled' : 'raid.open',
        params: {
          year: year(),
          season: season(),
          count: raid.band,
          silver: sack.silver,
          grain: sack.grain,
        },
        // §9.2, peso 3: una partida armada bajando al valle es de lo que se
        // cuenta en la crónica de una aldea, como la peste o la sucesión.
        weight: 3,
      });
      if (sack.beast !== null) {
        say({
          kind: 'raid',
          templateKey: 'raid.beast',
          params: { year: year(), season: season(), animal: sack.beast },
          weight: 2,
        });
      }
    }
  }

  // ---- 2b · LOS SUCESOS DEL VALLE (R-1, §7.10) ------------------------------
  // Después de los desastres anuales y antes de la decisión: lo que le pasa al
  // valle esta semana por su cuenta. `rollFate` ya ha cambiado el estado
  // cuando vuelve; aquí sólo se cuenta y se apunta lo que hay que enseñar.
  const fated = rollFate(state);
  if (fated !== null) {
    state.happenings.push(fated.record);
    say(fated.entry);
  }

  // The turn of the season, at weight 1: the quiet ticking underneath.
  if (weekOf(state.tick) % 12 === 0) {
    say({ kind: 'season', templateKey: seasonKey(seasonOf(state.tick)), params: { year: year() }, weight: 1 });
  }

  // ---- 3 · DECISION --------------------------------------------------------
  let decided: AppliedEffects | null = null;
  let visualEffects: PositionedVisualEffect[] = [];
  if (decision !== undefined && state.crossroad?.templateId === decision.templateId) {
    // §11.5, v2.62: `applyOption` clears `state.crossroad` before it returns,
    // so the cast has to be read now or `douse ... who` has nothing to resolve.
    const cast = state.crossroad.cast;
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
      const crossroadForest = carryOutForest(state, decided);
      crossroadFelled += crossroadForest.wood;
      // §2.60, §17 M-22: the interface enfoca from this list; the engine only
      // says what changed and where. Placed here and not earlier because a
      // `raise`/`ruin` needs the work opened or the building actually lost —
      // both just happened, two lines up.
      visualEffects = decided.visible.map((effect) => ({
        effect,
        ...locate(state, effect, cast, crossroadForest.firstCell),
      }));

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
      crossroadFelled += carryOutForest(state, seed.effects).wood;
    }
  }

  // ---- 5 · LABOUR ----------------------------------------------------------
  // The cutters can only bring back what is standing. M-15 fells it first and
  // says how much it actually got, which is §5.2's `woodCap`: a valley that has
  // been cut flat stops producing timber instead of producing it out of air.
  const allocation = allocateLabour(state);
  // M-4 · **el hacha buena** del carro (§7.12): cada leñador trae más leña, y
  // el bosque del corazón retrocede más rápido. Lo segundo no hay que
  // escribirlo aquí: la riada ya pesa con el bosque que ya no está (M-1).
  const axe = hasTrait(state, 'axe') ? MEANS.AXE_WOOD : 1;
  const felled = fellForest(state, allocation.cutters * LABOUR.WOOD_PER_CUTTER * axe);
  const produced = produce(state, allocation, felled);
  // §7.7, v2.92: the hands the allocation sent out come back with food. The
  // forest fraction is read here and passed in because `subsistence/` may not
  // look at `world/`, the same rule that makes `produce` take its wood cap.
  // §7.7, v2.93: the birds take their week's share of the harvest that is
  // still standing. Nothing is said here week by week — six lines about crows
  // in six weeks would drown the chronicle. The year's total is told at the
  // reaping, where it can be compared with what came in.
  crowsPeck(state, allocation);
  const foraged = forage(state, allocation, ratioOf(state, 'forestLeft'));
  // **Una temporada de caza se cuenta una vez, no cada semana.**
  //
  // Es la misma regla que las líneas de arriba aplican a los cuervos —«seis
  // líneas sobre cuervos en seis semanas ahogarían la crónica»— y que aquí no
  // se había aplicado. Medido con `tools/reports/notice-report.ts` sobre cinco semillas
  // y cuarenta años: **2 831 de los 3 309 avisos que el jugador ve sobre el
  // valle eran éste**, el 86 %, quinientos sesenta y seis por partida. El valle
  // decía la misma frase catorce veces al año durante cuarenta años, y ésa es
  // la mitad de «los mensajes rápidos son horrorosos»: no la frase, la repetición.
  //
  // Cazar y pescar es un **estado** —el granero está bajo y hay gente en el
  // monte—, y §11.6 dice que los estados van a la tira de §11.1 y los sucesos
  // al aviso. El suceso es que la temporada **empieza**.
  //
  // La memoria es una bandera con las semanas de gracia justas para que una
  // semana suelta sin cazar no cierre la temporada y abra otra la siguiente.
  const spell = state.flags['foraging'];
  if (foraged.hunted + foraged.fished > 0) {
    // Weight 2: a village that has taken to the woods is the visible face of a
    // bad year, and §11.6 should put it over the valley. Sólo al empezar.
    const both = foraged.hunted > 0 && foraged.fished > 0;
    const fresh = spell === undefined || spell <= state.tick;
    state.flags['foraging'] = state.tick + FORAGE.SPELL_GRACE;
    if (fresh) {
      say({
      kind: 'forage',
      templateKey: both ? 'forage.both' : (foraged.hunted > 0 ? 'forage.hunt' : 'forage.fish'),
      params: {
        year: year(),
        season: season(),
        // **Nunca cero, y ésta es la razón.** La entrada sólo existe si alguien
        // cazó o pescó, pero el reparto de mano de obra es fraccionario y
        // `Math.round` lo dejaba en cero: `numberWord(0)` es «no», así que el
        // valle anunciaba «**No of them** left the fields for the trees and the
        // water». Una frase rota en pantalla, vista en una captura. Si la
        // entrada se cuenta, alguien fue.
        count: Math.max(1, Math.round(allocation.hunters + allocation.fishers)),
      },
      weight: 2,
      });
    }
  } else if (spell === state.tick) {
    // Y que la temporada se acabe también es un hecho, aunque sea de los
    // tranquilos: peso 1, que es la crónica y no la pantalla. El tick exacto en
    // el que caduca la bandera es el único en el que esto se dice, así que no
    // hace falta borrarla ni guardar nada más.
    say({
      kind: 'forage',
      templateKey: 'forage.ends',
      params: { year: year(), season: season() },
      weight: 1,
    });
  }
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

  // A1 · **El día que la villa queda cerrada** (§1b, fase 3 de la meta).
  //
  // Se pregunta sólo cuando se acaba de levantar una pieza de muralla, porque
  // es lo único que puede cerrar un anillo y `ringClosed` recorre las rejillas
  // de ocupación: preguntarlo cada semana sería pagarlo cada semana para que
  // la respuesta sea «no» durante sesenta años.
  //
  // La bandera es permanente y hace dos cosas: que la línea suene **una vez**
  // —si mañana arde una estaca y se repone, el anillo se vuelve a cerrar y eso
  // no es una noticia— y que el resto del juego pueda preguntar en qué fase
  // está el valle sin recorrer nada (§1b: es la puerta de la fase 4, y lo que
  // un asedio necesita para tener contra qué llegar).
  //
  // **Peso 3**, y §9.2 se amplía con esta línea: una aldea se cierra una vez
  // en su vida y desde §1b eso es cambiar de fase, no terminar un edificio.
  if (built.some((raised) => raised.kind === 'palisade' || raised.kind === 'wall')
    && state.flags['wall_closed'] === undefined
    && ringClosed(state)) {
    state.flags['wall_closed'] = 0;
    say({
      kind: 'built',
      templateKey: 'wall.closed',
      params: {
        year: year(),
        season: season(),
        pieces: count(state, 'palisade') + count(state, 'wall'),
      },
      weight: 3,
    });
  }

  // ---- 7 · CONSUME ---------------------------------------------------------
  // Before the harvest on purpose (§4.2): the week of the harvest is eaten
  // first and reaped after, which is what makes a bad autumn show in the
  // granary before the winter.
  const { severity, starved, herd: fed } = consume(state);
  reportVictims(starved);
  // §7.7: what the village ate of its own. Weight 2 — losing a cow is the kind
  // of thing §9.2 puts on the chronicle screen without being asked.
  for (const [kind, many] of Object.entries(fed.slaughtered)) {
    if (many === undefined || many <= 0) continue;
    say({
      kind: 'lost',
      templateKey: `herd.slaughtered.${kind}`,
      params: { year: year(), season: season(), count: many },
      weight: 2,
    });
  }

  // ---- 8 · WINTER ----------------------------------------------------------
  const { cold } = overwinter(state);

  // ---- 9 · HARVEST ---------------------------------------------------------
  // Read before reaping: `harvest` spends the crows' bite and resets it.
  const pecked = state.crowBite;
  const reaped = harvest(state, allocation);
  if (reaped.happened && pecked > 0) {
    // Weight 2 when the birds took a real bite, 1 when they only nibbled. A
    // village that lost a tenth of its year to crows should be told plainly.
    say({
      kind: 'forage',
      templateKey: pecked >= CROWS.BITE_PER_WEEK * 3 ? 'crows.heavy' : 'crows.light',
      params: { year: year(), season: season(), count: Math.round(pecked * 100) },
      weight: pecked >= CROWS.BITE_PER_WEEK * 3 ? 2 : 1,
    });
  }
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

  // ---- 9b · TITHE (M-0) ----------------------------------------------------
  // El señor cobra en otoño, con el grano ya en el granero. Antes del
  // almacenaje a propósito: lo que se lleva no se pudre.
  const tithe = collectTithe(state);
  if (tithe !== null) {
    say({
      kind: 'road',
      templateKey: tithe.silver > 0 ? 'tithe.silver' : tithe.grain > 0 ? 'tithe.grain' : 'tithe.nothing',
      params: { year: year(), season: season(), silver: tithe.silver, grain: tithe.grain },
      weight: 1,
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
  // `routesFor` invalida su máscara cuando cambia una huella de edificio u
  // obra. El desgaste rodea paredes y fuente y parte de accesos exteriores;
  // no se duplica aquí la firma espacial que mantiene `world/paths.ts`.
  // §7.7: the herd breeds if there is room and food, and the wolves come in
  // winter if nothing stands in their way. Here and not in step 7 because this
  // is where the world acts on the village.
  const herd: HerdReport = tendHerd(state);
  if (herd.murrain !== null) {
    // Weight 3 when it takes the cattle: losing the cows to sickness is the
    // kind of year a village still talks about a generation later (§9.2).
    say({
      kind: 'lost',
      templateKey: `herd.murrain.${herd.murrain.kind}`,
      params: { year: year(), season: season(), count: herd.murrain.lost },
      weight: herd.murrain.kind === 'cows' ? 3 : 2,
    });
  }
  if (herd.wolved !== null) {
    say({
      kind: 'lost',
      templateKey: `herd.wolves.${herd.wolved}`,
      params: { year: year(), season: season() },
      weight: 2,
    });
  }
  accrueTraffic(state);
  const paths = upgradePaths(state);
  regrowForest(state);

  // The week's living-together, which §6.4 puts nowhere in particular and which
  // has to happen once a week and only once.
  driftOpinions(state);

  // §7.9, v3.09: y lo que hace trabajar codo con codo. Antes que la riña, para
  // que un año de convivencia pueda evitar que un rencor llegue a estallar.
  const crews = new Map<number, VillagerId[]>();
  for (const [id, cells] of routesFor(state)) {
    const at = cells[cells.length - 1];
    if (at === undefined) continue;
    const person = state.people.villagers.find((v) => v.id === id);
    if (person === undefined || !person.named) continue;
    const crew = crews.get(at);
    if (crew === undefined) crews.set(at, [id]);
    else crew.push(id);
  }
  // El hambre de esta semana entra aqui: §7.9 v3.60, el ano que se pasa hambre
  // el trato diario se agria con todos y no solo con el lider.
  workedTogether(state, [...crews.values()], severity);
  // Y el roce de vivir juntos, que no necesita compartir tarea: va sobre todos
  // los nombrados porque el olvido de §6.4 tambien va sobre todos.
  rubShoulders(state, severity);

  // §7.9, v3.07: y lo que pasa cuando dos ya no se aguantan. Va después del
  // roce de la semana y antes de la encrucijada, porque una riña de hoy tiene
  // que poder pesar en la pregunta de hoy.
  const quarrel = quarrelOf(state);
  if (quarrel !== null) {
    const a = state.people.villagers.find((v) => v.id === quarrel.a);
    const b = state.people.villagers.find((v) => v.id === quarrel.b);
    say({
      kind: 'grudge',
      templateKey: quarrel.blows ? 'quarrel.blows' : 'quarrel.words',
      params: {
        year: year(),
        season: season(),
        name: a?.name ?? '',
        other: b?.name ?? '',
      },
      // Llegar a las manos en una aldea de cuarenta es de lo que se habla
      // durante años; una discusión, de lo que se habla esa semana.
      weight: quarrel.blows ? 3 : 2,
    });
  }

  // ---- 15 · CROSSROAD ------------------------------------------------------
  // §7.8 tenía **dos canales**: el catálogo primero, y si no preguntaba nada,
  // alguien subía por el camino a vender en su propio reloj. **M-0 retira el
  // segundo**: quien sube a vender ya no plantea una pantalla entera con tres
  // opciones, deja una oferta en la voz de la bandeja (`world/road.ts`), y eso
  // lo sortea la tabla de sucesos del paso 2b como cualquier otra cosa que
  // pase. Lo que la regla de aquel canal protegía sigue protegido, y ahora por
  // construcción: un buhonero no puede quitarle el turno a una hambruna porque
  // ya no compite por este hueco.
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
  state.peakPeople = Math.max(state.peakPeople, living);
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
    herd: { ...fed, bred: herd.bred, wolved: herd.wolved },
    decided,
    // R-1 · lo visible de un suceso va por la misma cañería que lo de una
    // decisión (§11.5): la interfaz enfoca, la capa de vida junta a la gente.
    visualEffects: fated === null
      ? visualEffects
      : [...visualEffects, ...fated.record.visible.map((effect) => ({
        effect, ...locate(state, effect, undefined, null),
      }))],
    happening: fated?.record.id ?? null,
    offer,
    means,
    crown,
    tithe,
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
function carryOutForest(state: GameState, applied: AppliedEffects): { wood: number; firstCell: number | null } {
  let wood = 0;
  let firstCell: number | null = null;
  for (const request of applied.fell) {
    const felled = fellForestWithLocation(state, request.wood, request.permanent);
    wood += felled.wood;
    firstCell ??= felled.firstCell;
  }
  return { wood, firstCell };
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
  // M-0 · lo que el jugador hace por su cuenta cada semana, leído del estado
  // antes del tick. Por defecto nada: sin esto, una partida jugada con `run`
  // deja pasar todas las ofertas, que es lo que un valle sin jugador hace.
  actsFor: (state: GameState) => readonly PlayerAct[] = () => [],
): TickReport[] {
  const reports: TickReport[] = [];
  for (let i = 0; i < ticks && state.ended === null; i += 1) {
    const pending = state.crossroad;
    const optionId = pending === null ? null : decide(state, catalogue, policy);
    const decision: Decision | undefined =
      pending === null || optionId === null
        ? undefined
        : { templateId: pending.templateId, optionId };
    reports.push(tick(state, catalogue, decision, actsFor(state)));
  }
  return reports;
}
