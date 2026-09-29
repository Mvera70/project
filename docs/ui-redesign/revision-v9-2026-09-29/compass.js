/* Maqueta: misma proyección de src/ui/camera-controls.ts, sin conectar la cámara real. */
(() => {
  const old = document.querySelector('.compass');
  if (!old || document.querySelector('.modal-open')) return;
  const asset = new URL('assets/ring-metal.png', document.currentScript.src).href;
  const el = document.createElement('button');
  el.type='button';el.className='compass r1-armillary';
  el.setAttribute('aria-label','Rotate view. Drag to turn; tap to face north.');
  el.title='Drag to rotate · tap for north';
  old.replaceWith(el);
  const style=document.createElement('style');
  style.textContent=`body.v9-after .r1-armillary{position:absolute;left:8px;bottom:88px;width:78px;height:78px;padding:0;border:0;border-radius:0;background:none!important;box-shadow:none;touch-action:none;cursor:grab;z-index:15;overflow:visible}body.v9-after .r1-armillary svg{display:block;width:100%;height:100%;overflow:visible}.r1-armillary:focus-visible{outline:2px solid #f4ddb0;outline-offset:3px}.r1-armillary:active{cursor:grabbing}`;
  document.head.append(style);
  const ns='http://www.w3.org/2000/svg';
  const make=(tag,attrs={})=>{const node=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;};
  const svg=make('svg',{viewBox:'0 0 100 100','aria-hidden':'true'});
  const defs=make('defs');const pattern=make('pattern',{id:'r1-brass',patternUnits:'userSpaceOnUse',width:64,height:64});
  pattern.append(make('image',{href:asset,width:64,height:64}));defs.append(pattern);svg.append(defs);el.append(svg);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
  const radius=40;
  function projector(yaw,pitch){
    const to=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
    const forward=to.map(v=>-v),right=unit(cross(forward,[0,1,0])),up=cross(right,forward);
    return p=>({x:50+dot(p,right)*radius,y:50-dot(p,up)*radius,front:dot(p,to)>=0});
  }
  const rear=make('g'),front=make('g');svg.append(rear,front);
  const rings=[[0,1,0],[1,0,0],[0,0,1]].map(axis=>{
    const back=make('path',{fill:'none',stroke:'url(#r1-brass)','stroke-width':2.5,'stroke-opacity':.65});
    const edge=make('path',{fill:'none',stroke:'#362b1d','stroke-width':5,'stroke-linecap':'round'});
    const face=make('path',{fill:'none',stroke:'url(#r1-brass)','stroke-width':3.5,'stroke-linecap':'round'});
    rear.append(back);front.append(edge,face);return{axis,back,edge,face};
  });
  const markers=[['N',[0,0,-1],'#724534'],['S',[0,0,1],'#31464b']].map(([label,p,colour])=>{
    const g=make('g');g.append(make('circle',{r:8.5,fill:colour,stroke:'url(#r1-brass)','stroke-width':1.6}));
    const text=make('text',{'text-anchor':'middle','dominant-baseline':'central',fill:'#f7e8c9','font-family':'Cinzel,Georgia,serif','font-size':11,'font-weight':700});
    text.textContent=label;g.append(text);svg.append(g);return{g,p};
  });
  let yaw=2.65,pitch=.5,drag=null;
  function draw(){const project=projector(yaw,pitch);
    for(const ring of rings){
      const helper=Math.abs(ring.axis[1])>.9?[1,0,0]:[0,1,0],e1=unit(cross(ring.axis,helper)),e2=cross(ring.axis,e1);
      let df='',db='',was=null,previous='';
      for(let k=0;k<=72;k++){const t=k/72*Math.PI*2,p=e1.map((v,i)=>v*Math.cos(t)+e2[i]*Math.sin(t)),at=project(p),s=`${at.x.toFixed(2)} ${at.y.toFixed(2)}`;
        if(at.front)df+=(was===true?'L':previous?'M'+previous+'L':'M')+s;else db+=(was===false?'L':previous?'M'+previous+'L':'M')+s;was=at.front;previous=s;}
      ring.back.setAttribute('d',db);ring.face.setAttribute('d',df);ring.edge.setAttribute('d',df);
    }
    for(const marker of markers){const at=project(marker.p);marker.g.setAttribute('transform',`translate(${at.x} ${at.y})`);marker.g.setAttribute('opacity',at.front?'1':'.45');}
    el.dataset.yaw=String(yaw);el.dataset.pitch=String(pitch);
  }
  el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,total:0};e.preventDefault();});
  el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.total+=Math.hypot(dx,dy);drag.x=e.clientX;drag.y=e.clientY;yaw-=dx*.8*Math.PI/180;pitch=Math.max(.12,Math.min(1.35,pitch+dy*.5*Math.PI/180));draw();});
  el.addEventListener('pointerup',()=>{if(drag&&drag.total<4){yaw=0;draw();}drag=null;});
  for(const event of ['pointercancel','lostpointercapture','blur'])el.addEventListener(event,()=>{drag=null;});
  el.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter',' '].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw+=Math.PI/8;else if(e.key==='ArrowRight')yaw-=Math.PI/8;else if(e.key==='ArrowUp')pitch=Math.min(1.35,pitch+.1);else if(e.key==='ArrowDown')pitch=Math.max(.12,pitch-.1);else yaw=0;draw();});
  window.r1Compass={setAngles:(y,p)=>{yaw=y;pitch=p;draw();},getAngles:()=>({yaw,pitch})};
  draw();
})();
