// M-08 · Hunger. design.md Annex A.3, A.4.

import type { CrossroadTemplate } from '../schema';

/**
 * A.3 · Seed or bread. The grain in the barn is the same grain either way, and
 * that is the whole decision.
 *
 * Harvest promises use §8.4's harvest effect and are spent by the next reaping.
 * `forced_hunger` remains a short flag because it changes eight weekly meals.
 */
export const HUNGRY_SPRING: CrossroadTemplate = {
  id: 'hungry_spring',
  category: 'famine',
  weight: 12,
  cooldownYears: 12,
  requires: [
    { k: 'season', season: 'spring' },
    { k: 'ratio', ratio: 'grainYears', op: '<', v: 0.35 },
  ],
  cast: [
    { as: 'A', role: 'reeve' },
    { as: 'B', role: 'midwife' },
  ],
  title: 'crossroad.hungry_spring.title',
  body: 'crossroad.hungry_spring.body',
  options: [
    {
      id: 'sow_it',
      label: 'crossroad.hungry_spring.sow_it.label',
      cost: 'crossroad.hungry_spring.sow_it.cost',
      effects: [
        { k: 'flag', flag: 'forced_hunger', years: 8 / 48 },
        { k: 'stat', stat: 'morale', delta: -8 },
      ],
      visible: [{ k: 'raise', kind: 'field' }],
      seeds: [],
      traitWeight: { stubborn: 2, hardy: 2 },
    },
    {
      id: 'eat_it',
      label: 'crossroad.hungry_spring.eat_it.label',
      cost: 'crossroad.hungry_spring.eat_it.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: 300 },
        { k: 'harvest', factor: 0.55, harvests: 1 },
      ],
      visible: [{ k: 'douse', kind: 'mill' }],
      seeds: [
        {
          id: 'lean_autumn',
          delayYears: [1, 1],
          effects: [],
          visible: [{ k: 'gather', where: 'square', days: 1 }],
          chronicleKey: 'consequence.lean_autumn',
        },
      ],
      traitWeight: { kind: 2, generous: 3 },
    },
    {
      id: 'half_and_half',
      label: 'crossroad.hungry_spring.half_and_half.label',
      cost: 'crossroad.hungry_spring.half_and_half.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: 140 },
        { k: 'harvest', factor: 0.78, harvests: 1 },
        { k: 'stat', stat: 'morale', delta: -4 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 1 }],
      seeds: [],
      traitWeight: { cunning: 2 },
    },
  ],
};

/** A.4 · The broken latch. Nobody saw anything, and everybody is sure. */
export const GRANARY_THEFT: CrossroadTemplate = {
  id: 'granary_theft',
  category: 'famine',
  weight: 7,
  cooldownYears: 18,
  // v2.9. Elegible el 4.5 % de los ticks; el invierno entrado es el disparador,
  // que es cuando forzar el granero de noche significa algo.
  //
  // Con `grainYears` la condición era casi imposible, y por el mismo motivo que
  // A.1 antes de arreglarla: `grainYears` está más alto en invierno que en
  // ninguna otra estación, porque la cosecha es la semana 35. Invierno y
  // granero vacío están ANTICORRELACIONADOS. `grainToHarvest` sí baja según se
  // aleja la próxima cosecha, que es la magnitud que el ladrón mira.
  requires: [
    { k: 'season', season: 'winter', minWeek: 4 },
    { k: 'ratio', ratio: 'grainToHarvest', op: '<', v: 1.1 },
    { k: 'has', building: 'granary' },
    { k: 'grudge', min: 40 },
  ],
  cast: [
    { as: 'A', anyNamed: true },
    { as: 'B', grudgeAgainst: 'A' },
  ],
  title: 'crossroad.granary_theft.title',
  body: 'crossroad.granary_theft.body',
  options: [
    {
      id: 'believe_b',
      label: 'crossroad.granary_theft.believe_b.label',
      cost: 'crossroad.granary_theft.believe_b.cost',
      effects: [
        { k: 'role', who: 'A', role: null },
        { k: 'leave', who: 'A' },
        { k: 'stat', stat: 'morale', delta: -6 },
        { k: 'memory', who: 'A', kind: 'was_blamed', about: 'B', weight: 5 },
        { k: 'opinion', from: 'A', to: 'B', delta: -50 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [
        {
          id: 'exile_returns',
          delayYears: [10, 20],
          effects: [
            { k: 'arrive', count: 3 },
            { k: 'flag', flag: 'threatened', years: 4 },
          ],
          visible: [{ k: 'gather', where: 'ford', days: 3 }],
          chronicleKey: 'consequence.exile_returns',
        },
      ],
      traitWeight: { hot_tempered: 2 },
    },
    {
      id: 'believe_a',
      label: 'crossroad.granary_theft.believe_a.label',
      cost: 'crossroad.granary_theft.believe_a.cost',
      effects: [
        { k: 'opinion', from: 'B', to: 'A', delta: -45 },
        { k: 'memory', who: 'B', kind: 'was_blamed', about: 'A', weight: 5 },
      ],
      visible: [{ k: 'douse', kind: 'smithy' }],
      seeds: [
        {
          id: 'the_feud',
          delayYears: [2, 8],
          condition: { k: 'grudge', min: 50 },
          effects: [{ k: 'flag', flag: 'feud_ripe', years: 3 }],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.the_feud',
        },
      ],
      traitWeight: { loyal: 2, kind: 2 },
    },
    {
      id: 'a_new_latch',
      label: 'crossroad.granary_theft.a_new_latch.label',
      cost: 'crossroad.granary_theft.a_new_latch.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: -10 },
        { k: 'stat', stat: 'faith', delta: -5 },
      ],
      visible: [{ k: 'raise', kind: 'palisade' }],
      seeds: [
        {
          id: 'rot_within',
          delayYears: [5, 15],
          effects: [
            { k: 'stat', stat: 'morale', delta: -15 },
            { k: 'flag', flag: 'hostile', years: 6 },
          ],
          visible: [{ k: 'banner', colour: 'grey', years: 6 }],
          chronicleKey: 'consequence.rot_within',
        },
      ],
      traitWeight: { secretive: 3, craven: 2 },
    },
  ],
};

export const FAMINE_TEMPLATES: readonly CrossroadTemplate[] = [HUNGRY_SPRING, GRANARY_THEFT];
