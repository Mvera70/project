// M-05 · design.md §3.4, §6.4.
//
// Lo que hay que proteger: que un rencor se escriba una sola vez, que sanar no
// lo borre, que spiteful y loyal perdonen a velocidades distintas, y que la
// memoria no crezca sin fin.
import { describe, expect, it } from 'vitest';
import { MEMORY, OPINION, TIME } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import type { GameState, Memory, Trait, Villager, VillagerId } from '@engine/state';
import { foundPeople } from '@engine/people/villagers';
import {
  adjustOpinion,
  driftOpinions,
  grudges,
  opinionOf,
  worstEnemyOf,
} from '@engine/people/opinions';
import { decayMemories, memoriesAbout, remember, yearsSince } from '@engine/people/memories';

const CELLS = 36 * 56;

function village(seed: number): GameState {
  const rng = makeBundle(seed);
  return {
    version: 1,
    seed,
    tick: 0,
    rng,
    map: {
      width: 36,
      height: 56,
      terrain: new Uint8Array(CELLS),
      traffic: new Uint16Array(CELLS),
      path: new Uint8Array(CELLS),
      ruins: new Uint8Array(CELLS),
      forestAge: new Uint8Array(CELLS),
      forestStock: new Uint16Array(CELLS),
    },
    village: { grain: 800, wood: 200, morale: 55, faith: 50 },
    people: foundPeople(rng, 0),
    buildings: [],
    works: [],
    crossroad: null,
    seeds: [],
    flags: {},
    chronicle: [],
    history: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    dwindlingSince: null, noOneStreak: 0,
    ended: null,
  };
}

const at = (s: GameState, id: VillagerId): Villager =>
  s.people.villagers.find((v) => v.id === id) as Villager;

/**
 * Los dos primeros nombrados, con los rasgos FIJADOS a lo que se pida.
 *
 * Los rasgos se sobrescriben siempre, incluso a lista vacía: la fundación
 * reparte spiteful y loyal por su cuenta, y un aldeano "sin rasgos" que resulta
 * ser spiteful de nacimiento hace que el test mida otra cosa.
 */
function pair(s: GameState, fromTraits: Trait[] = []): [VillagerId, VillagerId] {
  const [a, b] = s.people.namedIds as [VillagerId, VillagerId];
  at(s, a).traits = [...fromTraits];
  at(s, b).traits = [];
  return [a, b];
}

const mem = (tick: number, weight: number, aboutId: VillagerId | null = null): Memory => ({
  tick,
  kind: 'was_blamed',
  aboutId,
  weight,
});

