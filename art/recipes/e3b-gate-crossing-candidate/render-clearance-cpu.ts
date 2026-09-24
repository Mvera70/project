/** Lámina de triángulos proyectados por CPU; no ejecuta Blender ni el juego. */
import {readFile,writeFile} from 'node:fs/promises';
import {Vector3,Box3} from 'three';
import type { Mesh } from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildFromAsset} from '../../../src/render3d/world/buildings';
import type {PlannedBuilding} from '../../../src/render3d/world/plan';
const dir='art/recipes/e3b-gate-crossing-candidate',out='artifacts/graphics/E3b2-candidates/gate-mixed-source-review-03';
const bytes=await readFile('artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb');
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
type Face={points:Vector3[];color:number[];name:string};
let panels='';
for(const [column,mask] of [65,24].entries()){
 const source=JSON.parse(await readFile(`${dir}/e3b-gate-crossing-${mask}-clearance-candidate.mesh.json`,'utf8'));
 const gate=buildFromAsset({id:1,kind:'gate',asset:'gate',x:0,z:0,w:1,h:1,ruin:false,gate:mask===65?'x':'z'} as PlannedBuilding,asset.scene.clone(true));
 const hinge=gate.object.getObjectByName('DoorHinge')!;hinge.rotation.y=-Math.PI/2;gate.object.updateMatrixWorld(true);
 const lintel=gate.object.getObjectByName('Gate_Stone_Lintel') as Mesh;const lb=new Box3().setFromObject(lintel);
 const faces:Face[]=[];
 gate.object.traverse(o=>{const m=o as Mesh;if(!m.isMesh)return;const pos=m.geometry.getAttribute('position'),index=m.geometry.index;const vertices=[];for(let i=0;i<pos.count;i++){const v=new Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);if(m===lintel)v.y=lb.max.y-(lb.max.y-v.y)*.75;vertices.push(v);}for(let i=0;i<(index?.count??pos.count);i+=3){faces.push({points:[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]!),color:/Plank|Door|Brace/.test(m.name)?[132,97,61]:/Iron|Hinge|Stud/.test(m.name)?[70,70,64]:[195,188,173],name:m.name});}});
 for(const part of source.parts)for(const triangle of part.triangles)faces.push({points:triangle.map((i:number)=>new Vector3(...part.vertices[i])),color:part.name==='PortalLintel'?[184,176,159]:[205,201,194],name:part.name});
 for(const row of [0,1]){
  const toward=row===0?new Vector3(mask===65?3:2,2.3,mask===65?2:3).normalize():(mask===65?new Vector3(1,0,0):new Vector3(0,0,1));
  const right=new Vector3().crossVectors(new Vector3(0,1,0),toward).normalize(),up=new Vector3().crossVectors(toward,right).normalize();
  const visible=faces.filter(f=>f.points[1]!.clone().sub(f.points[0]!).cross(f.points[2]!.clone().sub(f.points[0]!)).dot(toward)>1e-9).sort((a,b)=>a.points.reduce((n,v)=>n+v.dot(toward),0)-b.points.reduce((n,v)=>n+v.dot(toward),0));
  const scale=row===0?215:240,cx=column*700+350,cy=row===0?410:850;
  const origin=new Vector3(.38,0,.62);
  const point=(v:Vector3)=>{const q=v.clone().sub(origin);return `${(cx+q.dot(right)*scale).toFixed(2)},${(cy-q.dot(up)*scale).toFixed(2)}`;};
  const polygons=visible.map(f=>{const normal=f.points[1]!.clone().sub(f.points[0]!).cross(f.points[2]!.clone().sub(f.points[0]!)).normalize();const light=.77+.23*Math.max(0,normal.dot(new Vector3(2,4,3).normalize()));const fill=`rgb(${f.color.map(c=>Math.round(c*light)).join(',')})`;return `<polygon points="${f.points.map(point).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width=".5"><title>${f.name}</title></polygon>`;}).join('');
  panels+=`<g>${polygons}<text x="${column*700+40}" y="${row===0?78:530}" font-size="22" fill="#292720">Máscara ${mask} · ${row===0?'isométrica, hoja abierta':'alzado del vano'}</text></g>`;
 }
 gate.dispose();
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="940" viewBox="0 0 1400 940"><rect width="1400" height="940" fill="#F1EEE6"/><g font-family="Arial,sans-serif"><text x="40" y="35" font-size="22" fill="#292720">Cruce mixto · variante de holgura · proyección CPU de fuentes, sin exportación</text><path d="M700 55V880 M30 485H1370" stroke="#CCC5B7"/>${panels}<text x="40" y="895" font-size="18">Suelo 1,02 · paso 0,70 · vano 0,84 · dintel inferior 0,63 · holgura sobre hoja 0,0367</text><text x="40" y="925" font-size="17" fill="#675E4C">Geometría sin aparejo decorativo. El dintel salva el vano; no es certificación de resistencia ni captura de la app.</text></g></svg>`;
await writeFile(`${out}/gate-clearance-sheet.svg`,svg);
console.log(`${out}/gate-clearance-sheet.svg`);

