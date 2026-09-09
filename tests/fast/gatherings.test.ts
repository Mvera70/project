// M-32 · design.md §11.8 — que una decisión se vea en el valle.
//
// Lo que se protege: que tras decidir algo con `gather` la gente esté de
// verdad en otro sitio, que la reunión se acabe cuando dice el catálogo, y que
// todo esto siga siendo derivado — ni un byte de estado, ni una tirada.
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { crowdPositions } from '@render/crowd';
import { gatheringsAt } from '@render/gatherings';
import { fingerprint } from '../helpers/fingerprint';
import type { GameState } from '@engine/state';

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

/** Una plantilla real del catálogo con un `gather` en alguna opción. */
function anyGather(): { templateId: string; optionId: string; days: number } {
  for (const t of CATALOG) {
    for (const o of t.options) {
      const g = o.visible.find((v) => v.k === 'gather');
      if (g !== undefined && g.k === 'gather') {
        return { templateId: t.id, optionId: o.id, days: g.days };
      }
    }
  }
  throw new Error('el catálogo no tiene ni un gather');
}

/** Anota una decisión en el historial, como si el jugador la hubiera tomado. */
function decide(state: GameState, at = state.tick): void {
  const { templateId, optionId } = anyGather();
  state.history.push({ tick: at, templateId, optionId, cast: {} });
}

describe('una decisión convoca a la aldea · §11.8', () => {
  it('sin decisiones no hay ninguna reunión', () => {
    const state = village(20);
    state.history = [];
    expect(gatheringsAt(state, CATALOG)).toEqual([]);
  });

  it('decidir algo con gather convoca una reunión', () => {
    const state = village(20);
    state.history = [];
    decide(state);
    expect(gatheringsAt(state, CATALOG).length).toBe(1);
  });

  it('la reunión se acaba cuando el catálogo dice', () => {
    const state = village(20);
    state.history = [];
    const { days } = anyGather();
    decide(state);

    state.tick += days - 1;
    expect(gatheringsAt(state, CATALOG).length, 'el último día todavía cuenta').toBe(1);

    state.tick += 1;
    expect(gatheringsAt(state, CATALOG).length, 'y al siguiente ya no').toBe(0);
  });

  it('una decisión del futuro no convoca nada', () => {
    const state = village(20);
    state.history = [];
    decide(state, state.tick + 10);
    expect(gatheringsAt(state, CATALOG)).toEqual([]);
  });

  it('la reunión cae dentro del mapa', () => {
    const state = village(20);
    state.history = [];
    decide(state);
    for (const g of gatheringsAt(state, CATALOG)) {
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.y).toBeGreaterThanOrEqual(0);
      expect(g.x).toBeLessThan(state.map.width);
      expect(g.y).toBeLessThan(state.map.height);
    }
  });
});

describe('y se nota en la gente · §11.8', () => {
  it('con reunión, la aldea está en otro sitio que sin ella', () => {
    // Lo único que de verdad importa de este módulo: que la decisión mueva
    // gente. Si las dos fotos fueran iguales, el efecto seguiría sin verse.
    // Un día de trabajo, no un domingo. Una mutación destapó que el estado de
    // partida cae en un tick múltiplo de cuatro — domingo — y entonces esta
    // prueba compara «domingo» contra «reunión» en vez de «trabajo» contra
    // «reunión», y pasaba aunque la reunión no moviera a nadie.
    const quiet = village(20);
    quiet.history = [];
    quiet.tick += quiet.tick % 4 === 0 ? 1 : 0;
    const before = crowdPositions(quiet, 0.4);

    const called = village(20);
    called.history = [];
    called.tick = quiet.tick;
    decide(called);
    const after = crowdPositions(called, 0.4);

    expect(before.length).toBeGreaterThan(0);
    expect(after.length).toBeGreaterThan(0);
    expect(after).not.toEqual(before);
  });

  it('la gente se junta: acaba más apretada que un día de trabajo', () => {
    const spread = (figures: { x: number; y: number }[]): number => {
      const cx = figures.reduce((n, f) => n + f.x, 0) / figures.length;
      const cy = figures.reduce((n, f) => n + f.y, 0) / figures.length;
      return figures.reduce((n, f) => n + Math.hypot(f.x - cx, f.y - cy), 0) / figures.length;
    };

    const quiet = village(20);
    quiet.history = [];
    // Una semana de trabajo, no un domingo, que ya junta a la gente de por sí.
    quiet.tick += quiet.tick % 4 === 0 ? 1 : 0;

    const called = village(20);
    called.history = [];
    called.tick = quiet.tick;
    decide(called);

    // A mitad de jornada, con todo el mundo ya en su destino.
    expect(spread(crowdPositions(called, 0.4))).toBeLessThan(spread(crowdPositions(quiet, 0.4)));
  });

  it('de noche no hay reunión que valga: todos en casa', () => {
    const state = village(20);
    state.history = [];
    decide(state);
    expect(crowdPositions(state, 0.9)).toEqual([]);
  });
});

describe('sigue siendo derivado · §10.6, §4.3', () => {
  it('no escribe una sola vez en el estado', () => {
    const state = village(20);
    state.history = [];
    decide(state);
    const before = fingerprint(state);
    for (const f of [0, 0.2, 0.45, 0.7]) crowdPositions(state, f);
    gatheringsAt(state, CATALOG);
    expect(fingerprint(state)).toBe(before);
  });

  it('no consume una sola tirada de azar', () => {
    const state = village(20);
    state.history = [];
    decide(state);
    const before = { ...state.rng };
    crowdPositions(state, 0.4);
    gatheringsAt(state, CATALOG);
    expect(state.rng).toEqual(before);
  });

  it('el mismo instante da la misma foto', () => {
    // §11.4: nada corre sobre el reloj del navegador, así que preguntar dos
    // veces por el mismo tick y la misma fracción da exactamente lo mismo.
    const a = village(20);
    a.history = [];
    decide(a);
    const b = structuredClone(a);
    expect(crowdPositions(a, 0.4)).toEqual(crowdPositions(b, 0.4));
  });
});
