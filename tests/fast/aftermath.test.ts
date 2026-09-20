// E0c · La semana posterior sólo representa lo que el motor ya resolvió.

import { describe, expect, it } from 'vitest';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fitsCircle } from '../../src/render3d/life/body';
import { aftermathProps } from '../../src/render3d/life/aftermath';
import { createVillage } from '../../src/render3d/life/village';
import { foundTwenty } from '../helpers/founding';
import type { GameState } from '@engine/state';

function sacked(seed: number, beast = false): GameState {
  const state = foundTwenty(seed);
  state.tick = 100;
  state.threat.arrivedTick = 99;
  state.flags['just_sacked'] = 147;
  state.chronicle.push({ tick: 99, kind: 'raid', templateKey: 'raid.open', params: {}, weight: 3 });
  if (beast) state.chronicle.push({ tick: 99, kind: 'raid', templateKey: 'raid.beast', params: {}, weight: 2 });
  return state;
}

describe('E0c · la semana posterior al saqueo', () => {
  it.each([7, 23])('vive sólo en el tick posterior y se reconstruye idéntica en semilla %i', (seed) => {
    const state = sacked(seed);
    const land = terrainOf(state);
    const first = aftermathProps(state, land);
    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(first.length).toBeLessThanOrEqual(3);
    expect(aftermathProps(state, land)).toEqual(first);
    for (let day = 0; day < 7; day += 1) expect(aftermathProps(state, land)).toEqual(first);
    state.tick = 99;
    expect(aftermathProps(state, land)).toEqual([]);
    state.tick = 101;
    expect(aftermathProps(state, land)).toEqual([]);
  });

  it('exige llegada, marca vigente, crónica y un valle vivo', () => {
    const state = sacked(7);
    const land = terrainOf(state);
    delete state.flags['just_sacked'];
    expect(aftermathProps(state, land)).toEqual([]);
    state.flags['just_sacked'] = 147;
    state.flags['just_sacked'] = 100;
    expect(aftermathProps(state, land)).toEqual([]);
    state.flags['just_sacked'] = 147;
    state.chronicle = state.chronicle.filter((entry) => entry.tick !== 99);
    expect(aftermathProps(state, land)).toEqual([]);
    state.chronicle.push({ tick: 99, kind: 'raid', templateKey: 'raid.open', params: {}, weight: 3 });
    state.ended = { tick: 100, cause: 'stormed', lastId: null };
    expect(aftermathProps(state, land)).toEqual([]);
  });

  it('pone sólo suelo honesto junto a un edificio real y se reduce si no lo hay', () => {
    const state = sacked(23);
    const land = terrainOf(state);
    const props = aftermathProps(state, land);
    const buildings = state.buildings.filter((building) => building.lostTick === null);
    expect(props.every((prop) => fitsCircle(land, prop.x, prop.z, 0.11))).toBe(true);
    expect(props.every((prop) => buildings.some((building) => Math.hypot(
      prop.x - (building.x + building.w / 2), prop.z - (building.y + building.h / 2),
    ) < 5))).toBe(true);
    const fields = buildings.filter((building) => building.kind === 'field');
    expect(props.every((prop) => fields.every((field) => {
      const nearX = Math.max(field.x - 0.9, Math.min(prop.x, field.x + field.w + 0.9));
      const nearZ = Math.max(field.y - 0.9, Math.min(prop.z, field.y + field.h + 0.9));
      return Math.hypot(prop.x - nearX, prop.z - nearZ) > 0.05;
    }))).toBe(true);
    const closed = { ...land, blocked: new Uint8Array(land.blocked.length).fill(1) };
    expect(aftermathProps(state, closed)).toEqual([]);
  });

  it('sólo dibuja los dos travesaños cuando la crónica confirma la bestia', () => {
    const plain = sacked(7);
    const beast = sacked(7, true);
    const plainProps = aftermathProps(plain, terrainOf(plain));
    const beastProps = aftermathProps(beast, terrainOf(beast));
    expect(beastProps.filter((prop) => prop.kind === 'bundle')).toHaveLength(
      plainProps.filter((prop) => prop.kind === 'bundle').length + 2,
    );
  });

  it('es inerte: no se guarda, no se recoge y no altera la partida', () => {
    const state = sacked(23, true);
    const before = JSON.stringify(state);
    const life = createVillage(state, 0);
    const remnants = life.props.filter((prop) => prop.id <= -3_200_000);
    expect(remnants.length).toBeGreaterThanOrEqual(4);
    expect(remnants.every((prop) => prop.fixed && prop.held === null && prop.restUntil === Infinity)).toBe(true);
    for (let step = 0; step < 240; step += 1) life.step();
    expect(remnants.every((prop) => prop.held === null)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });
});
