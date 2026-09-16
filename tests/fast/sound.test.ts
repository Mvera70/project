// U-09 · design.md §11.1, §11.4, §11.6.
//
// Lo que estas pruebas guardan es la parte pura de `src/ui/sound.ts`: qué
// ambiente corresponde a un estado dado, qué acento dispara un tick, y el
// fusible de reloj de pared que evita que una tanda de ticks en el mismo
// fotograma apile un acento sobre otro (§11.4). Igual que `notice.test.ts`
// prueba `noticeworthy` sin arrancar nada, esto prueba `ambientFor`,
// `accentFor` y `accentAllowed` sin un `AudioContext` de por medio.

import { foundTwenty, villageWhere } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { SOUND } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { tick } from '@engine/sim';
import { count, standing } from '@engine/subsistence/building-counts';
import { seasonOf } from '@engine/time';
import { milestonesAt } from '@ui/milestones';
import { accentAllowed, accentFor, ambientFor } from '@ui/sound';

const SEEDS = [7, 42, 108, 999, 2024];

describe('ambientFor · el viento sigue la estación', () => {
  it('la ganancia del viento es la de SOUND.WIND_BY_SEASON en cada estación', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      // Las cuatro estaciones caben en el primer año: 0, 12, 24, 36 semanas.
      for (const week of [0, 12, 24, 36]) {
        state.tick = week;
        const mix = ambientFor(state);
        expect(mix.wind).toBe(SOUND.WIND_BY_SEASON[seasonOf(week)]);
      }
    }
  });
});

describe('ambientFor · el río está, casi siempre', () => {
  it('un valle recién fundado ya tiene agua que sonar', () => {
    for (const seed of SEEDS) {
      expect(ambientFor(foundTwenty(seed)).river).toBe(true);
    }
  });
});

// Una sola partida jugada una vez y compartida entre las dos pruebas de abajo
// — el mismo motivo que `ui-milestones.test.ts` da para su propio `GAMES`:
// `ambientFor` es de sólo lectura, así que jugarla dos veces no cuenta nada
// que jugarla una sola no cuente ya, y ochenta años es lo que hace falta para
// que el motor levante una fragua de verdad (`BUILDING_RULES.SMITHY_PEOPLE`).
// **Y la semilla se elige por tener fragua, no por su número** (R-1 §2.6): el
// rayo quema la fragua de la semilla 7 antes de los ochenta años, y esta
// prueba medía justamente esa fragua. `villageWhere` busca un valle que la
// tenga en pie; si ninguno la tiene, la prueba de abajo falla diciéndolo.
const MATURE_VILLAGE = villageWhere(80, (s) => standing(s, 'smithy').length > 0)
  ?? foundTwenty(7);

describe('ambientFor · la fragua y la campana siguen al edificio, no a un contador', () => {
  it('coincide con lo que el propio motor tiene en pie', () => {
    const mix = ambientFor(MATURE_VILLAGE);
    expect(mix.forge).toBe(standing(MATURE_VILLAGE, 'smithy').some((b) => b.lit));
    expect(mix.bell).toBe(count(MATURE_VILLAGE, 'chapel') > 0 || count(MATURE_VILLAGE, 'church') > 0);
  });

  it('una fragua apagada no suena, aunque siga en pie', () => {
    const state = structuredClone(MATURE_VILLAGE);
    // Sólo dice algo si de verdad hay una fragua en pie que apagar.
    expect(standing(state, 'smithy').length).toBeGreaterThan(0);
    for (const smithy of standing(state, 'smithy')) smithy.lit = false;
    expect(ambientFor(state).forge).toBe(false);
  });
});

