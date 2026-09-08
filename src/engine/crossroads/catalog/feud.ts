// M-08 · Quarrels. design.md Annex A.7, A.8.

import type { CrossroadTemplate } from '../schema';

/**
 * A.7 · The anvil and the altar. Years of it, and this morning a hand on a
 * shoulder in front of everyone.
 *
 * The works penalties of Annex A are flags: M-14 owns the works and must read
 * `works_slowed` when it advances them.
 */
export const SMITH_FEUD: CrossroadTemplate = {
  id: 'smith_feud',
  category: 'feud',
  weight: 9,
  cooldownYears: 15,
  // El Anexo A pide 55, y se probó con 55 en la v2.9 ahora que las opiniones
  // llegan a −83: sigue sin disparar ni una vez en 20 partidas de 100 años,
  // porque la ventana en que alguien odia a otro por más de 55 Y hay más de
  // veinte personas Y el reposo de quince años ha pasado no se solapa nunca.
  // 45 la deja en tres disparos por 2 000 años de aldea, que es raro pero
  // existe. Queda anotado: si M-05 llega a producir enemistades más hondas de
  // forma sostenida, esto vuelve a 55.
  requires: [
    { k: 'any', cs: [{ k: 'grudge', min: 45 }, { k: 'flag', flag: 'feud_ripe', set: true }] },
    { k: 'stat', stat: 'people', op: '>', v: 20 },
  ],
  cast: [
    { as: 'A', anyNamed: true },
    { as: 'B', grudgeAgainst: 'A' },
  ],
  title: 'crossroad.smith_feud.title',
  body: 'crossroad.smith_feud.body',
  options: [
    {
      id: 'side_with_a',
      label: 'crossroad.smith_feud.side_with_a.label',
      cost: 'crossroad.smith_feud.side_with_a.cost',
      effects: [
        { k: 'opinion', from: 'B', to: 'A', delta: -30 },
        { k: 'lit', kind: 'smithy', on: false },
        { k: 'flag', flag: 'works_slowed_85', years: 4 },
        { k: 'memory', who: 'B', kind: 'was_blamed', about: 'A', weight: 4 },
      ],
      visible: [{ k: 'douse', kind: 'smithy' }],
      seeds: [
        {
          id: 'the_withdrawn',
          delayYears: [6, 14],
          effects: [{ k: 'kill', who: 'B', count: 1 }],
          visible: [{ k: 'scar', what: 'grave_row' }],
          chronicleKey: 'consequence.the_withdrawn',
        },
      ],
      traitWeight: { spiteful: 3, proud: 2 },
    },
    {
      id: 'side_with_b',
      label: 'crossroad.smith_feud.side_with_b.label',
      cost: 'crossroad.smith_feud.side_with_b.cost',
      effects: [
        { k: 'opinion', from: 'A', to: 'B', delta: -30 },
        { k: 'lit', kind: 'smithy', on: false },
        { k: 'flag', flag: 'works_slowed_85', years: 4 },
        { k: 'memory', who: 'A', kind: 'was_blamed', about: 'B', weight: 4 },
      ],
      visible: [{ k: 'douse', kind: 'smithy' }],
      seeds: [
        {
          id: 'the_withdrawn_other',
          delayYears: [6, 14],
          effects: [{ k: 'kill', who: 'A', count: 1 }],
          visible: [{ k: 'scar', what: 'grave_row' }],
          chronicleKey: 'consequence.the_withdrawn',
        },
      ],
      traitWeight: { spiteful: 3, proud: 2 },
    },
    {
      id: 'build_together',
      label: 'crossroad.smith_feud.build_together.label',
      cost: 'crossroad.smith_feud.build_together.cost',
      effects: [
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'stat', stat: 'morale', delta: 8 },
        { k: 'opinion', from: 'A', to: 'B', delta: 15 },
        { k: 'opinion', from: 'B', to: 'A', delta: 15 },
      ],
      visible: [{ k: 'raise', kind: 'palisade' }],
      seeds: [
        {
          id: 'uneasy_truce',
          delayYears: [10, 25],
          effects: [
            { k: 'opinion', from: 'B', to: 'A', delta: -70 },
            { k: 'memory', who: 'B', kind: 'was_blamed', about: 'A', weight: 5 },
          ],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.uneasy_truce',
        },
      ],
      traitWeight: { kind: 3, generous: 2, spiteful: 0.4 },
    },
  ],
};

