// M-07 · Applying an option. design.md §8.4, §8.5, §8.7.
//
// While a crossroad is pending the simulation does not stop (§8.7). The village
// goes on eating and dying, and the decision does not expire. Hesitating has a
// price, and coming back after four hours to find the question still open and
// the granary empty is a story, not a bug.

import { isHere, population } from '../people/demography';
import { remember } from '../people/memories';
import { adjustOpinion } from '../people/opinions';
import { ageOf, makeVillager } from '../people/villagers';
import { int, next, pick } from '../rng';
import type { GameState, Villager, VillagerId } from '../state';
import { yearOf } from '../time';
import { standing } from '../subsistence/building-counts';
import type { AppliedEffects, Catalogue, CrossroadTemplate, Effect } from './schema';

const clampStat = (name: string, x: number): number =>
  name === 'morale' || name === 'faith' ? Math.max(0, Math.min(100, x)) : Math.max(0, x);

function villagerOf(state: GameState, cast: Record<string, VillagerId>, who: string): Villager | undefined {
  const id = cast[who];
  return id === undefined ? undefined : state.people.villagers.find((v) => v.id === id);
}

/**
 * Who a `kill` effect takes.
 *
 * `weakest` is the order §5.3 already uses for hunger — the old first, then the
 * very young — because a village losing people loses them in that order
 * whatever the reason. `random` draws by lot. A cast letter names one person.
 */
function victims(
  state: GameState,
  cast: Record<string, VillagerId>,
  who: string,
  howMany: number,
): Villager[] {
  const named = villagerOf(state, cast, who);
  if (named !== undefined && who !== 'random' && who !== 'weakest') {
    return isHere(named) ? [named] : [];
  }

  const present = state.people.villagers.filter(isHere);
  if (who === 'weakest') {
    return [...present]
      .sort(
        (a, b) =>
          ageOf(b, state.tick) - ageOf(a, state.tick) || a.id - b.id,
      )
      .slice(0, howMany);
  }

  const pool = [...present];
  const out: Villager[] = [];
  while (out.length < howMany && pool.length > 0) {
    const v = pick(state.rng, 'crossroads', pool);
    pool.splice(pool.indexOf(v), 1);
    out.push(v);
  }
  return out;
}

/**
 * Apply one effect of §8.4. Buildings are the exception: `build` and `destroy`
 * are collected as requests rather than carried out, because M-14 owns the
 * buildings and the placement rules that go with them.
 */
export function applyEffect(
  state: GameState,
  cast: Record<string, VillagerId>,
  e: Effect,
  out: AppliedEffects,
): void {
  switch (e.k) {
    case 'stat': {
      const current = state.village[e.stat];
      const value = 'delta' in e ? current + e.delta : current * e.mul;
      state.village[e.stat] = clampStat(e.stat, value);
      break;
    }
    case 'kill': {
      const howMany =
        e.count === 'fraction'
          ? Math.round(population(state) * (e.fraction ?? 0))
          : e.count;
      for (const v of victims(state, cast, e.who, howMany)) {
        v.diedTick = state.tick;
        v.causeOfDeath = 'violence';
        out.killed.push(v.id);
      }
      if (out.killed.length > 0) {
        const gone = new Set(out.killed);
        state.people.namedIds = state.people.namedIds.filter((id) => !gone.has(id));
      }
      break;
    }
    case 'arrive': {
      for (let i = 0; i < e.count; i += 1) {
        const age = int(state.rng, 'names', 16, 30);
        const v = makeVillager({
          id: state.people.nextId,
          female: next(state.rng, 'names') < 0.5,
          bornTick: state.tick - age * 48,
        });
        state.people.nextId += 1;
        state.people.villagers.push(v);
        out.arrived.push(v.id);
      }
      break;
    }
    case 'flag':
      // 0 is permanent (§3.1): the value is the tick it expires on.
      state.flags[e.flag] = e.years === 0 ? 0 : state.tick + e.years * 48;
      break;
    case 'build':
      out.build.push(e.kind);
      break;
    case 'destroy':
      out.destroy.push({ kind: e.kind, count: e.count, ...(e.blockYears === undefined ? {} : { blockYears: e.blockYears }) });
      break;
    case 'harvest':
      // The heavier promise wins if two land before a reaping, rather than
      // multiplying into something nobody wrote.
      state.harvestModifier = state.harvestModifier === null || e.factor < state.harvestModifier.factor
        ? { factor: e.factor, harvests: e.harvests }
        : { factor: state.harvestModifier.factor, harvests: Math.max(state.harvestModifier.harvests, e.harvests) };
      break;
    case 'outbreak':
      if (state.outbreak !== null) {
        state.outbreak.endsTick = Math.max(state.tick, state.outbreak.endsTick + e.weeks);
      }
      break;
    case 'opinion': {
      const from = cast[e.from];
      const to = cast[e.to];
      if (from !== undefined && to !== undefined) adjustOpinion(state, from, to, e.delta);
      break;
    }
    case 'memory': {
      const v = villagerOf(state, cast, e.who);
      if (v === undefined) break;
      const about = e.about === undefined ? null : (cast[e.about] ?? null);
      remember(v, {
        tick: state.tick,
        kind: e.kind,
        aboutId: about,
        weight: e.weight,
      });
      break;
    }
    case 'role': {
      const v = villagerOf(state, cast, e.who);
      if (v !== undefined) v.role = e.role;
      break;
    }
    case 'lit':
      // Not construction: the smithy going dark is a state a building is in,
      // and §3.5 gives it the flag for exactly this.
      for (const b of standing(state, e.kind)) b.lit = e.on;
      break;
    default:
      break;
  }
}

