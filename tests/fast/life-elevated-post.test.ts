import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { createVillage } from '../../src/render3d/life/village';

function building(id: number, kind: Building['kind'], x: number, y: number): Building {
  return { id, kind, x, y, w: 1, h: 1, builtTick: 0, lostTick: null, blockedUntil: null, tier: 1, lit: false };
}

function elevatedVillage(injectAtApproach = true) {
  const state = foundTwenty(7);
  state.map.terrain.fill(TERRAIN_CODE.meadow); state.map.ruins.fill(0);
  state.plaza = { x: 10, y: 10 }; state.ring = 4; state.works = [];
  state.buildings = [building(1, 'bastion', 10, 14)];
  state.threat.comingTick = state.tick; state.threat.arrivedTick = null;
  const village = createVillage(state, 0, { ground: () => 0 });
  const post = village.manned.find(item => item.elevated !== undefined)!;
  const guard = village.dwellers.find(item => item.dayPlan?.job?.place === post.place.id)!;
  if (injectAtApproach) {
    guard.doing = { place: post.place, offer: post.place.offers[0]!, route: [], seat: 0,
      since: 0, until: 0, there: false };
    guard.body.x = post.elevated!.approach.x; guard.body.z = post.elevated!.approach.z - 0.05;
  }
  return { village, guard, post };
}

describe('E3a · jornada del puesto elevado', () => {
  it('con pendiente incompatible conserva el puesto de suelo', () => {
    const state = foundTwenty(7);
    state.map.terrain.fill(TERRAIN_CODE.meadow); state.map.ruins.fill(0);
    state.plaza = { x: 10, y: 10 }; state.ring = 4; state.works = [];
    state.buildings = [building(1, 'bastion', 10, 14)];
    state.threat.comingTick = state.tick; state.threat.arrivedTick = null;
    const village = createVillage(state, 0, { ground: () => 0.05 });
    expect(village.manned[0]?.elevated).toBeUndefined();
    expect(village.manned[0]?.place.at).not.toEqual({ x: 10.5, z: 12.6 });
  });

  it('el guardia asignado sube, ocupa y baja sin salto; nadie más adquiere cota', () => {
    const { village, guard, post } = elevatedVillage();
    let previous = { x: guard.body.x, y: 0, z: guard.body.z };
    let highest = 0;
    for (let step = 0; step < 100; step += 1) {
      village.step(0.45);
      const y = guard.body.y ?? 0;
      expect(Math.hypot(guard.body.x - previous.x, y - previous.y, guard.body.z - previous.z)).toBeLessThanOrEqual(guard.body.pace / 30 + 1e-9);
      previous = { x: guard.body.x, y, z: guard.body.z };
      highest = Math.max(highest, y);
    }
    expect(highest).toBeCloseTo(1.02);
    expect(guard.elevated?.phase).toBe('occupied');
    expect(guard.doing?.there).toBe(true);
    expect(guard.body.y).toBe(1.02);
    expect(village.dwellers.filter(person => person !== guard).every(person => person.body.y === undefined)).toBe(true);
    expect(guard.body.x).toBeCloseTo(post.elevated!.post.x);
    expect(guard.body.z).toBeCloseTo(post.elevated!.post.z);

    for (let step = 0; step < 100 && guard.elevated !== undefined; step += 1) village.step(0.8);
    expect(guard.elevated).toBeUndefined();
    expect(guard.body.y).toBeUndefined();
    expect(guard.body.x).toBeCloseTo(post.elevated!.approach.x);
    expect(guard.body.z).toBeCloseTo(post.elevated!.approach.z);
  });

  it('reproduce la misma subida paso a paso', () => {
    const a = elevatedVillage(), b = elevatedVillage();
    for (let step = 0; step < 90; step += 1) { a.village.step(0.45); b.village.step(0.45); }
    expect({ body: a.guard.body, elevated: a.guard.elevated, doing: a.guard.doing })
      .toEqual({ body: b.guard.body, elevated: b.guard.elevated, doing: b.guard.doing });
  });

  it('si cambia de intención en la escalera vuelve por los apoyos ya recorridos', () => {
    const { village, guard, post } = elevatedVillage();
    for (let step = 0; step < 18; step += 1) village.step(0.45);
    expect(guard.elevated?.phase).toBe('climb');
    guard.doing = null;
    let previous = { x: guard.body.x, y: guard.body.y ?? 0, z: guard.body.z };
    for (let step = 0; step < 100 && guard.elevated !== undefined; step += 1) {
      village.step(0.45);
      const current = { x: guard.body.x, y: guard.body.y ?? 0, z: guard.body.z };
      expect(Math.hypot(current.x - previous.x, current.y - previous.y, current.z - previous.z)).toBeLessThanOrEqual(guard.body.pace / 30 + 1e-9);
      previous = current;
    }
    expect(guard.elevated).toBeUndefined();
    expect(guard.body.y).toBeUndefined();
    expect(guard.body.x).toBeCloseTo(post.elevated!.approach.x);
    expect(guard.body.z).toBeCloseTo(post.elevated!.approach.z);
  });

  it('la jornada real elige el puesto y llega desde su punto inicial por pathTo', () => {
    const { village, guard } = elevatedVillage(false);
    const start = { x: guard.body.x, z: guard.body.z };
    for (let step = 0; step < 1200 && guard.elevated?.phase !== 'occupied'; step += 1) village.step(0.45);
    expect(Math.hypot(guard.body.x - start.x, guard.body.z - start.z)).toBeGreaterThan(0.5);
    expect(guard.elevated?.phase).toBe('occupied');
    expect(guard.doing?.there).toBe(true);
  });
});
