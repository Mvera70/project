// M-31 · design.md §7.9 — lo que el mundo deja escrito en la gente.
//
// Lo que se protege: que una hambruna larga no borre la vida entera de nadie,
// que un incendio marque a quien vivía allí y a nadie más, y que los dos
// epitafios que llevaban desde M-09 sin escritor puedan salir por fin.
import { describe, expect, it } from 'vitest';
import { MEMORY, SCARS, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { scarFire, scarHunger } from '@engine/people/scars';
import { consume } from '@engine/subsistence/consumption';
import type { GameState, Villager } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

const named = (state: GameState): Villager[] =>
  state.people.villagers.filter((v) => v.named && v.diedTick === null);

const memoriesOf = (v: Villager, kind: string): number =>
  v.memories.filter((m) => m.kind === kind).length;

describe('el hambre deja marca · §7.9', () => {
  it('una semana corta de verdad marca a los que la viven', () => {
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    scarHunger(state, 0.5);
    for (const v of named(state)) expect(memoriesOf(v, 'went_hungry'), v.name).toBe(1);
  });

  it('un mal rato pequeño no se recuerda toda la vida', () => {
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    scarHunger(state, SCARS.HUNGER_MIN / 2);
    for (const v of named(state)) expect(memoriesOf(v, 'went_hungry')).toBe(0);
  });

  it('cuanto peor el año, más pesa el recuerdo', () => {
    const light = village(20);
    for (const v of named(light)) v.memories = [];
    scarHunger(light, 0.2);

    const heavy = village(20);
    for (const v of named(heavy)) v.memories = [];
    scarHunger(heavy, 1);

    const weightOf = (s: GameState): number =>
      named(s)[0]!.memories.find((m) => m.kind === 'went_hungry')!.weight;
    expect(weightOf(heavy)).toBeGreaterThan(weightOf(light));
    expect(weightOf(heavy)).toBeLessThanOrEqual(MEMORY.WEIGHT_MAX);
  });

  it('una hambruna de meses deja UN recuerdo, no veinte', () => {
    // Lo importante de todo el módulo: §6.4 da doce huecos para una vida
    // entera. Un solo invierno malo no puede quedarse con todos.
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    for (let week = 0; week < 20; week += 1) {
      state.tick += 1;
      scarHunger(state, 0.8);
    }
    for (const v of named(state)) expect(memoriesOf(v, 'went_hungry'), v.name).toBe(1);
  });

  it('pero dos años malos son dos recuerdos', () => {
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    scarHunger(state, 0.8);
    state.tick += TIME.WEEKS_PER_YEAR;
    scarHunger(state, 0.8);
    for (const v of named(state)) expect(memoriesOf(v, 'went_hungry'), v.name).toBe(2);
  });

  it('los que no están en el valle no recuerdan nada', () => {
    const state = village(20);
    const gone = named(state)[0]!;
    for (const v of named(state)) v.memories = [];
    gone.diedTick = state.tick;
    scarHunger(state, 0.9);
    expect(memoriesOf(gone, 'went_hungry')).toBe(0);
  });

  it('el hambre de verdad, corriendo el consumo entero, marca a alguien', () => {
    // Sin tocar `scarHunger` a mano: la despensa vacía y el tick real.
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    state.village.grain = 0;
    state.herd = { hens: 0, pigs: 0, cows: 0 };
    consume(state);
    const marked = named(state).filter((v) => memoriesOf(v, 'went_hungry') > 0);
    expect(marked.length).toBeGreaterThan(0);
  });
});

describe('el fuego deja marca · §7.9', () => {
  it('marca a quien vivía en esa casa', () => {
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    const victim = named(state).find((v) => v.homeId !== null)!;
    scarFire(state, victim.homeId!);
    expect(memoriesOf(victim, 'lost_home')).toBe(1);
  });

  it('y a nadie más', () => {
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    const victim = named(state).find((v) => v.homeId !== null)!;
    scarFire(state, victim.homeId!);
    for (const v of named(state)) {
      if (v.homeId === victim.homeId) continue;
      expect(memoriesOf(v, 'lost_home'), v.name).toBe(0);
    }
  });

  it('un granero ardiendo no deja a nadie sin casa', () => {
    // `scarFire` no pregunta de qué tipo era el edificio: pregunta de quién
    // era la casa. Un edificio en el que no vive nadie no marca a nadie.
    const state = village(20);
    for (const v of named(state)) v.memories = [];
    const granary = state.buildings.find((b) => b.kind === 'granary')!;
    scarFire(state, granary.id);
    for (const v of named(state)) expect(memoriesOf(v, 'lost_home'), v.name).toBe(0);
  });
});

describe('los dos epitafios sin escritor · §9.4', () => {
  it('ahora hay quien escriba went_hungry y lost_home', () => {
    // Los dos tipos tenían texto de epitafio desde M-09 y ningún sistema los
    // escribía jamás. Esta prueba es el acta de que ya no es así.
    const state = village(20);
    for (const v of named(state)) v.memories = [];

    scarHunger(state, 0.9);
    const home = named(state).find((v) => v.homeId !== null)!.homeId!;
    scarFire(state, home);

    const kinds = new Set(named(state).flatMap((v) => v.memories.map((m) => m.kind)));
    expect(kinds.has('went_hungry')).toBe(true);
    expect(kinds.has('lost_home')).toBe(true);
  });
});

describe('las marcas no rompen nada · §4.3', () => {
  it('escribir recuerdos no consume una sola tirada de azar', () => {
    const state = village(20);
    const before = { ...state.rng };
    scarHunger(state, 0.7);
    const home = named(state).find((v) => v.homeId !== null)!.homeId!;
    scarFire(state, home);
    expect(state.rng).toEqual(before);
  });

  it('nadie pasa nunca de los doce recuerdos de §6.4', () => {
    const state = village(20);
    for (let year = 0; year < 40; year += 1) {
      state.tick += TIME.WEEKS_PER_YEAR;
      scarHunger(state, 0.9);
    }
    for (const v of named(state)) {
      expect(v.memories.length, v.name).toBeLessThanOrEqual(MEMORY.MAX);
    }
  });
});
