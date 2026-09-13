// §11.1.1 · La tira de la aldea.
//
// Lo que estas pruebas guardan es que las cuatro cifras **salen del estado** y
// que la comida se dice en lo que significa: semanas, no unidades.

import { describe, expect, it } from 'vitest';
import { FOOD } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { population } from '@engine/people/demography';
import { vitalsOf } from '../../src/ui/vitals';

describe('§11.1.1 · la tira de la aldea', () => {
  it('las cuatro cifras son las del estado', () => {
    const state = foundGame(7);
    run(state, 12 * 48, 'prudent', CATALOG);
    const now = vitalsOf(state);
    expect(now.people).toBe(population(state));
    expect(now.wood).toBe(Math.floor(state.village.wood));
    expect(now.morale).toBe(Math.round(state.village.morale));
  });

  it('la comida se cuenta en semanas, y se trunca', () => {
    // Media semana de comida no es media semana de vida: es una semana en la
    // que se pasa hambre.
    const state = foundGame(7);
    run(state, 5 * 48, 'prudent', CATALOG);
    const people = population(state);
    expect(people).toBeGreaterThan(0);

    const fed = structuredClone(state);
    fed.village.grain = people * FOOD.GRAIN_PER_PERSON * 10;
    expect(vitalsOf(fed).weeks).toBe(10);

    const nearly = structuredClone(state);
    nearly.village.grain = people * FOOD.GRAIN_PER_PERSON * 3.9;
    expect(vitalsOf(nearly).weeks).toBe(3);
  });

  it('una aldea vacía no divide por cero', () => {
    const state = foundGame(7);
    for (const person of state.people.villagers) person.diedTick = state.tick;
    expect(vitalsOf(state).people).toBe(0);
    expect(vitalsOf(state).weeks).toBe(0);
  });

  it('leerla no toca el estado', () => {
    // §4.3 · dibujar no puede mover la partida.
    const state = foundGame(7);
    run(state, 8 * 48, 'prudent', CATALOG);
    const before = JSON.stringify(state);
    vitalsOf(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});
