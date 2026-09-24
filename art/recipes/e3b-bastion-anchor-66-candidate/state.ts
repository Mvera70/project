import { writeFile } from 'node:fs/promises';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { bastionAccessOf } from '../../../src/derive/bastion-access';
import { forestLooks } from '../../../src/render3d/world/forest-state';
import { scatterTransform } from '../../../src/render3d/world/forest';
import { directory } from './generate';
const cases=[];
for(const [seed,id] of [[23,283],[91,295]]) {
  const state=foundGame(seed!);run(state,3846,'prudent',CATALOG);
  const bastion=state.buildings.find(b=>b.id===id)!;
  const x=bastion.x,z=bastion.y;
  const overlaps=(a:{x:number;y:number;w:number;h:number},b:{minX:number;maxX:number;minZ:number;maxZ:number})=>a.x<b.maxX&&a.x+a.w>b.minX&&a.y<b.maxZ&&a.y+a.h>b.minZ;
  const extension={minX:x+.05,maxX:x+.95,minZ:z+1,maxZ:z+2.65};
  const buildings=state.buildings.filter(b=>b.id!==id&&overlaps(b,extension));
  const works=state.works.filter(b=>overlaps(b,extension));
  const southwest=state.buildings.filter(b=>b.x===x-1&&b.y===z+1);
  const east=state.buildings.filter(b=>b.x===x+1&&b.y===z);
  const trees=forestLooks(state).filter(b=>b.stage==='standing').map(b=>({cell:b.cell,...scatterTransform(state.map.width,b.cell)})).filter(t=>t.x>x-2&&t.x<x+3&&t.z>z-1&&t.z<z+4);
  const trunkConflicts=trees.filter(t=>Math.hypot(Math.max(extension.minX-t.x,0,t.x-extension.maxX),Math.max(extension.minZ-t.z,0,t.z-extension.maxZ))<=.34/3*t.scale);
  const reservedCells=[[x,z+1],[x,z+2],[x-1,z+2],[x+1,z+2]].map(([cx,cz])=>({x:cx,z:cz,terrain:state.map.terrain[cz!*state.map.width+cx!]}));
  cases.push({seed,tick:state.tick,bastion,access:bastionAccessOf(state,bastion),extension,buildings,works,southwest,east,trees,trunkConflicts,reservedCells});
}
console.log(JSON.stringify(cases,null,2));
if(process.argv.includes('--record')) await writeFile(`${directory}state-measurements.json`,JSON.stringify(cases,null,2)+'\n');

