import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { probeRampart, BODY_RADIUS } from '../helpers/rampart-probe';
import { sceneRampartOf, sceneRampartPatrolView, planFor, planChange } from '../../src/render3d/world/plan';
import { RAMPART, bastionRect, rampartBoxes, rampartPrisms } from '../../src/render3d/world/rampart';
import { terrainOf } from '../../src/render3d/life/terrain';
import { garrisonPlaces, mannedPlatformCells } from '../../src/render3d/life/garrison';
import { bastionWalkwayOf } from '../../src/derive/bastion-walkway';
import { createPhysics } from '../../src/render3d/life/physics';

function building(id: number, kind: Building['kind'], x: number, y: number, tier: 0 | 1 = 1): Building {
  return { id, kind, x, y, w: 1, h: 1, builtTick: 0, lostTick: null, blockedUntil: null, tier, lit: false };
}

/**
 * Un anillo octogonal de piedra alrededor de la plaza: rectas, cuatro codos
 * diagonales, un portón y la torre donde se pida. `turns` gira la villa
 * entera de noventa en noventa grados alrededor de la plaza.
 */
function octagon(turns: 0 | 1 | 2 | 3, tower: 'south' | 'diagonal') {
  const state = foundTwenty(7);
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  state.map.ruins.fill(0);
  const c = { x: 20, y: 20 };
  state.plaza = { ...c };
  state.ring = 5;
  state.works = [];
  state.threat.comingTick = state.tick;
  state.threat.arrivedTick = null;
  const cells: [number, number][] = [];
  for (let x = 18; x <= 22; x += 1) cells.push([x, 15]);
  cells.push([23, 16], [24, 17]);
  for (let z = 18; z <= 22; z += 1) cells.push([25, z]);
  cells.push([24, 23], [23, 24]);
  for (let x = 22; x >= 18; x -= 1) cells.push([x, 25]);
  cells.push([17, 24], [16, 23]);
  for (let z = 22; z >= 18; z -= 1) cells.push([15, z]);
  cells.push([16, 17], [17, 16]);
  const turn = ([x, z]: [number, number]): [number, number] => {
    let dx = x - c.x, dz = z - c.y;
    for (let i = 0; i < turns; i += 1) [dx, dz] = [-dz, dx];
    return [c.x + dx, c.y + dz];
  };
  const towerAt = turn(tower === 'south' ? [20, 25] : [22, 25]);
  const gateAt = turn([15, 20]);
  state.buildings = cells.map(turn).map(([x, z], index) => {
    const kind: Building['kind'] = x === towerAt[0] && z === towerAt[1] ? 'bastion'
      : x === gateAt[0] && z === gateAt[1] ? 'gate' : 'wall';
    return building(index + 1, kind, x, z, kind === 'gate' ? 0 : 1);
  });
  return { state, tower: state.buildings.find(item => item.kind === 'bastion')! };
}

/** El tramo de la escalera que sí pisa el adarve: de la llegada al puesto. */
function stairTop(state: ReturnType<typeof octagon>['state'], tower: Building) {
  const layout = sceneRampartOf(state)!.layout;
  const bastion = layout.bastions.find(item => item.id === tower.id)!;
  const a = bastion.access!;
  const centre = { x: tower.x + 0.5, z: tower.y + 0.5 };
  return [{ x: centre.x + a.x * (0.5 + bastion.stairShift), z: centre.z + a.z * (0.5 + bastion.stairShift) },
    { x: centre.x + a.x * 0.08, z: centre.z + a.z * 0.08 }];
}

