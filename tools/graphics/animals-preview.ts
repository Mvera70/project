// Banco G-23: GLB publicado y controlador de fauna del juego, con recorrido conocido.
import { AmbientLight, DirectionalLight, Scene, OrthographicCamera, WebGLRenderer, Color, PlaneGeometry, Mesh, MeshStandardMaterial, ACESFilmicToneMapping, Vector3, SkinnedMesh } from 'three';
import { loadAssets, type AssetManifest } from '../../src/render3d/assets';
import { Fauna } from '../../src/render3d/effects/fauna';
import type { AnimalKind } from '../../src/derive/animals';
declare const PREVIEW_BYTES: Record<string,string>;
declare const PREVIEW_MANIFEST: AssetManifest;
declare const PREVIEW_ID: AnimalKind;
declare global { interface Window { previewReady: boolean; sample: (t:number,moving:boolean)=>unknown; benchmark: (count:number,animated:boolean)=>unknown } }
const held=Object.fromEntries(Object.entries(PREVIEW_BYTES).map(([id,b64])=>[id,Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer]));
const library=await loadAssets({baseUrl:'/',manifest:PREVIEW_MANIFEST,bytes:held});
const renderer=new WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(720,600);renderer.setPixelRatio(1);renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=.8;
document.body.style.margin='0';document.body.append(renderer.domElement);
const scene=new Scene();scene.background=new Color('#b7c3b2');scene.add(new AmbientLight(0xffffff,2));
const sun=new DirectionalLight(0xffeed5,3);sun.position.set(-3,5,4);scene.add(sun);
const plane=new Mesh(new PlaneGeometry(20,20),new MeshStandardMaterial({color:'#7f946f',roughness:1}));plane.rotation.x=-Math.PI/2;plane.position.y=-.015;scene.add(plane);
// En el banco se descubre el cuerpo del pez; en partida conserva su cota bajo el agua.
if(PREVIEW_ID==='fish'){plane.position.y=-.2;plane.material.color.set('#638c91');}
const scale=PREVIEW_ID==='cow'?1:PREVIEW_ID==='wolf'?.85:PREVIEW_ID==='pig'?.7:PREVIEW_ID==='fish'?.25:.38;
const camera=new OrthographicCamera(-scale*.8,scale*.8,scale*.67,-scale*.67,.01,100);
const fauna=new Fauna(k=>library.instance(k),k=>library.get(k));scene.add(fauna.group);
let time=0,x=0;
window.sample=(t,moving)=>{
  while(time<t-1e-8){const dt=Math.min(1/60,t-time);time+=dt;if(moving)x-=.09*dt;fauna.paint([{id:71,kind:PREVIEW_ID,x,y:0}],time);}
  const floor=PREVIEW_ID==='fish'?-.14:0;
  camera.position.set(x-scale*1.7,scale*1.2+floor,scale*1.9);camera.lookAt(x,scale*.24+floor,0);
  scene.updateMatrixWorld(true);renderer.render(scene,camera);
  const joints:Record<string,number[]>={};let vertices=0;let finite=true;
  fauna.group.traverse(n=>{
    if(n.type==='Bone')joints[n.name]=n.getWorldPosition(new Vector3()).toArray();
    if(n instanceof SkinnedMesh){n.skeleton.update();const attr=n.geometry.getAttribute('position');for(let i=0;i<attr.count;i++){const p=n.getVertexPosition(i,new Vector3()).applyMatrix4(n.matrixWorld);finite&&=p.toArray().every(Number.isFinite);vertices++;}}
  });
  return {time,x,joints,vertices,finite,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
};
fauna.paint([{id:71,kind:PREVIEW_ID,x:0,y:0}],0);window.sample(0,false);window.previewReady=true;
// El mismo banco se puede abrir como visor local para revisar el ciclo continuo.
const controls=document.createElement('div');controls.style.cssText='position:fixed;left:12px;top:12px;display:flex;gap:8px';document.body.append(controls);
let playMode:boolean|null=null,previousFrame=0;
for(const [label,mode] of [['Walk',true],['Rest',false],['Pause',null]] as const){
  const button=document.createElement('button');button.textContent=label;button.onclick=()=>{playMode=mode;};controls.append(button);
}
function play(now:number):void{
  if(playMode!==null&&previousFrame>0)window.sample(time+Math.min(.1,(now-previousFrame)/1000),playMode);
  previousFrame=now;requestAnimationFrame(play);
}
requestAnimationFrame(play);
window.benchmark=(count,animated)=>{
  scene.remove(fauna.group);
  const herd=new Fauna(k=>library.instance(k),animated?k=>library.get(k):undefined);scene.add(herd.group);
  const times:number[]=[];
  for(let frame=0;frame<180;frame++){
    const start=performance.now();
    herd.paint(Array.from({length:count},(_,id)=>({id,kind:PREVIEW_ID,x:(id%10)*.5-frame*.001,y:Math.floor(id/10)*.5})),frame/60);
    renderer.render(scene,camera);if(frame>=30)times.push(performance.now()-start);
  }
  times.sort((a,b)=>a-b);
  const result={count,animated,medianMs:times[75],p95Ms:times[142],calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  herd.dispose();scene.add(fauna.group);return result;
};
