// M-08 · The catalogue. design.md Annex A, §17 M-08.
//
// Sixteen templates, two per category, plus the reserve. Data and nothing else:
// not a function and not an if in this folder.
//
// Effects that need to remain active across ticks are carried as flags. Every
// flag written by this catalogue has a reader; tests/fast/catalog.test.ts keeps
// that inventory closed.
//
//   forced_hunger          M-06 consume():  severity held at 0.5 (A.3)
//   works_slowed_85/_80/_40 M-06 produce(): build points cut (A.7, A.15, A.12)
//   wall_unlocked          M-14 upgrade():  `wall` becomes buildable (A.16)
//   stone_house_unlocked   M-14 upgrade():  `stone_house` becomes buildable (A.16)
//   cold_houses            M-06 overwinter(): winter wood ×1.5 for 20 years (A.16)
//   flood_prone            M-06 rollWeather(): ruinous years +5 points (A.11)
//   feud_ripe              M-07 select():   weights the feud templates up (A.4, A.6, A.8, A.15)
//   behind_the_wall        M-07 select():   lord and stranger weigh ×0.4 (A.16)
//   a_name_in_the_valley   M-07 select():   lord templates weigh ×0.5 (A.14)
//   salted                 M-29 feedAndSlaughter(): meat goes further (§7.8)
//   braced                 B1 world/threat.ts: el saqueo se lleva la mitad (§1b)
//   bought_off             B1 world/threat.ts: la partida se da la vuelta (§1b)
//   known_to_pay           B1 world/threat.ts: el vecino vuelve antes (§1b)
//
// The flags Annex A already named — vassal, proud, watched, threatened,
// hostile — are read by the templates themselves and need nobody else.

import type { Catalogue } from '../schema';
import { FAITH_TEMPLATES } from './faith';
import { FAMINE_TEMPLATES } from './famine';
import { FEUD_TEMPLATES } from './feud';
import { FOREST_TEMPLATES } from './forest';
import { HAMLET_TEMPLATES } from './hamlet';
import { LORD_TEMPLATES } from './lord';
import { PLAGUE_TEMPLATES } from './plague';
import { RAID_TEMPLATES } from './raid';
import { RESERVE_TEMPLATES } from './reserve';
import { STRANGER_TEMPLATES } from './stranger';
import { TRADE_TEMPLATES } from './trade';
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
  // G3 · el caserío. Antes de la reserva porque, a diferencia de ella, sí
  // tiene algo que decir; después de todo lo demás porque nada de lo de
  // arriba compite con menos de diez personas en el valle.
  ...HAMLET_TEMPLATES,
  // M-0 · los tres comerciantes ya no son encrucijadas: son ofertas del camino
  // (`world/road.ts`, los sucesos de visita de `world/fate.ts`). Se quedan en
  // `RETIRED_TEMPLATES` para que una partida guardada que ya los contestó siga
  // cargando, y para que su crónica siga teniendo título.
  // B2 · el aviso del clan vecino (§1b). Va junto a la sucesión porque comparte
  // su privilegio: es una crisis y su pregunta pasa por encima del techo.
  ...RAID_TEMPLATES,
  ...SUCCESSION_TEMPLATES,
  ...RESERVE_TEMPLATES,
];

export { TRADE_TEMPLATES } from './trade';

/**
 * M-0 · Plantillas que ya no se plantean pero que una partida guardada puede
 * nombrar en su registro o tener pendiente. Sólo las leen el guardado y quien
 * busque el título de una decisión pasada.
 */
export const RETIRED_TEMPLATES: Catalogue = [...TRADE_TEMPLATES];
