// Los de fuera entran por la senda de la garganta (2 oct 2026).
//
// Vera: «no sé cómo llegan las visitas al valle». Antes aparecían en el camino
// pintado, a veintiséis celdas de la plaza como mucho. Ahora bajan por la senda
// que sale del valle hasta la boca y siguen por el camino pintado, saliendo lo
// más lejos que les deje llegar a su hora (`setOff`, `life/visitors.ts`).
// Medido al escribirlo, seis valles de veinte vecinos con un buhonero: los seis
// salen de la senda, llegan a la plaza entre 0,30 y 0,37, el mayor salto de un
// paso es 0,075 celdas (el paso son 0,047) y por la senda nunca se apartan más
// de 0,55 de ella.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { gorgeRoadPaths } from '../../src/render3d/world/mountains';

const SEEDS = [3, 7, 11, 19, 23];

type Point = { x: number; z: number };
function toPath(p: Point, path: readonly Point[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1]!, b = path[i]!;
    const dx = b.x - a.x, dz = b.z - a.z, span = dx * dx + dz * dz;
    const t = span === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / span));
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t));
  }
  return best;
}

describe('los de fuera entran por la senda de la garganta', () => {
  it('bajan por ella hasta la boca, sin saltos, y están en la plaza a su hora', () => {
    let gorge = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK, { visits: ['pedlar'] });
      const pedlar = life.visitors[0]!;
      const roads = gorgeRoadPaths(state.map, state.terrainSeed);
      if (pedlar.lane.length > 0) gorge += 1;
      let arrived = -1, jump = 0, astray = 0;
      let before = { x: pedlar.body.x, z: pedlar.body.z };
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        const onLane = pedlar.lane.length > 0 && pedlar.phase === 'coming';
        life.step(n / STEPS_PER_DAY);
        if (pedlar.phase !== 'waiting' && pedlar.phase !== 'gone') jump = Math.max(jump, Math.hypot(pedlar.body.x - before.x, pedlar.body.z - before.z));
        before = { x: pedlar.body.x, z: pedlar.body.z };
        if (onLane) astray = Math.max(astray, Math.min(...roads.map((road) => toPath(pedlar.body, road))));
        if (arrived < 0 && pedlar.phase === 'staying') arrived = n / STEPS_PER_DAY;
      }
      expect(arrived, `semilla ${seed}: no llegó a la plaza`).toBeGreaterThan(0);
      expect(arrived, `semilla ${seed}: llega tarde para el trato`).toBeLessThan(0.42);
      expect(jump, `semilla ${seed}: salta`).toBeLessThan(0.1);
      expect(astray, `semilla ${seed}: se sale de la senda al bajar`).toBeLessThan(0.1);
      expect(pedlar.phase, `semilla ${seed}: no se fue`).toBe('gone');
    }
    // La mayoría baja por la garganta; el que no, sale del camino pintado.
    expect(gorge, 'bajan por la garganta').toBeGreaterThanOrEqual(SEEDS.length - 1);
  });
});
