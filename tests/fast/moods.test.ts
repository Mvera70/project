// §11.1.1 · Las burbujas de estado, derivadas y nada más.
//
// Lo que estas pruebas guardan es que la burbuja **sale del estado y de su
// fecha**, que una persona lleva una o ninguna, y que no las lleva todo el
// mundo: una aldea donde los cuarenta enseñan una nube encima no dice nada.

import { describe, expect, it } from 'vitest';
import { BUBBLE } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { isHere } from '@engine/people/demography';
import type { GameState, VillagerId } from '@engine/state';
import { moodsFor, MOODS } from '@render/moods';

function village(years: number, seed = 7): GameState {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

describe('§11.1.1 · las burbujas de estado', () => {
  it('nadie lleva dos, y ninguna es de una clase que no existe', () => {
    const state = village(20);
    const moods = moodsFor(state);
    for (const [id, mood] of moods) {
      expect(MOODS).toContain(mood);
      // Un `Map` ya lo garantiza; lo que esto dice es que el contrato es ése y
      // no una lista por persona.
      expect(typeof id).toBe('number');
    }
  });

  it('sólo la lleva quien está en el valle', () => {
    // Los muertos no se van del estado —§5.1 los conserva— y dibujar una nube
    // sobre un muerto sería dibujar a un muerto.
    const state = village(30);
    const here = new Set(state.people.villagers.filter(isHere).map((person) => person.id));
    for (const id of moodsFor(state).keys()) expect(here.has(id)).toBe(true);
  });

  it('una muerte reciente pone de luto a los padres, y deja de hacerlo', () => {
    const state = village(14);
    const parent = state.people.villagers.find(
      (person) => isHere(person) && state.people.villagers.some(
        (child) => child.parentIds.includes(person.id),
      ),
    );
    expect(parent).toBeDefined();
    const child = state.people.villagers.find(
      (person) => person.parentIds.includes(parent?.id ?? (-1 as VillagerId)),
    );
    expect(child).toBeDefined();

    const mourning = structuredClone(state);
    const dead = mourning.people.villagers.find((person) => person.id === child?.id);
    if (dead !== undefined) {
      dead.diedTick = mourning.tick;
      dead.causeOfDeath = 'old_age';
    }
    expect(moodsFor(mourning).get(parent?.id ?? (-1 as VillagerId))).toBe('grief');

    // Y seis semanas después ya no: el estado sigue diciendo que murió, pero
    // la cara no se queda para siempre.
    const later = structuredClone(mourning);
    later.tick += BUBBLE.WEEKS;
    expect(moodsFor(later).get(parent?.id ?? (-1 as VillagerId))).not.toBe('grief');
  });

  it('lo que le pasa a toda la aldea no va en la burbuja', () => {
    // Se probó al revés y se vio: con un brote puesto, los cuarenta llevaban
    // una cruz encima y la pantalla dejaba de decir nada. La peste y el hambre
    // son de la aldea, y §11.1 ya las cuenta donde se leen.
    const state = village(14);
    const bad = structuredClone(state);
    bad.village.grain = 0;
    bad.outbreak = { startedTick: bad.tick, endsTick: bad.tick + 8, deaths: 0 };
    const here = bad.people.villagers.filter(isHere).length;
    expect(here).toBeGreaterThan(5);
    expect(moodsFor(bad).size).toBeLessThan(here);
  });

  it('un rencor recién formado pone cara a los dos, y uno curado a ninguno', () => {
    const state = village(25);
    const open = state.people.grudges.find((grudge) => grudge.healedTick === null);
    if (open === undefined) return; // esta partida no llegó a tener rencores

    const fresh = structuredClone(state);
    const grudge = fresh.people.grudges.find(
      (item) => item.fromId === open.fromId && item.toId === open.toId,
    );
    if (grudge !== undefined) grudge.formedTick = fresh.tick;
    const moods = moodsFor(fresh);
    for (const id of [open.fromId, open.toId]) {
      const person = fresh.people.villagers.find((who) => who.id === id);
      if (person !== undefined && isHere(person)) expect(moods.get(id)).toBe('quarrel');
    }

    const healed = structuredClone(fresh);
    const mended = healed.people.grudges.find(
      (item) => item.fromId === open.fromId && item.toId === open.toId,
    );
    if (mended !== undefined) mended.healedTick = healed.tick;
    expect(moodsFor(healed).get(open.fromId)).not.toBe('quarrel');
  });

  it('no la lleva toda la aldea en un año cualquiera', () => {
    // Si todo el mundo lleva una, no dice nada. Se mide sobre veinte años de
    // una partida normal, no sobre un instante: un instante es ruido.
    const state = foundGame(7);
    let crowded = 0;
    let looked = 0;
    for (let year = 0; year < 20; year += 1) {
      run(state, 48, 'prudent', CATALOG);
      const here = state.people.villagers.filter(isHere).length;
      if (here === 0) continue;
      looked += 1;
      if (moodsFor(state).size > here * 0.8) crowded += 1;
    }
    expect(looked).toBeGreaterThan(10);
    expect(crowded / looked).toBeLessThan(0.5);
  });

  it('es función pura del estado: el mismo tick da la misma cara', () => {
    const state = village(18);
    expect([...moodsFor(state)]).toEqual([...moodsFor(state)]);
  });
});
