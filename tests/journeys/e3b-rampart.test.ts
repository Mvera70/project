// E3b.3 · El adarve generado en villas que construyó el motor, no en decorados.
//
// Tarda lo que tarda jugar setenta años con `run`: por eso vive en las jornadas.

import { beforeAll, describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/state';
import { foundGame } from '../../src/engine/found';
import { run } from '../../src/engine/sim';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { sceneRampartOf } from '../../src/render3d/world/plan';
import { probeRampart, BODY_RADIUS } from '../helpers/rampart-probe';

function villa(seed: number) {
  const state = foundGame(seed);
  run(state, 3846, 'prudent', CATALOG);
  return state;
}

describe('E3b.3 · adarve generado en villas reales', () => {
  // Una sola partida de la 91 para las dos pruebas: el corte trabaja sobre una copia.
  let ninetyOne: GameState;
  beforeAll(() => { ninetyOne = villa(91); });

  it('la villa 91 cierra la vuelta entera, con portón y giros, desde sus dos torres', () => {
    const state = ninetyOne;
    const rampart = sceneRampartOf(state)!;
    expect(rampart.layout.edges).toHaveLength(88);
    expect(rampart.layout.gates.length).toBeGreaterThanOrEqual(1);
    // Cada celda del anillo con dos vecinos: ni un extremo suelto.
    const degree = new Map<string, number>();
    for (const [a, b] of rampart.layout.edges) for (const cell of [a, b]) degree.set(`${cell.x},${cell.z}`, (degree.get(`${cell.x},${cell.z}`) ?? 0) + 1);
    expect([...degree.values()].every(value => value === 2)).toBe(true);
    const diagonal = rampart.layout.edges.some(([a, b]) => a.x !== b.x && a.z !== b.z);
    expect(diagonal).toBe(true);
    expect(rampart.patrols.size).toBe(2);
    for (const patrol of rampart.patrols.values()) {
      expect(patrol.closed).toBe(true);
      const probe = probeRampart(rampart.layout, patrol.route);
      expect([probe.unsupported, probe.openEdge]).toEqual([0, 0]);
      expect(probe.clearance).toBeGreaterThanOrEqual(BODY_RADIUS);
      // La vuelta pasa por encima del portón.
      expect(patrol.route.some(point => rampart.layout.gates.some(gate =>
        Math.floor(point.x) === gate.x && Math.floor(point.z) === gate.z))).toBe(true);
    }
  });

  // 7 y 42 miden lo mismo (medido el 24 sep 2026); la 23 es la que además
  // tiene tramo de vuelta, y basta para que la jornada quepa en su tiempo.
  it.each([23])('la villa %i recorre lo transitable hasta el primer corte y vuelve', (seed) => {
    const state = villa(seed);
    const rampart = sceneRampartOf(state)!;
    expect(rampart).not.toBeNull();
    for (const patrol of rampart.patrols.values()) {
      expect(patrol.route[0]).toEqual(patrol.route.at(-1));
      expect(patrol.route.length).toBeGreaterThan(10);
      const probe = probeRampart(rampart.layout, patrol.route);
      expect([probe.unsupported, probe.openEdge]).toEqual([0, 0]);
      expect(probe.clearance).toBeGreaterThanOrEqual(BODY_RADIUS);
    }
  });

  it('perder un tramo de la villa 91 corta la vuelta allí', () => {
    const state = structuredClone(ninetyOne);
    const before = sceneRampartOf(state)!;
    const [a] = before.layout.edges[40]!;
    const lost = state.buildings.find(item => item.x === a.x && item.y === a.z && item.lostTick === null)!;
    lost.lostTick = state.tick;
    const after = sceneRampartOf(state)!;
    for (const patrol of after.patrols.values()) {
      expect(patrol.closed).toBe(false);
      expect(patrol.route.some(point => Math.floor(point.x) === a.x && Math.floor(point.z) === a.z)).toBe(false);
    }
    expect(after.layout.edges.some(([p, q]) => [p, q].some(cell => cell.x === a.x && cell.z === a.z))).toBe(false);
  });
});
