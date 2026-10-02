// AR-2 · La mina, vista: el minero entra por la boca, desaparece dentro y
// vuelve a salir, y la vagoneta sale llena, vuelca y vuelve a entrar vacía.
// Vera: «que se viesen entrar, desaparecer y salir; carruajes con el mineral:
// que lleguen llenos, se descarguen y salgan vacíos para adentro».
import { describe, expect, it } from 'vitest';
import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { run } from '../../src/engine/sim';
import type { GameState } from '../../src/engine/state';
import { allocateLabour } from '../../src/engine/subsistence/labour';
import { ironAge } from '../../src/engine/world/mine';
import { castOf } from '../../src/render3d/life/cast';
import { swallowed } from '../../src/render3d/life/mine';
import { createVillage } from '../../src/render3d/life/village';

/** Un valle con la mina abierta y mineros esta semana, buscado entre candidatas. */
function minedValley(): GameState | null {
  for (const seed of [7, 11, 23, 41]) {
    const state = foundGame(seed);
    while (!ironAge(state) && state.tick < 20 * TIME.WEEKS_PER_YEAR && state.ended === null) run(state, 1, 'prudent', CATALOG);
    for (let n = 0; n < TIME.WEEKS_PER_YEAR && state.ended === null; n += 1) {
      run(state, 1, 'prudent', CATALOG);
      if (allocateLabour(state).miners >= 1) return state;
    }
  }
  return null;
}

describe('AR-2 · la mina en la vida', () => {
  const state = minedValley();

  it('hay un valle con mina y mineros entre las candidatas', () => {
    expect(state).not.toBeNull();
  });

  it('el minero entra, desaparece, sale empujando la vagoneta llena, vuelca y vuelve a entrar con ella vacía', () => {
    if (state === null) return;
    const before = JSON.stringify(state);
    // Cada jornada tiene su semilla: se busca la primera que mande a alguien a la mina.
    const life = Array.from({ length: 7 }, (_, n) => createVillage(state, state.tick * TIME.DAYS_PER_WEEK + n))
      .find((candidate) => candidate.dwellers.some((d) => d.dayPlan?.job?.place.startsWith('mine:') === true));
    expect(life, 'alguna jornada de la semana manda a alguien a la mina').toBeDefined();
    if (life === undefined || life.mine === null) return;
    const miners = life.dwellers.filter((d) => d.dayPlan?.job?.place.startsWith('mine:') === true);
    const cart = life.mine.carts[0]!;

    let seenBefore = false, vanished = false, reappeared = false, pushing = false, unloading = false;
    let fullOut = false, emptyBack = false;
    for (let step = 0; step < 30 * 150; step += 1) {
      life.step(0.2 + (step / (30 * 150)) * 0.28);
      const actors = castOf(life, step / 30, new Map(), new Set());
      for (const miner of miners) {
        const actor = actors.find((a) => a.id === miner.villager);
        if (actor !== undefined && !vanished) seenBefore = true;
        if (actor === undefined && seenBefore && miner.shaft !== undefined) vanished = true;
        if (actor !== undefined && vanished) reappeared = true;
        pushing ||= actor?.clip === 'push';
        unloading ||= actor?.clip === 'sort' && miner.shaft?.stage === 'unload';
      }
      if (cart.by !== null && cart.full && !swallowed(life.mine.site, cart)) fullOut = true;
      if (fullOut && !cart.full && cart.by !== null && swallowed(life.mine.site, cart)) emptyBack = true;
    }
    expect(seenBefore, 'se le ve llegar a la boca').toBe(true);
    expect(vanished, 'desaparece dentro').toBe(true);
    expect(reappeared, 'vuelve a salir').toBe(true);
    expect(pushing, 'empuja la vagoneta').toBe(true);
    expect(unloading, 'descarga').toBe(true);
    expect(fullOut, 'la vagoneta sale llena').toBe(true);
    expect(emptyBack, 'y vuelve adentro vacía').toBe(true);
    expect(life.mine.loads).toBeGreaterThan(0);
    expect(JSON.stringify(state), 'la vida no escribe en el motor').toBe(before);
  });

  it('a última hora no se empieza nada dentro: al acabar la jornada nadie se queda en la mina', () => {
    if (state === null) return;
    const life = Array.from({ length: 7 }, (_, n) => createVillage(state, state.tick * TIME.DAYS_PER_WEEK + n))
      .find((candidate) => candidate.dwellers.some((d) => d.dayPlan?.job?.place.startsWith('mine:') === true));
    if (life === undefined) return;
    for (let step = 0; step < 30 * 120; step += 1) life.step(0.2 + (step / (30 * 120)) * 0.7);
    expect(life.dwellers.filter((d) => d.shaft !== undefined)).toHaveLength(0);
  });
});
