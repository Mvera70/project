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

import { CROSSROAD_EFFECTS, FATE } from '../../balance';
import type { CrossroadTemplate } from '../schema';

/**
 * A.1 · The flagship template, the one `valle.md` §3 opens with.
 *
 * **RD-3 (1 oct 2026) · reescrita contra el dictamen de RD-0.** Tres defectos
 * medidos: llegaba al primer invierno posible con 7–23 personas y 119–838 de
 * grano, y `kneel` daba **+900 fijos** (entre 1,1 y 7,6 veces la despensa);
 * `take_it_at_night` decía «si se descubre» y la semilla `the_reckoning` no
 * tenía condición (era «siempre»); y su `scar felled_wood` no talaba nada.
 * Ahora es una pregunta de **aldea** (veinte personas, no un caserío) y lo que
 * los carros traen es **proporcional a lo que hay en el granero**
 * (`mul`, no `delta`): vale igual para una despensa de 400 que de 2 500.
 */
const WINTER_GRAIN_DEBT: CrossroadTemplate = {
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
    // RD-6 (Vera, 1 oct 2026) · **llega también al caserío**. RD-3 la limitó a
    // aldeas de veinte, y medido en 16 semillas a tres años el hambre pasó de
    // 20 muertes (8 valles) a 39 (13): sin saberlo, era el salvavidas del
    // caserío en su segundo invierno. Sin el límite, con el préstamo
    // proporcional de RD-3, quedan 16 (8 valles) y la población media sube de
    // 13,9 a 19,3.
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
        { k: 'stat', stat: 'grain', mul: CROSSROAD_EFFECTS.KNEEL_GRAIN_MUL },
        { k: 'flag', flag: 'vassal', years: 0 },
        { k: 'stat', stat: 'morale', delta: -12 },
      ],
      visible: [{ k: 'banner', colour: 'grey', years: 0 }],
      seeds: [
        {
          id: 'tithe_due',
          delayYears: [8, 14],
          effects: [
            // RD-3 · una parte del granero, no 450 fijos: el mismo cobro pesa
            // lo mismo en una aldea de treinta que en una de ochenta.
            { k: 'stat', stat: 'grain', mul: CROSSROAD_EFFECTS.TITHE_DUE_MUL },
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
      // v2.25 · §8.1: the written price is a contract. "People will die this
      // winter" used to be morale +10 and a flag, which is a promise of dead
      // villagers paid out as a bonus. The granary goes to the lord's men and
      // next year's reaping comes in at 0.55: the winter does the killing,
      // which is what the sentence says.
      effects: [
        { k: 'stat', stat: 'grain', mul: 0 },
        { k: 'harvest', factor: 0.55, harvests: 1 },
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
      // RD-3 · «Si se descubre» era «siempre»: la semilla no tenía condición y
      // el cobro llegaba en cualquier caso. Ahora el coste lo dice así.
      id: 'take_it_at_night',
      label: 'crossroad.winter_grain_debt.take_it_at_night.label',
      cost: 'crossroad.winter_grain_debt.take_it_at_night.cost',
      effects: [
        { k: 'stat', stat: 'grain', mul: CROSSROAD_EFFECTS.NIGHT_GRAIN_MUL },
        { k: 'stat', stat: 'faith', delta: -15 },
        { k: 'memory', who: 'A', kind: 'stole', weight: 4 },
      ],
      // RD-3 · lo único que se ve de verdad es la aldea en el vado, de noche,
      // con los carros: la tala que prometía el `scar` no existía.
      visible: [{ k: 'gather', where: 'ford', days: 2 }],
      seeds: [
        {
          id: 'the_reckoning',
          delayYears: [3, 9],
          effects: [
            { k: 'kill', who: 'random', count: 'fraction', fraction: 0.15 },
            { k: 'destroy', kind: 'palisade', count: 3 },
          ],
          // RD-3 · lo que se ve son las empalizadas que derriban.
          visible: [{ k: 'ruin', kind: 'palisade' }],
          chronicleKey: 'consequence.the_reckoning',
        },
      ],
      traitWeight: { cunning: 3, secretive: 2, devout: 0.4 },
    },
  ],
};

/** A.2 · Once the valley is a vassal, the ledger comes every autumn. */
const TITHE_DEMAND: CrossroadTemplate = {
  id: 'tithe_demand',
  category: 'lord',
  weight: 6,
  // v2.9. Segunda columna de §8.1: 54 disparos, el 54 % de lo que su reposo
  // permitía, con la elegibilidad ya en el 1.2 %. Cuando endurecer condiciones
  // deja de mover el número, lo que manda es el reposo. El Anexo A pide 20; una
  // visita del recaudador cada treinta años es lo que hace que se note.
  cooldownYears: 30,
  minYear: 6,
  // v2.9. Elegible el 12 % de los ticks: `vassal` es permanente y el otoño es
  // un cuarto del año. El disparador es la cuenta misma — el hombre del señor
  // cuenta las gavillas cuando hay gavillas que contar, no en cualquier otoño.
  // **M-1 · o vasallo, o conocido por rico.** El señor visitaba sólo a quien ya
  // le debía algo (`vassal`); desde el juego de los medios hay otra forma de
  // llamar su atención, y es la que el propio factor de grano siempre cobró:
  // vender el excedente en el camino deja la bandera `watched`, y una caja con
  // plata dentro se sabe. Es la consecuencia de haber prosperado a la vista.
  requires: [
    { k: 'any', cs: [
      { k: 'flag', flag: 'vassal', set: true },
      { k: 'flag', flag: 'watched', set: true },
      { k: 'stat', stat: 'silver', op: '>', v: FATE.RICH_SILVER },
    ] },
    { k: 'season', season: 'autumn', minWeek: 11 },
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

export const LORD_TEMPLATES: readonly CrossroadTemplate[] = [WINTER_GRAIN_DEBT];

/**
 * RD-3 (1 oct 2026) · **Retirada del sorteo: `tithe_demand`.** Duplicaba el
 * diezmo que el motor ya cobra solo cada otoño a cualquier valle de diez
 * personas (`world/road.ts`, `collectTithe`), sin que hubiera un señor en
 * pantalla, y el recaudador «A» era el aldeano que cuenta el grano y no el
 * enviado (`docs/medidas/rd0-encrucijadas-2026-09-30.md` §5.1). Se queda aquí
 * para que un guardado con ella pendiente, o en el registro, siga cargando y
 * con título (`RETIRED_TEMPLATES`, `templateOf`).
 */
export const RETIRED_LORD_TEMPLATES: readonly CrossroadTemplate[] = [TITHE_DEMAND];
