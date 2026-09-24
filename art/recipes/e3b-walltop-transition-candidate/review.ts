/** Modelos candidatos: sólo JSON, lectura GLB y pruebas CPU. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Raycaster, Triangle, Vector3 } from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadRecipe } from '../../../tools/art/recipe';
import { buildFromAsset } from '../../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';
const dir='art/recipes/e3b-walltop-transition-candidate', out='artifacts/graphics/E3b2-candidates/walltop-transition-review-01';
await mkdir(out,{recursive:true});
type P={type:string;name:string;location:number[];dimensions?:number[];material:string;parent:string;rotationDegrees?:number[];[key:string]:unknown};
type Recipe={id:string;scale:number;primitives:P[];metadata:Record<string,unknown>;[key:string]:unknown};
async function json(path:string){return JSON.parse(await readFile(path,'utf8'));}
const gateBase=await json('art/recipes/e3b-gate-crossing-candidate/e3b-gate-wide-opening-candidate.json') as Recipe;
const bastionBase=await json('art/recipes/e3b-bastion-joint-candidate/e3b-bastion-joint-candidate.json') as Recipe;
function cube(name:string,x:number,z:number,y:number,w:number,d:number,h:number):P {
  return {type:'cube',name,location:[x,-z,y],dimensions:[w,d,h],material:'stone',parent:'Root'};
}
const gateAddition=[
  cube('CorbelCourseLower',.5,.5,(.76+.82)/2,1,.52,.06),
  cube('CorbelCourseMiddle',.5,.5,.85,1,.72,.06),
  cube('CorbelCourseUpper',.5,.5,.91,1,.90,.06),
  cube('WalltopDeck',.5,.5,.98,1,.90,.08),
  cube('WalltopNorthParapet',.5,.10,1.11,1,.10,.18),
  cube('WalltopSouthParapet',.5,.90,1.11,1,.10,.18),
];
const gate=structuredClone(gateBase);gate.id='e3b-walltop-gate-transition-candidate';
gate.primitives=gate.primitives.filter(p=>!p.name.startsWith('Gate_Merlon_'));
// El portón histórico se desplaza +1 en Z al instanciar. Se mantiene el sistema fuente.
gate.primitives.push(...gateAddition.map(p=>({...p,location:[p.location[0]!*3,(1+p.location[1]!)*3,p.location[2]!*3],dimensions:p.dimensions!.map(v=>v*3)})));
gate.metadata={...gate.metadata,status:'candidate_unexported',floorY:1.02,clearWalkway:.70,clearGroundPassage:.84,
  note:'Original door group and primitives unchanged. Four original low merlons replaced by three corbel courses. Geometry contact only, no structural engineering certification.'};
const bastion=structuredClone(bastionBase);bastion.id='e3b-walltop-bastion-centered-candidate';
bastion.primitives=bastion.primitives.filter(p=>!['Parapet_1','Parapet_3','CenterMerlon_1'].includes(p.name));
// Las almenas de esquina originales sobresalían 0,08 hacia cada boca nueva.
for(const p of bastion.primitives.filter(p=>p.name.startsWith('CornerMerlon'))) {
  const south=-p.location[1]!>.5;p.location[1]=south?-.925:-.075;p.dimensions![1]=.15;
}
for(const side of [0,1])for(const south of [false,true])bastion.primitives.push(cube(`CenteredCap_${side}_${south?'S':'N'}`,side===0?.075:.925,south?.925:.075,1.11,.15,.15,.18));
const platform=bastion.primitives.find(p=>p.name==='Platform')!;platform.location[0]=.5;platform.dimensions![0]=1;
bastion.metadata={...bastion.metadata,status:'candidate_unexported',floorY:1.02,portalWidth:.70,portals:[{face:'east',span:[.15,.85]},{face:'west',span:[.15,.85]}],
  note:'Full replacement recipe preserving ashlar and stairs; two centered cardinal openings. Not a mixed diagonal connector.'};
for(const recipe of [gate,bastion]) {
  const path=`${dir}/${recipe.id}.json`;await writeFile(path,JSON.stringify(recipe,null,2)+'\n');await loadRecipe(path);
}
const hashes:Record<string,string>={};
async function glb(path:string){const b=await readFile(path);hashes[path]=createHash('sha256').update(b).digest('hex');return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
const wideSource=await glb('artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb');
const jointSource=await glb('public/assets/valley3d/e3b-bastion-joint-candidate.glb');
const accessSource=await glb('public/assets/valley3d/bastion-access-candidate.glb');
const mat=new MeshBasicMaterial({color:0xb2aa99,side:DoubleSide});
function mesh(p:P,scale=1,zOffset=0) {
  if(p.type!=='cube'||!p.dimensions)throw Error(`Unsupported CPU primitive ${p.name}`);
  const m=new Mesh(new BoxGeometry(p.dimensions[0]!*scale,p.dimensions[2]!*scale,p.dimensions[1]!*scale),mat);
  m.name=p.name;m.position.set(p.location[0]!*scale,p.location[2]!*scale,-p.location[1]!*scale+zOffset);return m;
}
function recipeModel(r:Recipe){const g=new Group();for(const p of r.primitives)g.add(mesh(p,r.scale));g.updateMatrixWorld(true);return g;}
const candidateBastion=recipeModel(bastion);
const candidateGate=wideSource.clone(true);
for(let i=0;i<4;i++){const m=candidateGate.getObjectByName(`Gate_Merlon_${i}`);m?.removeFromParent();}
for(const p of gateAddition)candidateGate.add(mesh(p,1,-1));
candidateGate.updateMatrixWorld(true);
function doubleSide(o:Object3D){o.traverse(n=>{if(n instanceof Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])m.side=DoubleSide;});}
for(const o of [candidateGate,candidateBastion,wideSource,jointSource,accessSource])doubleSide(o);
function pointDistance(x:number,z:number,p:P) {
  return Math.hypot(Math.max(0,Math.abs(x-p.location[0]!)-p.dimensions![0]!/2),Math.max(0,Math.abs(z+p.location[1]!)-p.dimensions![1]!/2));
}
const near=[];
for(const p of bastion.primitives.filter(p=>p.dimensions&&p.location[2]!+p.dimensions[2]!/2>1.02001)) {
  let gap=Infinity;for(let i=0;i<=1000;i++)gap=Math.min(gap,pointDistance(-.5+2*i/1000,.5,p));
  near.push({name:p.name,distance:gap});
}
const gateModel=buildFromAsset({id:999,kind:'gate',asset:'gate',x:0,z:0,w:1,h:1,ruin:false,gate:'z'} as PlannedBuilding,candidateGate);
gateModel.object.updateMatrixWorld(true);
const hinge=gateModel.object.getObjectByName('DoorHinge')!;
const doorSamples=[];
for(let i=0;i<=90;i++){hinge.rotation.y=-Math.PI*i/180;gateModel.object.updateMatrixWorld(true);const bounds=new Box3().setFromObject(hinge);
  doorSamples.push({angleDegrees:i,minY:bounds.min.y,maxY:bounds.max.y,addedStoneGap:.76-bounds.max.y});}
const supports=gateAddition.slice(0,4).map(p=>{
  const supportName=p.name==='CorbelCourseLower'?'Gate_Stone_Coping':p.name==='CorbelCourseMiddle'?'CorbelCourseLower':p.name==='CorbelCourseUpper'?'CorbelCourseMiddle':'CorbelCourseUpper';
  const target=gateModel.object.getObjectByName(supportName)!;const b=new Box3().setFromObject(target);const low=p.location[2]!-p.dimensions![2]!/2;
  const xOverlap=Math.min(p.location[0]!+p.dimensions![0]!/2,b.max.x)-Math.max(p.location[0]!-p.dimensions![0]!/2,b.min.x);
  const zOverlap=Math.min(-p.location[1]!+p.dimensions![1]!/2,b.max.z)-Math.max(-p.location[1]!-p.dimensions![1]!/2,b.min.z);
  return {name:p.name,supportName,bottomY:low,supportTopY:b.max.y,verticalGap:low-b.max.y,contactWidth:xOverlap,contactDepth:zOverlap,contactArea:xOverlap*zOverlap};
});
const state=await json(`${out}/state.json`) as {building:{id:number;x:number;y:number};planned:PlannedBuilding;neighbours:unknown[]}[];
const instances=[];
for(const s of state) {
  const before=buildFromAsset(s.planned,(s.building.id===295?jointSource:accessSource).clone(true)).object;
  // Alias del origen publicado para conservar exactamente el transform de buildFromAsset.
  const after=buildFromAsset(s.planned,candidateBastion.clone(true)).object;
  before.updateMatrixWorld(true);after.updateMatrixWorld(true);
  const angle=Math.atan2(s.planned.bastionAccess!.x,s.planned.bastionAccess!.z);
  const transform=(x:number,z:number)=>({x:s.building.x+.5+(x-.5)*Math.cos(angle)+(z-.5)*Math.sin(angle),z:s.building.y+.5-(x-.5)*Math.sin(angle)+(z-.5)*Math.cos(angle)});
  const mouths=[];
  for(const side of [0,1])for(const [label,model] of [['published',before],['candidate',after]] as const) {
    const samples=[];
    for(let i=0;i<=700;i++) {const z=.15+i/1000,a=transform(side===0?-.05:1.05,z),b=transform(side===0?.3:.7,z);
      const q=new Vector3(a.x,1.1,a.z),direction=new Vector3(b.x-a.x,0,b.z-a.z).normalize();const ray=new Raycaster(q,direction,0,.22);
      if(ray.intersectObject(model,true).length)samples.push(z);
    }
    mouths.push({side:side===0?'west':'east',model:label,blockedSamples:samples.length,minBlocked:samples[0]??null,maxBlocked:samples.at(-1)??null});
  }
  instances.push({id:s.building.id,asset:s.planned.asset,access:s.planned.bastionAccess,portals:[transform(0,.5),transform(1,.5)],mouths,
    limit:s.building.id===296?'East local portal points south to empty cell (50,56); actual neighbour237 is diagonal southwest. Mixed exit remains required.':'Both cardinal neighbours align with the centered portals.'});
}
const report={sourceHashes:hashes,recipes:[gate,bastion].map(r=>({id:r.id,primitives:r.primitives.length,materialSlots:(r.materials as unknown[]).length,
  sha256:createHash('sha256').update(JSON.stringify(r,null,2)+'\n').digest('hex')})),
  gate:{groundOpening:.84,walkway:.70,deckTop:1.02,supports,doorGroupPreserved:JSON.stringify((gateBase.groups as {name:string}[]).find(g=>g.name==='gate_door'))===JSON.stringify((gate.groups as {name:string}[]).find(g=>g.name==='gate_door')),
    doorPrimitivesPreserved:JSON.stringify(gateBase.primitives.filter(p=>p.parent==='gate_door'))===JSON.stringify(gate.primitives.filter(p=>p.parent==='gate_door')),doorSamples},
  bastion:{minimumCenterlineToUpperGeometry:Math.min(...near.map(p=>p.distance)),radius032Margin:Math.min(...near.map(p=>p.distance))-.32,near,instances},
  limits:['CPU recipe geometry, not exported candidate GLB','Contact area does not certify stone structural strength','Bastion296 diagonal junction remains unresolved','No runtime or mobile performance approval']};
await writeFile(`${out}/measurements.json`,JSON.stringify(report,null,2)+'\n');

function triangles(object:Object3D){const ts:{v:number[][];color:string;normal:number[]}[]=[];object.updateMatrixWorld(true);object.traverse(n=>{if(!(n instanceof Mesh))return;const g=n.geometry,ix=g.index,p=g.getAttribute('position');
  for(let i=0;i<(ix?ix.count:p.count);i+=3){const vertices=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,ix?ix.getX(i+k):i+k).applyMatrix4(n.matrixWorld));
    const norm=new Triangle(...vertices as [Vector3,Vector3,Vector3]).getNormal(new Vector3());
    const shade=150+Math.round((norm.y*.4+Math.abs(norm.x)*.15+Math.abs(norm.z)*.1)*80);
    ts.push({v:vertices.map(v=>v.toArray()),color:`rgb(${shade+9},${shade+6},${shade-6})`,normal:norm.toArray()});}
  });return ts;}
function plate(object:Object3D,id:string,plan:boolean){const t=triangles(object).filter(f=>plan?f.normal[1]!>0:f.normal[0]!+f.normal[1]!*.8+f.normal[2]!>0),scale=250;
  const project=(v:number[])=>plan?[210+v[0]!*scale,110+v[2]!*scale]:[430+(v[0]!-v[2]!)*scale,430+(v[0]!+v[2]!)*scale*.40-v[1]!*scale];
  t.sort((a,b)=>a.v.reduce((s,v)=>s+(plan?v[1]!:v[0]!+v[2]!+v[1]!*.8),0)-b.v.reduce((s,v)=>s+(plan?v[1]!:v[0]!+v[2]!+v[1]!*.8),0));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"><rect width="1000" height="800" fill="#f1eee6"/><g font-family="sans-serif" fill="#26302c"><text x="30" y="40" font-size="24">${id} · ${plan?'planta':'isometrica'} CPU</text><text x="30" y="70" font-size="15">Receta candidata, sin GLB nuevo · geometria de referencia · no render del juego</text></g>${t.map(f=>`<polygon points="${f.v.map(v=>project(v).join(',')).join(' ')}" fill="${f.color}" stroke="#777a70" stroke-width=".30"/>`).join('')}<g font-family="sans-serif" fill="#26302c"><text x="30" y="750" font-size="17">Paso superior 0.70 · piso Y=1.02 · dimensiones en celdas</text><text x="30" y="777" font-size="15">${id.includes('gate')?'Tres hiladas en voladizo sobre albardilla; hoja original conservada.':'Aparejo y escalera originales; bocas cardinales centradas a ambos lados.'}</text></g></svg>`;}
// Hoja cerrada para la lámina frontal; la prueba de giro anterior cubre todos los grados.
hinge.rotation.y=0;gateModel.object.updateMatrixWorld(true);
for(const [id,model] of [['gate-transition',gateModel.object],['bastion-centered',candidateBastion]] as const)for(const plan of [false,true])await writeFile(`${out}/${id}-${plan?'plan':'iso'}.svg`,plate(model,id,plan));
console.log(JSON.stringify({gateSupports:supports,minDoorGap:Math.min(...doorSamples.map(s=>s.addedStoneGap)),bastionMinimum:report.bastion.minimumCenterlineToUpperGeometry,instances},null,2));
