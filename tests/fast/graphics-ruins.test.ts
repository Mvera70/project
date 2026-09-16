import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { buildFromAsset } from '../../src/render3d/world/buildings';
import { planFor } from '../../src/render3d/world/plan';
import { foundTwenty } from '../helpers/founding';

describe('G-21 · ruinas dentro de su parcela', () => {
  it.each([[1,1],[2,2],[3,2],[3,3]])('ajusta %s×%s sin cambiar altura ni geometría compartida', (w,h) => {
    const state=foundTwenty(7), building=state.buildings[0]!;
    building.lostTick=1;building.w=w;building.h=h;state.buildings=[building];
    for(let z=building.y;z<building.y+h;z++)for(let x=building.x;x<building.x+w;x++)state.map.ruins[z*state.map.width+x]=1;
    const planned=planFor(state).buildings.find(b=>b.id===building.id)!;
    const source=new Group(),geometry=new BoxGeometry(2.1,.7,2.1);
    const mesh=new Mesh(geometry,new MeshStandardMaterial());
    mesh.position.set(1,.35,-1);source.add(mesh);
    const vertices=Array.from(geometry.getAttribute('position').array);
    const model=buildFromAsset(planned,source.clone(true));
    const bounds=new Box3().setFromObject(model.object);
    expect(bounds.min.x).toBeCloseTo(planned.x);
    expect(bounds.max.x).toBeCloseTo(planned.x+w);
    expect(bounds.min.z).toBeCloseTo(planned.z);
    expect(bounds.max.z).toBeCloseTo(planned.z+h);
    expect(bounds.max.y-bounds.min.y).toBeCloseTo(.7);
    model.dispose();
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(vertices);
    geometry.dispose();mesh.material.dispose();
  });
});
