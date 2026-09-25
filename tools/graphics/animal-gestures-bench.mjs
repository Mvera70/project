import {build} from 'esbuild';import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';import {join,resolve} from 'node:path';import {homedir} from 'node:os';import {pathToFileURL} from 'node:url';import {chromium} from '@playwright/test';
// Banco de gestos del perro: node tools/graphics/animal-gestures-bench.mjs
// Escribe artifacts/graphics/animal-gestures/dog-gestures.png, una fila por gesto.
const dir='artifacts/graphics/animal-gestures';mkdirSync(dir,{recursive:true});const a='public/assets/valley3d/';const all=JSON.parse(readFileSync(a+'manifest.json'));const M={...all,assets:all.assets.filter(x=>x.id==='dog')};
const B=Object.fromEntries(M.assets.map(x=>[x.id,readFileSync(a+x.file).toString('base64')]));
const res=await build({entryPoints:['tools/graphics/animal-gestures-bench.ts'],bundle:true,write:false,format:'esm',define:{B:JSON.stringify(B),M:JSON.stringify(M)}});
writeFileSync(dir+'/bench.html',`<!doctype html><meta charset="utf-8"><body style="margin:0"><script type="module">${res.outputFiles[0].text}</script>`);
const root=join(homedir(),'AppData','Local','ms-playwright');const exe=readdirSync(root).filter(d=>/^chromium-\d+$/.test(d)).sort().reverse().map(d=>join(root,d,'chrome-win64','chrome.exe')).find(existsSync);
const br=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await br.newPage({viewport:{width:300,height:260}});p.on('pageerror',e=>console.log(String(e)));
await p.goto(pathToFileURL(resolve(dir+'/bench.html')).href);await p.waitForFunction(()=>window.ready===true);
const rows=[];for(const [action,moving] of [['idle',false],['walk',true],['run',true],['bark',false],['play',false]]){const imgs=[];for(let i=1;i<=5;i++)imgs.push(await p.evaluate(([a,t,m])=>window.frame(a,t,m),[action,i*.22,moving]));rows.push([action,imgs]);}
await p.setViewportSize({width:1560,height:1400});
await p.setContent('<body style="margin:0;background:#eee;font:16px sans-serif">'+rows.map(([a,imgs])=>`<div><b>${a}</b><br>`+imgs.map(x=>`<img src="${x}" style="width:300px">`).join('')+'</div>').join('')+'</body>');
await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await p.screenshot({path:dir+'/dog-gestures.png',fullPage:true});await br.close();console.log('ok');
