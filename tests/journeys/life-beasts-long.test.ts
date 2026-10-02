// Lo lento de `tests/fast/life-beasts.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 19 s en el trabajo `fast` de CI, y además pagaba ~31 s (en local) al
// recogerse, porque juega sus partidas en el cuerpo del `describe`. Mismo
// cuerpo y mismo umbral; lo barato se queda allí.
//
// IA-4 · Animales con conducta propia. Anexo E, `docs/historico/life-ai-proposal.md`,
// `docs/life-ai-implementation-prompt.md`.
//
// Lo que se guarda aquí son propiedades del diseño, no detalles de
// `beasts.ts`: cada especie hace más de una cosa consigo misma, un animal usa
// más de un sitio en una jornada, `feed`/`pet`/`chase` tienen principio y
// final de verdad —y no se quedan pegados aunque la visita se quede al
// lado—, la vaca busca al rebaño cuando anda sola, y todo ello es
// determinista y no toca el estado del motor.
//
// Los umbrales suman varias semillas y varias jornadas (CLAUDE.md): una sola
// partida diverge desde el primer tick, y con poblaciones pequeñas de cerdo o
// vaca una sola muestra es ruido.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { TIME } from '@engine/balance';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { fingerprint } from '../helpers/fingerprint';
import { STEPS_PER_DAY, seedOfDay } from '../../src/render3d/life/clock';
import { createVillage } from '../../src/render3d/life/village';
import { type BeastKind } from '../../src/render3d/life/beasts';

// Una sola aldea por (años, semilla), igual que `animals.test.ts`: correr
// muchos ticks por prueba es lo que engorda la suite rápida.
const grown = new Map<string, GameState>();
function village(years: number, seed: number): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

const SEEDS = [7, 23];

// **Una sola pasada de simulación para las dos propiedades siguientes**, no
// dos: recorrer `STEPS_PER_DAY` pasos por semilla y jornada es lo que
// engorda la suite rápida (CLAUDE.md, menos de 30 s la suite entera), y las
// dos preguntas —cuántas actividades usa cada especie, cuántos sitios usa
// cada animal— se contestan mirando el mismo recorrido.
function surveySpecies(): { activities: Map<BeastKind, Set<string>>; spotsPerAnimalDay: number[] } {
  const activities = new Map<BeastKind, Set<string>>();
  const spotsPerAnimalDay: number[] = [];
  for (const seed of SEEDS) {
    const state = village(20, seed);
    // Se fuerza la cabaña, igual que `animals.test.ts` («el dibujo enseña
    // exactamente el rebaño que la aldea tiene»): a los veinte años el
    // rebaño que de verdad sale depende de la subsistencia y puede no tener
    // cerdos todavía, y esta prueba mide la conducta de las tres especies,
    // no si a esta semilla concreta le ha tocado cebar uno.
    state.herd = { hens: 6, pigs: 4, cows: 3 };
    for (let day = 0; day < 2; day += 1) {
      const life = createVillage(state, day);
      const spots = new Map<number, Set<string>>();
      for (const beast of life.beasts) spots.set(beast.dweller.body.id, new Set());
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const beast of life.beasts) {
          const { doing, body } = beast.dweller;
          if (doing === null || !doing.there) continue;
          if (doing.place.id.startsWith('pause:') || doing.place.id.endsWith(':gift')) continue;
          spots.get(body.id)?.add(`${Math.round(body.x * 10)}:${Math.round(body.z * 10)}`);
          if (!doing.place.id.endsWith(':self') && doing.place.id !== beast.drink?.id) continue;
          const set = activities.get(beast.kind) ?? new Set<string>();
          set.add(doing.offer.id);
          activities.set(beast.kind, set);
        }
      }
      for (const set of spots.values()) spotsPerAnimalDay.push(set.size);
    }
  }
  return { activities, spotsPerAnimalDay };
}

describe('IA-4 · cada especie hace más de una cosa consigo misma, y usa más de un sitio', () => {
  const { activities, spotsPerAnimalDay } = surveySpecies();

  it('cada especie usa más de una actividad propia a lo largo de la muestra', () => {
    for (const kind of ['hen', 'pig', 'cow'] as const) {
      const seen = activities.get(kind) ?? new Set();
      expect(seen.size, `${kind}: ${[...seen].join(', ')}`).toBeGreaterThan(1);
    }
  });

  it('un animal pisa más de un sitio propio a lo largo de una jornada, de media', () => {
    // Checklist IA-1 punto 2, ampliado: con un único punto por animal (antes
    // de IA-1) la media era exactamente 1. Con varias actividades y varios
    // sitios por actividad (IA-4), tiene que ser mayor — sin fijar cuánto,
    // que es cosa del nivelado posterior (CLAUDE.md, el rework en marcha).
    expect(spotsPerAnimalDay.length).toBeGreaterThan(0);
    const avg = spotsPerAnimalDay.reduce((a, b) => a + b, 0) / spotsPerAnimalDay.length;
    expect(avg, `media de sitios por animal-jornada: ${avg.toFixed(2)}`).toBeGreaterThan(1);
  });
});

describe('IA-4 · presentación, no motor', () => {
  it('recorrer varias jornadas de vida no cambia el estado del motor', () => {
    for (const seed of [3, 23]) {
      const state = village(20, seed);
      const before = fingerprint(state);
      const life = createVillage(state, 0);
      for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step();
      expect(fingerprint(state), `semilla ${seed}`).toBe(before);
    }
  });

  it('el flujo de vida no toca el flujo de azar del motor: la misma jornada da la misma partida', () => {
    // Igual que `seedOfDay` documenta: reconstruir la jornada no puede
    // desplazar el motor. Se comprueba jugando la misma partida una vez sin
    // tocar la capa de vida y otra recorriéndola entera, y viendo que el
    // estado del motor —lo único que persiste al día siguiente— es idéntico.
    const untouched = village(20, 7);
    const withLife = village(20, 7);
    const life = createVillage(withLife, 0);
    for (let n = 0; n < STEPS_PER_DAY; n += 1) life.step();
    expect(fingerprint(withLife)).toBe(fingerprint(untouched));
    // Y la propia semilla del día es una función pura de la del motor.
    expect(seedOfDay(untouched.seed, 0)).toBe(seedOfDay(withLife.seed, 0));
  });
});
