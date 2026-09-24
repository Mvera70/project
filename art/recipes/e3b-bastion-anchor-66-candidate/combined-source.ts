/** Unión y partición determinista de volúmenes de fuente; sólo escribe JSON. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ShapeUtils,Vector2} from 'three';
import {directory,type Primitive} from './generate';
export type P=[number,number];
export type Part={name:string;polygonXZ:P[];bottom:number;top:number;vertices:number[][];triangles:number[][];material:string;color:string};
export const cross=(a:P,b:P)=>a[0]*b[1]-a[1]*b[0];
export const sub=(a:P,b:P):P=>[a[0]-b[0],a[1]-b[1]];
export function inside(p:P,poly:P[]){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i]!,b=poly[j]!;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function rect(x0:number,z0:number,x1:number,z1:number):P[]{return [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];}
export function corridor(a:P,b:P,width:number,extension=0):P[]{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),u:P=[dx/len,dz/len],n:P=[-u[1],u[0]],p:P=[a[0]-u[0]*extension,a[1]-u[1]*extension],q:P=[b[0]+u[0]*extension,b[1]+u[1]*extension];return [[p[0]+n[0]*width/2,p[1]+n[1]*width/2],[p[0]-n[0]*width/2,p[1]-n[1]*width/2],[q[0]-n[0]*width/2,q[1]-n[1]*width/2],[q[0]+n[0]*width/2,q[1]+n[1]*width/2]];}
export function prism(name:string,polygon:P[],bottom:number,top:number):Part{
 const poly=polygon.filter((p,i)=>Math.hypot(...sub(p,polygon[(i+1)%polygon.length]!))>1e-9);
 if(poly.reduce((s,p,i)=>s+cross(p,poly[(i+1)%poly.length]!),0)<0)poly.reverse();
 const n=poly.length,vertices=[...poly.map(([x,z])=>[x,bottom,z]),...poly.map(([x,z])=>[x,top,z])];
 const triangles:number[][]=[];for(const [a,b,c] of ShapeUtils.triangulateShape(poly.map(p=>new Vector2(...p)),[]))triangles.push([a!,b!,c!],[c!+n,b!+n,a!+n]);
 for(let i=0;i<n;i++){const j=(i+1)%n;triangles.push([i,i+n,j+n],[i,j+n,j]);}return {name,polygonXZ:poly,bottom,top,vertices,triangles,material:'stone',color:'#CDC9C2'};
}
// Los cortes incluyen todas las intersecciones; en cada franja el orden de aristas es fijo.
export function partition(polygons:P[][],predicate:(p:P)=>boolean):P[][]{
 const edges=polygons.flatMap(poly=>poly.map((a,i)=>({a,b:poly[(i+1)%poly.length]!}))),levels=polygons.flat().map(p=>p[1]);
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){const a=edges[i]!,b=edges[j]!,u=sub(a.b,a.a),v=sub(b.b,b.a),det=cross(u,v);if(Math.abs(det)<1e-10)continue;const t=cross(sub(b.a,a.a),v)/det,s=cross(sub(b.a,a.a),u)/det;if(t>=0&&t<=1&&s>=0&&s<=1)levels.push(a.a[1]+t*u[1]);}
 const cuts=[...new Set(levels.map(v=>+v.toFixed(10)))].sort((a,b)=>a-b),result:P[][]=[];
 for(let i=1;i<cuts.length;i++){const z0=cuts[i-1]!,z1=cuts[i]!,mid=(z0+z1)/2;if(z1-z0<1e-8)continue;
 const lines=edges.filter(e=>mid>Math.min(e.a[1],e.b[1])&&mid<Math.max(e.a[1],e.b[1])).map(e=>{const m=(e.b[0]-e.a[0])/(e.b[1]-e.a[1]);return {m,c:e.a[0]-m*e.a[1]};}).sort((a,b)=>(a.m-b.m)*mid+a.c-b.c);
 const unique=lines.filter((l,i)=>i===0||Math.abs((l.m-lines[i-1]!.m)*mid+l.c-lines[i-1]!.c)>1e-8);
 let start:number|null=null;
 for(let j=0;j<unique.length-1;j++){const l=unique[j]!,r=unique[j+1]!,take=predicate([((l.m+r.m)*mid+l.c+r.c)/2,mid]);if(take&&start===null)start=j;
 if(start!==null&&(!take||j===unique.length-2)){const left=unique[start]!,right=unique[take?j+1:j]!;result.push([[left.m*z0+left.c,z0],[right.m*z0+right.c,z0],[right.m*z1+right.c,z1],[left.m*z1+left.c,z1]]);start=null;}}
 }return result;
}
export async function combined(){
 const paths=['e3b-gate-crossing-24-light-finish-candidate.mesh.json','e3b-gate-wide-light-finish-candidate.json'];
 const bytes=await Promise.all(paths.map(p=>readFile(new URL('../e3b-gate-crossing-candidate/'+p,import.meta.url))));
 const connector=JSON.parse(bytes[0]!.toString()) as {parts:Part[]};
 const frame=JSON.parse(bytes[1]!.toString()) as {groups:unknown[];primitives:Primitive[]};
 const gateDeck=connector.parts.find(p=>p.name==='Deck')!.polygonXZ.map(([x,z]):P=>[x-1,z+1]);
 const floors=[rect(0,0,1,1),rect(.05,1,.95,1.65),corridor([.5,.5],[-.5,1.5],.9),gateDeck];
 const route:P[]=[[1,.5],[.5,.5],[-.5,1.5],[-1,1.5]];
 const disk=(p:P):P[]=>Array.from({length:16},(_,i)=>[p[0]+.35/Math.cos(Math.PI/16)*Math.cos(i*Math.PI/8),p[1]+.35/Math.cos(Math.PI/16)*Math.sin(i*Math.PI/8)]);
 const clear=[corridor([.5,.5],[1.4,.5],.7),corridor(route[1]!,route[2]!,.7),corridor([-.5,1.5],[-1.4,1.5],.7),corridor([.5,.5],[.5,2],.7),disk([.5,.5]),disk([-.5,1.5])];
 const aperture=rect(-.94,-10,-.08,10),inFloor=(p:P)=>floors.some(f=>inside(p,f));
 const deckPolys=partition(floors,inFloor);
 const railPolys=partition([...floors,...clear],p=>inFloor(p)&&!clear.some(f=>inside(p,f)));
 const abutmentPolys=partition([...floors,aperture],p=>inFloor(p)&&!inside(p,aperture));
 const parts:Part[]=[];
 for(const [name,polys,lo,hi] of [['Deck',deckPolys,.94,1.02],['Parapet',railPolys,1.02,1.2],['Abutment',abutmentPolys,0,.82],['UpperLintel',deckPolys,.82,.94]] as [string,P[][],number,number][])
  polys.forEach((p,i)=>parts.push(prism(`${name}_${i}`,p,lo,hi)));
 // La viga original ligera: geometría fuente a escala1/3, colocación exacta de portón ejeZ.
 const lintel=frame.primitives.find(p=>p.name==='Gate_Stone_Lintel')!;
 const box=(p:Primitive):P[]=>rect((p.location[0]!-p.dimensions![0]!/2)/3-1,2-(p.location[1]!+p.dimensions![1]!/2)/3,(p.location[0]!+p.dimensions![0]!/2)/3-1,2-(p.location[1]!-p.dimensions![1]!/2)/3);
 // Sólo la parte del vano: las jambas se incorporan a los estribos, evitando dos cuerpos superpuestos.
 partition([box(lintel),aperture],p=>inside(p,box(lintel))&&inside(p,aperture)).forEach((p,i)=>parts.push(prism(`FrameLightLintel_${i}`,p,.63,.82)));
 // Jambas conservadas a través de unión con los estribos (la huella de cada jamba está dentro).
 const jambs=frame.primitives.filter(p=>p.name==='Gate_Stone_Jamb_L'||p.name==='Gate_Stone_Jamb_R').map(p=>({name:p.name,polygonXZ:box(p),bottom:0,top:.72}));
 // El gozne necesita margen lateral fuera del marco: vano público .84, estribos separados .86.
 // Reunir jambas y fábrica por estratos evita duplicar los sólidos del marco original.
 parts.splice(0,parts.length,...parts.filter(p=>!p.name.startsWith('Abutment')&&!p.name.startsWith('FrameLightLintel')));
 const groundPolys=partition([...abutmentPolys,...jambs.map(j=>j.polygonXZ)],p=>abutmentPolys.some(f=>inside(p,f))||jambs.some(j=>inside(p,j.polygonXZ)));
 for(const [lo,hi,polys] of [[0,.63,groundPolys],[.63,.72,[...groundPolys,box(lintel)]],[.72,.82,[...abutmentPolys,box(lintel)]]] as [number,number,P[][]][]){
  partition(polys,p=>polys.some(f=>inside(p,f))).forEach((p,i)=>parts.push(prism(`FrameUnion_${lo}_${i}`,p,lo,hi)));
 }
 for(let step=1;step<=14;step++)parts.push(prism(`Stair_${step}`,rect(.14,2.65-step/14,.86,2.65-(step-1)/14),0,step*1.02/14));
 return {format:'valley-candidate-explicit-mesh-v1',id:'e3b-anchor66-gate24-combined-candidate',coordinateSystem:'world XYZ local to bastion cell34,39',status:'source_geometry_only',budget:{maxStaticTriangles:2400,textures:0,staticMaterials:1,doorBudget:'Unchanged referenced source'},material:{name:'stone',roughness:.95,colorLinear:[155/255,149/255,138/255]},sources:paths.map((p,i)=>({path:p,sha256:createHash('sha256').update(bytes[i]!).digest('hex')})),
 ownership:'Replaces bastion295 and ALL gate71 static frame and connector24. Door hierarchy retained verbatim from frame source at scale1/3 and world offset[-1,0,2]. No old static source may remain underneath.',
 routeXZ:route,stairRouteXZ:[[.5,2.65],[.5,1.65],[.5,.58]],floorY:1.02,clearWidth:.7,parts,deckPolys,railPolys,abutmentPolys,groundPolys,jambs,
 doorSource:{groups:frame.groups,primitives:frame.primitives.filter(p=>p.parent==='gate_door'),scale:1/3,offset:[-1,0,2],axis:'z'},
 limits:['Boolean volume partition removes overlapping deck and parapet regions. Internal partition faces may be merged on export.','Static frame coping, old merlons and masonry details replaced by combined piers/lintels. Door primitives unchanged.','Geometric contact and span measurements do not establish structural load capacity.','Not exported; GLB import, appearance, colliders and runtime remain unverified.']};
}
if(process.argv.includes('--write-combined'))await writeFile(`${directory}e3b-anchor66-gate24-combined-candidate.mesh.json`,JSON.stringify(await combined(),null,2)+'\n');