/**
 * A.8 · What the father left. The one template that reaches back a generation
 * on its own, which is why it cannot fire before year 25.
 */
export const FEUD_INHERITED: CrossroadTemplate = {
  id: 'feud_inherited',
  category: 'feud',
  weight: 5,
  cooldownYears: 20,
  minYear: 25,
  // v2.8. `grudge min 30` era ambiental — cierta el 26 % de los ticks. Una
  // enemistad heredada es la honda, no cualquiera.
  requires: [
    { k: 'year', op: '>', v: 24 },
    { k: 'any', cs: [{ k: 'grudge', min: 45 }, { k: 'flag', flag: 'feud_ripe', set: true }] },
    { k: 'stat', stat: 'people', op: '>', v: 15 },
  ],
  cast: [
    { as: 'A', anyNamed: true },
    { as: 'B', childOf: 'A' },
  ],
  title: 'crossroad.feud_inherited.title',
  body: 'crossroad.feud_inherited.body',
  options: [
    {
      id: 'let_it_be_settled',
      label: 'crossroad.feud_inherited.let_it_be_settled.label',
      cost: 'crossroad.feud_inherited.let_it_be_settled.cost',
      effects: [
        { k: 'kill', who: 'B', count: 1 },
        { k: 'stat', stat: 'morale', delta: -10 },
        { k: 'stat', stat: 'faith', delta: -6 },
      ],
      visible: [{ k: 'scar', what: 'grave_row' }],
      seeds: [],
      traitWeight: { hot_tempered: 3, spiteful: 2 },
    },
    {
      id: 'send_b_away',
      label: 'crossroad.feud_inherited.send_b_away.label',
      cost: 'crossroad.feud_inherited.send_b_away.cost',
      effects: [
        { k: 'role', who: 'B', role: null },
        { k: 'leave', who: 'B' },
        { k: 'stat', stat: 'morale', delta: -4 },
        { k: 'memory', who: 'A', kind: 'lost_child', about: 'B', weight: 4 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 2 }],
      seeds: [
        {
          id: 'the_returned',
          delayYears: [15, 30],
          effects: [
            { k: 'arrive', count: 4 },
            { k: 'flag', flag: 'threatened', years: 3 },
          ],
          visible: [{ k: 'gather', where: 'ford', days: 4 }],
          chronicleKey: 'consequence.the_returned',
        },
      ],
      traitWeight: { craven: 2, cunning: 2 },
    },
    {
      id: 'give_b_the_smithy',
      label: 'crossroad.feud_inherited.give_b_the_smithy.label',
      cost: 'crossroad.feud_inherited.give_b_the_smithy.cost',
      effects: [
        { k: 'role', who: 'B', role: 'smith' },
        { k: 'opinion', from: 'A', to: 'B', delta: -50 },
        { k: 'memory', who: 'A', kind: 'was_passed_over', about: 'B', weight: 4 },
        { k: 'stat', stat: 'morale', delta: 6 },
        { k: 'lit', kind: 'smithy', on: true },
      ],
      visible: [{ k: 'raise', kind: 'smithy' }],
      seeds: [
        {
          id: 'two_smiths',
          delayYears: [5, 12],
          effects: [{ k: 'flag', flag: 'feud_ripe', years: 4 }],
          visible: [{ k: 'douse', kind: 'smithy' }],
          chronicleKey: 'consequence.two_smiths',
        },
      ],
      traitWeight: { ambitious: 3, generous: 2 },
    },
  ],
};

export const FEUD_TEMPLATES: readonly CrossroadTemplate[] = [SMITH_FEUD, FEUD_INHERITED];
