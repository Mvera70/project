import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {createServer as netServer} from 'node:net';
const probe=netServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=await createServer({configFile:false,root:process.cwd(),optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port,hmr:false,watch:null}});
await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:1200,height:700},deviceScaleFactor:1,serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.text());});
 await page.route('**/g17-review',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0;background:#e8e2d6;font:16px sans-serif"><div id="gallery" style="display:flex"></div><div id="small" style="display:flex"></div></body></html>'}));
 await page.goto(server.resolvedUrls.local[0]+'g17-review');
 await page.addScriptTag({type:'module',content:`
 import * as T from '/node_modules/three/build/three.module.js';
 import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
 const ids=['villager','villager-smith','villager-priest','villager-farmer'];
 const models=await Promise.all(ids.map(id=>new GLTFLoader().loadAsync('/assets/valley3d/'+id+'.glb')));
 const clips=models[0].animations;
 const views=[];
 for(let i=0;i<4;i++){
  const div=document.createElement('div');div.style='width:300px;text-align:center';div.textContent=ids[i];gallery.appendChild(div);
  const scene=new T.Scene();scene.background=new T.Color('#e8e2d6');scene.add(new T.HemisphereLight(0xffffff,0x8e8068,2));const light=new T.DirectionalLight(0xffffff,2.4);light.position.set(2,4,3);scene.add(light);
  scene.add(models[i].scene);const mixer=new T.AnimationMixer(models[i].scene);
  for(const clip of clips){const action=mixer.clipAction(clip);action.play();mixer.setTime(clip.duration*.37);models[i].scene.updateMatrixWorld(true);models[i].scene.traverse(o=>{if(o.matrixWorld.elements.some(n=>!Number.isFinite(n)))throw Error('Invalid transform '+o.name);});mixer.stopAllAction();}
  mixer.clipAction(clips.find(c=>c.name==='idle')).play();mixer.setTime(0);
  const camera=new T.OrthographicCamera(-.32,.32,.49,-.49,.01,20);camera.position.set(1,.95,1.6);camera.lookAt(0,.32,0);
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(300,460);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;div.appendChild(renderer.domElement);renderer.render(scene,camera);
  const smallDiv=document.createElement('div');smallDiv.style='width:300px;text-align:center';small.appendChild(smallDiv);
  for(const height of [20,6]){const canvas=document.createElement('canvas');canvas.width=40;canvas.height=height+10;canvas.style='margin:12px;background:#e8e2d6';const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0,300,460,10,0,height*300/330,height*460/330);smallDiv.appendChild(canvas);}
  views.push({scene,mixer,renderer,camera});
 }
 window.review={views,clips};window.ready=true;
 `});
 await page.waitForFunction(()=>window.ready);
 await page.screenshot({path:'artifacts/graphics/G-17/delivery/four-villagers.png'});
 for(const clip of ['walk','work_hoe','carry_walk']){
  for(const phase of [0,.25,.5,.75]){
   await page.evaluate(({clip,phase})=>{for(const v of window.review.views){v.mixer.stopAllAction();const c=window.review.clips.find(c=>c.name===clip);v.mixer.clipAction(c).play();v.mixer.setTime(c.duration*phase);v.renderer.render(v.scene,v.camera);}}, {clip,phase});
   await page.screenshot({path:'artifacts/graphics/G-17/delivery/'+clip+'-'+phase+'.png'});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile('artifacts/graphics/G-17/delivery/shared-clips.json',JSON.stringify({status:'pass',baseClipsOnAllFour:true,consoleErrors:errors},null,2)+'\n');
 console.log('Four GLBs rendered; base clips bound on every rig; no browser errors.');
} finally {await browser.close();await server.close();}
