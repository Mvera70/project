import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foundTwenty } from '../helpers/founding';
import type { Building } from '../../src/engine/state';
import { DEFENCE_DIRECTIONS, defenceConnections } from '../../src/render3d/world/defences';
import { planChange, planFor } from '../../src/render3d/world/plan';
import { buildFromAsset } from '../../src/render3d/world/buildings';

const ROOT = resolve(import.meta.dirname, '..', '..');

function publishedGlb(id: string): ArrayBuffer {
  const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d', `${id}.glb`));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function wall(id: number, x: number, y: number, kind: 'wall' | 'palisade' = 'wall'): Building {
  return { id, x, y, kind, w: 1, h: 1, builtTick: 0, lostTick: null,
    blockedUntil: null, tier: kind === 'wall' ? 1 : 0, lit: false };
}

function bastion(id: number, x: number, y: number): Building {
  return { ...wall(id, x, y), kind: 'bastion' };
}

describe('G-21 · conexiones de defensas', () => {
  it('resuelve las 16 combinaciones, mezcla materiales y no cambia la partida', () => {
    for(let mask=0;mask<16;mask++) {
      const buildings=[wall(1,10,10),...DEFENCE_DIRECTIONS.filter(d=>mask&d.bit)
        .map((d,i)=>wall(i+2,10+d.x,10+d.z,'palisade'))];
      const before=JSON.stringify(buildings);
      expect(defenceConnections(buildings).get(1)).toBe(mask);
      expect(JSON.stringify(buildings)).toBe(before);
      expect(defenceConnections([...buildings].reverse()).get(1)).toBe(mask);
    }
  });
  it('conecta diagonales sin codo, no ruinas, y actualiza al vecino al construir o destruir', () => {
    const state=foundTwenty(7);
    state.buildings=[wall(1,10,10),wall(2,11,11)];
    const before=planFor(state);
    expect(before.buildings[0]?.connections).toBe(32);
    state.buildings.push(wall(3,11,10));
    const joined=planFor(state);
    expect(planChange(before,joined).changed.map(b=>b.id)).toEqual([1,2]);
    state.buildings[2]!.lostTick=1;
    state.map.ruins[10 * state.map.width + 11] = 1;
    const broken=planFor(state);
    expect(broken.buildings[0]?.connections).toBe(32);
    expect(broken.buildings[2]?.connections).toBeUndefined();
    expect(planChange(joined,broken).changed.map(b=>b.id)).toEqual([1,2,3]);
  });
  it('todas las orientaciones llegan a la linde y quedan dentro de su celda', () => {
    const state=foundTwenty(7);
    state.buildings=[wall(1,10,10)];
    const planned=planFor(state).buildings[0]!;
    const source=new Group();
    const mesh=new Mesh(new BoxGeometry(1,.8,.3),new MeshStandardMaterial());
    mesh.position.set(.5,.4,-.5);source.add(mesh);
    for(let mask=0;mask<256;mask++) {
      const model=buildFromAsset({...planned,connections:mask},source.clone(true));
      const bounds=new Box3().setFromObject(model.object);
      expect(bounds.min.x).toBeGreaterThanOrEqual(10-1e-6);
      expect(bounds.max.x).toBeLessThanOrEqual(11+1e-6);
      expect(bounds.min.z).toBeGreaterThanOrEqual(10-1e-6);
      expect(bounds.max.z).toBeLessThanOrEqual(11+1e-6);
      for(const d of DEFENCE_DIRECTIONS.filter(d=>mask&d.bit)) {
        const endpoint=new Vector3(10.5+d.x*.5,.4,10.5+d.z*.5);
        expect(bounds.distanceToPoint(endpoint)).toBeLessThan(1e-6);
      }
      model.dispose();
    }
    mesh.geometry.dispose();(mesh.material as MeshStandardMaterial).dispose();
  });
  it('el tramo llega también al portón real sin convertirlo en muro', () => {
    const gate = { ...wall(2, 11, 10), kind: 'gate' as const };
    const connections = defenceConnections([wall(1, 10, 10), gate]);
    expect(connections.get(1)).toBe(2);
    expect(connections.has(2)).toBe(false);
  });
  it('une cada cardinal y diagonal del bastión vivo, sin ensamblarlo ni unir su ruina', () => {
    for (const kind of ['wall', 'palisade'] as const) {
      for (const direction of DEFENCE_DIRECTIONS) {
        const connections = defenceConnections([wall(1, 10, 10, kind), bastion(2, 10 + direction.x, 10 + direction.z)]);
        expect(connections.get(1)).toBe(direction.bit);
        expect(connections.has(2)).toBe(false);
      }
    }
    const diagonal = defenceConnections([wall(1, 10, 10), bastion(2, 11, 11)]);
    expect(diagonal.get(1)).toBe(32);
    const ruined = bastion(2, 10, 9);
    ruined.lostTick = 1;
    expect(defenceConnections([wall(1, 10, 10), ruined]).get(1)).toBe(0);
  });
  it('planifica el bastión propio en su celda y reconstruye sólo el muro vecino al cambiar', () => {
    const state = foundTwenty(7);
    state.buildings = [wall(1, 10, 10)];
    const before = planFor(state);
    state.buildings.push(bastion(2, 10, 9));
    const joinedState = JSON.stringify(state);
    const joined = planFor(state);
    expect(JSON.stringify(state)).toBe(joinedState);
    const plannedBastion = joined.buildings.find((building) => building.id === 2)!;
    expect(plannedBastion.asset).toBe('bastion');
    expect(plannedBastion.connections).toBeUndefined();
    expect(planChange(before, joined).changed.map((building) => building.id)).toEqual([1]);
    const source = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1.36, 1), new MeshStandardMaterial());
    mesh.position.set(.5, .68, .5); source.add(mesh);
    const model = buildFromAsset(plannedBastion, source);
    const bounds = new Box3().setFromObject(model.object);
    expect(bounds.min.x).toBeCloseTo(10);
    expect(bounds.max.x).toBeCloseTo(11);
    expect(bounds.min.z).toBeCloseTo(9);
    expect(bounds.max.z).toBeCloseTo(10);
    model.dispose(); mesh.geometry.dispose(); (mesh.material as MeshStandardMaterial).dispose();
    state.buildings[1]!.lostTick = 1;
    state.map.ruins[9 * state.map.width + 10] = 1;
    const lostState = JSON.stringify(state);
    const lost = planFor(state);
    expect(JSON.stringify(state)).toBe(lostState);
    expect(lost.buildings.find((building) => building.id === 1)?.connections).toBe(0);
    expect(lost.buildings.find((building) => building.id === 2)?.connections).toBeUndefined();
    expect(planChange(joined, lost).changed.map((building) => building.id)).toEqual([1, 2]);
  });
  it('coloca el GLB publicado del bastión en una celda y lo mantiene más alto que el muro', async () => {
    const loader = new GLTFLoader();
    const [bastionGltf, wallGltf] = await Promise.all([
      loader.parseAsync(publishedGlb('bastion'), ''), loader.parseAsync(publishedGlb('wall'), ''),
    ]);
    const state = foundTwenty(7);
    state.buildings = [wall(1, 10, 10), bastion(2, 10, 9)];
    const planned = planFor(state);
    const plannedBastion = planned.buildings.find((building) => building.id === 2)!;
    const plannedWall = planned.buildings.find((building) => building.id === 1)!;
    expect(plannedWall.connections).toBe(1);
    const model = buildFromAsset(plannedBastion, bastionGltf.scene);
    const wallModel = buildFromAsset(plannedWall, wallGltf.scene);
    try {
      const bounds = new Box3().setFromObject(model.object);
      const wallBounds = new Box3().setFromObject(wallModel.object);
      expect(bounds.min.x).toBeCloseTo(10);
      expect(bounds.max.x).toBeCloseTo(11);
      expect(bounds.min.z).toBeCloseTo(9);
      expect(bounds.max.z).toBeCloseTo(10);
      expect(bounds.getSize(new Vector3()).y).toBeGreaterThan(wallBounds.getSize(new Vector3()).y);
      expect(wallBounds.min.x).toBeGreaterThanOrEqual(10 - 1e-6);
      expect(wallBounds.max.x).toBeLessThanOrEqual(11 + 1e-6);
      expect(wallBounds.min.z).toBeCloseTo(10);
      expect(wallBounds.max.z).toBeLessThanOrEqual(11 + 1e-6);
      expect(wallBounds.min.z).toBeCloseTo(bounds.max.z);
    } finally { model.dispose(); wallModel.dispose(); }
  });
});
