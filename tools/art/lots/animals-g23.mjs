// G-23 · Autoría reproducible: ejecutar con un único id, validar y subir antes del siguiente.
import fs from 'node:fs';
const id = process.argv[2];
if (!['cow', 'pig', 'hen', 'wolf', 'crow', 'fish'].includes(id)) throw Error('Especie desconocida');
const r = JSON.parse(fs.readFileSync(`art/recipes/${id}/${id}.json`, 'utf8'));
r.primitives = []; r.clips = []; r.mergeByMaterial = true;
r.metadata.note = 'G-23: animal articulado, silueta propia, clips idle y walk in-place; marcha vinculada a distancia en el juego.';
r.materials = [
  {name:'coat',color:({cow:'#765039',pig:'#b77968',hen:'#b07b47',wolf:'#666962',crow:'#303b40',fish:'#78918b'})[id],roughness:.9},
  {name:'light',color:({cow:'#dfd2b3',pig:'#d29b85',hen:'#e5d1a5',wolf:'#a5a795',crow:'#56616a',fish:'#c8c9a8'})[id],roughness:.9},
  {name:'dark',color:'#302c29',roughness:.95},
  {name:'accent',color:({cow:'#a78372',pig:'#96564d',hen:'#a13f31',wolf:'#373e3c',crow:'#222b30',fish:'#a38964'})[id],roughness:.85},
];
// Sin paleta externa: colores de especie explícitos, sin alterar la compartida.
delete r.palette;
r.rig = {bones:[],bind:{}};
const bone = (name, head, parent=null) => r.rig.bones.push({name,head,tail:[head[0],head[1],head[2]+.1],parent});
const piece = (name,location,dimensions,material='coat',bind='body',bevel=.025) => {
  r.primitives.push({type:'cube',name,location,dimensions,material,parent:'Root',bevel}); r.rig.bind[name]=bind;
};
const cone = (name,location,radius,depth,material,bind,rotationDegrees=[0,0,0]) => {
  r.primitives.push({type:'cone',name,location,radius,depth,vertices:6,rotationDegrees,material,parent:'Root'}); r.rig.bind[name]=bind;
};
bone('body',[0,0,.5]);
let stride=.18;
const legs=[];
if (['cow','pig','wolf'].includes(id)) {
  const cow=id==='cow',pig=id==='pig';
  const length=cow?1.48:pig?1.02:1.22, width=cow?.66:pig?.58:.4;
  const hip=cow?.72:pig?.34:.62, l=hip/2, h=cow?.63:pig?.48:.42;
  stride=cow?.21:pig?.115:.2;
  piece('Torso',[0,0,hip+h*.48],[length,width,h],'coat','body',.10);
  piece('Chest',[-length*.34,0,hip+h*.48],[length*.36,width*1.05,h*1.05],'coat','body',.065);
  if(cow) {
    piece('Saddle',[.16,0,hip+h*.55],[.52,width+.012,h*.91],'light','body',.07);
    piece('Udder',[.4,0,hip-.03],[.32,.32,.17],'accent','body',.045);
    for(const x of [.31,.47])for(const y of [-.09,.09])piece(`Teat_${x}_${y}`.replaceAll('-','N').replaceAll('.','_'),[x,y,hip-.13],[.045,.045,.08],'accent','body',.006);
  }
  if(!pig)piece('Bib',[-length*.4,0,hip+h*.16],[.3,width*.85,.26],'light','body',.045);
  bone('neck',[-length*.42,0,hip+h*.63],'body');
  piece('Neck',[-length*.51,0,hip+h*.58],[.35,width*.62,h*.72],'coat','neck',.065);
  const hx=-length*.7,hz=hip+h*.66;
  bone('head',[hx+.11,0,hz+.08],'neck');
  piece('Head',[hx,0,hz],[pig?.37:.36,width*.56,pig?.31:.39],cow?'light':'coat','head',.06);
  piece('Muzzle',[hx-.2,0,hz-.09],[pig?.14:.27,width*.53,.19],pig?'accent':cow?'accent':'light','head',.04);
  for(const side of [-1,1]) {
    piece('Eye_'+(side<0?'L':'R'),[hx-.075,side*width*.287,hz+.08],[.065,.018,.052],'dark','head',.009);
    piece('Nostril_'+(side<0?'L':'R'),[hx-(pig?.276:.34),side*width*.135,hz-.07],[.012,.043,.035],'dark','head',.006);
    bone('ear'+side,[hx+.09,side*width*.27,hz+.15],'head');
    if(cow||pig)piece('Ear_'+(side<0?'L':'R'),[hx+.09,side*width*.42,hz+.18],[.21,.22,.085],pig?'accent':'coat','ear'+side,.025);
    else cone('Ear_'+(side<0?'L':'R'),[hx+.1,side*.13,hz+.27],.095,.24,'coat','ear'+side);
    if(cow)cone('Horn_'+(side<0?'L':'R'),[hx+.13,side*.17,hz+.32],.055,.22,'light','head',[side*20,0,0]);
  }
  for(const [front,x] of [[true,-length*.33],[false,length*.34]])for(const side of [-1,1]) {
    const n=(front?'fore':'hind')+(side<0?'L':'R'),y=side*width*.34;
    bone(n,[x,y,hip],'body');bone(n+'Lower',[x,y,hip-l],n);bone(n+'Foot',[x,y,.06],n+'Lower');
    piece(n+'UpperMesh',[x,y,hip-l/2],[pig?.14:.15,pig?.14:.145,l+.045],'coat',n,.025);
    piece(n+'LowerMesh',[x,y,l/2+.04],[.095,.10,l-.015],'light',n+'Lower',.015);
    piece(n+'Hoof',[x-.025,y,.055],[.16,.135,.11],'dark',n+'Foot',.014);
    legs.push({n,l1:l,l2:l-.06,hip,phase:front?(side<0?0:.5):(side<0?.75:.25)});
  }
  bone('tail',[length*.47,0,hip+h*.7],'body');
  if(pig) {
    piece('TailBase',[length*.55,0,hip+h*.67],[.19,.055,.055],'coat','tail',.012);
    piece('TailCurlUp',[length*.62,0,hip+h*.75],[.05,.055,.16],'coat','tail',.012);
    piece('TailCurlBack',[length*.59,0,hip+h*.84],[.1,.055,.055],'coat','tail',.012);
  } else {
    piece('Tail',[length*.53,0,hip+h*.35],[cow?.065:.16,.09,cow?.68:.5],'coat','tail',.026);
    piece('TailTip',[length*.54,0,hip+h*.35-(cow?.34:.24)],[cow?.13:.16,.12,.18],'dark','tail',.035);
  }
  r.referenceRender={width:600,height:600,cameraLocation:[-3.2,-4,2.6],cameraTarget:[0,0,.65],orthoScale:3.05,worldColor:'#bec9c0'};
} else if(id==='hen'||id==='crow') {
  const hen=id==='hen',hip=hen?.19:.16;
  stride=hen?.075:.08;
  piece('Breast',[-.05,0,.31],[.33,.24,.28],hen?'light':'coat','body',.075);
  piece('Back',[.08,0,.33],[.3,.23,.22],'coat','body',.06);
  bone('neck',[-.16,0,.35],'body');
  piece('Neck',[-.17,0,.43],[.13,.14,.23],hen?'light':'coat','neck',.035);
  bone('head',[-.18,0,.5],'neck');
  piece('Head',[-.21,0,.53],[.17,.145,.16],'coat','head',.035);
  cone('Beak',[-.33,0,.515],.045,hen?.1:.16,hen?'light':'dark','head',[0,-90,0]);
  for(const side of [-1,1]) {
    piece('Eye_'+(side<0?'L':'R'),[-.25,side*.075,.55],[.035,.012,.03],hen?'dark':'light','head',.005);
    const n=side<0?'legL':'legR';bone(n,[0,side*.07,hip],'body');bone(n+'Lower',[0,side*.07,.10],n);bone(n+'Foot',[0,side*.07,.025],n+'Lower');
    piece(n+'Thigh',[0,side*.07,.16],[.055,.055,.11],'coat',n,.01);
    piece(n+'Shin',[0,side*.07,.065],[.025,.028,.1],hen?'light':'dark',n+'Lower',.005);
    for(const toe of [-1,0,1])piece(n+'Toe'+(toe+1),[-.04,side*.07+toe*.025,.015],[.12,.015,.028],hen?'light':'dark',n+'Foot',.005);
    legs.push({n,l1:hip-.10,l2:.075,hip,phase:side<0?0:.5});
    bone('wing'+side,[.03,side*.1,.39],'body');
    piece('Wing_'+(side<0?'L':'R'),[.045,side*.125,.335],[.26,.075,.16],hen?'coat':'accent','wing'+side,.04);
    for(let k=0;k<3;k++)piece('Flight_'+(side<0?'L':'R')+k,[.14+k*.024,side*.135,.31-k*.026],[.18,.04,.035],hen?'dark':'coat','wing'+side,.012);
  }
  bone('tail',[.19,0,.36],'body');
  piece('Rump',[.19,0,.35],[.18,.18,.17],'coat','tail',.035);
  for(let k=0;k<3;k++)piece('TailFeather'+k,[.23+k*.035,(k-1)*.045,hen?.40+k*.025:.31],[.18,.055,hen?.16:.055],'dark','tail',.018);
  if(hen){for(let k=0;k<3;k++)piece('Comb'+k,[-.25+k*.045,0,.63],[.052,.035,.065-k*.006],'accent','head',.015);piece('Wattle',[-.27,0,.455],[.04,.06,.08],'accent','head',.015);}
  r.referenceRender={width:600,height:600,cameraLocation:[-1.3,-1.8,1.15],cameraTarget:[0,0,.3],orthoScale:1.1,worldColor:'#bec9c0'};
  for(const primitive of r.primitives)if(primitive.dimensions&&Math.min(...primitive.dimensions)<.09)primitive.bevel=0;
} else {
  stride=.13;
  piece('Body',[0,0,.02],[.32,.12,.17],'coat','body',.05);
  piece('Belly',[-.015,0,-.025],[.27,.1,.075],'light','body',.025);
  bone('head',[-.1,0,.02],'body');piece('Head',[-.16,0,.025],[.12,.115,.13],'coat','head',.035);
  for(const side of [-1,1])piece('Eye_'+(side<0?'L':'R'),[-.18,side*.055,.052],[.035,.015,.03],'dark','head',.008);
  bone('tail',[.11,0,.02],'body');bone('tailTip',[.21,0,.02],'tail');
  piece('TailStem',[.17,0,.02],[.14,.065,.095],'coat','tail',.023);
  for(const side of [-1,1])cone('TailFin_'+(side<0?'L':'R'),[.27,0,.02+side*.055],.065,.13,'accent','tailTip',[0,side>0?0:180,0]);
  cone('Dorsal',[0,0,.13],.065,.15,'accent','body');
  for(const side of [-1,1]){bone('fin'+side,[-.055,side*.045,0],'body');piece('Fin_'+(side<0?'L':'R'),[-.015,side*.085,-.015],[.10,.08,.025],'accent','fin'+side,.008);}
  r.referenceRender={width:600,height:600,cameraLocation:[-1,-1.3,.9],cameraTarget:[0,0,.03],orthoScale:.8,worldColor:'#bec9c0'};
}
// Todos los huesos tienen ejes iguales: Y local es Z de Blender.
// IK planar: apoyo lineal y retorno con elevación; el último fotograma repite el primero.
const deg=x=>x*180/Math.PI;
const tracksFor=(moving)=>r.rig.bones.map(b=>{
  const keys=[];
  for(let i=0;i<=32;i++){
    const t=i/32,rot=[0,0,0],leg=legs.find(l=>b.name===l.n||b.name===l.n+'Lower'||b.name===l.n+'Foot');
    if(leg&&moving){
      const p=(t+leg.phase)%1,swing=p>.62,u=swing?(p-.62)/.38:p/.62;
      const travel=stride*3*.62,dx=swing?travel/2-travel*u:-travel/2+travel*u;
      const lift=swing?Math.sin(Math.PI*u)*leg.hip*.18:0;
      const down=leg.l1+leg.l2-.005-lift,d=Math.hypot(dx,down);
      const clamp=v=>Math.max(-1,Math.min(1,v));
      const a=Math.atan2(dx,down)-Math.acos(clamp((leg.l1**2+d*d-leg.l2**2)/(2*leg.l1*d)));
      const bend=Math.acos(clamp((d*d-leg.l1**2-leg.l2**2)/(2*leg.l1*leg.l2)));
      rot[2]=deg(b.name===leg.n?a:b.name===leg.n+'Lower'?bend:-a-bend);
    }else if(b.name==='neck')rot[2]=moving?2*Math.sin(t*2*Math.PI):18+16*Math.sin(t*2*Math.PI);
    else if(b.name==='head')rot[2]=moving?-2*Math.sin(t*2*Math.PI):-(8+5*Math.sin(t*2*Math.PI));
    else if(b.name.startsWith('tail'))rot[1]=(id==='fish'?24:10)*Math.sin(t*2*Math.PI+(b.name==='tailTip'?.7:0));
    else if(b.name.startsWith('ear'))rot[0]=5*Math.sin(t*4*Math.PI);
    else if(b.name.startsWith('wing'))rot[0]=(moving?3:6)*Math.sin(t*2*Math.PI);
    else if(b.name.startsWith('fin'))rot[1]=15*Math.sin(t*2*Math.PI);
    keys.push({frame:1+i*(moving?2:6),rotation:rot});
  }
  keys[keys.length-1].rotation=[...keys[0].rotation];
  return {bone:b.name,keys};
});
r.clips=[{name:'idle',frames:193,loop:true,tracks:tracksFor(false)},{name:'walk',frames:65,loop:true,strideLength:stride,tracks:tracksFor(true)}];
fs.writeFileSync(`art/recipes/${id}/${id}.json`,JSON.stringify(r,null,2)+'\n');
const catalog=JSON.parse(fs.readFileSync('art/catalog.json','utf8')),entry=catalog.assets.find(a=>a.id===id);
entry.artifactRound='G-23';entry.provenance={kind:'original',source:'Receta original G-23; anatomía estilizada, rig por especie y marcha articulada.',license:'project-original'};
fs.writeFileSync('art/catalog.json',JSON.stringify(catalog,null,2)+'\n');
console.log(id+': receta y catálogo preparados.');