describe('E3b.3 · adarve generado desde el anillo', () => {
  it.each([0, 1, 2, 3] as const)('cierra la vuelta con suelo, paso y borde en la orientación %i', (turns) => {
    for (const where of ['south', 'diagonal'] as const) {
      const { state, tower } = octagon(turns, where);
      const rampart = sceneRampartOf(state);
      expect(rampart, where).not.toBeNull();
      const patrol = rampart!.patrols.get(tower.id)!;
      expect(patrol.closed, where).toBe(true);
      expect(rampart!.layout.edges).toHaveLength(state.buildings.length);
      expect(rampart!.layout.gates).toHaveLength(1);
      for (const route of [patrol.route, stairTop(state, tower)]) {
        const probe = probeRampart(rampart!.layout, route);
        expect(probe.unsupported, `${where}: suelo`).toBe(0);
        expect(probe.clearance, `${where}: paso`).toBeGreaterThanOrEqual(BODY_RADIUS);
        expect(probe.openEdge, `${where}: borde`).toBe(0);
      }
      expect(patrol.route.every(point => point.y === RAMPART.floor)).toBe(true);
    }
  });

  it('aparta la escalera sólo cuando una diagonal sale por su lado', () => {
    expect(sceneRampartOf(octagon(0, 'south').state)!.layout.bastions[0]!.stairShift).toBe(0);
    const { state } = octagon(0, 'diagonal');
    const bastion = sceneRampartOf(state)!.layout.bastions[0]!;
    expect(bastion.stairShift).toBe(RAMPART.stairShift);
    // El descansillo es suelo de la torre: la escalera llega a él, no a un tablero.
    const rect = bastionRect(bastion);
    expect(Math.max(rect.maxX - rect.minX, rect.maxZ - rect.minZ)).toBeCloseTo(1 + RAMPART.stairShift, 9);
  });

  it('un tramo perdido corta la vuelta y el guardia vuelve por donde fue', () => {
    const { state, tower } = octagon(0, 'south');
    const lost = state.buildings.find(item => item.x === 25 && item.y === 20)!;
    lost.lostTick = state.tick;
    const rampart = sceneRampartOf(state)!;
    const patrol = rampart.patrols.get(tower.id)!;
    expect(patrol.closed).toBe(false);
    expect(rampart.layout.edges.some(([a, b]) => [a, b].some(cell => cell.x === 25 && cell.z === 20))).toBe(false);
    expect(patrol.route[0]).toEqual(patrol.route.at(-1));
    // Ida y vuelta por cada tramo: nada se pisa más allá de la ruina.
    expect(patrol.route.some(point => Math.floor(point.x) === 25 && Math.floor(point.z) === 20)).toBe(false);
    const probe = probeRampart(rampart.layout, patrol.route);
    expect([probe.unsupported, probe.openEdge]).toEqual([0, 0]);
    expect(probe.clearance).toBeGreaterThanOrEqual(BODY_RADIUS);
  });

  it('la empalizada no recibe adarve de piedra', () => {
    const { state } = octagon(0, 'south');
    for (const item of state.buildings) if (item.kind === 'wall') item.kind = 'palisade';
    expect(sceneRampartOf(state)).toBeNull();
  });

  it('las cajas de Rapier no invaden el paso del guardia', () => {
    const { state, tower } = octagon(1, 'diagonal');
    const rampart = sceneRampartOf(state)!;
    const route = rampart.patrols.get(tower.id)!.route;
    let tightest = Infinity;
    for (const box of rampartBoxes(rampartPrisms(rampart.layout))) {
      const cos = Math.cos(box.yaw), sin = Math.sin(box.yaw);
      for (let i = 1; i < route.length; i += 1) {
        const a = route[i - 1]!, b = route[i]!;
        for (let t = 0; t <= 1; t += 0.02) {
          const dx = a.x + (b.x - a.x) * t - box.at.x, dz = a.z + (b.z - a.z) * t - box.at.z;
          // Al marco local de la caja: +X local va a (cos, -sin).
          const u = dx * cos - dz * sin, v = dx * sin + dz * cos;
          tightest = Math.min(tightest, Math.hypot(Math.max(0, Math.abs(u) - box.half.x), Math.max(0, Math.abs(v) - box.half.z)));
        }
      }
    }
    // Las cajas se alargan 0,02 para sellar los ingletes; el paso sigue libre.
    expect(tightest).toBeGreaterThanOrEqual(BODY_RADIUS - 0.03);
  });

  it('el guardia sube por la escalera dibujada, da la vuelta y los pretiles paran flechas', async () => {
    const { state, tower } = octagon(0, 'diagonal');
    // Con pocas manos el portón se lleva la primera; aquí se mira la torre.
    const gate = state.buildings.find(item => item.kind === 'gate')!;
    gate.kind = 'wall'; gate.tier = 1;
    const land = terrainOf(state);
    const selected = garrisonPlaces(state, land, { x: 20.5, z: 20.5 }, undefined, undefined,
      bastionWalkwayOf, undefined, sceneRampartPatrolView)
      .find(post => post.post.x === tower.x && post.post.y === tower.y)!;
    expect(selected.elevatedVariant).toBe('ring');
    expect(selected.rampart).toBeDefined();
    const route = sceneRampartOf(state)!.patrols.get(tower.id)!.route;
    // Sube directo al puesto, que es desde donde se tira; la ronda va aparte.
    expect(selected.elevated!.patrol).toEqual(route);
    expect(selected.elevated!.climb.at(-1)).toEqual(route[0]);
    expect(selected.elevated!.descent).toEqual([...selected.elevated!.climb].reverse());
    // El pie de la escalera apartada está a 2,65 de la esquina de la torre.
    const foot = selected.elevated!.foot;
    expect(Math.hypot(foot.x - (tower.x + 0.5), foot.z - (tower.y + 0.5))).toBeCloseTo(2.15, 6);
    const physics = await createPhysics(land, {
      platformCells: mannedPlatformCells([selected]), obstacles: selected.rampart!.obstacles,
    });
    expect(physics).not.toBeNull();
    if (physics !== null) {
      // Desde el eje del tramo norte hacia fuera, a la altura del pretil.
      const out = physics.launch({ x: 20.5, y: 1.09, z: 15.5 }, { x: 0, y: 0, z: -6 });
      for (let step = 0; step < 20; step += 1) physics.step();
      expect(out.at.z, 'el pretil exterior detiene la flecha rasante').toBeGreaterThan(14.9);
      // Por encima de las almenas la flecha pasa: el tiro nace a 1,45.
      const over = physics.launch({ x: 20.5, y: 1.45, z: 15.5 }, { x: 0, y: 0, z: -6 });
      for (let step = 0; step < 20; step += 1) physics.step();
      expect(over.at.z).toBeLessThan(14);
      physics.dispose();
    }
  });

  it('la escena rehace el adarve sólo cuando cambia su forma', () => {
    const { state } = octagon(2, 'south');
    const first = planFor(state);
    expect(first.rampart).not.toBeNull();
    expect(planChange(first, planFor(state)).rampart).toBe(false);
    state.buildings.find(item => item.kind === 'wall')!.lostTick = state.tick;
    const after = planFor(state);
    expect(planChange(first, after).rampart).toBe(true);
    const tower = after.buildings.find(item => item.kind === 'bastion')!;
    expect(tower.rampartShift).toBe(0);
    expect(tower.bastionWalkway).toBeUndefined();
  });
});
