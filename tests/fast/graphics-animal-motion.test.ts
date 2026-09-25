import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { AnimationMixer, Bone, Mesh, SkinnedMesh, Vector3, type Object3D } from 'three';
import { loadAssets } from '../../src/render3d/assets';
import { Fauna } from '../../src/render3d/effects/fauna';
import type { AnimalKind } from '../../src/derive/animals';

const manifest=JSON.parse(readFileSync('public/assets/valley3d/manifest.json','utf8')) as {schemaVersion:1;generatedAt:string;assets:Array<{id:string;file:string;motion:Array<{name:string}>}>};
const species:AnimalKind[]=['cow','pig','hen','wolf','crow','fish','dog','mule','boar','bear','partridge'];
// Los animales de Vera (25 sep 2026) son de nodos rígidos, sin huesos: sus
// articulaciones son los nodos que mueven los clips, y su pie, el punto más bajo
// de cada pata (`tools/art/rigid-clips.mjs`). La propiedad es la misma.
const jointsOf=(object:Object3D,names:Set<string>):Object3D[]=>{const out:Object3D[]=[];object.traverse(n=>{if(n instanceof Bone||names.has(n.name))out.push(n);});return out;};
const feetOf=(object:Object3D):Map<string,Vector3>=>{
  const feet=new Map<string,Vector3>();
  object.traverse(n=>{
    if(n instanceof Bone&&n.name.endsWith('Foot'))feet.set(n.name,n.getWorldPosition(new Vector3()));
    else if(!(n instanceof Bone)&&/^((fore|hind)[LR]Lower|foot[LR])$/u.test(n.name)){
      // El apoyo es el vértice más bajo de la pata, no el centro de su caja:
      // ese se mueve menos que el pie cuando la pata gira.
      let low:Vector3|null=null;const v=new Vector3();
      n.traverse(m=>{if(m instanceof Mesh){const pos=m.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);if(low===null||v.y<low.y)low=v.clone();}}});
      if(low!==null)feet.set(n.name,low);
    }
  });
  return feet;
};
const animated=manifest.assets.filter(a=>species.includes(a.id as AnimalKind)&&a.motion.some(c=>c.name==='walk'));
async function library(id:string){
  const bytes=Uint8Array.from(readFileSync(`public/assets/valley3d/${id}.glb`)).buffer;
  return loadAssets({baseUrl:'/',manifest:{...manifest,assets:manifest.assets.filter(a=>a.id===id)},bytes:{[id]:bytes}});
}
describe('G-23 · animales publicados, articulados en el camino vivo',()=>{
  it.each(animated.map(a=>a.id))('%s: clips cerrados, huesos vivos y geometría finita',async id=>{
    const lib=await library(id),asset=lib.get(id)!,object=lib.instance(id)!;
    const mixer=new AnimationMixer(object);
    const named=new Set(asset.clips.flatMap(c=>c.tracks.map(t=>t.name.split('.')[0]!)));
    for(const clip of asset.clips){
      mixer.stopAllAction();const action=mixer.clipAction(clip).play();
      const poses:number[][]=[];
      for(const t of [0,clip.duration*.25,clip.duration*.5,clip.duration-1e-6]){
        action.time=t;mixer.update(0);object.updateMatrixWorld(true);const pose:number[]=[];
        for(const joint of jointsOf(object,named))pose.push(...joint.matrixWorld.elements);
        object.traverse(n=>{
          if(n instanceof SkinnedMesh){n.skeleton.update();for(let i=0;i<n.geometry.getAttribute('position').count;i+=13)expect(n.getVertexPosition(i,new Vector3()).toArray().every(Number.isFinite)).toBe(true);}
        });poses.push(pose);
      }
      expect(poses[0]!.length).toBeGreaterThan(32);
      // Un clip de una vez (el despegue de la perdiz, un golpe) no tiene por qué
      // acabar donde empieza; los de bucle, sí.
      const looping=manifest.assets.find(a=>a.id===id)?.motion.find(c=>c.name===clip.name) as {loop?:boolean}|undefined;
      if(looping?.loop!==false)expect(Math.max(...poses[0]!.map((v,i)=>Math.abs(v-poses[3]![i]!))),clip.name).toBeLessThan(.0001);
      expect(Math.max(...poses[0]!.map((v,i)=>Math.abs(v-poses[1]![i]!)))).toBeGreaterThan(.01);
    }
    mixer.stopAllAction();mixer.uncacheRoot(object);lib.dispose();
  });
  it.each(animated.filter(a=>a.id!=='fish').map(a=>a.id))('%s: cada pata alterna apoyo y elevación sin patinar todo el ciclo',async id=>{
    const lib=await library(id),fauna=new Fauna(k=>lib.instance(k),k=>lib.get(k));
    const feet=new Map<string,Vector3[]>();
    for(let frame=0;frame<=300;frame++){
      fauna.paint([{id:71,kind:id as AnimalKind,x:-frame*.0015,y:0}],frame/60);
      fauna.group.updateMatrixWorld(true);
      if(frame<60)continue;
      for(const [name,at] of feetOf(fauna.group)){const samples=feet.get(name)??[];samples.push(at);feet.set(name,samples);}
    }
    expect(feet.size).toBeGreaterThanOrEqual(2);
    for(const samples of feet.values()){
      const heights=samples.map(p=>p.y);expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(.003);
      let planted=0;for(let i=1;i<samples.length;i++)if(Math.abs(samples[i]!.x-samples[i-1]!.x)<.0015*.3)planted++;
      expect(planted/samples.length).toBeGreaterThan(.2);
    }
    fauna.dispose();lib.dispose();
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
  it('la pose de marcha no depende de dibujar a 30 o 60 fotogramas por segundo',async()=>{
    const lib=await library('cow');
    const run=(fps:number)=>{
      const fauna=new Fauna(k=>lib.instance(k),k=>lib.get(k));
      for(let i=0;i<=fps*4;i++)fauna.paint([{id:71,kind:'cow',x:-i/fps*.09,y:0}],i/fps);
      const pose=fauna.group.children[0]!.getObjectByName('foreL')!.quaternion.toArray();fauna.dispose();return pose;
    };
    const a=run(30),b=run(60);a.forEach((v,i)=>expect(v).toBeCloseTo(b[i]!,5));lib.dispose();
  });
});
