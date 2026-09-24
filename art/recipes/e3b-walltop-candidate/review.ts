/** Recetas candidatas y evidencia geométrica CPU; no exporta GLB ni modifica el juego. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Mesh, Vector3, Triangle, Box3 } from 'three';
import type { Object3D } from 'three';
import { loadRecipe } from '../../../tools/art/recipe';
import { buildFromAsset } from '../../../src/render3d/world/buildings';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { elevatedRingOf } from '../../../src/derive/elevated-ring';
import { planFor } from '../../../src/render3d/world/plan';

const dir = 'art/recipes/e3b-walltop-candidate';
const out = 'artifacts/graphics/E3b2-candidates/walltop-review-01';
await mkdir(out, { recursive: true });
type Box = { name: string; x: number; z: number; y: number; w: number; d: number; h: number; angle: number };
const box = (name: string, x: number, z: number, y: number, w: number, d: number, h: number, angle=0): Box => ({name,x,z,y,w,d,h,angle});
const straight = [box('StoneBody',.5,.5,.47,1,.90,.94),box('Deck',.5,.5,.98,1,.90,.08),
  box('ParapetNorth',.5,.10,1.11,1,.10,.18),box('ParapetSouth',.5,.90,1.11,1,.10,.18)];
const turn = [box('StoneBody',.5,.5,.47,.90,.90,.94),box('Deck',.5,.5,.98,.90,.90,.08),
  box('NorthBody',.5,.025,.47,.90,.05,.94),box('NorthDeck',.5,.025,.98,.90,.05,.08),
  box('EastBody',.975,.5,.47,.05,.90,.94),box('EastDeck',.975,.5,.98,.05,.90,.08),
  box('ParapetWest',.10,.45,1.11,.10,.90,.18),box('ParapetSouth',.55,.90,1.11,.80,.10,.18),
  box('ParapetInnerNorth',.90,.075,1.11,.10,.15,.18),box('ParapetInnerEast',.975,.10,1.11,.05,.10,.18)];
const diagonal = straight.map(p => {
  const dz = p.z-.5;
  return {...p, x:.5-dz*Math.SQRT1_2,z:.5+dz*Math.SQRT1_2,w:Math.SQRT2,angle:45};
});
const gate = [box('WestPier',.04,.5,.47,.08,.90,.94),box('EastPier',.96,.5,.47,.08,.90,.94),...straight.filter(p=>p.name!=='StoneBody')];
const variants = [{id:'straight',boxes:straight,route:[[0,.5],[1,.5]],condition:'cardinal_only'},
  {id:'turn-ne',boxes:turn,route:[[.5,0],[.5,.5],[1,.5]],condition:'cardinal_only'},
  {id:'gate-cardinal-shell',boxes:gate,route:[[0,.5],[1,.5]],condition:'shell_only; door, structural load and existing gate compatibility unapproved'},
  {id:'diagonal-se',boxes:diagonal,route:[[0,0],[1,1]],condition:'lateral_cells_require_mesh_and_trunk_clearance'}];
const recipeReports = [];
function corners(b:Box): number[][] {
  const a=b.angle*Math.PI/180;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v]) => [b.x+u!*b.w/2*Math.cos(a)-v!*b.d/2*Math.sin(a),b.z+u!*b.w/2*Math.sin(a)+v!*b.d/2*Math.cos(a)]);
}
for (const v of variants) {
  const recipe = {schemaVersion:1,id:`e3b-walltop-${v.id}-candidate`,scale:1,mergeByMaterial:true,palette:'../palette.json',
    metadata:{kind:'e3b-walltop-candidate',footprint:v.id.includes('diagonal')?[1+.9*Math.SQRT1_2,1+.9*Math.SQRT1_2]:[1,1],status:'candidate_unexported',floorY:1.02,clearWidth:.70,bodyRadius:.32,parapetTop:1.20,condition:v.condition,
      routeXZ:v.route,replaces:'published stone wall geometry, not an overlay',unit:'game cell; 1 cell = 3 physical meters',
      rotation:'Positive world XZ angle maps to negative Blender Z rotation; quarter-turn variants are rigid rotations about cell center'},
    materials:[{name:'stone',role:'stone',roughness:.95}],groups:[{name:'Root',location:[0,0,0],parent:null}],
    primitives:v.boxes.map(p=>({type:'cube',name:p.name,location:[p.x,-p.z,p.y],dimensions:[p.w,p.d,p.h],rotationDegrees:[0,0,-p.angle],material:'stone',parent:'Root'})),
    clips:[],connectors:[],referenceRender:{width:1000,height:800,cameraLocation:[2,-3,2],cameraTarget:[.5,-.5,.65],orthoScale:2.3,worldRole:'sky'}};
  const path=`${dir}/${recipe.id}.json`;
  await writeFile(path,JSON.stringify(recipe,null,2)+'\n');
  await loadRecipe(path);
  let minimum=Infinity;
  for(let seg=1;seg<v.route.length;seg++) for(let i=0;i<=250;i++) {
    const t=i/250,a=v.route[seg-1]!,b=v.route[seg]!;
    const x=a[0]!+(b[0]!-a[0]!)*t,z=a[1]!+(b[1]!-a[1]!)*t;
    for(const p of v.boxes.filter(p=>p.name.startsWith('Parapet'))) {
      const theta=p.angle*Math.PI/180,dx=x-p.x,dz=z-p.z;
      const localX=dx*Math.cos(theta)+dz*Math.sin(theta), localZ=-dx*Math.sin(theta)+dz*Math.cos(theta);
      minimum=Math.min(minimum,Math.hypot(Math.max(0,Math.abs(localX)-p.w/2),Math.max(0,Math.abs(localZ)-p.d/2)));
    }
  }
  const pts=v.boxes.flatMap(corners);
  recipeReports.push({id:v.id,sha256:createHash('sha256').update(await readFile(path)).digest('hex'),triangles:v.boxes.length*12,materials:1,
    footprint:{minX:Math.min(...pts.map(p=>p[0]!)),maxX:Math.max(...pts.map(p=>p[0]!)),minZ:Math.min(...pts.map(p=>p[1]!)),maxZ:Math.max(...pts.map(p=>p[1]!))},
    minCenterlineToParapet:minimum,radius032Margin:minimum-.32,width070Pass:minimum>=.35-1e-8,condition:v.condition});
}

const loader=new GLTFLoader(), cache=new Map<string,Object3D>(), hashes:Record<string,string>={};
async function src(id:string) {
  if(!cache.has(id)) {
    const bytes=await readFile(`public/assets/valley3d/${id}.glb`);
    hashes[id]=createHash('sha256').update(bytes).digest('hex');
    cache.set(id,(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene);
  }
  return cache.get(id)!.clone(true);
}
function triangles(object:Object3D) {
  const result:Triangle[]=[];object.updateMatrixWorld(true);
  object.traverse(o=>{if(!(o instanceof Mesh))return;const g=o.geometry,p=g.getAttribute('position'),ix=g.index;
    for(let i=0;i<(ix?ix.count:p.count);i+=3) {
      const at=(n:number)=>new Vector3().fromBufferAttribute(p,ix?ix.getX(n):n).applyMatrix4(o.matrixWorld);
      result.push(new Triangle(at(i),at(i+1),at(i+2)));
    }
  });return result;
}
const state=foundGame(91);run(state,3846,'prudent',CATALOG);
const ring=elevatedRingOf(state,state.buildings.find(b=>b.id===295)!,{approvedVariants:['straight','turn','diagonal','mixed','gate-cardinal','gate-diagonal','gate-mixed','bastion-return']});
const plan=planFor(state), real=[];
const walls=[200,201,214,226,229,231,241];
for(const s of ring.segments.filter(s=>walls.includes(s.buildingId))) {
  const inward={x:s.to.x-s.cell.x-.5,z:s.to.z-s.cell.z-.5};
  const cell={x:s.cell.x+(Math.abs(inward.x)>=Math.abs(inward.z)?Math.sign(inward.x):0),z:s.cell.z+(Math.abs(inward.z)>=Math.abs(inward.x)?Math.sign(inward.z):0)};
  const building=state.buildings.find(b=>b.lostTick===null&&b.x<=cell.x&&b.x+b.w>cell.x&&b.y<=cell.z&&b.y+b.h>cell.z)!;
  const planned=plan.buildings.find(b=>b.id===building.id)!;
  const tris=triangles(buildFromAsset(planned,await src(planned.asset!)).object);
  // La ruta nueva une los centros reales de las dos celdas; no conserva el offset previo.
  const a={x:s.cell.x+s.incoming.x+.5,z:s.cell.z+s.incoming.z+.5},b={x:s.cell.x+.5,z:s.cell.z+.5};
  let minimum=Infinity;const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.004);
  for(let i=0;i<=n;i++) {const t=i/n,q=new Vector3(a.x+(b.x-a.x)*t,1.02,a.z+(b.z-a.z)*t);
    for(const tri of tris) minimum=Math.min(minimum,tri.closestPointToPoint(q,new Vector3()).distanceTo(q));}
  real.push({wallId:s.buildingId,buildingId:building.id,asset:planned.asset,from:a,to:b,minDistance:minimum,radius032Margin:minimum-.32,width070Margin:minimum-.35});
}
const old=buildFromAsset(plan.buildings.find(b=>b.id===226)!,await src('wall')).object;
const oldBounds=new Box3().setFromObject(old);
const diagonalEdges=ring.segments.filter(s=>Math.abs(s.incoming.x)+Math.abs(s.incoming.z)===2).map(s=>({wallId:s.buildingId,
  corner:{x:s.cell.x+.5+s.incoming.x/2,z:s.cell.z+.5+s.incoming.z/2},
  lateralCells:[{x:s.cell.x+s.incoming.x,z:s.cell.z},{x:s.cell.x,z:s.cell.z+s.incoming.z}].map(cell=>({cell,
    buildings:state.buildings.filter(b=>b.lostTick===null&&b.x<=cell.x&&b.x+b.w>cell.x&&b.y<=cell.z&&b.y+b.h>cell.z).map(b=>({id:b.id,kind:b.kind})),
    terrain:state.map.terrain[cell.z*state.map.width+cell.x],forestAge:state.map.forestAge[cell.z*state.map.width+cell.x]}))}));
await writeFile(`${out}/measurements.json`,JSON.stringify({seed:91,tick:3846,units:'game cells, not meters',recipeReports,realBuildingClearance:real,
  publishedWall:{bounds:oldBounds,sha256:hashes.wall,note:'Published top is below floor. Candidate replaces narrow wall with full-width masonry; it is not a validated overlay.'},
  sourceHashes:hashes,diagonal:{strictCellImpossible:true,usableBleed:.35*Math.SQRT1_2,bodyBleed:.32*Math.SQRT1_2,fullBleed:.45*Math.SQRT1_2,edges:diagonalEdges,
    condition:'Occupied lateral cells need mesh overlap audit; forest cells need actual dispersed trunk transforms. Neither is approved by this model audit.'},
  limits:['Feet-plane mesh-distance proxy, not animated body volume','Seven known adjacent obstructions only','No GPU, Blender, GLB export, Rapier or mobile performance validation']},null,2)+'\n');

// Lámina vectorial del modelo candidato: proyección CPU, sin afirmar una captura de Blender.
function svg(v:typeof variants[number],isometric:boolean) {
  const scale=240, proj=(x:number,y:number,z:number)=>isometric?[420+(x-z)*scale,450+(x+z)*scale*.42-y*scale]:[260+x*scale,150+z*scale];
  const pts=(vs:number[][])=>vs.map(p=>proj(p[0]!,p[1]!,p[2]!).join(',')).join(' ');
  const faces:{p:number[][];depth:number;fill:string}[]=[];
  for(const b of v.boxes) {const c=corners(b),lo=b.y-b.h/2,hi=b.y+b.h/2;
    const top=c.map(p=>[p[0]!,hi,p[1]!]);faces.push({p:top,depth:b.x+b.z+hi*.01,fill:b.name==='Deck'||b.name.endsWith('Deck')?'#b9bba6':'#c6beb0'});
    if(isometric)for(let i=0;i<4;i++) {const p=c[i]!,q=c[(i+1)%4]!;faces.push({p:[[p[0]!,lo,p[1]!],[q[0]!,lo,q[1]!],[q[0]!,hi,q[1]!],[p[0]!,hi,p[1]!]],depth:(p[0]!+p[1]!+q[0]!+q[1]!)/2-.001,fill:i%2?'#8c8b80':'#a7a394'});}
  }
  faces.sort((a,b)=>a.depth-b.depth);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="740" viewBox="0 0 900 740"><rect width="900" height="740" fill="#f1eee6"/><g font-family="sans-serif" fill="#273132"><text x="35" y="45" font-size="25">Walltop / ${v.id} / ${isometric?'isometric':'plan'}</text><text x="35" y="78" font-size="16">Candidato sin exportar · proyeccion geometrica CPU · unidad: celda</text></g>${faces.map(f=>`<polygon points="${pts(f.p)}" fill="${f.fill}" stroke="#59605b" stroke-width="1"/>`).join('')}${!isometric?`<polygon points="${pts([[0,1.22,0],[1,1.22,0],[1,1.22,1],[0,1.22,1]])}" fill="none" stroke="#ba5140" stroke-dasharray="7 5"/><polyline points="${pts(v.route.map(p=>[p[0]!,1.023,p[1]!]))}" fill="none" stroke="#2f7990" stroke-width="4"/>${v.route.map(p=>{const q=proj(p[0]!,1.03,p[1]!);return `<circle cx="${q[0]}" cy="${q[1]}" r="${scale*.32}" stroke="#cc9a24" fill="none" stroke-dasharray="3 4"/>`;}).join('')}`:''}<g font-family="sans-serif" fill="#273132" font-size="17"><text x="35" y="665">Suelo Y=1.02 · paso util 0.70 · pretiles 0.10 × 0.18</text><text x="35" y="697">${v.id.includes('diagonal')?'Diagonal: sobresale 0.3182 por eje; exige espacio lateral libre.':'Radio corporal 0.32: margen geometrico minimo 0.03 por lado.'}</text></g></svg>`;
}
for(const v of variants)for(const iso of [false,true])await writeFile(`${out}/${v.id}-${iso?'iso':'plan'}.svg`,svg(v,iso));
console.log(JSON.stringify({recipeReports,realBuildingClearance:real,publishedWallTop:oldBounds.max.y,diagonalEdges},null,2));
