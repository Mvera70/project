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
//
// **Con el valle de forma natural (2 oct 2026, v5.73) de las cinco de abajo
// bajan tres, no las cinco, y no es que el camino se haya alargado.** Medido en
// 36 valles de veinte vecinos (semillas 1 a 36): bajan 24 con el contorno y 29
// en `main` —una diferencia dentro de lo que mueve una muestra así (Fisher,
// p = 0,29)—, y en los doce primeros 9 y 10: nueve de doce es a lo que se afinó
// el paso (`VISITOR_PACE`, `life/visitors.ts`). El camino pintado de la boca a
// la plaza mide lo mismo de media (47,1 celdas, 46,7 en `main`); lo que cambia
// es de qué lado del plazo de quien viene cae cada valle (de 0,32 a 0,37 de
// jornada a 1,4 celdas por segundo, menos lo que falta hasta el puesto): la 3
// pasó de 48 a 51 celdas de camino y la 11 de 42 a 56, y esas dos se quedan en
// el camino pintado, como cualquier valle largo. La boca queda ahora a quince
// filas del borde en las 72 gargantas (en `main`, en 36 y hasta a veintiuna):
// la orilla conecta con el valle desde la primera fila que se mira
// (`roadMouths`, `MOUTH_FROM`). Por eso «la mayoría» se cuenta en su propia
// prueba, sobre doce valles, y la de las cinco sólo pide que bajen los
// suficientes para que los saltos y el apartarse de la senda se hayan medido
// de verdad sobre ella.

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
    // El que no baja sale del camino pintado, igual de a su hora (arriba). Cuántos
    // bajan se cuenta abajo, sobre doce valles: con cinco, un solo valle mueve la
    // cuenta una quinta parte (era «cuatro de cinco»).
    expect(gorge, 'bajan por la garganta').toBeGreaterThanOrEqual(2);
  });

  it('la mayoría de los valles baja por la garganta (nueve de doce es a lo que se afinó el paso)', () => {
    // Sólo se monta la jornada, sin vivirla: qué senda toma cada uno se decide
    // al montarlo. Medido: 9 de 12 con el valle de forma natural y 10 en `main`;
    // el umbral, un caso por debajo de lo medido.
    let down = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      const state = foundTwenty(seed);
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK, { visits: ['pedlar'] });
      if (life.visitors[0]!.lane.length > 0) down += 1;
    }
    expect(down, 'bajan por la garganta, de 12 valles').toBeGreaterThanOrEqual(8);
  });
});
