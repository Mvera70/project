import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { inspectAt, panelFor } from '@ui/inspect';
import { recogniseGesture } from '@ui/gestures';
import { hungerSeverity, tellsFor } from '@render/layers/tells';
import { crowdPositions } from '@render/crowd';

describe('M-21 · gestos puros', () => {
  it('distingue toque, pulsación y deslizamientos verticales', () => {
    expect(recogniseGesture({ points: [{ x: 1, y: 1, atMs: 0 }, { x: 3, y: 2, atMs: 100 }] })).toBe('tap');
    expect(recogniseGesture({ points: [{ x: 1, y: 1, atMs: 0 }, { x: 2, y: 2, atMs: 600 }] })).toBe('hold');
    expect(recogniseGesture({ points: [{ x: 1, y: 80, atMs: 0 }, { x: 2, y: 10, atMs: 200 }] })).toBe('swipe_up');
    expect(recogniseGesture({ points: [{ x: 1, y: 10, atMs: 0 }, { x: 2, y: 80, atMs: 200 }] })).toBe('swipe_down');
  });

  it('reconoce un pellizco por el cambio entre dos distancias', () => {
    expect(recogniseGesture({ points: [], secondStartDistance: 30, secondEndDistance: 55 })).toBe('pinch');
  });
});

describe('M-21 · inspección y señales', () => {
  it('incluye los bordes de la caja de un edificio y da su cifra exacta', () => {
    const state = foundGame(7);
    const building = state.buildings[0]!;
    const target = inspectAt(state, building.x + building.w, building.y + building.h, 0.9);
    expect(target).toEqual({ kind: 'building', id: building.id });
    expect(panelFor(target!, state).lines.length).toBeGreaterThan(1);
  });

  it('deriva las señales sin mutar el estado', () => {
    const state = foundGame(7);
    const before = JSON.stringify(state);
    expect(tellsFor(state).length).toBeGreaterThan(0);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('hace visible el hambre sin añadir estado', () => {
    const state = foundGame(7);
    const normal = crowdPositions(state, 0.3).length;
    state.flags['forced_hunger'] = state.tick + 8;
    expect(hungerSeverity(state)).toBe(0.5);
    expect(crowdPositions(state, 0.3).length).toBeLessThan(normal);
  });
});
