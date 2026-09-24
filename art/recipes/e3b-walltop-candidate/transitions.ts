/** Sólo lee bytes GLB existentes y mide gálibos; no exporta modelos. */
import { readFile, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Mesh, DoubleSide, Raycaster, Vector3 } from 'three';
import { createHash } from 'node:crypto';
const inputs=[
  {id:'wide-gate',path:'artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb',names:['Gate_Stone_Jamb_L','Gate_Stone_Jamb_R','Gate_Stone_Lintel','Gate_Stone_Coping']},
  {id:'bastion-joint',path:'public/assets/valley3d/e3b-bastion-joint-candidate.glb',names:['Parapet_3','Parapet_0','CornerMerlon_NW']},
];
const rows=[];
for(const input of inputs){const bytes=await readFile(input.path),scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;});
  const blockedZ:number[]=[];
  if(input.id==='bastion-joint')for(let i=0;i<=1000;i++) {
    const z=i/1000,ray=new Raycaster(new Vector3(1.05,1.10,z),new Vector3(-1,0,0),0,.23);
    if(ray.intersectObject(scene,true).length)blockedZ.push(z);
  }
  rows.push({id:input.id,path:input.path,sha256:createHash('sha256').update(bytes).digest('hex'),bounds:new Box3().setFromObject(scene),
    eastFaceAtY110:input.id==='bastion-joint'?{sampleSpacing:.001,blockedZ,centeredPortal:[.15,.85],overlapWithCenteredPortal:blockedZ.filter(z=>z>=.15&&z<=.85).length>0}:null,
    parts:input.names.map(name=>{const part=scene.getObjectByName(name);return {name,bounds:part?new Box3().setFromObject(part):null};})});
}
await writeFile('artifacts/graphics/E3b2-candidates/walltop-review-01/transition-source-bounds.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
