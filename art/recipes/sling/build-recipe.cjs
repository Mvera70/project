// Honda manual original, estática: origen en el agarre y bolsa colgante.
const fs = require('node:fs');
const sling = {
  schemaVersion: 1, id: 'sling', scale: 1 / 3, mergeByMaterial: true,
  metadata: {cellUnit: 1, kind: 'sling', footprint: [1, 1]},
  materials: [['cord', '#ad8554'], ['leather', '#68432b'], ['stone', '#b3aaa0']].map(([name, color]) => ({name, color, roughness: 0.95})),
  groups: [{name: 'Root', location: [0,0,0], parent: null}, {name: 'grip', location: [0,0,0], parent: 'Root'}, {name: 'projectile', location: [0,-0.007,-0.567], parent: 'Root'}],
  primitives: [], clips: [], connectors: ['grip', 'projectile'],
  referenceRender: {width: 600, height: 600, cameraLocation: [0.75,-1.8,0.4], cameraTarget: [0,0,-0.10], orthoScale: 0.30, worldColor: '#bec9c0'},
};
function rod(name, a, b, radius, material) {
  const dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2];
  sling.primitives.push({type:'cylinder',name,location:a.map((v,i)=>(v+b[i])/2),radius,depth:Math.hypot(dx,dy,dz),vertices:5,rotationDegrees:[-Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI,Math.atan2(dx,dz)*180/Math.PI,0],material,parent:'Root'});
}
function ell(name, location, dimensions, material, segments=8, rings=4) {
  sling.primitives.push({type:'sphere',name,location,dimensions,radius:1,segments,rings,material,parent:'Root'});
}
// La separación entre correas permite leer la V al tamaño del aldeano.
for(const [side,sign] of [['L',-1],['R',1]]) {
  const points=[[sign*0.018,0,-0.012],[sign*0.036,0,-0.20],[sign*0.059,0,-0.41],[sign*0.092,0,-0.575]];
  for(let i=1;i<points.length;i++) rod('Cord'+side+i,points[i-1],points[i],0.012,'cord');
  ell('PouchTie'+side,[sign*0.078,0,-0.585],[0.055,0.048,0.042],'leather',6,3);
}
ell('Pouch',[0,0,-0.61],[0.195,0.108,0.067],'leather',10,4);
ell('Stone',[0,-0.007,-0.568],[0.115,0.09,0.085],'stone',8,4);
rod('ReleaseKnot',[0.018,0,-0.025],[0.032,0,0.004],0.024,'leather');
// Bucle de retención plano, abierto para que se reconozca como correa.
const ring=Array.from({length:7},(_,i)=>{const a=i*Math.PI/3;return [-0.021+Math.cos(a)*0.029,0,0.026+Math.sin(a)*0.036];});
for(let i=1;i<ring.length;i++) rod('FingerLoop'+i,ring[i-1],ring[i],0.010,'cord');
fs.writeFileSync('art/recipes/sling/sling.json',JSON.stringify(sling,null,2)+'\n');
const catalog=JSON.parse(fs.readFileSync('art/catalog.json','utf8'));
if(!catalog.assets.some(a=>a.id===sling.id)) {
  catalog.assets.unshift({id:sling.id,artifactRound:'G-38',status:'study',recipe:'art/recipes/sling/sling.json',generator:'tools/art/blender-build.py',blenderVersion:'5.2.1 LTS',approved:null,bounds:null,recipeSha256:null,materials:sling.materials.map(m=>m.name),clips:[],motion:[],connectors:sling.connectors,statistics:null,hashes:{},provenance:{kind:'original',source:'Original leather hand sling for The Valley, 23 Sep 2026. Local procedural authorship; no external provider.',license:'Project original'}});
  fs.writeFileSync('art/catalog.json',JSON.stringify(catalog,null,2)+'\n');
}
