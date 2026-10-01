// M-08 · Quarrels. design.md Annex A.7, A.8.

import { CROSSROAD_EFFECTS } from '../../balance';
import type { CrossroadTemplate } from '../schema';

/**
 * A.7 · A hand on a shoulder. Years of it, and this morning a hand on a
 * shoulder in front of everyone.
 *
 * The works penalties of Annex A are flags: M-14 owns the works and must read
 * `works_slowed` when it advances them.
 *
 * **RD-3 (1 oct 2026) · reescrita contra el dictamen de RD-0.** Salía
 * **exactamente cuatro veces por partida en las diez semillas** (años ~4, 19,
 * 34, 49): su condición era ambiental —`deepestDislike` satura cerca de −100
 * pasado el año 5— y lo único que la frenaba era el reposo de quince años. Y la
 * riña no existía: «A» era un nombrado cualquiera y «B» el que lo odiaba, con
 * una opinión de −1 si no había más. Ahora (1) la riña tiene que ser **real**
 * —B odia a A a −`SMITH_FEUD_MIN_OPINION` o peor— y (2) sólo estalla cuando el
 * valle está **de mal humor** (`morale < SMITH_FEUD_MORALE`), que sube y baja
 * con el hambre y el invierno: ya no es el reposo quien manda sino la
 * historia del valle. «B withdraws» ocurría de 6 a 14 años después y la
 * tarjeta lo prometía hoy: el precio dice lo que pasa y cuándo. El título
 * prometía al herrero y al cura y el reparto no los usaba, así que ya no los
 * promete.
 *
 * **Y `side_with_*` ya no apaga la fragua** (`lit smithy off`). Era **para
 * siempre**: nada del motor vuelve a encender una fragua apagada salvo levantar
 * otra o `feud_inherited.give_b_the_smithy`, y una fragua apagada deja sin
 * picar piedra (`canQuarry`), sin el bono de oficio (`LABOUR.SMITHY_BONUS`) y
 * sin camino de herrería. Ningún precio lo decía. Con `build_together` oculto
 * hasta que hay anillo (`room palisade`), `side_with_*` sale más a menudo (10 de
 * 40 → 11 de 26 con la política prudente) y habría apagado la fragua de media
 * partida y retrasado la piedra y la villa. Se queda el `works_slowed_85` de
 * cuatro años, que es el precio de verdad, y el precio lo dice.
 */
export const SMITH_FEUD: CrossroadTemplate = {
  id: 'smith_feud',
  category: 'feud',
  weight: 9,
  cooldownYears: 20,
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
    // RD-3 · un valle de mal humor: el disparador episódico.
    { k: 'stat', stat: 'morale', op: '<', v: CROSSROAD_EFFECTS.SMITH_FEUD_MORALE },
  ],
  cast: [
    { as: 'A', anyNamed: true },
    { as: 'B', grudgeAgainst: 'A', min: CROSSROAD_EFFECTS.SMITH_FEUD_MIN_OPINION },
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
        { k: 'flag', flag: 'works_slowed_85', years: 4 },
        { k: 'memory', who: 'B', kind: 'was_blamed', about: 'A', weight: 4 },
      ],
      // A.7's own screen column: "douse del edificio de B", not any smithy. La
      // cámara va a la casa de B (RD-0 §5.4 lo midió real: es la casa de B).
      visible: [{ k: 'douse', kind: 'house', who: 'B' }],
      seeds: [
        {
          id: 'the_withdrawn',
          delayYears: [6, 14],
          effects: [
            { k: 'leave', who: 'B' },
            { k: 'leave', who: 'random', count: 2 },
          ],
          visible: [{ k: 'gather', where: 'ford', days: 3 }],
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
        { k: 'flag', flag: 'works_slowed_85', years: 4 },
        { k: 'memory', who: 'A', kind: 'was_blamed', about: 'B', weight: 4 },
      ],
      // Symmetric to side_with_a: "douse del edificio de A".
      visible: [{ k: 'douse', kind: 'house', who: 'A' }],
      seeds: [
        {
          id: 'the_withdrawn_other',
          delayYears: [6, 14],
          effects: [
            { k: 'leave', who: 'A' },
            { k: 'leave', who: 'random', count: 2 },
          ],
          visible: [{ k: 'gather', where: 'ford', days: 3 }],
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
        { k: 'opinion', from: 'A', to: 'B', delta: -15 },
        { k: 'opinion', from: 'B', to: 'A', delta: -15 },
      ],
      // RD-3 · sólo si hay anillo al que agarrar las estacas: antes de que la
      // aldea lo escriba (once casas, A2c) las cuatro empalizadas se rechazaban
      // en silencio y la opción cobraba su coste sin construir nada.
      requires: [{ k: 'room', building: 'palisade' }],
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
 *
 * **RD-3 (1 oct 2026) · reescrita contra el dictamen de RD-0.** «B» era un hijo
 * cualquiera de «A» y casi nunca un nombrado: la tarjeta pendiente enseñaba la
 * llave `{B}` literal en el título, el cuerpo y los botones (sólo se nombra al
 * *resolver*), y `give_b_the_smithy` le dio el oficio de herrero a una chica de
 * catorce años (`ROLE_MIN_AGE.smith` es 20). Ahora **B es el que de verdad odia
 * a A** (`grudgeAgainst`, ≥ `FEUD_INHERITED_MIN_OPINION`): un nombrado, vivo y
 * adulto, con nombre antes de plantearse y con un rencor que existe. «Heredado»
 * ya no es un parentesco que el reparto no sabía comprobar: es la riña vieja,
 * de la generación de abajo, que no se resolvió. El oficio de la herrería sólo
 * se ofrece si el valle no tiene herrero, y no se da a un menor.
 */
const FEUD_INHERITED: CrossroadTemplate = {
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
    { as: 'B', grudgeAgainst: 'A', min: CROSSROAD_EFFECTS.FEUD_INHERITED_MIN_OPINION },
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
      // RD-3 · el camposanto no se dibuja: lo que se ve es el entierro.
      visible: [{ k: 'gather', where: 'chapel', days: 2 }],
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
        { k: 'memory', who: 'A', kind: 'was_blamed', about: 'B', weight: 4 },
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
      // RD-3 · sólo si la herrería está en pie y sin herrero: dar el oficio a
      // B cuando ya había uno dejaba dos `smith` a la vez (medido).
      requires: [
        { k: 'has', building: 'smithy' },
        { k: 'role', role: 'smith', alive: false },
      ],
      // RD-3 · y lo que se ve es la plaza viendo cómo se le da: la `raise
      // smithy` de antes no levantaba nada.
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [
        {
          id: 'two_smiths',
          delayYears: [5, 12],
          effects: [{ k: 'flag', flag: 'feud_ripe', years: 4 }],
          // RD-3 · ninguna fragua se apaga aquí; lo que se ve es la plaza.
          visible: [{ k: 'gather', where: 'square', days: 2 }],
          chronicleKey: 'consequence.two_smiths',
        },
      ],
      traitWeight: { ambitious: 3, generous: 2 },
    },
  ],
};

export const FEUD_TEMPLATES: readonly CrossroadTemplate[] = [SMITH_FEUD, FEUD_INHERITED];
