// Fuente de autoría original del oso; el pipeline consume bear.json.
const fs = require('node:fs');
const deer = JSON.parse(fs.readFileSync('art/recipes/deer/deer.json', 'utf8'));
const bear = { schemaVersion: 1, id: 'bear', scale: 0.42, mergeByMaterial: true,
  metadata: { cellUnit: 1, kind: 'bear', footprint: [1,1], note: 'Original brown bear. Broad shoulder hump, short rounded ears, plantigrade paws. In-place clips, forward -X in Blender.' },
  materials: [ ['coat','#62412e'], ['shoulder','#78543b'], ['muzzle','#b08c63'], ['dark','#251e19'] ].map(([name,color])=>({name,color,roughness:0.95})),
  groups: [{name:'Root',location:[0,0,0],parent:null}], primitives: [],
  referenceRender: {...deer.referenceRender, cameraTarget:[0,0,0.85],orthoScale:3.8},
  rig: {bones:[],bind:{}}, clips:[], connectors:[] };
function ell(name,loc,dim,mat,bone,segments=10,rings=6) { bear.primitives.push({type:'sphere',name,location:loc,dimensions:dim,radius:1,segments,rings,rotationDegrees:[0,0,0],material:mat,parent:'Root'}); bear.rig.bind[name]=bone; }
function bone(name,head,tail,parent) { bear.rig.bones.push({name,head,tail,parent}); }
bone('root',[0,0,0],[0,0,0.1],null);
bone('body',[0,0,0.95],[0,0,1.05],'root');
bone('neck',[-0.65,0,1.13],[-0.78,0,1.2],'body');
bone('head',[-0.97,0,1.18],[-1.12,0,1.18],'neck');
bone('tail',[0.88,0,0.98],[1,0,0.98],'body');
ell('Barrel',[0.05,0,1.04],[1.92,0.93,1.04],'coat','body',12,8);
ell('ShoulderHump',[-0.51,0,1.31],[0.99,1.02,0.83],'shoulder','body',12,6);
ell('Rump',[0.69,0,1.05],[0.84,0.87,0.88],'coat','body');
ell('Neck',[-0.87,0,1.2],[0.75,0.77,0.74],'shoulder','neck');
ell('Head',[-1.19,0,1.17],[0.76,0.65,0.63],'coat','head',12,6);
ell('Muzzle',[-1.53,0,1.05],[0.5,0.4,0.31],'muzzle','head');
ell('Nose',[-1.76,0,1.1],[0.16,0.3,0.18],'dark','head',8,4);
ell('LowerJaw',[-1.49,0,0.95],[0.4,0.33,0.16],'coat','head');
ell('Tail',[1.02,0,1.04],[0.23,0.23,0.22],'coat','tail',8,4);
for (const [side,y] of [['L',-0.29],['R',0.29]]) {
 ell('Ear_'+side,[-1.05,y,1.47],[0.24,0.19,0.27],'coat','head',8,5);
 ell('EarInner_'+side,[-1.115,y,1.49],[0.095,0.12,0.15],'dark','head',8,4);
 ell('Eye_'+side,[-1.38,y*1.035,1.24],[0.075,0.045,0.07],'dark','head',8,4);
 for (const [part,x] of [['fore',-0.59],['hind',0.64]]) {
  const n=part+side, ly=y*1.12;
  bone(n,[x,ly,0.96],[x,ly,0.82],'body');
  bone(n+'Lower',[x,ly,0.46],[x,ly,0.33],n);
  bone(n+'Foot',[x-0.07,ly,0.15],[x-0.07,ly,0.05],n+'Lower');
  ell(n+'Upper',[x,ly,0.72],[0.48,0.39,0.81],'coat',n);
  ell(n+'LowerMesh',[x-0.015,ly,0.31],[0.29,0.3,0.48],'coat',n+'Lower');
  ell(n+'Paw',[x-0.12,ly,0.12],[0.46,0.34,0.24],'dark',n+'Foot');
  for(let k=-1;k<=1;k++) ell(n+'Claw'+(k+1),[x-0.335,ly+k*0.078,0.10],[0.1,0.032,0.035],'muzzle',n+'Foot',6,3);
 }
}
bear.clips=structuredClone(deer.clips);
for(const clip of bear.clips) {
 for(const track of clip.tracks) for(const key of track.keys) key.rotation=key.rotation.map(v=>v*(track.bone.startsWith('fore')||track.bone.startsWith('hind')?0.48:0.5));
 if(clip.name==='walk') clip.strideLength=0.55;
 if(clip.name==='idle') for(const track of clip.tracks) if(track.bone==='head'||track.bone==='neck') for(const key of track.keys) key.rotation=key.rotation.map(v=>v*2);
}
// Zarpazo no cíclico con raíz inmóvil.
bear.clips.push({name:'attack',frames:37,loop:false,tracks:[
 {bone:'body',keys:[{frame:1,rotation:[0,0,0]},{frame:12,rotation:[-4,-5,0]},{frame:20,rotation:[4,5,0]},{frame:37,rotation:[0,0,0]}]},
 {bone:'foreL',keys:[{frame:1,rotation:[0,0,0]},{frame:12,rotation:[-12,0,65]},{frame:20,rotation:[15,0,-25]},{frame:37,rotation:[0,0,0]}]},
 {bone:'head',keys:[{frame:1,rotation:[0,0,0]},{frame:12,rotation:[0,-8,0]},{frame:20,rotation:[0,12,0]},{frame:37,rotation:[0,0,0]}]}
]});
fs.mkdirSync('art/recipes/bear',{recursive:true});
fs.writeFileSync('art/recipes/bear/bear.json',JSON.stringify(bear,null,2)+'\n');
const catalog=JSON.parse(fs.readFileSync('art/catalog.json','utf8'));
if(!catalog.assets.some(a=>a.id==='bear')) catalog.assets.unshift({id:'bear',artifactRound:'G-34',status:'study',recipe:'art/recipes/bear/bear.json',generator:'tools/art/blender-build.py',blenderVersion:'5.2.1 LTS',approved:null,bounds:null,recipeSha256:null,materials:bear.materials.map(m=>m.name),clips:bear.clips.map(c=>c.name),motion:[],connectors:[],statistics:null,hashes:{},provenance:{kind:'original',source:'Original procedural brown bear modeled for The Valley, 23 Sep 2026. No external provider.',license:'Project original'}});
fs.writeFileSync('art/catalog.json',JSON.stringify(catalog,null,2)+'\n');

