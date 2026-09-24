import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { HOUSE_RUBBLE } from '../../src/engine/balance';
import { destroyBuilding } from '../../src/engine/world/buildings';
import { visibleBuildings } from '../../src/derive/visible-buildings';
import { Village } from '../../src/render3d/world/buildings';
import { planChange, planFor } from '../../src/render3d/world/plan';
import { foundTwenty } from '../helpers/founding';

function ruinedHouse(stone = false, blockYears = 0) {
  const state = foundTwenty(7);
  const house = state.buildings.find(building => building.kind === 'house')!;
  if (stone) { house.kind = 'stone_house'; house.tier = 1; }
  destroyBuilding(state, house.id, blockYears);
  const planned = () => planFor(state).buildings.find(building => building.id === house.id);
  return { state, house, planned };
}

describe('retirada visual de escombros domésticos', () => {
  it('la madera pierde volumen y desaparece sin borrar su historia ni la máscara', () => {
    const { state, house, planned } = ruinedHouse();
    const fresh = planFor(state);
    expect(planned()?.rubbleStage).toBe('fresh');
    expect(planned()?.asset).toBe('ruin-wood');
    state.tick += HOUSE_RUBBLE.FRESH_WEEKS;
    const settling = planFor(state);
    expect(planned()?.rubbleStage).toBe('settling');
    expect(planChange(fresh, settling).changed.map(building => building.id)).toContain(house.id);
    state.tick = house.lostTick! + HOUSE_RUBBLE.CLEAR_WEEKS;
    const cleared = planFor(state);
    expect(planned()).toBeUndefined();
    expect(planChange(settling, cleared).removed).toContain(house.id);
    expect(visibleBuildings(state).some(building => building.id === house.id)).toBe(true);
    expect(state.buildings.find(building => building.id === house.id)?.lostTick).toBe(house.lostTick);
    expect(state.map.ruins[house.y * state.map.width + house.x]).toBe(1);
  });

  it('la piedra conserva una cimentación baja donde aún prohíbe construir', () => {
    const { state, house, planned } = ruinedHouse(true);
    state.tick = house.lostTick! + HOUSE_RUBBLE.CLEAR_WEEKS;
    expect(planned()?.rubbleStage).toBe('scar');
    expect(planned()?.asset).toBeNull();
    const village = new Village();
    village.add(planned()!);
    village.group.updateMatrixWorld(true);
    const foundation = village.group.getObjectByName('ClearedFoundation');
    expect(foundation).toBeDefined();
    const bounds = new Box3().setFromObject(foundation!);
    expect(bounds.min.x).toBeCloseTo(house.x);
    expect(bounds.max.x).toBeCloseTo(house.x + house.w);
    expect(bounds.min.z).toBeCloseTo(house.y);
    expect(bounds.max.z).toBeCloseTo(house.y + house.h);
    expect(bounds.max.y).toBeLessThan(0.1);
    village.clear();
  });

  it('un incendio que aún bloquea el suelo deja marca hasta acabar su plazo', () => {
    const { state, house, planned } = ruinedHouse(false, 20);
    state.tick = house.lostTick! + HOUSE_RUBBLE.CLEAR_WEEKS;
    expect(planned()?.rubbleStage).toBe('scar');
    state.tick = house.blockedUntil!;
    expect(planned()).toBeUndefined();
  });
});
