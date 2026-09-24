import { writeFile, mkdir } from 'node:fs/promises';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { planFor } from '../../../src/render3d/world/plan';
import { elevatedRingOf } from '../../../src/derive/elevated-ring';
const state=foundGame(91);run(state,3846,'prudent',CATALOG);const plan=planFor(state);
const result=[295,296].map(id=>{const b=state.buildings.find(b=>b.id===id)!;return {building:b,planned:plan.buildings.find(b=>b.id===id),
  neighbours:state.buildings.filter(n=>n.lostTick===null&&n.id!==id&&Math.abs(n.x-b.x)<=1&&Math.abs(n.y-b.y)<=1),
  ring:elevatedRingOf(state,b,{approvedVariants:['straight','turn','diagonal','mixed','gate-cardinal','gate-diagonal','gate-mixed','bastion-return']})};});
await mkdir('artifacts/graphics/E3b2-candidates/walltop-transition-review-01',{recursive:true});
await writeFile('artifacts/graphics/E3b2-candidates/walltop-transition-review-01/state.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.map(x=>({building:x.building,planned:x.planned,neighbours:x.neighbours,ringStatus:x.ring.status,ringAccess:x.ring.access})),null,2));
