import { describe, expect, it } from 'vitest';
import { elevatedAssetYaw } from '../../src/render3d/world/elevated-orientation';

const segment = (variant: 'straight' | 'turn' | 'diagonal',
  incoming: [number, number], outgoing: [number, number]) => ({
  variant, incoming: { x: incoming[0], z: incoming[1] },
  outgoing: { x: outgoing[0], z: outgoing[1] },
});

describe('E3b · orientación de las fuentes reutilizables', () => {
  it('orienta los dos ejes rectos sin cambiar la mano', () => {
    expect(elevatedAssetYaw(segment('straight', [-1, 0], [1, 0]))).toBe(0);
    expect(elevatedAssetYaw(segment('straight', [0, -1], [0, 1]))).toBe(-Math.PI / 2);
  });

  it('orienta los cuatro codos cardinales', () => {
    expect(elevatedAssetYaw(segment('turn', [0, -1], [1, 0]))).toBe(0);
    expect(elevatedAssetYaw(segment('turn', [1, 0], [0, 1]))).toBe(-Math.PI / 2);
    expect(elevatedAssetYaw(segment('turn', [0, 1], [-1, 0]))).toBe(-Math.PI);
    expect(elevatedAssetYaw(segment('turn', [-1, 0], [0, -1]))).toBe(-3 * Math.PI / 2);
  });

  it('rechaza una mano que sólo saldría reflejando el recurso', () => {
    expect(elevatedAssetYaw(segment('diagonal', [-1, 1], [1, 1]))).toBeNull();
  });
});
