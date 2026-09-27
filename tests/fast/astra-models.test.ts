// Los modelos de Astra en el valle. 27 sep 2026.
//
// Lo que se guarda: con el modelo publicado, el puesto, la cantera y las rocas
// usan el de Astra; sin él, el respaldo de siempre. Y la cantera cambia de
// estado con lo que la obra lleva sacado.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { buildFromAsset } from '../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../src/render3d/world/plan';
import { createStalls, STALL_ASSETS } from '../../src/render3d/effects/stalls';
import { createQuarryFace, quarryStage } from '../../src/render3d/world/quarry-face';
import { buildCrags, rockGeometry } from '../../src/render3d/world/mountains';
import { PALETTES } from '@derive/palette';

const flat = (): number => 0;
const named = (name: string): Group => {
  const group = new Group();
  group.name = name;
  group.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));
  return group;
};

describe('los modelos de Astra', () => {
  it('cada puesto usa su modelo publicado, y sin él el de respaldo', () => {
    const asked: string[] = [];
    const stalls = createStalls((kind) => { asked.push(STALL_ASSETS[kind]); return named(STALL_ASSETS[kind]); });
    stalls.show([{ id: 1, kind: 'pedlar', x: 3, z: 3, facing: 0 }, { id: 2, kind: 'salt_visit', x: 5, z: 3, facing: 0 }], flat);
    expect(asked).toEqual(['stall-pedlar', 'stall-salter']);
    expect(stalls.group.getObjectByName('stall-pedlar')).toBeDefined();
    const fallback = createStalls(() => undefined);
    fallback.show([{ id: 1, kind: 'factor_visit', x: 3, z: 3, facing: 0 }], flat);
    expect(fallback.shown).toBe(1);
    expect(fallback.group.children.length).toBeGreaterThan(1);
  });

  it('la cantera pasa de entera a explotada y a agotada con la piedra sacada', () => {
    expect(quarryStage(0, 30)).toBe('intact');
    expect(quarryStage(15, 30)).toBe('mined');
    expect(quarryStage(29, 30)).toBe('exhausted');
    const quarry = createQuarryFace();
    quarry.show(5 * 10 + 4, 'mined', 10, { x: 0, z: 0 }, flat, (id) => named(id));
    expect(quarry.group.getObjectByName('quarry-face-mined')).toBeDefined();
    quarry.show(null, 'intact', 10, { x: 0, z: 0 }, flat, (id) => named(id));
    expect(quarry.group.children.length).toBe(0);
  });

  it('los peñascos usan las formas de Astra cuando llegan', () => {
    const shapes = [1, 2, 3].map(() => rockGeometry(named('crag'))!);
    const crags = buildCrags([{ x: 0, y: 0, z: 0, size: 0.5, turn: 0, tilt: 0, shade: 0 }], PALETTES.spring, shapes);
    const mesh = crags.group.children[0] as Mesh;
    expect(shapes).toContain(mesh.geometry);
    crags.dispose();
  });
});

describe('la sala del líder', () => {
  it('cae dentro de su solar de 3 × 3 y trae la puerta que abre el juego', async () => {
    // La casa larga de Astra (27 sep 2026) sale de 0 a 3 en Z, como el bastión
    // G-26: colocada con la regla de los demás caería tres celdas al sur.
    const bytes = readFileSync(resolve(import.meta.dirname, '..', '..', 'public/assets/valley3d/hall.glb'));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
    const planned = {
      id: 1, kind: 'hall', x: 10, z: 20, w: 3, h: 3, ruin: false, walls: 0.93, roof: 0.62,
      wallColour: '#ffffff', roofColour: '#773B42', roofed: true, asset: 'hall',
    } as unknown as PlannedBuilding;
    const model = buildFromAsset(planned, gltf.scene);
    model.object.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model.object);
    expect(bounds.min.x).toBeGreaterThanOrEqual(10 - 0.05);
    expect(bounds.max.x).toBeLessThanOrEqual(13 + 0.05);
    expect(bounds.min.z).toBeGreaterThanOrEqual(20 - 0.05);
    expect(bounds.max.z).toBeLessThanOrEqual(23 + 0.05);
    expect(model.object.getObjectByName('hall_door')).toBeDefined();
  });
});
