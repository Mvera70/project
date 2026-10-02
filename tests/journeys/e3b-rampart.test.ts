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

/**
 * **La villa de este fichero se busca, no se fija** (1 oct 2026, RD-1). Hasta
 * entonces era la 91: 88 tramos, dos torres, vuelta cerrada. RD-1 deja
 * planteada la encrucijada del vado desde el tick 0 y mueve la trayectoria de
 * toda villa jugada con `run` desde `foundGame`; la 91 pasó a una sola ronda
 * (`patrols.size` 1). Remedido en las semillas 1 a
 * 39 a los 3846 ticks: con anillo cerrado, portón y dos rondas cerradas salen
 * la 17, la 19, la 33 y la 38 (88 a 104 tramos); la 1, la 2, la 36 y la 37 no
 * cierran la vuelta. Lo que la prueba exige es la propiedad —anillo de grado 2,
 * portón, giros, dos torres que rondan, sondeo limpio, paso por el portón— y no
 * un número de tramos de una semilla: se toma la primera candidata que cumpla la
 * precondición, y si ninguna la cumple la prueba dice cuántas miró.
 *
 * **K5 (v5.76, 2 oct 2026) · y se vuelven a buscar.** Con la sastrería, el
 * valle de forma natural y el cerco sin salida (#60) juntos, ninguna de esas
 * cinco cierra la vuelta con dos torres a los 3846 ticks. Remedido en las
 * semillas 1 a 44: la cumplen la 8, la 12, la 26 y la 44 (87 a 119 tramos). Van
 * delante; las de antes se quedan detrás por si otra trayectoria las devuelve.
 */
const CANDIDATES = [8, 12, 26, 44, 17, 19, 33, 38, 91];

function twoTowerVilla(): { seed: number; state: GameState } {
  for (const seed of CANDIDATES) {
    const state = villa(seed);
    const rampart = sceneRampartOf(state);
    if (rampart === null || rampart.patrols.size !== 2 || rampart.layout.gates.length < 1) continue;
    if (![...rampart.patrols.values()].every(patrol => patrol.closed)) continue;
    if (!rampart.layout.edges.some(([a, b]) => a.x !== b.x && a.z !== b.z)) continue;
    return { seed, state };
  }
  throw new Error(`ninguna de las villas ${CANDIDATES.join(', ')} cierra la vuelta con dos torres, portón y giros`);
}

describe('E3b.3 · adarve generado en villas reales', () => {
  // Una sola partida para las dos pruebas: el corte trabaja sobre una copia.
  let chosen: GameState;
  beforeAll(() => { chosen = twoTowerVilla().state; });

  it('una villa de dos torres cierra la vuelta entera, con portón y giros', () => {
    const state = chosen;
    const rampart = sceneRampartOf(state)!;
    expect(rampart.layout.edges.length).toBeGreaterThanOrEqual(48);
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

  // La segunda villa, la primera de estas que tenga adarve con alguna ronda:
  // lo que mide es el recorrido hasta el primer corte, cerrado o no. Era la 23
  // (medido el 24 sep 2026 con la 7 y la 42; la 23 además tiene tramo de
  // vuelta, y basta para que la jornada quepa en su tiempo).
  it('una villa con adarve recorre lo transitable hasta el primer corte y vuelve', () => {
    let rampart: ReturnType<typeof sceneRampartOf> = null;
    for (const seed of [23, 7, 42, 1]) {
      rampart = sceneRampartOf(villa(seed));
      if (rampart !== null && rampart.patrols.size > 0) break;
    }
    expect(rampart, 'ninguna de las villas 23, 7, 42 y 1 tiene adarve con ronda').not.toBeNull();
    for (const patrol of rampart!.patrols.values()) {
      expect(patrol.route[0]).toEqual(patrol.route.at(-1));
      expect(patrol.route.length).toBeGreaterThan(10);
      const probe = probeRampart(rampart!.layout, patrol.route);
      expect([probe.unsupported, probe.openEdge]).toEqual([0, 0]);
      expect(probe.clearance).toBeGreaterThanOrEqual(BODY_RADIUS);
    }
  });

  // **El tramo que se pierde se busca, no se fija** (1 oct 2026, K1–K3). Era
  // el tramo 40 de la lista; con K1–K3 la villa elegida es la 17, y su tramo 40
  // es una esquina: al quitarlo, sus dos vecinas se tocan en diagonal y el
  // anillo se cierra por ahí (de 104 tramos a 103, las dos rondas cerradas). Eso
  // es una muralla que sigue cerrada, no un adarve que no corta. Se pierde el
  // primer tramo de muralla cuyas dos vecinas del anillo no se tocan.
  it('perder un tramo de la villa corta la vuelta allí', () => {
    const state = structuredClone(chosen);
    const before = sceneRampartOf(state)!;
    const key = (c: { x: number; z: number }): string => `${c.x},${c.z}`;
    const around = new Map<string, { x: number; z: number }[]>();
    for (const [p, q] of before.layout.edges) {
      around.set(key(p), [...(around.get(key(p)) ?? []), q]);
      around.set(key(q), [...(around.get(key(q)) ?? []), p]);
    }
    const a = before.layout.edges.map(([p]) => p).find((cell) => {
      const [m, n] = around.get(key(cell)) ?? [];
      const wall = state.buildings.some(item => item.x === cell.x && item.y === cell.z && item.lostTick === null
        && (item.kind === 'wall' || item.kind === 'palisade'));
      return wall && m !== undefined && n !== undefined && Math.max(Math.abs(m.x - n.x), Math.abs(m.z - n.z)) > 1;
    });
    expect(a, 'un tramo de muralla cuyas vecinas no se tocan').toBeDefined();
    const lost = state.buildings.find(item => item.x === a!.x && item.y === a!.z && item.lostTick === null)!;
    lost.lostTick = state.tick;
    const after = sceneRampartOf(state)!;
    for (const patrol of after.patrols.values()) {
      expect(patrol.closed).toBe(false);
      expect(patrol.route.some(point => Math.floor(point.x) === a!.x && Math.floor(point.z) === a!.z)).toBe(false);
    }
    expect(after.layout.edges.some(([p, q]) => [p, q].some(cell => cell.x === a!.x && cell.z === a!.z))).toBe(false);
  });
});
