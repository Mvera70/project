import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE, type Building, type ConstructionWork } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { elevatedRingOf, type ElevatedRingVariant } from '../../src/derive/elevated-ring';

function building(id: number, kind: Building['kind'], x: number, y: number, tier: 0 | 1 = 1,
  lostTick: number | null = null): Building {
  return { id, kind, x, y, w: 1, h: 1, builtTick: 0, lostTick, blockedUntil: null, tier, lit: false };
}

function fixture(seed = 7, x = 10, y = 14, inward = { x: 0, z: -1 }) {
  const state = foundTwenty(seed);
  state.map.terrain.fill(TERRAIN_CODE.meadow); state.map.ruins.fill(0);
  state.plaza = { x: x + inward.x * 4, y: y + inward.z * 4 };
  state.ring = 4; state.works = [];
  const tower = building(1, 'bastion', x, y);
  const side = { x: inward.z, z: -inward.x };
  state.buildings = [tower, building(2, 'wall', x + side.x, y + side.z),
    building(3, 'wall', x + side.x * 2, y + side.z * 2)];
  return { state, tower, side };
}

const all: ElevatedRingVariant[] = ['straight', 'turn', 'diagonal', 'mixed',
  'gate-cardinal', 'gate-diagonal', 'gate-mixed', 'bastion-crossing', 'bastion-return'];

