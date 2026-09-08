// M-08 · The sickness. design.md Annex A.5, A.6.
//
// Outbreak-length effects alter the active outbreak once, when the answer is
// taken. A year-long flag would either be inert or apply the same weeks again.

import type { CrossroadTemplate } from '../schema';

/** A.5 · Where the dead go. Nine in eleven days and the ground is hard. */
export const PLAGUE_PIT: CrossroadTemplate = {
  id: 'plague_pit',
  category: 'plague',
  weight: 14,
  cooldownYears: 25,
  requires: [
    { k: 'outbreak', active: true },
    { k: 'stat', stat: 'people', op: '>', v: 12 },
  ],
  // §A.5 asks for the herbwife and falls back to anyone named when there is no
  // herbalist, which the DSL cannot express in one spec. `anyNamed excluding`
  // is the honest reading: somebody other than the priest speaks for the pit.
  cast: [
    { as: 'A', role: 'priest' },
    { as: 'B', anyNamed: true, excluding: ['A'] },
  ],
  title: 'crossroad.plague_pit.title',
  body: 'crossroad.plague_pit.body',
  options: [
    {
      id: 'bless_them',
      label: 'crossroad.plague_pit.bless_them.label',
      cost: 'crossroad.plague_pit.bless_them.cost',
      effects: [
        { k: 'stat', stat: 'faith', delta: 18 },
        { k: 'stat', stat: 'morale', delta: 6 },
        { k: 'outbreak', weeks: 3 },
        { k: 'build', kind: 'grave_yard', free: true },
      ],
      visible: [{ k: 'raise', kind: 'grave_yard' }],
      seeds: [],
      traitWeight: { devout: 3, kind: 2 },
    },
    {
      id: 'the_pit',
      label: 'crossroad.plague_pit.the_pit.label',
      cost: 'crossroad.plague_pit.the_pit.cost',
      effects: [
        { k: 'stat', stat: 'faith', delta: -20 },
        { k: 'outbreak', weeks: -3 },
        { k: 'opinion', from: 'A', to: 'B', delta: -40 },
        { k: 'memory', who: 'A', kind: 'was_blamed', about: 'B', weight: 4 },
      ],
      visible: [{ k: 'scar', what: 'grave_row' }],
      seeds: [
        {
          id: 'unquiet_ground',
          delayYears: [6, 18],
          effects: [
            { k: 'stat', stat: 'faith', delta: -10 },
            { k: 'stat', stat: 'morale', delta: -8 },
            { k: 'flag', flag: 'unconsecrated', years: 0 },
          ],
          visible: [{ k: 'gather', where: 'chapel', days: 2 }],
          chronicleKey: 'consequence.unquiet_ground',
        },
      ],
      traitWeight: { cunning: 2, devout: 0.3 },
    },
    {
      id: 'burn_the_houses',
      label: 'crossroad.plague_pit.burn_the_houses.label',
      cost: 'crossroad.plague_pit.burn_the_houses.cost',
      effects: [
        // v2.25 · §8.1: the seed `the_burnt_row` always said the ruins are not
        // built over, and it was a flag nobody read — the houses were back
        // within the decade and "roofs for ash" cost a few weeks of work.
        { k: 'destroy', kind: 'house', count: 2, blockYears: 20 },
        { k: 'outbreak', weeks: -4 },
        { k: 'stat', stat: 'morale', delta: -14 },
      ],
      visible: [{ k: 'ruin', kind: 'house' }],
      seeds: [
        {
          id: 'the_burnt_row',
          delayYears: [3, 10],
          effects: [{ k: 'flag', flag: 'burnt_row', years: 0 }],
          visible: [{ k: 'scar', what: 'burnt_field' }],
          chronicleKey: 'consequence.the_burnt_row',
        },
      ],
      traitWeight: { hot_tempered: 2, hardy: 2 },
    },
  ],
};

/**
 * A.6 · A reason for it. The one template that asks the player to hand over a
 * named person, and the price is that they do not get them back.
 */
export const PLAGUE_BLAME: CrossroadTemplate = {
  id: 'plague_blame',
  category: 'plague',
  weight: 8,
  cooldownYears: 30,
  requires: [
    { k: 'outbreak', active: true },
    { k: 'stat', stat: 'faith', op: '>', v: 55 },
    { k: 'trait', role: 'priest', trait: 'devout' },
  ],
  cast: [
    { as: 'A', role: 'priest' },
    { as: 'B', anyNamed: true, excluding: ['A'] },
  ],
  title: 'crossroad.plague_blame.title',
  body: 'crossroad.plague_blame.body',
  options: [
    {
      id: 'give_them_b',
      label: 'crossroad.plague_blame.give_them_b.label',
      cost: 'crossroad.plague_blame.give_them_b.cost',
      effects: [
        { k: 'kill', who: 'B', count: 1 },
        { k: 'stat', stat: 'faith', delta: 25 },
        { k: 'stat', stat: 'morale', delta: 8 },
      ],
      visible: [{ k: 'gather', where: 'chapel', days: 3 }],
      seeds: [
        {
          id: 'blood_debt',
          delayYears: [8, 20],
          effects: [{ k: 'flag', flag: 'feud_ripe', years: 5 }],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.blood_debt',
        },
      ],
      traitWeight: { devout: 2, craven: 2, kind: 0.3 },
    },
    {
      id: 'silence_a',
      label: 'crossroad.plague_blame.silence_a.label',
      cost: 'crossroad.plague_blame.silence_a.cost',
      effects: [
        { k: 'stat', stat: 'faith', delta: -30 },
        { k: 'role', who: 'A', role: null },
        { k: 'stat', stat: 'morale', delta: -5 },
        { k: 'memory', who: 'A', kind: 'was_blamed', weight: 5 },
      ],
      visible: [{ k: 'douse', kind: 'chapel' }],
      seeds: [
        {
          id: 'no_shepherd',
          delayYears: [4, 10],
          condition: { k: 'role', role: 'priest', alive: false },
          effects: [{ k: 'stat', stat: 'faith', delta: -15 }],
          visible: [{ k: 'douse', kind: 'chapel' }],
          chronicleKey: 'consequence.no_shepherd',
        },
      ],
      traitWeight: { proud: 2, stubborn: 2 },
    },
    {
      id: 'say_nothing',
      label: 'crossroad.plague_blame.say_nothing.label',
      cost: 'crossroad.plague_blame.say_nothing.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: -12 },
        { k: 'stat', stat: 'faith', delta: -8 },
        { k: 'outbreak', weeks: 2 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 4 }],
      seeds: [
        {
          id: 'whispers',
          delayYears: [5, 12],
          effects: [
            { k: 'opinion', from: 'A', to: 'B', delta: -60 },
            { k: 'memory', who: 'A', kind: 'was_blamed', about: 'B', weight: 4 },
          ],
          visible: [{ k: 'gather', where: 'square', days: 1 }],
          chronicleKey: 'consequence.whispers',
        },
      ],
      traitWeight: { secretive: 3, craven: 2 },
    },
  ],
};

export const PLAGUE_TEMPLATES: readonly CrossroadTemplate[] = [PLAGUE_PIT, PLAGUE_BLAME];
