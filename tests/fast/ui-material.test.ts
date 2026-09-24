// UI-W · La interfaz es de madera hasta la edad de piedra y de piedra desde
// ella (Vera, 24 sep 2026). La edad de piedra es la primera obra de piedra, el
// mismo peldaño que mide `tools/reports/pace-report.ts`, y la materia no vuelve
// atrás aunque esa obra se pierda.

import { describe, expect, it } from 'vitest';
import { uiMaterialOf } from '@derive/era';
import { foundTwenty } from '../helpers/founding';

describe('UI-W · la materia de la interfaz sigue a la aldea', () => {
  it('una aldea recién fundada es de madera, en varias semillas', () => {
    for (const seed of [7, 11, 23]) expect(uiMaterialOf(foundTwenty(seed)), `semilla ${seed}`).toBe('wood');
  });

  it('la primera obra de piedra la vuelve de piedra, y perderla no la devuelve a la madera', () => {
    for (const seed of [7, 23]) {
      const state = foundTwenty(seed);
      const house = state.buildings.find((b) => b.kind === 'house');
      if (house === undefined) throw new Error('La aldea de prueba necesita una casa.');
      house.tier = 1;
      expect(uiMaterialOf(state)).toBe('stone');
      house.lostTick = state.tick;
      expect(uiMaterialOf(state)).toBe('stone');
    }
  });
});