describe('E3b.2c.1 · selector puro del anillo', () => {
  it.each([
    [7, 10, 14, { x: 0, z: -1 }], [91, 6, 10, { x: 1, z: 0 }],
    [7, 10, 6, { x: 0, z: 1 }], [91, 14, 10, { x: -1, z: 0 }],
  ] as const)('preserva acceso y primer sentido en la semilla %i y %i,%i', (seed, x, y, inward) => {
    const { state, tower, side } = fixture(seed, x, y, inward);
    const before = JSON.stringify(state);
    const result = elevatedRingOf(state, tower);
    expect(result.access).toEqual(inward);
    expect(result.side).toEqual(side);
    expect(result.topologyRoute.slice(0, 3)).toHaveLength(3);
    expect(result.route).toHaveLength(3); // Junta E3b.1 aprobada.
    expect(result.route.every(point => point.y === 1.02)).toBe(true);
    expect(Math.hypot(result.route[1]!.x - (state.buildings[1]!.x + 0.5),
      result.route[1]!.z - (state.buildings[1]!.y + 0.5))).toBeCloseTo(0.29, 6);
    expect(result.status).toBe('fallback');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('distingue una cadena cerrada, giros cardinales y la aprobación de mallas', () => {
    const { state, tower } = fixture();
    // El bastión está en mitad del lado inferior y conserva libre la escalera.
    const cells = [[7, 14], [7, 13], [7, 12], [7, 11], [8, 11], [9, 11],
      [10, 11], [11, 11], [12, 11], [13, 11], [13, 12], [13, 13],
      [13, 14], [12, 14], [11, 14]];
    state.buildings.push(...cells.map(([x, y], index) => building(index + 4, 'wall', x!, y!)));
    const pending = elevatedRingOf(state, tower);
    expect(pending.topologyClosed).toBe(true);
    expect(pending.geometryReady).toBe(false);
    expect(pending.segments.some(segment => segment.variant === 'turn' && segment.mask === 3)).toBe(true);
    expect(pending.segments.filter(segment => segment.kind === 'bastion')).toHaveLength(1);
    const approved = elevatedRingOf(state, tower, { approvedVariants: all });
    expect(approved.topologyClosed).toBe(true);
    expect(approved.geometryReady).toBe(true);
    expect(approved.status).toBe('ready');
    expect(approved.route.length).toBe(approved.topologyRoute.length);
  });

  it('centra el paso de la nueva fábrica sin desplazar el respaldo E3b.1', () => {
    const { state, tower } = fixture();
    const centered = elevatedRingOf(state, tower, { approvedVariants: all, lane: 'center' });
    expect(centered.topologyRoute[1]).toEqual({ x: 9.5, z: 14.5, y: 1.02 });
    expect(centered.topologyRoute[2]).toEqual({ x: 8.5, z: 14.5, y: 1.02 });
    expect(centered.status).toBe('fallback');
    expect(centered.route[1]).toEqual({ x: 9.5, z: 14.21, y: 1.02 });
    expect(centered.route[2]).toEqual({ x: 8.5, z: 14.21, y: 1.02 });
  });

  it('marca el portón con máscara 65 como transición diagonal cardinal pendiente', () => {
    const { state, tower } = fixture();
    state.buildings = [tower, building(2, 'wall', 9, 14), building(3, 'wall', 8, 14),
      building(4, 'wall', 7, 14), building(5, 'wall', 6, 14), building(6, 'wall', 5, 14),
      building(7, 'wall', 4, 14), building(8, 'wall', 3, 14), building(9, 'wall', 3, 13),
      building(10, 'gate', 4, 12), building(11, 'wall', 4, 11)];
    const result = elevatedRingOf(state, tower);
    const gate = result.segments.find(segment => segment.buildingId === 10);
    expect(gate?.mask).toBe(65);
    expect(gate?.variant).toBe('gate-mixed');
    expect(gate?.eligible).toBe(false);
    expect(result.geometryReady).toBe(false);
  });

  it('no aprueba un segundo bastión como si fuera un codo de muro', () => {
    const { state, tower } = fixture();
    state.buildings[2] = building(3, 'bastion', 8, 14);
    state.buildings.push(building(4, 'wall', 7, 14));
    const ring = elevatedRingOf(state, tower, { approvedVariants: ['straight', 'mixed', 'turn'] });
    const crossing = ring.segments.find(segment => segment.buildingId === 3);
    expect(crossing?.kind).toBe('bastion');
    expect(crossing?.variant).toBe('bastion-crossing');
    expect(crossing?.reason).toBe('variant');
  });

  it.each([16, 32, 64, 128] as const)('reconoce diagonal efectiva %i y la anula si existe un codo cardinal', bit => {
    const { state, tower } = fixture(7, 10, 14, bit === 16 || bit === 32 ? { x: 0, z: 1 } : { x: 0, z: -1 });
    const direction = {
      16: { x: 1, z: -1 }, 32: { x: 1, z: 1 },
      64: { x: -1, z: 1 }, 128: { x: -1, z: -1 },
    }[bit];
    // El primer muro tiene un vecino previo y observa la salida diagonal.
    const base = state.buildings[1]!;
    state.buildings[2] = building(3, 'wall', base.x + direction.x, base.y + direction.z);
    const ring = elevatedRingOf(state, tower, { approvedVariants: all });
    const segment = ring.segments.find(item => item.buildingId === base.id);
    expect((segment?.mask ?? 0) & bit).toBe(bit);
    const elbow = building(5, 'wall', base.x + direction.x, base.y);
    state.buildings.push(elbow);
    const withElbow = elevatedRingOf(state, tower, { approvedVariants: all });
    expect((withElbow.segments.find(item => item.buildingId === base.id)?.mask ?? 0) & bit).toBe(0);
  });

  it('identifica el portón cardinal/diagonal sin aprobarlo por defecto', () => {
    const { state, tower } = fixture();
    state.buildings[2] = building(3, 'gate', 8, 14);
    state.buildings.push(building(4, 'wall', 7, 14));
    const cardinal = elevatedRingOf(state, tower);
    expect(cardinal.segments.find(segment => segment.buildingId === 3)?.variant).toBe('gate-cardinal');
    expect(cardinal.segments.find(segment => segment.buildingId === 3)?.eligible).toBe(false);
    state.buildings[3] = building(4, 'wall', 7, 13);
    const diagonal = elevatedRingOf(state, tower);
    expect(diagonal.segments.find(segment => segment.buildingId === 3)?.variant).toBe('gate-mixed');
    expect((diagonal.segments.find(segment => segment.buildingId === 3)?.mask ?? 0) & 128).toBe(128);
  });

  it('trata como piedra el portón visual de tier 0 unido a muros, pero no si conserva empalizada', () => {
    const { state, tower } = fixture();
    state.buildings[2] = building(3, 'gate', 8, 14, 0);
    state.buildings.push(building(4, 'wall', 7, 14));
    const stoneGate = elevatedRingOf(state, tower);
    expect(stoneGate.segments.find(segment => segment.buildingId === 3)?.variant).toBe('gate-cardinal');
    expect(stoneGate.segments.find(segment => segment.buildingId === 3)?.reason).toBe('variant');
    state.buildings.push(building(5, 'palisade', 7, 15, 0));
    const timberGate = elevatedRingOf(state, tower);
    expect(timberGate.segments.some(segment => segment.buildingId === 3)).toBe(false);
    expect(timberGate.blocked?.reason).toBe('wood');
  });

  it('corta ante madera, ruina, obra y obstáculo interior', () => {
    const { state, tower } = fixture();
    state.buildings.push(building(4, 'wall', 7, 14));
    state.buildings[2] = building(3, 'palisade', 8, 14, 0);
    expect(elevatedRingOf(state, tower).blocked?.reason).toBe('wood');
    state.buildings[2] = building(3, 'wall', 8, 14, 1, 1);
    expect(elevatedRingOf(state, tower).blocked?.reason).toBe('gap');
    state.buildings[2] = building(3, 'wall', 8, 14);
    const work: ConstructionWork = { id: 8, kind: 'wall', x: 9, y: 14, w: 1, h: 1,
      bpCost: 1, bpDone: 0, stoneDone: 0, materialsPaid: false, startedTick: 0, upgradeOf: 2 };
    state.works = [work];
    expect(elevatedRingOf(state, tower).segments[0]?.reason).toBe('work');
    state.works = [];
    expect(elevatedRingOf(state, tower, { blockedAt: cell => cell.x === 9 && cell.z === 13 })
      .segments[0]?.reason).toBe('obstacle');
  });

  it('rechaza una rama adicional junto al bastión', () => {
    const { state, tower } = fixture();
    state.buildings.push(building(4, 'wall', 11, 14), building(5, 'wall', 10, 15));
    const result = elevatedRingOf(state, tower);
    expect(result.status).toBe('unavailable');
    expect(result.blocked?.reason).toBe('branch');
  });

  it('no ofrece el respaldo E3b.1 si el obstáculo invade su segunda tabla', () => {
    const { state, tower } = fixture();
    const result = elevatedRingOf(state, tower, { blockedAt: cell => cell.x === 8 && cell.z === 13 });
    expect(result.status).not.toBe('fallback');
    expect(result.route.length).toBeLessThan(3);
  });

  it('no confunde una empalizada derribada bajo el adarve con un obstáculo vivo', () => {
    const { state, tower } = fixture();
    state.buildings.push(building(5, 'palisade', 9, 13, 0, 1));
    const ring = elevatedRingOf(state, tower);
    expect(ring.segments[0]?.reason).toBeNull();
  });
});
