/** Acabado de fuentes mixtas; geometría y láminas CPU, sin exportación. */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Vector2, Vector3, Triangle, ShapeUtils, Color } from 'three';
import { rasterize, type Face } from '../e3b-walltop-finish-candidate/raster';
const sourceDir='art/recipes/e3b-walltop-mixed-candidate',dir='art/recipes/e3b-walltop-mixed-finish-candidate',out='artifacts/graphics/E3b2-candidates/walltop-mixed-finish-review-01';
type P=[number,number];type V=[number,number,number];
type Part={name:string;polygonXZ:P[];bottom:number;top:number;vertices:V[];triangles:number[][];material:string;color?:string;colorLinear?:number[];colorsLinear?:number[][]};
const stone=[155/255,149/255,138/255],mortar=[134/255,96/255,68/255];
const add=(a:P,b:P):P=>[a[0]+b[0],a[1]+b[1]],sub=(a:P,b:P):P=>[a[0]-b[0],a[1]-b[1]],mul=(a:P,t:number):P=>[a[0]*t,a[1]*t],dot=(a:P,b:P)=>a[0]*b[0]+a[1]*b[1],cross=(a:P,b:P)=>a[0]*b[1]-a[1]*b[0];
function pd(p:P,a:P,b:P){const d=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),d)/dot(d,d)));return Math.hypot(...sub(p,add(a,mul(d,t))));}
function sd(a:P,b:P,c:P,d:P){const ab=sub(b,a),cd=sub(d,c),det=cross(ab,cd);if(Math.abs(det)>1e-12){const t=cross(sub(c,a),cd)/det,u=cross(sub(c,a),ab)/det;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}return Math.min(pd(a,c,d),pd(b,c,d),pd(c,a,b),pd(d,a,b));}
function inside(p:P,poly:P[]){return poly.every((a,i)=>cross(sub(poly[(i+1)%poly.length]!,a),sub(p,a))>=-1e-9);}
function prism(name:string,poly:P[],bottom:number,top:number,color:number[],joints:number[]=[],fraction=.5):Part{
  const boundary:P[]=[],sideColors:number[][]=[];
  for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!,d=sub(b,a),length=Math.hypot(...d);boundary.push(a);
    if(joints.includes(i)){boundary.push(add(a,mul(d,fraction-.003/length)),add(a,mul(d,fraction+.003/length)));sideColors.push(color,mortar,color);}else sideColors.push(color);}
  const n=boundary.length,vertices:V[]=[...boundary.map(([x,z]):V=>[x,bottom,z]),...boundary.map(([x,z]):V=>[x,top,z])],triangles:number[][]=[],faceColors:number[][]=[];
  const emit=(f:number[],c:number[])=>{triangles.push(f);faceColors.push(c);};
  if(joints.length){const center=poly.reduce((a,p)=>add(a,p),[0,0] as P).map(v=>v/poly.length) as P;vertices.push([center[0],bottom,center[1]],[center[0],top,center[1]]);
    for(let i=0;i<n;i++){const j=(i+1)%n;if(cross(sub(boundary[i]!,center),sub(boundary[j]!,center))<=0)throw Error('Cap center outside polygon kernel');emit([2*n,i,j],color);emit([2*n+1,j+n,i+n],color);}}
  else for(const [a,b,c] of ShapeUtils.triangulateShape(boundary.map(p=>new Vector2(...p)),[])){emit([a!,b!,c!],color);emit([c!+n,b!+n,a!+n],color);}
  for(let i=0;i<n;i++){const j=(i+1)%n;emit([i,i+n,j+n],sideColors[i]!);emit([i,j+n,j],sideColors[i]!);}
  // Se duplican sólo los vértices que cruzan una frontera de color; evita interpolación de la junta.
  const colored:V[]=[],colorsLinear:number[][]=[],map=new Map<string,number>();
  const indices=triangles.map((f,k)=>f.map(i=>{const key=`${i}:${faceColors[k]!.join(',')}`;let ix=map.get(key);if(ix===undefined){ix=colored.length;map.set(key,ix);colored.push(vertices[i]!);colorsLinear.push(faceColors[k]!);}return ix;}));
  return {name,polygonXZ:poly,bottom,top,vertices:colored,triangles:indices,material:'stone',colorLinear:color,colorsLinear};
}
function topology(p:Part){const keys=p.vertices.map(v=>v.map(x=>Math.round(x*1e10)).join(',')),edges=new Map<string,{count:number;direction:number}>();let volume=0,minArea=Infinity;
  for(const f of p.triangles){const v=f.map(i=>new Vector3(...p.vertices[i]!));volume+=v[0]!.dot(v[1]!.clone().cross(v[2]!))/6;minArea=Math.min(minArea,new Triangle(...v as [Vector3,Vector3,Vector3]).getArea());
    for(let i=0;i<3;i++){const a=keys[f[i]!]!,b=keys[f[(i+1)%3]!]!,key=[a,b].sort().join('|'),e=edges.get(key)??{count:0,direction:0};e.count++;e.direction+=a<b?1:-1;edges.set(key,e);}}
  return {name:p.name,closedOriented:[...edges.values()].every(e=>e.count===2&&e.direction===0),signedVolume:volume,minArea,triangles:p.triangles.length};}
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const reports=[],cards:string[]=[];
for(const file of (await readdir(sourceDir)).filter(f=>f.endsWith('.mesh.json')).sort()){
  const sourceBytes=await readFile(`${sourceDir}/${file}`),source=JSON.parse(sourceBytes.toString()),parts:Part[]=[],proof=[];
  const floor=source.parts.find((p:Part)=>p.name==='Deck').polygonXZ as P[];
  const facadeEdges=floor.map((a,i)=>({i,length:Math.hypot(...sub(floor[(i+1)%floor.length]!,a)),port:source.ports.some((p:{sectionEnds:[P,P]})=>pd(a,...p.sectionEnds)<1e-9&&pd(floor[(i+1)%floor.length]!,...p.sectionEnds)<1e-9)})).filter(e=>!e.port).sort((a,b)=>b.length-a.length).map(e=>e.i);
  for(const p of source.parts as Part[]){if(p.name.startsWith('StoneCourse')){const row=Number(p.name.at(-1))-1,bottom=p.bottom+(row>0?.003:0),top=p.top-(row<3?.003:0),body=prism(p.name,p.polygonXZ,bottom,top,stone,facadeEdges.slice(0,row%2?2:4),row%2?.34:.5);parts.push(body);if(row<3)parts.push(prism(`MortarBed${row+1}`,p.polygonXZ,p.top-.003,p.top+.003,mortar));}
    else {const q=structuredClone(p);delete q.color;q.colorLinear=stone;q.colorsLinear=q.vertices.map(()=>stone);parts.push(q);}}
  for(const p of source.parts.filter((p:Part)=>p.name.startsWith('Parapet')) as Part[]){const poly=p.polygonXZ;let ornament:Part|undefined;
    // El centro de cada cuadrilátero está sobre el eje del pretil; se comprueba la caja completa.
    const c=mul(poly.reduce((a,p)=>add(a,p),[0,0] as P),.25),edges=poly.map((a,i)=>sub(poly[(i+1)%4]!,a)),long=edges.reduce((a,b)=>Math.hypot(...a)>Math.hypot(...b)?a:b),d=mul(long,1/Math.hypot(...long)),n:P=[-d[1],d[0]];
    for(const len of [.16,.12,.08,.06]){const corners=[add(add(c,mul(d,-len/2)),mul(n,-.05)),add(add(c,mul(d,len/2)),mul(n,-.05)),add(add(c,mul(d,len/2)),mul(n,.05)),add(add(c,mul(d,-len/2)),mul(n,.05))];
      const ends=poly.map((a,i)=>({a,b:poly[(i+1)%4]!,d:edges[i]!})).filter(e=>Math.abs(dot(e.d,d))<Math.hypot(...e.d)*.8);
      const endMargin=Math.min(...corners.flatMap(v=>ends.map(e=>pd(v,e.a,e.b))));
      if(corners.every(v=>inside(v,poly))&&endMargin>=.12-1e-9){ornament=prism(`FinishMerlon_${p.name}`,corners,1.2,1.26,stone);proof.push({name:ornament.name,length:len,endMargin,containedIn:p.name});break;}}
    if(ornament)parts.push(ornament);
  }
  const recipe={...source,id:`${source.id}-finish`,material:{name:'stone',baseColorLinear:[1,1,1],roughness:.95,vertexColors:true},parts,finish:{colorSpace:'linear RGB; write colorsLinear directly to vertex COLOR_0; no sRGB decoding',geometry:'Closed components; coincident faces retained between courses and on merlon bases; weld equal positions for topology checks',source:`${sourceDir}/${file}`,sourceSha256:hash(sourceBytes),jointWidth:.006,newMerlonTop:1.26}};
  const checks=parts.map(topology),triangles=checks.reduce((s,p)=>s+p.triangles,0),beforeVolume=(source.parts as Part[]).reduce((s,p)=>s+topology(p).signedVolume,0),baseVolume=checks.filter(p=>!p.name.startsWith('FinishMerlon')).reduce((s,p)=>s+p.signedVolume,0);
  let clearance=Infinity;for(let k=0;k<2;k++)for(const p of parts.filter(p=>p.bottom>=1.02))for(let i=0;i<p.polygonXZ.length;i++)clearance=Math.min(clearance,sd(source.routeXZ[k],source.routeXZ[k+1],p.polygonXZ[i]!,p.polygonXZ[(i+1)%p.polygonXZ.length]!));
  const bound=(ps:Part[])=>[Math.min(...ps.flatMap(p=>p.vertices.map(v=>v[0]))),Math.max(...ps.flatMap(p=>p.vertices.map(v=>v[0]))),Math.min(...ps.flatMap(p=>p.vertices.map(v=>v[2]))),Math.max(...ps.flatMap(p=>p.vertices.map(v=>v[2])))];
  const a=bound(source.parts),b=bound(parts),boundsError=Math.max(...a.map((v,i)=>Math.abs(v-b[i]!))),deck=parts.find(p=>p.name==='Deck')!,sourceDeck=source.parts.find((p:Part)=>p.name==='Deck');
  const geometry=(p:Part)=>JSON.stringify({vertices:p.vertices,triangles:p.triangles,polygonXZ:p.polygonXZ,bottom:p.bottom,top:p.top});
  const parapetsUnchanged=(source.parts as Part[]).filter(p=>p.name.startsWith('Parapet')).every(p=>geometry(p)===geometry(parts.find(q=>q.name===p.name)!));
  const report={id:recipe.id,mask:source.mask,sourceSha256:hash(sourceBytes),triangles,materials:1,components:parts.length,clearance,clearWidth:2*clearance,radius032Margin:clearance-.32,floorY:deck.top,sourceBoundsXZ:a,finishBoundsXZ:b,boundsError,baseVolumeError:Math.abs(baseVolume-beforeVolume),portsUnchanged:JSON.stringify(recipe.ports)===JSON.stringify(source.ports),routeUnchanged:JSON.stringify(recipe.routeXZ)===JSON.stringify(source.routeXZ),deckGeometryUnchanged:geometry(deck)===geometry(sourceDeck),parapetsGeometryUnchanged:parapetsUnchanged,supportFootprintUnchanged:parts.filter(p=>p.top<=.94).every(p=>JSON.stringify(p.polygonXZ)===JSON.stringify(floor)),merlons:proof,topology:checks};
  if(triangles>360||checks.some(p=>!p.closedOriented||p.signedVolume<=0||p.minArea<1e-12)||boundsError>1e-9||report.baseVolumeError>1e-9||clearance<.35-1e-9||!report.deckGeometryUnchanged||!parapetsUnchanged||!report.supportFootprintUnchanged)throw Error(`Geometry failed ${recipe.id}: ${JSON.stringify(report)}`);
  const json=JSON.stringify(recipe,null,2)+'\n';await writeFile(`${dir}/${file}`,json);reports.push({...report,sha256:hash(json)});
  const faces:Face[]=[];for(const p of parts)for(const f of p.triangles){const v=f.map(i=>new Vector3(...p.vertices[i]!)),normal=new Triangle(...v as [Vector3,Vector3,Vector3]).getNormal(new Vector3());if(normal.x+.8*normal.y+normal.z<=1e-9)continue;faces.push({v,normal,color:new Color().fromArray(p.colorsLinear![f[0]!]!)});}
  await rasterize(faces,`${out}/${source.id}-render.png`);const embedded=(await readFile(`${out}/${source.id}-render.png`)).toString('base64');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="780"><rect width="1000" height="780" fill="#edf0e5"/><image href="data:image/png;base64,${embedded}" width="1000" height="780"/><g font-family="sans-serif" fill="#29332b"><text x="30" y="42" font-size="26">${recipe.id} · mask ${recipe.mask}</text><text x="30" y="74" font-size="17">Piedra lineal de wall.glb · ${triangles} triangulos · un material</text><text x="30" y="700" font-size="18">Paso 0.70 · piso Y1.02 · ${proof.length} almenas · juntas rellenas 0.006</text><text x="30" y="735" font-size="16">Puertos, apoyo y contorno intactos. Proyeccion CPU; sin Blender / GLB.</text></g></svg>`;
  await writeFile(`${out}/${source.id}-color.svg`,svg);cards.push(svg);
  if(hash(await readFile(`${sourceDir}/${file}`))!==hash(sourceBytes))throw Error('Source changed during review');
}
await writeFile(`${out}/measurements.json`,JSON.stringify({color:{stoneLinear:stone,mortarLinear:mortar,baseColorLinear:[1,1,1]},reports,scope:'CPU candidate source validation only; no GLB, Blender, runtime integration or ballistics'},null,2)+'\n');
await writeFile(`${out}/index.html`,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Mixed walltop finish</title><style>body{margin:20px;background:#e4e8dc;font-family:Arial;color:#29332b}main{display:grid;grid-template-columns:repeat(2,780px);gap:12px}svg{width:780px;height:auto}</style><h1>Ocho adaptadores mixtos · acabado candidato</h1><p>Color lineal de wall.glb, sin texturas. Geometria CPU conservada; exportacion e integracion pendientes.</p><main>${cards.join('')}</main></html>`);
const paths=[...(await readdir(sourceDir)).filter(f=>f.endsWith('.mesh.json')).map(f=>`${sourceDir}/${f}`),...(await readdir(dir)).filter(f=>f.endsWith('.mesh.json')).map(f=>`${dir}/${f}`),`${dir}/review.ts`,`${dir}/rasterize.mjs`,'art/recipes/e3b-walltop-finish-candidate/raster.ts','public/assets/valley3d/wall.glb',`${out}/measurements.json`];
await writeFile(`${out}/hash-manifest.json`,JSON.stringify(await Promise.all(paths.map(async path=>({path,sha256:hash(await readFile(path))}))),null,2)+'\n');
console.log(JSON.stringify(reports.map(({id,triangles,clearance,baseVolumeError,merlons})=>({id,triangles,clearance,baseVolumeError,merlons:merlons.length})),null,2));
