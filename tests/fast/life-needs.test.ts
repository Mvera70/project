// Lo lento de este fichero vive en `tests/journeys/life-needs-long.test.ts` (v5.56).
//
// V-04 y V-05 · Los impulsos y lo que el mundo ofrece. Anexo E.
//
// Lo que guardan estas pruebas son las dos reglas de las que depende que la
// variedad sea de verdad y no un dado:
//
// 1. **El carácter cambia lo que a uno le pide el cuerpo.** Si dos personas con
//    el mismo día acaban con los mismos impulsos, todo lo que venga encima
//    elegirá lo mismo y el valle será una coreografía.
// 2. **Ninguna oferta conoce a nadie.** En cuanto una diga «si pasa fulano…»,
//    esto deja de ser un mundo con cosas y es un guion disfrazado.

import { describe, expect, it } from 'vitest';
import type { Trait } from '@engine/state';
import {
  drift, freshNeeds, loudest, NEED_NAMES, paceOf, type Doing, type Needs,
} from '../../src/render3d/life/needs';
import {
  OFFERS, } from '../../src/render3d/life/offers';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { worth } from '../../src/render3d/life/decide';const IDLE: Doing = { moving: false, withOthers: false, working: false, hunger: 0 };

/** Una jornada entera de impulsos, haciendo lo que se le diga. */
function liveADay(traits: readonly Trait[], doing: Doing): Needs {
  const needs = freshNeeds();
  for (let n = 0; n < STEPS_PER_DAY; n += 1) drift(needs, traits, doing, LIFE_STEP);
  return needs;
}

describe('V-04 · los impulsos', () => {
  it('dos caracteres distintos acaban el día distintos', () => {
    // La propiedad de la que cuelga la variedad. Si esto se rompe, el valle
    // entero elige lo mismo a la misma hora.
    const calm = liveADay(['kind', 'hardy'], IDLE);
    const fierce = liveADay(['hot_tempered', 'frail'], IDLE);
    expect(fierce.irritation, 'el de mal genio se enciende antes')
      .toBeGreaterThan(calm.irritation * 2);

    // **El cansancio se compara andando**, que es cuando existe: parado baja, y
    // quieto todo el día los dos llegan a cero y no se distingue nada.
    const walking: Doing = { ...IDLE, moving: true };
    const tough = liveADay(['hardy'], walking);
    const weak = liveADay(['frail'], walking);
    expect(weak.rest, 'el enclenque se cansa antes').toBeGreaterThan(tough.rest);

    // **A media jornada, no al final.** El hablador llega al tope antes de que
    // acabe el día —que es lo que significa el tope: no puede pensar en otra
    // cosa— y comparar dos cosas cuando una está saturada no compara nada.
    const half = (traits: Trait[]): number => {
      const needs = freshNeeds();
      for (let n = 0; n < STEPS_PER_DAY / 2; n += 1) drift(needs, traits, IDLE, LIFE_STEP);
      return needs.company;
    };
    expect(half(['generous']), 'el hablador echa de menos a la gente')
      .toBeGreaterThan(half(['secretive']) * 2);
  });

  it('lo que se hace calma lo que toca', () => {
    // Cada impulso tiene su remedio, y se comprueba que el remedio funciona: un
    // impulso que sólo sube no es un impulso, es un reloj.
    const still = liveADay([], IDLE);
    const walking = liveADay([], { ...IDLE, moving: true });
    expect(walking.rest, 'andar cansa; parado se descansa').toBeGreaterThan(still.rest);

    const alone = liveADay([], IDLE);
    const together = liveADay([], { ...IDLE, withOthers: true });
    expect(together.company, 'la compañía se calma con compañía').toBeLessThan(alone.company);

    const idle = liveADay([], IDLE);
    const busy = liveADay([], { ...IDLE, working: true });
    expect(busy.duty, 'el deber se calma trabajando').toBeLessThan(idle.duty);
  });

  it('el hambre de la aldea agria a todo el mundo', () => {
    // La misma idea de §7.9 en la capa de vida: un año de hambre no sólo mata
    // gente, enemista a la que queda.
    const fed = liveADay([], IDLE);
    const starving = liveADay([], { ...IDLE, hunger: 1 });
    expect(starving.irritation).toBeGreaterThan(fed.irritation);
  });

  it('no consume azar, y el mismo día da lo mismo', () => {
    // §4.3. Mirar el valle no puede cambiarlo, ni siquiera por dentro.
    const one = liveADay(['proud', 'loyal'], { ...IDLE, moving: true });
    const two = liveADay(['proud', 'loyal'], { ...IDLE, moving: true });
    for (const name of NEED_NAMES) expect(one[name]).toBe(two[name]);
  });

  it('en una jornada corriente aprieta más de un impulso', () => {
    // Si siempre ganara el mismo, la elección de V-06 sería una constante con
    // pasos intermedios. Se mira qué manda a lo largo del día.
    const needs = freshNeeds();
    const seen = new Set<string>();
    for (let n = 0; n < STEPS_PER_DAY * 2; n += 1) {
      const doing: Doing = {
        moving: n % 900 < 450,
        withOthers: n % 1200 < 300,
        working: n % 1500 < 700,
        hunger: 0.2,
      };
      drift(needs, ['ambitious'], doing, LIFE_STEP);
      seen.add(loudest(needs).need);
    }
    expect(seen.size, `a lo largo de dos jornadas mandan: ${[...seen].join(', ')}`)
      .toBeGreaterThan(1);
  });

  it('el carácter acelera, no cambia de impulso', () => {
    // `paceOf` es el reparto de personalidades, y tiene que leerse al derecho.
    expect(paceOf(['hot_tempered'], 'irritation')).toBeGreaterThan(paceOf([], 'irritation'));
    expect(paceOf(['kind'], 'irritation')).toBeLessThan(paceOf([], 'irritation'));
    expect(paceOf(['secretive'], 'company')).toBeLessThan(paceOf([], 'company'));
    // Un rasgo que no toca un impulso lo deja exactamente igual.
    expect(paceOf(['devout'], 'rest')).toBe(paceOf([], 'rest'));
  });
});

