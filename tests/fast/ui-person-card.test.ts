// UI-V4 · `personCard` (`src/ui/person-card.ts`), que es donde viven las
// reglas de la ficha del prototipo 03: a quién se enseña como allegado, con
// qué palabra, y qué se calla de quien ya no está.
//
// Pura y sin DOM (este proyecto no trae `jsdom`, mismo motivo que
// `ui-chronicle-art.test.ts`): cada prueba parte de una aldea de veinte
// (`foundTwenty`) y le escribe a mano el único dato que la regla mira, de modo
// que lo que se comprueba es la decisión y no la partida.

import { describe, expect, it } from 'vitest';
import type { GameState, Villager } from '@engine/state';
import { personCard } from '@ui/person-card';
import { foundTwenty } from '../helpers/founding';

/** Los dos primeros con nombre de una aldea de veinte, que siempre hay. */
function twoNamed(state: GameState): [Villager, Villager] {
  const named = state.people.villagers.filter((v) => v.named && v.name !== '');
  const first = named[0];
  const second = named[1];
  if (first === undefined || second === undefined) throw new Error('la aldea no trae dos con nombre');
  return [first, second];
}

/** Deja a alguien sin ningún lazo, para partir de cero en cada prueba. */
function loosen(state: GameState, person: Villager): void {
  person.opinions = {};
  person.parentIds = [null, null];
  for (const other of state.people.villagers) {
    if (other.parentIds.includes(person.id)) other.parentIds = [null, null];
  }
}

describe('personCard · la ficha enseña lo que el motor guarda, y nada más', () => {
  it('el monograma es la inicial del nombre, en mayúscula', () => {
    const state = foundTwenty(7);
    const [person] = twoNamed(state);
    const card = personCard(state, person.id);
    expect(card?.monogram).toBe(person.name.charAt(0).toUpperCase());
  });

  it('un id que ya no existe no da una ficha vacía: da null', () => {
    const state = foundTwenty(7);
    expect(personCard(state, 99999)).toBeNull();
  });

  it('sin ningún lazo, la tira de parentesco viene vacía y no inventada', () => {
    const state = foundTwenty(11);
    const [person] = twoNamed(state);
    loosen(state, person);
    expect(personCard(state, person.id)?.kin).toEqual([]);
  });

  it('una opinión muy negativa entra como rival, y el lazo es frío', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    loosen(state, person);
    person.opinions = { [other.id]: -80 };
    const kin = personCard(state, person.id)?.kin ?? [];
    expect(kin).toHaveLength(1);
    expect(kin[0]?.name).toBe(other.name);
    expect(kin[0]?.relation).toBe('rival');
    expect(kin[0]?.warm).toBe(false);
  });

  it('una opinión muy positiva entra como amigo, y el lazo es cálido', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    loosen(state, person);
    person.opinions = { [other.id]: 70 };
    const kin = personCard(state, person.id)?.kin ?? [];
    expect(kin[0]?.relation).toBe('friend');
    expect(kin[0]?.warm).toBe(true);
  });

  it('una opinión tibia no entra: por debajo del umbral es ruido', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    loosen(state, person);
    person.opinions = { [other.id]: 20 };
    expect(personCard(state, person.id)?.kin).toEqual([]);
  });

  it('la sangre manda sobre la opinión: un hijo desplaza al amigo', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    loosen(state, person);
    person.opinions = { [other.id]: 90 };
    // El mismo al que aprecia pasa a ser su hija: la palabra tiene que cambiar.
    other.parentIds = [person.id, null];
    other.female = true;
    const kin = personCard(state, person.id)?.kin ?? [];
    expect(kin[0]?.relation).toBe('daughter');
    expect(kin[0]?.warm).toBe(true);
  });

  it('el padre y la madre se nombran por su sexo, no por su id', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    loosen(state, person);
    other.female = true;
    person.parentIds = [other.id, null];
    expect(personCard(state, person.id)?.kin[0]?.relation).toBe('mother');
    other.female = false;
    expect(personCard(state, person.id)?.kin[0]?.relation).toBe('father');
  });

  it('el lazo cálido y el frío caben los dos, y en ese orden', () => {
    const state = foundTwenty(11);
    const named = state.people.villagers.filter((v) => v.named && v.name !== '');
    const [person, friend, enemy] = named;
    if (person === undefined || friend === undefined || enemy === undefined) {
      throw new Error('la aldea no trae tres con nombre');
    }
    loosen(state, person);
    person.opinions = { [friend.id]: 75, [enemy.id]: -75 };
    const kin = personCard(state, person.id)?.kin ?? [];
    expect(kin.map((tie) => tie.warm)).toEqual([true, false]);
    expect(kin.map((tie) => tie.name)).toEqual([friend.name, enemy.name]);
  });

  it('nadie sale dos veces en la tira, ni siendo a la vez lo mejor y lo peor', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    loosen(state, person);
    // Imposible por construcción del motor —una opinión es un número— pero la
    // regla de «no repetir» tiene que aguantar sola: el lazo cálido reserva a
    // esa persona y el frío no puede volver a cogerla.
    other.parentIds = [person.id, null];
    person.opinions = { [other.id]: -90 };
    const kin = personCard(state, person.id)?.kin ?? [];
    expect(kin).toHaveLength(1);
    expect(kin[0]?.warm).toBe(true);
  });

  it('a quien se murió no se le enseña edad de hoy ni allegados', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    person.opinions = { [other.id]: -90 };
    person.diedTick = state.tick;
    const card = personCard(state, person.id);
    expect(card?.age).toBeNull();
    expect(card?.kin).toEqual([]);
    expect(card?.gone).not.toBeNull();
  });

  it('a quien se marchó, lo mismo: su ficha habla en pasado', () => {
    const state = foundTwenty(11);
    const [person] = twoNamed(state);
    person.leftTick = state.tick;
    const card = personCard(state, person.id);
    expect(card?.age).toBeNull();
    expect(card?.gone).not.toBeNull();
  });

  it('un muerto no entra en la tira de otro: la ficha es de los vivos', () => {
    const state = foundTwenty(11);
    const [person, other] = twoNamed(state);
    loosen(state, person);
    person.opinions = { [other.id]: 80 };
    other.diedTick = state.tick;
    expect(personCard(state, person.id)?.kin).toEqual([]);
  });

  it('quien sigue aquí trae su edad y su oficio en palabras', () => {
    const state = foundTwenty(11);
    const leader = state.people.villagers.find((v) => v.role === 'leader' && v.named);
    if (leader === undefined) throw new Error('la aldea no trae quien la lleve');
    const card = personCard(state, leader.id);
    expect(card?.age).toBeGreaterThan(0);
    expect(card?.role).toBe('leader');
  });
});
