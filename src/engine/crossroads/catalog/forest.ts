// M-08 · The wood. design.md Annex A.11, A.12.

import type { CrossroadTemplate } from '../schema';

/**
 * A.11 · The old wood. Three hundred years of oak against a winter's worth of
 * children, and the woodward has walked it twice with nothing to say.
 *
 * Annex A gates this on `neededFields > fields`, which is M-06's allocation
 * arithmetic and not a condition the §8.2 DSL can ask. The population floor
 * plus a full-ish granary is the closest the DSL gets, and it fires in the same
 * situations: a village big enough to be short of ground.
 */
export const FOREST_CUT: CrossroadTemplate = {
  id: 'forest_cut',
  category: 'forest',
  weight: 9,
  cooldownYears: 15,
  requires: [
    { k: 'ratio', ratio: 'forestLeft', op: '>', v: 0.12 },
    { k: 'stat', stat: 'people', op: '>', v: 25 },
  ],
  cast: [{ as: 'A', role: 'woodward' }],
  title: 'crossroad.forest_cut.title',
  body: 'crossroad.forest_cut.body',
  options: [
    {
      id: 'fell_it',
      label: 'crossroad.forest_cut.fell_it.label',
      cost: 'crossroad.forest_cut.fell_it.cost',
      effects: [
        { k: 'build', kind: 'field', free: true },
        { k: 'build', kind: 'field', free: true },
        { k: 'fell', wood: 900, permanent: true },
        { k: 'stat', stat: 'wood', delta: 900 },
        { k: 'stat', stat: 'faith', delta: -10 },
      ],
      visible: [{ k: 'scar', what: 'felled_wood' }],
      seeds: [
        {
          id: 'bare_slopes',
          delayYears: [20, 40],
          effects: [{ k: 'flag', flag: 'flood_prone', years: 0 }],
          visible: [{ k: 'scar', what: 'burnt_field' }],
          chronicleKey: 'consequence.bare_slopes',
        },
      ],
      traitWeight: { greedy: 2, ambitious: 2, devout: 0.5 },
    },
    {
      id: 'take_the_edge',
      label: 'crossroad.forest_cut.take_the_edge.label',
      cost: 'crossroad.forest_cut.take_the_edge.cost',
      effects: [
        { k: 'build', kind: 'field', free: true },
        { k: 'fell', wood: 300, permanent: false },
        { k: 'stat', stat: 'wood', delta: 300 },
        { k: 'flag', flag: 'forced_hunger', years: 1 / 48 },
      ],
      visible: [{ k: 'raise', kind: 'field' }],
      seeds: [],
      traitWeight: { cunning: 2 },
    },
    {
      id: 'leave_it_standing',
      label: 'crossroad.forest_cut.leave_it_standing.label',
      cost: 'crossroad.forest_cut.leave_it_standing.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: -8 },
        { k: 'stat', stat: 'faith', delta: 12 },
        { k: 'memory', who: 'A', kind: 'was_saved', weight: 3 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 2 }],
      seeds: [
        {
          id: 'the_wood_holds',
          delayYears: [15, 35],
          condition: { k: 'ratio', ratio: 'forestLeft', op: '>', v: 0.5 },
          effects: [
            { k: 'arrive', count: 3 },
            { k: 'stat', stat: 'morale', delta: 10 },
          ],
          visible: [{ k: 'gather', where: 'ford', days: 3 }],
          chronicleKey: 'consequence.the_wood_holds',
        },
      ],
      traitWeight: { devout: 2, stubborn: 2, loyal: 2 },
    },
  ],
};

/**
 * A.12 · Tracks at the palisade, three nights running.
 *
 * The works slowdown of the third option is the `works_slowed` flag, read by
 * M-14, and the visible effect is the village not coming out for six ticks.
 *
 * `forestLeft > 0.25` was **inalcanzable**, the same erratum as A.11's original
 * 0.3: `forestLeft` is standing forest over the whole map, `MAPGEN.FOREST_FRACTION`
 * founds the valley at 0.20-0.26, and it only falls from there as fields are
 * cut, so no seed ever crosses 0.25 — measured 0.177-0.244 across four seeds ×
 * sixty years, never once above the door. As with A.11 the forest here is a
 * **gate** — "there is enough wood left for wolves to be a threat" — not the
 * template's episodic driver, which is `season = winter` plus `people > 15`.
 * Lowered to 0.15, comfortably under every measured floor in that window.
 */
