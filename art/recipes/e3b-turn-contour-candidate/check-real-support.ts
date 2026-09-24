/** Contacto CPU contra wall.glb publicado, compuesto con buildDefence real. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DoubleSide, Raycaster, Vector3, type Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildDefence } from '../../../src/render3d/world/defences';
import { loadRecipe } from '../../../tools/art/recipe';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';

const root = resolve(import.meta.dirname, '../../..');
const out = resolve(root, 'artifacts/graphics/E3b2-candidates/turn-review-01');
const wallPath = 'public/assets/valley3d/wall.glb';
const bytes = await readFile(resolve(root, wallPath));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
gltf.scene.traverse(n => {
  const mesh = n as Mesh;
  if (mesh.isMesh) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) mat.side = DoubleSide;
});
type Primitive = { name: string; location: number[]; dimensions: number[]; rotationDegrees?: number[] };
type Portal = { center: number[]; normal: number[]; width: number };
const directions = [{ bit: 1, x: 0, z: -1 }, { bit: 2, x: 1, z: 0 }, { bit: 4, x: 0, z: 1 }, { bit: 8, x: -1, z: 0 }];
const ray = new Raycaster();
function corners(p: Primitive) {
  const a = -(p.rotationDegrees?.[2] ?? 0) * Math.PI / 180;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v]) => {
    const x = u! * p.dimensions[0]! / 2, z = v! * p.dimensions[1]! / 2;
    return [p.location[0]! + x*Math.cos(a)-z*Math.sin(a), -p.location[1]! + x*Math.sin(a)+z*Math.cos(a)];
  });
}
function joined(a: Primitive, b: Primitive) {
  if (Math.abs(a.location[2]! - b.location[2]!) > (a.dimensions[2]! + b.dimensions[2]!)/2+1e-7) return false;
  const pa = corners(a), pb = corners(b);
  for (const poly of [pa,pb]) for (let k = 0; k < 4; k++) {
    const p = poly[k]!, q = poly[(k+1)%4]!;
    const nx = q[1]!-p[1]!, nz = p[0]!-q[0]!;
    const va = pa.map(v => v[0]!*nx+v[1]!*nz), vb = pb.map(v => v[0]!*nx+v[1]!*nz);
    if (Math.max(...va)<Math.min(...vb)-1e-7 || Math.max(...vb)<Math.min(...va)-1e-7) return false;
  }
  return true;
}
const reports = [];
for (const mask of [9,3,6,12]) {
  const recipePath = resolve(import.meta.dirname, `e3b-turn-contour-${mask}-candidate.json`);
  await loadRecipe(recipePath);
  const recipeBytes = await readFile(recipePath);
  const recipe = JSON.parse(recipeBytes.toString('utf8')) as { primitives: Primitive[]; metadata: { portals: Portal[] } };
  const wall = (id: number, x: number, z: number, connections: number) => buildDefence(
    { id, kind: 'wall', x, z, w: 1, h: 1, ruin: false, connections } as PlannedBuilding, gltf.scene);
  const models = [wall(1,0,0,mask), ...directions.filter(d => (mask & d.bit) !== 0).map((d,i) => wall(i+2,d.x,d.z,d.x===0?5:10))];
  const objects = models.map(m => m.object);
  objects.forEach(o => o.updateMatrixWorld(true));
  const supports = recipe.primitives.filter(p => !p.name.includes('Deck') && !p.name.includes('Parapet'));
  const checks = supports.map(p => {
    const a = -(p.rotationDegrees?.[2] ?? 0)*Math.PI/180;
    const bottom = p.location[2]!-p.dimensions[2]!/2, top = p.location[2]!+p.dimensions[2]!/2;
    let contacts = 0; const examples = [];
    for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
      const u = p.dimensions[0]!*(i/20-.5), v = p.dimensions[1]!*(j/20-.5);
      const x = p.location[0]!+u*Math.cos(a)-v*Math.sin(a), z = -p.location[1]!+u*Math.sin(a)+v*Math.cos(a);
      ray.set(new Vector3(x,1.5,z), new Vector3(0,-1,0));
      const hits = ray.intersectObjects(objects,true);
      const hit = hits.find(h => h.point.y<=top+.002 && h.point.y>=bottom-.002);
      if (hit) { contacts++; if (examples.length<3) examples.push({x,z,y:hit.point.y}); }
    }
    return {name:p.name,bottom,top,contacts,samples:441,examples};
  });
  // El camino de apoyo no puede usar el tablero para justificar ménsulas colgantes.
  const anchoredSupports = new Set(checks.filter(c => c.contacts>0).map(c => c.name));
  for (let i=0;i<supports.length;i++) for (const p of supports) {
    if (supports.some(q => anchoredSupports.has(q.name) && joined(p,q))) anchoredSupports.add(p.name);
  }
  const anchoredAll = new Set(anchoredSupports);
  for (let i=0;i<recipe.primitives.length;i++) for (const p of recipe.primitives) {
    if (recipe.primitives.some(q => anchoredAll.has(q.name) && joined(p,q))) anchoredAll.add(p.name);
  }
  const triangles: number[][][] = [];
  for (const object of objects) object.traverse(n => {
    const mesh=n as Mesh; if (!mesh.isMesh) return;
    const geometry=mesh.geometry, pos=geometry.getAttribute('position');
    const count=geometry.index?.count ?? pos.count;
    for(let i=0;i<count;i+=3) triangles.push([0,1,2].map(k => new Vector3().fromBufferAttribute(pos,geometry.index?.getX(i+k) ?? i+k).applyMatrix4(mesh.matrixWorld).toArray()));
  });
  const actualWallTop = Math.max(...triangles.flatMap(t => t.map(v => v[1]!)));
  reports.push({mask,recipeSha256:createHash('sha256').update(recipeBytes).digest('hex'),checks,
    unanchoredSupports:supports.filter(p => !anchoredSupports.has(p.name)).map(p => p.name),
    unanchoredComponents:recipe.primitives.filter(p => !anchoredAll.has(p.name)).map(p => p.name),
    actualWallTop,wallAboveFloor:actualWallTop>1.02+.00001,
    boxes:recipe.primitives.map(p=>({name:p.name,footprint:corners(p),bottom:p.location[2]!-p.dimensions[2]!/2,top:p.location[2]!+p.dimensions[2]!/2})),
    realWallTriangles:triangles});
  models.forEach(m=>m.dispose());
}
const result={sources:[{path:wallPath,sha256:createHash('sha256').update(bytes).digest('hex')},
  ...await Promise.all(['src/render3d/world/defences.ts','tools/art/recipe.ts'].map(async path=>({path,sha256:createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')})))],
  contactTolerance:.002,reports,limits:['Contacto de superficies por rayos verticales y adyacencia de cajas; no cálculo de cargas.',
    'Los soportes se conectan al muro sin depender del tablero. Vecinos reales rectos 5/10.',
    'Árboles, terreno, física y navegación requieren validación posterior.']};
const destination=resolve(out,'real-support.json');
const text=JSON.stringify(result,null,2)+'\n';
if (existsSync(destination)) {
  if(await readFile(destination,'utf8')!==text) throw new Error(`No se sobrescribe evidencia diferente: ${destination}`);
} else await writeFile(destination,text,{flag:'wx'});
console.log(JSON.stringify(reports.map(({mask,checks,unanchoredSupports,unanchoredComponents,actualWallTop})=>({mask,checks,unanchoredSupports,unanchoredComponents,actualWallTop}))));
if(reports.some(r=>r.unanchoredSupports.length || r.unanchoredComponents.length || r.wallAboveFloor)) process.exitCode=1;
