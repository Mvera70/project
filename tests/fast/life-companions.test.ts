// El valle más vivo · El perro, el zorro, los patos y la mula del buhonero
// (`life/companions.ts`, `life/visitors.ts`). Tres semillas; nada de esto
// escribe en el motor.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { createDog, createFox, stepDog, stepFox } from '../../src/render3d/life/companions';
import { terrainOf } from '../../src/render3d/life/terrain';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { isNight } from '../../src/render3d/life/home';

const SEEDS = [7, 23, 41];

function grown(seed: number, years = 8): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
  return state;
}

describe('El valle más vivo · el perro, el zorro, los patos y la mula', () => {
  it('una aldea hecha tiene perro, patos en el agua y zorro sólo de noche', () => {
    // El zorro huye de quien anda cerca, y hay noches en que alguien anda junto
    // a su linde: medido, en la semilla 23 no sale en toda la noche porque la
    // linde está a ocho celdas de la plaza. Basta con que salga en la mayoría.
    let foxNights = 0;
    for (const seed of SEEDS) {
      const state = grown(seed);
      const before = JSON.stringify(state);
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      const kinds = (): string[] => life.wildlife.map((animal) => animal.kind);
      let foxByDay = 0;
      let foxByNight = 0;
      let dryDuck = 0;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        const phase = n / STEPS_PER_DAY;
        life.step(phase);
        const night = isNight(phase);
        if (kinds().includes('fox')) { if (night) foxByNight += 1; else foxByDay += 1; }
        for (const duck of life.wildlife.filter((animal) => animal.kind === 'duck')) {
          const cell = Math.floor(duck.y) * state.map.width + Math.floor(duck.x);
          const t = state.map.terrain[cell];
          if (t !== TERRAIN_CODE.water && t !== TERRAIN_CODE.lake) dryDuck += 1;
        }
      }
      expect(kinds().filter((kind) => kind === 'dog'), `semilla ${seed}`).toHaveLength(1);
      expect(kinds().filter((kind) => kind === 'duck').length, `semilla ${seed}`).toBe(3);
      expect(dryDuck, `semilla ${seed}: un pato fuera del agua`).toBe(0);
      expect(foxByDay, `semilla ${seed}: zorro de día`).toBe(0);
      if (foxByNight > 0) foxNights += 1;
      expect(JSON.stringify(state), 'no escriben en el motor').toBe(before);
    }
    expect(foxNights).toBeGreaterThanOrEqual(2);
  });

  it('el perro sale a ver al forastero, y el zorro huye de quien se acerca', () => {
    for (const seed of SEEDS) {
      const state = grown(seed);
      const land = terrainOf(state);
      const heart = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
      const dog = createDog(state, land, seed, heart)!;
      expect(dog, `semilla ${seed}`).not.toBeNull();
      const stranger = { x: dog.door.x + 5, z: dog.door.z };
      const free = land.blocked[Math.floor(stranger.z) * land.width + Math.floor(stranger.x)] !== 1;
      if (free) {
        const start = Math.hypot(dog.body.x - stranger.x, dog.body.z - stranger.z);
        for (let step = 0; step < 400; step += 1) stepDog(dog, land, seed, step, false, [], [stranger]);
        const end = Math.hypot(dog.body.x - stranger.x, dog.body.z - stranger.z);
        // Se planta a 2,2 celdas para ladrarle (`stepDog`), no se le echa encima.
        expect(end, `semilla ${seed}`).toBeLessThan(Math.min(start - 1, 3.5));
      }
      const fox = createFox(state, land, seed, heart, heart)!;
      expect(fox, `semilla ${seed}`).not.toBeNull();
      for (let step = 0; step < 900 && fox.phase !== 'watching'; step += 1) stepFox(fox, land, seed, step, true, []);
      const out = { x: fox.body.x, z: fox.body.z };
      for (let step = 900; step < 1100; step += 1) stepFox(fox, land, seed, step, true, [{ x: out.x + 1, z: out.z }]);
      expect(fox.phase === 'fleeing' || fox.phase === 'den', `semilla ${seed}`).toBe(true);
      expect(Math.hypot(fox.body.x - out.x - 1, fox.body.z - out.z), `semilla ${seed}: se aleja`).toBeGreaterThan(2);
    }
  });

  it('la mula va detrás del buhonero, y el forastero viene sin ella', () => {
    for (const seed of SEEDS) {
      const state = grown(seed, 6);
      state.happenings = state.happenings.filter((h) => h.tick !== state.tick);
      state.happenings.push({ tick: state.tick, id: 'pedlar', visible: [], who: [] });
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      const pedlar = life.visitors[0]!;
      expect(pedlar.beast?.kind, `semilla ${seed}`).toBe('mule');
      let farthest = 0;
      let seen = 0;
      for (let n = 0; n < STEPS_PER_DAY * 0.6; n += 1) {
        life.step(n / STEPS_PER_DAY);
        const mule = life.wildlife.find((animal) => animal.kind === 'mule');
        if (mule === undefined) continue;
        seen += 1;
        farthest = Math.max(farthest, Math.hypot(mule.x - pedlar.body.x, mule.y - pedlar.body.z));
      }
      expect(seen, `semilla ${seed}`).toBeGreaterThan(0);
      // Del ramal: nunca se queda atrás ni se adelanta.
      expect(farthest, `semilla ${seed}`).toBeLessThan(2);
    }
    const state = grown(7, 6);
    state.happenings.push({ tick: state.tick, id: 'stranger_passes', visible: [], who: [] });
    const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
    expect(life.visitors.every((visitor) => visitor.beast === null)).toBe(true);
  });

  it('el tratante trae la vaca que vende, detrás de él', () => {
    for (const seed of SEEDS) {
      const state = grown(seed, 6);
      state.happenings = state.happenings.filter((h) => h.tick !== state.tick);
      state.happenings.push({ tick: state.tick, id: 'drover_visit', visible: [], who: [] });
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      const drover = life.visitors[0]!;
      expect(drover.beast?.kind, `semilla ${seed}`).toBe('cow');
      let seen = 0;
      for (let n = 0; n < STEPS_PER_DAY * 0.5; n += 1) {
        life.step(n / STEPS_PER_DAY);
        const cow = life.wildlife.find((animal) => animal.kind === 'cow' && animal.id >= 44_300);
        if (cow !== undefined) seen += 1;
      }
      expect(seen, `semilla ${seed}`).toBeGreaterThan(0);
    }
  });

  it('el perro ladra plantado ante el forastero y corre a por la pelota en juego', () => {
    for (const seed of SEEDS) {
      const state = grown(seed);
      const land = terrainOf(state);
      const heart = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
      const dog = createDog(state, land, seed, heart)!;
      const stranger = { x: dog.door.x + 5, z: dog.door.z };
      let barked = false;
      for (let step = 0; step < 400; step += 1) {
        stepDog(dog, land, seed, step, false, [], [stranger]);
        barked ||= dog.barking;
      }
      const free = land.blocked[Math.floor(stranger.z) * land.width + Math.floor(stranger.x)] !== 1;
      if (free) expect(barked, `semilla ${seed}: no ladra`).toBe(true);
      // Un niño a un lado y la pelota rodando al otro: va a por la pelota.
      const fresh = createDog(state, land, seed, heart)!;
      const child = { x: fresh.door.x - 3, z: fresh.door.z };
      const ball = { x: fresh.door.x + 3, z: fresh.door.z };
      for (let step = 0; step < 300; step += 1) stepDog(fresh, land, seed, step, false, [child], [], [ball]);
      expect(fresh.mode, `semilla ${seed}`).toBe('ball');
      expect(Math.hypot(fresh.body.x - ball.x, fresh.body.z - ball.z))
        .toBeLessThan(Math.hypot(fresh.body.x - child.x, fresh.body.z - child.z));
    }
  });
});