describe('memoria · §6.4', () => {
  it('nunca supera las 12 entradas', () => {
    const s = village(7);
    const v = at(s, (s.people.namedIds[0] as VillagerId));
    for (let i = 0; i < 200; i += 1) {
      remember(v, mem(i, 1 + (i % 5)));
      expect(v.memories.length).toBeLessThanOrEqual(MEMORY.MAX);
    }
    expect(v.memories.length).toBe(MEMORY.MAX);
  });

  it('al llenarse descarta la de menor peso, no la más vieja', () => {
    const s = village(7);
    const v = at(s, (s.people.namedIds[0] as VillagerId));
    // Once pesadas y una liviana; la número trece debe echar a la liviana.
    for (let i = 0; i < 11; i += 1) remember(v, mem(i, 5));
    remember(v, { ...mem(11, 1), kind: 'went_hungry' });
    expect(v.memories.length).toBe(MEMORY.MAX);

    remember(v, { ...mem(12, 4), kind: 'was_saved' });
    expect(v.memories.length).toBe(MEMORY.MAX);
    expect(v.memories.some((m) => m.kind === 'went_hungry')).toBe(false);
    expect(v.memories.some((m) => m.kind === 'was_saved')).toBe(true);
  });

  it('a igual peso se va la más antigua', () => {
    const s = village(7);
    const v = at(s, (s.people.namedIds[0] as VillagerId));
    for (let i = 0; i < MEMORY.MAX; i += 1) remember(v, mem(i, 3));
    remember(v, mem(999, 3));
    expect(v.memories.some((m) => m.tick === 0)).toBe(false);
    expect(v.memories.some((m) => m.tick === 999)).toBe(true);
  });

  it('el peso se recorta al rango de §6.4', () => {
    const s = village(7);
    const v = at(s, (s.people.namedIds[0] as VillagerId));
    remember(v, mem(0, 99));
    remember(v, mem(1, -5));
    expect(v.memories[0]?.weight).toBe(MEMORY.WEIGHT_MAX);
    expect(v.memories[1]?.weight).toBe(MEMORY.WEIGHT_MIN);
  });

  it('los anónimos no recuerdan nada', () => {
    // §6.1: existen como registros con edad, sexo y casa. Nada más.
    const s = village(7);
    const anon = s.people.villagers.find((v) => !v.named) as Villager;
    remember(anon, mem(0, 5));
    expect(anon.memories).toEqual([]);
  });

  it('decae 0.02 por año, y sólo en la semana 0', () => {
    const s = village(7);
    const v = at(s, (s.people.namedIds[0] as VillagerId));
    remember(v, mem(0, 5));

    s.tick = 10; // no es semana 0
    decayMemories(s);
    expect(v.memories[0]?.weight).toBe(5);

    s.tick = TIME.WEEKS_PER_YEAR;
    decayMemories(s);
    expect(v.memories[0]?.weight).toBeCloseTo(5 - MEMORY.DECAY_PER_YEAR, 9);
  });

  it('una memoria gastada del todo se olvida', () => {
    const s = village(7);
    const v = at(s, (s.people.namedIds[0] as VillagerId));
    remember(v, mem(0, 1));
    for (let y = 1; y <= 60; y += 1) {
      s.tick = y * TIME.WEEKS_PER_YEAR;
      decayMemories(s);
    }
    expect(v.memories).toEqual([]);
  });

  it('memoriesAbout devuelve las más pesadas primero', () => {
    const s = village(7);
    const [a, b] = pair(s);
    const v = at(s, a);
    remember(v, { ...mem(0, 2, b), kind: 'was_blamed' });
    remember(v, { ...mem(1, 5, b), kind: 'lost_child' });
    remember(v, { ...mem(2, 4, null), kind: 'went_hungry' });
    const about = memoriesAbout(v, b);
    expect(about.map((m) => m.kind)).toEqual(['lost_child', 'was_blamed']);
  });

  it('yearsSince cuenta años, no semanas', () => {
    expect(yearsSince(mem(0, 3), TIME.WEEKS_PER_YEAR * 7)).toBe(7);
  });
});

describe('opiniones · §6.4', () => {
  it('se mueven por sucesos y se quedan en [−100, 100]', () => {
    const s = village(7);
    const [a, b] = pair(s);
    expect(opinionOf(s, a, b)).toBe(0);

    adjustOpinion(s, a, b, OPINION.PUBLICLY_BLAMED);
    expect(opinionOf(s, a, b)).toBe(OPINION.PUBLICLY_BLAMED);

    for (let i = 0; i < 50; i += 1) adjustOpinion(s, a, b, -30);
    expect(opinionOf(s, a, b)).toBe(OPINION.MIN);

    for (let i = 0; i < 100; i += 1) adjustOpinion(s, a, b, 30);
    expect(opinionOf(s, a, b)).toBe(OPINION.MAX);
  });

  it('nadie tiene opinión de sí mismo', () => {
    const s = village(7);
    const [a] = pair(s);
    adjustOpinion(s, a, a, -80);
    expect(at(s, a).opinions[a]).toBeUndefined();
  });

  it('la deriva lleva a cero desde los dos extremos, sin pasarse', () => {
    const s = village(7);
    const [a, b] = pair(s);
    adjustOpinion(s, a, b, 40);
    adjustOpinion(s, b, a, -40);
    for (let i = 0; i < 2000; i += 1) {
      s.tick += 1;
      driftOpinions(s);
    }
    expect(opinionOf(s, a, b)).toBe(0);
    expect(opinionOf(s, b, a)).toBe(0);
  });

  it('un loyal perdona en la mitad de ticks que un spiteful', () => {
    const ticksToForgive = (traits: Trait[]): number => {
      const s = village(7);
      const [a, b] = pair(s, traits);
      adjustOpinion(s, a, b, -60);
      let ticks = 0;
      while (opinionOf(s, a, b) < 0 && ticks < 100_000) {
        s.tick += 1;
        driftOpinions(s);
        ticks += 1;
      }
      return ticks;
    };

    const loyal = ticksToForgive(['loyal']);
    const plain = ticksToForgive([]);
    const spiteful = ticksToForgive(['spiteful']);

    expect(loyal).toBeLessThan(plain);
    expect(plain).toBeLessThan(spiteful);
    // ×2 contra ×0.5: la cuarta parte de los ticks.
    expect(loyal / spiteful).toBeCloseTo(0.25, 2);
    expect(loyal / plain).toBeCloseTo(0.5, 2);
  });

  it('un muerto no cambia de opinión, y nadie cambia de opinión sobre él', () => {
    const s = village(7);
    const [a, b] = pair(s);
    adjustOpinion(s, a, b, -60);
    adjustOpinion(s, b, a, -60);
    at(s, b).diedTick = 5;

    for (let i = 0; i < 5000; i += 1) {
      s.tick += 1;
      driftOpinions(s);
    }
    // §6.4 no se limpia: que alguien no perdonara a un muerto es material.
    expect(opinionOf(s, a, b)).toBe(-60);
    expect(opinionOf(s, b, a)).toBe(-60);
  });

  it('las opiniones hacia los muertos no se borran al morir', () => {
    const s = village(7);
    const [a, b] = pair(s);
    adjustOpinion(s, a, b, -70);
    at(s, b).diedTick = 5;
    s.people.namedIds = s.people.namedIds.filter((id) => id !== b);
    expect(at(s, a).opinions[b]).toBe(-70);
  });
});

