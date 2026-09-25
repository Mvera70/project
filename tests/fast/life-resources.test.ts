import { describe, expect, it } from 'vitest';
import { TIME } from '../../src/engine/balance';
import { foundGame } from '../../src/engine/found';
import { bpCostOf } from '../../src/engine/world/works';
import { createVillage } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';
import { foundTwenty } from '../helpers/founding';

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
    // IA-piles · Con la leñera fuera de la plaza, en la aldea recién fundada de
    // la semilla 7 cae en la celda donde se tala (3705): se entrega sin andar.
    // El porte tiene que verse cuando la descarga queda a más de un paso.
    const store = life.places.find(place => place.id.startsWith('wood-store:'))!;
    const tajo = life.places.find(place => place.id.startsWith('felling:'))!;
    const apart = Math.hypot(store.at.x - tajo.at.x, store.at.z - tajo.at.z) > 1.5;
    if (apart) expect(hauling).toBe(true);
    expect(unloading).toBe(true);
    expect(haulingInterrupted, 'el porteador no deja la carga para charlar').toBe(false);
    expect(life.timberDeliveries).toBeGreaterThan(0);
    // IA-piles · la carga se guarda en el leñero: ningún haz se queda suelto en el suelo.
    expect(life.props.some(prop => prop.kind === 'bundle' && prop.held === null)).toBe(false);
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

  it('los porteadores de madera hacen cola sin compartir una plaza de descarga ni perder el haz', () => {
    const state = foundTwenty(7);
    const before = JSON.stringify(state);
    const life = createVillage(state, 0);
    const mirror = createVillage(foundTwenty(7), 0);
    const store = life.places.find(place => place.id.startsWith('wood-store:'))!;
    const delivery = store.offers.find(offer => offer.id === 'deliver')!;
    expect(life.dwellers.filter(dweller => dweller.dayPlan?.job?.place.startsWith('felling:')).length)
      .toBeGreaterThan(delivery.seats);

    let sawQueue = false;
    // A las diez (fase 0,38) y no a las once: desde el 25 sep 2026 las once son
    // la hora de comer en corro en la plaza, y con los leñadores comiendo no
    // llegan tres haces a la vez. La cola se mide en hora de faena.
    for (let step = 0; step < 4_800; step += 1) {
      life.step(0.38);
      mirror.step(0.38);
      const carriers = life.dwellers.filter(dweller => dweller.holding === -1 - dweller.body.id);
      const unloading = carriers.filter(dweller => dweller.doing?.place.id === store.id
        && dweller.doing.offer.id === 'deliver');
      const seats = unloading.map(dweller => dweller.doing!.seat);
      expect(unloading.length).toBeLessThanOrEqual(delivery.seats);
      expect(new Set(seats).size).toBe(seats.length);
      const waiting = carriers.filter(dweller => dweller.doing?.offer.id === 'pause');
      sawQueue ||= waiting.length > 0;
      expect(carriers.every(dweller => dweller.doing?.offer.id === 'deliver'
        || dweller.doing?.offer.id === 'pause')).toBe(true);
    }
    expect(sawQueue, 'cuando la leñera se llena, el tercer haz espera fuera de su puerta').toBe(true);
    expect(life.timberDeliveries).toBeGreaterThan(delivery.seats);
    expect(life.props.filter(prop => prop.kind === 'bundle' && prop.held === null)).toHaveLength(0);
    expect(mirror.timberDeliveries).toBe(life.timberDeliveries);
    expect(mirror.dwellers.map(dweller => ({
      id: dweller.villager, x: dweller.body.x, z: dweller.body.z, holding: dweller.holding,
      place: dweller.doing?.place.id ?? null, seat: dweller.doing?.seat ?? null,
    }))).toEqual(life.dwellers.map(dweller => ({
      id: dweller.villager, x: dweller.body.x, z: dweller.body.z, holding: dweller.holding,
      place: dweller.doing?.place.id ?? null, seat: dweller.doing?.seat ?? null,
    })));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('una obra de piedra manda al albañil a roca real, carga, descarga y vuelve sin inventario', () => {
    const state = foundGame(7);
    const house = state.buildings.find(building => building.kind === 'house')!;
    state.works = [{
      id: 77, kind: 'stone_house', x: house.x, y: house.y, w: house.w, h: house.h,
      bpCost: bpCostOf('stone_house'), bpDone: 0, stoneDone: 0, materialsPaid: true,
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
      // IA-anim: en la cantera se pica con pico (`mine`), no con el martillo de la fragua.
      quarrying ||= actor?.clip === 'mine' && mason.doing?.place.id.startsWith('quarry:') === true;
      hauling ||= actor?.clip === 'carry_walk' && actor.load === 'stone';
      unloading ||= actor?.clip === 'sort' && mason.doing?.offer.id === 'deliver-stone';
    }
    expect(quarrying).toBe(true);
    expect(hauling).toBe(true);
    expect(unloading).toBe(true);
    expect(interrupted).toBe(false);
    expect(life.stoneDeliveries).toBeGreaterThan(0);
    // IA-piles · la piedra la consume la obra: no queda un canto suelto al lado.
    expect(life.props.some(prop => prop.kind === 'stone' && prop.held === null)).toBe(false);
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
    // Hasta que **este** campesino descargue: con el ganado fuera de los campos
    // (IA-pasture) cambia el ritmo y a veces entrega antes otro vecino, y parar
    // en la primera entrega de cualquiera dejaba a éste a medio cosechar.
    for (let step = 0; step < 7_200 && !(unloading && farmer.holding === null); step += 1) {
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
    // IA-piles · el grano entra en el granero: ningún saco se queda fuera.
    expect(life.props.some(prop => prop.kind === 'grain' && prop.held === null)).toBe(false);
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
