import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { AnimationMixer, Bone, SkinnedMesh, Vector3 } from 'three';
import { loadAssets } from '../../src/render3d/assets';
import { Fauna } from '../../src/render3d/effects/fauna';
import type { AnimalKind } from '../../src/derive/animals';

const manifest=JSON.parse(readFileSync('public/assets/valley3d/manifest.json','utf8')) as {schemaVersion:1;generatedAt:string;assets:Array<{id:string;file:string;motion:Array<{name:string}>}>};
const species:AnimalKind[]=['cow','pig','hen','wolf','crow','fish'];
const animated=manifest.assets.filter(a=>species.includes(a.id as AnimalKind)&&a.motion.some(c=>c.name==='walk'));
async function library(id:string){
  const bytes=Uint8Array.from(readFileSync(`public/assets/valley3d/${id}.glb`)).buffer;
  return loadAssets({baseUrl:'/',manifest:{...manifest,assets:manifest.assets.filter(a=>a.id===id)},bytes:{[id]:bytes}});
}
describe('G-23 · animales publicados, articulados en el camino vivo',()=>{
  it.each(animated.map(a=>a.id))('%s: clips cerrados, huesos vivos y geometría finita',async id=>{
    const lib=await library(id),asset=lib.get(id)!,object=lib.instance(id)!;
    const mixer=new AnimationMixer(object);
    for(const clip of asset.clips){
      mixer.stopAllAction();const action=mixer.clipAction(clip).play();
      const poses:number[][]=[];
      for(const t of [0,clip.duration*.25,clip.duration*.5,clip.duration-1e-6]){
        action.time=t;mixer.update(0);object.updateMatrixWorld(true);const pose:number[]=[];
        object.traverse(n=>{
          if(n instanceof Bone)pose.push(...n.matrixWorld.elements);
          if(n instanceof SkinnedMesh){n.skeleton.update();for(let i=0;i<n.geometry.getAttribute('position').count;i+=13)expect(n.getVertexPosition(i,new Vector3()).toArray().every(Number.isFinite)).toBe(true);}
        });poses.push(pose);
      }
      expect(poses[0]!.length).toBeGreaterThan(32);
      expect(Math.max(...poses[0]!.map((v,i)=>Math.abs(v-poses[3]![i]!)))).toBeLessThan(.0001);
      expect(Math.max(...poses[0]!.map((v,i)=>Math.abs(v-poses[1]![i]!)))).toBeGreaterThan(.01);
    }
    mixer.stopAllAction();mixer.uncacheRoot(object);lib.dispose();
  });
  it('la marcha sigue la distancia, respeta la pausa y conserva el cuerpo entre fotogramas',async()=>{
    const lib=await library('cow'),fauna=new Fauna(k=>lib.instance(k),k=>lib.get(k));
    const at=(x:number,y:number,t:number)=>fauna.paint([{id:12,kind:'cow',x,y}],t);
    at(0,0,0);const body=fauna.group.children[0]!;
    for(let i=1;i<=120;i++)at(0,i*.001,i/60);
    expect(fauna.group.children[0]).toBe(body);
    expect(body.rotation.y).toBeCloseTo(Math.PI/2,2);
    body.updateMatrixWorld(true);const before=body.getObjectByName('foreL')!.quaternion.toArray();
    at(0,.12,2);expect(body.getObjectByName('foreL')!.quaternion.toArray()).toEqual(before);
    const geom:unknown[]=[];body.traverse(n=>{if(n instanceof SkinnedMesh)geom.push(n.geometry);});
    fauna.paint([{id:12,kind:'cow',x:0,y:.12},{id:13,kind:'cow',x:1,y:1}],2.1);
    const other=fauna.group.children[1]!;
    expect(other.getObjectByName('foreL')).not.toBe(body.getObjectByName('foreL'));
    other.traverse(n=>{if(n instanceof SkinnedMesh)expect(geom).toContain(n.geometry);});
    fauna.paint([],3);expect(fauna.count).toBe(0);expect(fauna.group.children).toHaveLength(0);
    fauna.dispose();lib.dispose();
  });
});
