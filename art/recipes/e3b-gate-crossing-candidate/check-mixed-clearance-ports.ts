/** Contrasta las bocas de las fuentes contra los candidatos de acabado vecinos. */
import { readFile,writeFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
type P=[number,number];
type Primitive={type:string;location:number[];dimensions:number[];rotationDegrees?:number[];name:string};
const sourceDir='art/recipes/e3b-gate-crossing-candidate';
const finishDir='art/recipes/e3b-walltop-finish-candidate';
const straightBytes=await readFile(`${finishDir}/e3b-walltop-finish-straight-candidate.json`),diagonalBytes=await readFile(`${finishDir}/e3b-walltop-finish-diagonal-candidate.json`);
const straight=JSON.parse(straightBytes.toString()),diagonal=JSON.parse(diagonalBytes.toString());
const dot=(a:P,b:P)=>a[0]*b[0]+a[1]*b[1];
function interval(p:Primitive,center:P,normal:P,map:(v:P)=>P):P|null{
 if(p.type!=='cube')throw Error(p.type);
 const a=-(p.rotationDegrees?.[2]??0)*Math.PI/180,c:P=[p.location[0]!,-p.location[1]!],u:P=[Math.cos(a),Math.sin(a)],v:P=[-Math.sin(a),Math.cos(a)];
 const wc=map(c),ou=map([c[0]+u[0],c[1]+u[1]]),ov=map([c[0]+v[0],c[1]+v[1]]),wu:P=[ou[0]-wc[0],ou[1]-wc[1]],wv:P=[ov[0]-wc[0],ov[1]-wc[1]],delta:P=[center[0]-wc[0],center[1]-wc[1]];
 let lo=-Infinity,hi=Infinity;
 for(const [axis,half] of [[wu,p.dimensions[0]!/2],[wv,p.dimensions[1]!/2]] as [P,number][]){const b=dot(delta,axis),d=dot(normal,axis);if(Math.abs(d)<1e-10){if(Math.abs(b)>half+1e-7)return null;}else{const t0=(-half-b)/d,t1=(half-b)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}}
 return lo<=hi+1e-8?[lo,hi]:null;
}
const reports=[];
for(const mask of [65,24]){
 const candidate=JSON.parse(await readFile(`${sourceDir}/e3b-gate-crossing-${mask}-clearance-candidate.mesh.json`,'utf8'));
 const results=[];
 for(const i of [0,1]){
  const port=candidate.ports[i],center=port.centerXZ as P,normal:P=i===0?(mask===65?[1,0]:[0,1]):[Math.SQRT1_2,Math.SQRT1_2];
  const recipe=i===0?straight:diagonal;
  const map:(v:P)=>P=i===0?(mask===65?([x,z])=>[1-z,x-1]:([x,z])=>[x-1,z]):(mask===65?([x,z])=>[-x,1+z]:([x,z])=>[1+x,-z]);
  const guardIntervals:P[]=recipe.primitives.filter((p:Primitive)=>p.location[2]!-p.dimensions[2]!/2<1.10&&p.location[2]!+p.dimensions[2]!/2>1.10).map((p:Primitive)=>interval(p,center,normal,map)).filter((v:P|null)=>v!==null);
  const leftMax=Math.max(...guardIntervals.filter(v=>v[1]<0).map(v=>v[1]));
  const rightMin=Math.min(...guardIntervals.filter(v=>v[0]>0).map(v=>v[0]));
  const neighborClearWidth=rightMin-leftMax;
  const floorIntervals:P[]=recipe.primitives.filter((p:Primitive)=>p.location[2]!-p.dimensions[2]!/2<1.019&&p.location[2]!+p.dimensions[2]!/2>1.019).map((p:Primitive)=>interval(p,center,normal,map)).filter((v:P|null)=>v!==null);
  const floorMin=Math.min(...floorIntervals.map(v=>v[0])),floorMax=Math.max(...floorIntervals.map(v=>v[1]));
  const joins= Math.abs(leftMax+.35)<1e-7&&Math.abs(rightMin-.35)<1e-7&&Math.abs(floorMin+.45)<1e-7&&Math.abs(floorMax-.45)<1e-7;
  results.push({port:i,center,neighbor:i===0?'finished_cardinal':'finished_diagonal',neighborClearWidth,neighborFloorBounds:[floorMin,floorMax],neighborInnerParapets:[leftMax,rightMin],candidateClearWidth:port.clearWidth,candidateFloorWidth:port.width,exactMatch:joins});
 }
 reports.push({mask,ports:results});
}
const out='artifacts/graphics/E3b2-candidates/gate-mixed-source-review-03/ports.json';await writeFile(out,JSON.stringify({straightSha256:createHash('sha256').update(straightBytes).digest('hex'),diagonalSha256:createHash('sha256').update(diagonalBytes).digest('hex'),reports,scope:'Cross section of actual source primitives at Y1.019 and Y1.10. Matches source candidates, not currently published wall geometry.'},null,2)+'\n');console.log(JSON.stringify(reports,null,2));
if(reports.some(r=>r.ports.some(p=>!p.exactMatch)))process.exitCode=1;

