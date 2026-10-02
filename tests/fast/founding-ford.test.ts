// Lo lento de este fichero vive en `tests/journeys/founding-ford-long.test.ts` (v5.56).
//
// RD-1 (Vera, 30 sep 2026) · La primera elección del valle: el forastero del vado.
//
// A ×1 —la velocidad normal desde ese día— el primer tick llega en el minuto
// 14, y la primera encrucijada del sorteo, en la semana 15 (3,5 h). Vera
// eligió que la primera elección sea «Uno en el vado» desde la fundación: el
// forastero baja andando hasta el vado hacia el minuto 4–6 y espera con una
// señal encima. Aquí, lo que el motor y la capa de vida prometen de eso.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { tick } from '@engine/sim';
import { foundGame } from '@engine/found';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { visitsToday } from '../../src/render3d/life/visitors';

const SEEDS = [1, 2, 3, 5, 7, 11, 13, 23];
const DAYS = TIME.DAYS_PER_WEEK;

describe('RD-1 · la pregunta con la que se funda el valle', () => {
  it('queda planteada desde el tick 0 en toda fundación de caserío, y nunca en una de veinte', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      expect(state.crossroad?.templateId, `semilla ${seed}`).toBe('one_at_the_ford');
      expect(state.crossroad?.posedTick).toBe(0);
      // Con su línea en la crónica, como cualquier pregunta planteada.
      expect(state.chronicle.some((entry) => entry.kind === 'crossroad_posed' && entry.tick === 0)).toBe(true);
    }
    expect(foundTwenty(7).crossroad).toBeNull();
  });
});

describe('RD-5 · lo que se contestó en el vado vuelve en la primera hora', () => {
  // A ×1 una semana son catorce minutos: la consecuencia corta llega dos o tres
  // semanas después de contestar, entre el minuto 28 y el 56 si se contesta en
  // la primera semana (§3 del plan de ritmo: «una consecuencia de una elección
  // anterior regresa» en los primeros sesenta minutos).
  const ECHO: Record<string, string> = {
    take_him_in: 'consequence.he_knew_the_axe',
    feed_him_and_send_him_on: 'consequence.he_came_back_with_fish',
    turn_him_away: 'consequence.tracks_from_the_ford',
  };
  it('cada respuesta trae la suya, a las dos o tres semanas, y en la crónica', () => {
    for (const seed of SEEDS) {
      for (const [optionId, key] of Object.entries(ECHO)) {
        const state = foundGame(seed);
        tick(state, CATALOG, { templateId: 'one_at_the_ford', optionId });
        const answered = state.history[0]!.tick;
        for (let n = 0; n < 4; n += 1) tick(state, CATALOG);
        const echo = state.chronicle.find((entry) => entry.templateKey === key);
        expect(echo, `semilla ${seed}, ${optionId}`).toBeDefined();
        expect(echo!.tick - answered, `semilla ${seed}, ${optionId}`).toBeGreaterThanOrEqual(2);
        expect(echo!.tick - answered, `semilla ${seed}, ${optionId}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('no tira del azar de las encrucijadas: el retraso sale de un hash', () => {
    const a = foundGame(7);
    const b = foundGame(7);
    tick(a, CATALOG, { templateId: 'one_at_the_ford', optionId: 'feed_him_and_send_him_on' });
    tick(b, CATALOG, { templateId: 'one_at_the_ford', optionId: 'turn_him_away' });
    expect(a.rng).toEqual(b.rng);
  });
});

describe('RD-1 · el forastero baja al vado y espera', () => {
  it('no está los dos primeros días; el tercero llega; después espera en su sitio', () => {
    const state = foundGame(7);
    expect(visitsToday(state, 0, DAYS).some((v) => v.ford !== undefined)).toBe(false);
    expect(visitsToday(state, 1, DAYS).some((v) => v.ford !== undefined)).toBe(false);
    expect(visitsToday(state, 2, DAYS).find((v) => v.ford !== undefined)?.ford).toBe('arriving');
    expect(visitsToday(state, 3, DAYS).find((v) => v.ford !== undefined)?.ford).toBe('waiting');
    // Contestado —y el motor aún sin apuntarlo—: acogido espera en la plaza, despedido ya no está.
    expect(visitsToday(state, 3, DAYS, 'in').find((v) => v.ford !== undefined)?.ford).toBe('in');
    expect(visitsToday(state, 3, DAYS, 'out').some((v) => v.ford !== undefined)).toBe(false);
  });

  it('contestado, se va por donde vino o sube a la plaza', () => {
    const state = foundGame(7);
    for (const answer of ['out', 'in'] as const) {
      const life = createVillage(state, 3);
      const stranger = life.visitors.find((v) => v.scene === 'ford')!;
      expect(stranger.phase).toBe('staying');
      life.answerFord(answer);
      for (let n = 0; n < STEPS_PER_DAY / 2; n += 1) life.step(0.3 + (n / STEPS_PER_DAY) * 0.5);
      if (answer === 'out') expect(stranger.phase).toBe('gone');
      else {
        const plaza = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
        expect(Math.hypot(stranger.body.x - plaza.x, stranger.body.z - plaza.z)).toBeLessThan(3);
      }
    }
  });
});
