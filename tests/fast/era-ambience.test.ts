// E0e · Los acabados de era son una lectura del estado, nunca una regla nueva.

import { describe, expect, it } from 'vitest';
import { PALETTES } from '@derive/palette';
import { tellsFor } from '@derive/tells';
import { foundTwenty } from '../helpers/founding';
import { fingerprint } from '../helpers/fingerprint';
import { Tells } from '../../src/render3d/effects/tells';
import { cellColour, groundAppearanceKey } from '../../src/render3d/world/ground';
import { PlazaFountain } from '../../src/render3d/world/plaza';

function village() {
  return foundTwenty(7);
}

describe('E0e · ambiente de las eras', () => {
  it('asienta sólo caminos reales, sin tapar plaza ni vado', () => {
    const state = village();
    const map = structuredClone(state.map);
    const bare = 0;
    const track = 10;
    const road = 11;
    const paving = 12;
    const ford = 13;
    map.terrain.fill(0);
    map.path.fill(0);
    map.path[track] = 1;
    map.path[road] = 2;
    map.path[paving] = 3;
    map.terrain[ford] = 8;
    const plaza = { x: 1.5, y: 1.5, radius: 1.1 };
    const palette = PALETTES.summer;

    expect(cellColour(map, bare, palette, plaza, 'hamlet')).toBe(cellColour(map, bare, palette, plaza, 'town'));
    expect(cellColour(map, track, palette, plaza, 'town')).not.toBe(cellColour(map, road, palette, plaza, 'town'));
    expect(cellColour(map, road, palette, plaza, 'town')).not.toBe(cellColour(map, paving, palette, plaza, 'town'));
    expect(cellColour(map, ford, palette, plaza, 'hamlet')).toBe(cellColour(map, ford, palette, plaza, 'town'));
    // La plaza pisa la celda (1, 1), aunque tenga el máximo desgaste debajo.
    map.path[map.width + 1] = 3;
    expect(cellColour(map, map.width + 1, palette, plaza, 'hamlet')).toBe(cellColour(map, map.width + 1, palette, plaza, 'town'));
  });

  it('cambia la firma de suelo al cambiar sólo la era', () => {
    expect(groundAppearanceKey(123, 'hamlet')).not.toBe(groundAppearanceKey(123, 'village'));
    expect(groundAppearanceKey(123, 'village')).not.toBe(groundAppearanceKey(123, 'town'));
  });

  it('mantiene fuente y pasos libres, y no duplica los complementos', () => {
    const plaza = new PlazaFountain();
    const at = { x: 10, y: 12 };
    const ground = () => 0;
    plaza.show(at, ground, 'hamlet');
    expect(plaza.group.children).toHaveLength(1);
    const fountain = plaza.group.children[0];

    const free = (x: number, z: number): boolean => x > 10.9 && x < 11.6 && z > 12.95 && z < 13.55;
    plaza.show(at, ground, 'village', free);
    expect(plaza.group.children[0]).toBe(fountain);
    expect(plaza.group.children).toHaveLength(2);
    const villageProps = plaza.group.children[1];
    expect(villageProps?.children).toHaveLength(2);
    for (const prop of villageProps?.children ?? []) expect(free(prop.position.x, prop.position.z)).toBe(true);
    plaza.show(at, ground, 'village', free);
    expect(plaza.group.children[1]).toBe(villageProps);

    plaza.show(at, ground, 'town', free);
    expect(plaza.group.children).toHaveLength(2);
    expect(plaza.group.children[1]?.children.length).toBeLessThanOrEqual(8);
    for (const prop of plaza.group.children[1]?.children ?? []) expect(free(prop.position.x, prop.position.z)).toBe(true);
    plaza.show({ x: 20, y: 22 }, ground, 'hamlet');
    expect(plaza.group.children).toHaveLength(1);
    plaza.dispose();
    expect(plaza.group.children).toHaveLength(0);
  });

  it('no cambia qué hogares humean y la villa hace más presente la misma señal', () => {
    const state = village();
    const before = fingerprint(state);
    const smoke = tellsFor(state).filter((tell) => tell.kind === 'smoke');
    expect(smoke.length).toBeGreaterThan(0);
    const tells = new Tells();

    tells.update(state, new Map(), 'hamlet');
    const hamlet = tells.group.children.filter((child) => child.userData.plume !== undefined);
    tells.update(state, new Map(), 'town');
    const town = tells.group.children.filter((child) => child.userData.plume !== undefined);
    expect(hamlet).toHaveLength(smoke.length * 3);
    expect(town).toHaveLength(smoke.length * 4);
    expect(fingerprint(state)).toBe(before);
    tells.dispose();
  });
});
