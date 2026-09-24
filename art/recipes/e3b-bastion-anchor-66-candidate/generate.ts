import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadRecipe } from '../../../tools/art/recipe';

export const directory = fileURLToPath(new URL('.', import.meta.url));
export const recipePath = `${directory}e3b-bastion-anchor-66-candidate.json`;
export type Primitive = { type: string; name: string; location: number[]; dimensions?: number[]; rotationDegrees?: number[]; width?: number; depth?: number; height?: number; material: string; parent: string };
export type Recipe = { id: string; primitives: Primitive[]; metadata: Record<string, unknown>; [key: string]: unknown };
export async function generate(): Promise<Recipe> {
  // La reflexión X conserva la triangulación del tablero y la escalera +Z.
  const source = new URL('../e3b-bastion296-mixed-candidate/e3b-bastion296-mixed-candidate.json', import.meta.url);
  const bytes = await readFile(source);
  const recipe = JSON.parse(bytes.toString()) as Recipe;
  recipe.id = 'e3b-bastion-anchor-66-candidate';
  for (const p of recipe.primitives) {
    p.location[0] = 1 - p.location[0]!;
    if (p.rotationDegrees) p.rotationDegrees[2] = -p.rotationDegrees[2]!;
    // Nombres nuevos evitan interpretar el norte/oeste de la antigua colocación.
    p.name = `Anchor66_${p.name}`;
  }
  recipe.metadata = {
    status: 'candidate_source_only', cellUnit: 1, kind: 'bastion', version: 1,
    footprint: [1.8181980515,2.65], mask: 66, access: { x: 0, z: 1 }, floorY: 1.02, clearWidth: .70,
    sourceRecipe: 'art/recipes/e3b-bastion296-mixed-candidate/e3b-bastion296-mixed-candidate.json',
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    transform: 'Reflection world X about X=0.5; authoring [x,-z,y]. Local identity placement.',
    fixtures: [{seed:23,tick:3846,id:283,cell:[36,41]}, {seed:91,tick:3846,id:295,cell:[34,39]}],
    ports: [{kind:'cardinal',face:'east',center:[1,.5],normal:[1,0],width:.7},
      {kind:'diagonal',face:'southwest',center:[-.5,1.5],normal:[-Math.SQRT1_2,Math.SQRT1_2],width:.7}],
    routeXZ: [[1,.5],[.5,.5],[-.5,1.5]], stairsRouteXZ: [[.5,2.65],[.5,1.65],[.5,.5]],
    stair: {direction:'+Z',shift:.65,count:14,width:.72,run:1,rise:1.02},
    lifeRouteXYZ: { approach:[.5,0,2.65], foot:[.5,0,2.65], exit:[.5,1.02,1.65], post:[.5,1.02,.58],
      climb:[[.5,0,2.65],...Array.from({length:14},(_,i)=>[[.5,(i+1)*1.02/14,2.65-i/14],[.5,(i+1)*1.02/14,2.65-(i+1)/14]]).flat(),[.5,1.02,.58]],
      integration:'Requires a variant-specific elevatedPostRoute; unchanged Z=2..1 route is invalid. Approach coincides with foot to keep radius .35 within reserved Z<3.' },
    ownership: 'Bastion, extended south landing and stairs, southwest diagonal through center of first adjacent cell. Neighbor half must be replaced, never overlaid.',
    limitation: 'Requires extending old stair footprint 0.65 toward +Z. Scene occupancy and next neighbor turn not validated.',
    budget: {maxTriangles:1800,maxMaterials:2,textures:0},
  };
  recipe.referenceRender = {width:1000,height:1000,cameraLocation:[3,-4,3],cameraTarget:[0,-1.3,.6],orthoScale:3.5,worldRole:'sky'};
  return recipe;
}
export async function generateGate(): Promise<Recipe> {
  const recipe=await generate();
  recipe.id='e3b-bastion-anchor-66-gate-candidate';
  recipe.primitives=recipe.primitives.filter(p=>p.name!=='Anchor66_DiagonalWallSupport');
  recipe.metadata={...recipe.metadata,neighborKind:'gate',status:'candidate_source_blocked_at_gate_join',
    ownership:'Upper southwest deck reaches gate center, excludes solid diagonal support. Must be united with gate24 deck before integration; overlapping decks are forbidden.',
    limitation:'Gate lintel contact and joint with gate24 must be resolved. Removing diagonal support alone is not structural approval.'};
  return recipe;
}
if (process.argv.includes('--write')) {
  const gatePath=`${directory}e3b-bastion-anchor-66-gate-candidate.json`;
  await writeFile(gatePath,JSON.stringify(await generateGate(),null,2)+'\n');
  await loadRecipe(gatePath);
  await writeFile(recipePath, JSON.stringify(await generate(), null, 2) + '\n');
  await loadRecipe(recipePath);
  console.log('Anchor 66 source written; schema passes.');
}


