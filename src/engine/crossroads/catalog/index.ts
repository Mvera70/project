// M-08 · The catalogue. design.md Annex A, §17 M-08.
//
// Sixteen templates, two per category, plus the reserve. Data and nothing else:
// not a function and not an if in this folder.
//
// What Annex A describes and the §8.4 effect DSL cannot express is carried as
// `flag` effects, so that the decision is recorded in the state where it
// belongs and the mechanics stay with the module that owns them. Every one of
// these has to be read by somebody before the catalogue is finished:
//
//   forced_hunger          M-06 consume():  severity held at 0.5 (A.3)
//   lean_harvest           M-06 harvest():  the year's yield ×0.55 (A.3)
//   half_harvest           M-06 harvest():  the year's yield ×0.78 (A.3)
//   outbreak_slower        M-06:            the sickness runs longer (A.5, A.6)
//   outbreak_faster        M-06:            the sickness runs shorter (A.5)
//   works_slowed_85/_80/_40 M-06 produce(): build points cut (A.7, A.15, A.12)
//   wall_unlocked          M-14 upgrade():  `wall` becomes buildable (A.16)
//   stone_house_unlocked   M-14 upgrade():  `stone_house` becomes buildable (A.16)
//   cold_houses            M-06 overwinter(): winter wood ×1.5 for 20 years (A.16)
//   burnt_row              M-14:            those ruins are never rebuilt (A.5)
//   flood_prone            M-06 rollWeather(): ruinous years +5 points (A.11)
//   unconsecrated          M-08 later:      opens a template of its own (A.5)
//   feud_ripe              M-07 select():   weights the feud templates up (A.4, A.6, A.8, A.15)
//   behind_the_wall        M-07 scoring:    lord and stranger weigh less (A.16)
//   a_name_in_the_valley   M-07 scoring:    lord templates weigh less (A.14)
//
// The flags Annex A already named — vassal, proud, watched, threatened,
// hostile — are read by the templates themselves and need nobody else.

import type { Catalogue } from '../schema';
import { FAITH_TEMPLATES } from './faith';
import { FAMINE_TEMPLATES } from './famine';
import { FEUD_TEMPLATES } from './feud';
import { FOREST_TEMPLATES } from './forest';
import { LORD_TEMPLATES } from './lord';
import { PLAGUE_TEMPLATES } from './plague';
import { RESERVE_TEMPLATES } from './reserve';
import { STRANGER_TEMPLATES } from './stranger';
import { SUCCESSION_TEMPLATES } from './succession';

/**
 * The order is the order of Annex A. It does not affect selection — `eligible`
 * sorts by score and breaks ties on the id — but it keeps the file readable
 * against the annex it transcribes.
 */
export const CATALOG: Catalogue = [
  ...LORD_TEMPLATES,
  ...FAMINE_TEMPLATES,
  ...PLAGUE_TEMPLATES,
  ...FEUD_TEMPLATES,
  ...FAITH_TEMPLATES,
  ...FOREST_TEMPLATES,
  ...STRANGER_TEMPLATES,
  ...SUCCESSION_TEMPLATES,
  ...RESERVE_TEMPLATES,
];

export { FAITH_TEMPLATES } from './faith';
export { FAMINE_TEMPLATES } from './famine';
export { FEUD_TEMPLATES } from './feud';
export { FOREST_TEMPLATES } from './forest';
export { LORD_TEMPLATES } from './lord';
export { PLAGUE_TEMPLATES } from './plague';
export { RESERVE_TEMPLATES } from './reserve';
export { STRANGER_TEMPLATES } from './stranger';
export { SUCCESSION_TEMPLATES } from './succession';
