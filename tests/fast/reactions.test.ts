// M-36 · design.md §11.9 — que la aldea se entere de lo que le pasa.
//
// Ardía una casa y la gente seguía camino del campo. Se moría alguien y nadie
// levantaba la cabeza. Esto comprueba que ya no.
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { crowdPositions } from '@render/crowd';
import { reactionsAt } from '@render/reactions';
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
  const copy = structuredClone(base);
  if (copy.tick % 4 === 0) copy.tick += 1; // que no sea el domingo
  return copy;
}

const spread = (figures: { x: number; y: number }[]): number => {
  if (figures.length === 0) return 0;
  const cx = figures.reduce((n, f) => n + f.x, 0) / figures.length;
  const cy = figures.reduce((n, f) => n + f.y, 0) / figures.length;
  return figures.reduce((n, f) => n + Math.hypot(f.x - cx, f.y - cy), 0) / figures.length;
};

describe('una semana cualquiera · §11.9', () => {
  it('sin sucesos no hay nada a lo que acudir', () => {
    const state = village(20);
    expect(reactionsAt(state)).toEqual([]);
  });
});

describe('cuando se pierde algo · §11.9', () => {
  it('un edificio perdido esta semana convoca a la gente', () => {
    const state = village(20);
    const house = state.buildings.find((b) => b.kind === 'house' && b.lostTick === null)!;
    house.lostTick = state.tick;

    const reactions = reactionsAt(state);
    expect(reactions.length).toBe(1);
    expect(reactions[0]!.cause).toBe('loss');
    expect(reactions[0]!.x).toBeCloseTo(house.x + house.w * 0.5);
  });

  it('lo perdido hace años ya no convoca a nadie', () => {
    const state = village(20);
    const house = state.buildings.find((b) => b.kind === 'house' && b.lostTick === null)!;
    house.lostTick = state.tick - 200;
    expect(reactionsAt(state)).toEqual([]);
  });

  it('y se nota: la aldea deja el campo y se junta allí', () => {
    // Lo único que de verdad importa. Si las dos fotos fueran iguales, la
    // aldea seguiría sin enterarse.
    const quiet = village(20);
    const before = crowdPositions(quiet, 0.35);

    const burnt = village(20);
    const house = burnt.buildings.find((b) => b.kind === 'house' && b.lostTick === null)!;
    house.lostTick = burnt.tick;
    const after = crowdPositions(burnt, 0.35);

    expect(before.length).toBeGreaterThan(0);
    expect(after).not.toEqual(before);
    expect(spread(after), 'acuden, así que se juntan').toBeLessThan(spread(before));
  });
});

describe('cuando se muere alguien · §11.9', () => {
  it('la muerte de un nombrado lleva a la gente al cementerio', () => {
    const state = village(20);
    const yard = state.buildings.find((b) => b.kind === 'grave_yard' && b.lostTick === null);
    const someone = state.people.villagers.find((v) => v.named && v.diedTick === null)!;
    someone.diedTick = state.tick;

    const reactions = reactionsAt(state);
    expect(reactions.length).toBe(1);
    expect(reactions[0]!.cause).toBe('death');
    if (yard !== undefined) expect(reactions[0]!.x).toBeCloseTo(yard.x + yard.w * 0.5);
  });

  it('la muerte de un anónimo no para la aldea', () => {
    // §6.1: sólo los nombrados tienen entierro con gente. Si cada muerte
    // anónima parase el valle, no se trabajaría nunca.
    const state = village(20);
    const anon = state.people.villagers.find((v) => !v.named && v.diedTick === null)!;
    anon.diedTick = state.tick;
    expect(reactionsAt(state)).toEqual([]);
  });
});

describe('el orden de la urgencia · §11.9', () => {
  it('lo que arde manda sobre lo que el jugador decidió', () => {
    // Se comparan dos valles idénticos salvo por la pérdida, los dos con la
    // misma decisión encima. Si la reacción no mandara, las dos fotos serían
    // la misma — y comprobar sólo que la gente está «cerca de la casa» no
    // valdría, porque la plaza también está cerca de la casa. Lo destapó una
    // mutación.
    const called = (loss: boolean): GameState => {
      const state = village(20);
      for (const t of CATALOG) {
        const o = t.options.find((x) => x.visible.some((v) => v.k === 'gather'));
        if (o !== undefined) {
          state.history.push({ tick: state.tick, templateId: t.id, optionId: o.id, cast: {} });
          break;
        }
      }
      if (loss) {
        const house = state.buildings.find((b) => b.kind === 'house' && b.lostTick === null)!;
        house.lostTick = state.tick;
      }
      return state;
    };

    const onlyDecision = crowdPositions(called(false), 0.35);
    const alsoBurnt = crowdPositions(called(true), 0.35);
    expect(onlyDecision.length).toBeGreaterThan(0);
    expect(alsoBurnt).not.toEqual(onlyDecision);

    // Y la gente está donde ardió, no donde se convocó.
    const burnt = called(true);
    const house = burnt.buildings.find((b) => b.lostTick === burnt.tick)!;
    const figures = crowdPositions(burnt, 0.35);
    const cx = figures.reduce((n, f) => n + f.x, 0) / figures.length;
    const cy = figures.reduce((n, f) => n + f.y, 0) / figures.length;
    expect(Math.hypot(cx - (house.x + house.w * 0.5), cy - (house.y + house.h * 0.5)))
      .toBeLessThan(6);
  });
});

describe('sigue siendo derivado · §4.3, §10.6', () => {
  it('no escribe en el estado ni gasta una tirada', () => {
    const state = village(20);
    const house = state.buildings.find((b) => b.kind === 'house' && b.lostTick === null)!;
    house.lostTick = state.tick;
    const marks = fingerprint(state);
    const rng = { ...state.rng };
    reactionsAt(state);
    for (const f of [0.1, 0.35, 0.6]) crowdPositions(state, f);
    expect(fingerprint(state)).toBe(marks);
    expect(state.rng).toEqual(rng);
  });
});
