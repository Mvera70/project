import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { foundTwenty } from '../helpers/founding';
import type { Building } from '../../src/engine/state';
import { DEFENCE_DIRECTIONS, defenceConnections } from '../../src/render3d/world/defences';
import { planChange, planFor } from '../../src/render3d/world/plan';
import { buildFromAsset } from '../../src/render3d/world/buildings';

function wall(id: number, x: number, y: number, kind: 'wall' | 'palisade' = 'wall'): Building {
  return { id, x, y, kind, w: 1, h: 1, builtTick: 0, lostTick: null,
    blockedUntil: null, tier: kind === 'wall' ? 1 : 0, lit: false };
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
});
