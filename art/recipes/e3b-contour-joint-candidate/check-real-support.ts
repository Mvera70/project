/** Contacto CPU de las juntas nuevas con geometría publicada, sin exportación. */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Box3, DoubleSide, Raycaster, Vector3, type Mesh, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildDefence } from '../../../src/render3d/world/defences';
import { buildFromAsset } from '../../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';

const root = resolve(import.meta.dirname, '../../..');
const names = (await readdir(import.meta.dirname)).filter(n => /^e3b-contour-.+-candidate.json$/.test(n)&&!n.includes('-pair-'));
const files = ['public/assets/valley3d/wall.glb', 'public/assets/valley3d/gate.glb'];
const bytes = await Promise.all(files.map(p => readFile(resolve(root, p))));
const scenes = await Promise.all(bytes.map(async b => {
  const gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  gltf.scene.traverse(n => {
    const m = n as Mesh;
    if (m.isMesh) for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.side = DoubleSide;
  });
  return gltf.scene;
}));
type Primitive = { name: string; location: number[]; dimensions: number[]; rotationDegrees?: number[] };
const directions = [{x:0,z:-1,bit:1},{x:1,z:0,bit:2},{x:0,z:1,bit:4},{x:-1,z:0,bit:8},
  {x:1,z:-1,bit:16},{x:1,z:1,bit:32},{x:-1,z:1,bit:64},{x:-1,z:-1,bit:128}];
