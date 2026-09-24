/** Lectura CPU del GLB ancho existente; jamás exporta ni abre GPU. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Box3,DoubleSide,Mesh,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildFromAsset} from '../../../src/render3d/world/buildings';
import type {PlannedBuilding} from '../../../src/render3d/world/plan';
import {directory,generateGate} from './generate';
import {modelOf} from './probe';
const path=new URL('../../../artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb',import.meta.url);
const bytes=await readFile(path);
const source=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
source.traverse(n=>{if(n instanceof Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])m.side=DoubleSide;});
const gate=buildFromAsset({id:71,kind:'gate',asset:'gate',x:-1,z:1,w:1,h:1,ruin:false,gate:'z'} as PlannedBuilding,source);
gate.object.updateMatrixWorld(true);
const bounds=(name:string)=>new Box3().setFromObject(gate.object.getObjectByName(name)!);
const jambs=[bounds('Gate_Stone_Jamb_L'),bounds('Gate_Stone_Jamb_R')].sort((a,b)=>a.min.x-b.min.x);
const opening=jambs[1]!.min.x-jambs[0]!.max.x;
assert.ok(Math.abs(opening-.84)<1e-4);
const candidate=modelOf((await generateGate()).primitives);
const candidateBounds=candidate.children.map(c=>new Box3().setFromObject(c));
const hinge=gate.object.getObjectByName('DoorHinge')!;
const original=hinge.rotation.y;
let doorCollisions=0,maxDoorY=-Infinity;
for(let degrees=0;degrees<=90;degrees++){
  hinge.rotation.y=original-degrees*Math.PI/180;gate.object.updateMatrixWorld(true);
  const door=bounds('gate_door');maxDoorY=Math.max(maxDoorY,door.max.y);
  if(candidateBounds.some(b=>b.intersectsBox(door)))doorCollisions++;
}
assert.equal(doorCollisions,0,'Door swept AABB clear of candidate');
hinge.rotation.y=original;gate.object.updateMatrixWorld(true);
let samples=0,invasions=0;
for(let ix=0;ix<=42;ix++)for(let iz=0;iz<=50;iz++){
  const x=-.92+ix*.84/42,z=1+iz/50;
  const hits=new Raycaster(new Vector3(x,.599,z),new Vector3(0,-1,0),0,.6).intersectObject(candidate,true);
  samples++;if(hits.length)invasions++;
}
assert.equal(invasions,0);
const coping=bounds('Gate_Stone_Coping');
const lintel=bounds('Gate_Stone_Lintel');
const report={gateGlbSha256:createHash('sha256').update(bytes).digest('hex'),localGateCell:[-1,1],axis:'z',opening,doorSweepPositions:91,doorCollisions,maxDoorY,groundVoid:{width:.84,ceiling:.599,samples,invasions},oldCopingBounds:coping,oldLintelBounds:lintel,deckUnderside:.94,
  status:'BLOCKED_JOIN_AND_SUPPORT',limitations:['Old wide GLB only proves doorway and transform. Light-finish gate is source-only; its lintel is not validated here.','Upper deck overlaps connector24 light; coplanar overlap must be removed by explicit union.','Parapet compatibility and loaded support at gate joint remain unproved.','No closed canonical package, GLB export, GPU or runtime approval.']};
await writeFile(`${directory}gate-clearance-measurements.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