describe('rencores · §6.4', () => {
  it('cruzar −50 crea un rencor, con causa', () => {
    const s = village(7);
    const [a, b] = pair(s);
    s.tick = 100;
    remember(at(s, a), { tick: 90, kind: 'lost_child', aboutId: b, weight: 5 });
    adjustOpinion(s, a, b, -60);

    const list = grudges(s);
    expect(list).toHaveLength(1);
    expect(list[0]?.fromId).toBe(a);
    expect(list[0]?.toId).toBe(b);
    expect(list[0]?.cause).toBe('lost_child');
    expect(list[0]?.causeTick).toBe(90);
    expect(list[0]?.formedTick).toBe(100);
    expect(list[0]?.healedTick).toBeNull();
  });

  it('sin memoria de por medio, la causa es unspoken', () => {
    const s = village(7);
    const [a, b] = pair(s);
    s.tick = 42;
    adjustOpinion(s, a, b, -60);
    expect(grudges(s)[0]?.cause).toBe('unspoken');
    expect(grudges(s)[0]?.causeTick).toBe(42);
  });

  it('se crea UNA sola vez mientras la opinión sigue por debajo de −50', () => {
    const s = village(7);
    const [a, b] = pair(s);
    adjustOpinion(s, a, b, -60);
    for (let i = 0; i < 500; i += 1) {
      s.tick += 1;
      adjustOpinion(s, a, b, -1); // sigue hundiéndose
      driftOpinions(s);
    }
    expect(s.people.grudges).toHaveLength(1);
  });

  it('sanar pone healedTick y NO borra el rencor', () => {
    const s = village(7);
    const [a, b] = pair(s);
    adjustOpinion(s, a, b, -60);
    expect(s.people.grudges).toHaveLength(1);

    s.tick = 200;
    adjustOpinion(s, a, b, 45); // -60 -> -15, por encima de -20
    expect(s.people.grudges).toHaveLength(1);
    expect(s.people.grudges[0]?.healedTick).toBe(200);
    expect(grudges(s)).toEqual([]); // ya no está abierto
  });

  it('justo en −20 aún no sana: hay que pasar por encima', () => {
    const s = village(7);
    const [a, b] = pair(s);
    adjustOpinion(s, a, b, -60);
    adjustOpinion(s, a, b, 40); // exactamente -20
    expect(s.people.grudges[0]?.healedTick).toBeNull();
    adjustOpinion(s, a, b, 0.5);
    expect(s.people.grudges[0]?.healedTick).not.toBeNull();
  });

  it('tras sanar, la misma pareja puede volver a enemistarse', () => {
    const s = village(7);
    const [a, b] = pair(s);
    adjustOpinion(s, a, b, -60);
    s.tick = 100;
    adjustOpinion(s, a, b, 50); // sana
    s.tick = 300;
    adjustOpinion(s, a, b, -60); // vuelve a caer

    expect(s.people.grudges).toHaveLength(2);
    expect(s.people.grudges[0]?.healedTick).toBe(100);
    expect(s.people.grudges[1]?.healedTick).toBeNull();
    expect(s.people.grudges[1]?.formedTick).toBe(300);
    expect(grudges(s)).toHaveLength(1);
  });

  it('la deriva sola puede sanar un rencor', () => {
    const s = village(7);
    const [a, b] = pair(s, ['loyal']);
    adjustOpinion(s, a, b, -55);
    expect(grudges(s)).toHaveLength(1);
    for (let i = 0; i < 5000 && grudges(s).length > 0; i += 1) {
      s.tick += 1;
      driftOpinions(s);
    }
    expect(grudges(s)).toEqual([]);
    expect(s.people.grudges).toHaveLength(1); // sigue en el registro
  });

  it('grudges(min) filtra por lo hondo que siga la opinión', () => {
    const s = village(7);
    const [a, b] = pair(s);
    const c = s.people.namedIds[2] as VillagerId;
    adjustOpinion(s, a, b, -55);
    adjustOpinion(s, a, c, -90);

    expect(grudges(s)).toHaveLength(2);
    expect(grudges(s, 60)).toHaveLength(1);
    expect(grudges(s, 60)[0]?.toId).toBe(c);
    expect(grudges(s, 95)).toEqual([]);
  });

  it('grudges devuelve el peor primero y es determinista', () => {
    const s = village(7);
    const [a, b] = pair(s);
    const c = s.people.namedIds[2] as VillagerId;
    adjustOpinion(s, a, b, -55);
    adjustOpinion(s, a, c, -90);
    expect(grudges(s).map((g) => g.toId)).toEqual([c, b]);
    expect(grudges(s)).toEqual(grudges(s));
  });
});

