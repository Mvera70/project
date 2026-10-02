// Auditoría del caballo sobre GLTFLoader y AnimationMixer reales, sin publicar.
import { readFileSync, writeFileSync } from 'node:fs';
import { AnimationMixer, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const path='artifacts/graphics/astra/horse/horse.glb';const bytes=readFileSync(path);const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const meshes=[];gltf.scene.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n);});if(meshes.length!==1)throw Error('Caballo debe ser una malla skinned');
const report={meshCount:meshes.length,bones:meshes[0].skeleton.bones.map(b=>b.name),clips:[],previewOnly:true};
for(const clip of gltf.animations){
 const mixer=new AnimationMixer(gltf.scene);const action=mixer.clipAction(clip);action.play();const samples=[];
 for(let i=0;i<=64;i++){
  mixer.setTime(i*clip.duration/64);gltf.scene.updateMatrixWorld(true);const feet={};
  for(const bone of meshes[0].skeleton.bones.filter(b=>b.name.endsWith('Foot')))feet[bone.name]=bone.getWorldPosition(new Vector3()).toArray();
  samples.push(feet);
 }
 const travel={};let loopError=0;
 for(const key of Object.keys(samples[0])){travel[key]={xRange:Math.max(...samples.map(s=>s[key][0]))-Math.min(...samples.map(s=>s[key][0])),yRange:Math.max(...samples.map(s=>s[key][1]))-Math.min(...samples.map(s=>s[key][1]))};loopError=Math.max(loopError,...samples[0][key].map((n,i)=>Math.abs(n-samples[64][key][i])));}
 if(loopError>1e-5)throw Error('Salto al repetir clip');if(clip.name==='walk'&&Object.values(travel).some(v=>v.xRange<.12||v.yRange<.02))throw Error('Pata sin marcha visible');
 report.clips.push({name:clip.name,seconds:clip.duration,loopError,feet:travel,strideCells:clip.name==='walk'?.2832:null});mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
}
writeFileSync('artifacts/graphics/astra/horse/animation-metrics.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
