import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { planFor } from '../../../src/render3d/world/plan';
import { buildFromAsset } from '../../../src/render3d/world/buildings';
import { forestLooks } from '../../../src/render3d/world/forest-state';
import { scatterTransform } from '../../../src/render3d/world/forest';
const out='artifacts/graphics/E3b2-candidates/bastion296-mixed-review-01';await mkdir(out,{recursive:true});
const state=foundGame(91);run(state,3846,'prudent',CATALOG);const plan=planFor(state);
const area=new Box3(new Vector3(47.8,0,54.7),new Vector3(51.4,2,57.0));
async function glb(id:string){const b=await readFile(`public/assets/valley3d/${id}.glb`);return(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
const buildings=[];
for(const p of plan.buildings.filter(p=>p.x<area.max.x&&p.x+p.w>area.min.x&&p.z<area.max.z&&p.z+p.h>area.min.z)) {
  if(!p.asset)continue;const model=buildFromAsset(p,await glb(p.asset));buildings.push({planned:p,bounds:new Box3().setFromObject(model.object)});
}
const tree=await glb('tree');tree.updateMatrixWorld(true);const trees=[];
for(const look of forestLooks(state).filter(x=>x.stage==='standing')) {
  const at=scatterTransform(state.map.width,look.cell);if(at.x<47||at.x>52||at.z<54||at.z>58)continue;
  const transform=new Matrix4().compose(new Vector3(at.x,0,at.z),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),at.facing),new Vector3(at.scale,at.scale,at.scale));
  const bounds=new Box3().setFromObject(tree).applyMatrix4(transform);if(bounds.intersectsBox(area))trees.push({cell:look.cell,transform:at,bounds});
}
const cells=[];for(let z=54;z<=57;z++)for(let x=47;x<=51;x++)cells.push({x,z,terrain:state.map.terrain[z*state.map.width+x],forestAge:state.map.forestAge[z*state.map.width+x],works:state.works.filter(w=>x>=w.x&&x<w.x+w.w&&z>=w.y&&z<w.y+w.h)});
const result={seed:91,tick:3846,bastion:plan.buildings.find(p=>p.id===296),buildings,trees,cells};
await writeFile(`${out}/state.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
