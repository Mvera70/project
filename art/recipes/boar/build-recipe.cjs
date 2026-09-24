// Jabalí original de perfil bajo y hombros altos, reproducible sin edición manual.
const fs = require('node:fs');
const boar = {
  schemaVersion: 1, id: 'boar', scale: 1 / 3, mergeByMaterial: true,
  metadata: {cellUnit: 1, kind: 'boar', footprint: [1, 1]},
  materials: [['coat', '#665344'], ['mane', '#3c352f'], ['ivory', '#ded0ab'], ['dark', '#211e1b']].map(([name, color]) => ({name, color, roughness: 0.95})),
  groups: [{name: 'Root', location: [0, 0, 0], parent: null}],
  primitives: [], rig: {bones: [], bind: {}}, clips: [], connectors: [],
  referenceRender: {width: 600, height: 600, cameraLocation: [-1.5, -2, 1.2], cameraTarget: [-0.04, 0, 0.17], orthoScale: 0.92, worldColor: '#bec9c0'},
};
function bone(name, head, parent) {
  boar.rig.bones.push({name, head, tail: [head[0], head[1], head[2] + 0.1], parent});
}
function ell(name, location, dimensions, material, binding, segments = 8, rings = 5, rotationDegrees = [0, 0, 0]) {
  boar.primitives.push({type: 'sphere', name, location, dimensions, radius: 1, segments, rings, rotationDegrees, material, parent: 'Root'});
  boar.rig.bind[name] = binding;
}
function cone(name, location, radius, depth, rotationDegrees, material, binding, vertices = 5) {
  boar.primitives.push({type: 'cone', name, location, radius, depth, rotationDegrees, vertices, material, parent: 'Root'});
  boar.rig.bind[name] = binding;
}
bone('root', [0,0,0], null);
bone('body', [0.04,0,0.48], 'root');
bone('neck', [-0.43,0,0.64], 'body');
bone('head', [-0.61,0,0.57], 'neck');
bone('tail', [0.66,0,0.54], 'body');
ell('Barrel', [0.04,0,0.58], [1.32,0.58,0.66], 'coat', 'body', 12, 7);
ell('Shoulders', [-0.33,0,0.665], [0.72,0.64,0.69], 'coat', 'body', 10, 6);
ell('Rump', [0.47,0,0.53], [0.58,0.52,0.56], 'coat', 'body');
ell('Neck', [-0.56,0,0.59], [0.53,0.49,0.47], 'mane', 'neck');
ell('Head', [-0.73,0,0.54], [0.61,0.43,0.43], 'coat', 'head', 10, 6);
ell('Snout', [-1.00,0,0.431], [0.52,0.27,0.265], 'coat', 'head', 10, 5, [0,22,0]);
ell('Nose', [-1.24,0,0.345], [0.105,0.28,0.19], 'dark', 'head');
ell('Jaw', [-0.96,0,0.345], [0.43,0.25,0.12], 'mane', 'head');
// Cresta de cerdas en volumen: visible desde la cámara superior sin textura.
ell('BackRidge', [-0.075,0,0.878], [1.04,0.24,0.15], 'mane', 'body');
for(let k=0;k<5;k++) cone('Bristle'+k, [-0.40+k*0.15,0,0.956-k*0.009], 0.065, 0.17, [0,24,0], 'mane', 'body', 4);
ell('TailStem', [0.752,0,0.568], [0.25,0.052,0.065], 'coat', 'tail');
ell('TailTip', [0.86,0,0.532], [0.09,0.078,0.14], 'mane', 'tail', 6, 4);
for (const [side, sign] of [['L',-1], ['R',1]]) {
  const y=sign*0.23;
  cone('Ear'+side, [-0.62,sign*0.19,0.826], 0.135, 0.28, [sign*-20,-22,0], 'mane', 'head');
  ell('Eye'+side, [-0.865,sign*0.192,0.595], [0.065,0.024,0.053], 'dark', 'head', 6, 3);
  // Dos segmentos cortos conservan una silueta de colmillo curvo.
  ell('TuskBase'+side, [-1.053,sign*0.144,0.39], [0.095,0.074,0.15], 'ivory', 'head', 6, 4, [sign*-20,-24,0]);
  cone('TuskTip'+side, [-1.086,sign*0.165,0.48], 0.039, 0.155, [sign*-8,-19,0], 'ivory', 'head');
  for (const [part,x] of [['fore',-0.35], ['hind',0.42]]) {
    const n=part+side;
    bone(n, [x,y,0.52], 'body');
    bone(n+'Lower', [x,y,0.23], n);
    bone(n+'Foot', [x-0.025,y,0.065], n+'Lower');
    ell(n+'Upper', [x,y,0.375], [0.26,0.22,0.38], 'coat', n);
    ell(n+'Shin', [x-0.012,y,0.172], [0.115,0.125,0.24], 'coat', n+'Lower');
    for(let toe=-1;toe<=1;toe+=2) ell(n+'Hoof'+(toe+1), [x-0.036,y+toe*0.042,0.045], [0.178,0.075,0.09], 'dark', n+'Foot', 6, 3);
  }
}
function track(boneName, frames, rotations) {
  return {bone:boneName, keys:rotations.map((rotation,i)=>({frame:1+i*(frames-1)/(rotations.length-1),rotation}))};
}
boar.clips.push({name:'idle',frames:97,loop:true,tracks:[
  track('neck',97,[[0,0,0],[0,0,-6],[0,0,0],[0,0,4],[0,0,0]]),
  track('head',97,[[0,0,0],[0,9,-8],[0,0,0],[0,-8,4],[0,0,0]]),
  track('tail',97,[[0,0,0],[0,14,0],[0,0,0],[0,-14,0],[0,0,0]]),
]});
for(const [name,frames,amp,strideLength] of [['walk',49,17,0.15],['charge',25,30,0.28]]) {
  const tracks=[track('neck',frames,[[0,0,name==='charge'?-8:0],[0,0,name==='charge'?-13:-3],[0,0,name==='charge'?-8:0],[0,0,name==='charge'?-4:3],[0,0,name==='charge'?-8:0]])];
  for(const [side,sideSign] of [['L',1],['R',-1]]) for(const [part,partSign] of [['fore',1],['hind',-1]]) {
    const n=part+side, sign=sideSign*partSign;
    tracks.push(track(n,frames,[amp,0,-amp,0,amp].map(v=>[0,0,v*sign])));
    tracks.push(track(n+'Lower',frames,[0,sign>0?18:0,0,sign<0?18:0,0].map(v=>[0,0,v])));
    tracks.push(track(n+'Foot',frames,[-amp,0,amp,0,-amp].map(v=>[0,0,v*sign])));
  }
  boar.clips.push({name,frames,loop:true,strideLength,tracks});
}
boar.clips.push({name:'attack',frames:33,loop:false,tracks:[
  track('neck',33,[[0,0,0],[0,0,-16],[0,0,18],[0,0,5],[0,0,0]]),
  track('head',33,[[0,0,0],[0,-8,-8],[0,10,12],[0,4,4],[0,0,0]]),
  track('body',33,[[0,0,0],[0,0,2],[0,0,-3],[0,0,0],[0,0,0]]),
]});
fs.writeFileSync('art/recipes/boar/boar.json',JSON.stringify(boar,null,2)+'\n');
const catalog=JSON.parse(fs.readFileSync('art/catalog.json','utf8'));
if(!catalog.assets.some(a=>a.id===boar.id)) {
  catalog.assets.unshift({id:boar.id,artifactRound:'G-37',status:'study',recipe:'art/recipes/boar/boar.json',generator:'tools/art/blender-build.py',blenderVersion:'5.2.1 LTS',approved:null,bounds:null,recipeSha256:null,materials:boar.materials.map(m=>m.name),clips:boar.clips.map(c=>c.name),motion:[],connectors:[],statistics:null,hashes:{},provenance:{kind:'original',source:'Original low-poly wild boar for The Valley, 23 Sep 2026. Local procedural authorship; no external provider.',license:'Project original'}});
  fs.writeFileSync('art/catalog.json',JSON.stringify(catalog,null,2)+'\n');
}
