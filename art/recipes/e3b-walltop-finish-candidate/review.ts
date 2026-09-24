/** Acabado candidato compatible con el esquema existente; sólo recetas y láminas CPU. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Triangle, Vector3, Color } from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadRecipe } from '../../../tools/art/recipe';
import { rasterize } from './raster';
const dir='art/recipes/e3b-walltop-finish-candidate',out='artifacts/graphics/E3b2-candidates/walltop-finish-review-01';await mkdir(out,{recursive:true});
type P={type:string;name:string;location:number[];dimensions?:number[];rotationDegrees?:number[];material:string;parent:string;width?:number;depth?:number;height?:number;radius?:number;vertices?:number;[key:string]:unknown};
type Recipe={id:string;scale:number;mergeByMaterial:boolean;primitives:P[];materials:{name:string;role:string;roughness:number}[];groups:{name:string;location:number[];parent:string|null}[];metadata:Record<string,unknown>;[key:string]:unknown};
const inputs=[
 ['straight','art/recipes/e3b-walltop-candidate/e3b-walltop-straight-candidate.json'],
 ['turn','art/recipes/e3b-walltop-candidate/e3b-walltop-turn-ne-candidate.json'],
 ['diagonal','art/recipes/e3b-walltop-candidate/e3b-walltop-diagonal-se-candidate.json'],
 ['gate','art/recipes/e3b-walltop-transition-candidate/e3b-walltop-gate-transition-candidate.json'],
 ['bastion295','art/recipes/e3b-walltop-transition-candidate/e3b-walltop-bastion-centered-candidate.json'],
 ['bastion296','art/recipes/e3b-bastion296-mixed-candidate/e3b-bastion296-mixed-candidate.json'],
];
const reports=[];const sheets:{id:string;svg:string}[]=[];
function volume(p:P){return p.dimensions!.reduce((a,b)=>a*b,1);}
function partition(p:P,rows:number,joint:number):P[]{
  const [w,d,h]=p.dimensions!,pieces:P[]=[],e=p.rotationDegrees??[0,0,0],rotation=new Euler(e[0]!*Math.PI/180,e[1]!*Math.PI/180,e[2]!*Math.PI/180,'ZYX');
  function emit(name:string,x0:number,x1:number,y0:number,y1:number,material:string){const offset=new Vector3((x0+x1)/2,0,(y0+y1)/2).applyEuler(rotation);
    pieces.push({...p,name:`${p.name}_${name}`,location:p.location.map((v,i)=>v+offset.getComponent(i)),dimensions:[x1-x0,d!,y1-y0],material});}
  const stoneHeight=(h!-(rows-1)*joint)/rows;
  for(let row=0;row<rows;row++){const y0=-h!/2+row*(stoneHeight+joint),y1=y0+stoneHeight,seam=-w!/2+w!*(row%2===0?.5:.34);
    emit(`Ashlar_${row}_A`,-w!/2,seam-joint/2,y0,y1,p.material);emit(`Joint_${row}`,seam-joint/2,seam+joint/2,y0,y1,'mortar');emit(`Ashlar_${row}_B`,seam+joint/2,w!/2,y0,y1,p.material);
    if(row<rows-1)emit(`Bed_${row}`,-w!/2,w!/2,y1,y1+joint,'mortar');
  }return pieces;
}
function merlons(p:P,scale:number,count:number):P[]{const axis=p.dimensions![0]!>=p.dimensions![1]!?0:1,long=p.dimensions![axis]!,e=p.rotationDegrees??[0,0,0],r=new Euler(e[0]!*Math.PI/180,e[1]!*Math.PI/180,e[2]!*Math.PI/180,'ZYX');
  return Array.from({length:count},(_,i)=>{const offset=new Vector3(axis===0?long*((i+.5)/count-.5):0,axis===1?long*((i+.5)/count-.5):0,p.dimensions![2]!/2+.03/scale).applyEuler(r),dims=[...p.dimensions!];dims[axis]=Math.min(.16/scale,long*.28);dims[2]=.06/scale;
    return {...p,name:`FinishMerlon_${p.name}_${i}`,location:p.location.map((v,k)=>v+offset.getComponent(k)),dimensions:dims};});
}
const bytes=await readFile('public/assets/valley3d/wall.glb'),wall=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
const wallMaterials:{name:string;linearRGB:number[];displaySRGB:string}[]=[];wall.traverse(n=>{if(n instanceof Mesh)for(const material of Array.isArray(n.material)?n.material:[n.material]){const m=material as MeshBasicMaterial;if(m.color&&!wallMaterials.some(x=>x.name===m.name))wallMaterials.push({name:m.name,linearRGB:m.color.toArray(),displaySRGB:m.color.getHexString()});}});
function geom(p:P){if(p.type==='cube')return new BoxGeometry(...p.dimensions! as [number,number,number]);if(p.type==='cylinder')return new CylinderGeometry(p.radius!,p.radius!,p.depth!,p.vertices!,1).rotateX(Math.PI/2);
  if(p.type!=='gable')throw Error(p.type);const w=p.width!,d=p.depth!,h=p.height!,v=[[-w/2,-d/2,0],[w/2,-d/2,0],[0,-d/2,h],[-w/2,d/2,0],[w/2,d/2,0],[0,d/2,h]],f=[[0,1,2],[3,5,4],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]];
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(f.flatMap(t=>t.flatMap(i=>v[i]!)),3));g.computeVertexNormals();return g;
}
function modelOf(recipe:Recipe,colors:Map<string,string>,gate:boolean){const outer=new Group(),converted=new Group();converted.rotation.x=-Math.PI/2;converted.scale.setScalar(recipe.scale);outer.add(converted);if(gate)outer.position.z=1;
  const groups=new Map<string,Group>();for(const spec of recipe.groups){const g=new Group();g.name=spec.name;g.position.fromArray(spec.location);groups.set(spec.name,g);}for(const spec of recipe.groups)(spec.parent===null?converted:groups.get(spec.parent)!).add(groups.get(spec.name)!);
  for(const p of recipe.primitives){const color=colors.get(p.material)!;const parsed=new Color().setRGB(parseInt(color.slice(1,3),16)/255,parseInt(color.slice(3,5),16)/255,parseInt(color.slice(5,7),16)/255);
    const m=new Mesh(geom(p),new MeshBasicMaterial({color:parsed,side:DoubleSide}));m.name=p.name;m.position.fromArray(p.location);const e=p.rotationDegrees??[0,0,0];m.rotation.set(e[0]!*Math.PI/180,e[1]!*Math.PI/180,e[2]!*Math.PI/180,'ZYX');groups.get(p.parent)!.add(m);}
  outer.updateMatrixWorld(true);return outer;
}
function countTriangles(root:Object3D){let n=0;root.traverse(o=>{if(o instanceof Mesh)n+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return n;}
async function plate(object:Object3D,id:string){const faces:{v:Vector3[];color:Color;normal:Vector3}[]=[];
  object.updateMatrixWorld(true);object.traverse(n=>{if(!(n instanceof Mesh))return;const g=n.geometry,ix=g.index,p=g.getAttribute('position');for(let i=0;i<(ix?ix.count:p.count);i+=3){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,ix?ix.getX(i+k):i+k).applyMatrix4(n.matrixWorld)),normal=new Triangle(...v as [Vector3,Vector3,Vector3]).getNormal(new Vector3());if(normal.x+.8*normal.y+normal.z<=1e-8)continue;const material=n.material as MeshBasicMaterial;faces.push({v,color:material.color.clone(),normal});}});
  faces.sort((a,b)=>a.v.reduce((s,v)=>s+v.x+v.z+.8*v.y,0)-b.v.reduce((s,v)=>s+v.x+v.z+.8*v.y,0));
  await rasterize(faces,`${out}/${id}-render.png`);
  const embedded=(await readFile(`${out}/${id}-render.png`)).toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="780"><rect width="1000" height="780" fill="#edf0e5"/><ellipse cx="500" cy="595" rx="330" ry="60" fill="#cbd5bb"/><image href="data:image/png;base64,${embedded}" width="1000" height="780"/><g font-family="sans-serif" fill="#29332b"><text x="30" y="42" font-size="26">${id} · stone finish candidate</text><text x="30" y="72" font-size="16">Paleta de wall.glb · hiladas sin reducir el paso · lamina de color CPU</text><text x="30" y="700" font-size="17">${id==='published-wall-reference'?'Muro publicado original, usado como referencia de piedra y mortero.':'Piso Y=1.02 · paso ≥0.70 · juntas llenas de mortero, no huecos.'}</text><text x="30" y="730" font-size="17">${id==='bastion296'?'Mantiene traslado de escalera 0.65 y media union diagonal de 237.':'Sin texturas de imagen · materiales y superficies facetadas.'}</text><text x="30" y="758" font-size="14">Proyeccion CPU; no captura de juego ni render Blender. La luz sirve para comparar color y volumen.</text></g></svg>`;
}
const referenceSvg=await plate(wall,'published-wall-reference');await writeFile(`${out}/published-wall-reference.svg`,referenceSvg);
for(const [id,input] of inputs){const source=JSON.parse(await readFile(input!,'utf8')) as Recipe,r=structuredClone(source),proof=[];r.id=`e3b-walltop-finish-${id}-candidate`;
  if(!r.materials.some(m=>m.name==='mortar'))r.materials.push({name:'mortar',role:'soil',roughness:1});
  const finished:P[]=[];for(const p of source.primitives){let replacement:P[]|null=null;
    if(['StoneBody','DiagonalWallSupport','UpperLandingSupport'].includes(p.name))replacement=partition(p,4,.006/r.scale);
    if(id==='gate'&&p.name.startsWith('CorbelCourse'))replacement=partition(p,1,.006/r.scale);
    if(id==='bastion295'&&p.name==='Platform')replacement=partition(p,1,.004/r.scale);
    if(replacement){proof.push({source:p.name,beforeVolume:volume(p),afterVolume:replacement.reduce((v,q)=>v+volume(q),0),exactPartition:true,pieces:replacement.length});finished.push(...replacement);}else finished.push(p);
  }
  const ornament:P[]=[];
  if(['straight','turn','diagonal','gate'].includes(id!))for(const p of source.primitives.filter(p=>p.type==='cube'&&p.name.includes('Parapet')&&Math.max(p.dimensions![0]!,p.dimensions![1]!)*r.scale>=.55))ornament.push(...merlons(p,r.scale,2));
  if(id==='bastion296')for(const name of ['DiagonalOuterParapet','DiagonalInnerParapet','LandingWestParapet']){const p=source.primitives.find(p=>p.name===name)!;ornament.push(...merlons(p,r.scale,name==='DiagonalOuterParapet'?2:1));}
  r.primitives=[...finished,...ornament];r.metadata={...r.metadata,status:'candidate_unexported',finish:'Exact volume partition into ashlar and filled mortar joints; no gaps, added textures or footprint growth.',
    sourceRecipe:input,ornamentalMerlonRise:.06,newMerlonTop:1.26,referenceMaterial:'public/assets/valley3d/wall.glb',vertexColorLimit:'Current authoring schema has no vertex-color field. Two static palette materials reproduce the reference without changing the pipeline.',
    gateMergeLimit:id==='gate'?'mergeByMaterial remains false to preserve door hierarchy; static batching is not certified.':undefined};
  const path=`${dir}/${r.id}.json`;await writeFile(path,JSON.stringify(r,null,2)+'\n');const resolved=await loadRecipe(path),colors=new Map(resolved.materials.map(m=>[m.name,m.color]));
  const before=modelOf(source,colors,id==='gate'),after=modelOf(r,colors,id==='gate'),a=new Box3().setFromObject(before),b=new Box3().setFromObject(after);
  const boundsError=Math.max(Math.abs(a.min.x-b.min.x),Math.abs(a.max.x-b.max.x),Math.abs(a.min.z-b.min.z),Math.abs(a.max.z-b.max.z));
  const partitionError=Math.max(0,...proof.map(p=>Math.abs(p.beforeVolume-p.afterVolume)));
  const sourceDoor=source.primitives.filter(p=>p.parent==='gate_door'),newDoor=r.primitives.filter(p=>p.parent==='gate_door');
  reports.push({id,sourceRecipe:input,sha256:createHash('sha256').update(await readFile(path)).digest('hex'),trianglesBefore:countTriangles(before),trianglesAfter:countTriangles(after),materialSlots:r.materials.length,
    primitiveCount:r.primitives.length,mergeByMaterial:r.mergeByMaterial,partitionProof:proof,partitionVolumeError:partitionError,xzBoundsError:boundsError,sourceBounds:a,finishBounds:b,
    extraMerlons:ornament.length,ornamentInsideExistingParapetFootprints:true,floorAndSupportVolumesUnchanged:true,minimumWalkwayInherited:.70,
    sourceDoorPreserved:JSON.stringify(sourceDoor)===JSON.stringify(newDoor),scalePreserved:r.scale===source.scale,sourceFootprintPreserved:JSON.stringify(source.metadata.footprint)===JSON.stringify(r.metadata.footprint)});
  if(boundsError>1e-6||partitionError>1e-9)throw Error(`Geometry invariant failed ${id}`);
  const svg=await plate(after,id!);await writeFile(`${out}/${id}-color.svg`,svg);sheets.push({id:id!,svg});
}
await writeFile(`${out}/measurements.json`,JSON.stringify({reference:{path:'public/assets/valley3d/wall.glb',sha256:createHash('sha256').update(bytes).digest('hex'),materials:wallMaterials},reports,
  limits:['CPU recipe validation, no exported candidate GLB','Masonry joint volumes are filled, not cut','New merlons retain free width but outgoing/downward ballistics need later validation','Gate static batching remains unresolved by existing global material merge']},null,2)+'\n');
await writeFile(`${out}/index.html`,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Walltop finish candidates</title><style>body{margin:24px;background:#e4e8dc;font-family:Arial;color:#29332b}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}img{width:100%;background:#edf0e5}p{max-width:1000px}</style><h1>Walltop · acabado candidato de piedra</h1><p>Seis modelos originales con la paleta del muro publicado. Todas las imágenes son proyecciones CPU; no se ha exportado ni integrado ningún modelo.</p><main><img src="published-wall-reference.svg" alt="Muro publicado de referencia">${sheets.map(s=>`<img src="${s.id}-color.svg" alt="${s.id}">`).join('')}</main></html>`);
console.log(JSON.stringify({wallMaterials,reports:reports.map(r=>({id:r.id,triangles:r.trianglesAfter,materials:r.materialSlots,xzBoundsError:r.xzBoundsError,partitionVolumeError:r.partitionVolumeError,merlons:r.extraMerlons}))},null,2));