describe('V-05 · lo que el mundo ofrece', () => {
  it('ninguna oferta conoce a nadie', () => {
    // La regla que separa un mundo con cosas de un guion con disfraz. Se
    // comprueba sobre la forma del catálogo: una oferta es qué, dónde, cuánto
    // cabe y qué calma. Si alguna gana un campo que nombre a una persona, un
    // oficio o una decisión, aquí salta.
    const allowed = new Set(['id', 'reach', 'seats', 'gives', 'seconds', 'routineOnly']);
    for (const [name, spec] of Object.entries(OFFERS)) {
      for (const field of Object.keys(spec)) {
        expect(allowed.has(field), `la oferta ${name} habla de '${field}'`).toBe(true);
      }
      expect(spec.seats, `${name} tiene que caber alguien`).toBeGreaterThan(0);
      expect(spec.seconds[0], `${name} dura algo`).toBeGreaterThan(0);
      expect(spec.seconds[1]).toBeGreaterThanOrEqual(spec.seconds[0]);
      // Y calma algo: una oferta que no sirve para nada no la elegirá nadie.
      expect(Object.keys(spec.gives).length, `${name} no calma nada`).toBeGreaterThan(0);
    }
  });
});

describe('IA-3 · aldeanos con hábitos', () => {
  it('un devoto busca la capilla más lejos que un pozo cualquiera', () => {
    // «Preferencia contextual por capilla alcanzable» (brief IA-3): el radio
    // de búsqueda de `decide()` se estira para un `devout` frente a una
    // capilla, y no frente a cualquier otra cosa. Se comprueba con `worth()`,
    // que es la pieza pública que puntúa: a la misma distancia e igualdad de
    // necesidad, un `devout` valora rezar por encima de cualquiera sin el
    // rasgo — la propiedad de la que depende que le compense caminar más.
    const needs = { ...freshNeeds(), irritation: 0.6, boredom: 0.4 };
    const pray = OFFERS.pray;
    expect(pray).toBeDefined();
    if (pray === undefined) return;
    const offer = { ...pray, at: { x: 10, z: 10 }, spots: [{ x: 10, z: 10 }] };
    const from = { x: 10, z: 4 };
    const scorePlain = worth(offer, needs, [], from);
    const scoreDevout = worth(offer, needs, ['devout'], from);
    expect(scoreDevout, 'la capilla vale más para el devoto a la misma distancia')
      .toBeGreaterThan(scorePlain);
  });});
