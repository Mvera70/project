import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, BoxGeometry, BufferGeometry, DoubleSide, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { loadRecipe } from '../../../tools/art/recipe';
import { directory, generate, generateGate, recipePath, type Primitive, type Recipe } from './generate';

type Point = [number, number];
const gateMode=process.argv.includes('--gate');
const activePath=gateMode ? directory+'e3b-bastion-anchor-66-gate-candidate.json' : recipePath;
const bytes = await readFile(activePath);
const recipe = JSON.parse(bytes.toString()) as Recipe;
assert.equal(bytes.toString(), JSON.stringify(await (gateMode?generateGate():generate()), null, 2) + '\n', 'Deterministic source');
await loadRecipe(activePath);
const material = new MeshBasicMaterial({side:DoubleSide});
export function modelOf(parts: Primitive[]) {
  const model = new Group();
  for (const p of parts) {
    let geometry: BufferGeometry;
    if (p.type === 'cube') geometry = new BoxGeometry(...p.dimensions as [number,number,number]);
    else {
      assert.equal(p.type,'gable');
      const w=p.width!,d=p.depth!,h=p.height!;
      const vertices=[[-w/2,-d/2,0],[w/2,-d/2,0],[0,-d/2,h],[-w/2,d/2,0],[w/2,d/2,0],[0,d/2,h]];
      const faces=[[0,1,2],[3,5,4],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]];
      geometry=new BufferGeometry();
      geometry.setAttribute('position',new Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>vertices[i]!)),3));
    }
    const e=p.rotationDegrees??[0,0,0];
    // Orden de Blender Rz Ry Rx, seguido de su conversión a Y arriba.
    geometry.applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(e[0]!*Math.PI/180,e[1]!*Math.PI/180,e[2]!*Math.PI/180,'ZYX')));
    geometry.translate(...p.location as [number,number,number]);
    geometry.applyMatrix4(new Matrix4().makeRotationX(-Math.PI/2));
    model.add(new Mesh(geometry,material));
  }
  model.updateMatrixWorld(true);
  return model;
}
const model=modelOf(recipe.primitives);
const upper=recipe.primitives.filter(p=>p.type==='cube'&&p.location[2]!+p.dimensions![2]!/2>1.02001);
function distance(x:number,z:number,p:Primitive) {
  const a=-(p.rotationDegrees?.[2]??0)*Math.PI/180,dx=x-p.location[0]!,dz=z+p.location[1]!;
  return Math.hypot(Math.max(0,Math.abs(dx*Math.cos(a)+dz*Math.sin(a))-p.dimensions![0]!/2),Math.max(0,Math.abs(-dx*Math.sin(a)+dz*Math.cos(a))-p.dimensions![1]!/2));
}
function floor(x:number,z:number,target:Group) {
  return new Raycaster(new Vector3(x,1.025,z),new Vector3(0,-1,0),0,.02).intersectObject(target,true).some(h=>Math.abs(h.point.y-1.02)<1e-6);
}
function measure(name:string,route:Point[],target=model,obstacles=upper) {
  let samples=0,failures=0,clipped=0,minDistance=Infinity; const failedPoints: Point[]=[];
  for(let i=1;i<route.length;i++) {
    const a=route[i-1]!,b=route[i]!,n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.005);
    for(let j=0;j<=n;j++) {
      const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n;
      for(const p of obstacles) minDistance=Math.min(minDistance,distance(x,z,p));
      // Tres coronas y centro; sólo se recorta fuera de los planos de interfaz abiertos.
      for(const radius of [0,.175,.32,.35]) for(let k=0;k<(radius===0?1:64);k++) {
        let px=x+radius*Math.cos(k*Math.PI/32),pz=z+radius*Math.sin(k*Math.PI/32);
        if(px>1+1e-8||pz-px>2+1e-8||(name==='landing'&&pz>1.65+1e-8)){clipped++;continue;}
        // Sesgo de 0,1 micras hacia dentro sólo en el plano terminal: precisión Float32.
        if(Math.abs(px-1)<1e-8)px-=1e-7;
        if(Math.abs(pz-px-2)<1e-8){px+=1e-7;pz-=1e-7;}
        samples++;if(!floor(px,pz,target)){failures++;if(failedPoints.length<10)failedPoints.push([px,pz]);}
      }
    }
  }
  return {name,samples,clipped,failures,failedPoints,minDistance,radius035Margin:minDistance-.35,pass:failures===0&&minDistance>=.35-1e-8};
}
const ring:Point[]=[[1,.5],[.5,.5],[-.5,1.5]];
const checks=[measure('ring',ring),measure('landing',[[.5,.5],[.5,1.65]])];
const steps=recipe.primitives.filter(p=>p.name.includes('InteriorStep_')).sort((a,b)=>a.location[2]!-b.location[2]!);
assert.equal(steps.length,14);
let maxRiser=0,stairSupportSamples=0;
for(let i=0;i<steps.length;i++) {
  const p=steps[i]!,height=p.location[2]!+p.dimensions![2]!/2;
  maxRiser=Math.max(maxRiser,height-(i?steps[i-1]!.location[2]!+steps[i-1]!.dimensions![2]!/2:0));
  assert.ok(Math.abs(p.dimensions![0]!-.72)<1e-8);
  if(i) assert.ok(Math.abs((-p.location[1]!+p.dimensions![1]!/2)-(-steps[i-1]!.location[1]!-steps[i-1]!.dimensions![1]!/2))<1e-8);
  for(let k=0;k<=20;k++) for(const dx of [-.35,0,.35]) {
    const hits=new Raycaster(new Vector3(p.location[0]!+dx,2,-p.location[1]!+(k/20-.5)*(p.dimensions![1]!-2e-6)),new Vector3(0,-1,0)).intersectObject(model,true);
    assert.ok(Math.abs(hits[0]!.point.y-height)<1e-6,'Stair tread must be exposed, no deck over stair');stairSupportSamples++;
  }
}
assert.ok(Math.abs(-steps[13]!.location[1]!-steps[13]!.dimensions![1]!/2-1.65)<1e-8);
assert.ok(Math.abs(steps[13]!.location[2]!+steps[13]!.dimensions![2]!/2-1.02)<1e-8);
// Continuidad de pretiles: distancia entre sus rectángulos en planta por ejes separadores.
function corners(p:Primitive):Point[] {const a=-(p.rotationDegrees?.[2]??0)*Math.PI/180;return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const x=u!*p.dimensions![0]!/2,z=v!*p.dimensions![1]!/2;return [p.location[0]!+x*Math.cos(a)-z*Math.sin(a),-p.location[1]!+x*Math.sin(a)+z*Math.cos(a)];});}
function touches(a:Primitive,b:Primitive) {const aa=corners(a),bb=corners(b);for(const poly of [aa,bb])for(let i=0;i<4;i++){const p=poly[i]!,q=poly[(i+1)%4]!,nx=q[1]-p[1],nz=p[0]-q[0],u=aa.map(v=>v[0]*nx+v[1]*nz),v=bb.map(v=>v[0]*nx+v[1]*nz);if(Math.max(...u)<Math.min(...v)-1e-8||Math.max(...v)<Math.min(...u)-1e-8)return false;}return true;}
const railPairs=[['WestNorthCap','Parapet_0'],['Parapet_0','EastNorthParapet'],['EastNorthParapet','DiagonalOuterParapet'],['WestSouthCap','LandingWestParapet'],['LandingEastParapet','DiagonalInnerParapet']];
const railContinuity=railPairs.map(([a,b])=>({a,b,pass:touches(recipe.primitives.find(p=>p.name===`Anchor66_${a}`)!,recipe.primitives.find(p=>p.name===`Anchor66_${b}`)!)}));
const triangles=model.children.reduce((sum,m)=>{const g=(m as Mesh).geometry;return sum+(g.index?.count??g.getAttribute('position').count)/3;},0);
// Controles negativos: receta E/O antigua y tapón en boca este.
const old=JSON.parse(await readFile(new URL('../e3b-walltop-finish-candidate/e3b-walltop-finish-bastion295-candidate.json',import.meta.url),'utf8')) as Recipe;
const oldCheck=measure('old-ring',ring,modelOf(old.primitives),old.primitives.filter(p=>p.type==='cube'&&p.location[2]!+p.dimensions![2]!/2>1.02001));
assert.equal(oldCheck.pass,false,'Old E/W model must fail SW route');
const blocked=measure('blocked',[[1,.5],[.5,.5]],model,[...upper,{type:'cube',name:'negative-plug',location:[.95,-.5,1.2],dimensions:[.1,.7,.3],parent:'Root',material:'stone'}]);
assert.equal(blocked.pass,false);
const report={recipeSha256:createHash('sha256').update(bytes).digest('hex'),deterministic:true,schema:true,primitives:recipe.primitives.length,triangles,materials:2,textures:0,bounds:new Box3().setFromObject(model),checks,railContinuity,stairs:{count:14,maxRiser,stairSupportSamples,shift:.65,width:.72,landingY:1.02},negativeControls:{oldFails:!oldCheck.pass,oldFloorFailures:oldCheck.failures,plugFails:!blocked.pass},limitations:['Discrete CPU surface sampling, not runtime body dynamics.','Open portal planes clip only disk portions owned by next module.','Stair tread support checked across width; no capsule stepping/foot IK approval.','World scene occupancy and next neighbor continuation remain unverified.']};
console.log(JSON.stringify(report,null,2));
assert.ok(checks.every(c=>c.pass),'Floor and radius .35');
assert.ok(railContinuity.every(c=>c.pass),'Rail continuity');
assert.ok(triangles<=1800,'Triangle budget');
if(process.argv.includes('--record')) await writeFile(`${directory}${gateMode?'gate-':''}measurements.json`,JSON.stringify(report,null,2)+'\n');




