// M-08 · Who speaks now. design.md Annex A.15, A.16.

import type { CrossroadTemplate } from '../schema';

/**
 * A.15 · The heartbeat of the long loop, and the only template that jumps the
 * ceiling (§6.6, §8.6) — once per death, not once per tick.
 *
 * Every generation the player hands out an inheritance and makes an enemy. The
 * one who is not chosen remembers it, and that memory is what A.7 casts twenty
 * years later.
 */
export const SUCCESSION: CrossroadTemplate = {
  id: 'succession',
  category: 'succession',
  weight: 100,
  cooldownYears: 0,
  // v2.13: `interregnum` is what closes the loop. Without it, "No one" leaves
  // the office vacant, the vacancy makes the template eligible again on the
  // very next tick, and succession is eligible on 78 % of the ticks of any game
  // where the two candidates get refused: the valley spends its whole crossroad
  // budget asking who is in charge. The seed already said the village shouts at
  // each other for two to four years first; the flag is the half that was
  // missing for that to be true.
  requires: [
    { k: 'role', role: 'leader', alive: false },
    { k: 'flag', flag: 'interregnum', set: false },
  ],
  // v2.9. Filtro duro, no preferencia: con `anyNamed` a secas se encadenaban
  // ancianos y la sucesión disparaba al doble de su ritmo natural. El ensanche
  // solo actúa si la banda no da dos candidatos — A toma el único que hay y B
  // se queda sin banda, que es exactamente cuándo debe ensancharse.
  cast: [
    { as: 'A', anyNamed: true, agedBetween: [20, 60] },
    { as: 'B', anyNamed: true, excluding: ['A'], agedBetween: [20, 60] },
  ],
  title: 'crossroad.succession.title',
  body: 'crossroad.succession.body',
  options: [
    {
      id: 'choose_a',
      label: 'crossroad.succession.choose_a.label',
      cost: 'crossroad.succession.choose_a.cost',
      effects: [
        { k: 'role', who: 'A', role: 'leader' },
        { k: 'opinion', from: 'B', to: 'A', delta: -45 },
        { k: 'memory', who: 'B', kind: 'was_passed_over', about: 'A', weight: 4 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 3 }],
      seeds: [
        {
          id: 'the_passed_over',
          delayYears: [5, 20],
          condition: { k: 'grudge', min: 60 },
          effects: [{ k: 'flag', flag: 'feud_ripe', years: 5 }],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.the_passed_over',
        },
      ],
      traitWeight: { ambitious: 2, proud: 2 },
    },
    {
      id: 'choose_b',
      label: 'crossroad.succession.choose_b.label',
      cost: 'crossroad.succession.choose_b.cost',
      effects: [
        { k: 'role', who: 'B', role: 'leader' },
        { k: 'opinion', from: 'A', to: 'B', delta: -45 },
        { k: 'memory', who: 'A', kind: 'was_passed_over', about: 'B', weight: 4 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 3 }],
      seeds: [
        {
          id: 'the_passed_over_other',
          delayYears: [5, 20],
          condition: { k: 'grudge', min: 60 },
          effects: [{ k: 'flag', flag: 'feud_ripe', years: 5 }],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.the_passed_over',
        },
      ],
      traitWeight: { ambitious: 2, proud: 2 },
    },
    {
      id: 'no_one',
      label: 'crossroad.succession.no_one.label',
      cost: 'crossroad.succession.no_one.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: -12 },
        { k: 'stat', stat: 'faith', delta: -6 },
        { k: 'flag', flag: 'works_slowed_80', years: 2 },
      ],
      visible: [{ k: 'douse', kind: 'house' }],
      seeds: [
        {
          id: 'the_leaderless_years',
          delayYears: [2, 4],
          // Held for exactly the years the shouting lasts, whatever they were.
          holdsFlag: 'interregnum',
          condition: { k: 'role', role: 'leader', alive: false },
          effects: [{ k: 'stat', stat: 'morale', delta: -10 }],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.the_leaderless_years',
        },
      ],
      traitWeight: { stubborn: 2, craven: 2 },
    },
  ],
};

/**
 * A.16 · The first stone. Nowhere left to build outward, and a quarry on the
 * east slope that will give enough for one of two things.
 *
 * Annex A gates it on "no free ground on the map", which M-13 owns and the DSL
 * cannot ask. A full valley is what that means in numbers: the population is at
 * the roll of §12.4 and the smithy that makes stone possible is standing.
 */
export const FIRST_STONE: CrossroadTemplate = {
  id: 'first_stone',
  category: 'succession',
  weight: 6,
  cooldownYears: 50,
  maxPerGame: 1,
  minYear: 41,
  // v2.8. Sus tres condiciones son permanentes una vez ciertas; la primavera
  // es el disparador — una cantera se abre cuando el suelo deja de estar duro.
  requires: [
    { k: 'season', season: 'spring' },
    { k: 'stat', stat: 'people', op: '>=', v: 45 },
    { k: 'has', building: 'smithy' },
    { k: 'year', op: '>', v: 40 },
  ],
  cast: [
    { as: 'A', role: 'leader' },
    { as: 'B', role: 'smith' },
  ],
  title: 'crossroad.first_stone.title',
  body: 'crossroad.first_stone.body',
  options: [
    {
      id: 'the_wall',
      label: 'crossroad.first_stone.the_wall.label',
      cost: 'crossroad.first_stone.the_wall.cost',
      effects: [
        { k: 'flag', flag: 'wall_unlocked', years: 0 },
        { k: 'stat', stat: 'morale', delta: 6 },
      ],
      visible: [{ k: 'raise', kind: 'wall' }],
      seeds: [
        {
          id: 'behind_the_wall',
          delayYears: [20, 40],
          effects: [{ k: 'flag', flag: 'behind_the_wall', years: 0 }],
          visible: [{ k: 'banner', colour: 'grey', years: 5 }],
          chronicleKey: 'consequence.behind_the_wall',
        },
      ],
      traitWeight: { craven: 2, stubborn: 2 },
    },
    {
      id: 'the_houses',
      label: 'crossroad.first_stone.the_houses.label',
      cost: 'crossroad.first_stone.the_houses.cost',
      effects: [
        { k: 'flag', flag: 'stone_house_unlocked', years: 0 },
        { k: 'stat', stat: 'morale', delta: 12 },
      ],
      visible: [{ k: 'raise', kind: 'stone_house' }],
      seeds: [
        {
          id: 'worth_taking',
          delayYears: [15, 30],
          effects: [{ k: 'flag', flag: 'threatened', years: 8 }],
          visible: [{ k: 'banner', colour: 'red', years: 8 }],
          chronicleKey: 'consequence.worth_taking',
        },
      ],
      traitWeight: { generous: 2, proud: 2 },
    },
  ],
};

export const SUCCESSION_TEMPLATES: readonly CrossroadTemplate[] = [SUCCESSION, FIRST_STONE];
