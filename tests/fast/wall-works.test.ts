// E0d · El solar pertenece a la presentación y abre sólo su hueco de defensa.

import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import type { Building, ConstructionWork, GameState } from '@engine/state';
import { planChange, planFor } from '../../src/render3d/world/plan';
import { Works } from '../../src/render3d/world/works';

function palisade(id: number, x: number, y: number): Building {
  return { id, kind: 'palisade', x, y, w: 1, h: 1, builtTick: 0, lostTick: null, tier: 0, lit: false, blockedUntil: null };
}

function work(id: number, kind: 'gate' | 'wall' | 'stone_house', upgradeOf: number | null, done = 12): ConstructionWork {
  return { id, kind, x: 11, y: 10, w: 1, h: 1, bpCost: 40, bpDone: done, stoneDone: 0,
    materialsPaid: true, startedTick: 10, upgradeOf };
}

function state(): GameState {
  const game = foundTwenty(7);
  game.buildings = [palisade(1, 10, 10), palisade(2, 11, 10), palisade(3, 12, 10)];
  return game;
}

describe('E0d · solares y transiciones del anillo', () => {
  it('describe obra pura, acotada y estable sin escribir el estado', () => {
    const game = state(); game.works = [work(101, 'gate', 2, 90)];
    const before = JSON.stringify(game);
    const first = planFor(game), second = planFor(game);
    expect(first).toEqual(second);
    expect(JSON.stringify(game)).toBe(before);
    expect(first.works[0]).toMatchObject({ id: 101, kind: 'gate', upgradeOf: 2, progress: 1 });
  });

  it.each(['gate', 'wall'] as const)('%s abre sólo la empalizada fuente y recompone los vecinos', (kind) => {
    const game = state(); game.works = [work(101, kind, 2)];
    const control = planFor(state());
    const building = planFor(game);
    expect(building.buildings.map((item) => item.id)).toEqual([1, 3]);
    expect(building.works).toHaveLength(1);
    expect(planChange(control, building).removed).toEqual([2]);
    expect(planChange(control, building).changed.map((item) => item.id)).toEqual([1, 3]);
  });

  it('una mejora distinta conserva su fuente y superpone el solar', () => {
    const game = state(); game.works = [work(101, 'stone_house', 2)];
    const plan = planFor(game);
    expect(plan.buildings.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(plan.works).toHaveLength(1);
  });

  it('cambiar progreso sólo cambia esa obra y terminarla no deja solar', () => {
    const game = state(); game.works = [work(101, 'wall', 2, 4)];
    const low = planFor(game);
    game.works[0]!.bpDone = 30;
    const high = planFor(game);
    const changed = planChange(low, high);
    expect(changed.added).toEqual([]); expect(changed.changed).toEqual([]); expect(changed.removed).toEqual([]);
    expect(changed.works.changed.map((item) => item.id)).toEqual([101]);
    game.works = [];
    game.buildings[1] = { ...game.buildings[1]!, kind: 'wall', tier: 1 };
    const done = planFor(game);
    expect(done.works).toEqual([]);
    expect(done.buildings.find((item) => item.id === 2)?.kind).toBe('wall');
    expect(planChange(high, done).works.removed).toEqual([101]);
  });

  it('el gestor sustituye etapas, retira y libera sin duplicar solares', () => {
    const works = new Works();
    const low = { id: 101, kind: 'wall' as const, x: 10, z: 10, w: 1, h: 1, upgradeOf: 2, progress: 0.1 };
    const high = { ...low, progress: 0.9 };
    works.add(low); const lowHeight = new Box3().setFromObject(works.group).getSize(new Vector3()).y;
    works.add(high); const highHeight = new Box3().setFromObject(works.group).getSize(new Vector3()).y;
    expect(works.count).toBe(1); expect(highHeight).toBeGreaterThan(lowHeight);
    works.remove(101); expect(works.count).toBe(0); expect(works.group.children).toEqual([]);
    works.dispose();
  });
});
