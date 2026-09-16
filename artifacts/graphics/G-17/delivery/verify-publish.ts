import { createHash } from 'node:crypto';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { loadRecipe } from '../../../../tools/art/recipe';
import { parseCatalog } from '../../../../tools/art/schema';
import { validateGlb } from '../../../../tools/art/glb';

const ids=['villager','villager-smith','villager-priest','villager-farmer'];
const hash=(b: Uint8Array)=>createHash('sha256').update(b).digest('hex').toUpperCase();
const catalog=parseCatalog(JSON.parse(await readFile('art/catalog.json','utf8')));
const base=await loadRecipe('art/recipes/villager/villager.json');
const manifestPath='public/assets/valley3d/manifest.json';
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const result=[];
// La publicación general borra toda la carpeta; esta entrega sólo sustituye
// los cuatro GLB verificados y preserva el resto del manifiesto y sus binarios.
for(const id of ids){
 const recipe=await loadRecipe(`art/recipes/${id}/${id}.json`);
 const asset=catalog.assets.find(a=>a.id===id)!;
 assert(asset.approved);
 assert.equal(recipe.id,id);
 assert.equal(recipe.scale,1/3);
 assert.equal(recipe.mergeByMaterial,true);
 assert.deepEqual(recipe.rig?.bones,base.rig?.bones);
 assert.deepEqual(recipe.clipDefinitions,base.clipDefinitions);
 assert.deepEqual(recipe.connectors,['hand_l','hand_r']);
 assert.equal(recipe.materials.length,4);
 assert.equal(asset.recipeSha256,hash(await readFile(asset.recipe)));
 for(const hand of recipe.connectors) assert.equal(recipe.rig?.bind[hand],base.rig?.bind[hand]);
 const bytes=await readFile(`${asset.approved.directory}/${id}.glb`);
 const inspection=validateGlb(recipe,bytes);
 assert.equal(inspection.statistics.materials,4);
 assert.equal(inspection.statistics.meshes,4);
 assert(inspection.statistics.triangles<=1500);
 assert.equal(hash(bytes),asset.hashes?.[`${id}.glb`]);
 // La caja del catálogo se mide antes de aplicar los clips en el visor.
 assert(Math.abs(asset.bounds!.size[1]-.65)<.002,`${id} height ${asset.bounds!.size[1]}`);
 await copyFile(`${asset.approved.directory}/${id}.glb`,`public/assets/valley3d/${id}.glb`);
 const entry={id,file:`${id}.glb`,sha256:hash(bytes),motion:asset.motion};
 const index=manifest.assets.findIndex((a:{id:string})=>a.id===id);
 if(index<0) manifest.assets.push(entry); else manifest.assets[index]=entry;
 result.push({id,recipe:asset.recipe,approved:asset.approved.directory,sha256:entry.sha256,bytes:bytes.length,bounds:asset.bounds,statistics:inspection.statistics,motion:asset.motion});
}
// Todos los ids ajenos conservan su huella; se comprueba también contra disco.
for(const a of manifest.assets) assert.equal(hash(await readFile(`public/assets/valley3d/${a.file}`)),a.sha256);
manifest.generatedAt=new Date().toISOString();
manifest.invocation='G-17: publicación selectiva de cuatro recursos aprobados, verify-publish.ts';
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await mkdir('artifacts/graphics/G-17/delivery',{recursive:true});
await writeFile('artifacts/graphics/G-17/delivery/verification.json',JSON.stringify({status:'pass',sharedRigAndClips:true,handConnectorsFree:true,allPublishedHashesMatch:true,assets:result},null,2)+'\n');
console.log(JSON.stringify(result.map(a=>({id:a.id,triangles:a.statistics.triangles,materials:a.statistics.materials,height:a.bounds!.size[1],bytes:a.bytes})),null,2));
