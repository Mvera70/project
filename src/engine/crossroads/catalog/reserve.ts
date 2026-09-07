// M-08 · The reserve. design.md Annex A.17.

import type { CrossroadTemplate } from '../schema';

/**
 * A.17 · `quiet_years`.
 *
 * The template the generation guarantee falls back on when nothing else is
 * eligible (§8.6). It exists so the guarantee never fails, not to be
 * interesting, and it plants no seeds — a question about what to do with a
 * surplus should not come back to bite anyone twenty years later.
 *
 * Its only condition is a full granary, which is the one state in which "what
 * shall we do with all this" is a real question.
 */
export const QUIET_YEARS: CrossroadTemplate = {
  id: 'quiet_years',
  category: 'stranger',
  weight: 1,
  // Annex A.17 gives it no cooldown, which in practice let it fire whenever
  // the granary was full — and the granary is usually full. It is the reserve
  // for the guarantee, not the wallpaper: it waits like everything else.
  cooldownYears: 20,
  requires: [{ k: 'ratio', ratio: 'grainYears', op: '>', v: 1.0 }],
  cast: [{ as: 'A', role: 'leader' }],
  title: 'crossroad.quiet_years.title',
  body: 'crossroad.quiet_years.body',
  options: [
    {
      id: 'a_free_work',
      label: 'crossroad.quiet_years.a_free_work.label',
      cost: 'crossroad.quiet_years.a_free_work.cost',
      effects: [
        { k: 'build', kind: 'granary', free: true },
        { k: 'stat', stat: 'grain', mul: 0.94 },
      ],
      visible: [{ k: 'raise', kind: 'granary' }],
      seeds: [],
      traitWeight: { cunning: 2, greedy: 2 },
    },
    {
      id: 'a_season_of_feasting',
      label: 'crossroad.quiet_years.a_season_of_feasting.label',
      cost: 'crossroad.quiet_years.a_season_of_feasting.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: 20 },
        { k: 'stat', stat: 'grain', mul: 0.82 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 6 }],
      seeds: [],
      traitWeight: { generous: 3, kind: 2 },
    },
  ],
};

export const RESERVE_TEMPLATES: readonly CrossroadTemplate[] = [QUIET_YEARS];
