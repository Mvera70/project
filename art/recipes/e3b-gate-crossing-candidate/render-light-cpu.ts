/** Lámina de triángulos proyectados por CPU; no ejecuta Blender ni el juego. */
import {readFile,writeFile} from 'node:fs/promises';
import {Vector3,Box3} from 'three';
import type { Mesh } from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildFromAsset} from '../../../src/render3d/world/buildings';
import type {PlannedBuilding} from '../../../src/render3d/world/plan';
const dir='art/recipes/e3b-gate-crossing-candidate',out='artifacts/graphics/E3b2-candidates/gate-mixed-source-review-04';
const bytes=await readFile('artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb');
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
type Face={points:Vector3[];color:number[];name:string};
let panels='';
const width=1400,height=940,depth=new Float64Array(width*height).fill(-Infinity),pixels=new Uint8Array(width*height*3);
for(let i=0;i<width*height;i++)pixels.set([241,238,230],i*3);
function raster(v:number[][],rgb:number[]){
 const edge=(a:number[],b:number[],x:number,y:number)=>(x-a[0]!)*(b[1]!-a[1]!)-(y-a[1]!)*(b[0]!-a[0]!);
 const area=edge(v[0]!,v[1]!,v[2]![0]!,v[2]![1]!);if(Math.abs(area)<1e-8)return;
 const minX=Math.max(0,Math.floor(Math.min(...v.map(p=>p[0]!)))),maxX=Math.min(width-1,Math.ceil(Math.max(...v.map(p=>p[0]!))));
 const minY=Math.max(0,Math.floor(Math.min(...v.map(p=>p[1]!)))),maxY=Math.min(height-1,Math.ceil(Math.max(...v.map(p=>p[1]!))));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const a=edge(v[1]!,v[2]!,x+.5,y+.5)/area,b=edge(v[2]!,v[0]!,x+.5,y+.5)/area,c=1-a-b;if(a< -1e-8||b< -1e-8||c< -1e-8)continue;const z=a*v[0]![2]!+b*v[1]![2]!+c*v[2]![2]!,i=y*width+x;if(z>depth[i]!){depth[i]=z;pixels.set(rgb,i*3);}}
}
for(const [column,mask] of [65,24].entries()){
 const source=JSON.parse(await readFile(`${dir}/e3b-gate-crossing-${mask}-light-finish-candidate.mesh.json`,'utf8'));
 const gate=buildFromAsset({id:1,kind:'gate',asset:'gate',x:0,z:0,w:1,h:1,ruin:false,gate:mask===65?'x':'z'} as PlannedBuilding,asset.scene.clone(true));
 const hinge=gate.object.getObjectByName('DoorHinge')!;hinge.rotation.y=-Math.PI/2;gate.object.updateMatrixWorld(true);
 const lintel=gate.object.getObjectByName('Gate_Stone_Lintel') as Mesh;const lb=new Box3().setFromObject(lintel);
 const faces:Face[]=[];
 gate.object.traverse(o=>{const m=o as Mesh;if(!m.isMesh)return;const pos=m.geometry.getAttribute('position'),index=m.geometry.index;const vertices=[];for(let i=0;i<pos.count;i++){const v=new Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);if(m===lintel)v.y=.63+(v.y-lb.min.y)/(lb.max.y-lb.min.y)*.19;vertices.push(v);}for(let i=0;i<(index?.count??pos.count);i+=3){faces.push({points:[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]!),color:/Plank|Door|Brace/.test(m.name)?[132,97,61]:/Iron|Hinge|Stud/.test(m.name)?[70,70,64]:[195,188,173],name:m.name});}});
 for(const part of source.parts)for(const triangle of part.triangles)faces.push({points:triangle.map((i:number)=>new Vector3(...part.vertices[i])),color:part.color==='#C0A58D'?[192,165,141]:[205,201,194],name:part.name});
 for(const row of [0,1]){
  const toward=row===0?new Vector3(mask===65?3:2,2.3,mask===65?2:3).normalize():(mask===65?new Vector3(1,0,0):new Vector3(0,0,1));
  const right=new Vector3().crossVectors(new Vector3(0,1,0),toward).normalize(),up=new Vector3().crossVectors(toward,right).normalize();
  const visible=faces.filter(f=>f.points[1]!.clone().sub(f.points[0]!).cross(f.points[2]!.clone().sub(f.points[0]!)).dot(toward)>1e-9).sort((a,b)=>a.points.reduce((n,v)=>n+v.dot(toward),0)-b.points.reduce((n,v)=>n+v.dot(toward),0));
  const scale=row===0?215:240,cx=column*700+350,cy=row===0?410:850;
  const origin=new Vector3(.38,0,.62);
  visible.forEach(f=>{const normal=f.points[1]!.clone().sub(f.points[0]!).cross(f.points[2]!.clone().sub(f.points[0]!)).normalize();const light=.77+.23*Math.max(0,normal.dot(new Vector3(2,4,3).normalize()));const rgb=f.color.map(c=>Math.round(c*light));raster(f.points.map(v=>{const q=v.clone().sub(origin);return [cx+q.dot(right)*scale,cy-q.dot(up)*scale,q.dot(toward)];}),rgb);});
  panels+=`<g><text x="${column*700+40}" y="${row===0?78:530}" font-size="22" fill="#292720">Máscara ${mask} · ${row===0?'isométrica, hoja abierta':'alzado del vano'}</text></g>`;
 }
 gate.dispose();
}
const stride=Math.ceil(width*3/4)*4,bmp=Buffer.alloc(54+stride*height);bmp.write('BM');bmp.writeUInt32LE(bmp.length,2);bmp.writeUInt32LE(54,10);bmp.writeUInt32LE(40,14);bmp.writeInt32LE(width,18);bmp.writeInt32LE(height,22);bmp.writeUInt16LE(1,26);bmp.writeUInt16LE(24,28);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=(y*width+x)*3,b=54+(height-1-y)*stride+x*3;bmp[b]=pixels[a+2]!;bmp[b+1]=pixels[a+1]!;bmp[b+2]=pixels[a]!;}
const bitmap=`<image width="1400" height="940" href="data:image/bmp;base64,${bmp.toString('base64')}"/>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="940" viewBox="0 0 1400 940"><rect width="1400" height="940" fill="#F1EEE6"/>${bitmap}<g font-family="Arial,sans-serif"><text x="40" y="35" font-size="22" fill="#292720">Cruce mixto · variante ligera con aparejo · proyección CPU de fuentes, sin exportación</text><path d="M700 55V880 M30 485H1370" stroke="#CCC5B7"/>${panels}<text x="40" y="895" font-size="18">Suelo 1,02 · paso 0,70 · vano 0,84 · viga central 0,63 · losa exterior 0,82 · holgura sobre hoja 0,0367</text><text x="40" y="925" font-size="17" fill="#675E4C">Juntas rellenas y dos almenas · una variante · el dintel salva el vano · sin certificación de resistencia ni exportación.</text></g></svg>`;
await writeFile(`${out}/gate-light-sheet.svg`,svg);
console.log(`${out}/gate-light-sheet.svg`);



