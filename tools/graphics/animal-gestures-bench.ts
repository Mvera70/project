// Banco de los gestos fabricados del perro (`effects/animal-gestures.ts`) sobre el GLB
// publicado y el mismo `Fauna` del juego. Lo monta `animal-gestures-bench.mjs`.
import { AmbientLight, DirectionalLight, Scene, OrthographicCamera, WebGLRenderer, Color, PlaneGeometry, Mesh, MeshStandardMaterial, ACESFilmicToneMapping } from 'three';
import { loadAssets, type AssetManifest } from '../../src/render3d/assets';
import { Fauna } from '../../src/render3d/effects/fauna';
declare const B: Record<string,string>; declare const M: AssetManifest;
declare global { interface Window { ready: boolean; frame: (action: string, t: number, moving: boolean) => string } }
const held=Object.fromEntries(Object.entries(B).map(([id,b64])=>[id,Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer]));
const library=await loadAssets({baseUrl:'/',manifest:M,bytes:held});
const r=new WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(300,260);r.toneMapping=ACESFilmicToneMapping;r.toneMappingExposure=.85;document.body.append(r.domElement);
const scene=new Scene();scene.background=new Color('#c9d1c3');scene.add(new AmbientLight(0xffffff,2));const sun=new DirectionalLight(0xfff0d8,3);sun.position.set(-3,5,4);scene.add(sun);
const plane=new Mesh(new PlaneGeometry(20,20),new MeshStandardMaterial({color:'#8fa27c'}));plane.rotation.x=-Math.PI/2;scene.add(plane);
const s=.4;const cam=new OrthographicCamera(-s,s,s*.87,-s*.87,.01,100);
let fauna: Fauna | null=null;let time=0,x=0,last='';
window.frame=(action,t,moving)=>{
  if(action!==last||fauna===null){ if(fauna)scene.remove(fauna.group); fauna=new Fauna(k=>library.instance(k),k=>library.get(k)); scene.add(fauna.group); time=0; x=0; last=action; }
  while(time<t-1e-8){const dt=Math.min(1/60,t-time);time+=dt;if(moving)x-=(action==='run'?1.4:.6)*dt*.3;fauna.paint([{id:1,kind:'dog',x,y:0,action:action==='idle'?undefined:action as never}],time);}
  cam.position.set(x-.2,.55,1.4);cam.lookAt(x,.12,0);r.render(scene,cam);return r.domElement.toDataURL('image/png');
};
window.ready=true;
