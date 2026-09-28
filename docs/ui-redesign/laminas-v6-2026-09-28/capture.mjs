// Capturas estáticas y comprobaciones acotadas. Edge headless, sin Three.js ni motor.
import {chromium} from 'playwright';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const url=pathToFileURL(path.join(dir,'index.html')).href;
const browser=await chromium.launch({headless:true,channel:'msedge'});
const report=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 for(const [w,h]of [[390,844],[320,568]]){
  await page.setViewportSize({width:w,height:h});
  for(const [scene,label]of [['cart','carro'],['board','tablon'],['chronicle','cronica']]){
   await page.goto(url+'?scene='+scene);await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:path.join(dir,label+'-'+w+'x'+h+'.png')});
   const measurements=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,buttons:[...document.querySelectorAll('.paint-action,.step button,.board-close')].map(b=>({label:b.getAttribute('aria-label')||b.textContent,width:Math.round(b.getBoundingClientRect().width),height:Math.round(b.getBoundingClientRect().height)})),overflowingText:[...document.querySelectorAll('.paint-card p,.card-heading h3,.card-heading h4,.cost-chip,.foot')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className),scrollable:[...document.querySelectorAll('.cart-list,.notes,.chronicle-sheet')].map(e=>({element:e.className,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight})),fonts:document.fonts.check('16px Cinzel')}));
   const overlaps=await page.evaluate(()=>[...document.querySelectorAll('.paint-card')].filter(c=>{const img=c.querySelector('.object-art'),p=c.querySelector('p');return img&&p&&img.getBoundingClientRect().bottom>p.getBoundingClientRect().top+1}).map(c=>c.dataset.key));
   report.push({scene,width:w,height:h,...measurements,artOverlapsDescription:overlaps});
  }
 }
 await page.goto(url+'?scene=board');const step=page.locator('.step').first();await step.locator('button').last().click();const count=await step.locator('em').textContent();await step.locator('button').last().click();const capped=await step.locator('em').textContent();const action=page.locator('.paint-action').first();await action.click();const dimmed=await action.isDisabled();await page.locator('.board-close').click();report.push({interactions:{countAfterPlus:count,cappedAtMissionMaximum:capped==='3',actionDimmed:dimmed,closedToValley:page.url().includes('scene=valley')}});
 await page.setViewportSize({width:390,height:844});
 for(const id of ['harvest','birth','death','built','pedlar','wedding','fire']){
  await page.goto(url+'?scene=chronicle&entry='+id);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(dir,'cronica-'+id+'.png')});
 }
 await page.setViewportSize({width:1160,height:900});
 await page.goto(pathToFileURL(path.join(dir,'pieces.html')).href);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(dir,'hoja-piezas-tamano-real.png'),fullPage:true});
 report.push({pieces:{brokenImages:await page.evaluate(()=>[...document.images].filter(i=>i.naturalWidth===0).length),count:await page.locator('.piece').count(),chronicleCount:await page.locator('.chronicle-grid figure').count()}});
 await page.goto(pathToFileURL(path.join(dir,'chronicle.html')).href);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(dir,'cronica-comparacion.png'),fullPage:true});
 await page.goto(url);await page.evaluate(()=>{document.querySelectorAll('iframe').forEach(f=>f.loading='eager')});await page.waitForFunction(()=>document.querySelectorAll('iframe').length===6);await Promise.all(page.frames().map(f=>f.evaluate(()=>document.fonts.ready)));await page.screenshot({path:path.join(dir,'resumen-v6.png'),fullPage:true});
 report.push({errors});
 fs.writeFileSync(path.join(dir,'verification-layout.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
 if(errors.length||report.some(r=>r.brokenImages||r.bodyWidth>r.width||r.overflowingText?.length||r.artOverlapsDescription?.length||r.buttons?.some(b=>b.width<44||b.height<44)))process.exitCode=1;
}finally{await browser.close()}
