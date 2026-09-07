// M-08 · The lord of Wealdmere. design.md Annex A.1, A.2.
//
// Data only: not a function, not an if, in this file or any of its siblings.
//
// Some of what Annex A describes has no shape in the §8.4 effect DSL — a
// harvest multiplier, an outbreak lengthened by three weeks, a works rate held
// down for a season. Those are carried as `flag` effects with names the owning
// system reads, so the decision is recorded in the state where it belongs and
// the mechanics stay with the module that owns them. Each one says who must
// read it.

import type { CrossroadTemplate } from '../schema';

/** A.1 · The flagship template, the one `valle.md` §3 opens with. */
export const WINTER_GRAIN_DEBT: CrossroadTemplate = {
  id: 'winter_grain_debt',
  category: 'lord',
  weight: 10,
  cooldownYears: 30,
  maxPerGame: 2,
  // v2.8. La condición vieja pedía `grainYears < 0.25` en invierno, y el
  // invierno empieza la semana 36 — justo después de la cosecha de la 35. Pedía
  // el momento más vacío en el momento más lleno, y encima `grainYears` está
  // acotado por arriba por la capacidad del granero. Ahora mira si la despensa
  // llega a la próxima cosecha, y espera a que el invierno esté entrado.
  requires: [
    { k: 'season', season: 'winter', minWeek: 6 },
    { k: 'ratio', ratio: 'grainToHarvest', op: '<', v: 0.9 },
    { k: 'flag', flag: 'vassal', set: false },
  ],
  cast: [{ as: 'A', role: 'leader' }],
  title: 'crossroad.winter_grain_debt.title',
  body: 'crossroad.winter_grain_debt.body',
  options: [
    {
      id: 'kneel',
      label: 'crossroad.winter_grain_debt.kneel.label',
      cost: 'crossroad.winter_grain_debt.kneel.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: 900 },
        { k: 'flag', flag: 'vassal', years: 0 },
        { k: 'stat', stat: 'morale', delta: -12 },
      ],
      visible: [{ k: 'banner', colour: 'grey', years: 0 }],
      seeds: [
        {
          id: 'tithe_due',
          delayYears: [8, 14],
          effects: [
            { k: 'stat', stat: 'grain', delta: -450 },
            { k: 'stat', stat: 'morale', delta: -6 },
          ],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.tithe_due',
        },
      ],
      traitWeight: { craven: 2, proud: 0.5 },
    },
    {
      id: 'refuse',
      label: 'crossroad.winter_grain_debt.refuse.label',
      cost: 'crossroad.winter_grain_debt.refuse.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: 10 },
        { k: 'flag', flag: 'proud', years: 20 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 3 }],
      seeds: [
        {
          id: 'wealdmere_remembers',
          delayYears: [12, 25],
          condition: { k: 'flag', flag: 'proud', set: true },
          effects: [{ k: 'flag', flag: 'threatened', years: 5 }],
          visible: [{ k: 'banner', colour: 'red', years: 5 }],
          chronicleKey: 'consequence.wealdmere_remembers',
        },
      ],
      traitWeight: { proud: 3, stubborn: 2 },
    },
    {
      id: 'take_it_at_night',
      label: 'crossroad.winter_grain_debt.take_it_at_night.label',
      cost: 'crossroad.winter_grain_debt.take_it_at_night.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: 600 },
        { k: 'stat', stat: 'faith', delta: -15 },
        { k: 'memory', who: 'A', kind: 'stole', weight: 4 },
      ],
      visible: [{ k: 'scar', what: 'felled_wood' }],
      seeds: [
        {
          id: 'the_reckoning',
          delayYears: [3, 9],
          effects: [
            { k: 'kill', who: 'random', count: 'fraction', fraction: 0.15 },
            { k: 'destroy', kind: 'palisade', count: 3 },
          ],
          visible: [{ k: 'scar', what: 'grave_row' }],
          chronicleKey: 'consequence.the_reckoning',
        },
      ],
      traitWeight: { cunning: 3, secretive: 2, devout: 0.4 },
    },
  ],
};

/** A.2 · Once the valley is a vassal, the ledger comes every autumn. */
export const TITHE_DEMAND: CrossroadTemplate = {
  id: 'tithe_demand',
  category: 'lord',
  weight: 6,
  cooldownYears: 20,
  minYear: 6,
  requires: [
    { k: 'flag', flag: 'vassal', set: true },
    { k: 'season', season: 'autumn' },
    { k: 'year', op: '>', v: 5 },
  ],
  cast: [
    { as: 'A', role: 'reeve' },
    { as: 'B', role: 'leader' },
  ],
  title: 'crossroad.tithe_demand.title',
  body: 'crossroad.tithe_demand.body',
  options: [
    {
      id: 'pay_in_full',
      label: 'crossroad.tithe_demand.pay_in_full.label',
      cost: 'crossroad.tithe_demand.pay_in_full.cost',
      effects: [
        { k: 'stat', stat: 'grain', mul: 0.75 },
        { k: 'stat', stat: 'morale', delta: -5 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [],
      traitWeight: { loyal: 2, craven: 2 },
    },
    {
      id: 'pay_short',
      label: 'crossroad.tithe_demand.pay_short.label',
      cost: 'crossroad.tithe_demand.pay_short.cost',
      effects: [
        { k: 'stat', stat: 'grain', mul: 0.88 },
        { k: 'flag', flag: 'watched', years: 10 },
      ],
      visible: [{ k: 'banner', colour: 'grey', years: 2 }],
      seeds: [
        {
          id: 'double_tithe',
          delayYears: [1, 3],
          condition: { k: 'flag', flag: 'watched', set: true },
          effects: [{ k: 'stat', stat: 'grain', mul: 0.7 }],
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.double_tithe',
        },
      ],
      traitWeight: { cunning: 3, greedy: 2 },
    },
    {
      id: 'send_him_away',
      label: 'crossroad.tithe_demand.send_him_away.label',
      cost: 'crossroad.tithe_demand.send_him_away.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: 12 },
        { k: 'flag', flag: 'threatened', years: 6 },
      ],
      visible: [{ k: 'douse', kind: 'smithy' }],
      seeds: [
        {
          id: 'punitive_raid',
          delayYears: [2, 5],
          effects: [
            { k: 'kill', who: 'random', count: 'fraction', fraction: 0.12 },
            { k: 'destroy', kind: 'house', count: 2 },
          ],
          visible: [{ k: 'ruin', kind: 'house' }],
          chronicleKey: 'consequence.punitive_raid',
        },
      ],
      traitWeight: { proud: 3, hot_tempered: 3 },
    },
  ],
};

export const LORD_TEMPLATES: readonly CrossroadTemplate[] = [WINTER_GRAIN_DEBT, TITHE_DEMAND];
