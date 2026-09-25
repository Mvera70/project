// El valle más vivo · Conejos en la linde (`life/rabbits.ts`). Salen al alba y
// al atardecer, lejos de las casas, y huyen de quien se acerca. Tres semillas.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { createRabbits, rabbitsOut, stepRabbits } from '../../src/render3d/life/rabbits';
import { terrainOf } from '../../src/render3d/life/terrain';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';

const SEEDS = [7, 23, 41];

describe('El valle más vivo · los conejos de la linde', () => {
  it('salen al alba y al atardecer, y a mediodía y de noche no se ven', () => {
    expect(rabbitsOut(0.2)).toBe(true);
    expect(rabbitsOut(0.7)).toBe(true);
    expect(rabbitsOut(0.46)).toBe(false);
    expect(rabbitsOut(0.95)).toBe(false);
    let seen = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 4, 'prudent', CATALOG);
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      life.step(0.2);
      const dawn = life.wildlife.filter((animal) => animal.kind === 'rabbit');
      seen += dawn.length;
      life.step(0.46);
      expect(life.wildlife.filter((animal) => animal.kind === 'rabbit'), `semilla ${seed}`).toHaveLength(0);
    }
    // Al menos dos por valle de media: si no, la linde está vacía.
    expect(seen).toBeGreaterThanOrEqual(SEEDS.length * 2);
  });

  it('se quedan lejos de las casas y corren cuando alguien se acerca', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 4, 'prudent', CATALOG);
      const land = terrainOf(state);
      const heart = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
      const rabbits = createRabbits(state, land, seed, heart);
      expect(rabbits.length, `semilla ${seed}`).toBeGreaterThan(0);
      for (const rabbit of rabbits) {
        expect(Math.hypot(rabbit.home.x - heart.x, rabbit.home.z - heart.z)).toBeGreaterThanOrEqual(10);
      }
      const rabbit = rabbits[0]!;
      stepRabbits(rabbits, land, seed, 0, 0.2, []);
      const walker = { body: { x: rabbit.body.x + 2, z: rabbit.body.z } };
      const start = { x: rabbit.body.x, z: rabbit.body.z };
      for (let step = 1; step < STEPS_PER_DAY / 40; step += 1) stepRabbits(rabbits, land, seed, step, 0.2, [walker]);
      const before = Math.hypot(start.x - walker.body.x, start.z - walker.body.z);
      const after = Math.hypot(rabbit.body.x - walker.body.x, rabbit.body.z - walker.body.z);
      expect(after, `semilla ${seed}: se aleja`).toBeGreaterThan(before + 1);
    }
  });
});
