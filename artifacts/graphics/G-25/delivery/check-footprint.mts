import { readFileSync, writeFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { groundFootprints } from '../../../../src/render3d/world/obstacles';
const before=JSON.parse(readFileSync('artifacts/graphics/G-25/delivery/tree-before.json','utf8'));
const paths=[`${before.approved.directory}/tree.glb`,'public/assets/valley3d/tree.glb'];
const boxes=[];
for (const path of paths) {
 const bytes=readFileSync(path);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 boxes.push(groundFootprints(gltf.scene).map(b=>({min:b.min.toArray(),max:b.max.toArray()})));
}
const identical=JSON.stringify(boxes[0])===JSON.stringify(boxes[1]);
writeFileSync('artifacts/graphics/G-25/delivery/tree-footprint.json',JSON.stringify({identical,boxes},null,2));
console.log(JSON.stringify({identical,boxes}));
if(!identical)process.exitCode=1;