describe('accentFor · sólo dos motivos, y el hito gana', () => {
  it('sin hito y sin encrucijada, no suena nada', () => {
    expect(accentFor(null, false, false)).toBeNull();
  });

  it('una encrucijada recién planteada dispara el acento de encrucijada', () => {
    expect(accentFor('some_template', false, false)).toBe('crossroad');
  });

  it('un hito dispara el acento de hito', () => {
    expect(accentFor(null, true, false)).toBe('milestone');
  });

  it('si coinciden los dos en el mismo tick, gana el hito — «una voz cada vez», como la cartela sobre el aviso', () => {
    expect(accentFor('some_template', true, false)).toBe('milestone');
  });

  it('durante un letargo no se dispara ningún acento, aunque haya hito y encrucijada', () => {
    expect(accentFor('some_template', true, true)).toBeNull();
    expect(accentFor('some_template', false, true)).toBeNull();
    expect(accentFor(null, true, true)).toBeNull();
  });
});

describe('accentAllowed · el fusible de reloj de pared (§11.4)', () => {
  it('el primer acento siempre pasa', () => {
    expect(accentAllowed(1_000, null)).toBe(true);
  });

  it('no dos acentos más cerca que SOUND.ACCENT_MIN_GAP_MS', () => {
    expect(accentAllowed(1_000, 1_000)).toBe(false);
    expect(accentAllowed(1_000 + SOUND.ACCENT_MIN_GAP_MS - 1, 1_000)).toBe(false);
    expect(accentAllowed(1_000 + SOUND.ACCENT_MIN_GAP_MS, 1_000)).toBe(true);
  });

  it('un salto de sesenta y cuatro ticks no encola sesenta y cuatro sonidos', () => {
    // Lo que de verdad pasa con un salto de velocidad o un lote del letargo
    // (§11.4): varios ticks corren en el mismo instante de reloj de pared
    // porque ninguno de ellos tarda nada en ejecutarse — `nowMs` no avanza
    // entre uno y el siguiente. Sesenta y cuatro disparos con el mismo
    // instante sólo pueden dejar pasar el primero.
    const nowMs = 5_000;
    let lastPlayedMs: number | null = null;
    let played = 0;
    for (let i = 0; i < 64; i += 1) {
      if (accentAllowed(nowMs, lastPlayedMs)) {
        played += 1;
        lastPlayedMs = nowMs;
      }
    }
    expect(played).toBe(1);
  });

  it('pero sí deja pasar el siguiente una vez que el reloj de pared avanza de verdad', () => {
    let lastPlayedMs: number | null = null;
    let played = 0;
    for (const nowMs of [0, SOUND.ACCENT_MIN_GAP_MS, 2 * SOUND.ACCENT_MIN_GAP_MS]) {
      if (accentAllowed(nowMs, lastPlayedMs)) { played += 1; lastPlayedMs = nowMs; }
    }
    expect(played).toBe(3);
  });
});

describe('el acento, en una partida real: raro, no un teletipo', () => {
  it('un puñado de acentos en sesenta años, no uno por tick', () => {
    // El mismo tipo de propiedad que `notice.test.ts` guarda para el aviso:
    // si esto se disparase en cada tick, «ha pasado algo» dejaría de
    // significar nada (§11.6, y el propio brief de U-09: "raro").
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      let ticks = 0;
      let lastMilestoneTick = state.tick;
      let accents = 0;
      const totalTicks = 60 * 48;
      while (state.tick < totalTicks && state.ended === null) {
        const report = tick(state, CATALOG);
        ticks += 1;
        const passed = milestonesAt(state, lastMilestoneTick);
        lastMilestoneTick = state.tick;
        const kind = accentFor(report.posed, passed.length > 0, false);
        if (kind !== null) accents += 1;
      }
      expect(accents).toBeGreaterThan(0);
      // CROSSROADS.MIN_TICKS_BETWEEN ya impone un mínimo de 120 semanas entre
      // dos encrucijadas, y los hitos son más raros todavía: sesenta años no
      // deberían dejar ni de lejos un acento cada pocos ticks.
      expect(accents / ticks).toBeLessThan(0.05);
    }
  });
});
