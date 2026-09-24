/** Fuente del cruce mixto: sólo JSON y medidas CPU; no exporta. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Vector2, Vector3, ShapeUtils, Box3, Triangle, DoubleSide, Raycaster } from 'three';
import type { Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildFromAsset } from '../../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';
type P=[number,number];
type V=[number,number,number];
type Part={name:string;polygonXZ:P[];bottom:number;top:number;vertices:V[];triangles:number[][];color:string;material:string};
const add=(a:P,b:P):P=>[a[0]+b[0],a[1]+b[1]];
const sub=(a:P,b:P):P=>[a[0]-b[0],a[1]-b[1]];
const mul=(a:P,b:number):P=>[a[0]*b,a[1]*b];
const dot=(a:P,b:P)=>a[0]*b[0]+a[1]*b[1];
const norm=(a:P)=>mul(a,1/Math.hypot(...a));
const normal=(a:P):P=>[-a[1],a[0]];
const cross=(a:P,b:P)=>a[0]*b[1]-a[1]*b[0];
function prism(name:string,polygon:P[],bottom:number,top:number,color='#9B958A'):Part {
  // CCW en X/Z: tapa superior requiere winding inverso en XYZ (Y hacia arriba).
  if(polygon.reduce((sum,p,i)=>sum+cross(p,polygon[(i+1)%polygon.length]!),0)<0)polygon=[...polygon].reverse();
  const n=polygon.length,vertices:V[]=[...polygon.map(([x,z]):V=>[x,bottom,z]),...polygon.map(([x,z]):V=>[x,top,z])];
  const caps=ShapeUtils.triangulateShape(polygon.map(p=>new Vector2(...p)),[]);
  const triangles:number[][]=[];
  for(const [a,b,c] of caps){triangles.push([a!,b!,c!],[c!+n,b!+n,a!+n]);}
  for(let i=0;i<n;i++){const j=(i+1)%n;triangles.push([i,i+n,j+n],[i,j+n,j]);}
  return {name,polygonXZ:polygon,bottom,top,vertices,triangles,color,material:'stone'};
}
function topology(part:Part){
  const edges=new Map<string,{count:number;direction:number}>();let volume=0,minArea=Infinity;
  for(const f of part.triangles){const [a,b,c]=f.map(i=>new Vector3(...part.vertices[i]!));
    volume+=a!.dot(b!.clone().cross(c!))/6;minArea=Math.min(minArea,new Triangle(a!,b!,c!).getArea());
    for(let i=0;i<3;i++){const a=f[i]!,b=f[(i+1)%3]!,k=[Math.min(a,b),Math.max(a,b)].join(',');const e=edges.get(k)??{count:0,direction:0};e.count++;e.direction+=a<b?1:-1;edges.set(k,e);}
  }
  return {name:part.name,closedOriented:[...edges.values()].every(e=>e.count===2&&e.direction===0),signedVolume:volume,minTriangleArea:minArea,vertices:part.vertices.length,triangles:part.triangles.length};
}
function pointDistance(p:P,a:P,b:P){const d=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),d)/dot(d,d)));return Math.hypot(...sub(p,add(a,mul(d,t))));}
function segmentDistance(a:P,b:P,c:P,d:P){
  const ab=sub(b,a),cd=sub(d,c),det=cross(ab,cd);
  if(Math.abs(det)>1e-12){const t=cross(sub(c,a),cd)/det,u=cross(sub(c,a),ab)/det;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
  return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}
function inside(p:P,polygon:P[]){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i]!,b=polygon[j]!;if(pointDistance(p,a,b)<1e-10)return true;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
}return hit;}


// Recorta la fábrica exclusivamente fuera del paso público transversal.
function clip(poly:P[],coord:number,value:number,sign:number):P[]{const out:P[]=[];for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!;const da=(a[coord]!-value)*sign,db=(b[coord]!-value)*sign;if(da>=-1e-10)out.push(a);if((da>0&&db<0)||(da<0&&db>0)){const t=da/(da-db);out.push(add(a,mul(sub(b,a),t)));}}return out;}
function hull(points:P[]):P[]{const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const half=(ps:P[])=>{const h:P[]=[];for(const p of ps){while(h.length>1&&cross(sub(h[h.length-1]!,h[h.length-2]!),sub(p,h[h.length-1]!))<=1e-10)h.pop();h.push(p);}return h;};return [...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];}
function convexOverlap(a:P[],b:P[]){for(const p of [a,b])for(let i=0;i<p.length;i++){const n=normal(sub(p[(i+1)%p.length]!,p[i]!));const aa=a.map(v=>dot(v,n)),bb=b.map(v=>dot(v,n));if(Math.max(...aa)<=Math.min(...bb)+1e-8||Math.max(...bb)<=Math.min(...aa)+1e-8)return false;}return true;}
const dir='art/recipes/e3b-gate-crossing-candidate',out='artifacts/graphics/E3b2-candidates/gate-mixed-source-review-04';await mkdir(out,{recursive:true});
const gatePath='artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb';
const bytes=await readFile(gatePath);const gateAsset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const original=JSON.parse(await readFile('art/recipes/gate/gate.json','utf8'));
const wideBytes=await readFile(`${dir}/e3b-gate-wide-opening-candidate.json`);const wide=JSON.parse(wideBytes.toString());
const doorSource=(r:typeof original)=>({group:r.groups.find((g:{name:string})=>g.name==='gate_door'),primitives:r.primitives.filter((p:{parent?:string})=>p.parent==='gate_door')});
if(JSON.stringify(doorSource(original))!==JSON.stringify(doorSource(wide)))throw Error('Door changed');
const frame=structuredClone(wide);frame.id='e3b-gate-wide-light-finish-candidate';
const lintelPrimitive=frame.primitives.find((p:{name:string})=>p.name==='Gate_Stone_Lintel');
lintelPrimitive.location[2]=2.175;lintelPrimitive.dimensions[2]=.57;
frame.metadata.note='Marco amplio con viga central Y0.63…0.82. Hoja, gozne, jambas y escala idénticos al marco amplio anterior. Sólo fuente.';
const frameData=JSON.stringify(frame,null,2)+'\n';
await writeFile(`${dir}/${frame.id}.json`,frameData);
if(JSON.stringify(doorSource(frame))!==JSON.stringify(doorSource(original)))throw Error('Frame door changed');
const reports=[];
for(const mask of [65,24]){
 const coord=mask===65?1:0,axis=mask===65?'x':'z';
 const route:P[]=mask===65?[[.5,0],[.5,.5],[0,1]]:[[0,.5],[.5,.5],[1,0]];
 const d0=norm(sub(route[1]!,route[0]!)),d1=norm(sub(route[2]!,route[1]!)),n0=normal(d0),n1=normal(d1);
 const offset=(h:number):P[]=>[add(route[0]!,mul(n0,h)),add(route[1]!,mul(add(n0,n1),h/(1+dot(n0,n1)))),add(route[2]!,mul(n1,h))];
 const left=offset(.45),right=offset(-.45),floor=[...left,...[...right].reverse()];
 const north=clip(floor,coord,mask===24?.06:.08,-1),south=clip(floor,coord,mask===65?.94:.92,1);
 const parts:Part[]=[prism('Deck',floor,.94,1.02,'#CDC9C2'),prism('NorthAbutment',north,0,.82,'#CDC9C2'),prism('SouthAbutment',south,0,.82,'#CDC9C2'),prism('PortalLintel',floor,.82,.94,'#CDC9C2')];
 for(const side of [-1,1]){const i=offset(side*.35),o=offset(side*.45);parts.push(prism(`Parapet${side>0?'Left':'Right'}`,[...i,...[...o].reverse()],1.02,1.2,'#CDC9C2'));}
 let clearance=Infinity;for(let leg=0;leg<2;leg++)for(const p of parts.filter(p=>p.name.startsWith('Parapet')))for(let e=0;e<p.polygonXZ.length;e++)clearance=Math.min(clearance,segmentDistance(route[leg]!,route[leg+1]!,p.polygonXZ[e]!,p.polygonXZ[(e+1)%p.polygonXZ.length]!));
 const gate=buildFromAsset({id:1,kind:'gate',asset:'gate',x:0,z:0,w:1,h:1,ruin:false,gate:axis} as PlannedBuilding,gateAsset.scene.clone(true));
 // La copia CPU refleja el recorte de la nueva receta, sin guardar ni exportar GLB.
 gate.object.updateMatrixWorld(true);
 const lintelMesh=gate.object.getObjectByName('Gate_Stone_Lintel') as Mesh;
 lintelMesh.geometry=lintelMesh.geometry.clone();
 const lb=new Box3().setFromObject(lintelMesh),position=lintelMesh.geometry.getAttribute('position'),inverse=lintelMesh.matrixWorld.clone().invert();
 for(let i=0;i<position.count;i++){const v=new Vector3().fromBufferAttribute(position,i).applyMatrix4(lintelMesh.matrixWorld);v.y=.63+(v.y-lb.min.y)/(lb.max.y-lb.min.y)*.19;v.applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);}
 position.needsUpdate=true;lintelMesh.geometry.computeBoundingBox();lintelMesh.geometry.computeBoundingSphere();
 const hinge=gate.object.getObjectByName('DoorHinge');if(!hinge)throw Error('Missing hinge');
 const collisions:unknown[]=[];let doorMaxY=0,doorMinCross=Infinity,doorMaxCross=-Infinity;
 for(let angle=0;angle<=90;angle+=1){hinge.rotation.y=-angle*Math.PI/180;gate.object.updateMatrixWorld(true);hinge.traverse(o=>{const m=o as Mesh;if(!m.isMesh)return;const pos=m.geometry.getAttribute('position'),vs:Vector3[]=[];for(let i=0;i<pos.count;i++)vs.push(new Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld));const low=Math.min(...vs.map(v=>v.y)),high=Math.max(...vs.map(v=>v.y));doorMaxY=Math.max(doorMaxY,high);doorMinCross=Math.min(doorMinCross,...vs.map(v=>coord===1?v.z:v.x));doorMaxCross=Math.max(doorMaxCross,...vs.map(v=>coord===1?v.z:v.x));const projected=hull(vs.map(v=>[v.x,v.z] as P));for(const p of parts){if(high<=p.bottom+1e-8||low>=p.top-1e-8)continue;const caps=ShapeUtils.triangulateShape(p.polygonXZ.map(v=>new Vector2(...v)),[]);if(caps.some(t=>convexOverlap(projected,t.map(i=>p.polygonXZ[i]!) as P[])))collisions.push({angle,mesh:m.name,part:p.name});}});}
 hinge.rotation.y=0;gate.object.updateMatrixWorld(true);
 const bounds={minX:Math.min(...floor.map(p=>p[0])),maxX:Math.max(...floor.map(p=>p[0])),minZ:Math.min(...floor.map(p=>p[1])),maxZ:Math.max(...floor.map(p=>p[1]))};
 let samples=0,uncovered=0,openingViolations=0,groundSamples=0,bridgeSamples=0;const bearingSamples:P[]=[],bridgePoints:P[]=[];const ray=new Raycaster();gate.object.traverse(o=>{const m=o as Mesh;if(m.isMesh)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.side=DoubleSide;});
 for(let x=bounds.minX+.005;x<bounds.maxX;x+=.01)for(let z=bounds.minZ+.005;z<bounds.maxZ;z+=.01){const q:P=[x,z];if(!inside(q,floor))continue;samples++;if(!parts.slice(1,4).some(p=>inside(q,p.polygonXZ)))uncovered++;if(inside(q,north)||inside(q,south)){groundSamples++;bearingSamples.push(q);}else{bridgeSamples++;bridgePoints.push(q);ray.set(new Vector3(x,.941,z),new Vector3(0,-1,0));const hit=ray.intersectObject(gate.object,true).find(h=>h.point.y>=.82-1e-5);if(hit)bearingSamples.push(q);}if(q[coord]!>.08+1e-8&&q[coord]!<.92-1e-8&&[north,south].some(p=>inside(q,p)))openingViolations++;}
 let maxBridgeDistance=0;for(const q of bridgePoints)maxBridgeDistance=Math.max(maxBridgeDistance,Math.min(...bearingSamples.map(p=>Math.hypot(...sub(q,p)))));
 // El aparejo particiona el volumen, sin relieve que invada el corredor.
 const finished:Part[]=[];
 for(const part of parts){
  if(part.name.endsWith('Abutment')){
   let bottom=part.bottom,index=0;
   for(const level of [.205,.410,.615]){finished.push(prism(`${part.name}_Ashlar${index}`,part.polygonXZ,bottom,level-.003,'#CDC9C2'));finished.push(prism(`${part.name}_Mortar${index++}`,part.polygonXZ,level-.003,level+.003,'#C0A58D'));bottom=level+.003;}
   finished.push(prism(`${part.name}_Ashlar${index}`,part.polygonXZ,bottom,part.top,'#CDC9C2'));
  }else if(part.name==='PortalLintel'){
   const axis=mask===65?0:1;let rest=part.polygonXZ,index=0;
   for(const plane of [.25,.65]){const stone=clip(rest,axis,plane-.003,-1),joint=clip(clip(rest,axis,plane-.003,1),axis,plane+.003,-1);if(stone.length>=3)finished.push(prism(`LintelAshlar${index}`,stone,part.bottom,.934,'#CDC9C2'));if(joint.length>=3)finished.push(prism(`LintelJoint${index}`,joint,part.bottom,.934,'#C0A58D'));rest=clip(rest,axis,plane+.003,1);index++;}
   if(rest.length>=3)finished.push(prism(`LintelAshlar${index}`,rest,part.bottom,.934,'#CDC9C2'));
   finished.push(prism('LintelBedJoint',part.polygonXZ,.934,.94,'#C0A58D'));
  }else finished.push(part);
 }
 for(const side of [-1,1]){
  const c=add(add(route[1]!,mul(d1,.426)),mul(n1,side*.4));const along=mul(d1,.07),across=mul(n1,.05);
  const poly=[add(add(c,along),across),add(sub(c,along),across),sub(sub(c,along),across),sub(add(c,along),across)];
  if(poly.some(q=>!parts.filter(p=>p.name.startsWith('Parapet')).some(p=>inside(q,p.polygonXZ))))throw Error('Merlon outside parapet');
  finished.push(prism(`DiagonalMerlon${side}`,poly,1.2,1.26,'#CDC9C2'));
 }
 const checks=finished.map(topology); const baseVolume=parts.reduce((n,p)=>n+topology(p).signedVolume,0),finishedVolume=checks.reduce((n,p)=>n+p.signedVolume,0),finishVolumeDelta=finishedVolume-baseVolume; if(Math.abs(finishVolumeDelta-.00168)>1e-8)throw Error("Finish changed structural volume");if(uncovered||openingViolations||clearance<.35-1e-9||checks.some(c=>!c.closedOriented||c.signedVolume<=0))throw Error(`Geometry ${mask}`);
 const id=`e3b-gate-crossing-${mask}-light-finish-candidate`;
 const source={format:'valley-candidate-explicit-mesh-v1',id,status:collisions.length?'candidate_blocked_door_collision':'candidate_unexported',coordinateSystem:'world XYZ; Blender=(X,-Z,Y); cell origin=(0,0,0)',mask,axis,material:{name:'stone',roughness:.95,colorLinear:[155/255,149/255,138/255]},routeXZ:route,ports:route.filter((_,i)=>i!==1).map((p,i)=>({centerXZ:p,width:.9,clearWidth:.7,deckBottom:.94,deckTop:1.02,parapetTop:1.2,sectionEnds:[left[i*2],right[i*2]]})),parts:finished.map(p=>({...p,colorLinear:p.color==='#C0A58D'?[134/255,96/255,68/255]:[155/255,149/255,138/255]})),requiredGate:{source:'e3b-gate-wide-light-finish-candidate.json',sha256:createHash('sha256').update(frameData).digest('hex'),unchangedDoor:doorSource(wide)},condition:'Candidate masonry union. Ground abutments remain outside .08/.92 passage planes, with an extra .02 hinge clearance on the moving-hardware side. Full-width slab soffit at Y=.82, bearing on grounded abutments and the central gate lintel Y=.63… .82. Requires original gate placement; never renormalize frame and addon together. No export or runtime approval.'};
 const path=`${dir}/${id}.mesh.json`;const data=JSON.stringify(source,null,2)+'\n';await writeFile(path,data);
 reports.push({mask,source:path,sha256:createHash('sha256').update(data).digest('hex'),triangles:finished.reduce((a,p)=>a+p.triangles.length,0),materials:1,baseVolume,finishedVolume,finishVolumeDelta,decorationVolume:.00168,centralBeamJambOverlap:.09,centralBeamSlabContactY:.82,parapetMerlons:2,outerSoffitY:.82,upperBandHeight:.38,clearance,walkingWidth:2*clearance,deckTop:1.02,groundOpening:.84,groundOpeningViolations:openingViolations,deckSamples:samples,deckUnsupportedPoints:uncovered,groundSupportedPoints:groundSamples,lintelBridgePoints:bridgeSamples,maxBridgeDistanceToGroundOrOriginalGate:maxBridgeDistance,frameLintelBottomY:.63,frameLintelTopY:.82,doorSourceUnchanged:true,doorMinCross,doorMaxCross,doorMaxY,lintelDoorVerticalGap:.63-doorMaxY,doorSweep:{poses:91,collisions:collisions.length,firstCollisions:collisions.slice(0,8)},topology:checks});gate.dispose();
}
await writeFile(`${out}/measurements.json`,JSON.stringify({reports,limits:'Exact deck coverage by grounded piers or a spanning lintel, not a load-capacity certification. Door sweep uses convex projected mesh hulls vs triangulated support polygons at one-degree increments.'},null,2)+'\n');console.log(JSON.stringify(reports,null,2));






