// Mudada entera de `tests/fast/gorge-corridors.test.ts` el 1 oct 2026 (v5.56): tardaba 24 s en el
// trabajo `fast` de CI. Mismo cuerpo y mismo umbral; sólo cambia cuándo se paga.
//
import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { TERRAIN_CODE } from '@engine/state';
import { PALETTES } from '@derive/palette';
import { Mesh } from 'three';
import { buildBackdrop } from '../../src/render3d/world/backdrop';
import { mountainSurfaceAt } from '../../src/render3d/world/mountains';
import { buildWaterfalls } from '../../src/render3d/world/waterfalls';
import { elevationAt, FLOOD_RISE } from '../../src/render3d/world/ground';
import { GROUND_BIAS } from '../../src/render3d/visual-config';
const seeds = [7, 11, 23, 41];
describe('los corredores de la garganta', () => {
  it('la senda queda sobre la montaña en todo su ancho, también entre sus vértices', () => {
    for (const seed of seeds) {
      const {map, terrainSeed} = foundGame(seed);
      const backdrop = buildBackdrop(map, terrainSeed, PALETTES.spring);
      const road = backdrop.group.getObjectByName('Valley_Gorge_Roads') as Mesh;
      const p = road.geometry.getAttribute('position');
      for(let face = 0; face < p.count; face += 3) {
        for(const weights of [[1,0,0],[0,1,0],[0,0,1],[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]]) {
          let x=0,y=0,z=0;
          for(let k=0;k<3;k++){x+=p.getX(face+k)*weights[k]!;y+=p.getY(face+k)*weights[k]!;z+=p.getZ(face+k)*weights[k]!;}
          if(z<0 || z>=map.height) continue;
          expect(y-GROUND_BIAS-mountainSurfaceAt(map,x,z), `seed ${seed} at ${x},${z}`).toBeGreaterThanOrEqual(-1e-5);
        }
      }
      backdrop.dispose();
    }
  });
  it('la espuma ocupa agua y el pie de la cinta acompaña a su poza durante la riada', () => {
    for (const seed of seeds) {
      const {map, terrainSeed} = foundGame(seed);
      const falls = buildWaterfalls(map,terrainSeed,(x,z)=>elevationAt(map,x,z));
      const ribbons: Mesh[] = [], pools: Mesh[] = [];
      falls.group.traverse(node=>{if(node instanceof Mesh){if(node.name==='Valley_WaterfallPool')pools.push(node);if(node.name==='Valley_Waterfall' && node.geometry.getAttribute('fallProgress')) ribbons.push(node);}});
      const initial = falls.feet.map(p=>p.y);
      for(const flood of [0, .5, 1, 0]) {
        falls.flood(flood);falls.group.updateMatrixWorld(true);
        for(let i=0;i<ribbons.length;i++) {
          const p=ribbons[i]!.geometry.getAttribute('position');
          const progress=ribbons[i]!.geometry.getAttribute('fallProgress');
          let nearest=Infinity;
          for(let v=0;v<p.count;v++) if(progress.getX(v)===1) nearest=Math.min(nearest,Math.hypot(p.getX(v)-falls.feet[i]!.x,p.getZ(v)-falls.feet[i]!.z, p.getY(v)-GROUND_BIAS-falls.feet[i]!.y));
          expect(nearest).toBeLessThan(1e-5);
          const foot = falls.feet[i]!;
          const lake = map.terrain[Math.floor(foot.z)*map.width+Math.floor(foot.x)] === TERRAIN_CODE.lake;
          expect(foot.y).toBeCloseTo(initial[i]!+(lake ? 0 : flood*FLOOD_RISE),5);
        }
        for(const pool of pools) {
          const p=pool.geometry.getAttribute('position');
          for(let v=1;v<p.count;v++) {
            const x=pool.position.x+p.getX(v),z=pool.position.z-p.getY(v);
            expect(mountainSurfaceAt(map,x,z)+GROUND_BIAS).toBeLessThan(pool.position.y);
          }
        }
      }
      falls.dispose();
    }
  });
});
