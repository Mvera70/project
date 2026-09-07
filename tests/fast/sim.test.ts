// M-10 · design.md §4.2, §4.3, §6.2, §12.9.
//
// El orden del tick es normativo: cambiarlo cambia el balance y rompe las
// partidas guardadas. Lo que se protege aquí es ese orden, el determinismo del
// que cuelga todo el proyecto, y que mil ticks no revienten.
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { LIFE, PEOPLE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { isHere, population } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import { holderOf } from '@engine/crossroads/conditions';
import { decide, fillVacancies, run, tick } from '@engine/sim';
import type { GameState, Villager } from '@engine/state';

const YEAR = TIME.WEEKS_PER_YEAR;

/** Hash every state field, including typed map arrays, works and pending choices. */
function fingerprint(s: GameState): string {
  return createHash('sha256').update(JSON.stringify(s)).digest('hex');
}

describe('la fundación', () => {
  it('empieza como manda §12.2', () => {
    const s = foundGame(7);
    expect(s.tick).toBe(0);
    expect(population(s)).toBe(20);
    expect(s.village.grain).toBe(800);
    expect(s.buildings.filter((b) => b.kind === 'house')).toHaveLength(4);
    expect(s.buildings.filter((b) => b.kind === 'field')).toHaveLength(2);
    expect(s.village.wood).toBe(200);
    expect(s.works).toEqual([]);
    for (const house of s.buildings.filter((b) => b.kind === 'house')) {
      expect(s.people.villagers.filter((v) => v.homeId === house.id)).toHaveLength(LIFE.HOUSE_CAPACITY);
    }
    expect(s.crossroad).toBeNull();
    expect(s.ended).toBeNull();
    expect(s.chronicle[0]?.kind).toBe('founding');
  });

  it('la misma semilla funda la misma aldea', () => {
    expect(fingerprint(foundGame(7))).toBe(fingerprint(foundGame(7)));
    expect(fingerprint(foundGame(7))).not.toBe(fingerprint(foundGame(8)));
  });

  it('el valle tiene bosque y río', () => {
    // The integrated founding uses M-13's real valley.
    const s = foundGame(7);
    const forest = [...s.map.terrain].filter((t) => t === 1).length;
    const water = [...s.map.terrain].filter((t) => t === 2).length;
    expect(forest / s.map.terrain.length).toBeGreaterThanOrEqual(0.18);
    expect(forest / s.map.terrain.length).toBeLessThanOrEqual(0.30);
    expect(water).toBeGreaterThan(0);
  });
});

describe('determinismo · §4.3', () => {
  it('misma semilla y mismas decisiones dan el mismo estado a los 5 000 ticks', () => {
    // This seed survives the full horizon; an ended game must not pass early.
    const original = foundGame(6);
    run(original, 5000, 'first', CATALOG);
    expect(original.tick).toBe(5000);
    expect(original.history.length).toBeGreaterThan(0);
    const replay = foundGame(6);
    let decisions = 0;
    for (let week = 1; week <= 5000; week += 1) {
      const recorded = original.history[decisions];
      const decision = recorded?.tick === week ? recorded : undefined;
      tick(replay, CATALOG, decision);
      if (decision !== undefined) decisions += 1;
    }
    expect(replay.tick).toBe(5000);
    expect(decisions).toBe(original.history.length);
    expect(fingerprint(replay)).toBe(fingerprint(original));
  });

  it('dos semillas divergen', () => {
    const play = (seed: number): GameState => {
      const s = foundGame(seed);
      run(s, 2000, 'first', CATALOG);
      return s;
    };
    expect(fingerprint(play(7))).not.toBe(fingerprint(play(42)));
  });

  it('la política cambia la partida', () => {
    const play = (policy: 'first' | 'last'): GameState => {
      const s = foundGame(7);
      run(s, 3000, policy, CATALOG);
      return s;
    };
    const a = play('first');
    const b = play('last');
    expect(a.history.length).toBeGreaterThan(0);
    expect(a.history.map((d) => d.optionId)).not.toEqual(b.history.map((d) => d.optionId));
  });

  it('componer la crónica no desplaza la simulación', async () => {
    // §4.3: una tirada en el render jamás puede mover el motor.
    const s = foundGame(7);
    run(s, 1000, 'first', CATALOG);
    const before = fingerprint(s);
    const { renderYear } = await import('@engine/chronicle/render');
    for (let y = 0; y < 21; y += 1) renderYear(s, y, 1);
    expect(fingerprint(s)).toBe(before);
  });
});

describe('el orden del tick · §4.2', () => {
  it('comer va antes que cosechar, y las muertes antes que el ánimo', async () => {
    // Espías sobre los módulos, para comprobar la SECUENCIA y no que una
    // función llame a otra.
    const calls: string[] = [];
    const watch = async (path: string, names: string[]): Promise<void> => {
      const mod = (await import(path)) as Record<string, unknown>;
      for (const name of names) {
        const original = mod[name] as (...a: unknown[]) => unknown;
        vi.spyOn(mod as never, name as never).mockImplementation(((...a: unknown[]) => {
          calls.push(name);
          return original(...a);
        }) as never);
      }
    };

    await watch('@engine/subsistence/labour', ['allocateLabour', 'produce']);
    await watch('@engine/world/works', ['advanceWorks']);
    await watch('@engine/subsistence/consumption', ['consume', 'overwinter']);
    await watch('@engine/subsistence/harvest', ['harvest', 'applySpoilage']);
    await watch('@engine/subsistence/mood', ['updateMood']);
    await watch('@engine/people/demography', ['resolveDeaths', 'resolveBirths']);
    await watch('@engine/crossroads/seeds', ['fireSeeds']);
    await watch('@engine/crossroads/select', ['selectCrossroad']);

    const s = foundGame(7);
    s.tick = TIME.HARVEST_WEEK - 1; // para que la cosecha caiga dentro
    tick(s, CATALOG);

    const at = (name: string): number => calls.indexOf(name);
    expect(at('fireSeeds')).toBeGreaterThanOrEqual(0); // 4
    expect(at('allocateLabour')).toBeGreaterThan(at('fireSeeds')); // 5
    expect(at('produce')).toBeGreaterThan(at('allocateLabour')); // 5
    expect(at('advanceWorks')).toBeGreaterThan(at('produce')); // 6
    expect(at('consume')).toBeGreaterThan(at('advanceWorks')); // 7
    expect(at('overwinter')).toBeGreaterThan(at('consume')); // 8
    expect(at('harvest')).toBeGreaterThan(at('overwinter')); // 9 — DESPUÉS de comer
    expect(at('applySpoilage')).toBeGreaterThan(at('harvest')); // 10
    expect(at('resolveDeaths')).toBeGreaterThan(at('applySpoilage')); // 11
    expect(at('updateMood')).toBeGreaterThan(at('resolveDeaths')); // 12 — v2.5
    expect(at('resolveBirths')).toBeGreaterThan(at('updateMood')); // 13
    expect(at('selectCrossroad')).toBeGreaterThan(at('resolveBirths')); // 15

    vi.restoreAllMocks();
  });

  it('el paso 2 sólo corre en la semana 0', async () => {
    const mod = await import('@engine/subsistence/seasons');
    const spy = vi.spyOn(mod, 'rollWeather');

    const s = foundGame(7);
    for (let i = 0; i < YEAR; i += 1) tick(s, CATALOG);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(s.tick % YEAR).toBe(0);

    vi.restoreAllMocks();
  });

  it('el tick avanza uno y sólo uno', () => {
    const s = foundGame(7);
    for (let i = 1; i <= 50; i += 1) {
      tick(s, CATALOG);
      expect(s.tick).toBe(i);
    }
  });

  it('la crónica se vuelca en el paso 16, no antes', () => {
    // El informe del tick trae las entradas de la semana, y son exactamente las
    // que acaban en la crónica.
    const s = foundGame(7);
    for (let i = 0; i < 400; i += 1) {
      const before = s.chronicle.length;
      const report = tick(s, CATALOG);
      const added = s.chronicle.slice(before);
      // El paso 17 puede añadir la extinción después del volcado.
      expect(added.slice(0, report.entries.length)).toEqual(report.entries);
    }
  });

  it('tick no escribe por consola', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const s = foundGame(7);
    for (let i = 0; i < 500; i += 1) tick(s, CATALOG);
    expect(log).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe('robustez', () => {
  it('mil ticks sin excepciones en 20 semillas', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      expect(() => {
        const s = foundGame(seed);
        run(s, 1000, 'first', CATALOG);
      }, `semilla ${seed}`).not.toThrow();
    }
  });

  it('ninguna cifra se sale de rango en un siglo', () => {
    for (let seed = 0; seed < 10; seed += 1) {
      const s = foundGame(seed);
      for (let i = 0; i < 100 * YEAR && s.ended === null; i += 1) {
        tick(s, CATALOG);
        if (i % 97 !== 0) continue;
        expect(Number.isFinite(s.village.grain), `semilla ${seed}`).toBe(true);
        expect(s.village.grain).toBeGreaterThanOrEqual(0);
        expect(s.village.wood).toBeGreaterThanOrEqual(0);
        expect(s.village.morale).toBeGreaterThanOrEqual(0);
        expect(s.village.morale).toBeLessThanOrEqual(100);
        expect(s.village.faith).toBeGreaterThanOrEqual(0);
        expect(s.village.faith).toBeLessThanOrEqual(100);
        for (const v of s.people.villagers) {
          expect(v.bornTick).toBeLessThanOrEqual(s.tick);
          expect(ageOf(v, s.tick)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('las cuatro políticas corren sin romperse', () => {
    for (const policy of ['first', 'last', 'random', 'worst'] as const) {
      const s = foundGame(11);
      expect(() => run(s, 2000, policy, CATALOG), policy).not.toThrow();
    }
  });

  it('una política de función recibe las opciones que se ofrecen', () => {
    const s = foundGame(11);
    let asked = 0;
    run(s, 2000, (state, options) => {
      asked += 1;
      expect(options.length).toBeGreaterThan(0);
      expect(state.crossroad).not.toBeNull();
      return options[options.length - 1] as string;
    }, CATALOG);
    expect(asked).toBeGreaterThan(0);
    expect(s.history.length).toBe(asked);
  });

  it('una aldea extinguida deja de simular', () => {
    const s = foundGame(3);
    for (const v of s.people.villagers) v.diedTick = 1;
    tick(s, CATALOG);
    expect(s.ended?.cause).toBe('extinction');
    const at = s.tick;
    run(s, 500, 'first', CATALOG);
    expect(s.tick).toBe(at);
    expect(s.chronicle.some((e) => e.kind === 'extinction')).toBe(true);
  });
});

describe('cobertura de vacantes · §6.2', () => {
  it('un oficio vacante se cubre en la semana 0', () => {
    const s = foundGame(7);
    const smith = s.people.villagers.find((v) => v.role === 'smith') as Villager;
    smith.diedTick = 1;
    s.people.namedIds = s.people.namedIds.filter((id) => id !== smith.id);
    expect(holderOf(s, 'smith')).toBeNull();

    s.tick = YEAR;
    fillVacancies(s);
    expect(holderOf(s, 'smith')).not.toBeNull();
  });

  it('elige dentro de la banda, no al más viejo', () => {
    // §6.2 v2.9: la lectura de "por edad" como "el mayor" envejecía el reparto
    // entero y disparaba la sucesión al doble de su ritmo.
    for (let seed = 0; seed < 30; seed += 1) {
      const s = foundGame(seed);
      const reeve = s.people.villagers.find((v) => v.role === 'reeve') as Villager;
      reeve.diedTick = 1;
      s.people.namedIds = s.people.namedIds.filter((id) => id !== reeve.id);

      s.tick = YEAR;
      const eligibleBand = s.people.villagers.filter(
        (v) => isHere(v) && !v.named && v.role === null
          && ageOf(v, s.tick) >= 22 && ageOf(v, s.tick) <= PEOPLE.ROLE_MAX_PREFERRED,
      );
      fillVacancies(s);
      const chosen = s.people.villagers.find((v) => v.role === 'reeve' && isHere(v));
      if (chosen === undefined || eligibleBand.length === 0) continue;
      expect(ageOf(chosen, s.tick), `semilla ${seed}`).toBeLessThanOrEqual(
        PEOPLE.ROLE_MAX_PREFERRED,
      );
    }
  });

  it('el líder NO se cubre solo: eso es la sucesión', () => {
    // §6.6. Cubrirlo aquí mataría la plantilla que es el latido del bucle largo.
    const s = foundGame(7);
    const leader = s.people.villagers.find((v) => v.role === 'leader') as Villager;
    leader.diedTick = 1;
    s.people.namedIds = s.people.namedIds.filter((id) => id !== leader.id);

    s.tick = YEAR;
    fillVacancies(s);
    expect(holderOf(s, 'leader')).toBeNull();
  });

  it('sin capilla no hay cura', () => {
    const s = foundGame(7);
    const priest = s.people.villagers.find((v) => v.role === 'priest') as Villager;
    priest.diedTick = 1;
    s.people.namedIds = s.people.namedIds.filter((id) => id !== priest.id);

    s.tick = YEAR;
    fillVacancies(s);
    expect(holderOf(s, 'priest')).toBeNull();

    s.buildings.push({
      id: 999, kind: 'chapel', x: 0, y: 0, w: 2, h: 2,
      builtTick: 0, lostTick: null, tier: 0, lit: true,
    });
    fillVacancies(s);
    expect(holderOf(s, 'priest')).not.toBeNull();
  });
});

describe('políticas · §12.9', () => {
  it('first toma la primera y last la última', () => {
    const s = foundGame(7);
    run(s, 3000, 'first', CATALOG);
    if (s.crossroad !== null) {
      expect(decide(s, CATALOG, 'first')).toBe(s.crossroad.optionIds[0]);
      expect(decide(s, CATALOG, 'last')).toBe(
        s.crossroad.optionIds[s.crossroad.optionIds.length - 1],
      );
    }
  });

  it('sin encrucijada pendiente no hay nada que decidir', () => {
    const s = foundGame(7);
    expect(decide(s, CATALOG, 'first')).toBeNull();
  });

  it('first es acomodaticia: nunca levanta la empalizada', () => {
    // §12.9 v2.10. Ninguna política es neutra, y ésta es la razón: `bandits`
    // tiene por interruptor una obra que `first` no elige jamás.
    const s = foundGame(7);
    run(s, 100 * YEAR, 'first', CATALOG);
    const walled = s.history.filter((d) => d.optionId === 'wall_the_village_first');
    expect(walled).toHaveLength(0);
  });
});
