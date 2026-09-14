// V-13 · Que corra en el móvil. Anexo E.
//
// Prueba de regresión: si alguien rompe la rejilla espacial de `grid.ts` y el
// paso vuelve a comparar todos contra todos, el coste por cuerpo empieza a
// crecer con la multitud. Aquí se mide sobre `createVillage()` completo —con
// impulsos, ofertas y elección, no sólo física de cuerpos— porque es el
// camino real que corre en el juego, y `life-body.test.ts` ya prueba esto
// mismo en las piezas sueltas.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import type { GameState, Villager } from '@engine/state';
import { createVillage } from '../../src/render3d/life/village';

function baseState(seed: number): GameState {
  const state = foundGame(seed);
  run(state, 40 * 48, 'prudent', CATALOG);
  return state;
}

/**
 * El mismo valle, con más o menos gente.
 *
 * De sobra, se recorta el reparto; de menos, se repiten plantillas con un id
 * nuevo. No es una aldea creíble —nadie pregunta si dos vecinos idénticos
 * tienen sentido— pero para medir coste por cuerpo no hace falta que lo sea.
 */
function withPopulation(base: GameState, count: number): GameState {
  const state = structuredClone(base);
  const original = state.people.villagers.length;

  if (count <= original) {
    state.people.villagers = state.people.villagers.slice(0, count);
    return state;
  }

  let nextId = Math.max(...state.people.villagers.map((v) => v.id)) + 1;
  const extras: Villager[] = [];
  for (let i = 0; i < count - original; i += 1) {
    const template = state.people.villagers[i % original] as Villager;
    extras.push({ ...structuredClone(template), id: nextId });
    nextId += 1;
  }
  state.people.villagers = [...state.people.villagers, ...extras];
  return state;
}

describe('V-13 · el coste por cuerpo se queda plano', () => {
  it('createVillage() no vuelve a costar más por cabeza al crecer la multitud', () => {
    const base = baseState(7);

    const cost = (count: number): number => {
      const state = withPopulation(base, count);
      const village = createVillage(state, 0);
      // Una vuelta en vacío: la primera siempre paga la compilación JIT.
      for (let n = 0; n < 60; n += 1) village.step();
      const started = performance.now();
      const steps = 300;
      for (let n = 0; n < steps; n += 1) village.step();
      return (performance.now() - started) / steps / count;
    };

    const few = cost(80);
    const many = cost(200);

    // Medido: 0,75 µs con 80, 1,02 µs con 200 — sube un 36 % al 2,5x la gente.
    // Con la rejilla rota (todos contra todos) crecería con el cuadrado de la
    // población, no con esto. El umbral se deja con margen amplio: más del
    // doble por cabeza para 2,5 veces la gente es la señal de que la rejilla
    // ha dejado de hacer su trabajo, no ruido de una ejecución.
    expect(many, `por cuerpo: ${(few * 1000).toFixed(2)} µs con 80, `
      + `${(many * 1000).toFixed(2)} µs con 200`).toBeLessThan(few * 2.2);
  });
});
