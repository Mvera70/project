/** Fuente del cruce mixto: sólo JSON y medidas CPU; no exporta. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Vector2, Vector3, ShapeUtils, Triangle, DoubleSide, Raycaster } from 'three';
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

const dir='art/recipes/e3b-gate-crossing-candidate';
const out='artifacts/graphics/E3b2-candidates/gate-mixed-source-review-01';
await mkdir(out,{recursive:true});
const gatePath='artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb';
const wallPath='public/assets/valley3d/wall.glb';
async function load(path:string){const bytes=await readFile(path);const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.traverse(o=>{const m=o as Mesh;if(m.isMesh)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.side=DoubleSide;});return {scene:gltf.scene,sha256:createHash('sha256').update(bytes).digest('hex')};}
const gateAsset=await load(gatePath),wallAsset=await load(wallPath);
const wideSource=await readFile(`${dir}/e3b-gate-wide-opening-candidate.json`);
const wideRecipe=JSON.parse(wideSource.toString());
const doorParts=wideRecipe.primitives.filter((p:{parent?:string})=>p.parent==='gate_door');
const doorGroup=wideRecipe.groups.find((g:{name:string})=>g.name==='gate_door');
const original=JSON.parse(await readFile('art/recipes/gate/gate.json','utf8'));
const originalDoor={group:original.groups.find((g:{name:string})=>g.name==='gate_door'),primitives:original.primitives.filter((p:{parent?:string})=>p.parent==='gate_door')};
if(JSON.stringify(originalDoor)!==JSON.stringify({group:doorGroup,primitives:doorParts}))throw Error('gate_door changed');
const doorSourceSha256=createHash('sha256').update(JSON.stringify(originalDoor)).digest('hex');
const reports=[];
for(const mask of [65,24]){
  const axis=mask===65?'x':'z';
  const route:P[]=(mask===65?[[.79,-.27],[.79,.21],[-.5,1.5]]:[[-.27,.79],[.21,.79],[1.5,-.5]]) as P[];
  const d0=norm(sub(route[1]!,route[0]!)),d1=norm(sub(route[2]!,route[1]!)),n0=normal(d0),n1=normal(d1);
  const offset=(h:number):P[]=>[add(route[0]!,mul(n0,h)),add(route[1]!,mul(add(n0,n1),h/(1+dot(n0,n1)))),add(route[2]!,mul(n1,h))];
  const left=offset(.45),right=offset(-.45),floor=[...left,...[...right].reverse()];
  const parts:Part[]=[prism('BearingDeck',floor,.70,1.02,'#CDC9C2')];
  for(const side of [-1,1]){const inner=offset(side*.35),outer=offset(side*.45);parts.push(prism(`Parapet${side>0?'Left':'Right'}`,[...inner,...[...outer].reverse()],1.02,1.2,'#CDC9C2'));}
  let clearance=Infinity;
  for(let leg=0;leg<2;leg++)for(const p of parts.slice(1))for(let e=0;e<p.polygonXZ.length;e++)clearance=Math.min(clearance,segmentDistance(route[leg]!,route[leg+1]!,p.polygonXZ[e]!,p.polygonXZ[(e+1)%p.polygonXZ.length]!));
  const gate=buildFromAsset({id:1,kind:'gate',asset:'gate',x:0,z:0,w:1,h:1,ruin:false,gate:axis} as PlannedBuilding,gateAsset.scene.clone(true));
  const adjacent=mask===65?{x:-1,z:1,connections:16}:{x:1,z:-1,connections:64};
  const wall=buildDefence({id:2,kind:'wall',w:1,h:1,ruin:false,...adjacent} as PlannedBuilding,wallAsset.scene);
  gate.object.updateMatrixWorld(true);wall.object.updateMatrixWorld(true);
  const ray=new Raycaster();let bearing=0,overVoid=0,points=0;const bearingByObject:Record<string,number>={};
  let maxCantilever=0;const contacts:P[]=[];const samplePoints:P[]=[];
  const bounds={minX:Math.min(...floor.map(p=>p[0])),maxX:Math.max(...floor.map(p=>p[0])),minZ:Math.min(...floor.map(p=>p[1])),maxZ:Math.max(...floor.map(p=>p[1]))};
  for(let x=bounds.minX+.005;x<bounds.maxX;x+=.01)for(let z=bounds.minZ+.005;z<bounds.maxZ;z+=.01){if(!inside([x,z],floor))continue;points++;samplePoints.push([x,z]);ray.set(new Vector3(x,1.021,z),new Vector3(0,-1,0));const hit=ray.intersectObjects([gate.object,wall.object],true).find(h=>h.point.y>=.70-1e-5&&h.point.y<=1.02);if(hit){bearing++;contacts.push([x,z]);const label=hit.object.name||'AdjacentDiagonalWall';bearingByObject[label]=(bearingByObject[label]??0)+1;}else overVoid++;}
  for(const p of samplePoints)maxCantilever=Math.max(maxCantilever,Math.min(...contacts.map(q=>Math.hypot(...sub(p,q)))));
  const topologyChecks=parts.map(topology);
  if(clearance<.35-1e-9||topologyChecks.some(t=>!t.closedOriented||t.signedVolume<=0)||bearing===0)throw Error(`Failed ${mask}`);
  const id=`e3b-gate-crossing-${mask}-continuous-candidate`;
  const source={format:'valley-candidate-explicit-mesh-v1',id,status:'candidate_unexported',coordinateSystem:'world XYZ; Blender=(X,-Z,Y); gate local cell origin=(0,0,0)',mask,axis,
    material:{name:'stone',roughness:.95,colorLinear:[155/255,149/255,138/255],vertexColors:true},
    routeXZ:route,ports:[{centerXZ:route[0],width:.9,clearWidth:.7,deckTop:1.02,sectionEnds:[left[0],right[0]]},{centerXZ:route[2],width:.9,clearWidth:.7,deckTop:1.02,sectionEnds:[left[2],right[2]]}],
    parts:parts.map(p=>({...p,colorLinear:[155/255,149/255,138/255]})),
    requiredGate:{source:'e3b-gate-wide-opening-candidate.json',sha256:createHash('sha256').update(wideSource).digest('hex'),groundOpening:.84,unchangedDoor:{group:doorGroup,primitives:doorParts}},
    condition:'Addon only for the referenced wide gate, using its existing transform without renormalizing. BearingDeck is a single closed structural slab bearing on the measured gate and adjacent diagonal wall; cantilever regions are intentional. Load capacity, neighbouring walkway port compatibility, clipping of existing stone, colliders and runtime route approval remain unvalidated.'};
  const path=`${dir}/${id}.mesh.json`;const bytes=JSON.stringify(source,null,2)+'\n';await writeFile(path,bytes);
  reports.push({mask,source:path,sha256:createHash('sha256').update(bytes).digest('hex'),triangles:parts.reduce((n,p)=>n+p.triangles.length,0),deckTop:1.02,deckBottom:.70,clearance,clearWalkingWidth:clearance*2,parapetThickness:.1,continuousParapets:2,doorSourceIdentical:true,doorSourceSha256,groundOpening:.84,doorMaxY:.5933333613475167,newGeometryMinY:.70,doorVerticalGap:.70-.5933333613475167,bounds,topology:topologyChecks,
    bearing:{gridStep:.01,points,contactPoints:bearing,cantileverPoints:overVoid,bearingByObject,maxSampleDistanceToBearing:maxCantilever},
    limits:'Contact is CPU triangle raycasting against the wide gate and diagonal neighbour. Cantilever slab is geometrically connected, not an engineering load-capacity proof. Open port faces require matching neighbouring walking strips. No Blender, export, physics or game validation.'});
  gate.dispose();wall.dispose();
}
await writeFile(`${out}/measurements.json`,JSON.stringify({gateSourceSha256:gateAsset.sha256,wallSourceSha256:wallAsset.sha256,reports},null,2)+'\n');
console.log(JSON.stringify(reports,null,2));


