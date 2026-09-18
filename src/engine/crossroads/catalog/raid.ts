// B2 · El aviso: una partida del valle vecino viene de camino. design.md §1b.
//
// Data only: not a function, not an if, like every sibling in esta carpeta.
//
// **Por qué esta plantilla puede saltarse el techo de §8.6.** Su categoría
// (`raid`) es una crisis mientras `state.threat.comingTick` no es nulo
// (`select.ts`, `crisisOf`), y una crisis deja pasar su propia pregunta. Sin
// eso el aviso llegaría cuando el reloj de las encrucijadas lo permitiera, que
// puede ser dos años después de que hayan quemado el granero: un aviso que
// avisa tarde no es un aviso.
//
// **Y lo que cada opción hace lo lee `world/threat.ts`**, no este fichero. Aquí
// sólo se apunta la decisión como bandera, que es el trato que Anexo A.1 dejó
// escrito para todo lo que el DSL de §8.4 no sabe expresar: la mecánica se
// queda con el módulo que la posee y la decisión queda en el estado.

import { THREAT } from '../../balance';
import type { CrossroadTemplate } from '../schema';

/**
 * §1b · Los ocho semanas entre que el clan decide bajar y llega.
 *
 * Tres salidas, y ninguna es gratis: esconder lo que se pueda cuesta trabajo
 * que no va a la obra, pagarles cuesta la plata que iban a llevarse de todas
 * formas, y esperarles no cuesta nada hoy y puede costarlo todo el día que
 * lleguen.
 */
const RAIDERS_COMING: CrossroadTemplate = {
  id: 'raiders_coming',
  category: 'raid',
  weight: 30,
  // Cada partida que baja es su propia pregunta: no hay cooldown que valga
  // cuando el motivo de preguntar está andando hacia el valle.
  cooldownYears: 0,
  requires: [{ k: 'raid', coming: true }],
  cast: [{ as: 'A', role: 'leader' }],
  title: 'crossroad.raiders_coming.title',
  body: 'crossroad.raiders_coming.body',
  options: [
    {
      // Meter dentro lo que quepa: el ganado, el grano, la gente. Cuesta la
      // semana de trabajo de media aldea.
      id: 'brace',
      label: 'crossroad.raiders_coming.brace.label',
      cost: 'crossroad.raiders_coming.brace.cost',
      effects: [
        { k: 'flag', flag: 'braced', years: 1 },
        { k: 'stat', stat: 'wood', delta: -20 },
        { k: 'stat', stat: 'morale', delta: -4 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [],
      traitWeight: { craven: 2, proud: 0.6 },
    },
    {
      // Pagarles para que se den la vuelta. Funciona —esta vez— y les enseña
      // el camino: la semilla los trae antes la próxima.
      id: 'pay',
      label: 'crossroad.raiders_coming.pay.label',
      cost: 'crossroad.raiders_coming.pay.cost',
      effects: [
        { k: 'flag', flag: 'bought_off', years: 1 },
        { k: 'stat', stat: 'silver', delta: -THREAT.PAY_OFF_SILVER },
        { k: 'stat', stat: 'morale', delta: -6 },
      ],
      visible: [{ k: 'banner', colour: 'grey', years: 1 }],
      seeds: [
        {
          // Lo que cuesta pagar: el vecino sabe que aquí se paga.
          id: 'they_come_again',
          delayYears: [2, 4],
          effects: [{ k: 'flag', flag: 'known_to_pay', years: 8 }],
          visible: [{ k: 'banner', colour: 'grey', years: 1 }],
          chronicleKey: 'consequence.they_come_again',
        },
      ],
      // Sólo si hay con qué pagar.
      requires: [{ k: 'stat', stat: 'silver', op: '>=', v: THREAT.PAY_OFF_SILVER }],
      traitWeight: { cunning: 1.5, proud: 0.4 },
    },
    {
      // Esperarles. No cuesta nada hoy.
      id: 'wait',
      label: 'crossroad.raiders_coming.wait.label',
      cost: 'crossroad.raiders_coming.wait.cost',
      effects: [{ k: 'stat', stat: 'morale', delta: -2 }],
      visible: [{ k: 'gather', where: 'ford', days: 1 }],
      seeds: [],
      traitWeight: { proud: 2, craven: 0.4 },
    },
  ],
};

/**
 * §1b · La semana de después. La marca `just_sacked` la pone `world/threat.ts`
 * cuando se llevan algo, y dura un año.
 *
 * Es la otra mitad de la historia y la que hace que un asalto deje poso: la
 * aldea acaba de perder grano y ganado, y lo que decide ahora dice qué clase de
 * valle es. Ir detrás de ellos puede recuperar lo robado o dejar viudas; encajar
 * el golpe y levantar cerco cuesta lo que cuesta la madera.
 */
const AFTER_THE_RAID: CrossroadTemplate = {
  id: 'after_the_raid',
  category: 'raid',
  weight: 14,
  cooldownYears: 3,
  requires: [
    { k: 'flag', flag: 'just_sacked', set: true },
    { k: 'raid', coming: false },
  ],
  cast: [{ as: 'A', role: 'leader' }, { as: 'B', anyNamed: true, excluding: ['A'] }],
  title: 'crossroad.after_the_raid.title',
  body: 'crossroad.after_the_raid.body',
  options: [
    {
      // Ir detrás. Se recupera algo y se paga con gente.
      id: 'chase',
      label: 'crossroad.after_the_raid.chase.label',
      cost: 'crossroad.after_the_raid.chase.cost',
      effects: [
        { k: 'stat', stat: 'grain', delta: 120 },
        { k: 'kill', who: 'random', count: 1 },
        { k: 'stat', stat: 'morale', delta: 6 },
      ],
      visible: [{ k: 'gather', where: 'ford', days: 2 }],
      seeds: [],
      traitWeight: { proud: 2, hot_tempered: 2, craven: 0.3 },
    },
    {
      // Levantar cerco: la madera que iba a las casas se va a la muralla.
      id: 'build_up',
      label: 'crossroad.after_the_raid.build_up.label',
      cost: 'crossroad.after_the_raid.build_up.cost',
      effects: [
        { k: 'stat', stat: 'wood', delta: -80 },
        { k: 'flag', flag: 'threatened', years: 3 },
        { k: 'stat', stat: 'morale', delta: -3 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [],
      traitWeight: { cunning: 1.5, proud: 0.7 },
    },
    {
      // Encajarlo y seguir. Lo que hace una aldea que no puede permitirse más.
      id: 'bear_it',
      label: 'crossroad.after_the_raid.bear_it.label',
      cost: 'crossroad.after_the_raid.bear_it.cost',
      effects: [
        { k: 'stat', stat: 'morale', delta: -8 },
        { k: 'memory', who: 'B', kind: 'was_blamed', weight: 2 },
      ],
      visible: [{ k: 'gather', where: 'chapel', days: 1 }],
      seeds: [],
      traitWeight: { kind: 1.5, proud: 0.4 },
    },
  ],
};

export const RAID_TEMPLATES: readonly CrossroadTemplate[] = [RAIDERS_COMING, AFTER_THE_RAID];
