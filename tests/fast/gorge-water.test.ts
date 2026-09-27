import { describe, expect, it } from 'vitest';
import { Line3, Vector3, type Mesh } from 'three';
import { foundGame } from '@engine/found';
import { PALETTES } from '@derive/palette';
import { buildBackdrop } from '../../src/render3d/world/backdrop';
import { buildGround } from '../../src/render3d/world/ground';
function section(mesh: Mesh,z: number): Vector3[] {
 const p=mesh.geometry.getAttribute('position');const result: Vector3[]=[];
 for(let i=0;i<p.count;i++) if(Math.abs(p.getZ(i)-z)<1e-5) result.push(new Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(mesh.matrixWorld));
 return result;
}
describe('el corredor de agua de la garganta',()=>{
 it('continúa con igual ancho y cota a ambos lados del mapa, con y sin riada',()=>{
  for(const seed of [7,11,23,41]){
   const {map,terrainSeed}=foundGame(seed);const ground=buildGround(map,PALETTES.spring);const backdrop=buildBackdrop(map,terrainSeed,PALETTES.spring);
   const outer=backdrop.group.getObjectByName('Valley_Backdrop_Water') as Mesh;
   const innerFlood=ground.water!.getObjectByName('Valley_Flood') as Mesh;
   const outerFlood=outer.getObjectByName('Valley_Backdrop_Flood_Mouth') as Mesh;
   expect(outerFlood).toBeDefined();
   for(const level of [0,1]){
    ground.ripple(0,level);backdrop.flood(level);ground.mesh.updateMatrixWorld(true);backdrop.group.updateMatrixWorld(true);
    expect(innerFlood.visible).toBe(outerFlood.visible);
    for(const z of [0,map.height]){
     const inside=section(ground.water!,z),outside=section(outer,z);
     if(innerFlood.visible){inside.push(...section(innerFlood,z));outside.push(...section(outerFlood,z));}
     expect(inside.length).toBeGreaterThan(0);expect(outside.length).toBeGreaterThan(0);
     outside.sort((a,b)=>a.x-b.x);
     for(const p of inside){
      const distance = Math.min(...outside.slice(1).map((q,i)=>new Line3(outside[i]!,q).closestPointToPoint(p,true,new Vector3()).distanceTo(p)));
      expect(distance,`seed ${seed}, flood ${level}, z ${z}, x ${p.x}`).toBeLessThan(1e-5);
     }
     expect(Math.min(...outside.map(p=>p.x))).toBeCloseTo(Math.min(...inside.map(p=>p.x)),5);
     expect(Math.max(...outside.map(p=>p.x))).toBeCloseTo(Math.max(...inside.map(p=>p.x)),5);
     if(level===1){
      const continued=section(outerFlood,z===0?-1:map.height+1);
      expect(Math.max(...continued.map(p=>p.x))-Math.min(...continued.map(p=>p.x))).toBeCloseTo(Math.max(...outside.map(p=>p.x))-Math.min(...outside.map(p=>p.x)),5);
     }
    }
   }
   ground.dispose();backdrop.dispose();
  }
 });
});
