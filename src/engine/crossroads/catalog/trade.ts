// M-30 · Who comes up the road to sell. design.md §7.8, Annex A.
//
// There are no neighbouring villages on the map and there will not be. What
// the valley knows of the outside world is who walks into it, and that is the
// whole point: a trader is a person with a road behind him and a story he
// tells about it. The places they come from exist only in what they say.
//
// Each of these touches a different system on purpose. The drover moves the
// herd of §7.7, the salter changes what slaughtering is worth, and the factor
// trades the granary against the woods. A trader who only moved grain would be
// a menu.

import type { CrossroadTemplate } from '../schema';

/**
 * The cattle drover. Comes down the road in spring with more head than he can
 * winter, which is why he is selling at all — and why the beasts are thin.
 *
 * He asks for bread, so a village that has none does not get the offer: an
 * option nobody can take is not a decision.
 */
export const CATTLE_DROVER: CrossroadTemplate = {
  id: 'cattle_drover',
  category: 'trade',
  weight: 8,
  cooldownYears: 15,
  requires: [
    { k: 'season', season: 'spring' },
    { k: 'stat', stat: 'people', op: '>=', v: 10 },
    { k: 'flag', flag: 'hostile', set: false },
    { k: 'stat', stat: 'grain', op: '>', v: 200 },
    { k: 'ratio', ratio: 'grainYears', op: '>', v: 0.8 },
  ],
  cast: [
    { as: 'A', role: 'leader' },
    { as: 'B', role: 'reeve' },
  ],
  title: 'crossroad.cattle_drover.title',
  body: 'crossroad.cattle_drover.body',
  options: [
    {
      id: 'buy_the_cow',
      label: 'crossroad.cattle_drover.buy_the_cow.label',
      cost: 'crossroad.cattle_drover.buy_the_cow.cost',
      effects: [
        { k: 'herd', kind: 'cows', delta: 1 },
        { k: 'stat', stat: 'grain', delta: -120 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [],
    },
    {
      id: 'sell_him_pigs',
      label: 'crossroad.cattle_drover.sell_him_pigs.label',
      cost: 'crossroad.cattle_drover.sell_him_pigs.cost',
      // The other direction, and the one that makes the herd a thing kept for
      // a reason: pigs are the cheap head, and he pays in bread.
      effects: [
        { k: 'herd', kind: 'pigs', delta: -2 },
        { k: 'stat', stat: 'grain', delta: 90 },
        { k: 'stat', stat: 'morale', delta: 2 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [],
    },
    {
      id: 'send_him_on',
      label: 'crossroad.cattle_drover.send_him_on.label',
      cost: 'crossroad.cattle_drover.send_him_on.cost',
      effects: [{ k: 'stat', stat: 'morale', delta: -1 }],
      visible: [{ k: 'gather', where: 'ford', days: 1 }],
      seeds: [],
    },
  ],
};

/**
 * The salt carrier. Salt is the one good here that is neither food nor timber:
 * it is what makes food keep. Buying it is an investment, which is a shape the
 * catalogue did not have — every other option spends to fix something now.
 *
 * The `salted` flag is read by M-29's slaughter: a village with salt gets more
 * out of every head it kills, for as long as the salt lasts.
 */
export const SALT_CARRIER: CrossroadTemplate = {
  id: 'salt_carrier',
  category: 'trade',
  weight: 7,
  cooldownYears: 20,
  requires: [
    { k: 'season', season: 'summer' },
    { k: 'stat', stat: 'people', op: '>=', v: 12 },
    { k: 'flag', flag: 'hostile', set: false },
    { k: 'has', building: 'granary' },
    { k: 'ratio', ratio: 'grainYears', op: '>', v: 0.7 },
  ],
  cast: [
    { as: 'A', role: 'reeve' },
    { as: 'B', role: 'leader' },
  ],
  title: 'crossroad.salt_carrier.title',
  body: 'crossroad.salt_carrier.body',
  options: [
    {
      id: 'buy_the_salt',
      label: 'crossroad.salt_carrier.buy_the_salt.label',
      cost: 'crossroad.salt_carrier.buy_the_salt.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: -70 },
        { k: 'flag', flag: 'salted', years: 12 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 3 }],
      seeds: [],
    },
    {
      id: 'haggle',
      label: 'crossroad.salt_carrier.haggle.label',
      cost: 'crossroad.salt_carrier.haggle.cost',
      // Cheaper salt, less of it, and a man who remembers the valley as tight.
      effects: [
        { k: 'stat', stat: 'grain', delta: -35 },
        { k: 'flag', flag: 'salted', years: 5 },
        { k: 'stat', stat: 'morale', delta: -2 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 1 }],
      seeds: [],
      traitWeight: { hardy: 2 },
    },
    {
      id: 'no_salt',
      label: 'crossroad.salt_carrier.no_salt.label',
      cost: 'crossroad.salt_carrier.no_salt.cost',
      effects: [{ k: 'stat', stat: 'morale', delta: -1 }],
      visible: [{ k: 'gather', where: 'ford', days: 1 }],
      seeds: [],
    },
  ],
};

/**
 * The grain factor. He buys what a good year left over — and the point is that
 * the surplus was going to rot anyway: §5.3's spoilage eats everything above
 * what the granaries hold, so a full valley is throwing bread away every week.
 *
 * Which makes selling it look free, and it is not. A factor who buys here goes
 * and tells the road what this valley has. The price is not grain, it is being
 * noticed — `watched` is read by the lord templates, and being known as rich is
 * how a valley acquires a lord's interest.
 *
 * Two earlier versions of this trader were measured and thrown away. He first
 * required a cut-over forest, which never happens in the coverage bench (it
 * never drops below 45% wooded, which is exactly why `forest_cut` sits in that
 * test's SLOW list). Then he required a low wood store, which never happens
 * either: measured across twelve seeds and a hundred years, the timber store
 * never fell below 507 and reached 43,000. Timber is not scarce in this game.
 * A surplus of grain is, however, entirely ordinary.
 */
export const GRAIN_FACTOR: CrossroadTemplate = {
  id: 'grain_factor',
  category: 'trade',
  weight: 8,
  cooldownYears: 12,
  requires: [
    { k: 'season', season: 'autumn' },
    { k: 'stat', stat: 'people', op: '>=', v: 10 },
    { k: 'flag', flag: 'hostile', set: false },
    // Two years of bread in hand: enough that the granary is losing some of it
    // to spoilage every week, which is what makes the offer tempting.
    { k: 'ratio', ratio: 'grainYears', op: '>', v: 2.0 },
    { k: 'has', building: 'granary' },
  ],
  cast: [
    { as: 'A', role: 'reeve' },
    { as: 'B', role: 'woodward' },
  ],
  title: 'crossroad.grain_factor.title',
  body: 'crossroad.grain_factor.body',
  options: [
    {
      id: 'sell_the_surplus',
      label: 'crossroad.grain_factor.sell_the_surplus.label',
      cost: 'crossroad.grain_factor.sell_the_surplus.cost',
      effects: [
        { k: 'stat', stat: 'grain', mul: 0.8 },
        { k: 'stat', stat: 'wood', delta: 260 },
        { k: 'stat', stat: 'morale', delta: 3 },
        // The real price. `watched` is read by the lord templates: a valley
        // known on the road as one with grain to spare is a valley somebody
        // eventually comes to collect from.
        { k: 'flag', flag: 'watched', years: 15 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 3 }],
      seeds: [],
    },
    {
      id: 'keep_it_all',
      label: 'crossroad.grain_factor.keep_it_all.label',
      cost: 'crossroad.grain_factor.keep_it_all.cost',
      // Keeping it is not free either: the store goes on rotting, and the
      // woodward wanted that timber.
      effects: [{ k: 'stat', stat: 'morale', delta: -3 }],
      visible: [{ k: 'gather', where: 'ford', days: 1 }],
      seeds: [],
    },
  ],
};

export const TRADE_TEMPLATES: CrossroadTemplate[] = [
  CATTLE_DROVER,
  SALT_CARRIER,
  GRAIN_FACTOR,
];
