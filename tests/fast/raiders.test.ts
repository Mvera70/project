// D3 · La partida del valle vecino, con cuerpo. §1b, fase 4.
//
// Lo que se guarda es **que se ven y que siempre se van**: un asalto que deja
// doce figuras plantadas para siempre ante el portón es peor que no enseñarlo.
// Lo que NO se mide aquí es ninguna consecuencia, porque no la hay: lo que se
// llevaron lo decidió el motor antes de que empiece la jornada, y esta capa
// sólo lo enseña (E.8).

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { createVillage } from '../../src/render3d/life/village';
import { BAND_SHOWN, raidToday } from '../../src/render3d/life/raiders';
import type { GameState } from '@engine/state';

/** Un valle con una partida llegando hoy, sin esperar veinte años. */
function raided(seed: number, band = 20): GameState {
  const state = foundGame(seed);
  run(state, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = band;
  return state;
}

describe('D3 · la partida se ve llegar', () => {
  it('sólo la semana que el motor dice que llegaron', () => {
    const state = raided(7);
    expect(raidToday(state), 'la semana del asalto').toBeGreaterThan(0);
    state.tick += 1;
    expect(raidToday(state), 'la semana siguiente, nadie').toBe(0);
    state.threat.arrivedTick = null;
    expect(raidToday(state), 'y un valle que nunca ha sido asaltado, nadie').toBe(0);
  });

  it('se enseñan unos cuantos, no los sesenta', () => {
    // El número de verdad sigue en la crónica: esto es cuántos se dibujan.
    const state = raided(11, 60);
    expect(raidToday(state)).toBe(BAND_SHOWN);
    const life = createVillage(state, 0);
    expect(life.raiders.length).toBe(BAND_SHOWN);
  });

  it('entran desde fuera, no aparecen en medio del pueblo', () => {
    // La única propiedad que el sitio de entrada tiene que garantizar: que se
    // les vea venir. Se mide contra la plaza, que es el centro del pueblo.
    const state = raided(23);
    const life = createVillage(state, 0);
    expect(life.raiders.length).toBeGreaterThan(0);
    const heart = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
    for (const raider of life.raiders) {
      const gap = Math.hypot(raider.body.x - heart.x, raider.body.z - heart.z);
      expect(gap, `el saqueador ${raider.body.id} nace fuera`).toBeGreaterThan(8);
    }
  });

  it('llegan, se plantan y se van: la visita siempre acaba', () => {
    // La propiedad de E.7 llevada a esta capa: nunca es una intención que se
    // repite para siempre. Una jornada escénica entera es de sobra.
    const state = raided(41);
    const life = createVillage(state, 0);
    const seen = new Set<string>();
    // **Se van o caen.** Hasta E4 esta semilla los devolvía a todos vivos; desde
    // que el saqueo quema una casa (25 sep 2026) la aldea de la semilla 41 a los
    // veinte años es otra y sus defensores tumban a uno (medido: once se van,
    // uno queda `down` en la puerta). Un muerto no se marcha, y eso es D4, no
    // una visita que no acaba: lo que esta prueba guarda es que nadie se queda
    // con una intención repetida para siempre.
    const over = (phase: string): boolean => phase === 'gone' || phase === 'down';
    for (let n = 0; n < 3600 && life.raiders.some((r) => !over(r.phase)); n += 1) {
      life.step();
      for (const raider of life.raiders) seen.add(raider.phase);
    }
    expect(seen.has('standing'), 'se plantaron ante el portón').toBe(true);
    expect(life.raiders.every((r) => over(r.phase)), 'y se fueron o cayeron todos').toBe(true);
    expect(life.raiders.some((r) => r.phase === 'gone'), 'y alguno volvió a su valle').toBe(true);
  });

  it('y no tocan ni una cifra del motor', () => {
    // El innegociable de esta capa: es efímera y no escribe en el estado. Lo
    // que un asalto se lleva ya está restado antes de que empiece el día.
    const state = raided(47);
    const before = JSON.stringify(state);
    const life = createVillage(state, 0);
    for (let n = 0; n < 1200; n += 1) life.step();
    expect(JSON.stringify(state), 'la jornada no escribió en el motor').toBe(before);
  });
});
