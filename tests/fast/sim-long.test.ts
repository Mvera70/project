// Partido de `sim.test.ts` en v3.14 · design.md §14.1.
//
// La suite rápida tiene veinte segundos de presupuesto y `sim.test.ts` sola
// tardaba treinta y cinco. Vitest reparte el trabajo por fichero y no por
// prueba, así que un fichero de treinta y cinco segundos es un suelo que no
// baja por muchos núcleos que tenga la máquina. Aquí viven las pruebas que
// corren partidas largas.
//
// **No se ha tocado ni una aserción.** Mover una prueba para que corra en
// paralelo es legítimo; recortarla para que tarde menos sería esconder el
// problema en vez de resolverlo.

// M-10 · design.md §4.2, §4.3, §6.2, §12.9.
//
// El orden del tick es normativo: cambiarlo cambia el balance y rompe las
// partidas guardadas. Lo que se protege aquí es ese orden, el determinismo del
// que cuelga todo el proyecto, y que mil ticks no revienten.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { ageOf } from '@engine/people/villagers';
import { decide, run, tick } from '@engine/sim';
import type { GameState } from '@engine/state';
import type { CrossroadTemplate } from '@engine/crossroads/schema';
import { fingerprint } from '../helpers/fingerprint';

const YEAR = TIME.WEEKS_PER_YEAR;



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
    // Tres semillas y sesenta años. La versión grande de esto es
    // `invalidCases` del banco de M-12: 240 partidas de 200 años con las mismas
    // comprobaciones. Cuando se escribió esta prueba ese banco no existía, y
    // repetirla aquí a escala de siglo cuesta la mitad del presupuesto de §14.1
    // sin cubrir nada que allí no se cubra mejor.
    for (const seed of [0, 7, 108]) {
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

describe('la regla de no degeneración · §12.9, v2.24', () => {
  // Una plantilla de sonda con tres opciones y ninguna consecuencia: lo que se
  // mide es a quién elige la política, no qué pasa después.
  const PROBE: CrossroadTemplate = {
    id: 'probe', category: 'lord', weight: 1, cooldownYears: 0,
    requires: [], cast: [],
    title: 'crossroad.probe.title', body: 'crossroad.probe.body',
    options: ['alpha', 'beta', 'gamma'].map((id, i) => ({
      id,
      label: `crossroad.probe.${id}.label`,
      cost: `crossroad.probe.${id}.cost`,
      // Costes distintos y crecientes, para que `worst` y `prudent` tengan una
      // preferencia clara y no elijan por casualidad.
      effects: [{ k: 'stat', stat: 'morale', delta: -(i + 1) * 5 }],
      visible: [{ k: 'gather', where: 'square', days: 1 }],
      seeds: [],
    })) as CrossroadTemplate['options'],
  };

  /** Veinte apariciones seguidas de la misma plantilla, anotando la elegida. */
  function twentyAsks(policy: 'first' | 'last' | 'worst' | 'prudent'): string[] {
    const s = foundGame(7);
    const taken: string[] = [];
    for (let i = 0; i < 20; i += 1) {
      s.crossroad = {
        templateId: PROBE.id, posedTick: s.tick, cast: {},
        optionIds: PROBE.options.map((o) => o.id),
      };
      const chosen = decide(s, [PROBE], policy);
      expect(chosen).not.toBeNull();
      taken.push(chosen as string);
      // Lo que `applyOption` haría en el paso 3: dejar constancia. La regla lee
      // el historial, así que sin esto no hay apariciones anteriores.
      s.history.push({ tick: s.tick, templateId: PROBE.id, optionId: chosen as string, cast: {} });
      s.tick += 1;
      s.crossroad = null;
    }
    return taken;
  }

  for (const policy of ['first', 'last', 'worst', 'prudent'] as const) {
    it(`${policy} no elige lo mismo más de dos veces seguidas`, () => {
      const taken = twentyAsks(policy);
      expect(taken).toHaveLength(20);
      for (let i = 2; i < taken.length; i += 1) {
        const three = [taken[i - 2], taken[i - 1], taken[i]];
        expect(new Set(three).size, `en la posición ${i}: ${three.join(', ')}`)
          .toBeGreaterThan(1);
      }
    });

    it(`${policy} sigue siendo determinista`, () => {
      expect(twentyAsks(policy)).toEqual(twentyAsks(policy));
    });
  }

  it('sin dos apariciones previas iguales, la política elige como siempre', () => {
    const s = foundGame(7);
    s.crossroad = {
      templateId: PROBE.id, posedTick: s.tick, cast: {},
      optionIds: PROBE.options.map((o) => o.id),
    };
    // Primera vez: no hay historial que mirar.
    expect(decide(s, [PROBE], 'first')).toBe('alpha');
    expect(decide(s, [PROBE], 'last')).toBe('gamma');
    // Una sola repetición no basta: hacen falta las dos anteriores.
    s.history.push({ tick: 0, templateId: PROBE.id, optionId: 'alpha', cast: {} });
    expect(decide(s, [PROBE], 'first')).toBe('alpha');
  });

  it('el historial de otra plantilla no cuenta', () => {
    const s = foundGame(7);
    s.crossroad = {
      templateId: PROBE.id, posedTick: s.tick, cast: {},
      optionIds: PROBE.options.map((o) => o.id),
    };
    for (let i = 0; i < 2; i += 1) {
      s.history.push({ tick: i, templateId: 'otra', optionId: 'alpha', cast: {} });
    }
    expect(decide(s, [PROBE], 'first')).toBe('alpha');
  });

  it('con una sola opción, la regla no puede aplicarse y no lo intenta', () => {
    // Que no se pueda variar no es motivo para dejar de contestar la pregunta.
    const single: CrossroadTemplate = {
      ...PROBE,
      id: 'single',
      options: [PROBE.options[0] as CrossroadTemplate['options'][number]],
    };
    const s = foundGame(7);
    s.crossroad = {
      templateId: single.id, posedTick: s.tick, cast: {},
      optionIds: ['alpha'],
    };
    for (let i = 0; i < 2; i += 1) {
      s.history.push({ tick: i, templateId: single.id, optionId: 'alpha', cast: {} });
    }
    expect(decide(s, [single], 'first')).toBe('alpha');
    expect(decide(s, [single], 'worst')).toBe('alpha');
  });

  it('`random` se queda fuera: no degenera, y vetarle una opción la haría menos aleatoria', () => {
    const s = foundGame(7);
    s.crossroad = {
      templateId: PROBE.id, posedTick: s.tick, cast: {},
      optionIds: PROBE.options.map((o) => o.id),
    };
    for (let i = 0; i < 2; i += 1) {
      s.history.push({ tick: i, templateId: PROBE.id, optionId: 'alpha', cast: {} });
    }
    // Con el flujo en este punto la tirada da 'alpha', y la regla no la veta.
    const rng = { ...s.rng };
    const chosen = decide(s, [PROBE], 'random');
    expect(PROBE.options.map((o) => o.id)).toContain(chosen);
    // Y sigue consumiendo exactamente una tirada del flujo 'crossroads'.
    const after = { ...s.rng };
    expect(after.crossroads).not.toBe(rng.crossroads);
    expect({ ...after, crossroads: rng.crossroads }).toEqual(rng);
  });

  it('en una partida real ninguna política repite tres veces seguidas', () => {
    for (const policy of ['first', 'last', 'worst', 'prudent'] as const) {
      const s = foundGame(11);
      run(s, 200 * YEAR, policy, CATALOG);
      const byTemplate = new Map<string, string[]>();
      for (const d of s.history) {
        const taken = byTemplate.get(d.templateId) ?? [];
        taken.push(d.optionId);
        byTemplate.set(d.templateId, taken);
      }
      for (const [templateId, taken] of byTemplate) {
        for (let i = 2; i < taken.length; i += 1) {
          const three = [taken[i - 2], taken[i - 1], taken[i]];
          // Salvo que la plantilla no tenga con qué variar.
          const template = CATALOG.find((t) => t.id === templateId);
          if ((template?.options.length ?? 1) < 2) continue;
          expect(new Set(three).size, `${policy}/${templateId} en ${i}`).toBeGreaterThan(1);
        }
      }
    }
  });
});
