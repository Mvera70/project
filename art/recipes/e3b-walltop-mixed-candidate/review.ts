/** Modelos mixtos a inglete y evidencia CPU. No escribe recursos del juego. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Vector2, Vector3, ShapeUtils, Mesh, Box3, Triangle } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { elevatedRingOf } from '../../../src/derive/elevated-ring';
import { planFor } from '../../../src/render3d/world/plan';
import { buildFromAsset } from '../../../src/render3d/world/buildings';

const dir='art/recipes/e3b-walltop-mixed-candidate';
const out='artifacts/graphics/E3b2-candidates/walltop-mixed-review-01';
await mkdir(out,{recursive:true});
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
const center:P=[.5,.5];
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
const directions=[{name:'n',bit:1,p:[0,-1] as P},{name:'e',bit:2,p:[1,0] as P},{name:'s',bit:4,p:[0,1] as P},{name:'w',bit:8,p:[-1,0] as P},
  {name:'ne',bit:16,p:[1,-1] as P},{name:'se',bit:32,p:[1,1] as P},{name:'sw',bit:64,p:[-1,1] as P},{name:'nw',bit:128,p:[-1,-1] as P}];
const models=[];
for(const cardinal of directions.slice(0,4))for(const diagonal of directions.slice(4).filter(d=>dot(cardinal.p,d.p)<0)){
  const id=`mixed-${cardinal.name}-${diagonal.name}`,route:P[]=[add(center,mul(cardinal.p,.5)),center,add(center,mul(diagonal.p,.5))];
  const d0=norm(sub(route[1]!,route[0]!)),d1=norm(sub(route[2]!,route[1]!)),n0=normal(d0),n1=normal(d1);
  function offset(h:number):P[]{return [add(route[0]!,mul(n0,h)),add(center,mul(add(n0,n1),h/(1+dot(n0,n1)))),add(route[2]!,mul(n1,h))];}
  const left=offset(.45),right=offset(-.45),floor=[...left,...[...right].reverse()];
  const parts:Part[]=[];
  for(let course=0;course<4;course++)parts.push(prism(`StoneCourse${course+1}`,floor,course*.235,(course+1)*.235,['#9B958A','#A49D91','#969084','#A19A8E'][course]!));
  parts.push(prism('Deck',floor,.94,1.02,'#AAA497'));
  for(const side of [-1,1]){const inner=offset(side*.35),outer=offset(side*.45);for(let leg=0;leg<2;leg++)parts.push(prism(`Parapet${side>0?'Left':'Right'}${leg}`,[inner[leg]!,inner[leg+1]!,outer[leg+1]!,outer[leg]!],1.02,1.20));}
  // Distancia exacta segmento-segmento, sin discretización de la trayectoria.
  let clearance=Infinity;
  for(let leg=0;leg<2;leg++)for(const part of parts.filter(p=>p.name.startsWith('Parapet')))for(let edge=0;edge<part.polygonXZ.length;edge++)clearance=Math.min(clearance,segmentDistance(route[leg]!,route[leg+1]!,part.polygonXZ[edge]!,part.polygonXZ[(edge+1)%part.polygonXZ.length]!));
  // Continúa cada boca 0,5 para incluir el disco que pisa dos piezas a la vez.
  const extension=(p:P,d:P,n:P)=>[add(p,mul(n,.45)),add(add(p,mul(d,.5)),mul(n,.45)),add(add(p,mul(d,.5)),mul(n,-.45)),add(p,mul(n,-.45))];
  const supports=[floor,extension(route[0]!,mul(d0,-1),n0),extension(route[2]!,d1,n1)];
  const extendedBoundary=[add(left[0]!,mul(d0,-.5)),...left,add(left[2]!,mul(d1,.5)),add(right[2]!,mul(d1,.5)),...[...right].reverse(),add(right[0]!,mul(d0,-.5))];
  let supportBoundaryClearance=Infinity;
  for(let leg=0;leg<2;leg++)for(let edge=0;edge<extendedBoundary.length;edge++)supportBoundaryClearance=Math.min(supportBoundaryClearance,segmentDistance(route[leg]!,route[leg+1]!,extendedBoundary[edge]!,extendedBoundary[(edge+1)%extendedBoundary.length]!));
  if(supportBoundaryClearance<.45-1e-9)throw new Error(`Exact support failed: ${id}`);
  let unsupported=0,samples=0;
  for(let leg=0;leg<2;leg++)for(let i=0;i<=400;i++){const p=add(route[leg]!,mul(sub(route[leg+1]!,route[leg]!),i/400));for(let k=0;k<256;k++){const q=add(p,[.32*Math.cos(k*Math.PI/128),.32*Math.sin(k*Math.PI/128)]);samples++;if(!supports.some(poly=>inside(q,poly)))unsupported++;}}
  const ports=[{centerXZ:route[0],outward:cardinal.p,width:.90,clearWidth:.70,deckBottom:.94,deckTop:1.02,parapetTop:1.20,sectionEnds:[left[0],right[0]]},
    {centerXZ:route[2],outward:diagonal.p,width:.90,clearWidth:.70,deckBottom:.94,deckTop:1.02,parapetTop:1.20,sectionEnds:[left[2],right[2]]}];
  const checks=parts.map(topology);if(checks.some(c=>!c.closedOriented||c.signedVolume<=0||c.minTriangleArea<1e-9))throw new Error(`Topology failed: ${id}`);
  if(clearance<.35-1e-9||unsupported)throw new Error(`Clearance failed: ${id}`);
  const recipe={format:'valley-candidate-explicit-mesh-v1',id,status:'candidate_unexported',units:'game cell; 1 cell = 3 physical meters',coordinateSystem:'world XYZ; Blender=(X,-Z,Y); scale=1; cell origin=(0,0,0)',
    material:{name:'stone',color:'#9B958A',roughness:.95,vertexColors:true},mask:cardinal.bit|diagonal.bit,routeXZ:route,ports,parts,
    condition:'Replaces entire wall; not approved for gate bodies. Requires lateral cell clearance and neighbour port match.'};
  const path=`${dir}/${id}.mesh.json`;await writeFile(path,JSON.stringify(recipe,null,2)+'\n');
  const report={id,mask:recipe.mask,triangles:parts.reduce((n,p)=>n+p.triangles.length,0),materials:1,clearance,radius032Margin:clearance-.32,supportBoundaryClearance,supportRadius032Margin:supportBoundaryClearance-.32,supportSamples:samples,unsupported,
    support:'full-depth masonry from Y0 to .94; deck .94 to 1.02. Floor footprint equals masonry footprint. Neighbour strips included across both ports.',
    bounds:{minX:Math.min(...floor.map(p=>p[0])),maxX:Math.max(...floor.map(p=>p[0])),minZ:Math.min(...floor.map(p=>p[1])),maxZ:Math.max(...floor.map(p=>p[1]))},
    diagonalVertexLateralExtension:.45*Math.SQRT1_2,topology:checks,sha256:createHash('sha256').update(await readFile(path)).digest('hex')};
  models.push({recipe,report});
}

// Se reproduce la partida y se aplica el transform publicado mediante sus funciones reales.
const state=foundGame(91);run(state,3846,'prudent',CATALOG);
const ring=elevatedRingOf(state,state.buildings.find(b=>b.id===295)!,{approvedVariants:['straight','turn','diagonal','mixed','gate-cardinal','gate-diagonal','gate-mixed','bastion-crossing','bastion-return']});
const plan=planFor(state),loader=new GLTFLoader(),real=[];
for(const segment of ring.segments.filter(s=>s.variant==='mixed'||s.variant==='gate-mixed')){
  const model=models.find(m=>m.recipe.mask===segment.mask);if(!model)throw new Error(`Missing mask ${segment.mask}`);
  const planned=plan.buildings.find(b=>b.id===segment.buildingId)!,asset=planned.asset!,bytes=await readFile(`public/assets/valley3d/${asset}.glb`);
  const source=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  const object=buildFromAsset(planned,source).object;object.updateMatrixWorld(true);const bounds=new Box3().setFromObject(object);
  const transforms:unknown[]=[];object.traverse(o=>{if(o instanceof Mesh)transforms.push({name:o.name,matrixWorld:o.matrixWorld.toArray()});});
  real.push({buildingId:segment.buildingId,kind:segment.kind,cell:segment.cell,mask:segment.mask,model:model.recipe.id,incoming:segment.incoming,outgoing:segment.outgoing,
    publishedAsset:asset,publishedBounds:bounds,sourceSha256:createHash('sha256').update(bytes).digest('hex'),meshTransforms:transforms,
    publishedTopToFloor:1.02-bounds.max.y,verdict:segment.kind==='gate'?'PORT GEOMETRY ONLY; full body would block public passage, do not use':'FULL REPLACEMENT REQUIRED; existing narrow wall does not support new floor footprint'});
}
await writeFile(`${out}/measurements.json`,JSON.stringify({seed:91,tick:3846,year:80,models:models.map(m=>m.report),realRing:real,
  sourceRecipes:['straight','turn-ne','diagonal-se','gate-cardinal-shell'].map(id=>({id,path:`art/recipes/e3b-walltop-candidate/e3b-walltop-${id}-candidate.json`})),
  scope:'CPU source geometry; no Blender/GLB/GPU/Rapier. Exact clear width; sampled disk support with analytical lateral boundary clearance. No building/tree clearance approval.'},null,2)+'\n');

function svg(model:typeof models[number],iso:boolean){
  const project=([x,y,z]:V):P=>iso?[440+(x-z)*210,420+(x+z)*80-y*210]:[280+x*260,180+z*260];
  const polygons:{points:V[];color:string;depth:number}[]=[];
  for(const part of model.recipe.parts){const poly=part.polygonXZ;
    polygons.push({points:poly.map(([x,z])=>[x,part.top,z]),color:part.color,depth:iso?poly.reduce((n,p)=>n+p[0]+p[1],0)/poly.length+.02*part.top:part.top});
    if(iso)for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!;if(b[1]-a[1]-(b[0]-a[0])<=1e-9)continue;polygons.push({points:[[a[0],part.bottom,a[1]],[b[0],part.bottom,b[1]],[b[0],part.top,b[1]],[a[0],part.top,a[1]]],color:part.color,depth:(a[0]+a[1]+b[0]+b[1])/2+.01*part.top});}
  }
  polygons.sort((a,b)=>a.depth-b.depth);
  const points=(p:V[])=>p.map(q=>project(q).join(',')).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="740" viewBox="0 0 920 740"><rect width="920" height="740" fill="#f1eee6"/><g font-family="sans-serif" fill="#273132"><text x="32" y="42" font-size="25">${model.recipe.id} / mask ${model.recipe.mask} / ${iso?'isometric':'plan'}</text><text x="32" y="73" font-size="16">Candidato 3D sin exportar · proyeccion CPU · unidades de celda</text></g>${polygons.map(p=>`<polygon points="${points(p.points)}" fill="${p.color}" stroke="#5a5a51" stroke-width="1"/>`).join('')}${iso?'':`<polygon points="${points([[0,0,0],[1,0,0],[1,0,1],[0,0,1]])}" fill="none" stroke="#b54431" stroke-dasharray="6 5"/><polyline points="${points(model.recipe.routeXZ.map(([x,z])=>[x,1.025,z]))}" fill="none" stroke="#287d9a" stroke-width="4"/>${model.recipe.routeXZ.map(([x,z])=>{const p=project([x,1.025,z]);return `<circle cx="${p[0]}" cy="${p[1]}" r="83.2" fill="none" stroke="#c58d28" stroke-dasharray="4 4"/>`;}).join('')}`}<g font-family="sans-serif" font-size="17" fill="#273132"><text x="32" y="658">Y=1.02 · paso 0.70 · ancho 0.90 · radio 0.32 · ${model.report.triangles} triangulos</text><text x="32" y="690">Bocas abiertas a inglete · extension diagonal 0.318198 · 1 material</text></g></svg>`;
}
for(const model of models)for(const iso of [false,true])await writeFile(`${out}/${model.recipe.id}-${iso?'iso':'plan'}.svg`,svg(model,iso));
console.log(JSON.stringify({models:models.map(m=>({id:m.report.id,mask:m.report.mask,triangles:m.report.triangles,clearance:m.report.clearance,unsupported:m.report.unsupported})),realRingCount:real.length,realMasks:[...new Set(real.map(r=>r.mask))]},null,2));
