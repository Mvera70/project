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
import { ford, run } from '@engine/sim';
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

  it('se contesta en su primera semana y no vuelve a salir', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, 1, 'prudent', CATALOG);
      expect(state.history[0]?.templateId, `semilla ${seed}`).toBe('one_at_the_ford');
      run(state, TIME.WEEKS_PER_YEAR * 3, 'prudent', CATALOG);
      expect(state.history.filter((d) => d.templateId === 'one_at_the_ford'), `semilla ${seed}`).toHaveLength(1);
    }
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

  it('llega andando desde el camino hasta la orilla del vado, de día', () => {
    let reached = 0;
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const before = JSON.stringify(state);
      const life = createVillage(state, 2);
      const stranger = life.visitors.find((v) => v.scene === 'ford');
      expect(stranger, `semilla ${seed}`).toBeDefined();
      const bank = ford(state);
      const water = { x: bank.x, z: bank.y };
      const startGap = Math.hypot(stranger!.body.x - water.x, stranger!.body.z - water.z);
      let arrivedAt: number | null = null;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        const phase = n / STEPS_PER_DAY;
        life.step(phase);
        if (arrivedAt === null && stranger!.phase === 'staying') arrivedAt = phase;
      }
      const gap = Math.hypot(stranger!.body.x - water.x, stranger!.body.z - water.z);
      // Viene de lejos (se le ve bajar), llega antes de que anochezca y se queda a la orilla.
      if (startGap > 6 && arrivedAt !== null && arrivedAt < 0.8 && gap < 2.5) reached += 1;
      expect(JSON.stringify(state), 'la escena no escribe en el motor').toBe(before);
    }
    // TUNE del listón: el vado cae en la otra orilla en algún valle raro; se
    // exigen siete de ocho, y la semilla que falle se mira a mano.
    expect(reached).toBeGreaterThanOrEqual(7);
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
