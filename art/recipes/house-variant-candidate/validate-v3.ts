import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { loadRecipe } from '../../../tools/art/recipe';
import { validateGlb } from '../../../tools/art/glb';
const ids=['house-twin-gable','house-hip-roof','stone-house','stone-house-cross-gable','stone-house-tower-loft'];
const root=resolve(import.meta.dirname,'../../..');
const reports=[];
for(const id of ids){
 const file=resolve(import.meta.dirname,id+'.json');
 const raw=JSON.parse(await readFile(file,'utf8'));
 const source=JSON.parse(await readFile(resolve(root,'art/recipes',id.startsWith('stone')?'stone-house/stone-house.json':'house/house.json'),'utf8'));
 const windows=(r: { primitives: { name: string; material: string }[] })=>r.primitives.filter((p: { name: string; material: string })=>/_Window_[ABC]$/.test(p.name));
 const doors=(r: { primitives: { name: string; material: string }[] })=>r.primitives.filter((p: { name: string; material: string })=>p.material==='door');
 assert.equal(windows(raw).length,3);assert.deepEqual(doors(raw),doors(source));assert.deepEqual(raw.materials.map((m: { name: string })=>m.name),source.materials.map((m: { name: string })=>m.name));
 const buffer=await readFile(resolve(root,'artifacts/graphics/astra',id,id+'.glb'));
 const inspection=validateGlb(await loadRecipe(file),buffer);
 assert.ok(inspection.statistics.triangles<=raw.candidateBuild.triangleLimit);
 const gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
 assert.ok(!gltf.textures?.length && !gltf.images?.length);
 const door=gltf.nodes.find((n: { name: string })=>n.name===id+'_door');
 const pivot=raw.candidateBuild.doorPivot;const expected=[pivot[0]/3,pivot[2]/3,-pivot[1]/3];
 assert.ok(door.translation.every((v:number,i:number)=>Math.abs(v-expected[i])<1e-6));
 reports.push({id,...inspection.statistics,doorPivotGltf:door.translation,originalDoor:true,asymmetricWindows:windows(raw),textures:0});
}
await writeFile(resolve(root,'artifacts/graphics/astra/house-variants-v3/validation.json'),JSON.stringify(reports,null,2)+'\n');
console.log(reports);