const ray = new Raycaster();
const reports = [];
function corners(p: Primitive) {
  const a = -(p.rotationDegrees?.[2] ?? 0)*Math.PI/180;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v]) => {
    const x=u!*p.dimensions[0]!/2,z=v!*p.dimensions[1]!/2;
    return [p.location[0]!+x*Math.cos(a)-z*Math.sin(a),-p.location[1]!+x*Math.sin(a)+z*Math.cos(a)];
  });
}
function joined(a: Primitive,b: Primitive) {
  if (Math.abs(a.location[2]!-b.location[2]!)>(a.dimensions[2]!+b.dimensions[2]!)/2+1e-7) return false;
  const pa=corners(a),pb=corners(b);
  for (const poly of [pa,pb]) for (let k=0;k<4;k++) {
    const p=poly[k]!,q=poly[(k+1)%4]!; const nx=q[1]!-p[1]!,nz=p[0]!-q[0]!;
    const va=pa.map(v=>v[0]!*nx+v[1]!*nz),vb=pb.map(v=>v[0]!*nx+v[1]!*nz);
    if (Math.max(...va)<Math.min(...vb)-1e-7 || Math.max(...vb)<Math.min(...va)-1e-7) return false;
  }
  return true;
}
for (const name of names) {
  const recipeBytes=await readFile(resolve(import.meta.dirname,name));
  const recipe=JSON.parse(recipeBytes.toString('utf8')) as {primitives:Primitive[];metadata:{orientation?:{quarterTurns:number;mirrorSourceGeometry:boolean}}};
  const gate=name.includes('-gate-'); const gate24=name.includes('-24-');
  const orientation=recipe.metadata.orientation ?? {quarterTurns:0,mirrorSourceGeometry:false};
  const turn=(x:number,z:number) => {
    if (orientation.mirrorSourceGeometry) x=-x;
    for (let k=0;k<orientation.quarterTurns;k++) [x,z]=[-z,x];
    return {x,z};
  };
  const a=turn(0,-1),b=turn(-1,1);
  const bit=(d:{x:number;z:number})=>directions.find(v=>v.x===d.x&&v.z===d.z)!.bit;
  const mask=bit(a)|bit(b);
  const wall=(id:number,x:number,z:number,connections:number)=>buildDefence({id,kind:'wall',x,z,w:1,h:1,ruin:false,connections} as PlannedBuilding,scenes[0]!);
  const models=gate ? [buildFromAsset({id:1,kind:'gate',asset:'gate',x:0,z:0,w:1,h:1,ruin:false,gate:gate24?'z':'x'} as PlannedBuilding,scenes[1]!.clone(true))]
    : [wall(1,0,0,mask)];
  models.push(wall(2,a.x,a.z,bit({x:-a.x,z:-a.z})),wall(3,b.x,b.z,gate24?66:bit({x:-b.x,z:-b.z})));
  const objects: Object3D[]=models.map(m=>m.object);
  objects.forEach(o=>o.updateMatrixWorld(true));
  const checks=recipe.primitives.filter(p=>!p.name.includes('Deck')&&!p.name.includes('Parapet')).map(p=>{
    const angle=-(p.rotationDegrees?.[2]??0)*Math.PI/180;
    const bottom=p.location[2]!-p.dimensions[2]!/2,top=p.location[2]!+p.dimensions[2]!/2;
    let contacts=0;const misses=[];
    for(let i=0;i<=12;i++) for(let j=0;j<=12;j++) {
      const u=p.dimensions[0]!*(i/12-.5),v=p.dimensions[1]!*(j/12-.5);
      const x=p.location[0]!+u*Math.cos(angle)-v*Math.sin(angle),z=-p.location[1]!+u*Math.sin(angle)+v*Math.cos(angle);
      ray.set(new Vector3(x,1.5,z),new Vector3(0,-1,0));
      const hit=ray.intersectObjects(objects,true).find(h=>h.point.y<=top+.002);
      if(hit && hit.point.y>=bottom-.002) contacts++;
      else if(misses.length<5) misses.push({x,z,top:hit?.point.y??null});
    }
    return {name:p.name,bottom,top,samples:169,contacts,firstMisses:misses};
  });
  const anchored=new Set(checks.filter(c=>c.contacts>0).map(c=>c.name));
  for(let i=0;i<recipe.primitives.length;i++) for(const p of recipe.primitives) {
    if(!anchored.has(p.name)&&recipe.primitives.some(q=>anchored.has(q.name)&&joined(p,q))) anchored.add(p.name);
  }
  const wing=recipe.primitives.find(p=>p.name==='GateSouthWing');
  const wingBounds=wing ? new Box3().setFromPoints(corners(wing).flatMap(([x,z])=>[new Vector3(x,0,z),new Vector3(x,.72,z)])) : null;
  const frame=gate ? ['Gate_Stone_Jamb_L','Gate_Stone_Jamb_R'].map(n=>{
    const object=objects[0]!.getObjectByName(n);if(!object) throw new Error(n);
    const bounds=new Box3().setFromObject(object);return {name:n,min:bounds.min.toArray(),max:bounds.max.toArray()};
  }) : null;
  const wingContactsByObject = wing ? objects.map((object,index)=>{
    let contacts=0;
    for(let i=0;i<=24;i++) for(let j=0;j<=24;j++) {
      const bounds=wingBounds!;
      const x=bounds.min.x+(bounds.max.x-bounds.min.x)*i/24;
      const z=bounds.min.z+(bounds.max.z-bounds.min.z)*j/24;
      ray.set(new Vector3(x,.719,z),new Vector3(0,-1,0));
      if(ray.intersectObject(object,true).some(h=>h.point.y>=0)) contacts++;
    }
    return {object:index===0?'gate':index===1?'cardinalWall':'diagonalWall',contacts,samples:625};
  }) : null;
  const doorPoses=[];
  if(gate) {
    const hinge=objects[0]!.getObjectByName('DoorHinge');
    const door=objects[0]!.getObjectByName('gate_door');
    if(!hinge||!door) throw new Error('Missing actual hinge');
    const stoneBoxes=recipe.primitives.map(p=>({name:p.name,bounds:new Box3().setFromPoints(corners(p).flatMap(([x,z])=>
      [new Vector3(x,p.location[2]!-p.dimensions[2]!/2,z),new Vector3(x,p.location[2]!+p.dimensions[2]!/2,z)]))}));
    for(let degrees=0;degrees<=90;degrees+=5) {
      hinge.rotation.y=-degrees*Math.PI/180; objects[0]!.updateMatrixWorld(true);
      const overlaps:string[]=[];
      door.traverse(n=>{
        const mesh=n as Mesh;if(!mesh.isMesh) return;
        const box=new Box3().setFromObject(mesh);
        for(const stone of stoneBoxes) if(box.intersectsBox(stone.bounds)) overlaps.push(`${mesh.name}/${stone.name}: ${JSON.stringify({min:box.min.toArray(),max:box.max.toArray()})}`);
      });
      doorPoses.push({degrees,overlaps});
    }
  }
  reports.push({name,sha256:createHash('sha256').update(recipeBytes).digest('hex'),mask,checks,
    unanchoredComponents:recipe.primitives.filter(p=>!anchored.has(p.name)).map(p=>p.name),
    frame,wingContactsByObject,doorPoses,wingBounds:wingBounds?{min:wingBounds.min.toArray(),max:wingBounds.max.toArray()}:null,
    preservesPublicOpening:wingBounds?(gate24?wingBounds.min.x:wingBounds.min.z)>=.92-1e-8:null});
  models.forEach(m=>m.dispose());
}
const result={sources:files.map((path,i)=>({path,sha256:createHash('sha256').update(bytes[i]!).digest('hex')})),reports,
  limits:['Vertical contact samples and box adjacency only; not finite-element/load or collider validation',
    'Ground foundation under gate wing assumed flat at Y=0; verify terrain and door sweep before approval',
    'Gate24 uses actual neighbour mask66 from seed91/year80; no complete ring or gameplay traversal tested']};
await writeFile(resolve(root,'artifacts/graphics/E3b2-candidates/round-5/real-support.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({name:r.name,mask:r.mask,unanchored:r.unanchoredComponents,
  contacts:r.checks.map(c=>({name:c.name,contacts:c.contacts})),preservesPublicOpening:r.preservesPublicOpening}))));
