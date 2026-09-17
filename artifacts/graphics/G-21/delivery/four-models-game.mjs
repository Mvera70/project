import {build} from 'esbuild';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
const id=process.argv[2],dir='artifacts/graphics/G-21/delivery';
if(!['watchtower','grave-yard','ruin-wood','ruin-stone'].includes(id))throw Error('Id inválido');
const assets='public/assets/valley3d/',manifest=JSON.parse(readFileSync(assets+'manifest.json'));
const bytes=Object.fromEntries(manifest.assets.map(a=>[a.id,readFileSync(assets+a.file).toString('base64')]));
const result=await build({entryPoints:[dir+'/four-models-game.ts'],bundle:true,write:false,format:'esm',define:{PREVIEW_BYTES:JSON.stringify(bytes),PREVIEW_MANIFEST:JSON.stringify(manifest),PREVIEW_ID:JSON.stringify(id)}});
writeFileSync(dir+'/'+id+'-game-fixture.html',`<!doctype html><meta charset="utf-8"><script type="module">${result.outputFiles[0].text}</script>`);
const root=join(homedir(),'AppData','Local','ms-playwright');
const exe=readdirSync(root).filter(d=>/^chromium-\d+$/.test(d)).sort().reverse().map(d=>join(root,d,'chrome-win64','chrome.exe')).find(existsSync);
const browser=await chromium.launch({executablePath:exe,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:900,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(dir+'/'+id+'-game-fixture.html')).href);
 await page.waitForFunction(()=>window.previewReady===true);
 await page.screenshot({path:dir+'/'+id+'-game-fixture.png'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(id+': renderer real, estado de prueba, sin errores de página.');
}finally{await browser.close();}
