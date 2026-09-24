/** Candidato geométrico original: bastión296, descansillo y media unión diagonal237. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, BoxGeometry, BufferGeometry, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Triangle, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadRecipe } from '../../../tools/art/recipe';
const dir='art/recipes/e3b-bastion296-mixed-candidate',out='artifacts/graphics/E3b2-candidates/bastion296-mixed-review-01';
type Pt=[number,number];type P={type:string;name:string;location:number[];dimensions?:number[];rotationDegrees?:number[];width?:number;depth?:number;height?:number;material:string;parent:string;[key:string]:unknown};
type Recipe={id:string;primitives:P[];metadata:Record<string,unknown>;[key:string]:unknown};
const sourcePath='art/recipes/bastion-access-candidate/bastion-access-candidate.json';
const base=JSON.parse(await readFile(sourcePath,'utf8')) as Recipe;
const recipe=structuredClone(base);recipe.id='e3b-bastion296-mixed-candidate';
recipe.referenceRender={width:1100,height:1000,cameraLocation:[3,-5,3],cameraTarget:[.8,-1.3,.65],orthoScale:3.6,worldRole:'sky'};
const floorPolys:Pt[][]=[[[0,0],[1,0],[1,1],[0,1]],[[.05,1],[.95,1],[.95,1.65],[.05,1.65]]];
const half=.45*Math.SQRT1_2;
floorPolys.push([[.5-half,.5+half],[.5+half,.5-half],[1.5+half,1.5-half],[1.5-half,1.5+half]]);
const cube=(name:string,x:number,z:number,y:number,w:number,d:number,h:number,angle=0):P=>({type:'cube',name,location:[x,-z,y],dimensions:[w,d,h],rotationDegrees:[0,0,-angle],parent:'Root',material:'stone'});
recipe.primitives=recipe.primitives.filter(p=>!['Platform','Parapet_1','Parapet_3','CenterMerlon_1','CenterMerlon_3','CornerMerlon_SW'].includes(p.name));
for(const p of recipe.primitives) {
  if(p.name.startsWith('InteriorStep_'))p.location[1]=p.location[1]!-.65;
  if(p.name.startsWith('CornerMerlon')){p.location[1]=-p.location[1]!>.5?-.925:-.075;p.dimensions![1]=.15;}
}
recipe.primitives.push(cube('UpperLandingSupport',.5,1.325,.47,.72,.65,.94),cube('DiagonalWallSupport',1,1,.47,Math.SQRT2,.9,.94,45));
const rails:P[]=[cube('WestNorthCap',.075,.075,1.11,.15,.15,.18),cube('WestSouthCap',.075,.925,1.11,.15,.15,.18),
  cube('LandingWestParapet',.10,1.325,1.11,.10,.65,.18)];
const rightJoin:Pt=[.95,.95-.8*Math.SQRT1_2],leftJoin:Pt=[.90,.90+.8*Math.SQRT1_2];
rails.push(cube('EastNorthParapet',.95,rightJoin[1]/2,1.11,.10,rightJoin[1],.18));
function rail(name:string,a:Pt,b:Pt){const dx=b[0]-a[0],dz=b[1]-a[1];return cube(name,(a[0]+b[0])/2,(a[1]+b[1])/2,1.11,Math.hypot(dx,dz),.10,.18,Math.atan2(dz,dx)*180/Math.PI);}
rails.push(rail('DiagonalOuterParapet',rightJoin,[1.5+.4*Math.SQRT1_2,1.5-.4*Math.SQRT1_2]),rail('DiagonalInnerParapet',leftJoin,[1.5-.4*Math.SQRT1_2,1.5+.4*Math.SQRT1_2]),
  cube('LandingEastParapet',.90,(leftJoin[1]+1.65)/2,1.11,.10,1.65-leftJoin[1],.18));
recipe.primitives.push(...rails);

// Descomponer la unión exacta del suelo en rectángulos y triángulos rectángulos
// isósceles evita caras coplanares duplicadas. Sólo primitivas del esquema existente.
type Edge={a:Pt;b:Pt};const edges:Edge[]=floorPolys.flatMap(poly=>poly.map((a,i)=>({a,b:poly[(i+1)%poly.length]!})));
const levels=floorPolys.flat().map(p=>p[1]);
for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
  const a=edges[i]!,b=edges[j]!,ux=a.b[0]-a.a[0],uz=a.b[1]-a.a[1],vx=b.b[0]-b.a[0],vz=b.b[1]-b.a[1],det=ux*vz-uz*vx;
  if(Math.abs(det)<1e-10)continue;const dx=b.a[0]-a.a[0],dz=b.a[1]-a.a[1],t=(dx*vz-dz*vx)/det,u=(dx*uz-dz*ux)/det;
  if(t>=0&&t<=1&&u>=0&&u<=1)levels.push(a.a[1]+t*uz);
}
const cuts=[...new Set(levels.map(v=>Number(v.toFixed(10))))].sort((a,b)=>a-b);
let piece=0;const floorPieces:P[]=[];
function triangle(points:Pt[]){let i=0,j=1,k=2,best=0;for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){const d=Math.hypot(points[b]![0]-points[a]![0],points[b]![1]-points[a]![1]);if(d>best){best=d;i=a;j=b;k=3-a-b;}}
  let a=points[i]!,b=points[j]!;const c=points[k]!,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
  if((b[0]-a[0])*(c[1]-mz)-(b[1]-a[1])*(c[0]-mx)<0)[a,b]=[b,a];
  const height=Math.hypot(c[0]-mx,c[1]-mz);if(height<1e-9)return;
  if(Math.abs(best/2-height)>1e-7)throw Error('El triángulo no es rectángulo isósceles');
  floorPieces.push({type:'gable',name:`MixedDeckTriangle_${piece++}`,location:[mx,-mz,.98],width:best,depth:.08,height,rotationDegrees:[90,0,-Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI],material:'stone',parent:'Root'});
}
for(let n=1;n<cuts.length;n++){const z0=cuts[n-1]!,z1=cuts[n]!,mid=(z0+z1)/2;if(z1-z0<1e-8)continue;
  type Line={m:number;c:number};type Interval={left:Line;right:Line};const intervals:Interval[]=[];
  for(const poly of floorPolys){const lines:Line[]=[];for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!;if(mid>Math.min(a[1],b[1])&&mid<Math.max(a[1],b[1])){const m=(b[0]-a[0])/(b[1]-a[1]);lines.push({m,c:a[0]-m*a[1]});}}
    lines.sort((a,b)=>(a.m-b.m)*mid+a.c-b.c);if(lines.length===2)intervals.push({left:lines[0]!,right:lines[1]!});}
  intervals.sort((a,b)=>(a.left.m-b.left.m)*mid+a.left.c-b.left.c);
  const merged:Interval[]=[];for(const q of intervals){const last=merged.at(-1);if(last&&q.left.m*mid+q.left.c<=last.right.m*mid+last.right.c+1e-9){if(q.right.m*mid+q.right.c>last.right.m*mid+last.right.c)last.right=q.right;}else merged.push({...q});}
  for(const q of merged){const l0=q.left.m*z0+q.left.c,l1=q.left.m*z1+q.left.c,r0=q.right.m*z0+q.right.c,r1=q.right.m*z1+q.right.c,l=Math.max(l0,l1),r=Math.min(r0,r1);
    if(r<l-1e-8)throw Error('Franja demasiado alta');if(r-l>1e-8)floorPieces.push(cube(`MixedDeckRectangle_${piece++}`,(l+r)/2,(z0+z1)/2,.98,r-l,z1-z0,.08));
    if(l0<l1-1e-8)triangle([[l0,z0],[l1,z0],[l1,z1]]);else if(l1<l0-1e-8)triangle([[l0,z0],[l0,z1],[l1,z1]]);
    if(r0<r1-1e-8)triangle([[r0,z0],[r1,z1],[r0,z1]]);else if(r1<r0-1e-8)triangle([[r1,z0],[r0,z0],[r1,z1]]);
  }
}
recipe.primitives.push(...floorPieces);
recipe.metadata={...recipe.metadata,footprint:[1.8181980515,2.65],status:'candidate_unexported',floorY:1.02,clearWidth:.70,stairWidth:.72,stairShift:.65,
  ports:[{kind:'cardinal',center:[0,.5],normal:[-1,0]},{kind:'diagonal',center:[1.5,1.5],normal:[Math.SQRT1_2,Math.SQRT1_2]}],
  scope:'Replaces bastion296 and diagonal half of wall237 up to wall237 center; retains west staircase orientation, tread/riser and width, shifts all14 treads0.65west. Not compatible with unchanged stair footprint.',
  floorUnion:floorPolys,route:[[0,.5],[.5,.5],[1.5,1.5]],stairsRoute:[[.5,2.65],[.5,1.65],[.5,.5]],proof:'Floor decomposed into supported recipe cubes/gables; no overlapping coplanar floor faces.'};
const recipePath=`${dir}/${recipe.id}.json`;await writeFile(recipePath,JSON.stringify(recipe,null,2)+'\n');await loadRecipe(recipePath);

const mat=new MeshBasicMaterial({color:0xb0aa98,side:DoubleSide}),convert=new Matrix4().makeRotationX(-Math.PI/2);
function geometry(p:P){let g:BufferGeometry;if(p.type==='cube')g=new BoxGeometry(...p.dimensions! as [number,number,number]);else {
  const w=p.width!,d=p.depth!,h=p.height!,v=[[-w/2,-d/2,0],[w/2,-d/2,0],[0,-d/2,h],[-w/2,d/2,0],[w/2,d/2,0],[0,d/2,h]];
  const faces=[[0,1,2],[3,5,4],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]];g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>v[i]!)),3));g.computeVertexNormals();}
  // Blender XYZ aplica Rz·Ry·Rx; en Three corresponde al orden intrínseco ZYX.
  const e=p.rotationDegrees??[0,0,0];g.applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(e[0]!*Math.PI/180,e[1]!*Math.PI/180,e[2]!*Math.PI/180,'ZYX')));
  g.translate(...p.location as [number,number,number]);g.applyMatrix4(convert);return g;
}
const model=new Group();for(const p of recipe.primitives){const m=new Mesh(geometry(p),mat);m.name=p.name;model.add(m);}model.updateMatrixWorld(true);
const upper=recipe.primitives.filter(p=>p.type==='cube'&&p.dimensions&&p.location[2]!+p.dimensions[2]!/2>1.02001);
function distance(x:number,z:number,p:P){const a=-(p.rotationDegrees?.[2]??0)*Math.PI/180,dx=x-p.location[0]!,dz=z+p.location[1]!,u=dx*Math.cos(a)+dz*Math.sin(a),v=-dx*Math.sin(a)+dz*Math.cos(a);return Math.hypot(Math.max(0,Math.abs(u)-p.dimensions![0]!/2),Math.max(0,Math.abs(v)-p.dimensions![1]!/2));}
function routeCheck(name:string,route:Pt[]){let min=Infinity,best;for(let i=1;i<route.length;i++){const a=route[i-1]!,b=route[i]!,n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.002);for(let k=0;k<=n;k++){const t=k/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;for(const p of upper){const d=distance(x,z,p);if(d<min){min=d;best={x,z,part:p.name};}}}}return{name,minCenterlineDistance:min,width070Pass:min>=.35-1e-8,radius032Margin:min-.32,best};}
const routes=[routeCheck('ring',[[0,.5],[.5,.5],[1.5,1.5]]),routeCheck('stair-landing',[[.5,1.65],[.5,.5]])];
function corners(p:P):Pt[]{const a=-(p.rotationDegrees?.[2]??0)*Math.PI/180;return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const x=u!*p.dimensions![0]!/2,z=v!*p.dimensions![1]!/2;return [p.location[0]!+x*Math.cos(a)-z*Math.sin(a),-p.location[1]!+x*Math.sin(a)+z*Math.cos(a)];});}
function touches(a:P,b:P){const pa=corners(a),pb=corners(b);for(const poly of [pa,pb])for(let i=0;i<4;i++){const p=poly[i]!,q=poly[(i+1)%4]!,nx=q[1]-p[1],nz=p[0]-q[0],aa=pa.map(v=>v[0]*nx+v[1]*nz),bb=pb.map(v=>v[0]*nx+v[1]*nz);if(Math.max(...aa)<Math.min(...bb)-1e-9||Math.max(...bb)<Math.min(...aa)-1e-9)return false;}return true;}
const railContinuity=[['WestNorthCap','Parapet_0'],['Parapet_0','EastNorthParapet'],['EastNorthParapet','DiagonalOuterParapet'],['WestSouthCap','LandingWestParapet'],['LandingEastParapet','DiagonalInnerParapet']].map(([a,b])=>({a,b,touches:touches(recipe.primitives.find(p=>p.name===a)!,recipe.primitives.find(p=>p.name===b)!)}));
// La sección del portal termina en otro módulo; no se pide a éste suelo más allá.
const floorCheck=[];
for(const [name,a,b] of [['main',[.5,.5],[1.25,1.25]],['landing',[.5,.5],[.5,1.29]]] as [string,Pt,Pt][]){let fails=0,samples=0;for(let i=0;i<=100;i++)for(let j=0;j<64;j++){
  const t=i/100,theta=j*Math.PI/32,q=new Vector3(a[0]+(b[0]-a[0])*t+.35*Math.cos(theta),1.025,a[1]+(b[1]-a[1])*t+.35*Math.sin(theta));const hits=new Raycaster(q,new Vector3(0,-1,0),0,.02).intersectObject(model,true);samples++;if(!hits.some(h=>Math.abs(h.point.y-1.02)<1e-6))fails++;}
  floorCheck.push({name,samples,failures:fails});}
const sourceGlb='public/assets/valley3d/bastion-access-candidate.glb',bytes=await readFile(sourceGlb),original=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;original.updateMatrixWorld(true);original.traverse(n=>{if(n instanceof Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])m.side=DoubleSide;});
const oldCollision=[];for(const z of [1.1,1.2,1.3]){const x=.75,hits=new Raycaster(new Vector3(x,2,z),new Vector3(0,-1,0)).intersectObject(original,true);const surface=hits[0]?.point.y??null;
  oldCollision.push({x,z,oldStairY:surface,overlapWithDiagonalFootprint:Math.abs(x-z)<=.9*Math.SQRT1_2&&x+z>=1&&x+z<=3,headroomUnderNewDeck:surface===null?null:.94-surface});}
const report={sourceRecipeSha256:createHash('sha256').update(await readFile(sourcePath)).digest('hex'),sourceGlbSha256:createHash('sha256').update(bytes).digest('hex'),recipeSha256:createHash('sha256').update(await readFile(recipePath)).digest('hex'),
  primitiveCount:recipe.primitives.length,triangleCount:model.children.reduce((sum,m)=>sum+((m as Mesh).geometry.index?.count??(m as Mesh).geometry.getAttribute('position').count)/3,0),floorPieces:floorPieces.length,
  routes,railContinuity,floorCheck,oldCollision,localBounds:new Box3().setFromObject(model),stair:{shift:.65,oldRun:1,newRun:1,riser:1.02/14,tread:1/14,width:.72,topLandingEnd:1.65,bottom:2.65,worldOldFoot:[49,55.5],worldNewFoot:[48.35,55.5]},
  worldPorts:{cardinal:[50.5,55],diagonal:[49.5,56.5]},scope:'Owns bastion296 and half of237. Remaining237 cardinal turn is outside this model. Changes stair footprint; old immutable footprint cannot coexist with this full-width solid deck.'};
await writeFile(`${out}/measurements.json`,JSON.stringify(report,null,2)+'\n');

function plate(plan:boolean){const faces:{v:number[][];normal:Vector3;color:string}[]=[];model.traverse(n=>{if(!(n instanceof Mesh))return;const g=n.geometry,p=g.getAttribute('position'),ix=g.index;for(let i=0;i<(ix?ix.count:p.count);i+=3){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,ix?ix.getX(i+k):i+k));const normal=new Triangle(...v as [Vector3,Vector3,Vector3]).getNormal(new Vector3());if(plan?normal.y<=0:normal.x+normal.y*.8+normal.z<=0)continue;const shade=154+Math.round((normal.y*.4+Math.abs(normal.x)*.15)*70);faces.push({v:v.map(q=>q.toArray()),normal,color:`rgb(${shade+8},${shade+5},${shade-8})`});}});
  const project=(p:number[])=>plan?[180+p[0]!*260,105+p[2]!*240]:[560+(p[0]!-p[2]!)*210,390+(p[0]!+p[2]!)*84-p[1]!*210];
  faces.sort((a,b)=>a.v.reduce((s,v)=>s+(plan?v[1]!:v[0]!+v[2]!+.8*v[1]!),0)-b.v.reduce((s,v)=>s+(plan?v[1]!:v[0]!+v[2]!+.8*v[1]!),0));
  const line=(pts:Pt[],color:string)=>`<polyline points="${pts.map(p=>project([p[0],1.025,p[1]]).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="940"><rect width="1100" height="940" fill="#f1eee6"/><g font-family="sans-serif" fill="#26302c"><text x="25" y="40" font-size="24">Bastion 296 · mixed contour · ${plan?'planta':'isometrica'} CPU</text><text x="25" y="70" font-size="16">Candidato sin exportar · escalera oeste prolongada 0.65 · piso Y=1.02</text></g>${faces.map(f=>`<polygon points="${f.v.map(v=>project(v).join(',')).join(' ')}" fill="${f.color}" stroke="#7b7e73" stroke-width=".25"/>`).join('')}${plan?line([[0,.5],[.5,.5],[1.5,1.5]],'#317c8a')+line([[.5,1.65],[.5,.5]],'#bf9137'):''}<g font-family="sans-serif" fill="#26302c" font-size="17"><text x="25" y="860">Paso 0.70 · catorce peldanos originales trasladados; pendiente y ancho conservados.</text><text x="25" y="890">Incluye media union diagonal del muro 237; no cabe en la huella antigua.</text><text x="25" y="920">Proyeccion tecnica: no render Blender ni captura del juego.</text></g></svg>`;
}
await writeFile(`${out}/mixed-plan.svg`,plate(true));await writeFile(`${out}/mixed-iso.svg`,plate(false));console.log(JSON.stringify(report,null,2));
