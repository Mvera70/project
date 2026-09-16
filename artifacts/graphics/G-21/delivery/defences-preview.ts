import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildDefence, defenceConnections } from '../../../../src/render3d/world/defences';
import type { Building } from '../../../../src/engine/state';
import type { PlannedBuilding } from '../../../../src/render3d/world/plan';
declare const DEFENCE_BYTES: Record<string,string>;

const scene=new THREE.Scene();scene.background=new THREE.Color('#dce0cf');
const camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,100);
camera.position.set(13,18,22);camera.lookAt(5,0,4);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,1080);
document.body.style.margin='0';document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x74644a,2));
const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-4,12,8);scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,25),new THREE.MeshStandardMaterial({color:'#a3b57d'}));
ground.rotation.x=-Math.PI/2;ground.position.set(5,-.01,4);scene.add(ground);
const loader=new GLTFLoader(),sources:Record<string,THREE.Object3D>={};
for(const id of ['wall','palisade']){
 const bytes=Uint8Array.from(atob(DEFENCE_BYTES[id]!),c=>c.charCodeAt(0));
 sources[id]=(await loader.parseAsync(bytes.buffer,'')).scene;
}
const buildings:Building[]=[];
function add(x:number,y:number,kind:'wall'|'palisade') {
 buildings.push({id:buildings.length+1,x,y,kind,w:1,h:1,builtTick:0,lostTick:null,blockedUntil:null,tier:kind==='wall'?1:0,lit:false});
}
// Dos recintos muestran las cuatro esquinas y rectas en ambos ejes.
for(const [ox,kind] of [[0,'wall'],[6,'palisade']] as const){
 for(let i=0;i<4;i++){add(ox+i,0,kind);add(ox+i,3,kind);}
 for(let i=1;i<3;i++){add(ox,i,kind);add(ox+3,i,kind);}
}
// Cruce mixto, unión en T y extremos aislados.
for(const [x,y] of [[1,6],[0,6],[2,6],[1,5],[1,7]])add(x!,y!,x===1?'wall':'palisade');
for(const [x,y] of [[5,6],[4,6],[6,6],[5,5]])add(x!,y!,'wall');
add(8,6,'palisade');
const masks=defenceConnections(buildings);
for(const b of buildings){
 const planned={...b,z:b.y,ruin:false,asset:b.kind,connections:masks.get(b.id)} as unknown as PlannedBuilding;
 scene.add(buildDefence(planned,sources[b.kind]!.clone(true)).object);
}
renderer.render(scene,camera);
document.title='Defensas: cuatro esquinas, rectas, cruce mixto, T y aislado';
(window as unknown as {ready:boolean}).ready=true;
