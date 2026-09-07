// M-08 · Belief. design.md Annex A.9, A.10.

import type { CrossroadTemplate } from '../schema';

/** A.9 · Timber enough for one. Two men have been drawing in the dirt. */
export const CHAPEL_OR_GRANARY: CrossroadTemplate = {
  id: 'chapel_or_granary',
  category: 'faith',
  weight: 8,
  cooldownYears: 40,
  maxPerGame: 1,
  requires: [
    { k: 'stat', stat: 'people', op: '>=', v: 30 },
    { k: 'not', c: { k: 'has', building: 'chapel' } },
    { k: 'stat', stat: 'wood', op: '>', v: 200 },
    { k: 'stat', stat: 'faith', op: '>', v: 45 },
  ],
  // Annex A casts the priest and falls back to anyone named. Before the chapel
  // exists there is no priest to cast (§6.2), so the fallback IS the case.
  cast: [{ as: 'A', anyNamed: true }],
  title: 'crossroad.chapel_or_granary.title',
  body: 'crossroad.chapel_or_granary.body',
  options: [
    {
      id: 'the_chapel',
      label: 'crossroad.chapel_or_granary.the_chapel.label',
      cost: 'crossroad.chapel_or_granary.the_chapel.cost',
      effects: [
        { k: 'build', kind: 'chapel', free: true },
        { k: 'stat', stat: 'faith', delta: 20 },
        { k: 'stat', stat: 'morale', delta: 10 },
      ],
      visible: [{ k: 'raise', kind: 'chapel' }],
      seeds: [
        {
          id: 'the_faithful_valley',
          delayYears: [15, 30],
          condition: { k: 'stat', stat: 'faith', op: '>', v: 70 },
          effects: [{ k: 'arrive', count: 4 }],
          visible: [{ k: 'gather', where: 'chapel', days: 4 }],
          chronicleKey: 'consequence.the_faithful_valley',
        },
      ],
      traitWeight: { devout: 3, kind: 2 },
    },
    {
      id: 'the_granary',
      label: 'crossroad.chapel_or_granary.the_granary.label',
      cost: 'crossroad.chapel_or_granary.the_granary.cost',
      effects: [
        { k: 'build', kind: 'granary', free: true },
        { k: 'stat', stat: 'faith', delta: -10 },
        { k: 'memory', who: 'A', kind: 'was_passed_over', weight: 4 },
      ],
      visible: [{ k: 'raise', kind: 'granary' }],
      seeds: [
        {
          id: 'a_priest_without_a_roof',
          delayYears: [8, 16],
          effects: [
            { k: 'role', who: 'A', role: null },
            { k: 'stat', stat: 'faith', delta: -15 },
          ],
          visible: [{ k: 'douse', kind: 'chapel' }],
          chronicleKey: 'consequence.a_priest_without_a_roof',
        },
      ],
      traitWeight: { greedy: 2, cunning: 2, devout: 0.4 },
    },
  ],
};

/** A.10 · A bone in a box, and a story that came with it. */
export const RELIC_PEDLAR: CrossroadTemplate = {
  id: 'relic_pedlar',
  category: 'faith',
  weight: 6,
  cooldownYears: 25,
  requires: [
    { k: 'has', building: 'chapel' },
    { k: 'stat', stat: 'faith', op: '>', v: 30 },
    { k: 'stat', stat: 'faith', op: '<', v: 70 },
    { k: 'ratio', ratio: 'grainYears', op: '>', v: 0.6 },
  ],
  cast: [
    { as: 'A', role: 'priest' },
    { as: 'B', role: 'leader' },
  ],
  title: 'crossroad.relic_pedlar.title',
  body: 'crossroad.relic_pedlar.body',
  options: [
    {
      id: 'buy_it',
      label: 'crossroad.relic_pedlar.buy_it.label',
      cost: 'crossroad.relic_pedlar.buy_it.cost',
      // Annex A prices this at six weeks of bread. The DSL has no arithmetic on
      // the population, so it is a multiplier on the store instead: the same
      // bite out of the same granary, and it scales with the village.
      effects: [
        { k: 'stat', stat: 'grain', mul: 0.85 },
        { k: 'stat', stat: 'faith', delta: 25 },
        { k: 'stat', stat: 'morale', delta: 8 },
      ],
      visible: [{ k: 'gather', where: 'chapel', days: 4 }],
      seeds: [
        {
          id: 'the_relic_works',
          delayYears: [10, 25],
          condition: { k: 'stat', stat: 'faith', op: '>', v: 55 },
          effects: [
            { k: 'stat', stat: 'faith', delta: 15 },
            { k: 'arrive', count: 3 },
          ],
          visible: [{ k: 'gather', where: 'chapel', days: 3 }],
          chronicleKey: 'consequence.the_relic_works',
        },
      ],
      traitWeight: { devout: 3, generous: 2 },
    },
    {
      id: 'send_him_on',
      label: 'crossroad.relic_pedlar.send_him_on.label',
      cost: 'crossroad.relic_pedlar.send_him_on.cost',
      effects: [
        { k: 'stat', stat: 'faith', delta: -8 },
        { k: 'opinion', from: 'A', to: 'B', delta: -20 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 1 }],
      seeds: [],
      traitWeight: { cunning: 2, stubborn: 2 },
    },
    {
      id: 'take_the_box',
      label: 'crossroad.relic_pedlar.take_the_box.label',
      cost: 'crossroad.relic_pedlar.take_the_box.cost',
      effects: [
        { k: 'stat', stat: 'faith', delta: 10 },
        { k: 'flag', flag: 'hostile', years: 8 },
        { k: 'stat', stat: 'morale', delta: -6 },
        { k: 'memory', who: 'B', kind: 'stole', weight: 3 },
      ],
      visible: [{ k: 'banner', colour: 'red', years: 2 }],
      seeds: [
        {
          id: 'no_one_comes',
          delayYears: [3, 8],
          condition: { k: 'flag', flag: 'hostile', set: true },
          effects: [{ k: 'stat', stat: 'morale', delta: -8 }],
          visible: [{ k: 'gather', where: 'ford', days: 1 }],
          chronicleKey: 'consequence.no_one_comes',
        },
      ],
      traitWeight: { greedy: 3, spiteful: 2, devout: 0.3 },
    },
  ],
};

export const FAITH_TEMPLATES: readonly CrossroadTemplate[] = [CHAPEL_OR_GRANARY, RELIC_PEDLAR];