export const WOLF_WINTER: CrossroadTemplate = {
  id: 'wolf_winter',
  category: 'forest',
  weight: 7,
  cooldownYears: 12,
  requires: [
    { k: 'season', season: 'winter' },
    // **Se queda en 0.25, y el mapa grande es la razón** (15 sep 2026). La rama
    // del 14 sep lo bajaba a 0.15 con una medida buena: en el mapa de 36 × 56 el
    // valle fundaba entre 0.20 y 0.26 (`MAPGEN.FOREST_FRACTION`) y `forestLeft`
    // sólo baja desde ahí, así que 0.25 era **inalcanzable por construcción**,
    // la misma errata que el 0.3 de A.11. Pero v3.68 redefinió `forestLeft`
    // contra el corazón productivo y con eso el umbral **ya se cruza**: medido al
    // fusionar, `crossroads-reachability.test.ts` lo encuentra elegible sin
    // tocar nada. Bajarlo ahora sería mover cinco pruebas medidas para arreglar
    // algo que el mapa arregló solo.
    { k: 'ratio', ratio: 'forestLeft', op: '>', v: 0.25 },
    { k: 'stat', stat: 'people', op: '>', v: 15 },
  ],
  cast: [
    { as: 'A', role: 'woodward' },
    { as: 'B', youngestNamed: true },
  ],
  title: 'crossroad.wolf_winter.title',
  body: 'crossroad.wolf_winter.body',
  options: [
    {
      id: 'hunt_them',
      label: 'crossroad.wolf_winter.hunt_them.label',
      cost: 'crossroad.wolf_winter.hunt_them.cost',
      // Annex A makes the death a 35% chance. The DSL has no probability on an
      // effect, so the toll is taken as a fraction instead — over a hundred
      // years of hunts it costs the same and it never lies about the odds.
      effects: [
        { k: 'kill', who: 'random', count: 'fraction', fraction: 0.02 },
        { k: 'stat', stat: 'morale', delta: 12 },
        { k: 'stat', stat: 'wood', delta: 120 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 3 }],
      seeds: [],
      traitWeight: { hardy: 3, hot_tempered: 2, craven: 0.3 },
    },
    {
      id: 'build_the_palisade',
      label: 'crossroad.wolf_winter.build_the_palisade.label',
      cost: 'crossroad.wolf_winter.build_the_palisade.cost',
      effects: [
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'build', kind: 'palisade', free: true },
        { k: 'stat', stat: 'wood', delta: -180 },
        { k: 'stat', stat: 'morale', delta: 5 },
      ],
      visible: [{ k: 'raise', kind: 'palisade' }],
      seeds: [],
      traitWeight: { cunning: 2, hardy: 2 },
    },
    {
      id: 'keep_everyone_inside',
      label: 'crossroad.wolf_winter.keep_everyone_inside.label',
      cost: 'crossroad.wolf_winter.keep_everyone_inside.cost',
      effects: [
        { k: 'flag', flag: 'works_slowed_40', years: 6 / 48 },
        { k: 'stat', stat: 'wood', delta: -60 },
        { k: 'stat', stat: 'morale', delta: -8 },
      ],
      visible: [{ k: 'douse', kind: 'house' }],
      seeds: [
        {
          id: 'the_long_indoors',
          delayYears: [1, 1],
          effects: [{ k: 'stat', stat: 'morale', delta: -6 }],
          visible: [{ k: 'gather', where: 'square', days: 1 }],
          chronicleKey: 'consequence.the_long_indoors',
        },
      ],
      traitWeight: { craven: 3, kind: 2 },
    },
  ],
};

export const FOREST_TEMPLATES: readonly CrossroadTemplate[] = [FOREST_CUT, WOLF_WINTER];