/**
 * Resolve the pending crossroad. §8.4, §8.5.
 *
 * Applies the option's effects, plants its seeds, writes the decision into
 * `history` and pushes the chronicle entry. The crossroad is cleared: it is
 * answered, and answered once.
 *
 * The chronicle keys of the catalogue belong to M-08 and are not in the bank
 * yet. They are emitted regardless — an entry with a key the bank does not know
 * renders as `[the.key]`, which is visible and harmless, and M-08's coverage
 * test is what turns it into a build failure.
 */
export function applyOption(
  state: GameState,
  optionId: string,
  catalogue: Catalogue,
): AppliedEffects | null {
  const pending = state.crossroad;
  if (pending === null) return null;

  const template = catalogue.find((t) => t.id === pending.templateId);
  if (template === undefined) return null;

  const option = template.options.find((o) => o.id === optionId);
  if (option === undefined || !pending.optionIds.includes(optionId)) return null;

  const out: AppliedEffects = {
    templateId: template.id,
    optionId,
    killed: [],
    arrived: [],
    seedsPlanted: [],
    build: [],
    destroy: [],
    visible: [...option.visible],
  };

  for (const e of option.effects) applyEffect(state, pending.cast, e, out);

  // §8.5. The delay is drawn once, now, so that the year it lands in is part of
  // the decision and not of whenever the seed happens to be looked at.
  for (const spec of option.seeds) {
    const years = int(state.rng, 'crossroads', spec.delayYears[0], spec.delayYears[1]);
    // A flag that lasts exactly until this seed comes due (§8.5, v2.13).
    if (spec.holdsFlag !== undefined) state.flags[spec.holdsFlag] = state.tick + years * 48;
    state.seeds.push({
      id: `${template.id}:${option.id}:${spec.id}:${state.tick}`,
      fromTemplateId: template.id,
      fromOptionId: option.id,
      plantedTick: state.tick,
      firesAtTick: state.tick + years * 48,
      cast: { ...pending.cast },
      condition: spec.condition ?? null,
      firedTick: null,
      witheredTick: null,
    });
    out.seedsPlanted.push(spec.id);
  }

  state.history.push({
    tick: state.tick,
    templateId: template.id,
    optionId,
    cast: { ...pending.cast },
  });

  state.chronicle.push({
    tick: state.tick,
    kind: 'crossroad_taken',
    templateKey: `crossroad.${template.id}.${option.id}`,
    params: { year: yearOf(state.tick), ...namesOf(state, pending.cast) },
    weight: 3,
  });

  state.crossroad = null;
  return out;
}

/** The cast as names, for the chronicle: 'A' -> 'Aelric'. */
export function namesOf(
  state: GameState,
  cast: Record<string, VillagerId>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [letter, id] of Object.entries(cast)) {
    const v = state.people.villagers.find((x) => x.id === id);
    if (v !== undefined && v.name !== '') out[letter] = v.name;
  }
  return out;
}

/** The entry that announces a crossroad has been posed. §8.7, §9. */
export function recordPosed(state: GameState, template: CrossroadTemplate): void {
  if (state.crossroad === null) return;
  state.chronicle.push({
    tick: state.tick,
    kind: 'crossroad_posed',
    templateKey: template.title,
    params: { year: yearOf(state.tick), ...namesOf(state, state.crossroad.cast) },
    // §9.2, v2.14: a crossroad is weight 3. The question the player was asked
    // is the spine of the chronicle; it was reading below the harvest.
    weight: 3,
  });
}
