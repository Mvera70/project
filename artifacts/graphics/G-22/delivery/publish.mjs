import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const id=process.argv[2];assert(id&&/^[a-z-]+$/.test(id));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
const catalog=read('art/catalog.json'),a=catalog.assets.find(a=>a.id===id);
const path='public/assets/valley3d/manifest.json',manifest=read(path);
assert.equal(hash(a.recipe),a.recipeSha256);assert.equal(hash(a.approved.directory+'/'+id+'.glb'),a.hashes[id+'.glb']);
for(const p of manifest.assets)assert.equal(hash('public/assets/valley3d/'+p.file),p.sha256);
fs.copyFileSync(a.approved.directory+'/'+id+'.glb','public/assets/valley3d/'+id+'.glb');
const index=manifest.assets.findIndex(a=>a.id===id),entry={id,file:id+'.glb',sha256:a.hashes[id+'.glb'],motion:a.motion};
if(index<0)manifest.assets.push(entry);else manifest.assets[index]=entry;
manifest.generatedAt=new Date().toISOString();manifest.invocation='G-22: publicación selectiva por modelo';
fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync('artifacts/graphics/G-22/delivery/'+id+'-verification.json',JSON.stringify({status:'pass',id,statistics:a.statistics,bounds:a.bounds,approved:a.approved,sha256:entry.sha256,otherPublishedFilesUnchanged:true},null,2)+'\n');
console.log(JSON.stringify({id,approved:a.approved,statistics:a.statistics}));

