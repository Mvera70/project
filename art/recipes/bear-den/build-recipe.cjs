// Entrada exterior: Z arriba en receta; frente -Y Blender = +Z glTF.
const fs = require('node:fs');
const recipe = {schemaVersion:1,id:'bear-den',scale:1,mergeByMaterial:true,metadata:{cellUnit:1,kind:'bear-den',footprint:[2,2],note:'Exterior rocky den only. Front faces +Z in glTF. Entrance connector at [0,0,0.55] glTF. Bear retreats toward -Z; hide behind the dark recess plane at z=-0.45. Sink base 0.08 cells into mountain.'},materials:[{name:'stone',color:'#82816b',roughness:1},{name:'recess',color:'#171b17',roughness:1}],groups:[{name:'Root',location:[0,0,0],parent:null},{name:'entrance',location:[0,-0.55,0],parent:'Root'}],primitives:[],connectors:['entrance'],clips:[],referenceRender:{width:780,height:640,cameraLocation:[3,-4,2.6],cameraTarget:[0,0,0.6],orthoScale:3.5,worldColor:'#abb596'}};
function rock(name,location,dimensions,rotationDegrees,material='stone',segments=7,rings=4){recipe.primitives.push({type:'sphere',name,location,dimensions,rotationDegrees,material,segments,rings,radius:1,smooth:false,parent:'Root'});}
rock('LeftFoot',[-0.82,0,0.36],[0.82,1.6,0.95],[8,-12,13]);
rock('RightFoot',[0.85,0.05,0.37],[0.85,1.55,1.02],[-9,12,-18]);
rock('LeftShoulder',[-0.71,0.08,0.87],[0.7,1.45,0.88],[5,-20,12]);
rock('RightShoulder',[0.73,0.12,0.93],[0.77,1.4,0.87],[10,22,-8]);
rock('ArchCrown',[-0.07,0.13,1.28],[1.43,1.48,0.64],[8,-6,7]);
rock('RearMass',[0,0.78,0.68],[1.65,0.65,1.39],[0,8,15]);
rock('LooseStoneLeft',[-1.01,-0.68,0.11],[0.45,0.5,0.31],[13,8,30]);
rock('LooseStoneRight',[0.97,-0.59,0.1],[0.42,0.43,0.29],[0,7,-9]);
// Un fondo oscuro corto tapa el macizo trasero; no se modela habitación.
rock('ShadowOpening',[0,0.44,0.47],[1.26,0.09,1.2],[0,0,0],'recess',10,5);
fs.writeFileSync('art/recipes/bear-den/bear-den.json',JSON.stringify(recipe,null,2)+'\n');
const catalog=JSON.parse(fs.readFileSync('art/catalog.json','utf8'));
if(!catalog.assets.some(a=>a.id===recipe.id))catalog.assets.push({id:recipe.id,artifactRound:'G-39',status:'study',recipe:'art/recipes/bear-den/bear-den.json',generator:'tools/art/blender-build.py',blenderVersion:'5.2.1 LTS',approved:null,bounds:null,recipeSha256:null,materials:recipe.materials.map(m=>m.name),clips:[],motion:[],connectors:recipe.connectors,statistics:null,hashes:{},provenance:{kind:'original',source:'Original procedural exterior bear den for The Valley. 23 Sep 2026. No external provider.',license:'Project original'}});
fs.writeFileSync('art/catalog.json',JSON.stringify(catalog,null,2)+'\n');
