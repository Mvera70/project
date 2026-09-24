/** Sonda independiente de la unión: triángulos, solapes, pasos y contacto. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Mesh,Triangle,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildFromAsset} from '../../../src/render3d/world/buildings';
import type {PlannedBuilding} from '../../../src/render3d/world/plan';
import {directory} from './generate';
import {combined,inside,cross,sub,type P} from './combined-source';
const result=await combined();
const bytes=await readFile(`${directory}${result.id}.mesh.json`);
assert.equal(bytes.toString(),JSON.stringify(result,null,2)+'\n');
const area=(p:P[])=>Math.abs(p.reduce((s,v,i)=>s+cross(v,p[(i+1)%p.length]!),0))/2;
function edgeDistance(p:P,a:P,b:P){const d=sub(b,a),l=d[0]**2+d[1]**2,t=l===0?0:Math.max(0,Math.min(1,(sub(p,a)[0]*d[0]+sub(p,a)[1]*d[1])/l));return Math.hypot(p[0]-a[0]-d[0]*t,p[1]-a[1]-d[1]*t);}
function distance(p:P,poly:P[]){return inside(p,poly)?0:Math.min(...poly.map((a,i)=>edgeDistance(p,a,poly[(i+1)%poly.length]!)));}
function overlap(subject:P[],clip:P[]){let out=subject;const sign=clip.reduce((s,p,i)=>s+cross(p,clip[(i+1)%clip.length]!),0)>0?1:-1;
 for(let i=0;i<clip.length;i++){const a=clip[i]!,b=clip[(i+1)%clip.length]!,points=out;out=[];for(let j=0;j<points.length;j++){const p=points[j]!,q=points[(j+1)%points.length]!,dp=cross(sub(b,a),sub(p,a))*sign,dq=cross(sub(b,a),sub(q,a))*sign;if(dp>=0)out.push(p);if((dp>0&&dq<0)||(dp<0&&dq>0)){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}}return area(out);}
const coplanarChecks=[];
for(const kind of ['Deck','Parapet']){const parts=result.parts.filter(p=>p.name.startsWith(kind));let overlaps=0,maxArea=0;for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){const a=overlap(parts[i]!.polygonXZ,parts[j]!.polygonXZ);maxArea=Math.max(maxArea,a);if(a>1e-8)overlaps++;}coplanarChecks.push({kind,parts:parts.length,overlaps,maxArea});assert.equal(overlaps,0);}
assert.ok(result.parts.reduce((s,p)=>s+p.triangles.length,0)<=2400,'Static budget');
const topology=result.parts.map(p=>{const edges=new Map<string,{n:number;sum:number}>();let volume=0,minArea=Infinity;for(const face of p.triangles){const [a,b,c]=face.map(i=>new Vector3(...p.vertices[i]!));volume+=a!.dot(b!.clone().cross(c!))/6;minArea=Math.min(minArea,new Triangle(a!,b!,c!).getArea());for(let i=0;i<3;i++){const u=face[i]!,v=face[(i+1)%3]!,key=[Math.min(u,v),Math.max(u,v)].join(),e=edges.get(key)??{n:0,sum:0};e.n++;e.sum+=u<v?1:-1;edges.set(key,e);}}return {name:p.name,pass:[...edges.values()].every(e=>e.n===2&&e.sum===0)&&volume>1e-10&&minArea>1e-10,volume,minArea};});
assert.ok(topology.every(t=>t.pass),'Prisms must be closed, oriented, nondegenerate');
function sweep(name:string,route:P[]){let samples=0,failures=0,minClearance=Infinity;const failuresAt:P[]=[];
 for(let i=1;i<route.length;i++){const a=route[i-1]!,b=route[i]!,n=Math.ceil(Math.hypot(...sub(b,a))/.002);for(let j=0;j<=n;j++){const p:P=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n];for(const rail of result.railPolys)minClearance=Math.min(minClearance,distance(p,rail));
 for(const r of [0,.16,.32,.35])for(let k=0;k<(r?64:1);k++){const q:P=[p[0]+r*Math.cos(k*Math.PI/32),p[1]+r*Math.sin(k*Math.PI/32)];if(q[0]>1||q[0]<-1||(name==='landing'&&q[1]>1.65))continue;samples++;if(!result.deckPolys.some(f=>distance(q,f)<1e-8)){failures++;if(failuresAt.length<10)failuresAt.push(q);}}
 }}return {name,samples,failures,failuresAt,minClearance,radius032Pass:failures===0&&minClearance>=.32-1e-8,radius035Pass:failures===0&&minClearance>=.35-1e-8};}
let boundarySamples=0,unguarded=0;const unguardedAt:P[]=[];
for(const poly of result.deckPolys)for(let i=0;i<poly.length;i++){
 const a=poly[i]!,b=poly[(i+1)%poly.length]!,d=sub(b,a),len=Math.hypot(...d);if(len<1e-8)continue;
 for(let k=1;k<100;k++){const p:P=[a[0]+d[0]*k/100,a[1]+d[1]*k/100],n:P=[-d[1]/len*1e-5,d[0]/len*1e-5],left:P=[p[0]+n[0],p[1]+n[1]],right:P=[p[0]-n[0],p[1]-n[1]];
 const il=result.deckPolys.some(f=>inside(left,f)),ir=result.deckPolys.some(f=>inside(right,f));if(il===ir)continue;
 if(Math.abs(p[0]-1)<1e-8||Math.abs(p[0]+1)<1e-8||Math.abs(p[1]-1.65)<1e-8)continue;
 boundarySamples++;const q=il?left:right;if(!result.railPolys.some(f=>distance(q,f)<1e-8)){unguarded++;if(unguardedAt.length<6)unguardedAt.push(p);}
 }}
assert.equal(unguarded,0,'Every non-portal outer boundary must be guarded');
const sweeps=[sweep('ring',result.routeXZ as P[]),sweep('landing',[[.5,.58],[.5,1.65]])];
console.log(JSON.stringify({sweeps,coplanarChecks,triangles:result.parts.reduce((s,p)=>s+p.triangles.length,0)}));
assert.ok(sweeps.every(s=>s.radius035Pass));
const supports=result.parts.filter(p=>Math.abs(p.top-.82)<1e-8);
let supported=0,spanning=0,maxDistanceToBearing=0;
for(let x=-.995;x<1;x+=.01)for(let z=.005;z<1.95;z+=.01){const p:P=[x,z];if(!result.deckPolys.some(f=>distance(p,f)<1e-8))continue;const d=Math.min(...supports.map(s=>distance(p,s.polygonXZ)));if(d<1e-8)supported++;else{spanning++;maxDistanceToBearing=Math.max(maxDistanceToBearing,d);}}
const jambContacts=result.jambs.map(j=>({name:j.name,area:area(j.polygonXZ),coveredArea:result.groundPolys.reduce((s,p)=>s+overlap(j.polygonXZ,p),0)}));
// Control de hoja: primitivas originales idénticas entre recetas, GLB antiguo sólo presta la articulación.
const gateDir=new URL('../e3b-gate-crossing-candidate/',import.meta.url);
const old=JSON.parse(await readFile(new URL('e3b-gate-wide-opening-candidate.json',gateDir),'utf8'));
const light=JSON.parse(await readFile(new URL('e3b-gate-wide-light-finish-candidate.json',gateDir),'utf8'));
const door=(r:typeof old)=>({groups:r.groups,primitives:r.primitives.filter((p:{parent:string})=>p.parent==='gate_door')});assert.deepEqual(door(old),door(light));
const glbBytes=await readFile(new URL('../../../artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb',import.meta.url));
const source=(await new GLTFLoader().parseAsync(glbBytes.buffer.slice(glbBytes.byteOffset,glbBytes.byteOffset+glbBytes.byteLength),'')).scene;
const gate=buildFromAsset({id:71,kind:'gate',asset:'gate',x:-1,z:1,w:1,h:1,ruin:false,gate:'z'} as PlannedBuilding,source);gate.object.updateMatrixWorld(true);
const hinge=gate.object.getObjectByName('DoorHinge')!;let maxDoorY=-Infinity,doorCollisions=0,hingeSeatContacts=0;const collisionDetails:unknown[]=[];
const hull=(ps:P[])=>{const sorted=ps.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const half=(points:P[])=>{const out:P[]=[];for(const p of points){while(out.length>1&&cross(sub(out.at(-1)!,out.at(-2)!),sub(p,out.at(-1)!))<=1e-10)out.pop();out.push(p);}return out;};return [...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];};
for(let degrees=0;degrees<=90;degrees++){hinge.rotation.y=-degrees*Math.PI/180;gate.object.updateMatrixWorld(true);hinge.traverse(n=>{if(!(n instanceof Mesh))return;const pos=n.geometry.getAttribute('position'),vs=Array.from({length:pos.count},(_,i)=>new Vector3().fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld)),lo=Math.min(...vs.map(v=>v.y)),hi=Math.max(...vs.map(v=>v.y));maxDoorY=Math.max(maxDoorY,hi);const poly=hull(vs.map(v=>[v.x,v.z] as P));for(const p of result.parts){if(hi<=p.bottom+1e-8||lo>=p.top-1e-8)continue;if(overlap(poly,p.polygonXZ)>1e-8){if(n.name.startsWith('Gate_Hinge_')&&result.jambs.some(j=>p.polygonXZ.every(v=>distance(v,j.polygonXZ)<1e-8))){hingeSeatContacts++;continue;}doorCollisions++;if(collisionDetails.length<5)collisionDetails.push({degrees,mesh:n.name,part:p.name,poly,partPoly:p.polygonXZ,lo,hi});}}});}
assert.equal(doorCollisions,0);
const opening=result.jambs[1]!.polygonXZ[0]![0]-result.jambs[0]!.polygonXZ[1]![0];assert.ok(Math.abs(opening-.84)<1e-8);
const lowestOverOpening=Math.min(...result.parts.filter(p=>overlap(p.polygonXZ,[[-.92,1],[-.08,1],[-.08,2],[-.92,2]])>1e-8).map(p=>p.bottom));
// El lintel ocupa todo el ancho del vano; la prueba de intersección evita depender de sus vértices extremos.
let publicViolations=0;const publicRect:P[]=[[-.92,1],[-.08,1],[-.08,2],[-.92,2]];for(const p of result.parts)if(p.bottom<.63-1e-8&&overlap(p.polygonXZ,publicRect)>1e-8)publicViolations++;
assert.equal(publicViolations,0);
const report={sourceSha256:createHash('sha256').update(bytes).digest('hex'),deterministic:true,triangles:result.parts.reduce((s,p)=>s+p.triangles.length,0),parts:result.parts.length,topologyPass:topology.every(t=>t.pass),boundaryGuard:{boundarySamples,unguarded,unguardedAt},coplanarChecks,sweeps,support:{directSamples:supported,bridgeSamples:spanning,maxDistanceToBearing,jambContacts,beamBottom:.82,beamTop:.94,frameLintelBottom:.63,frameLintelTop:.82},gate:{opening,doorSweepPositions:91,doorCollisions,hingeSeatContacts,maxDoorY,sourceClearance:.63-maxDoorY,lowestOverOpening,publicViolations,doorSourceIdentical:true},limitations:['Contact and bridging measured from source, not a strength/load calculation.','Combined GLB not exported or imported. Door transform verified using existing wide GLB with identical door source.','Internal partition faces remain; no duplicate floor or parapet volume.','Source design replaces old coping/merlons; visual review remains outstanding.']};
await writeFile(`${directory}combined-measurements.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));





