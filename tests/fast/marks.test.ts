// M-33 · design.md §11.8 — el estandarte y el apagón.
//
// Lo que se protege: que un estandarte ondee los años que dice el catálogo y
// ni uno más, que apagar un edificio le quite de verdad el humo y la luz, que
// `who` apague la casa de esa persona y no otra, y que nada de esto escriba
// en el estado ni gaste una tirada.
import { describe, expect, it } from 'vitest';
import { MARKS, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { bannersAt, dousedAt } from '@render/marks';
import { tellsFor } from '@render/layers/tells';
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

/**
 * Una opción del catálogo que declara este efecto visible.
 *
 * `banner` pide además que dure un número concreto de años, porque el primero
 * del catálogo lleva `years: 0` — que es «para siempre» (§3.1) — y una prueba
 * de caducidad sobre él no mediría nada.
 *
 * `douse` pide que sea sobre una casa: el primero del catálogo apaga una
 * fragua, y `tellsFor` no dibuja humo ni luz en las fraguas, así que apagarla
 * no cambiaría la imagen y la prueba pasaría por la razón equivocada.
 */
function optionWith(
  kind: 'banner' | 'douse',
  want: 'any' | 'lasting' | 'house' = 'any',
): { templateId: string; optionId: string } {
  for (const t of CATALOG) {
    for (const o of t.options) {
      const effect = o.visible.find((v) => v.k === kind);
      if (effect === undefined) continue;
      if (want === 'lasting' && effect.k === 'banner' && effect.years === 0) continue;
      if (want === 'house' && effect.k === 'douse' && effect.kind !== 'house') continue;
      return { templateId: t.id, optionId: o.id };
    }
  }
  throw new Error(`el catálogo no tiene ningún ${kind} de tipo ${want}`);
}

function record(
  state: GameState,
  kind: 'banner' | 'douse',
  want: 'any' | 'lasting' | 'house' = 'any',
  cast = {},
): void {
  const { templateId, optionId } = optionWith(kind, want);
  state.history.push({ tick: state.tick, templateId, optionId, cast });
}

/** Los años que ondea el primer estandarte del catálogo. */
function bannerYears(): number {
  const { templateId, optionId } = optionWith('banner', 'lasting');
  const option = CATALOG.find((t) => t.id === templateId)!.options.find((o) => o.id === optionId)!;
  const effect = option.visible.find((v) => v.k === 'banner')!;
  return effect.k === 'banner' ? effect.years : 0;
}

describe('el estandarte · §11.8', () => {
  it('sin decisiones no ondea ninguno', () => {
    const state = village(20);
    state.history = [];
    expect(bannersAt(state, CATALOG)).toEqual([]);
  });

  it('una decisión lo iza', () => {
    const state = village(20);
    state.history = [];
    record(state, 'banner');
    expect(bannersAt(state, CATALOG).length).toBe(1);
  });

  it('ondea los años que dice el catálogo, y ni uno más', () => {
    const state = village(20);
    state.history = [];
    const years = bannerYears();
    record(state, 'banner', 'lasting');

    state.tick += years * TIME.WEEKS_PER_YEAR - 1;
    expect(bannersAt(state, CATALOG).length, 'la última semana sigue izado').toBe(1);

    state.tick += 1;
    expect(bannersAt(state, CATALOG).length, 'y a la siguiente se arría').toBe(0);
  });

  it('con cero años ondea para siempre, que es lo que dice §3.1', () => {
    // El estandarte de arrodillarse ante el señor lleva `years: 0`. Leerlo
    // como «dura cero» lo dejaba muerto, y era justo el que más significa.
    const state = village(20);
    state.history = [];
    const { templateId, optionId } = (() => {
      for (const t of CATALOG) {
        for (const o of t.options) {
          const e = o.visible.find((v) => v.k === 'banner');
          if (e !== undefined && e.k === 'banner' && e.years === 0) {
            return { templateId: t.id, optionId: o.id };
          }
        }
      }
      throw new Error('el catálogo ya no tiene un banner permanente');
    })();
    state.history.push({ tick: state.tick, templateId, optionId, cast: {} });

    expect(bannersAt(state, CATALOG).length).toBe(1);
    state.tick += 200 * TIME.WEEKS_PER_YEAR;
    expect(bannersAt(state, CATALOG).length, 'dos siglos después sigue izado').toBe(1);
  });

  it('lleva el color que pidió la plantilla', () => {
    const state = village(20);
    state.history = [];
    record(state, 'banner');
    expect(bannersAt(state, CATALOG)[0]!.colour).toBeTruthy();
  });

  it('llega hasta el dibujo, no se queda en la lista', () => {
    const state = village(20);
    state.history = [];
    const before = tellsFor(state).filter((t) => t.kind === 'banner').length;
    record(state, 'banner');
    expect(tellsFor(state).filter((t) => t.kind === 'banner').length).toBe(before + 1);
  });
});

describe('el apagón · §11.8', () => {
  it('sin decisiones no hay nada apagado', () => {
    const state = village(20);
    state.history = [];
    expect(dousedAt(state, CATALOG).size).toBe(0);
  });

  it('una decisión apaga un edificio', () => {
    const state = village(20);
    state.history = [];
    record(state, 'douse');
    expect(dousedAt(state, CATALOG).size).toBeGreaterThan(0);
  });

  it('se vuelve a encender pasado su plazo', () => {
    const state = village(20);
    state.history = [];
    record(state, 'douse');

    state.tick += MARKS.DOUSE_TICKS - 1;
    expect(dousedAt(state, CATALOG).size, 'la última semana sigue a oscuras').toBeGreaterThan(0);

    state.tick += 1;
    expect(dousedAt(state, CATALOG).size, 'y a la siguiente ya no').toBe(0);
  });

  it('apagar le quita el humo y la luz a ese edificio', () => {
    // Lo único que de verdad importa: que el apagón se note en la imagen.
    const state = village(20);
    state.history = [];
    const before = tellsFor(state).length;
    record(state, 'douse', 'house');
    expect(tellsFor(state).length).toBeLessThan(before);
  });

  it('con `who`, apaga la casa de esa persona', () => {
    const state = village(20);
    state.history = [];
    // Una plantilla cuyo douse nombra a alguien del reparto.
    let found: { templateId: string; optionId: string; letter: string } | null = null;
    for (const t of CATALOG) {
      for (const o of t.options) {
        const d = o.visible.find((v) => v.k === 'douse' && v.who !== undefined);
        if (d !== undefined && d.k === 'douse' && d.who !== undefined) {
          found = { templateId: t.id, optionId: o.id, letter: d.who };
        }
      }
    }
    expect(found, 'el catálogo debe tener un douse con who').not.toBeNull();

    // Alguien cuya casa NO sea la primera en pie: si lo fuera, el respaldo
    // («la primera de ese tipo») daría la misma casa y la prueba pasaría sin
    // que `who` se resolviera. Lo destapó una mutación.
    const firstHouse = state.buildings
      .filter((b) => b.kind === 'house' && b.lostTick === null)[0];
    const person = state.people.villagers.find(
      (v) => v.named && v.homeId !== null && v.homeId !== firstHouse?.id,
    )!;
    expect(person, 'hace falta alguien que no viva en la primera casa').toBeDefined();
    expect(person.homeId).not.toBe(firstHouse?.id);
    state.history.push({
      tick: state.tick,
      templateId: found!.templateId,
      optionId: found!.optionId,
      cast: { [found!.letter]: person.id },
    });
    expect(dousedAt(state, CATALOG).has(person.homeId!)).toBe(true);
  });

  it('una decisión del futuro no apaga nada', () => {
    const state = village(20);
    state.history = [];
    const { templateId, optionId } = optionWith('douse');
    state.history.push({ tick: state.tick + 5, templateId, optionId, cast: {} });
    expect(dousedAt(state, CATALOG).size).toBe(0);
  });
});

describe('sigue siendo derivado · §10.6, §4.3', () => {
  it('no escribe una sola vez en el estado', () => {
    const state = village(20);
    state.history = [];
    record(state, 'banner');
    record(state, 'douse');
    const before = fingerprint(state);
    bannersAt(state, CATALOG);
    dousedAt(state, CATALOG);
    tellsFor(state);
    expect(fingerprint(state)).toBe(before);
  });

  it('no consume una sola tirada de azar', () => {
    const state = village(20);
    state.history = [];
    record(state, 'banner');
    record(state, 'douse');
    const before = { ...state.rng };
    tellsFor(state);
    expect(state.rng).toEqual(before);
  });
});
