// K-8 · El rey se ve en la lista. `docs/historico/plan-rey.md` §K-5, corregido por el
// dueño del diseño el 18 sep 2026:
//
//   «cuando selecciones un rey, tiene que destacar después en la lista. No se
//    ve rey en chiquitito, parece uno más»
//
// K-5 había cambiado la palabra —`role.leader` pasaba a `role.king`— y nada
// más, así que coronar a alguien no se veía: la palabra salía en la misma
// cursiva de trece píxeles con la que la fila dice «midwife». Lo que se guarda
// aquí es **lo que la pantalla necesita para pintarlo distinto** y es puro: el
// hecho de llevar corona (`isKing`), hacia dónde tira el valle con él
// (`crownStyleKey`) y el primer sitio de la lista (`kingFirst`). La chapa de
// lacre y el medallón en oro son piel, y se juzgan en captura.

import { describe, expect, it } from 'vitest';
import { CROWN, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { crownCandidates, kingOf } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import { crownStyleKey, isKing, roleKeyFor } from '@derive/crown';
import { kingFirst, namedPresent } from '@ui/redesign/people-panel';
import { personCard } from '@ui/person-card';
import type { GameState, Role } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

// La misma aldea memoizada que `crown-hall.test.ts`, y por el mismo motivo:
// coronar exige treinta personas, y plantar quince años por prueba costaba
// siete segundos en una suite que tiene que ser rápida.
const grown = new Map<string, GameState>();
function village(seed = 41, years = 15): GameState {
  const key = `${seed}:${years}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
    base.village.silver = CROWN.SILVER * 3;
    grown.set(key, base);
  }
  return structuredClone(base);
}

function crowned(state: GameState, trade: Role | null = 'smith'): GameState {
  const who = crownCandidates(state)[0];
  if (who === undefined) throw new Error('sin candidatos');
  who.role = trade;
  const out = crownKing(state, who.id, 'spring', 3);
  if (!out.crowned) throw new Error(out.refusal ?? 'sin motivo');
  return state;
}

describe('K-8 · quién lleva corona, y la pantalla lo sabe', () => {
  it('sin coronar, nadie la lleva: ni el jefe de la fundación', () => {
    const state = village();
    expect(state.crown).toBeNull();
    for (const v of state.people.villagers) expect(isKing(state, v)).toBe(false);
    // Y el jefe sigue siendo un jefe, que es lo que es: un hombre al que nadie
    // ha dado nada.
    const leader = state.people.villagers.find((v) => v.role === 'leader' && v.diedTick === null);
    if (leader !== undefined) expect(roleKeyFor(state, leader)).toBe('role.leader');
    expect(crownStyleKey(state)).toBeNull();
  });

  it('coronado, la lleva uno y sólo uno', () => {
    const state = crowned(village());
    const king = kingOf(state);
    expect(king).not.toBeNull();
    const wearers = state.people.villagers.filter((v) => isKing(state, v));
    expect(wearers).toHaveLength(1);
    expect(wearers[0]?.id).toBe(king?.id);
    expect(roleKeyFor(state, wearers[0]!)).toBe('role.king');
  });

  it('y la aldea tira hacia donde su oficio dice, no hacia el puesto de hoy', () => {
    // El asiento guarda con qué oficio se coronó (`state.crown.trade`), que es
    // la misma fuente que lee `will()`: si el hombre cambiara de puesto después,
    // el valle sigue tirando hacia donde lo coronó.
    const state = crowned(village(), 'smith');
    expect(crownStyleKey(state)).toBe('crown.style.forge');
    const king = kingOf(state);
    if (king !== null) king.role = 'leader';
    expect(crownStyleKey(state)).toBe('crown.style.forge');
  });
});

describe('K-8 · y sale delante en la lista de la gente', () => {
  it('el rey primero, y los demás en el orden que trae el motor', () => {
    const state = crowned(village());
    const people = namedPresent(state);
    const listed = kingFirst(state, people);
    expect(listed).toHaveLength(people.length);
    expect(isKing(state, listed[0]!)).toBe(true);
    // El resto no se reordena: la lista sigue siendo la del motor menos el que
    // subió al primer sitio.
    expect(listed.slice(1).map((v) => v.id))
      .toEqual(people.filter((v) => !isKing(state, v)).map((v) => v.id));
  });

  it('sin rey, la lista es exactamente la que llega', () => {
    const state = village();
    const people = namedPresent(state);
    expect(kingFirst(state, people)).toBe(people);
  });
});

describe('K-8 · la ficha dice lo mismo que la fila', () => {
  it('el rey trae corona y su querencia; cualquier otro, ninguna de las dos', () => {
    const state = crowned(village(), 'priest');
    const king = kingOf(state);
    expect(king).not.toBeNull();
    const card = personCard(state, king!.id);
    expect(card?.crowned).toBe(true);
    expect(card?.role).toBe('king');
    // La querencia es contenido del banco, no una frase escrita aquí.
    expect(card?.lean).toBe('Would see to the chapel');

    const other = namedPresent(state).find((v) => !isKing(state, v));
    const plain = other === undefined ? null : personCard(state, other.id);
    expect(plain?.crowned).toBe(false);
    expect(plain?.lean).toBeNull();
  });
});
