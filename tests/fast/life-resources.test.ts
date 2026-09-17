import { describe, expect, it } from 'vitest';
import { TIME } from '../../src/engine/balance';
import { foundGame } from '../../src/engine/found';
import { bpCostOf } from '../../src/engine/world/works';
import { createVillage } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';

describe('IA-15/17/18 · recursos visibles', () => {
  it('el talador corta, vuelve cargado, descarga y retoma el tajo sin escribir en el motor', () => {
    const state = foundGame(7);
    const before = JSON.stringify(state);
    const life = Array.from({ length: 14 }, (_, day) => createVillage(state, day))
      .find(candidate => candidate.dwellers.some(dweller =>
        dweller.dayPlan?.job?.place.startsWith('felling:') === true));
    expect(life, 'alguna jornada representa la fracción semanal de tala').toBeDefined();
    if (life === undefined) return;

    let chopping = false;
    let hauling = false;
    let unloading = false;
    let haulingInterrupted = false;
    for (let step = 0; step < 7_200 && life.timberDeliveries === 0; step += 1) {
      life.step(0.45);
      haulingInterrupted ||= life.dwellers.some(dweller => dweller.holding !== null
        && dweller.holding < 0 && dweller.scene !== null);
      const actors = castOf(life, step / 30, new Map(), new Set());
      chopping ||= actors.some(actor => actor.clip === 'chop');
      hauling ||= actors.some(actor => actor.clip === 'carry_walk');
      unloading ||= actors.some(actor => actor.clip === 'sort'
        && life.dwellers.some(dweller => dweller.villager === actor.id
          && dweller.doing?.offer.id === 'deliver'));
    }
    expect(chopping).toBe(true);
    expect(hauling).toBe(true);
    expect(unloading).toBe(true);
    expect(haulingInterrupted, 'el porteador no deja la carga para charlar').toBe(false);
    expect(life.timberDeliveries).toBeGreaterThan(0);
    expect(life.props.some(prop => prop.kind === 'bundle' && prop.held === null)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('la misma jornada produce la misma secuencia logística', () => {
    const state = foundGame(11);
    const lives = [createVillage(state, 4), createVillage(state, 4)];
    for (let step = 0; step < 900; step += 1) for (const life of lives) life.step(0.45);
    const snapshot = (index: number) => lives[index]!.dwellers.map(dweller => ({
      id: dweller.villager,
      x: dweller.body.x,
      z: dweller.body.z,
      holding: dweller.holding,
      place: dweller.doing?.place.id ?? null,
    }));
    expect(snapshot(1)).toEqual(snapshot(0));
  });

  it('una obra de piedra manda al albañil a roca real, carga, descarga y vuelve sin inventario', () => {
    const state = foundGame(7);
    const house = state.buildings.find(building => building.kind === 'house')!;
    state.works = [{
      id: 77, kind: 'stone_house', x: house.x, y: house.y, w: house.w, h: house.h,
      bpCost: bpCostOf('stone_house'), bpDone: 0, materialsPaid: true,
      startedTick: state.tick, upgradeOf: house.id,
    }];
    const before = JSON.stringify(state);
    const life = Array.from({ length: 14 }, (_, day) => createVillage(state, day))
      .find(candidate => candidate.dwellers.some(dweller =>
        dweller.dayPlan?.job?.place.startsWith('quarry:') === true));
    expect(life, 'alguna jornada representa la fracción de cantera de la obra').toBeDefined();
    if (life === undefined) return;

    const mason = life.dwellers.find(dweller => dweller.dayPlan?.job?.place.startsWith('quarry:'))!;
    let quarrying = false, hauling = false, unloading = false, interrupted = false;
    for (let step = 0; step < 7_200 && life.stoneDeliveries === 0; step += 1) {
      life.step(0.45);
      interrupted ||= mason.holding !== null && mason.holding <= -1_000_000 && mason.scene !== null;
      const actor = castOf(life, step / 30, new Map(), new Set()).find(item => item.id === mason.villager);
      quarrying ||= actor?.clip === 'hammer' && mason.doing?.place.id.startsWith('quarry:') === true;
      hauling ||= actor?.clip === 'carry_walk' && actor.load === 'stone';
      unloading ||= actor?.clip === 'sort' && mason.doing?.offer.id === 'deliver-stone';
    }
    expect(quarrying).toBe(true);
    expect(hauling).toBe(true);
    expect(unloading).toBe(true);
    expect(interrupted).toBe(false);
    expect(life.stoneDeliveries).toBeGreaterThan(0);
    expect(life.props.some(prop => prop.kind === 'stone' && prop.held === null)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('la semana real de cosecha recoge, porta y guarda grano sin volver a producirlo', () => {
    const state = foundGame(11);
    state.tick = TIME.HARVEST_WEEK;
    const before = JSON.stringify(state);
    const life = Array.from({ length: 14 }, (_, day) => createVillage(state, day))
      .find(candidate => candidate.dwellers.some(dweller => dweller.dayPlan?.job?.offer === 'harvest'));
    expect(life, 'alguna jornada representa las manos agrícolas de la semana 35').toBeDefined();
    if (life === undefined) return;

    const farmer = life.dwellers.find(dweller => dweller.dayPlan?.job?.offer === 'harvest')!;
    let gathering = false, hauling = false, unloading = false, emptyDelivery = false, interrupted = false;
    for (let step = 0; step < 7_200 && life.harvestDeliveries === 0; step += 1) {
      life.step(0.45);
      const actor = castOf(life, step / 30, new Map(), new Set()).find(item => item.id === farmer.villager);
      gathering ||= actor?.clip === 'sort' && farmer.doing?.offer.id === 'harvest';
      hauling ||= actor?.clip === 'carry_walk' && actor.load === 'grain';
      unloading ||= actor?.clip === 'sort' && farmer.doing?.offer.id === 'deliver-grain';
      interrupted ||= farmer.holding !== null && farmer.holding <= -2_000_000 && farmer.scene !== null;
      emptyDelivery ||= life.dwellers.some(dweller => dweller.doing?.offer.id.startsWith('deliver') === true
        && dweller.holding === null);
    }
    expect(gathering).toBe(true);
    expect(hauling).toBe(true);
    expect(unloading).toBe(true);
    expect(interrupted).toBe(false);
    expect(emptyDelivery, 'nadie elige una descarga profesional con las manos vacías').toBe(false);
    expect(life.harvestDeliveries).toBeGreaterThan(0);
    expect(life.props.some(prop => prop.kind === 'grain' && prop.held === null)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('fuera de la siega no inventa portes y en invierno nadie ara', () => {
    for (const week of [TIME.HARVEST_WEEK - 1, TIME.HARVEST_WEEK + 1]) {
      const state = foundGame(11);
      state.tick = week;
      for (let day = 0; day < 7; day += 1) {
        const life = createVillage(state, day);
        expect(life.dwellers.some(dweller => dweller.dayPlan?.job?.offer === 'harvest')).toBe(false);
        if (week > TIME.HARVEST_WEEK) {
          expect(life.dwellers.some(dweller => dweller.dayPlan?.job?.place.startsWith('field:') === true),
            `semana ${week}: no se ara en invierno`).toBe(false);
        }
      }
    }
  });
});
