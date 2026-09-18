// C2 · La guarnición sube de verdad. design.md §1b, fase 4; Anexo E.
//
// **Vive en las jornadas** porque son partidas de veinticinco a cuarenta años
// más una jornada escénica entera de tres mil seiscientos pasos por semilla.
//
// Lo que se guarda es lo que la fase 4 va a necesitar de esto, y son dos cosas
// que tiran en direcciones contrarias:
//
//  · **Todos los puestos se ocupan.** Un puesto vacío es una torre sin arquero,
//    y el «tower defense literal» de §1b se queda en una muralla decorada. Aquí
//    está además la trampa que costó la medida: los puestos se caían de la
//    lista que reparte la jornada cuando el motor había convocado a la aldea la
//    misma semana, y entonces **nadie subía** — siete puestos con sitio y cero
//    asignados en la semilla 11.
//  · **Y la aldea sigue viviendo.** Lo contrario de una guarnición que funciona
//    es una aldea entera subida a la muralla mirando el horizonte mientras el
//    grano se queda en el campo. El techo es un tercio de los adultos
//    (`GARRISON.MOST_SHARE`) y esto lo comprueba en pantalla, no en la tabla.

import { describe, expect, it } from 'vitest';
import { GARRISON, LIFE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { ageOf } from '@engine/people/villagers';
import { garrisonOf } from '@derive/garrison';
import { createVillage } from '../../src/render3d/life/village';
import type { GameState, ValleyTrait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/** Los pasos de una jornada escénica entera (120 s a 1/30). */
const DAY_STEPS = 3600;

/**
 * Un valle con cerco, con lo que se le dio, y el clan a una semana.
 *
 * Los años son los que tarda **ese** valle en tener muralla: el anillo se fija
 * entre el año 13 y el 34 (§7.4c) y no en todos a la vez, así que la semilla 41
 * necesita cuarenta años para tener cerco donde la 7 tiene cuarenta y ocho
 * piezas a los veinticinco. Un valle sin cerco no tiene guarnición —es la
 * propiedad de `garrison.test.ts`— y aquí lo que se mide es la que sí la tiene.
 */
function besieged(seed: number, years: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
  (state.traits as ValleyTrait[]).push('arms', 'bows');
  state.threat.comingTick = state.tick + 1;
  return state;
}

const VALLEYS: readonly (readonly [number, number])[] = [[7, 25], [11, 25], [23, 25], [41, 40]];

describe('C2 · la guarnición, en pantalla', () => {
  it('todos los puestos se ocupan en algún momento del día', () => {
    // «En algún momento» y no «al cerrar» a propósito: la jornada acaba de
    // noche y de noche se va a dormir. Lo que esto guarda es que quien tiene el
    // puesto **llega** a él, que es lo que D2 necesita para que alguien dispare.
    for (const [seed, years] of VALLEYS) {
      const state = besieged(seed, years);
      const garrison = garrisonOf(state);
      expect(garrison.manned, `semilla ${seed}: hay guarnición`).toBe(true);
      const life = createVillage(state, 0);
      expect(life.manned.length, `semilla ${seed}: puestos con sitio`)
        .toBe(garrison.posts.length);
      const reached = new Set<string>();
      for (let n = 0; n < DAY_STEPS; n += 1) {
        life.step();
        for (const post of life.manned) {
          const there = life.dwellers.some((d) => Math.hypot(
            d.body.x - post.place.at.x, d.body.z - post.place.at.z) < 1.2);
          if (there) reached.add(post.place.id);
        }
      }
      expect(reached.size, `semilla ${seed}: ${reached.size} de ${life.manned.length} puestos`)
        .toBe(life.manned.length);
    }
  });

  it('y la aldea no se sube entera a la muralla', () => {
    for (const [seed, years] of VALLEYS) {
      const state = besieged(seed, years);
      const life = createVillage(state, 0);
      const guarding = life.dwellers
        .filter((d) => d.dayPlan?.job?.place.startsWith('post:') === true).length;
      const adults = state.people.villagers.filter((v) => {
        if (v.diedTick !== null || v.leftTick !== null) return false;
        const age = ageOf(v, state.tick);
        return age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1];
      }).length;
      expect(guarding, `semilla ${seed}: ${guarding} de guardia`).toBeGreaterThan(0);
      expect(guarding / Math.max(1, adults), `semilla ${seed}: ${guarding} de ${adults} adultos`)
        .toBeLessThanOrEqual(GARRISON.MOST_SHARE);
    }
  });

  it('una aldea en paz no pone a nadie de guardia, y eso no cuesta nada', () => {
    // La propiedad barata: los otros días del año esto no existe. Si algún día
    // un puesto apareciera en una jornada de paz, la aldea tendría gente
    // plantada en la muralla el 100 % de la partida.
    const state = foundTwenty(7);
    run(state, TIME.WEEKS_PER_YEAR * 25, 'prudent', CATALOG);
    state.threat.comingTick = null;
    state.threat.arrivedTick = null;
    const life = createVillage(state, 0);
    expect(life.manned, 'ni un puesto').toHaveLength(0);
    for (let n = 0; n < 600; n += 1) life.step();
    expect(life.dwellers.some((d) => d.dayPlan?.job?.place.startsWith('post:') === true),
      'y nadie asignado a uno').toBe(false);
  });
});
