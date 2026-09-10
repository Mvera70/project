// M-34 · design.md §7.9 — que lo que pasa mueva lo que la gente piensa.
//
// Lo que se protege: que el hambre le pase factura a quien manda, que la
// desgracia compartida acerque, y sobre todo **que la cadena entera llegue
// hasta el final** — de un mal año a un rencor con nombre y causa, que es lo
// que §6.4 ya sabía contar y nadie alimentaba.
import { describe, expect, it } from 'vitest';
import { NEIGHBOUR, OPINION, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { opinionOf } from '@engine/people/opinions';
import { scarFire, scarHunger } from '@engine/people/scars';
import { workedTogether } from '@engine/people/neighbours';
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

const leaderOf = (s: GameState): Villager =>
  s.people.villagers.find((v) => v.role === 'leader' && v.diedTick === null)!;

const othersOf = (s: GameState): Villager[] =>
  s.people.villagers.filter((v) => v.named && v.diedTick === null && v.role !== 'leader');

describe('el hambre le pasa factura al que manda · §7.9', () => {
  it('un año malo baja la opinión del líder', () => {
    const state = village(20);
    const leader = leaderOf(state);
    const someone = othersOf(state)[0]!;
    const before = opinionOf(state, someone.id, leader.id);

    scarHunger(state, 0.6);
    expect(opinionOf(state, someone.id, leader.id)).toBeLessThan(before);
  });

  it('cuanto peor el año, más factura', () => {
    const light = village(20);
    scarHunger(light, 0.2);
    const heavy = village(20);
    scarHunger(heavy, 1);

    const drop = (s: GameState): number =>
      opinionOf(s, othersOf(s)[0]!.id, leaderOf(s).id);
    expect(drop(heavy)).toBeLessThan(drop(light));
  });

  it('un mal rato pequeño no le cuesta nada a nadie', () => {
    const state = village(20);
    const leader = leaderOf(state);
    const someone = othersOf(state)[0]!;
    const before = opinionOf(state, someone.id, leader.id);
    scarHunger(state, 0.05);
    expect(opinionOf(state, someone.id, leader.id)).toBe(before);
  });

  it('el líder no se culpa a sí mismo', () => {
    const state = village(20);
    const leader = leaderOf(state);
    scarHunger(state, 1);
    expect(opinionOf(state, leader.id, leader.id)).toBe(0);
  });

  it('sin líder no hay a quien culpar, y no revienta', () => {
    const state = village(20);
    for (const v of state.people.villagers) if (v.role === 'leader') v.role = null;
    expect(() => scarHunger(state, 1)).not.toThrow();
  });
});

describe('la desgracia compartida acerca · §7.9', () => {
  it('dos que pierden la misma casa se acercan', () => {
    const state = village(20);
    const home = state.people.villagers.find(
      (v) => v.named && v.diedTick === null && v.homeId !== null,
    )!.homeId!;
    const housemates = state.people.villagers.filter(
      (v) => v.named && v.diedTick === null && v.homeId === home,
    );
    if (housemates.length < 2) {
      // Si en esta semilla no comparten casa dos nombrados, se les junta: lo
      // que se prueba es la regla, no el reparto de camas de la semilla 7.
      const spare = state.people.villagers.find(
        (v) => v.named && v.diedTick === null && v.homeId !== home,
      )!;
      spare.homeId = home;
      housemates.push(spare);
    }
    const [a, b] = housemates;
    const before = opinionOf(state, a!.id, b!.id);

    scarFire(state, home);
    expect(opinionOf(state, a!.id, b!.id)).toBeGreaterThan(before);
    expect(opinionOf(state, b!.id, a!.id)).toBeGreaterThan(before);
  });

  it('a quien no vivía allí no le acerca nada', () => {
    const state = village(20);
    const victim = state.people.villagers.find(
      (v) => v.named && v.diedTick === null && v.homeId !== null,
    )!;
    const stranger = state.people.villagers.find(
      (v) => v.named && v.diedTick === null && v.homeId !== victim.homeId,
    )!;
    const before = opinionOf(state, stranger.id, victim.id);
    scarFire(state, victim.homeId!);
    expect(opinionOf(state, stranger.id, victim.id)).toBe(before);
  });
});

describe('la cadena entera · §6.4, §7.9', () => {
  it('años de hambre acaban en un rencor con nombre y causa', () => {
    // Esto es lo que todo el módulo existe para conseguir. §6.4 sabía escribir
    // rencores con su causa desde M-05 y sólo se los daba el catálogo. Ahora
    // un valle que pasa hambre bajo el mismo líder produce uno solo.
    const state = village(20);
    const leader = leaderOf(state);
    const before = state.people.grudges.length;

    for (let year = 0; year < 6; year += 1) {
      scarHunger(state, 1);
      state.tick += TIME.WEEKS_PER_YEAR;
    }

    const fresh = state.people.grudges.slice(before);
    expect(fresh.length, 'alguien tiene que haber roto con el líder').toBeGreaterThan(0);
    for (const g of fresh) expect(g.toId).toBe(leader.id);
    // Y con causa escrita, no un rencor mudo: el hambre dejó su recuerdo.
    expect(fresh.some((g) => g.cause === 'went_hungry')).toBe(true);
  });

  it('un solo año malo no rompe a nadie', () => {
    // El umbral de §6.4 está en −50 y un año pesa 18: hacen falta varios. Un
    // valle no se subleva por un invierno.
    const state = village(20);
    const before = state.people.grudges.length;
    scarHunger(state, 1);
    expect(state.people.grudges.length).toBe(before);
  });

  it('el rencor cabe dentro de los límites de §6.4', () => {
    const state = village(20);
    const leader = leaderOf(state);
    for (let year = 0; year < 40; year += 1) {
      scarHunger(state, 1);
      state.tick += TIME.WEEKS_PER_YEAR;
    }
    for (const v of othersOf(state)) {
      expect(opinionOf(state, v.id, leader.id), v.name).toBeGreaterThanOrEqual(OPINION.MIN);
    }
  });
});

describe('la convivencia acerca · §7.9', () => {
  it('trabajar en el mismo sitio sube la opinión', () => {
    const state = village(20);
    const [a, b] = othersOf(state);
    a!.opinions[b!.id] = 0;
    b!.opinions[a!.id] = 0;
    workedTogether(state, [[a!.id, b!.id]]);
    expect(opinionOf(state, a!.id, b!.id)).toBeGreaterThan(0);
    expect(opinionOf(state, b!.id, a!.id)).toBeGreaterThan(0);
  });

  it('y gana al olvido de §6.4, que si no no serviría de nada', () => {
    // El primer valor probado (0,04) estaba por debajo de DRIFT_PER_WEEK
    // (0,05), así que la convivencia no llegaba nunca a superar al olvido: la
    // mejor opinión de cinco partidas de 120 años era 0,6.
    expect(NEIGHBOUR.PER_WEEK).toBeGreaterThan(OPINION.DRIFT_PER_WEEK);
  });

  it('pero no sube sin techo', () => {
    const state = village(20);
    const [a, b] = othersOf(state);
    for (let week = 0; week < 5000; week += 1) workedTogether(state, [[a!.id, b!.id]]);
    expect(opinionOf(state, a!.id, b!.id)).toBeLessThan(NEIGHBOUR.CEILING + NEIGHBOUR.PER_WEEK * 2);
  });

  it('el que trabaja solo no se hace amigo de nadie', () => {
    const state = village(20);
    const [a, b] = othersOf(state);
    a!.opinions[b!.id] = 0;
    // Cada uno en su sitio: dos cuadrillas de uno.
    workedTogether(state, [[a!.id], [b!.id]]);
    expect(opinionOf(state, a!.id, b!.id)).toBe(0);
  });

  it('acercarse no consume una tirada de azar', () => {
    const state = village(20);
    const [a, b] = othersOf(state);
    const before = { ...state.rng };
    workedTogether(state, [[a!.id, b!.id]]);
    expect(state.rng).toEqual(before);
  });
});

describe('no rompe las reglas · §4.3', () => {
  it('mover opiniones no consume una sola tirada de azar', () => {
    const state = village(20);
    const before = { ...state.rng };
    scarHunger(state, 0.8);
    const home = state.people.villagers.find((v) => v.named && v.homeId !== null)!.homeId!;
    scarFire(state, home);
    expect(state.rng).toEqual(before);
  });

  it('dos partidas iguales se enfadan igual', () => {
    const a = village(20);
    const b = village(20);
    scarHunger(a, 0.7);
    scarHunger(b, 0.7);
    const leader = leaderOf(a);
    for (const v of othersOf(a)) {
      expect(opinionOf(a, v.id, leader.id)).toBe(opinionOf(b, v.id, leader.id));
    }
  });
});
