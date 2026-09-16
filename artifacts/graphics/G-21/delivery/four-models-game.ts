import { createGraphicsRenderer } from '../../../../src/render3d/renderer';
import { loadAssets } from '../../../../src/render3d/assets';
import { foundGame } from '../../../../src/engine/found';
import type { Building } from '../../../../src/engine/state';
declare const PREVIEW_BYTES:Record<string,string>;
declare const PREVIEW_MANIFEST:unknown;
declare const PREVIEW_ID:string;
const bytes=Object.fromEntries(Object.entries(PREVIEW_BYTES).map(([id,b64])=>[id,Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer]));
const library=await loadAssets({baseUrl:'/',manifest:PREVIEW_MANIFEST,bytes});
const state=foundGame(2);
for(let y=43;y<68;y++)for(let x=24;x<48;x++){
 const i=y*state.map.width+x;state.map.terrain[i]=0;state.map.path[i]=0;state.map.ruins[i]=0;
}
const make=(id:number,kind:Building['kind'],x:number,y:number,w=2,h=2,lost=false):Building=>({id,kind,x,y,w,h,builtTick:0,lostTick:lost?1:null,blockedUntil:null,tier:kind==='stone_house'||kind==='watchtower'?1:0,lit:false});
state.buildings=[make(0,'house',34,55),make(1,'stone_house',37,55),make(2,'field',34,58,3,2)];
if(PREVIEW_ID==='watchtower')state.buildings.push(make(3,'watchtower',34,52));
if(PREVIEW_ID==='grave-yard')state.buildings.push(make(3,'grave_yard',34,52));
if(PREVIEW_ID==='ruin-wood')state.buildings.push(make(3,'house',34,52,2,2,true));
if(PREVIEW_ID==='ruin-stone')state.buildings.push(make(3,'stone_house',34,52,2,2,true));
const canvas=document.createElement('canvas');document.body.style.margin='0';document.body.append(canvas);
const renderer=await createGraphicsRenderer({canvas,assetBaseUrl:'/',quality:'standard',library});
renderer.resize({widthCss:900,heightCss:900,pixelRatio:1});
const frame={tickFraction:0,presentationSeconds:50,deltaSeconds:0,realDeltaSeconds:0,speed:0 as const,reducedMotion:true,discontinuity:true};
renderer.paint(state,frame);renderer.zoom(.67,450,450);
renderer.paint(state,{...frame,discontinuity:false});
document.title=PREVIEW_ID+' · renderer real / estado de prueba';
(window as unknown as {previewReady:boolean}).previewReady=true;
