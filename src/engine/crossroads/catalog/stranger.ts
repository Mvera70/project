// M-08 · Who comes up the road. design.md Annex A.13, A.14.

import type { CrossroadTemplate } from '../schema';

/** A.13 · Nine at the ford, with a cart and no oxen. */
export const STRANGERS_AT_THE_FORD: CrossroadTemplate = {
  id: 'strangers_at_the_ford',
  category: 'stranger',
  weight: 10,
  // v2.8. Disparaba al 89 % de su máximo posible: sus condiciones eran ciertas
  // casi siempre y el reposo era lo único que la frenaba. El ánimo ≥ 55 es el
  // disparador episódico — una aldea acoge a nueve desconocidos cuando está de
  // buen año, no cuando está apretada.
  cooldownYears: 20,
  requires: [
    { k: 'stat', stat: 'people', op: '>=', v: 12 },
    { k: 'ratio', ratio: 'housingFree', op: '>', v: 0.02 },
    { k: 'flag', flag: 'hostile', set: false },
    { k: 'stat', stat: 'morale', op: '>=', v: 55 },
    // Y en primavera, que es cuando §5.7 mueve a la gente por los caminos.
    { k: 'season', season: 'spring' },
  ],
  cast: [
    { as: 'A', role: 'leader' },
    { as: 'B', role: 'reeve' },
  ],
  title: 'crossroad.strangers_at_the_ford.title',
  body: 'crossroad.strangers_at_the_ford.body',
  options: [
    {
      id: 'take_them_in',
      label: 'crossroad.strangers_at_the_ford.take_them_in.label',
      cost: 'crossroad.strangers_at_the_ford.take_them_in.cost',
      effects: [
        { k: 'arrive', count: 9 },
        { k: 'stat', stat: 'grain', delta: -40 },
        { k: 'stat', stat: 'morale', delta: 6 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 4 }],
      seeds: [
        {
          id: 'whoever_burned_it',
          delayYears: [3, 10],
          effects: [
            { k: 'flag', flag: 'threatened', years: 3 },
            { k: 'kill', who: 'random', count: 'fraction', fraction: 0.1 },
          ],
          visible: [{ k: 'scar', what: 'grave_row' }],
          chronicleKey: 'consequence.whoever_burned_it',
        },
      ],
      traitWeight: { kind: 3, generous: 3, craven: 0.4 },
    },
    {
      id: 'feed_them_and_send_them_on',
      label: 'crossroad.strangers_at_the_ford.feed_them_and_send_them_on.label',
      cost: 'crossroad.strangers_at_the_ford.feed_them_and_send_them_on.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: -60 },
        { k: 'stat', stat: 'faith', delta: 10 },
        { k: 'stat', stat: 'morale', delta: -3 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 2 }],
      seeds: [],
      traitWeight: { cunning: 2, devout: 2 },
    },
    {
      id: 'turn_them_away',
      label: 'crossroad.strangers_at_the_ford.turn_them_away.label',
      cost: 'crossroad.strangers_at_the_ford.turn_them_away.cost',
      effects: [
        { k: 'flag', flag: 'hostile', years: 10 },
        { k: 'stat', stat: 'faith', delta: -18 },
        { k: 'stat', stat: 'morale', delta: -8 },
      ],
      visible: [{ k: 'banner', colour: 'red', years: 3 }],
      seeds: [
        {
          id: 'no_one_comes_at_all',
          delayYears: [1, 1],
          condition: { k: 'flag', flag: 'hostile', set: true },
          effects: [{ k: 'stat', stat: 'morale', delta: -5 }],
          visible: [{ k: 'gather', where: 'ford', days: 1 }],
          chronicleKey: 'consequence.no_one_comes',
        },
      ],
      traitWeight: { craven: 3, greedy: 2, spiteful: 2 },
    },
  ],
};

/** A.14 · Six men and a horse, out of the north wood at noon so as to be seen. */
export const BANDITS: CrossroadTemplate = {
  id: 'bandits',
  category: 'stranger',
  weight: 8,
  cooldownYears: 18,
  minYear: 16,
  // v2.8. Elegible el 71 % de los ticks: las tres condiciones eran permanentes.
  // El disparador episódico es la cosecha — vienen a por un tercio del granero,
  // así que vienen cuando el granero se llena, no cuando les apetece.
  requires: [
    { k: 'season', season: 'autumn', minWeek: 8 },
    { k: 'stat', stat: 'people', op: '>', v: 30 },
    { k: 'not', c: { k: 'has', building: 'palisade' } },
    { k: 'year', op: '>', v: 15 },
  ],
  cast: [
    { as: 'A', role: 'leader' },
    { as: 'B', role: 'smith' },
  ],
  title: 'crossroad.bandits.title',
  body: 'crossroad.bandits.body',
  options: [
    {
      id: 'pay_them',
      label: 'crossroad.bandits.pay_them.label',
      cost: 'crossroad.bandits.pay_them.cost',
      effects: [
        { k: 'stat', stat: 'grain', mul: 0.67 },
        { k: 'stat', stat: 'morale', delta: -10 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [
        {
          id: 'the_spring_visit',
          delayYears: [1, 2],
          condition: { k: 'not', c: { k: 'has', building: 'palisade' } },
          effects: [{ k: 'stat', stat: 'grain', mul: 0.75 }],
          visible: [{ k: 'gather', where: 'ford', days: 2 }],
          chronicleKey: 'consequence.the_spring_visit',
        },
      ],
      traitWeight: { craven: 3, cunning: 2 },
    },
    {
      id: 'fight_them',
      label: 'crossroad.bandits.fight_them.label',
      cost: 'crossroad.bandits.fight_them.cost',
      effects: [
        { k: 'kill', who: 'random', count: 'fraction', fraction: 0.1 },
        { k: 'stat', stat: 'morale', delta: 18 },
        { k: 'stat', stat: 'wood', delta: 80 },
        { k: 'memory', who: 'B', kind: 'was_saved', about: 'A', weight: 4 },
      ],
      visible: [{ k: 'scar', what: 'grave_row' }],
      seeds: [
        {
          id: 'a_name_in_the_valley',
          delayYears: [5, 15],
          effects: [
            { k: 'stat', stat: 'morale', delta: 10 },
            { k: 'flag', flag: 'a_name_in_the_valley', years: 0 },
          ],
          visible: [{ k: 'banner', colour: 'green', years: 3 }],
          chronicleKey: 'consequence.a_name_in_the_valley',
        },
      ],
      traitWeight: { proud: 3, hot_tempered: 3, hardy: 2, craven: 0.3 },
    },
    {
      id: 'wall_the_village_first',
      label: 'crossroad.bandits.wall_the_village_first.label',
      cost: 'crossroad.bandits.wall_the_village_first.cost',
      effects: [
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'stat', stat: 'grain', mul: 0.8 },
      ],
      visible: [{ k: 'raise', kind: 'palisade' }],
      seeds: [],
      traitWeight: { stubborn: 2, secretive: 2 },
    },
  ],
};

export const STRANGER_TEMPLATES: readonly CrossroadTemplate[] = [STRANGERS_AT_THE_FORD, BANDITS];