describe('worstEnemyOf · §8.3', () => {
  it('devuelve al que más le odia', () => {
    const s = village(7);
    const [a, b] = pair(s);
    const c = s.people.namedIds[2] as VillagerId;
    adjustOpinion(s, b, a, -30);
    adjustOpinion(s, c, a, -70);
    expect(worstEnemyOf(s, a)).toBe(c);
  });

  it('devuelve null si nadie le tiene manía', () => {
    const s = village(7);
    const [a, b] = pair(s);
    expect(worstEnemyOf(s, a)).toBeNull();
    adjustOpinion(s, b, a, 40); // que le aprecien no cuenta
    expect(worstEnemyOf(s, a)).toBeNull();
  });

  it('no cuenta a los muertos', () => {
    const s = village(7);
    const [a, b] = pair(s);
    const c = s.people.namedIds[2] as VillagerId;
    adjustOpinion(s, b, a, -90);
    adjustOpinion(s, c, a, -30);
    expect(worstEnemyOf(s, a)).toBe(b);

    at(s, b).diedTick = 10;
    expect(worstEnemyOf(s, a)).toBe(c);
  });

  it('desempata por el id más bajo, no por el orden del array', () => {
    const s = village(7);
    const [a, b] = pair(s);
    const c = s.people.namedIds[2] as VillagerId;
    adjustOpinion(s, b, a, -50);
    adjustOpinion(s, c, a, -50);
    const expected = Math.min(b, c);
    expect(worstEnemyOf(s, a)).toBe(expected);
    // Y no cambia si se reordena namedIds.
    s.people.namedIds = [...s.people.namedIds].reverse();
    expect(worstEnemyOf(s, a)).toBe(expected);
  });

  it('nadie es su propio peor enemigo', () => {
    const s = village(7);
    const [a] = pair(s);
    at(s, a).opinions[a] = -100;
    expect(worstEnemyOf(s, a)).toBeNull();
  });
});

describe('estabilidad', () => {
  it('cien años de deriva no producen NaN ni valores fuera de rango', () => {
    const s = village(11);
    const ids = s.people.namedIds;
    for (const from of ids) {
      for (const to of ids) {
        if (from !== to) adjustOpinion(s, from, to, from - to);
      }
    }
    for (let i = 0; i < 100 * TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      driftOpinions(s);
      decayMemories(s);
    }
    for (const id of ids) {
      for (const value of Object.values(at(s, id).opinions)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(OPINION.MIN);
        expect(value).toBeLessThanOrEqual(OPINION.MAX);
      }
    }
  });

  it('dos partidas iguales producen los mismos rencores', () => {
    const run = (): GameState => {
      const s = village(21);
      const ids = s.people.namedIds;
      for (let i = 0; i < 500; i += 1) {
        s.tick += 1;
        const from = ids[i % ids.length] as VillagerId;
        const to = ids[(i + 3) % ids.length] as VillagerId;
        adjustOpinion(s, from, to, i % 7 === 0 ? -12 : 2);
        driftOpinions(s);
      }
      return s;
    };
    expect(run().people.grudges).toEqual(run().people.grudges);
    expect(grudges(run())).toEqual(grudges(run()));
  });
});
