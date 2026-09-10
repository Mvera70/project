// M-39 · design.md §6.4, §7.9 — cuando dos dejan de aguantarse.
//
// El valle sabía escribir rencores desde M-05 y no hacía nada con ellos. Un
// rencor abierto era una fila en un registro: nadie discutía, nadie se gritaba,
// nadie dejaba de hablarse en la plaza.
import { describe, expect, it } from 'vitest';
import { OPINION, QUARREL, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { opinionOf } from '@engine/people/opinions';
import { quarrelOf } from '@engine/people/quarrels';
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

const namedOf = (s: GameState): Villager[] =>
  s.people.villagers.filter((v) => v.named && v.diedTick === null);

/** Dos que se detestan de verdad, con su rencor ya cocido. */
function feuding(state: GameState): [Villager, Villager] {
  const [a, b] = namedOf(state);
  a!.opinions[b!.id] = -80;
  b!.opinions[a!.id] = -80;
  state.people.grudges.push({
    fromId: a!.id,
    toId: b!.id,
    cause: 'was_blamed',
    causeTick: state.tick - 200,
    formedTick: state.tick - QUARREL.COOLING_TICKS - 1,
    healedTick: null,
  });
  return [a!, b!];
}

/** Intenta muchas semanas: la riña es rara por semana, no imposible. */
function quarrelWithin(state: GameState, weeks: number): ReturnType<typeof quarrelOf> {
  for (let n = 0; n < weeks; n += 1) {
    const q = quarrelOf(state);
    if (q !== null) return q;
    state.tick += 1;
  }
  return null;
}

describe('sin rencor no hay riña · §7.9', () => {
  it('una aldea sin rencores nunca discute', () => {
    const state = village(20);
    state.people.grudges = [];
    expect(quarrelWithin(state, 400)).toBeNull();
  });

  it('ni con un rencor ya curado', () => {
    const state = village(20);
    const [a, b] = feuding(state);
    state.people.grudges[state.people.grudges.length - 1]!.healedTick = state.tick;
    expect(quarrelWithin(state, 400)).toBeNull();
    expect(a.id).not.toBe(b.id);
  });

  it('ni con un rencor recién nacido: primero se cuece', () => {
    const state = village(20);
    feuding(state);
    state.people.grudges[state.people.grudges.length - 1]!.formedTick = state.tick;
    // Menos semanas que el enfriamiento, así que no puede haber estallado.
    expect(quarrelOf(state)).toBeNull();
  });

  it('ni si ya se les ha pasado el enfado', () => {
    // El rencor está escrito pero la opinión ha vuelto a subir: §6.4 dice que
    // eso es exactamente lo que significa curarse.
    const state = village(20);
    const [a, b] = feuding(state);
    a.opinions[b.id] = 0;
    b.opinions[a.id] = 0;
    expect(quarrelWithin(state, 400)).toBeNull();
  });
});

describe('con rencor, acaba pasando · §7.9', () => {
  it('dos que se detestan acaban teniendo un mal día', () => {
    const state = village(20);
    const [a, b] = feuding(state);
    const quarrel = quarrelWithin(state, 800);
    expect(quarrel, 'en dieciséis años algo tenía que pasar').not.toBeNull();
    expect([quarrel!.a, quarrel!.b].sort()).toEqual([a.id, b.id].sort());
  });

  it('y se llevan peor después que antes', () => {
    const state = village(20);
    const [a, b] = feuding(state);
    const before = opinionOf(state, a.id, b.id);
    expect(quarrelWithin(state, 800)).not.toBeNull();
    expect(opinionOf(state, a.id, b.id)).toBeLessThan(before);
  });

  it('los dos recuerdan de quién fue la culpa', () => {
    const state = village(20);
    const [a, b] = feuding(state);
    a.memories = [];
    b.memories = [];
    expect(quarrelWithin(state, 800)).not.toBeNull();
    expect(a.memories.some((m) => m.aboutId === b.id)).toBe(true);
    expect(b.memories.some((m) => m.aboutId === a.id)).toBe(true);
  });

  it('el que tiene mal genio riñe mucho más que el manso', () => {
    // §6.3 tenía quince rasgos y sólo dos cambiaban comportamiento. Éste es el
    // tercero: el carácter decide si el asunto estalla o se aguanta un año más.
    //
    // Se cuentan riñas en una ventana fija en vez de esperar a la primera: es
    // treinta veces más barato y la suite rápida tiene veinte segundos para
    // todo. Y con la proporción, no con el orden — comparar sólo «antes que»
    // pasaba aunque el rasgo del genio vivo no hiciera nada, porque el manso
    // frena por su cuenta. Lo destapó una mutación.
    // Se cuentan semanas hasta la PRIMERA riña, no riñas en una ventana: desde
    // v3.09 los mismos dos no pueden repetir antes de `REPEAT_TICKS`, así que
    // contar en una ventana mide el freno y no el carácter.
    const weeksUntil = (trait: 'hot_tempered' | 'kind'): number => {
      const state = village(20);
      const [a, b] = feuding(state);
      a.traits = [trait];
      b.traits = [trait];
      for (let week = 0; week < 3000; week += 1) {
        if (quarrelOf(state) !== null) return week;
        state.tick += 1;
      }
      return 3000;
    };

    const hot = weeksUntil('hot_tempered');
    const mild = weeksUntil('kind');
    expect(hot, 'el de mal genio riñe pronto').toBeLessThan(600);
    expect(mild / Math.max(1, hot), 'el manso aguanta muchísimo más').toBeGreaterThan(8);
  });
});

describe('no rompe las reglas · §4.3, §6.4', () => {
  it('tira sólo de su propio flujo', () => {
    const state = village(20);
    feuding(state);
    const before = { ...state.rng };
    quarrelWithin(state, 300);
    for (const stream of Object.keys(before) as (keyof typeof before)[]) {
      if (stream === 'quarrels') continue;
      expect(state.rng[stream], stream).toBe(before[stream]);
    }
    expect(state.rng.quarrels).not.toBe(before.quarrels);
  });

  it('la opinión nunca se sale de los límites de §6.4', () => {
    const state = village(20);
    const [a, b] = feuding(state);
    for (let n = 0; n < 3000; n += 1) {
      quarrelOf(state);
      state.tick += 1;
    }
    expect(opinionOf(state, a.id, b.id)).toBeGreaterThanOrEqual(OPINION.MIN);
  });

  it('dos partidas iguales riñen igual', () => {
    const a = village(20);
    const b = village(20);
    feuding(a);
    feuding(b);
    expect(quarrelWithin(a, 500)).toEqual(quarrelWithin(b, 500));
  });

  it('en una partida de verdad se riñe, pero no todas las semanas', () => {
    // Medido: unas seis por siglo y partida. Ni cero —el sistema estaría
    // muerto— ni una taberna.
    // Con varias semillas, que una sola es ruido: medido, unas tres o cuatro
    // riñas por siglo y partida, y hay semillas que no riñen en cien años.
    let fights = 0;
    for (const seed of [3, 7, 11]) {
      const state = foundGame(seed);
      run(state, 120 * 48, 'prudent', CATALOG);
      fights += state.chronicle.filter((e) => e.templateKey.startsWith('quarrel.')).length;
    }
    expect(fights, 'en tres siglos de aldea algo tiene que pasar').toBeGreaterThan(0);
    expect(fights, 'pero no es una taberna').toBeLessThan(3 * 120 * TIME.WEEKS_PER_YEAR * 0.01);
  });
});
