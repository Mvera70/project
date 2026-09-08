// M-07 · The deferred consequence. design.md §8.5, §3.6.
//
// Half the design. Without seeds a crossroad is a menu of modifiers; with them
// it is a decision, because the price arrives years after the choice and the
// chronicle says which choice it was.
//
// Seeds are append-only, like villagers and grudges (§3.6). One that comes due
// and finds its condition false does not vanish: it is stamped `witheredTick`
// and stays on the record. That a consequence nearly happened is part of the
// history of the village.

import type { AppliedEffects, Catalogue, FiredSeed } from './schema';
import { evaluate } from './conditions';
import { applyEffect } from './resolve';
import type { GameState, PlantedSeed } from '../state';
import { yearOf } from '../time';

/** A seed that has neither fired nor withered and whose hour has come. */
function isDue(seed: PlantedSeed, tick: number): boolean {
  return seed.firedTick === null && seed.witheredTick === null && seed.firesAtTick <= tick;
}

/**
 * Step 4 of the tick. §8.5.
 *
 * Every seed that comes due is checked against its condition. If it holds, the
 * effects land and the chronicle quotes the decision that planted it, with the
 * year — "thirty-one years after Osric swore to Wealdmere". If it does not, the
 * seed withers: no effects, no chronicle entry, and a `witheredTick` that says
 * it was there.
 *
 * The seeds are photographed before the first one fires, so a consequence that
 * plants another seed does not fire it in the same tick.
 */
export function fireSeeds(state: GameState, catalogue: Catalogue): FiredSeed[] {
  const due = state.seeds.filter((s) => isDue(s, state.tick));
  const out: FiredSeed[] = [];

  for (const seed of due) {
    if (seed.condition !== null && !evaluate(seed.condition, state)) {
      seed.witheredTick = state.tick;
      out.push({
        id: seed.id,
        fromTemplateId: seed.fromTemplateId,
        fromOptionId: seed.fromOptionId,
        fired: false,
        effects: null,
      });
      continue;
    }

    const spec = specOf(catalogue, seed);
    const effects: AppliedEffects = {
      templateId: seed.fromTemplateId,
      optionId: seed.fromOptionId,
      killed: [],
      left: [],
      arrived: [],
      seedsPlanted: [],
      build: [],
      destroy: [],
      fell: [],
      visible: spec === null ? [] : [...spec.visible],
    };

    if (spec !== null) {
      for (const e of spec.effects) applyEffect(state, seed.cast, e, effects);

      state.chronicle.push({
        tick: state.tick,
        kind: 'consequence',
        templateKey: spec.chronicleKey,
        params: {
          year: yearOf(state.tick),
          // The link back is the whole point: the entry carries how long ago
          // the decision was taken and which one it was.
          sinceYear: yearOf(seed.plantedTick),
          years: yearOf(state.tick) - yearOf(seed.plantedTick),
          ...namesInSeed(state, seed),
        },
        weight: 3,
      });
    }

    seed.firedTick = state.tick;
    out.push({
      id: seed.id,
      fromTemplateId: seed.fromTemplateId,
      fromOptionId: seed.fromOptionId,
      fired: true,
      effects,
    });
  }

  return out;
}

/** The spec a planted seed came from, looked up in the catalogue. */
function specOf(catalogue: Catalogue, seed: PlantedSeed) {
  const template = catalogue.find((t) => t.id === seed.fromTemplateId);
  const option = template?.options.find((o) => o.id === seed.fromOptionId);
  // The id is `template:option:spec:tick`, so the third field names the spec.
  const specId = seed.id.split(':')[2];
  return option?.seeds.find((s) => s.id === specId) ?? null;
}

function namesInSeed(state: GameState, seed: PlantedSeed): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [letter, id] of Object.entries(seed.cast)) {
    const v = state.people.villagers.find((x) => x.id === id);
    if (v !== undefined && v.name !== '') out[letter] = v.name;
  }
  return out;
}

/** Seeds still waiting. Neither fired nor withered. */
export function pendingSeeds(state: GameState): PlantedSeed[] {
  return state.seeds.filter((s) => s.firedTick === null && s.witheredTick === null);
}
