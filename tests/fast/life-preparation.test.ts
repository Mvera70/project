// E0a · La aldea se prepara para el asedio.
//
// Se guardan las propiedades visibles: ventana exacta de la decisión, reparto
// determinista sin desmontar la guarnición, viajes con carga y ganado bajo
// techo. La escena es efímera: también se compara el estado byte a byte.

import { describe, expect, it } from 'vitest';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { bracedNow, comingNow } from '../../src/ui/debug';
import { castOf } from '../../src/render3d/life/cast';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { doorOf } from '../../src/render3d/life/offers';
import { preparationActive } from '../../src/render3d/life/preparation';
import { createVillage, type Village } from '../../src/render3d/life/village';

function openLand(state: GameState) {
  return {
    width: state.map.width,
    height: state.map.height,
    blocked: new Uint8Array(state.map.width * state.map.height),
  };
}

/** Una aldea con carga exterior, almacén y puestos reales de guarnición. */
function preparedState(seed = 7): GameState {
  const state = foundTwenty(seed);
  let id = state.buildings.reduce((next, building) => Math.max(next, building.id + 1), 0);
  const put = (kind: 'granary' | 'gate' | 'palisade' | 'watchtower', x: number, y: number): void => {
    state.buildings.push({
      id: id++, kind, x, y, w: 1, h: 1, builtTick: state.tick,
      lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
  };
  put('granary', 37, 51);
  put('gate', 30, 40);
  put('palisade', 31, 40);
  put('palisade', 32, 40);
  put('watchtower', 33, 41);
  state.traits = ['arms', 'bows'];
  state.herd = { hens: 4, pigs: 2, cows: 2 };
  bracedNow(state, 2);
  return state;
}

function preparation(state: GameState, day = 0): Village {
  return createVillage(state, day, { land: openLand(state) });
}

describe('E0a · ventana de preparación', () => {
  it('exige a la vez bandera vigente, partida en camino y llegada futura', () => {
    const state = foundTwenty(7);
    bracedNow(state, 2);
    expect(preparationActive(state)).toBe(true);

    const noFlag = structuredClone(state);
    delete noFlag.flags['braced'];
    expect(preparationActive(noFlag)).toBe(false);

    const expired = structuredClone(state);
    // Cero significa permanente en el contrato de banderas; una caducada de
    // verdad queda por detrás del tick actual.
    expired.flags['braced'] = expired.tick - 1;
    expect(preparationActive(expired)).toBe(false);

    const noBand = structuredClone(state);
    noBand.threat.comingTick = null;
    expect(preparationActive(noBand)).toBe(false);

    const arrived = structuredClone(state);
    arrived.threat.comingTick = arrived.tick;
    expect(preparationActive(arrived)).toBe(false);
  });

  it('la captura distingue la decisión real de una víspera genérica', () => {
    const braced = foundTwenty(11);
    bracedNow(braced, 2);
    expect(preparationActive(braced)).toBe(true);
    expect(braced.flags['braced']).toBeGreaterThan(braced.tick);

    const control = foundTwenty(11);
    comingNow(control, 2);
    expect(control.threat.comingTick).toBe(braced.threat.comingTick);
    expect(control.threat.comingBand).toBe(braced.threat.comingBand);
    expect(control.flags['braced']).toBeUndefined();
    expect(preparationActive(control)).toBe(false);
  });
});

describe('E0a · porteadores y guarnición', () => {
  it('reparte determinísticamente entre adultos y nunca elige un puesto defensivo', () => {
    const state = preparedState(7);
    const first = preparation(state, 3);
    const second = preparation(structuredClone(state), 3);
    const compact = (life: Village) => life.preparation.porters.map(porter => ({
      id: porter.villager,
      load: porter.load,
      source: porter.source.id,
      target: porter.target.id,
      sourceRoute: porter.toSource,
      targetRoute: porter.toTarget,
    }));
    expect(compact(second)).toEqual(compact(first));

    const defenders = new Set(first.dwellers
      .filter(dweller => dweller.dayPlan?.job?.place.startsWith('post:'))
      .map(dweller => dweller.villager));
    expect(defenders.size).toBeGreaterThan(0);
    expect(first.preparation.porters.every(porter => !defenders.has(porter.villager))).toBe(true);
  });

  it('manda de dos a cuatro cargas por rutas reales hacia granero o casa', () => {
    const state = preparedState(23);
    const life = preparation(state, 4);
    expect(life.preparation.porters.length).toBeGreaterThanOrEqual(2);
    expect(life.preparation.porters.length).toBeLessThanOrEqual(4);
    for (const porter of life.preparation.porters) {
      expect(porter.toSource.length, `${porter.villager}: ida`).toBeGreaterThan(0);
      expect(porter.toTarget.length, `${porter.villager}: vuelta`).toBeGreaterThan(0);
      expect(porter.source.id).toMatch(/^prepare-source:(field|wood-store):/);
      expect(porter.target.id).toMatch(/^prepare-store:/);
    }

    let maxLoaded = 0;
    let carryWalk = false;
    for (let step = 0; step < STEPS_PER_DAY; step += 1) {
      life.step(0.35);
      const porters = new Set(life.preparation.porters.map(porter => porter.villager));
      const cast = castOf(life, step / 30, new Map(), new Set());
      maxLoaded = Math.max(maxLoaded, cast.filter(actor => porters.has(actor.id) && actor.load !== null).length);
      carryWalk ||= cast.some(actor => porters.has(actor.id) && actor.load !== null && actor.clip === 'carry_walk');
      if (life.preparation.deliveries >= life.preparation.porters.length) break;
    }
    expect(maxLoaded).toBeGreaterThanOrEqual(2);
    expect(carryWalk).toBe(true);
    expect(life.preparation.deliveries).toBe(life.preparation.porters.length);
  });
});

describe('E0a · ganado y pureza', () => {
  it('las vacas dejan el campo por casas alcanzables y sin preparación conservan exactamente su reparto', () => {
    const base = preparedState(41);
    delete base.flags['braced'];
    const peaceful = structuredClone(base);
    peaceful.threat.comingTick = null;
    const genericEve = preparation(base, 5);
    const normal = preparation(peaceful, 5);
    expect(genericEve.beasts.map(beast => ({ kind: beast.kind, anchor: beast.anchor })))
      .toEqual(normal.beasts.map(beast => ({ kind: beast.kind, anchor: beast.anchor })));

    const braced = structuredClone(base);
    braced.flags['braced'] = braced.tick + 2;
    const secure = preparation(braced, 5);
    const normalCows = normal.beasts.filter(beast => beast.kind === 'cow').map(beast => beast.anchor);
    const secureCows = secure.beasts.filter(beast => beast.kind === 'cow').map(beast => beast.anchor);
    expect(secureCows).not.toEqual(normalCows);
    expect(secure.beasts).toHaveLength(normal.beasts.length);
    expect(secure.beasts.filter(beast => beast.kind === 'cow')).toHaveLength(braced.herd.cows);

    const land = openLand(braced);
    const houseDoors = braced.buildings
      .filter(building => (building.kind === 'house' || building.kind === 'stone_house') && building.lostTick === null)
      .map(building => doorOf(land, building.x, building.y, building.w, building.h))
      .filter((door): door is { x: number; z: number } => door !== null);
    for (const anchor of secureCows) {
      expect(Math.min(...houseDoors.map(door => Math.hypot(anchor.x - door.x, anchor.z - door.z))))
        .toBeLessThanOrEqual(1.41);
    }
  });

  it('construir y avanzar la jornada no escribe ni una coma en GameState', () => {
    for (const seed of [7, 23]) {
      const state = preparedState(seed);
      const before = JSON.stringify(state);
      const life = preparation(state, seed);
      for (let step = 0; step < STEPS_PER_DAY; step += 1) life.step(step / STEPS_PER_DAY);
      expect(JSON.stringify(state), `semilla ${seed}`).toBe(before);
    }
  });
});
