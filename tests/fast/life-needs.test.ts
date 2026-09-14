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
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import type { GameState, Trait } from '@engine/state';
import { blockedAt } from '../../src/render3d/life/body';
import { terrainOf } from '../../src/render3d/life/terrain';
import {
  drift, freshNeeds, loudest, NEED_NAMES, paceOf, type Doing, type Needs,
} from '../../src/render3d/life/needs';
import {
  OFFERS, offersNear, placesOf, seatKey, type Place,
} from '../../src/render3d/life/offers';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';

const grown = new Map<number, GameState>();
function village(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, 40 * 48, 'prudent', CATALOG);
    grown.set(seed, base);
  }
  return base;
}

const IDLE: Doing = { moving: false, withOthers: false, working: false, hunger: 0 };

/** Una jornada entera de impulsos, haciendo lo que se le diga. */
function liveADay(traits: readonly Trait[], doing: Doing): Needs {
  const needs = freshNeeds();
  for (let n = 0; n < STEPS_PER_DAY; n += 1) drift(needs, traits, doing, LIFE_STEP);
  return needs;
}

describe('V-04 · los impulsos', () => {
  it('ninguno se sale de sus casillas, haga uno lo que haga', () => {
    // Seis jornadas seguidas y cuatro maneras de pasarlas. Un impulso por
    // encima de uno o por debajo de cero rompe la elección de V-06 sin avisar,
    // porque lo que allí se compara son fracciones.
    const ways: Doing[] = [
      IDLE,
      { moving: true, withOthers: false, working: true, hunger: 0 },
      { moving: false, withOthers: true, working: false, hunger: 1 },
      { moving: true, withOthers: true, working: true, hunger: 0.5 },
    ];
    for (const traits of [[], ['hot_tempered'], ['frail', 'craven'], ['hardy', 'secretive']] as Trait[][]) {
      const needs = freshNeeds();
      for (let day = 0; day < 6; day += 1) {
        const doing = ways[day % ways.length] as Doing;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          drift(needs, traits, doing, LIFE_STEP);
          for (const name of NEED_NAMES) {
            expect(needs[name], `${name} se salió con ${traits.join('+') || 'nadie'}`)
              .toBeGreaterThanOrEqual(0);
            expect(needs[name]).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

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
  it('el valle ofrece cosas, y todas en suelo pisable', () => {
    for (const seed of [7, 11, 23]) {
      const state = village(seed);
      const land = terrainOf(state);
      const places = placesOf(state, land);

      expect(places.length, `semilla ${seed}: el valle no ofrece nada`).toBeGreaterThan(5);
      for (const place of places) {
        expect(blockedAt(land, place.at.x, place.at.z),
          `semilla ${seed}: ${place.id} ofrece meterse en una pared`).toBe(false);
        expect(place.at.x).toBeGreaterThan(0);
        expect(place.at.z).toBeGreaterThan(0);
        expect(place.at.x).toBeLessThan(land.width);
        expect(place.at.z).toBeLessThan(land.height);
        expect(place.offers.length).toBeGreaterThan(0);
      }
    }
  });

  it('lo que ofrece un edificio sale de para qué sirve', () => {
    const state = village(7);
    const land = terrainOf(state);
    const places = placesOf(state, land);
    const kinds = new Map<string, Set<string>>();
    for (const place of places) {
      const kind = place.id.split(':')[0] as string;
      const set = kinds.get(kind) ?? new Set<string>();
      for (const offer of place.offers) set.add(offer.id);
      kinds.set(kind, set);
    }
    // El pozo da de beber y la capilla no. Si esto se cruza, alguien ha metido
    // una oferta donde no pega y la aldea hará cosas que no se entienden.
    if (kinds.has('well')) expect([...(kinds.get('well') ?? [])]).toContain('drink');
    if (kinds.has('chapel')) expect([...(kinds.get('chapel') ?? [])]).toContain('pray');
    if (kinds.has('field')) expect([...(kinds.get('field') ?? [])]).toContain('work');
  });

  it('el aforo se respeta: no entran nueve en un pozo de dos', () => {
    const state = village(7);
    const land = terrainOf(state);
    const places = placesOf(state, land);
    const well = places.find((p) => p.id.startsWith('well:'))
      ?? places[0] as Place;
    const offer = well.offers[0];
    expect(offer).toBeDefined();
    if (offer === undefined) return;

    const empty = offersNear(places, well.at, 2, new Map());
    expect(empty.some((o) => o.id === offer.id), 'vacío, se ofrece').toBe(true);

    const full = new Map([[seatKey(well, offer), offer.seats]]);
    const left = offersNear([well], well.at, 2, full);
    expect(left.some((o) => o.id === offer.id), 'lleno, ya no').toBe(false);
  });

  it('ninguna oferta conoce a nadie', () => {
    // La regla que separa un mundo con cosas de un guion con disfraz. Se
    // comprueba sobre la forma del catálogo: una oferta es qué, dónde, cuánto
    // cabe y qué calma. Si alguna gana un campo que nombre a una persona, un
    // oficio o una decisión, aquí salta.
    const allowed = new Set(['id', 'reach', 'seats', 'gives', 'seconds']);
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

  it('una oferta nueva da comportamiento a todo el mundo sin tocar a nadie', () => {
    // La propiedad que hace esto barato de crecer, comprobada como lo que es:
    // el catálogo es una tabla, y lo que un sitio ofrece se lee de ella. Nadie
    // tiene escrito qué hacer con qué.
    const state = village(7);
    const land = terrainOf(state);
    const places = placesOf(state, land);
    const near = offersNear(places, { x: land.width / 2, z: land.height / 2 }, 12, new Map());
    expect(near.length, 'en medio del valle hay algo que hacer').toBeGreaterThan(0);
    // Todo lo ofrecido está en el catálogo: nada se inventa por el camino.
    for (const offer of near) expect(OFFERS[offer.id], `${offer.id} no está en el catálogo`).toBeDefined();
  });
});
