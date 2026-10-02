import { readFile, writeFile } from 'node:fs/promises';
const here=new URL('./',import.meta.url);
const read=async p=>JSON.parse(await readFile(new URL(p,here),'utf8'));
const timber=await read('../house/house.json'),stone=await read('../stone-house/stone-house.json');
const all=[];
const box=(name,location,dimensions,material)=>({type:'cube',name,location,dimensions,material,parent:'Root'});
function add(r,p){r.primitives.push(p);return p;}
function beam(r,name,a,b,width=.12){const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);const p=box(name,a.map((v,i)=>(v+b[i])/2),[width,width,len],'wood');p.rotationDegrees=[-Math.asin(d[1]/len)*180/Math.PI,Math.atan2(d[0],d[2])*180/Math.PI,0];add(r,p);}
function base(id,isStone,cover){const r=structuredClone(isStone?stone:timber);r.id=id;r.house=cover;r.primitives=r.primitives.filter(p=>p.material==='door'||/Door(Recess|Jamb|Lintel|Plinth|Surround|Step)/.test(p.name));all.push(r);return r;}
// Cascarón cerrado: alero con espesor y cumbrera horizontal. Los extremos pueden ser hastial o cadera.
function roof(r,name,x,y,w,d,eave,rise,hipLeft=0,hipRight=0,rotation=0){
 const a=w/2,b=d/2,t=.16;const verts=[[-a,-b,0],[a,-b,0],[a,b,0],[-a,b,0],[-a,-b,t],[a,-b,t],[a,b,t],[-a,b,t],[-a+hipLeft,0,rise],[a-hipRight,0,rise]];
 const faces=[[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,9,8],[7,8,9,6],[4,8,7],[5,6,9]];
 const p=box(name,[x,y,eave],[w,d,rise],'roof');p.customMesh={vertices:verts,faces};p.rotationDegrees=[0,0,rotation];add(r,p);
 // Cumbrera ancha de paja o teja, sin las barras horizontales decorativas de V2.
 if(w-hipLeft-hipRight>.1){const ridge=box(name+'_Ridge',[x+(hipLeft-hipRight)/2,y,eave+rise-.035],[w-hipLeft-hipRight-.1,.2,.15],'roof');if(rotation){ridge.location=[x,y+(hipLeft-hipRight)/2,eave+rise-.035];ridge.dimensions=[.2,w-hipLeft-hipRight-.1,.15];}add(r,ridge);}
}
function window(r,label,x,y,z,w,h,side=false){const name=(r.id.startsWith('stone')?'Stone':'House')+'_Window_'+label;const frame=name.replace('_Window_','_Frame_');add(r,box(name,[x,y,z],side?[.065,w,h]:[w,.065,h],'window'));
 for(const sign of [-1,1])add(r,box(frame+'_Post'+sign,[x+(side?0:sign*(w/2+.04)),y+(side?sign*(w/2+.04):0),z],side?[.13,.09,h+.18]:[.09,.13,h+.18],'wood'));
 for(const sign of [-1,1])add(r,box(frame+'_Rail'+sign,[x,y,z+sign*(h/2+.04)],side?[.13,w+.18,.09]:[w+.18,.13,.09],'wood'));
 add(r,box(frame+'_Mullion',[x,y-.025,z],side?[.14,.045,h]:[.045,.14,h],'wood'));
}
function framing(r,x0,x1,y0,y1,h,spacing){for(const y of [y0,y1]){add(r,box('Sill_'+r.primitives.length,[(x0+x1)/2,y,.17],[x1-x0,.14,.18],'wood'));add(r,box('Plate_'+r.primitives.length,[(x0+x1)/2,y,h-.07],[x1-x0,.14,.16],'wood'));for(let x=x0;x<x1+.01;x+=spacing)add(r,box('Post_'+r.primitives.length,[x,y,h/2],[.14,.14,h],'wood'));}for(const x of [x0,x1])add(r,box('EndSill_'+x,[x,(y0+y1)/2,.17],[.14,y1-y0,.18],'wood'));}
function chimney(r,x,y,bottom,top){add(r,box('Chimney',[x,y,(bottom+top)/2],[.48,.55,top-bottom],'stone'));add(r,box('ChimneyCap',[x,y,top],[.62,.69,.12],'stone'));}
function foundation(r,x,y,w,d){add(r,box('Foundation',[x,y,.1],[w-.09,d-.09,.2],'stone'));}
const bay=base('house-twin-gable',false,'tiled');
foundation(bay,3,2.55,5.45,4.4);add(bay,box('LowerWalls',[3,2.8,1.03],[5.35,3.9,2.06],'plaster'));
add(bay,box('HallUpper',[3,2.98,2.76],[2.25,3.44,1.4],'plaster'));
for(const x of [1.12,4.88]){add(bay,box('Jetty_'+x,[x,2.475,2.76],[1.65,4.65,1.4],'plaster'));add(bay,box('JettyBeam_'+x,[x,.15,2.12],[1.8,.2,.22],'wood'));for(const dx of [-.7,0,.7])add(bay,box('UpperPost_'+rkey(x,dx),[x+dx,.12,2.8],[.13,.15,1.4],'wood'));beam(bay,'JettyBrace_'+x,[x,.83,1.55],[x,.15,2.12],.14);}
function rkey(a,b){return String(a)+'_'+String(b);}
framing(bay,.34,5.66,.81,4.72,2.08,1.33);
for(const x of [1.96,4.04])add(bay,box('HallPost_'+x,[x,1.19,2.79],[.14,.15,1.5],'wood'));
beam(bay,'BraceHallL',[1.98,1.2,2.2],[2.7,1.2,3.4]);beam(bay,'BraceHallR',[4.02,1.2,2.2],[3.3,1.2,3.4]);
for(const x of [.34,5.66]){add(bay,box('EndBeam_'+x,[x,2.55,2.12],[.16,4.4,.18],'wood'));for(const y of [.35,2.5,4.72])add(bay,box('EndPost_'+x+'_'+y,[x,y,1.75],[.16,.14,3.5],'wood'));beam(bay,'EndBrace_'+x,[x,2.5,2.2],[x,3.5,3.35],.14);}
roof(bay,'BayleafRoof',3,2.52,6,5.04,3.46,1.8,1.25,1.25);
// Cinco hiladas finas siguiendo el faldón, con el mismo material de teja.
for(const f of [.2,.4,.6,.8])for(const side of [-1,1]){const z=3.46+.16+(1.8-.16)*f;add(bay,box('TileCourse_'+side+'_'+f,[3,2.52+side*2.52*(1-f),z+.015],[6-2*1.25*f,.035,.035],'roof'));}
// El umbral se conserva, la pequeña entrada devuelve hacia el salón retraído.
for(const x of [2.4,3.6])add(bay,box('EntryReturn_'+x,[x,.58,.95],[.15,.6,1.9],'wood'));
window(bay,'A',1.07,.09,2.83,.5,.66);window(bay,'B',4.9,.79,1.17,.65,.64);window(bay,'C',4.06,1.19,2.82,.47,.91);
bay.reference={name:'Bayleaf hall-house',page:'https://www.wealddown.co.uk/buildings/bayleaf-farmstead-chiddingstone/',photo:'https://www.wealddown.co.uk/wp-content/uploads/2020/12/Bayleaf-house-garden.jpg',adaptation:'Extremos de entramado volados sobre planta baja, centro alto retraído, aleros continuos y cubierta de teja a cuatro aguas. Se comprimen seis habitaciones a tres masas en 6 m; no se reproducen planta ni arqueología interior. Los ID twin-gable se conservan por compatibilidad: ya no describen dos hastiales.'};
const boar=base('house-hip-roof',false,'thatched');
foundation(boar,3,2.23,5.3,3.8);add(boar,box('HallWalls',[3,2.23,1.08],[5.2,3.7,2.16],'plaster'));framing(boar,.42,5.58,.35,4.1,2.16,1.72);
beam(boar,'BraceRight',[5.56,.32,1.15],[4.86,.32,2.1],.16);beam(boar,'BraceLeft',[.44,.32,1.12],[1.11,.32,2.1],.16);
roof(boar,'BoarhuntThatch',3,2.22,6,4.44,2.15,2.2,0,1.25);
window(boar,'A',1.65,.305,1.19,.72,.71);window(boar,'B',4.55,.305,1.33,.39,.46);window(boar,'C',.36,2.62,1.16,.49,.57,true);
boar.reference={name:'Hall from Boarhunt',page:'https://www.wealddown.co.uk/buildings/hall-house-boarhunt/',photo:'https://www.wealddown.co.uk/wp-content/uploads/2020/12/52-Hall-from-Boarhunt-v2-scaled.jpg',adaptation:'Hall bajo alargado, crujías de entramado, paja con espesor y cadera en un extremo. Se omiten las cerchas cruck interiores y se reduce la longitud. Museo: extremo perdido y parte de los huecos son reconstrucción conjetural; esta versión es una adaptación visual, no una restitución.'};
const cottage=base('stone-house',true,'thatched');
foundation(cottage,3,2.14,5.3,3.66);add(cottage,box('Stone_Walls',[3,2.14,1.025],[5.24,3.6,2.05],'stone'));
roof(cottage,'HangletonThatch',3,2.14,5.98,4.28,2.03,1.82,.62,.62);
window(cottage,'A',1.1,.28,1.2,.47,.41);window(cottage,'B',4.35,.28,1.26,.92,.37);window(cottage,'C',.32,2.54,1.18,.4,.41,true);
add(cottage,box('CornerButtress',[5.55,3.85,.75],[.45,.42,1.5],'stone'));
cottage.reference={name:'Hangleton flint cottage',page:'https://www.wealddown.co.uk/buildings/medieval-building-hangleton/',photo:'https://www.wealddown.co.uk/wp-content/uploads/2020/12/Hangleton-cottage.jpg',adaptation:'Muros bajos de mampostería, planta rectangular humilde, huecos pequeños y paja de alero grueso. Piedra facetada sustituye el detalle del sílex. La fuente declara conjetural todo lo situado sobre aleros; la cubierta sigue la reconstrucción del museo, sin presentarla como certeza medieval.'};
const cross=base('stone-house-cross-gable',true,'thatched');
foundation(cross,3,2.6,5.25,4.55);add(cross,box('Stone_Walls',[2.25,2.62,1.27],[3.7,4.5,2.54],'stone'));add(cross,box('Stone_CrossWing',[4.8,2.85,1.72],[1.65,5.35,3.44],'stone'));
roof(cross,'HallThatch',2.13,2.62,4.2,5.16,2.53,1.68,0,0);roof(cross,'WingThatch',4.78,2.88,5.76,2.44,3.43,1.18,0,0,90);
window(cross,'A',1.23,.31,1.29,.74,.76);window(cross,'B',4.8,.11,2.63,.68,.7);window(cross,'C',.335,2.85,1.31,.53,.66,true);chimney(cross,.69,3.55,2.5,4.28);
cross.reference={name:'Church Farmhouse, Newnham',page:'https://historicengland.org.uk/listing/the-list/list-entry/1076540',photo:null,adaptation:'Solo ficha oficial: hall con ala transversal, mampostería de ironstone, paja, dinteles de madera y chimeneas sobre base pétrea. El ala nace del suelo en un lateral y apenas supera la cubierta principal. Se comprimen longitud, plantas y huecos; piedra de paleta sustituye color de ironstone. No se ha usado foto verificable. El ID cross-gable se conserva por compatibilidad.'};
const porch=base('stone-house-tower-loft',true,'thatched');
foundation(porch,3,2.6,5.32,4.25);add(porch,box('Stone_Walls',[3,2.94,1.74],[5.24,3.48,3.48],'stone'));
// Habitación frontal apoyada en pilares, alineada con el alero principal.
add(porch,box('PorchChamber',[3,.73,2.69],[1.85,1.18,1.1],'stone'));
for(const x of [2.16,3.84])add(porch,box('PorchPillar_'+x,[x,.3,1.08],[.25,.36,2.16],'stone'));
add(porch,box('PorchBressumer',[3,.12,2.16],[2.03,.19,.2],'wood'));
for(const x of [2.13,3.87])add(porch,box('PorchPost_'+x,[x,.11,2.7],[.14,.14,1.12],'wood'));
roof(porch,'SeaHillMain',3,2.99,6,4.02,3.47,1.5,0,0);roof(porch,'SeaHillPorch',3,1.07,2.14,2.38,3.23,.86,0,0,90);
window(porch,'A',1.2,1.14,1.22,.56,.64);window(porch,'B',3,.075,2.7,.62,.58);window(porch,'C',.33,3.15,2.55,.58,.72,true);chimney(porch,4.7,1.09,0,4.7);
porch.reference={name:'Sea Hill, Christow',page:'https://historicengland.org.uk/listing/the-list/list-entry/1097809',photo:null,adaptation:'Solo ficha oficial: habitación entramada sobre porche, sostenida por monolitos; fachada asimétrica y chimenea lateral. El cuarto se alinea con el alero del cuerpo, nunca como torre. Se comprime el porche y se reinterpreta la antigua paja citada en la ficha; el edificio observado hoy tiene reformas de siglos XVI–XX y pizarra. No se afirma reconstrucción medieval pura ni detalle fotográfico. ID tower-loft conservado solo por compatibilidad.'};
for(const r of all){const isStone=r.id.startsWith('stone'),door=r.primitives.find(p=>p.material==='door');r.metadata.note='V3: adaptación documentada de '+r.reference.name+'; ID heredado por compatibilidad. Tres huecos asimétricos, acceso original.';r.candidateBuild={adapter:'build-candidates.py',triangleLimit:isStone?1200:900,doorPivot:[door.location[0]-door.dimensions[0]/2,door.location[1],0],removeBuriedFaces:true,masonry:isStone?[{primitive:'Stone_Walls',rows:4,columns:4,relief:.038,joint:.028},...(r===cross?[{primitive:'Stone_CrossWing',rows:4,columns:3,relief:.03,joint:.03}]:[])]:[]};for(const p of r.primitives)p.name=p.name.replaceAll('.','_').replaceAll('-','n');await writeFile(new URL(r.id+'.json',here),JSON.stringify(r,null,2)+'\n');}
