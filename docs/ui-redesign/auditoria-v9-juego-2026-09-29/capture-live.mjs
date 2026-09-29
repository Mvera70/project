// Capturas de la versión desplegada. Ejecutar desde la raíz con Playwright y Edge.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'capturas');
fs.mkdirSync(out,{recursive:true});
const base='https://mvera70.github.io/project/';
const live='?debug=1&live=1&seed=11&year=20&season=summer';
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];

for(const width of [390,320]){
  const height=width===390?844:568;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  for(const scene of ['portada','valle','tablon','carro','cronica','encrucijada']){
    const errorsBefore=errors.length;
    await page.goto(base+(scene==='portada'?'':live+(scene==='encrucijada'?'&crossroad=1':'')),{waitUntil:'networkidle',timeout:45000});
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});
    if(scene!=='portada'){
      await page.waitForFunction(()=>{
        const at=window.__valleyBoardScreen?.();
        return at&&at.x>0&&at.x<innerWidth&&at.y>0&&at.y<innerHeight;
      },{timeout:20000});
      if(scene==='tablon'){
        await page.waitForTimeout(1500);
        // A 320 px el mando de vista cubre físicamente el tablón. Ocultarlo
        // permite capturar la ventana; registrar el bloqueo como incidencia.
        if(width===320)await page.getByRole('button',{name:'Just the valley'}).click();
        const at=await page.evaluate(()=>window.__valleyBoardScreen?.()??null);
        const box=await page.locator('canvas:visible').first().boundingBox();
        if(!at||!box)throw Error(`Tablón sin punto visible a ${width}px`);
        await page.mouse.click(box.x+at.x,box.y+at.y);
        console.log('Tocado tablón',width,at,box);
        await page.locator('.valley-board').waitFor({timeout:5000}).catch(async()=>{
          await page.screenshot({path:path.join(out,`tablon-diagnostic-${width}.png`)});
          throw Error(`Toque del tablón sin abrir a ${width}px`);
        });
      }
      if(scene==='carro'){
        await page.getByRole('button',{name:/Open the cart/i}).click();
        await page.locator('.ui-shell-content').waitFor({state:'visible',timeout:5000});
      }
      if(scene==='cronica'){
        await page.getByRole('button',{name:'Chronicle',exact:true}).click();
        await page.locator('.ui-shell-content').waitFor({state:'visible',timeout:5000});
      }
      if(scene==='encrucijada')await page.locator('body').getByText('Seed or Bread',{exact:true}).waitFor({timeout:5000});
    }
    if(scene==='cronica')await page.waitForFunction(()=>[...document.querySelectorAll('img[data-chronicle-art]')].some(i=>i.dataset.chronicleArt&&i.getAttribute('src')?.endsWith(i.dataset.chronicleArt)),null,{timeout:5000}).catch(()=>{});
    await page.evaluate(async()=>Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,2000))]));
    await page.waitForTimeout(250);
    const file=`${scene}-${width}x${height}.png`;
    await page.screenshot({path:path.join(out,file),animations:'disabled'});
    results.push({scene,width,height,file,url:page.url(),title:await page.title(),errors:errors.slice(errorsBefore)});
  }
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(root,'capture-report.json'),JSON.stringify(results,null,2)+'\n');
console.log(results.map(r=>`${r.scene} ${r.width}x${r.height} ${r.errors.length?'ERRORS '+r.errors.length:'OK'}`).join('\n'));
