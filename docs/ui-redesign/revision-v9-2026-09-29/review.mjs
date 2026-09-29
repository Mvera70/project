// Capturas acotadas de alternativas y del giro; solo maqueta documental.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const dir=path.dirname(fileURLToPath(import.meta.url));
const url=pathToFileURL(path.join(dir,'index.html')).href;
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
const options=[['ivory','A · Marfil','Elegida por Vera: clara, con canto de plata.'],['slate','B · Pizarra azul','Alternativa conservada.'],['iron','C · Hierro','Alternativa conservada.']];
for(const [id] of options){
 await page.goto(`${url}?scene=valley&controls=${id}`);
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(180);
 await page.screenshot({path:path.join(dir,'capturas',`opcion-${id}.png`),clip:{x:0,y:608,width:390,height:236}});
}
const initial=await page.evaluate(()=>window.r1Compass.getAngles());
await page.locator('.r1-armillary').focus();
for(let i=0;i<16;i++)await page.keyboard.press('ArrowLeft');
const rotated=await page.evaluate(()=>window.r1Compass.getAngles());
if(Math.abs(rotated.yaw-initial.yaw-2*Math.PI)>1e-6)throw Error('Giro incompleto');
await page.keyboard.press('Home');
const north=await page.evaluate(()=>window.r1Compass.getAngles());
await page.mouse.move(45,715);await page.mouse.down();await page.mouse.move(115,715,{steps:5});await page.mouse.up();
const dragged=await page.evaluate(()=>window.r1Compass.getAngles());
if(north.yaw!==0||dragged.yaw===0||errors.length)throw Error(JSON.stringify({north,dragged,errors}));
fs.writeFileSync(path.join(dir,'qa-compass.json'),JSON.stringify({initial,rotated,north,dragged,errors,scope:'Solo esfera de la maqueta; sin cámara del juego.'},null,2)+'\n');
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>V9 · Acabados conservados</title><style>body{margin:0;padding:20px;background:#e8ddc5;color:#302b26;font:16px Georgia}h1{font-size:24px;margin:0 0 8px}p{margin:0 0 16px}main{display:flex;gap:16px}figure{margin:0;width:390px}h2{font-size:21px;margin:8px 0}img{display:block;width:390px;height:236px}a{color:inherit}</style><h1>Tres acabados para los mandos del valle</h1><p>Marfil elegido por Vera · todas las variantes conservadas · la navegación mantiene sus medallones de latón</p><main>${options.map(([id,title,desc])=>`<figure><h2>${title}</h2><p>${desc}</p><a href="index.html?scene=valley&controls=${id}"><img src="capturas/opcion-${id}.png" alt="${title}"></a></figure>`).join('')}</main><p style="margin-top:16px">GIVE, SEND y OPEN THE CART conservan su acabado hasta confirmar el alcance del cambio.</p></html>`;
fs.writeFileSync(path.join(dir,'opciones.html'),html);
await page.setViewportSize({width:1242,height:390});
await page.goto(pathToFileURL(path.join(dir,'opciones.html')).href);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
await page.screenshot({path:path.join(dir,'capturas','opciones-mandos.png'),fullPage:true});
await browser.close();console.log('Tres opciones y comprobación de brújula guardadas.');
