import {build} from 'esbuild';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
const id=process.argv[2],dir='artifacts/graphics/G-23/delivery';mkdirSync(dir,{recursive:true});
if(!['cow','pig','hen','wolf','crow','fish'].includes(id))throw Error('Id inválido');
const assets='public/assets/valley3d/',all=JSON.parse(readFileSync(assets+'manifest.json'));
const manifest={...all,assets:all.assets.filter(a=>a.id===id)};
const bytes=Object.fromEntries(manifest.assets.map(a=>[a.id,readFileSync(assets+a.file).toString('base64')]));
const result=await build({entryPoints:['tools/graphics/animals-preview.ts'],bundle:true,write:false,format:'esm',define:{PREVIEW_BYTES:JSON.stringify(bytes),PREVIEW_MANIFEST:JSON.stringify(manifest),PREVIEW_ID:JSON.stringify(id)}});
writeFileSync(dir+'/'+id+'-preview.html',`<!doctype html><meta charset="utf-8"><script type="module">${result.outputFiles[0].text}</script>`);
const root=join(homedir(),'AppData','Local','ms-playwright');
const exe=readdirSync(root).filter(d=>/^chromium-\d+$/.test(d)).sort().reverse().map(d=>join(root,d,'chrome-win64','chrome.exe')).find(existsSync);
const browser=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:720,height:600}}),errors=[],samples=[],images=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')console.log(m.text());});
 await page.goto(pathToFileURL(resolve(dir+'/'+id+'-preview.html')).href);await page.waitForFunction(()=>window.previewReady===true);
 for(let i=0;i<12;i++){
   const t=i*.3;samples.push(await page.evaluate(t=>window.sample(t,true),t));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const data=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'));
   const png=Buffer.from(data.split(',')[1],'base64');images.push(png.toString('base64'));writeFileSync(`${dir}/${id}-walk-${i}.png`,png);
 }
 for(const t of [3.5,4,6,8])samples.push(await page.evaluate(t=>window.sample(t,false),t));
 writeFileSync(`${dir}/${id}-idle.png`,Buffer.from((await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64'));
 await page.getByRole('button',{name:'Walk',exact:true}).click();
 await page.waitForTimeout(200);await page.getByRole('button',{name:'Pause',exact:true}).click();
 const paused=await page.evaluate(()=>window.sample(0,false));await page.waitForTimeout(150);
 const held=await page.evaluate(()=>window.sample(0,false));
 if(paused.time<=8||held.time!==paused.time)throw Error('El visor no reproduce o no respeta pausa');
 if(process.argv.includes('--benchmark')){
   const runs=[];for(const count of [40,120])for(const animated of [false,true])runs.push(await page.evaluate(({count,animated})=>window.benchmark(count,animated),{count,animated}));
   writeFileSync(`${dir}/${id}-benchmark.json`,JSON.stringify({context:'Chromium headless, ANGLE SwiftShader, portátil; no FPS móvil',runs},null,2)+'\n');
 }
 await page.setContent('<body style="margin:0;background:#b7c3b2">'+images.filter((_,i)=>i%2===0).map((x,i)=>`<div style="display:inline-block;width:360px"><img style="width:360px" src="data:image/png;base64,${x}"><div>walk ${(i*.6).toFixed(1)} s</div></div>`).join('')+'</body>');
 await page.setViewportSize({width:1080,height:640});await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));await page.screenshot({path:`${dir}/${id}-walk-sheet.png`});
 if(errors.length||samples.some(s=>!s.finite))throw Error(JSON.stringify({errors,samples}));
 writeFileSync(`${dir}/${id}-motion.json`,JSON.stringify({id,errors,samples},null,2)+'\n');
 if(process.argv.includes('--gallery')){
   const labels={cow:'Vaca',pig:'Cerdo',hen:'Gallina',wolf:'Lobo',crow:'Cuervo',fish:'Pez'};
   const html='<html lang="es"><meta charset="utf-8"><body style="margin:0;background:#b7c3b2;font:18px sans-serif"><div style="padding:12px">G-23 · Seis animales articulados · Escalas ajustadas para inspección</div>'+Object.entries(labels).map(([key,label])=>`<div style="display:inline-block;width:360px"><a href="${key}-preview.html"><img style="display:block;width:360px" src="data:image/png;base64,${readFileSync(`${dir}/${key}-walk-4.png`).toString('base64')}"><div style="padding:4px 12px">${label} · abrir visor</div></a></div>`).join('')+'</body></html>';
   writeFileSync(`${dir}/animals-gallery.html`,html);await page.setContent(html);await page.setViewportSize({width:1080,height:710});await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));await page.screenshot({path:`${dir}/animals-overview.png`});
 }
 console.log(id+': movimiento real de Fauna, 12 poses + reposo, sin errores.');
}finally{await browser.close();}
