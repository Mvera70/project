// M-10 · design.md §4.2, §4.3, §6.2, §12.9.
//
// El orden del tick es normativo: cambiarlo cambia el balance y rompe las
// partidas guardadas. Lo que se protege aquí es ese orden, el determinismo del
// que cuelga todo el proyecto, y que mil ticks no revienten.
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { LIFE, MIGRATION, PEOPLE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { isHere, population } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import { holderOf } from '@engine/crossroads/conditions';
import { decide, fillVacancies, run, tick } from '@engine/sim';
import type { GameState, Villager } from '@engine/state';
import type { CrossroadTemplate } from '@engine/crossroads/schema';

const YEAR = TIME.WEEKS_PER_YEAR;

/**
 * Hash every state field, including typed map arrays, works and pending choices.
 *
 * Fed to the digest in pieces rather than as one `JSON.stringify(s)`. A village
 * that survives five thousand ticks carries thousands of chronicle entries and
 * hundreds of villagers with their memories, and the five map layers stringify
 * as objects with two thousand numeric keys each: the single string was large
 * enough to take the vitest worker down when two of them existed at once.
 * Streaming covers exactly the same bytes without ever holding them all.
 */
function fingerprint(s: GameState): string {
  const h = createHash('sha256');
  const bytes = (a: Uint8Array | Uint16Array): void => {
    h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  };
  h.update(`${s.version}|${s.seed}|${s.tick}|${s.map.width}x${s.map.height}`);
  bytes(s.map.terrain);
  bytes(s.map.traffic);
  bytes(s.map.path);
  bytes(s.map.ruins);
  bytes(s.map.forestAge);
  h.update(JSON.stringify(s.rng));
  h.update(JSON.stringify(s.village));
  h.update(JSON.stringify(s.weather));
  h.update(JSON.stringify(s.outbreak));
  h.update(JSON.stringify(s.ended));
  h.update(JSON.stringify(s.flags));
  h.update(JSON.stringify(s.crossroad));
  h.update(JSON.stringify(s.works));
  h.update(JSON.stringify(s.people.namedIds));
  for (const v of s.people.villagers) h.update(JSON.stringify(v));
  for (const g of s.people.grudges) h.update(JSON.stringify(g));
  for (const b of s.buildings) h.update(JSON.stringify(b));
  for (const e of s.chronicle) h.update(JSON.stringify(e));
  for (const d of s.history) h.update(JSON.stringify(d));
  for (const seed of s.seeds) h.update(JSON.stringify(seed));
  return h.digest('hex');
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
    //
    // The first game is played inside a scope that keeps only its hash and its
    // decisions, so that the second one is not built alongside a whole live
    // village that nothing is going to read again.
    const played = ((): { hash: string; history: GameState['history']; ticks: number } => {
      const s = foundGame(6);
      run(s, 5000, 'first', CATALOG);
      return { hash: fingerprint(s), history: s.history, ticks: s.tick };
    })();
    expect(played.ticks).toBe(5000);
    expect(played.history.length).toBeGreaterThan(0);

    const replay = foundGame(6);
    let decisions = 0;
    for (let week = 1; week <= 5000; week += 1) {
      const recorded = played.history[decisions];
      const decision = recorded?.tick === week ? recorded : undefined;
      tick(replay, CATALOG, decision);
      if (decision !== undefined) decisions += 1;
    }
    expect(replay.tick).toBe(5000);
    expect(decisions).toBe(played.history.length);
    expect(fingerprint(replay)).toBe(played.hash);
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

  it('ninguna cifra se sale de rango en sesenta años', () => {
    // Cinco semillas y sesenta años. La versión grande de esto es
    // `invalidCases` del banco de M-12: 240 partidas de 200 años con las mismas
    // comprobaciones. Cuando se escribió esta prueba ese banco no existía, y
    // repetirla aquí a escala de siglo cuesta la mitad del presupuesto de §14.1
    // sin cubrir nada que allí no se cubra mejor.
    for (let seed = 0; seed < 5; seed += 1) {
      const s = foundGame(seed);
      for (let i = 0; i < 60 * YEAR && s.ended === null; i += 1) {
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

  it('las cinco políticas corren sin romperse', () => {
    for (const policy of ['first', 'last', 'random', 'worst', 'prudent'] as const) {
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

describe('la política prudent · §12.9', () => {
  // El catálogo real no sirve para fijar el resultado de una puntuación: no se
  // sabe qué encrucijada sale ni con qué estado. Estas plantillas existen sólo
  // aquí, con las cifras a la vista, que es lo que hace legible el aserto.
  const template = (options: CrossroadTemplate['options']): CrossroadTemplate => ({
    id: 'probe', category: 'lord', weight: 1, cooldownYears: 0,
    requires: [], cast: [],
    title: 'crossroad.probe.title', body: 'crossroad.probe.body',
    options,
  });
  const option = (
    id: string,
    effects: CrossroadTemplate['options'][number]['effects'],
    seeds: CrossroadTemplate['options'][number]['seeds'] = [],
  ): CrossroadTemplate['options'][number] => ({
    id, label: `crossroad.probe.${id}.label`, cost: `crossroad.probe.${id}.cost`,
    effects, visible: [{ k: 'gather', where: 'square', days: 1 }], seeds,
  });

  const ask = (t: CrossroadTemplate, state = foundGame(7)): string | null => {
    state.crossroad = {
      templateId: t.id, posedTick: state.tick, cast: {},
      optionIds: t.options.map((o) => o.id),
    };
    return decide(state, [t], 'prudent');
  };

  it('prefiere no pagar grano', () => {
    const t = template([
      option('pay', [{ k: 'stat', stat: 'grain', delta: -300 }]),
      option('refuse', []),
    ]);
    expect(ask(t)).toBe('refuse');
  });

  it('las muertes no se compran a ningún precio', () => {
    // v2.14. La versión anterior tasaba una vida en 40 fanegas, y había
    // opciones donde salía a cuenta: medido, prudent moría de violencia el
    // triple que first. Ahora es un filtro, no un sumando, así que da igual
    // cuánto grano haya al otro lado.
    for (const price of [30, 50, 500, 5000, 50000]) {
      const t = template([
        option('kill_one', [{ k: 'kill', who: 'random', count: 1 }]),
        option('pay', [{ k: 'stat', stat: 'grain', delta: -price }]),
      ]);
      expect(ask(t), `${price} de grano`).toBe('pay');
    }
  });

  it('tampoco las compra cuando el muerto es una fracción de la aldea', () => {
    const t = template([
      option('cull', [{ k: 'kill', who: 'random', count: 'fraction', fraction: 0.1 }]),
      option('pay', [{ k: 'stat', stat: 'grain', delta: -5000 }]),
    ]);
    expect(ask(t)).toBe('pay');
  });

  it('si todas matan, elige la que mata a menos', () => {
    const t = template([
      option('many', [{ k: 'kill', who: 'random', count: 4 }]),
      option('few', [
        { k: 'kill', who: 'random', count: 1 },
        { k: 'stat', stat: 'grain', delta: -400 },
      ]),
    ]);
    expect(ask(t)).toBe('few');
  });

  it('entre las que no matan, sigue pesando el grano', () => {
    const t = template([
      option('cheap', [{ k: 'stat', stat: 'grain', delta: -10 }]),
      option('dear', [{ k: 'stat', stat: 'grain', delta: -900 }]),
    ]);
    expect(ask(t)).toBe('cheap');
  });

  it('el ánimo perdido pesa 3 por punto', () => {
    const t = template([
      option('mood', [{ k: 'stat', stat: 'morale', delta: -10 }]), // −30
      option('grain', [{ k: 'stat', stat: 'grain', delta: -100 }]), // −100
    ]);
    expect(ask(t)).toBe('mood');
  });

  it('con todo lo demás igual, prefiere la opción que no planta semilla', () => {
    const seed = {
      id: 'later', delayYears: [2, 4] as [number, number], effects: [],
      visible: [], chronicleKey: 'consequence.later',
    };
    const t = template([option('with_seed', [], [seed]), option('clean', [])]);
    expect(ask(t)).toBe('clean');
  });

  it('una ganancia de grano es un coste negativo, no cero', () => {
    const t = template([
      option('take', [{ k: 'stat', stat: 'grain', delta: 200 }]),
      option('leave', []),
    ]);
    expect(ask(t)).toBe('take');
  });

  it('el coste de un multiplicador se mide sobre el estado de este tick', () => {
    const t = template([
      option('third', [{ k: 'stat', stat: 'grain', mul: 0.66 }]),
      option('flat', [{ k: 'stat', stat: 'grain', delta: -100 }]),
    ]);
    const poor = foundGame(7);
    poor.village.grain = 60; // un tercio de 60 son 20: más barato que 100
    expect(ask(t, poor)).toBe('third');
    const rich = foundGame(7);
    rich.village.grain = 3000; // un tercio de 3000 son 1020
    expect(ask(t, rich)).toBe('flat');
  });

  it('el orden en que estén escritas las opciones no cambia el resultado', () => {
    // El aserto que pide el brief: ante un empate desempata el id, no la
    // posición. Con las dos ordenaciones tiene que salir la misma opción.
    const a = option('aaa', [{ k: 'stat', stat: 'grain', delta: -50 }]);
    const z = option('zzz', [{ k: 'stat', stat: 'grain', delta: -50 }]);
    expect(ask(template([a, z]))).toBe('aaa');
    expect(ask(template([z, a]))).toBe('aaa');
  });

  it('es determinista y no consume aleatoriedad', () => {
    const s = foundGame(7);
    const t = template([
      option('a', [{ k: 'stat', stat: 'grain', delta: -10 }]),
      option('b', [{ k: 'stat', stat: 'morale', delta: -1 }]),
    ]);
    s.crossroad = { templateId: t.id, posedTick: 0, cast: {}, optionIds: ['a', 'b'] };
    const before = { ...s.rng };
    const first = decide(s, [t], 'prudent');
    expect(decide(s, [t], 'prudent')).toBe(first);
    expect({ ...s.rng }).toEqual(before);
  });

  it('dos partidas con prudent y la misma semilla son idénticas', () => {
    const a = foundGame(19);
    const b = foundGame(19);
    run(a, 3000, 'prudent', CATALOG);
    run(b, 3000, 'prudent', CATALOG);
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
});

describe('el abandono · §5.7, v2.16', () => {
  const YEARS = MIGRATION.ABANDON_YEARS;

  /** Una aldea reducida a `n` vivos, sin tocar nada más. */
  function shrunk(n: number): GameState {
    const s = foundGame(7);
    s.people.villagers.forEach((v, i) => {
      if (i >= n) {
        v.diedTick = 0;
        v.causeOfDeath = 'natural';
      }
    });
    s.people.namedIds = s.people.namedIds.filter(
      (id) => s.people.villagers.find((v) => v.id === id)?.diedTick === null,
    );
    s.village.grain = 100000; // que no sea el hambre quien decida
    return s;
  }

  it('cinco años seguidos por debajo de seis y se marchan', () => {
    const s = shrunk(3);
    for (let i = 0; i < (YEARS + 2) * YEAR && s.ended === null; i += 1) tick(s, CATALOG);
    expect(s.ended?.cause).toBe('abandoned');
    expect(population(s)).toBe(0);
    // Se van, no se mueren: la mortalidad de §12.4 no se lleva el mérito.
    for (const v of s.people.villagers) {
      if (v.diedTick === null) expect(v.leftTick).toBe(s.ended?.tick);
    }
  });

  it('ni una semana antes', () => {
    // El reloj arranca la semana en que se les ve por debajo de seis, así que
    // se van cinco años completos después de esa semana y no antes.
    const s = shrunk(3);
    for (let i = 0; i < YEARS * YEAR; i += 1) tick(s, CATALOG);
    expect(s.dwindlingSince).not.toBeNull();
    expect(s.tick - (s.dwindlingSince as number)).toBeLessThan(YEARS * YEAR);
    expect(s.ended).toBeNull();
    tick(s, CATALOG);
    expect(s.tick - (s.dwindlingSince as number)).toBe(YEARS * YEAR);
    expect(s.ended?.cause).toBe('abandoned');
  });

  it('el reloj se pone a cero si la aldea se recupera', () => {
    const s = shrunk(3);
    for (let i = 0; i < 3 * YEAR; i += 1) tick(s, CATALOG);
    expect(s.dwindlingSince).not.toBeNull();
    // Vuelven a ser seis: el contador se reinicia y los cinco años empiezan de
    // nuevo, que es lo que quiere decir "cinco años seguidos".
    for (const v of s.people.villagers.slice(0, MIGRATION.VIABLE_POPULATION)) {
      v.diedTick = null;
      v.leftTick = null;
    }
    tick(s, CATALOG);
    expect(s.dwindlingSince).toBeNull();
    for (const v of s.people.villagers.slice(3, MIGRATION.VIABLE_POPULATION)) v.diedTick = 0;
    for (let i = 0; i < 3 * YEAR; i += 1) tick(s, CATALOG);
    expect(s.ended).toBeNull();
  });

  it('una aldea viable no se abandona nunca', () => {
    const s = foundGame(108);
    run(s, 40 * YEAR, 'prudent', CATALOG);
    if (population(s) >= MIGRATION.VIABLE_POPULATION) {
      expect(s.ended).toBeNull();
      expect(s.dwindlingSince).toBeNull();
    }
  });

  it('deja su línea de peso 3 en la crónica, y no es la de extinción', () => {
    const s = shrunk(3);
    for (let i = 0; i < (YEARS + 2) * YEAR && s.ended === null; i += 1) tick(s, CATALOG);
    const entry = s.chronicle.find((e) => e.kind === 'abandonment');
    expect(entry?.weight).toBe(3);
    expect(s.chronicle.some((e) => e.kind === 'extinction')).toBe(false);
  });

  it('morir del todo sigue siendo extinción, no abandono', () => {
    const s = foundGame(3);
    for (const v of s.people.villagers) v.diedTick = 1;
    tick(s, CATALOG);
    expect(s.ended?.cause).toBe('extinction');
  });

  it('acota la racha más larga de agonía a los años que dice §5.7', () => {
    // Lo que esto existe para arreglar: partidas que pasaban cuarenta años a
    // dos habitantes sin morirse ni recuperarse.
    for (const seed of [1, 2, 4, 14]) {
      const s = foundGame(seed);
      let below = 0;
      let longest = 0;
      for (let i = 0; i < 200 * YEAR && s.ended === null; i += 1) {
        tick(s, CATALOG);
        if (s.dwindlingSince === null) below = 0;
        else {
          below = s.tick - s.dwindlingSince;
          longest = Math.max(longest, below);
        }
      }
      expect(longest / YEAR, `semilla ${seed}`).toBeLessThanOrEqual(MIGRATION.ABANDON_YEARS);
    }
  });
});
