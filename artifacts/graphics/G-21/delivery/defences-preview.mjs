import {build} from 'esbuild';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
const dir='artifacts/graphics/G-21/delivery';
const bytes=Object.fromEntries(['wall','palisade'].map(id=>[id,readFileSync(`public/assets/valley3d/${id}.glb`).toString('base64')]));
const result=await build({entryPoints:[dir+'/defences-preview.ts'],bundle:true,write:false,format:'esm',define:{DEFENCE_BYTES:JSON.stringify(bytes)}});
writeFileSync(dir+'/defences-preview.html',`<!doctype html><meta charset="utf-8"><script type="module">${result.outputFiles[0].text}</script>`);
const root=join(homedir(),'AppData','Local','ms-playwright');
const exe=readdirSync(root).filter(d=>/^chromium-\d+$/.test(d)).sort().reverse().map(d=>join(root,d,'chrome-win64','chrome.exe')).find(existsSync);
const browser=await chromium.launch({executablePath:exe,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(dir+'/defences-preview.html')).href);
 await page.waitForFunction(()=>window.ready===true);
 await page.screenshot({path:dir+'/defences-connections.png'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Uniones renderizadas con modelos GLB y código del juego; sin errores.');
}finally{await browser.close();}
